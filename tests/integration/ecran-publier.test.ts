/**
 * Change 011, ticket 10 — « Publier » mène au récapitulatif.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale ; session et brouillons semés directement.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLES_BROUILLONS = [
  "brouillons_emplacements",
  "brouillons_reglages",
  "brouillons_formulaires",
];
const PUBLIER = "https://example.com/admin/publier";

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
    const migrations = [
      await import("../../migrations/0003_sessions.sql?raw"),
      await import("../../migrations/0004_brouillons_emplacements.sql?raw"),
      await import("../../migrations/0007_brouillons_reglages.sql?raw"),
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
    ];
    for (const module of migrations) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà créée : sans effet.
        }
      }
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
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, ...TABLES_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-publier-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function semerBrouillonReglage(db: DBLike, reglage: string) {
  await db
    .prepare(
      `insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)`,
    )
    .bind(reglage, JSON.stringify({ texte: "x" }), Date.now())
    .run();
}

async function semerBrouillonPage(db: DBLike, slug: string) {
  await db
    .prepare(
      `insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(slug, "presentation", "texte-riche", "{}", Date.now())
    .run();
}

async function semerBrouillonFormulaire(db: DBLike, formulaire: string) {
  await db
    .prepare(
      `insert into brouillons_formulaires (formulaire, contenu, maj_le) values (?1, ?2, ?3)`,
    )
    .bind(
      formulaire,
      JSON.stringify({ champs: {}, derniersNumeros: {} }),
      Date.now(),
    )
    .run();
}

async function ouvrir(
  db: DBLike,
  route: string,
): Promise<{ reponse: Response; corps: string }> {
  const cookie = await semerSession(db);
  const reponse = await exports.default.fetch(
    new Request(route, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  return { reponse, corps: await reponse.text() };
}

function mainDe(corps: string): string {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, "le contenu (<main>) devrait être présent").toBeDefined();
  return main ?? "";
}

it("SC-10a — un écran gardé arrive avec le logo, les cinq rubriques, « Publier » et le contenu, sans script requis", async () => {
  const db = await assurerSchema();

  const { reponse, corps } = await ouvrir(
    db,
    "https://example.com/admin/mes-pages",
  );

  expect(reponse.status).toBe(200);
  expect(corps).toMatch(/<svg[\s\S]*?<\/svg>/);
  const aside = /<aside[^>]*>([\s\S]*?)<\/aside>/.exec(corps)?.[1] ?? "";
  for (const rubrique of [
    "Mes pages",
    "Médias",
    "Réglages",
    "Formulaires",
    "Demandes",
  ]) {
    expect(aside).toContain(rubrique);
  }
  expect(aside).toMatch(/aria-current="page"[^>]*>[\s\S]*?Mes pages/);
  const publier = balise(corps, "bouton-publier");
  expect(publier).toMatch(/href="\/admin\/publier\?retour=/);
  expect(corps).toMatch(/id="bouton-publier"[^>]*>(<[^>]+>|\s)*Publier/);
  expect(mainDe(corps).length).toBeGreaterThan(0);
});

it("SC-10b — « Publier » d'un écran gardé pointe vers l'écran Publier, qui montre le récapitulatif sans rien mettre en ligne", async () => {
  const db = await assurerSchema();
  await semerBrouillonReglage(db, "mention");

  const ecran = await ouvrir(db, "https://example.com/admin/reglages");
  const href = /href="(\/admin\/publier\?retour=[^"]*)"/.exec(ecran.corps)?.[1];
  expect(href).toBeDefined();
  const { reponse, corps } = await ouvrir(
    db,
    `https://example.com${(href ?? "").replaceAll("&amp;", "&")}`,
  );

  expect(reponse.status).toBe(200);
  expect(mainDe(corps)).toContain("Voici ce qui va être mis en ligne");
  expect(mainDe(corps)).toContain("Mention d&#39;information");
  expect(corps).not.toMatch(/Publier maintenant/);
  expect(mainDe(corps)).not.toMatch(/<form/);
});

it("SC-10c — le bouton de menu et « Publier » sont rendus dans la barre haute, hors de la barre latérale", async () => {
  const db = await assurerSchema();

  const { corps } = await ouvrir(db, "https://example.com/admin/mes-pages");

  const entete = /<header[^>]*>([\s\S]*?)<\/header>/.exec(corps)?.[1] ?? "";
  expect(entete).toContain('id="bouton-ouvrir-tiroir"');
  expect(entete).toContain('id="bouton-publier"');
  expect(corps).toMatch(/<dialog[^>]*id="tiroir-menu"/);
  const tiroir = /<dialog[\s\S]*?<\/dialog>/.exec(corps)?.[0] ?? "";
  for (const rubrique of ["Mes pages", "Médias", "Réglages", "Formulaires", "Demandes"]) {
    expect(tiroir).toContain(rubrique);
  }
});

it("SC-10d — seul le réglage « Mention d'information » en brouillon : il est listé, sans page, formulaire ni image", async () => {
  const db = await assurerSchema();
  await semerBrouillonReglage(db, "mention");

  const { corps } = await ouvrir(db, PUBLIER);

  const main = mainDe(corps);
  expect(main).toContain("data-recap-reglages");
  expect(main).toContain("Mention d&#39;information");
  expect(main).not.toContain("data-recap-pages");
  expect(main).not.toContain("data-recap-formulaires");
  expect(main).not.toMatch(/<img/i);
});

it("SC-10e — une page listée porte son lien « Voir l'aperçu » vers son aperçu", async () => {
  const db = await assurerSchema();
  await semerBrouillonPage(db, "tarifs");

  const { corps } = await ouvrir(db, PUBLIER);

  const main = mainDe(corps);
  expect(main).toContain("Tarifs");
  expect(main).toMatch(/<a[^>]*href="\/admin\/apercu\/tarifs"[^>]*>Voir l/);
});

it("SC-10f — sans brouillon : message « rien à publier », aucun geste de mise en ligne", async () => {
  const db = await assurerSchema();

  const { reponse, corps } = await ouvrir(db, PUBLIER);

  expect(reponse.status).toBe(200);
  const main = mainDe(corps);
  expect(main).toContain("rien à publier");
  expect(main).toContain("Revenir à mes pages");
  expect(main).not.toMatch(/<form|<button|Publier maintenant/);
  expect(main).not.toContain("data-recap-");
});

it("SC-10g — sans session, l'écran Publier renvoie à la connexion sans rien montrer du récapitulatif", async () => {
  const db = await assurerSchema();
  await semerBrouillonReglage(db, "mention");

  const reponse = await exports.default.fetch(
    new Request(PUBLIER, { redirect: "manual" }),
  );

  expect(reponse.status).toBe(302);
  expect(reponse.headers.get("location")).toContain("/admin/connexion");
  const corps = await reponse.text();
  expect(corps).not.toContain("Mention d");
  expect(corps).not.toContain("Voici ce qui va être mis en ligne");
});

it("SC-10h — « Annuler » ramène à l'écran quitté ; rien n'est déposé, les brouillons restent intacts", async () => {
  const db = await assurerSchema();
  await semerBrouillonReglage(db, "mention");
  await semerBrouillonPage(db, "tarifs");
  const avant = await compter(db);

  const { corps } = await ouvrir(
    db,
    `${PUBLIER}?retour=${encodeURIComponent("/admin/reglages")}`,
  );

  expect(balise(corps, "annuler-publier")).toContain('href="/admin/reglages"');
  expect(await compter(db)).toEqual(avant);
  expect(avant).toEqual({ reglages: 1, emplacements: 1, formulaires: 0 });
});

it("SC-10h — un retour externe est écarté : « Annuler » revient à Mes pages", async () => {
  const db = await assurerSchema();
  await semerBrouillonReglage(db, "mention");

  const { corps } = await ouvrir(
    db,
    `${PUBLIER}?retour=${encodeURIComponent("https://evil.example/admin/x")}`,
  );

  expect(balise(corps, "annuler-publier")).toContain('href="/admin/mes-pages"');
  expect(balise(corps, "annuler-publier")).not.toContain("evil.example");
});

async function compter(db: DBLike): Promise<{
  reglages: number;
  emplacements: number;
  formulaires: number;
}> {
  const lire = async (table: string): Promise<number> => {
    const r = await (
      db as unknown as {
        prepare(q: string): { first(): Promise<{ n: number } | null> };
      }
    )
      .prepare(`select count(*) as n from ${table}`)
      .first();
    return r?.n ?? 0;
  };
  return {
    reglages: await lire("brouillons_reglages"),
    emplacements: await lire("brouillons_emplacements"),
    formulaires: await lire("brouillons_formulaires"),
  };
}

it("SC-10d — un formulaire en brouillon est listé par son nom, sans les autres listes", async () => {
  const db = await assurerSchema();
  await semerBrouillonFormulaire(db, "devis-gateau");

  const { corps } = await ouvrir(db, PUBLIER);

  const main = mainDe(corps);
  expect(main).toContain("data-recap-formulaires");
  expect(main).toContain("Devis g");
  expect(main).not.toContain("data-recap-pages");
  expect(main).not.toContain("data-recap-reglages");
});

function balise(corps: string, id: string): string {
  return new RegExp(`<a[^>]*id="${id}"[^>]*>`).exec(corps)?.[0] ?? "";
}
