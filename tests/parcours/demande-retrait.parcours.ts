// Le retrait d'une demande depuis son détail : le dialogue précède le retrait, l'éditrice peut
// y renoncer, et le retrait mène à la liste à jour — servi comme en production, sous la garde de
// la politique de sécurité.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, type BrowserContext } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const ID_DEMANDE = "demande-parcours-retrait";
const CONTACT = "Marie Dupont parcours-retrait@exemple.fr";

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

function semerDemande(): void {
  executer(
    `insert or replace into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('${ID_DEMANDE}', 'devis-gateau', 'Devis gâteau', 'devis-envoye', 'presente', ${String(Date.UTC(2026, 9, 17, 12, 5))}, 'Contact', null, '${CONTACT}', '[]', 'parti')`,
  );
}

function effacerDemande(): void {
  executer(`delete from demandes where id = '${ID_DEMANDE}'`);
}

async function ouvrirSession(contexte: BrowserContext): Promise<void> {
  await contexte.addCookies([
    {
      name: "__Host-session",
      value: readFileSync(`${BASE}/session.txt`, "utf8").trim(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    },
  ]);
}

test.describe("le retrait d'une demande", () => {
  test.beforeEach(() => {
    semerDemande();
  });
  test.afterEach(() => {
    effacerDemande();
  });

  test("SC-08b — le dialogue s'ouvre avec le focus sur Annuler, Retirer est inactif sans motif, Échap rend le focus : la demande reste", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto(`/admin/demandes/${ID_DEMANDE}`);
      const ouvrir = page.getByRole("button", { name: "Retirer cette demande" });

      await ouvrir.click();

      const dialogue = page.getByRole("dialog");
      await expect(dialogue).toBeVisible();
      await expect(dialogue.getByRole("button", { name: "Annuler" })).toBeFocused();
      await expect(dialogue.getByRole("button", { name: "Retirer", exact: true })).toBeDisabled();

      await page.keyboard.press("Escape");

      await expect(dialogue).not.toBeVisible();
      await expect(ouvrir).toBeFocused();
      await page.goto("/admin/demandes");
      await expect(page.getByText("Marie Dupont").first()).toBeVisible();
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-08b — Annuler ferme le dialogue sans rien envoyer : la demande reste dans la liste avec sa suite", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      let envois = 0;
      await page.route("**/admin/demandes/retrait", async (route) => {
        envois += 1;
        await route.continue();
      });
      await page.goto(`/admin/demandes/${ID_DEMANDE}`);

      await page.getByRole("button", { name: "Retirer cette demande" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Annuler" }).click();

      await expect(page.getByRole("dialog")).not.toBeVisible();
      expect(envois).toBe(0);
      await page.goto("/admin/demandes");
      await expect(page.getByText("Marie Dupont").first()).toBeVisible();
      await expect(page.getByLabel(/^Suite de la demande du/).first()).toHaveValue("devis-envoye");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-08a — motif ordinaire choisi puis Retirer : l'écran mène à la liste à jour, sans la demande", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto(`/admin/demandes/${ID_DEMANDE}`);
      await page.getByRole("button", { name: "Retirer cette demande" }).click();
      const dialogue = page.getByRole("dialog");
      await dialogue.getByRole("radio").first().check();
      const retirer = dialogue.getByRole("button", { name: "Retirer", exact: true });
      await expect(retirer).toBeEnabled();

      await retirer.click();

      await expect(page).toHaveURL(/\/admin\/demandes(\?.*)?$/);
      await expect(page.getByText("Marie Dupont")).toHaveCount(0);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-08a — l'échec du retrait est dit dans le dialogue, la demande reste", async ({ browser }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/admin/demandes/retrait", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false }),
        }),
      );
      await page.goto(`/admin/demandes/${ID_DEMANDE}`);
      await page.getByRole("button", { name: "Retirer cette demande" }).click();
      const dialogue = page.getByRole("dialog");
      await dialogue.getByRole("radio").first().check();

      await dialogue.getByRole("button", { name: "Retirer", exact: true }).click();

      await expect(dialogue.getByRole("alert")).toBeVisible();
      await expect(dialogue).toBeVisible();
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
