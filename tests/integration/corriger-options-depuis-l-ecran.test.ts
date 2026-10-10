/**
 * Change 010, ticket 07 — corriger les options depuis l'écran du formulaire.
 * La soumission de l'îlot (corps bâti par `formulaire-carte.ts`) est rejouée
 * sur la route réelle.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale (ADR-0003). Les migrations 0003 et 0008 sont
 * rejouées ici même ; une session valide est semée directement. Les
 * formulaires lus sont ceux déclarés au dépôt (`content/formulaires/*`).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";
import {
  ajouter,
  corpsDEnregistrement,
  deplacer,
  lignesDepuis,
  type LigneChoix,
} from "../../src/admin/ilots-svelte-5/formulaire-carte.ts";
import { TEXTES_REFUS_FORMULAIRE } from "../../src/admin/textes.ts";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_BROUILLONS = "brouillons_formulaires";
const ROUTE_GATEAU =
  "https://example.com/admin/formulaires/devis-gateau/options";

interface InstructionLike {
  bind(...valeurs: unknown[]): {
    run(): Promise<unknown>;
    all(): Promise<{ results: unknown[] }>;
  };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
  const id = `session-ecran-options-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

const PARFUMS = [
  { id: "vanille", libelle: "Vanille", prix: 800 },
  { id: "chocolat", libelle: "Chocolat", prix: 900 },
  { id: "fraise", libelle: "Fraise", prix: 1000 },
];

/** Le corps que l'îlot enverrait pour « Devis gâteau », parfums à la main. */
function corpsDeLIlot(parfums: readonly LigneChoix[]): string {
  const sixParts = lignesDepuis(
    [
      { id: "six-parts", libelle: "6 parts", prix: 1800 },
      { id: "dix-parts", libelle: "10 parts", prix: 3000 },
      { id: "vingt-parts", libelle: "20 parts", prix: 5500 },
    ],
    100,
  );
  const occasions = lignesDepuis(
    [
      { id: "anniversaire", libelle: "Anniversaire" },
      { id: "mariage", libelle: "Mariage" },
      { id: "bapteme", libelle: "Baptême & communion" },
    ],
    200,
  );
  return JSON.stringify(
    corpsDEnregistrement([
      { id: "parfum", avecPrix: true, lignes: parfums },
      { id: "nombre-de-parts", avecPrix: true, lignes: sixParts },
      { id: "occasion", avecPrix: false, lignes: occasions },
    ]),
  );
}

async function poster(cookie: string, corps: string): Promise<Response> {
  return exports.default.fetch(
    new Request(ROUTE_GATEAU, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: corps,
    }),
  );
}

async function lireEcran(cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request("https://example.com/admin/formulaires/devis-gateau", {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  return reponse.text();
}

function zoneMarque(html: string): string {
  return (
    /<span data-zone-marque-brouillon[^>]*>([\s\S]*?)<\/span>/.exec(
      html,
    )?.[1] ?? ""
  );
}

async function nombreDeBrouillons(db: DBLike): Promise<number> {
  const r = await db
    .prepare(`select formulaire from ${TABLE_BROUILLONS}`)
    .all();
  return r.results.length;
}

interface Retour {
  ok: boolean;
  champs?: {
    id: string;
    options: { id: string; libelle: string; prix?: number }[];
  }[];
  refus?: { champ: string; raison: string }[];
}

describe("SC-07a — monter « Fraise » de deux rangs puis enregistrer", () => {
  it("SC-07a — le brouillon porte « Fraise », « Vanille », « Chocolat » dans cet ordre", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const lignes = deplacer(deplacer(lignesDepuis(PARFUMS, 0), 2, -1), 1, -1);

    // Act
    const reponse = await poster(cookie, corpsDeLIlot(lignes));

    // Assert
    expect(reponse.status).toBe(200);
    const json = (await reponse.json()) as Retour;
    const parfum = json.champs?.find((c) => c.id === "parfum");
    expect(parfum?.options.map((o) => o.libelle)).toEqual([
      "Fraise",
      "Vanille",
      "Chocolat",
    ]);
    expect(parfum?.options.map((o) => o.id)).toEqual([
      "fraise",
      "vanille",
      "chocolat",
    ]);
    const stocke = await db
      .prepare(`select contenu from ${TABLE_BROUILLONS}`)
      .all();
    const contenu = JSON.parse(
      (stocke.results[0] as { contenu: string }).contenu,
    ) as {
      champs: { parfum: { libelle: string }[] };
    };
    expect(contenu.champs.parfum.map((o) => o.libelle)).toEqual([
      "Fraise",
      "Vanille",
      "Chocolat",
    ]);
  });
});

describe("SC-07b — un prix écrit « douze »", () => {
  it("SC-07b — la route désigne l'option fautive, n'enregistre rien et le formulaire garde sa marque absente", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const lignes = lignesDepuis(PARFUMS, 0).map((l) =>
      l.id === "fraise" ? { ...l, prix: "douze" } : l,
    );

    // Act
    const reponse = await poster(cookie, corpsDeLIlot(lignes));

    // Assert
    expect(reponse.status).toBe(400);
    const json = (await reponse.json()) as Retour;
    expect(json.ok).toBe(false);
    expect(json.refus).toEqual([
      { champ: "parfum.2.prix", raison: "prix-invalide" },
    ]);
    expect(TEXTES_REFUS_FORMULAIRE[json.refus?.[0]?.raison ?? ""]).toBe(
      "Un montant en euros, par exemple 12 ou 12,50.",
    );
    expect(await nombreDeBrouillons(db)).toBe(0);
    expect(zoneMarque(await lireEcran(cookie))).not.toContain(
      "data-pastille-brouillon",
    );
  });
});

describe("SC-07c — un enregistrement réussi", () => {
  it("SC-07c — le brouillon existe aussitôt et l'écran porte alors la marque", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    expect(zoneMarque(await lireEcran(cookie))).not.toContain(
      "data-pastille-brouillon",
    );

    // Act
    const reponse = await poster(
      cookie,
      corpsDeLIlot(lignesDepuis(PARFUMS, 0)),
    );

    // Assert
    expect(reponse.status).toBe(200);
    expect(await nombreDeBrouillons(db)).toBe(1);
    expect(zoneMarque(await lireEcran(cookie))).toContain(
      "data-pastille-brouillon",
    );
  });

  it("SC-07c — les identifiants rendus permettent de renvoyer la saisie affichée sans doublon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const premiere = await poster(
      cookie,
      corpsDeLIlot(
        ajouter(lignesDepuis(PARFUMS, 0), 50).map((l) =>
          l.id === undefined ? { ...l, libelle: "Pistache", prix: "12" } : l,
        ),
      ),
    );
    const rendu =
      ((await premiere.json()) as Retour).champs?.find((c) => c.id === "parfum")
        ?.options ?? [];

    // Act : l'îlot reprend les identifiants rendus, puis renvoie la même saisie.
    const reprises = lignesDepuis(rendu, 0);
    const seconde = await poster(cookie, corpsDeLIlot(reprises));

    // Assert
    expect(seconde.status).toBe(200);
    const apres =
      ((await seconde.json()) as Retour).champs?.find((c) => c.id === "parfum")
        ?.options ?? [];
    expect(apres.map((o) => o.id)).toEqual(rendu.map((o) => o.id));
    expect(apres).toHaveLength(4);
    expect(await nombreDeBrouillons(db)).toBe(1);
  });
});
