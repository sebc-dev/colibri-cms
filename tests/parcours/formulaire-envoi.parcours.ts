// L'envoi d'une demande de devis : le formulaire laisse place à la confirmation — servi comme en
// production, sous la garde de la politique de sécurité (connect-src 'self').
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

test.describe("l'envoi d'une demande", () => {
  test.beforeAll(() => {
    executer(
      "insert or replace into adresses_autorisees (adresse) values ('editrice@example.com')",
    );
  });

  test("SC-07a — Fraise et 10 parts, e-mail renseigné, envoi : le formulaire laisse place à la confirmation", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Fraise/ })
        .check();
      await page
        .getByRole("group", { name: /Nombre de parts/ })
        .getByRole("radio", { name: /10 parts/ })
        .check();
      await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      const confirmation = page.getByText("Merci, votre demande a été envoyée.");
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toBeFocused();
      await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toHaveCount(0);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
