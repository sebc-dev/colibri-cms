/**
 * Change 010, ticket 06 — Les écrans des formulaires montrent leurs brouillons.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale ; une session et des brouillons sont semés
 * directement. Les formulaires lus sont ceux déclarés au dépôt.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_BROUILLONS = "brouillons_formulaires";
const BASE = "https://example.com/admin/formulaires";

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}

function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

function separerRequetes(sql: string): string[] {
  return sql
    .split("\n")
    .map((ligne) => ligne.replace(/--.*/, ""))
    .join("\n")
    .split(";")
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const sessions = await import("../../migrations/0003_sessions.sql?raw");
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db
        .prepare(
          `alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`,
        )
        .run();
    } catch {
      // déjà ajoutée : sans effet.
    }
    const brouillons =
      await import("../../migrations/0008_brouillons_formulaires.sql?raw");
    for (const requete of separerRequetes(brouillons.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(
        `nettoyage D1 ignoré pour ${table} (schéma absent) :`,
        erreur,
      );
    }
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-brouillons-formulaires-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function semerBrouillon(
  db: DBLike,
  formulaire: string,
  champs: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (formulaire, contenu, maj_le) values (?1, ?2, ?3)`,
    )
    .bind(
      formulaire,
      JSON.stringify({ champs, derniersNumeros: {} }),
      Date.now(),
    )
    .run();
}

async function ouvrir(db: DBLike, route: string): Promise<string> {
  const cookie = await semerSession(db);
  const reponse = await exports.default.fetch(
    new Request(route, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, "le contenu (<main>) devrait être présent").toBeDefined();
  return main ?? "";
}

const MARQUE = "data-pastille-brouillon";

function entreesDeLaListe(main: string): string[] {
  return main.split("<li").slice(1);
}

it("SC-06a — l'écran de « Devis gâteau » montre « Vanille » à 10 € du brouillon et la marque", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerBrouillon(db, "devis-gateau", {
    parfum: [
      { id: "vanille", libelle: "Vanille", prix: 1000 },
      { id: "chocolat", libelle: "Chocolat", prix: 900 },
      { id: "fraise", libelle: "Fraise", prix: 1000 },
    ],
  });

  // Act
  const main = await ouvrir(db, `${BASE}/devis-gateau`);

  // Assert
  expect(main).toContain(MARQUE);
  const champs = [...main.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
  const libelle = champs.find((c) => c.includes('value="Vanille"'));
  expect(libelle).toBeDefined();
  const prix = champs.find((c) => c.includes("prix-0-0"));
  expect(prix).toMatch(/value="10(?:[,.]00)?"/);
});

it("SC-06b — seul « Devis atelier » porte la marque dans la liste", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerBrouillon(db, "devis-atelier", {
    niveau: [
      { id: "debutant", libelle: "Novice" },
      { id: "confirme", libelle: "Confirmé" },
    ],
  });

  // Act
  const main = await ouvrir(db, BASE);

  // Assert
  const entrees = entreesDeLaListe(main);
  const atelier = entrees.find((e) => e.includes("Devis atelier"));
  const gateau = entrees.find((e) => e.includes("Devis gâteau"));
  expect(atelier).toContain(MARQUE);
  expect(gateau).toBeDefined();
  expect(gateau).not.toContain(MARQUE);
});

it("SC-06c — sans formulaire enregistré, aucune marque dans la liste", async () => {
  // Arrange
  const db = await assurerSchema();

  // Act
  const main = await ouvrir(db, BASE);

  // Assert
  expect(main).toContain("Devis atelier");
  expect(main).toContain("Devis gâteau");
  expect(main).not.toContain(MARQUE);
});

it("SC-06e — un libellé avec balisage s'affiche comme du texte", async () => {
  // Arrange
  const db = await assurerSchema();
  const piege = '<img src=x onerror=alert(1)> & "ok"';
  await semerBrouillon(db, "devis-gateau", {
    occasion: [
      { id: "anniversaire", libelle: piege },
      { id: "mariage", libelle: "Mariage" },
    ],
  });

  // Act
  const main = await ouvrir(db, `${BASE}/devis-gateau`);

  // Assert
  // Dans une valeur d'attribut entre guillemets, « < » reste du texte ;
  // « & » et « " » sont échappés, donc la valeur ne peut pas s'en échapper.
  expect(main).toContain(
    'value="<img src=x onerror=alert(1)> &amp; &quot;ok&quot;"',
  );
  const horsValeurs = main.replace(/value="[^"]*"/g, "");
  expect(horsValeurs).not.toContain("<img");
  expect(horsValeurs).not.toContain("onerror");
});
