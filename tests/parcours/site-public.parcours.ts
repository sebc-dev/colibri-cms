// Site public — servi comme en production, documents statiques sous leurs en-têtes.
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { poserGardePolitique } from "./garde-politique.ts";

const PAGES = ["/", "/tarifs", "/contact"];

function jetonSemé(): string {
  return readFileSync(".wrangler/parcours/session.txt", "utf8").trim();
}

test.describe("site public statique", () => {
  test("SC-07a — une page publique arrive avec les en-têtes du site public", async ({
    page,
  }) => {
    for (const chemin of PAGES) {
      const reponse = await page.goto(chemin);
      const entetes = reponse?.headers() ?? {};
      expect(reponse?.status()).toBe(200);
      const politique = entetes["content-security-policy"] ?? "";
      expect(politique).toContain("default-src 'none'");
      // Script et échange : absents, ou le site lui-même seulement (change 012, D4).
      for (const nom of ["script-src", "connect-src"]) {
        const directive = politique
          .split(";")
          .map((d) => d.trim())
          .find((d) => d.startsWith(`${nom} `));
        expect([undefined, `${nom} 'self'`], `${chemin} : ${directive ?? ""}`).toContain(directive);
      }
      expect(politique).not.toMatch(/unsafe-|https?:|\*/);
      expect(entetes["x-content-type-options"]).toBe("nosniff");
      expect(entetes["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(entetes["x-frame-options"]).toBe("DENY");
    }
  });

  test("SC-07b — aucune violation de politique, aucune ressource d'une autre origine", async ({
    browser,
  }) => {
    const contexte = await browser.newContext();
    const garde = await poserGardePolitique(contexte);
    try {
      const page = await contexte.newPage();
      const origines = new Set<string>();
      page.on("request", (r) => origines.add(new URL(r.url()).origin));
      for (const chemin of PAGES) await page.goto(chemin);
      garde.verifier();
      expect([...origines]).toEqual(["http://localhost:8788"]);
    } finally {
      await contexte.close();
    }
  });

  test("SC-07c — même document avec ou sans session d'administration, et aucun cookie posé", async ({
    browser,
  }) => {
    const anonyme = await browser.newContext();
    const connecte = await browser.newContext();
    await connecte.addCookies([
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
    for (const chemin of PAGES) {
      const a = await anonyme.request.get(chemin);
      const b = await connecte.request.get(chemin);
      expect(await b.text()).toBe(await a.text());
      expect(a.headers()["set-cookie"]).toBeUndefined();
      expect(b.headers()["set-cookie"]).toBeUndefined();
    }
    await anonyme.close();
    await connecte.close();
  });

  test("SC-07d — aucun lien des pages publiques ne mène à l'aperçu", async ({
    page,
  }) => {
    for (const chemin of PAGES) {
      await page.goto(chemin);
      const adresses = await page.locator("a[href], link[href], img[src]").evaluateAll((els) =>
        els.map((e) => e.getAttribute("href") ?? e.getAttribute("src") ?? ""),
      );
      expect(adresses.filter((h) => h.includes("/admin/apercu"))).toEqual([]);
    }
  });
});
