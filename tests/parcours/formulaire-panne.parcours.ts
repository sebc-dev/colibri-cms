// La panne du compteur : le point d'envoi répond 503 « indisponible » et le formulaire le dit comme
// un échec passager (jamais comme un seuil), garde la saisie et réactive le bouton — servi comme en
// production, sous la garde de la politique de sécurité (connect-src 'self').
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const MESSAGE_ECHEC =
  "Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants.";
const MESSAGE_LIMITE =
  "Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure.";

test.describe("la panne du compteur", () => {
  test("SC-13b — le point d'envoi répond 503 indisponible : échec passager dit, pas de seuil, saisie gardée, bouton actif", async ({
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
          body: JSON.stringify({ statut: "indisponible" }),
        }),
      );
      await page.goto("/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Fraise/ })
        .check();
      await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(page.getByText(MESSAGE_ECHEC)).toBeVisible();
      await expect(page.getByText(MESSAGE_LIMITE)).toBeHidden();
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
