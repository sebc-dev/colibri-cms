// La confirmation de suppression d'une image, pendant l'envoi : servie comme en
// production, sous la garde de la politique de sécurité (le Dialog ne s'observe
// qu'au navigateur).
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import type { Browser, Locator, Page } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const ROUTE_SUPPRIMER = "**/admin/medias/*/supprimer";

/**
 * Ouvre la confirmation de suppression de la première image, puis confirme : la
 * réponse reste retenue jusqu'à `liberer()`, puis coupée (rien n'est supprimé
 * pour les autres parcours).
 */
async function supprimerEnRetenantLaReponse(page: Page): Promise<{
  readonly dialogue: Locator;
  readonly annuler: Locator;
  readonly liberer: () => void;
}> {
  // L'écran Médias inscrit les images de départ ; la première ouvre sa fiche.
  await page.goto("/admin/medias");
  const fiche = page.locator('a[href^="/admin/medias/"]').first();
  await expect(fiche).toBeVisible();
  await fiche.click();
  await page.getByRole("button", { name: "Supprimer…" }).click();
  const dialogue = page.getByRole("dialog");
  await expect(dialogue).toBeVisible();

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
  return { dialogue, annuler, liberer };
}

async function ouvrirContexte(browser: Browser) {
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

test("pendant la suppression d’une image, la croix est inactive comme les deux boutons et Échap ne ferme pas la confirmation", async ({
  browser,
}) => {
  const contexte = await ouvrirContexte(browser);
  const garde = await poserGardePolitique(contexte);
  try {
    const page = await contexte.newPage();
    const { dialogue, annuler, liberer } = await supprimerEnRetenantLaReponse(page);

    await expect(annuler.last()).toBeDisabled();
    await expect(annuler.first()).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialogue).toBeVisible();

    // L'envoi coupé, la confirmation dit l'échec et rend ses gestes.
    liberer();
    await expect(dialogue.getByRole("alert")).toBeVisible();
    await expect(annuler.first()).toBeEnabled();
    garde.verifier();
  } finally {
    await contexte.close();
  }
});

test("pendant la suppression d’une image, un clic hors de la confirmation ne la ferme pas", async ({
  browser,
}) => {
  const contexte = await ouvrirContexte(browser);
  const garde = await poserGardePolitique(contexte);
  try {
    const page = await contexte.newPage();
    const { dialogue, liberer } = await supprimerEnRetenantLaReponse(page);

    await page.mouse.click(5, 5);
    await page.waitForTimeout(500);
    await expect(dialogue).toBeVisible();

    liberer();
    garde.verifier();
  } finally {
    await contexte.close();
  }
});
