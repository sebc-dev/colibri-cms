// Une demande désaccordée au formulaire publié : le visiteur lit l'invitation à recharger la page,
// le bouton redevient actif et la saisie est conservée — servi comme en production, sous la garde
// de la politique de sécurité (connect-src 'self'). Le serveur répond 409 « formulaire-change ».
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

test.describe("une demande désaccordée", () => {
  test("SC-09a — le formulaire invite à recharger la page, le bouton redevient actif, la saisie est gardée", async ({
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
      await page.goto("/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Fraise/ })
        .check();
      await page.getByLabel(/Votre adresse e-mail/).fill("marie@exemple.fr");
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      const message = page.getByText(
        "Ce formulaire vient d'être mis à jour. Rechargez la page pour voir les prix à jour, puis refaites votre demande.",
      );
      await expect(message).toBeVisible();
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
