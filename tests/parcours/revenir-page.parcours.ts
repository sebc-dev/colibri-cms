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
const ROUTE_REVENIR = "**/admin/pages/tarifs/revenir";

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
      const navigations: string[] = [];
      page.on("framenavigated", (cadre) => navigations.push(cadre.url()));

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
      expect(navigations).toEqual([]);

      // SC-01d : se raviser ferme la confirmation, le brouillon garde sa marque.
      await offre.click();
      const dialogue = page.getByRole("dialog");
      await expect(dialogue).toContainText("seront perdues");
      // Tarifs n'est jamais publiée sur la base neuve de cette passe.
      await expect(dialogue).toContainText("reprend son contenu de départ");
      // La croix porte le même nom et la précède : `.last()` vise le bouton visible.
      const garder = dialogue
        .getByRole("button", { name: "Garder mes modifications" })
        .last();
      await expect(garder).toBeFocused();
      await garder.click();
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

  test("un échec réseau garde la confirmation ouverte, et Échap ne la ferme pas pendant l’envoi", async ({
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
      const marque = page.getByText("Brouillon", { exact: true });
      await expect(marque).toBeVisible();

      // Échec réseau : la confirmation reste ouverte, dit le message, et le geste reste possible.
      await page.route(ROUTE_REVENIR, (route) => route.abort());
      await page.getByRole("button", { name: OFFRE }).click();
      const dialogue = page.getByRole("dialog");
      const confirmer = dialogue.getByRole("button", { name: OFFRE });
      const garder = dialogue
        .getByRole("button", { name: "Garder mes modifications" })
        .last();
      await confirmer.click();
      await expect(dialogue.getByRole("alert")).toContainText(
        "La connexion a échoué",
      );
      await expect(dialogue).toBeVisible();
      await expect(confirmer).toBeEnabled();
      await expect(garder).toBeEnabled();
      await expect(marque).toBeVisible();
      await page.unroute(ROUTE_REVENIR);

      // Pendant l'envoi : réponse retenue, boutons inactifs, Échap sans effet.
      let liberer = (): void => undefined;
      const liberation = new Promise<void>((resolve) => {
        liberer = resolve;
      });
      await page.route(ROUTE_REVENIR, async (route) => {
        await liberation;
        await route.continue();
      });
      await confirmer.click();
      const enCours = dialogue.getByRole("button", {
        name: "Retour en cours…",
      });
      await expect(enCours).toBeDisabled();
      await expect(garder).toBeDisabled();
      // La croix porte le même nom et précède le bouton : `.first()` la vise.
      await expect(
        dialogue
          .getByRole("button", { name: "Garder mes modifications" })
          .first(),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialogue).toBeVisible();

      // La réponse libérée, le retour aboutit : la page repart sans brouillon.
      liberer();
      await expect(marque).toHaveCount(0);
      await expect(
        page.getByRole("textbox", { name: "Libellé" }),
      ).toHaveValue(LIBELLE_ORIGINE);
    } finally {
      garde.verifier();
      await contexte.close();
    }
  });
});
