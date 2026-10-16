// Le total du formulaire de devis suit la sélection — servi comme en production, sans double.
import { test, expect, type Page } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const total = (page: Page) => page.locator("section.formulaire [data-total]");

test.describe("le total suit la sélection", () => {
  test("SC-05e — page ouverte sans rien choisir : le total affiché est 0 €", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/contact");
      await expect(total(page)).toBeVisible();
      await expect(total(page)).toHaveText("0 €");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-05a — Chocolat et 10 parts : le total affiché est 39 €", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Chocolat/ })
        .check();
      await page
        .getByRole("group", { name: /Nombre de parts/ })
        .getByRole("radio", { name: /10 parts/ })
        .check();
      await expect(total(page)).toHaveText("39 €");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-05b — SC-05c — remplacer Chocolat par Fraise : 40 €, sans rechargement, aucune requête ne part", async ({
    page,
  }) => {
    await page.goto("/contact");
    const parfum = page.getByRole("group", { name: /Parfum/ });
    await parfum.getByRole("radio", { name: /Chocolat/ }).check();
    await page
      .getByRole("group", { name: /Nombre de parts/ })
      .getByRole("radio", { name: /10 parts/ })
      .check();
    await expect(total(page)).toHaveText("39 €");

    await page.evaluate(() => {
      (window as unknown as { __marque: string }).__marque = "meme-document";
    });
    const requetes: string[] = [];
    page.on("request", (r) => requetes.push(r.url()));

    await parfum.getByRole("radio", { name: /Fraise/ }).check();
    await expect(total(page)).toHaveText("40 €");
    await parfum.getByRole("radio", { name: /Vanille/ }).check();
    await expect(total(page)).toHaveText("38 €");
    await parfum.getByRole("radio", { name: /Fraise/ }).check();
    await expect(total(page)).toHaveText("40 €");

    expect(requetes, "SC-05c — requêtes parties de l'appareil").toEqual([]);
    const marque = await page.evaluate(
      () => (window as unknown as { __marque?: string }).__marque,
    );
    expect(marque, "SC-05b — la page n'a pas été rechargée").toBe("meme-document");
  });

  test("SC-05d — cocher Mariage dans Occasion : le total est inchangé", async ({
    page,
  }) => {
    await page.goto("/contact");
    await page
      .getByRole("group", { name: /Parfum/ })
      .getByRole("radio", { name: /Chocolat/ })
      .check();
    await expect(total(page)).toHaveText("9 €");

    await page
      .getByRole("group", { name: /Occasion/ })
      .getByRole("checkbox", { name: /Mariage/ })
      .check();

    await expect(total(page)).toHaveText("9 €");
  });

  test("SC-05i — le module est chargé depuis le site et le total est annoncé poliment", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      const scripts: string[] = [];
      page.on("request", (r) => {
        if (r.resourceType() === "script") scripts.push(new URL(r.url()).origin);
      });
      const reponse = await page.goto("/contact");
      const politique = reponse?.headers()["content-security-policy"] ?? "";
      expect(politique).toContain("script-src 'self'");
      expect(politique).not.toMatch(/unsafe-|https?:|\*/);
      // Le module et les morceaux qu'il importe : au moins un, tous du site.
      expect([...new Set(scripts)]).toEqual(["http://localhost:8788"]);
      await expect(
        page.locator("section.formulaire [aria-live='polite']"),
      ).toBeVisible();
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
