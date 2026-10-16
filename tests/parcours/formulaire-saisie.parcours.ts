// Une saisie incomplète ou mal formée est désignée, et rien ne part — servi comme en production,
// sous la garde de la politique de sécurité.
import { execFileSync } from "node:child_process";
import { test, expect, type Page } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const RESUME = "Votre demande n'est pas partie : vérifiez les champs ci-dessous.";

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

async function choisirFraise(page: Page): Promise<void> {
  await page
    .getByRole("group", { name: /Parfum/ })
    .getByRole("radio", { name: /Fraise/ })
    .check();
}

async function envoyer(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
}

async function verifierRefus(page: Page, libelle: RegExp, message: string): Promise<void> {
  const resume = page.getByText(RESUME);
  await expect(resume).toBeVisible();
  await expect(resume).toBeFocused();
  await expect(page.getByRole("link", { name: libelle })).toBeVisible();
  await expect(page.getByText(message)).toBeVisible();
  await expect(page.getByText("Merci, votre demande a été envoyée.")).toBeHidden();
}

test.describe("la saisie désignée", () => {
  test.beforeAll(() => {
    executer(
      "insert or replace into adresses_autorisees (adresse) values ('editrice@example.com')",
    );
  });

  async function ouvrir(
    browser: import("@playwright/test").Browser,
    scenario: (page: Page) => Promise<void>,
  ): Promise<void> {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      const envois: string[] = [];
      page.on("request", (r) => {
        if (r.method() === "POST" && new URL(r.url()).pathname === "/api/public/demandes") {
          envois.push(r.url());
        }
      });
      await page.goto("/contact");
      await scenario(page);
      expect(envois, "rien n'est envoyé").toEqual([]);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  }

  test("SC-08a — sans « Votre adresse e-mail », le champ est désigné comme à renseigner", async ({ browser }) => {
    await ouvrir(browser, async (page) => {
      await choisirFraise(page);
      await envoyer(page);
      await verifierRefus(page, /Votre adresse e-mail/, "Ce champ est à renseigner.");
    });
  });

  test("SC-08b — sans parfum choisi, « Parfum » est désigné comme à renseigner", async ({ browser }) => {
    await ouvrir(browser, async (page) => {
      await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
      await envoyer(page);
      await verifierRefus(page, /Parfum/, "Ce champ est à renseigner.");
    });
  });

  test("SC-08c — que des espaces dans « Votre adresse e-mail » : champ à renseigner", async ({ browser }) => {
    await ouvrir(browser, async (page) => {
      await choisirFraise(page);
      await page.getByLabel(/Votre adresse e-mail/).fill("     ");
      await envoyer(page);
      await verifierRefus(page, /Votre adresse e-mail/, "Ce champ est à renseigner.");
    });
  });

  test("SC-08d — « marie.exemple.fr » : l'adresse n'a pas la forme d'une adresse e-mail", async ({ browser }) => {
    await ouvrir(browser, async (page) => {
      await choisirFraise(page);
      await page.getByLabel(/Votre adresse e-mail/).fill("marie.exemple.fr");
      await envoyer(page);
      await verifierRefus(
        page,
        /Votre adresse e-mail/,
        "Cette adresse e-mail semble incomplète (exemple : nom@domaine.fr).",
      );
      await expect(page.getByLabel(/Votre adresse e-mail/)).toHaveValue("marie.exemple.fr");
    });
  });

  test("SC-08e — 2 001 caractères dans « Votre message » : la longueur maximale est dite", async ({ browser }) => {
    await ouvrir(browser, async (page) => {
      await choisirFraise(page);
      await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
      await page.getByLabel(/Votre message/).fill("a".repeat(2001));
      await envoyer(page);
      await verifierRefus(page, /Votre message/, "Ce texte dépasse 2000 caractères.");
    });
  });
});
