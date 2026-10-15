// Le formulaire posé sur une page publique — servi comme en production, sans double.
import { test, expect } from "@playwright/test";

test.describe("le formulaire dessiné sur la page", () => {
  test("SC-03c — choisir Vanille puis Chocolat dans Parfum : seule Chocolat reste choisie", async ({
    page,
  }) => {
    await page.goto("/contact");
    const parfum = page.getByRole("group", { name: /Parfum/ });
    const vanille = parfum.getByRole("radio", { name: /Vanille/ });
    const chocolat = parfum.getByRole("radio", { name: /Chocolat/ });
    const fraise = parfum.getByRole("radio", { name: /Fraise/ });

    await vanille.check();
    await chocolat.check();

    await expect(chocolat).toBeChecked();
    await expect(vanille).not.toBeChecked();
    await expect(fraise).not.toBeChecked();
  });

  test("SC-03d — cocher Anniversaire puis Mariage dans Occasion : les deux restent cochées", async ({
    page,
  }) => {
    await page.goto("/contact");
    const occasion = page.getByRole("group", { name: /Occasion/ });
    const anniversaire = occasion.getByRole("checkbox", { name: /Anniversaire/ });
    const mariage = occasion.getByRole("checkbox", { name: /Mariage/ });

    await anniversaire.check();
    await mariage.check();

    await expect(anniversaire).toBeChecked();
    await expect(mariage).toBeChecked();
  });

  test("UX1 — sur un téléphone de 375 px, le formulaire tient en une colonne sans défilement horizontal, et toute la ligne d'une option se touche", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact");
    const formulaire = page.locator("section.formulaire form");
    const boiteFormulaire = await formulaire.boundingBox();
    expect(boiteFormulaire).not.toBeNull();
    const gauche = boiteFormulaire?.x ?? 0;
    const largeur = boiteFormulaire?.width ?? 0;

    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(debordement).toBeLessThanOrEqual(0);
    expect(gauche + largeur).toBeLessThanOrEqual(375);
    for (const champ of await formulaire.locator(".champ").all()) {
      expect(Math.abs(((await champ.boundingBox())?.x ?? -1) - gauche)).toBeLessThan(1);
    }

    const parfum = page.getByRole("group", { name: /Parfum/ });
    const ligne = parfum.locator("label.option", { hasText: "Chocolat" });
    const boiteLigne = await ligne.boundingBox();
    expect(boiteLigne?.width ?? 0).toBeGreaterThan(largeur * 0.9);
    await ligne.click({
      position: { x: (boiteLigne?.width ?? 0) - 4, y: (boiteLigne?.height ?? 0) / 2 },
    });
    await expect(parfum.getByRole("radio", { name: /Chocolat/ })).toBeChecked();
  });
});
