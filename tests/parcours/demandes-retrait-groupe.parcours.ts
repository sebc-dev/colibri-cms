// Le retrait de plusieurs demandes en un geste depuis la liste : la sélection, la barre, le
// dialogue qui précède le retrait, l'échec dit sans terme de développeur, les nombres relus —
// servi comme en production, sous la garde de la politique de sécurité.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const PREFIXE = "demande-parcours-groupe";
const MESSAGE_ECHEC =
  /Le retrait n['’]a pas pu se faire : aucune demande n['’]a été retirée\. Réessayez dans quelques instants\./;
const LIBELLE_CASE = /^Sélectionner la demande du/;

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

function semer(nombre: number, formulaire = "devis-gateau", nom = "Devis gâteau", suite = "sans-suite"): void {
  const lignes: string[] = [];
  for (let i = 1; i <= nombre; i++) {
    lignes.push(
      `('${PREFIXE}-${formulaire}-${String(i)}', '${formulaire}', '${nom}', '${suite}', 'presente', ${String(Date.UTC(2026, 9, 17, 12, i % 60))}, 'Contact', null, 'Client ${String(i)} groupe${String(i)}@exemple.fr', '[]', 'parti')`,
    );
  }
  executer(
    `insert or replace into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ${lignes.join(", ")}`,
  );
}

function nettoyer(): void {
  executer(`drop trigger if exists panne_parcours_groupe`);
  executer(`delete from demandes where id like '${PREFIXE}-%'`);
}

function compter(): number {
  const sortie = execFileSync(
    "npx",
    [
      "wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--json", "--command",
      `select count(*) as n from demandes where id like '${PREFIXE}-%'`,
    ],
    { encoding: "utf8" },
  );
  const lu = JSON.parse(sortie.slice(sortie.indexOf("["))) as { results: { n: number }[] }[];
  return lu[0]?.results[0]?.n ?? -1;
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

async function cocherTrois(page: Page): Promise<void> {
  const cases = page.getByRole("checkbox", { name: LIBELLE_CASE });
  for (let i = 0; i < 3; i++) await cases.nth(i).check();
}

test.describe("le retrait de plusieurs demandes", () => {
  test.beforeEach(() => {
    nettoyer();
    semer(5);
  });
  test.afterEach(() => {
    nettoyer();
  });

  test("SC-09b — trois demandes cochées : la barre dit « 3 demandes sélectionnées » et le dialogue annonce trois retraits et l'effacement définitif, avant que rien ne parte", async ({
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
      await page.goto("/admin/demandes");

      await cocherTrois(page);

      await expect(page.getByText("3 demandes sélectionnées")).toBeVisible();
      await page.getByRole("button", { name: /^Retirer…/ }).click();
      const dialogue = page.getByRole("dialog");
      await expect(dialogue.getByText("Retirer 3 demandes ?")).toBeVisible();
      await expect(dialogue.getByText(/effacé définitivement/)).toBeVisible();
      expect(envois).toBe(0);
      expect(compter()).toBe(5);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-09a — trois demandes cochées, motif indésirable, Retirer : elles ne paraissent plus dans la liste, la base n'en porte plus rien", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/demandes");
      await cocherTrois(page);
      await page.getByRole("button", { name: /^Retirer…/ }).click();
      const dialogue = page.getByRole("dialog");
      await dialogue.getByRole("radio", { name: /indésirable/ }).check();

      await dialogue.getByRole("button", { name: "Retirer", exact: true }).click();

      await expect(page.getByRole("checkbox", { name: LIBELLE_CASE })).toHaveCount(2);
      expect(compter()).toBe(2);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-09d — l'effacement n'aboutit pas : le dialogue dit que le retrait n'a pas pu se faire, sans terme de développeur, et aucune demande n'est retirée", async ({
    browser,
  }) => {
    executer(
      `create trigger panne_parcours_groupe before delete on demandes begin select raise(abort, 'panne'); end`,
    );
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/demandes");
      await cocherTrois(page);
      await page.getByRole("button", { name: /^Retirer…/ }).click();
      const dialogue = page.getByRole("dialog");
      await dialogue.getByRole("radio", { name: /indésirable/ }).check();

      await dialogue.getByRole("button", { name: "Retirer", exact: true }).click();

      const alerte = dialogue.getByRole("alert");
      await expect(alerte).toHaveText(MESSAGE_ECHEC);
      await expect(alerte).not.toHaveText(/panne|abort|sqlite|trigger|500|erreur serveur/i);
      expect(compter()).toBe(5);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-09c — « Tout sélectionner sur cette page » puis « Tout désélectionner » : la barre suit la sélection, rien n'est retiré tant que le dialogue n'est pas confirmé", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/demandes");

      await page.getByRole("checkbox", { name: LIBELLE_CASE }).first().check();
      await page.getByRole("button", { name: "Tout sélectionner sur cette page" }).click();
      await expect(page.getByText("5 demandes sélectionnées")).toBeVisible();
      await page.getByRole("button", { name: "Tout désélectionner" }).click();

      await expect(page.getByText(/demandes? sélectionnées?/)).toHaveCount(0);
      expect(compter()).toBe(5);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});

test.describe("le retrait depuis une liste filtrée", () => {
  test.beforeEach(() => {
    nettoyer();
    semer(3, "devis-gateau", "Devis gâteau");
    semer(2, "devis-tarte", "Devis tarte");
  });
  test.afterEach(() => {
    nettoyer();
  });

  test("SC-09a — retrait depuis ?formulaire=devis-gateau : l'écran se recharge sur le même filtre, les demandes de l'autre formulaire ne sont pas listées", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/demandes?formulaire=devis-gateau");
      await expect(page.getByRole("checkbox", { name: LIBELLE_CASE })).toHaveCount(3);
      await page.getByRole("checkbox", { name: LIBELLE_CASE }).nth(0).check();
      await page.getByRole("checkbox", { name: LIBELLE_CASE }).nth(1).check();
      await page.getByRole("button", { name: /^Retirer…/ }).click();
      const dialogue = page.getByRole("dialog");
      await dialogue.getByRole("radio", { name: /indésirable/ }).check();
      await dialogue.getByRole("button", { name: "Retirer", exact: true }).click();

      await expect(page.getByRole("checkbox", { name: LIBELLE_CASE })).toHaveCount(1);
      expect(new URL(page.url()).searchParams.get("formulaire")).toBe("devis-gateau");
      expect(compter()).toBe(3);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});

test.describe("le retrait de quarante demandes indésirables", () => {
  test.beforeEach(() => {
    nettoyer();
    semer(40);
  });
  test.afterEach(() => {
    nettoyer();
  });

  test("SC-09e — quarante demandes d'une page : Tout sélectionner, Retirer…, Demande indésirable, Retirer les effacent en quatre actions", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/demandes");

      await page.getByRole("button", { name: "Tout sélectionner sur cette page" }).click();
      await page.getByRole("button", { name: /^Retirer…/ }).click();
      const dialogue = page.getByRole("dialog");
      await dialogue.getByRole("radio", { name: /indésirable/ }).check();
      await dialogue.getByRole("button", { name: "Retirer", exact: true }).click();

      await expect(page.getByRole("checkbox", { name: LIBELLE_CASE })).toHaveCount(0);
      expect(compter()).toBe(0);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
