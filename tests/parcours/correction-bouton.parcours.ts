// Correction du bouton d'action de l'accueil — servie comme en production,
// sans double, sous la garde de la politique de sécurité.
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const CHEMIN = "/admin/pages/accueil";
const LIBELLE_ORIGINE = "Demander un devis";
const LIBELLE_CORRIGE = "Obtenir mon devis";

test.describe("correction du bouton d’action de l’accueil", () => {
  test("SC-02a/b/d — l’éditrice corrige le libellé, sans violation de la politique", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await contexte.addCookies([
      {
        name: "__Host-session",
        value: readFileSync(".wrangler/parcours/session.txt", "utf8").trim(),
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      },
    ]);
    const garde = await poserGardePolitique(contexte);
    // La garde parle la première : un geste bloqué par la politique échoue
    // d'abord en nommant la directive, non par un écran qui ne change pas.
    try {
      const page = await contexte.newPage();
      await page.goto(CHEMIN);

      const champ = page.getByRole("textbox", { name: "Libellé" });
      // SC-02d : une passe neuve voit le libellé d'origine.
      await expect(champ).toHaveValue(LIBELLE_ORIGINE);
      await expect(page.getByText("Brouillon", { exact: true })).toHaveCount(0);

      await champ.fill(LIBELLE_CORRIGE);
      // L'écran porte plusieurs formulaires : celui du bouton d'action est le
      // seul à porter un champ « Libellé ».
      await page
        .locator("form")
        .filter({ has: champ })
        .getByRole("button", { name: "Enregistrer" })
        .click();

      // La marque de brouillon paraît sans rechargement.
      await expect(page.getByText("Brouillon", { exact: true })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);

      await page.reload();
      await expect(page.getByRole("textbox", { name: "Libellé" })).toHaveValue(
        LIBELLE_CORRIGE,
      );
    } finally {
      garde.verifier();
      await contexte.close();
    }
  });
});
