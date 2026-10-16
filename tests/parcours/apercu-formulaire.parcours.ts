// L'aperçu du formulaire de devis : brouillon présenté, total calculé avec ses prix, et aucun
// envoi — servi comme en production, sous la garde de la politique de sécurité.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, type BrowserContext } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const BASE = ".wrangler/parcours";
const AVIS = "Dans l'aperçu, l'envoi est désactivé : rien ne part d'ici.";

function executer(commande: string): void {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", BASE, "--command", commande],
    { stdio: "inherit" },
  );
}

function semerBrouillonPistache(): void {
  const contenu = JSON.stringify({
    champs: {
      parfum: [
        { id: "vanille", libelle: "Vanille", prix: 800 },
        { id: "chocolat", libelle: "Chocolat", prix: 900 },
        { id: "fraise", libelle: "Fraise", prix: 1000 },
        { id: "pistache", libelle: "Pistache", prix: 1200 },
      ],
    },
    derniersNumeros: {},
  }).replaceAll("'", "''");
  executer(
    `insert or replace into brouillons_formulaires (formulaire, contenu, maj_le) values ('devis-gateau', '${contenu}', ${String(Date.now())})`,
  );
}

function retirerBrouillon(): void {
  executer("delete from brouillons_formulaires where formulaire = 'devis-gateau'");
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

test.describe("l'aperçu du formulaire de devis", () => {
  test.beforeEach(() => {
    semerBrouillonPistache();
  });
  test.afterEach(() => {
    retirerBrouillon();
  });

  test("SC-06c — Pistache (12 €, brouillon) et 10 parts (30 €) : le total affiché est 42 €", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/apercu/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Pistache/ })
        .check();
      await page
        .getByRole("group", { name: /Nombre de parts/ })
        .getByRole("radio", { name: /10 parts/ })
        .check();
      await expect(page.locator("section.formulaire [data-total]")).toHaveText("42 €");
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });

  test("SC-06e — remplir et actionner le bouton d'envoi : aucune requête ne part, l'avis dit que l'envoi est désactivé", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await ouvrirSession(contexte);
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      await page.goto("/admin/apercu/contact");
      await page
        .getByRole("group", { name: /Parfum/ })
        .getByRole("radio", { name: /Pistache/ })
        .check();
      await page.getByLabel(/Votre adresse e-mail/).fill("cliente@example.com");
      const avis = page.locator("[data-avis-envoi-desactive]");
      await expect(avis).toBeHidden();

      const requetes: string[] = [];
      page.on("request", (r) => requetes.push(`${r.method()} ${r.url()}`));
      await page.getByRole("button", { name: "Envoyer ma demande" }).click();

      await expect(avis).toBeVisible();
      await expect(avis).toHaveText(AVIS);
      await page.waitForTimeout(500);
      expect(requetes, "SC-06e — requêtes parties au clic").toEqual([]);
      garde.verifier();
    } finally {
      await contexte.close();
    }
  });
});
