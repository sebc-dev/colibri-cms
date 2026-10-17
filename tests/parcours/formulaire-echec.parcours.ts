// L'envoi en cours et l'échec : le formulaire dit l'envoi en cours (bouton inactif), un double geste
// ne produit qu'une demande, un échec garde la saisie — servi comme en production, sous la garde de
// la politique de sécurité (connect-src 'self').
import { execFileSync } from "node:child_process";
import { test, expect, type Page } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const MESSAGE_ECHEC =
  "Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants.";

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

async function remplir(page: Page): Promise<void> {
  await page.goto("/contact");
  await page
    .getByRole("group", { name: /Parfum/ })
    .getByRole("radio", { name: /Fraise/ })
    .check();
  await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
}

async function verifierSaisieGardee(page: Page): Promise<void> {
  await expect(page.getByLabel(/Votre adresse e-mail/)).toHaveValue("marie@exemple.fr");
  await expect(
    page.getByRole("group", { name: /Parfum/ }).getByRole("radio", { name: /Fraise/ }),
  ).toBeChecked();
}

test.describe("l'envoi en cours et l'échec", () => {
  test.beforeAll(() => {
    executer(
      "insert or replace into adresses_autorisees (adresse) values ('editrice@example.com')",
    );
  });

  test("SC-11a — deux gestes de suite sur le bouton : une seule requête part vers le point d'envoi", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      let requetes = 0;
      await page.route("**/api/public/demandes", async (route) => {
        requetes += 1;
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ statut: "envoyee" }),
        });
      });
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).dblclick();

      await expect(page.getByText("Merci, votre demande a été envoyée.")).toBeVisible();
      expect(requetes).toBe(1);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11b — réponse pas encore revenue : « Envoi en cours… » est dit et le bouton est inactif", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      let liberer: () => void = () => undefined;
      const retenue = new Promise<void>((resolve) => {
        liberer = resolve;
      });
      await page.route("**/api/public/demandes", async (route) => {
        await retenue;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ statut: "envoyee" }),
        });
      });
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      const enCours = page.getByRole("button", { name: "Envoi en cours…" });
      await expect(enCours).toBeVisible();
      await expect(enCours).toBeDisabled();
      liberer();
      await expect(page.getByText("Merci, votre demande a été envoyée.")).toBeVisible();
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11c — la plateforme refuse (503) : message d'échec, bouton actif, saisie et sélections gardées", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/api/public/demandes", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ statut: "acheminement" }),
        }),
      );
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByText(MESSAGE_ECHEC)).toBeVisible();
      await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeEnabled();
      await verifierSaisieGardee(page);
      await expect(page.getByText("Merci, votre demande a été envoyée.")).toBeHidden();
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11d — l'appareil n'atteint pas le site : message d'échec, bouton actif, rien d'effacé", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/api/public/demandes", (route) => route.abort("internetdisconnected"));
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByText(MESSAGE_ECHEC)).toBeVisible();
      await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeEnabled();
      await verifierSaisieGardee(page);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11e — après un échec, un renvoi qui aboutit confirme la demande", async ({ browser }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      let appels = 0;
      await page.route("**/api/public/demandes", (route) => {
        appels += 1;
        if (appels === 1) {
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ statut: "acheminement" }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ statut: "envoyee" }),
        });
      });
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();
      await expect(page.getByText(MESSAGE_ECHEC)).toBeVisible();

      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByText("Merci, votre demande a été envoyée.")).toBeVisible();
      expect(appels).toBe(2);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11f — aucune adresse autorisée (503 du serveur) : message d'échec, saisie gardée", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/api/public/demandes", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ statut: "acheminement" }),
        }),
      );
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByText(MESSAGE_ECHEC)).toBeVisible();
      await verifierSaisieGardee(page);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11g — le serveur refuse un champ désigné (400) : le bouton est de nouveau actif, saisie gardée", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/api/public/demandes", (route) =>
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            statut: "champs",
            champs: [{ champ: "courriel", motif: "incomplet" }],
          }),
        }),
      );
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Envoi en cours…" })).toHaveCount(0);
      await verifierSaisieGardee(page);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-11g — le formulaire a changé (409) : le bouton est de nouveau actif, saisie gardée", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/api/public/demandes", (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ statut: "formulaire-change" }),
        }),
      );
      await remplir(page);
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Envoi en cours…" })).toHaveCount(0);
      await verifierSaisieGardee(page);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
