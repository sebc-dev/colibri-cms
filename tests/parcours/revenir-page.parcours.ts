// Retour d'une page à sa version publiée — servi comme en production, sous la
// garde de la politique de sécurité (le Dialog et l'événement de la marque ne
// s'observent qu'au navigateur).
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

// Tarifs : aucun autre parcours n'y écrit, la page part sans brouillon.
const CHEMIN = "/admin/pages/tarifs";
const LIBELLE_CORRIGE = "Obtenir mon devis";
const LIBELLE_ORIGINE = "Demander un devis";
// Titre hostile : chevrons, esperluette et guillemets.
const TITRE_HOSTILE = `Tarifs <b>gras</b> & "x" 'y'`;
const TITRE_ECHAPPE = TITRE_HOSTILE.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
const OFFRE = "Revenir à la version publiée";

async function ouvrirContexte(
  browser: import("@playwright/test").Browser,
): Promise<BrowserContext> {
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
  return contexte;
}

test.describe("retour d’une page à sa version publiée", () => {
  test("SC-01c/d/f — l’offre paraît à la première correction, se raviser garde le brouillon, la confirmation de deux onglets aboutit", async ({
    browser,
  }) => {
    const contexte = await ouvrirContexte(browser);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto(CHEMIN);
      const offre = page.getByRole("button", { name: OFFRE });
      await expect(offre).toHaveCount(0);

      // SC-01c : la première correction fait paraître l'offre, sans changer d'écran.
      const champ = page.getByRole("textbox", { name: "Libellé" });
      await champ.fill(LIBELLE_CORRIGE);
      await page
        .locator("form")
        .filter({ has: champ })
        .getByRole("button", { name: "Enregistrer" })
        .click();
      await expect(page.getByText("Brouillon", { exact: true })).toBeVisible();
      await expect(offre).toBeVisible();

      // SC-01d : se raviser ferme la confirmation, le brouillon garde sa marque.
      await offre.click();
      const dialogue = page.getByRole("dialog");
      await expect(dialogue).toContainText("seront perdues");
      await dialogue
        .getByRole("button", { name: "Garder mes modifications" })
        .click();
      await expect(dialogue).toHaveCount(0);
      await expect(page.getByText("Brouillon", { exact: true })).toBeVisible();

      // SC-01f : un second onglet, ouvert avant le retour, confirme après le premier.
      const second = await contexte.newPage();
      await second.goto(CHEMIN);
      await offre.click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: OFFRE })
        .click();
      await expect(page.getByText("Brouillon", { exact: true })).toHaveCount(0);

      await second.getByRole("button", { name: OFFRE }).click();
      await second
        .getByRole("dialog")
        .getByRole("button", { name: OFFRE })
        .click();
      await expect(second.getByText("Brouillon", { exact: true })).toHaveCount(
        0,
      );
      await expect(
        second.getByRole("textbox", { name: "Libellé" }),
      ).toHaveValue(LIBELLE_ORIGINE);
    } finally {
      garde.verifier();
      await contexte.close();
    }
  });

  test("SC-01e — un titre aux caractères spéciaux est présenté comme du texte dans la confirmation", async ({
    browser,
  }) => {
    const contexte = await ouvrirContexte(browser);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto(CHEMIN);
      const champ = page.getByRole("textbox", { name: "Libellé" });
      await champ.fill(LIBELLE_CORRIGE);
      await page
        .locator("form")
        .filter({ has: champ })
        .getByRole("button", { name: "Enregistrer" })
        .click();
      await expect(page.getByText("Brouillon", { exact: true })).toBeVisible();

      // Le contenu de départ ne porte aucun titre de ce genre : la réponse
      // de l'éditeur est réécrite, le titre y est servi échappé comme le fait
      // le gabarit, et c'est l'îlot réel qui doit le présenter tel quel.
      await page.route("**/admin/pages/tarifs", async (route) => {
        const reponse = await route.fetch();
        const corps = (await reponse.text()).replaceAll("Tarifs", TITRE_ECHAPPE);
        await route.fulfill({ response: reponse, body: corps });
      });
      await page.reload();

      await page.getByRole("button", { name: OFFRE }).click();
      const dialogue = page.getByRole("dialog");
      await expect(dialogue).toContainText(TITRE_HOSTILE);
      await expect(dialogue).toContainText("seront perdues");
      await expect(dialogue.locator("b")).toHaveCount(0);

      // Remise à neuf : la page repart sans brouillon.
      await dialogue.getByRole("button", { name: OFFRE }).click();
      await expect(page.getByText("Brouillon", { exact: true })).toHaveCount(0);
    } finally {
      garde.verifier();
      await contexte.close();
    }
  });
});
