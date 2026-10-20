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
});
