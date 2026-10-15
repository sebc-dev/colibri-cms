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
});
