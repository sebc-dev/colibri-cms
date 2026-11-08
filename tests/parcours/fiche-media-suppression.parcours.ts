// La confirmation de suppression d'une image, pendant l'envoi : servie comme en
// production, sous la garde de la politique de sécurité (le Dialog ne s'observe
// qu'au navigateur).
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const ROUTE_SUPPRIMER = "**/admin/medias/*/supprimer";

test("pendant la suppression d’une image, la croix de la confirmation est inactive comme ses deux boutons", async ({
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
  try {
    const page = await contexte.newPage();
    // L'écran Médias inscrit les images de départ ; la première ouvre sa fiche.
    await page.goto("/admin/medias");
    const fiche = page.locator('a[href^="/admin/medias/"]').first();
    await expect(fiche).toBeVisible();
    await fiche.click();
    await page.getByRole("button", { name: "Supprimer…" }).click();
    const dialogue = page.getByRole("dialog");
    await expect(dialogue).toBeVisible();

    // Réponse retenue puis coupée : rien n'est supprimé pour les autres parcours.
    let liberer = (): void => undefined;
    const liberation = new Promise<void>((resolve) => {
      liberer = resolve;
    });
    await page.route(ROUTE_SUPPRIMER, async (route) => {
      await liberation;
      await route.abort();
    });
    await dialogue.getByRole("button", { name: "Supprimer", exact: true }).click();

    // La croix porte le nom « Annuler » et précède le bouton : `.first()` la vise.
    const annuler = dialogue.getByRole("button", { name: "Annuler" });
    await expect(annuler).toHaveCount(2);
    await expect(annuler.last()).toBeDisabled();
    await expect(annuler.first()).toBeDisabled();

    liberer();
    await expect(dialogue.getByRole("alert")).toBeVisible();
    await expect(annuler.first()).toBeEnabled();
    garde.verifier();
  } finally {
    await contexte.close();
  }
});
