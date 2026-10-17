// Le seuil des demandes par origine : au-delà de cinq par heure, le point d'envoi répond 429 et le
// formulaire le dit, garde la saisie et réactive le bouton — servi comme en production, sous la
// garde de la politique de sécurité (connect-src 'self').
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const MESSAGE_LIMITE =
  "Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure.";
const MESSAGE_ECHEC =
  "Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants.";

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

test.describe("le seuil des demandes", () => {
  test.beforeAll(() => {
    executer(
      "insert or replace into adresses_autorisees (adresse) values ('editrice@example.com')",
    );
  });

  test("SC-12g — le seuil est atteint (429) : le message du seuil est dit, saisie gardée, bouton actif", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/api/public/demandes", (route) =>
        route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ statut: "seuil" }),
        }),
      );
      await page.goto("/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Fraise/ })
        .check();
      await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByText(MESSAGE_LIMITE)).toBeVisible();
      await expect(page.getByText(MESSAGE_LIMITE)).toBeFocused();
      await expect(page.getByText(MESSAGE_ECHEC)).toBeHidden();
      await expect(page.getByText("Merci, votre demande a été envoyée.")).toBeHidden();
      await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeEnabled();
      await expect(page.getByLabel(/Votre adresse e-mail/)).toHaveValue("marie@exemple.fr");
      await expect(
        page.getByRole("group", { name: /Parfum/ }).getByRole("radio", { name: /Fraise/ }),
      ).toBeChecked();
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
