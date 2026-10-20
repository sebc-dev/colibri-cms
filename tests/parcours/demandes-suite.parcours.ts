// La suite d'une demande, choisie dans la liste : l'échec d'enregistrement est dit sous la ligne,
// en annonce polie, et la liste déroulante revient à la suite d'avant — servi comme en production,
// sous la garde de la politique de sécurité.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, type BrowserContext } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const MESSAGE_ECHEC = "La suite n'a pas pu être enregistrée. Réessayez dans quelques instants.";
const ID_DEMANDE = "demande-parcours-suite";
// La demande semée est reçue le 17 octobre 2026 à 12:05 UTC, soit 14:05 à Paris.
const LIBELLE_SUITE = "Suite de la demande du 17 octobre 2026 à 14:05";

function estEnvoiDeSuite(url: string, methode: string): boolean {
  return new URL(url).pathname === `/admin/demandes/${ID_DEMANDE}/suite` && methode === "POST";
}

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

function semerDemande(): void {
  executer(
    `insert or replace into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('${ID_DEMANDE}', 'devis-gateau', 'Devis gâteau', 'devis-envoye', 'presente', ${String(Date.UTC(2026, 9, 17, 12, 5))}, 'Contact', null, 'marie@exemple.fr', '[]', 'parti')`,
  );
}

function retirerDemande(): void {
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

test.describe("la suite d'une demande", () => {
  test.beforeEach(() => {
    semerDemande();
  });
  test.afterEach(() => {
    retirerDemande();
  });

  test("SC-07c — l'enregistrement échoue : le message est dit sous la ligne en annonce polie, la liste revient à la suite d'avant", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.route("**/admin/demandes/*/suite", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false }),
        }),
      );
      await page.goto("/admin/demandes");
      const liste = page.getByLabel(/^Suite de la demande du/).first();
      await expect(liste).toHaveValue("devis-envoye");

      await liste.selectOption("commande");

      const message = page.getByText(MESSAGE_ECHEC);
      await expect(message).toBeVisible();
      await expect(message).toHaveAttribute("aria-live", "polite");
      await expect(liste).toHaveValue("devis-envoye");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-07b — « commande » choisi dans la liste après « devis envoyé » : la liste porte « commande », et le nombre de commandes la compte sans rechargement", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/demandes");
      const liste = page.getByLabel(LIBELLE_SUITE, { exact: true });
      await expect(liste).toHaveValue("devis-envoye");
      // La base des parcours est partagée par tous les fichiers d'une passe : l'oracle est relatif.
      const cellule = page.locator('[data-nombres-formulaire="devis-gateau"] [data-nombre-commandes]');
      const phrase = page.locator("[data-nombres-site]");
      const commandesDuFormulaire = Number(await cellule.textContent());
      const commandesDuSite = Number(/(\d+) commandes?/.exec((await phrase.textContent()) ?? "")?.[1]);
      await page.evaluate(() => {
        (window as unknown as { marque?: number }).marque = 1;
      });

      const [reponse] = await Promise.all([
        page.waitForResponse((r) => estEnvoiDeSuite(r.url(), r.request().method())),
        liste.selectOption("commande"),
      ]);

      expect(reponse.status()).toBe(200);
      await expect(cellule).toHaveText(String(commandesDuFormulaire + 1));
      await expect(phrase).toHaveText(
        new RegExp(`(^|\\s)${String(commandesDuSite + 1)} commandes?(\\s|$)`),
      );
      await expect(liste).toHaveValue("commande");
      expect(await page.evaluate(() => (window as unknown as { marque?: number }).marque)).toBe(1);
      await expect(page.getByText(MESSAGE_ECHEC)).not.toBeVisible();
      await page.reload();
      await expect(liste).toHaveValue("commande");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-07a — depuis le détail : « sans suite » choisi, la liste du détail le porte après rechargement", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto(`/admin/demandes/${ID_DEMANDE}`);
      const liste = page.getByLabel(LIBELLE_SUITE, { exact: true });
      await expect(liste).toHaveValue("devis-envoye");

      const [reponse] = await Promise.all([
        page.waitForResponse((r) => estEnvoiDeSuite(r.url(), r.request().method())),
        liste.selectOption("sans-suite"),
      ]);

      expect(reponse.status()).toBe(200);
      await page.reload();
      await expect(liste).toHaveValue("sans-suite");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-07a — deux choix rapprochés : la liste finit sur la dernière suite choisie, et la base la porte", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      // Le premier envoi est retenu jusqu'à `liberer()` ; les suivants passent tout droit.
      let liberer: () => void = () => undefined;
      const retenue = new Promise<void>((resoudre) => {
        liberer = resoudre;
      });
      let premier = true;
      await page.route("**/admin/demandes/*/suite", async (route) => {
        if (premier) {
          premier = false;
          await retenue;
        }
        await route.continue();
      });
      await page.goto("/admin/demandes");
      const liste = page.getByLabel(LIBELLE_SUITE, { exact: true });
      await expect(liste).toHaveValue("devis-envoye");

      await Promise.all([
        page.waitForRequest((r) => estEnvoiDeSuite(r.url(), r.method())),
        liste.selectOption("sans-suite"),
      ]);
      await liste.selectOption("commande");
      const secondEnvoi = page.waitForResponse(
        (r) =>
          estEnvoiDeSuite(r.url(), r.request().method()) &&
          r.request().postData() === JSON.stringify({ suite: "commande" }),
      );
      liberer();

      expect((await secondEnvoi).status()).toBe(200);
      await expect(liste).toHaveValue("commande");
      await page.reload();
      await expect(liste).toHaveValue("commande");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
