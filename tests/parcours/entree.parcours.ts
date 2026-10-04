// Entrée dans l'administration — servie comme en production, sans double.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const CHEMIN = "/admin/pages/accueil";
const CONNEXION = /\/admin\/connexion/;

function jetonSemé(): string {
  return readFileSync(".wrangler/parcours/session.txt", "utf8").trim();
}

test.describe("entrée dans l’administration", () => {
  test("SC-01a — les en-têtes de sécurité servis sont ceux de la production", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await contexte.addCookies([
      {
        name: "__Host-session",
        value: jetonSemé(),
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      },
    ]);
    const page = await contexte.newPage();
    const reponse = await page.goto(CHEMIN);
    const entetes = reponse?.headers() ?? {};
    const dispositif =
      "Dispositif de parcours en défaut (serveur non fidèle à la production) : ";
    const politique = entetes["content-security-policy"] ?? "";
    for (const nom of [
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
      "x-frame-options",
    ]) {
      expect(entetes[nom], `${dispositif}en-tête ${nom} absent`).toBeTruthy();
    }
    expect(politique, `${dispositif}script-src 'self' absent`).toContain(
      "script-src 'self'",
    );
    expect(politique, `${dispositif}connect-src absent`).toMatch(
      /connect-src /,
    );
    await contexte.close();
  });

  test("SC-01b — la session semée ouvre l’administration", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    await contexte.addCookies([
      {
        name: "__Host-session",
        value: jetonSemé(),
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      },
    ]);
    const page = await contexte.newPage();
    await page.goto(CHEMIN);
    await expect(page).not.toHaveURL(CONNEXION);
    await expect(page).toHaveURL(new RegExp(`${CHEMIN}$`));
    await contexte.close();
  });

  test("SC-01c — sans session, la porte reste close", async ({ browser }) => {
    const contexte = await browser.newContext();
    const page = await contexte.newPage();
    await page.goto(CHEMIN);
    await expect(page).toHaveURL(CONNEXION);
    await contexte.close();
  });

  test("SC-01d — npm test ne collecte aucun parcours, npm run parcours ne joue que les parcours", () => {
    const unitaires = execFileSync("npx", ["vitest", "list", "--filesOnly"], {
      encoding: "utf8",
    });
    expect(unitaires).not.toContain("tests/parcours/");
    const parcours = execFileSync("npx", ["playwright", "test", "--list"], {
      encoding: "utf8",
    });
    // Une ligne par test : « fichier:ligne:colonne › describe › titre ».
    const fichiers = parcours
      .split("\n")
      .filter((ligne) => ligne.includes(" › "))
      .map((ligne) => (ligne.trim().split(" › ")[0] ?? "").split(":")[0] ?? "");
    expect(fichiers.length).toBeGreaterThan(0);
    expect(fichiers.every((f) => f.endsWith(".parcours.ts"))).toBe(true);
  });

  test("SC-01e — aucun fichier de production n’est modifié par rapport à main", () => {
    const modifies = execFileSync("git", ["diff", "--name-only", "main"], {
      encoding: "utf8",
    });
    expect(
      modifies
        .split("\n")
        .filter((f) => /^(src|migrations|content|public)\//.test(f)),
    ).toEqual([]);
  });
});
