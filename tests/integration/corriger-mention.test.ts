/**
 * Ticket 08 (008) — La mention d'information s'écrit au brouillon en Markdown restreint.
 * Couture : requête HTTP réelle via `exports.default.fetch`, dans `workerd`,
 * contre la vraie D1 locale. Session valide semée directement.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_BROUILLONS = "brouillons_reglages";
const ROUTE = "https://example.com/admin/reglages/mention";

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
    const reglages =
      await import("../../migrations/0007_brouillons_reglages.sql?raw");
    for (const requete of separerRequetes(reglages.default)) {
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
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-mention-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function enregistrer(cookie: string, corps: unknown): Promise<Response> {
  return exports.default.fetch(
    new Request(ROUTE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: JSON.stringify(corps),
    }),
  );
}

async function lireBrouillons(
  db: DBLike,
): Promise<{ reglage: string; contenu: string }[]> {
  const resultat = await db
    .prepare(`select reglage, contenu from ${TABLE_BROUILLONS}`)
    .all();
  return resultat.results as { reglage: string; contenu: string }[];
}

function doc(...paragraphes: unknown[]): unknown {
  return { type: "doc", content: paragraphes };
}

const PARAGRAPHE_RICHE = {
  type: "paragraph",
  content: [
    { type: "text", text: "Vos données restent " },
    { type: "text", text: "chez nous", marks: [{ type: "bold" }] },
    { type: "text", text: " — " },
    {
      type: "text",
      text: "en savoir plus",
      marks: [{ type: "link", attrs: { href: "https://exemple.fr/donnees" } }],
    },
  ],
};

describe("SC-08a — gras et lien https au brouillon", () => {
  it("SC-08a — écrit le Markdown restreint au brouillon de la mention", async () => {
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    const reponse = await enregistrer(cookie, {
      document: doc(PARAGRAPHE_RICHE),
    });

    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true });
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].reglage).toBe("mention");
    const markdown = JSON.parse(lignes[0].contenu) as string;
    expect(markdown).toContain("**chez nous**");
    expect(markdown).toContain("[en savoir plus](https://exemple.fr/donnees)");
  });
});

describe("SC-08c — mention vide", () => {
  it("SC-08c — une mention d'espaces n'écrit rien et dit qu'elle ne peut pas rester vide", async () => {
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    const reponse = await enregistrer(cookie, {
      document: doc({
        type: "paragraph",
        content: [{ type: "text", text: "   " }],
      }),
    });

    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as {
      ok: boolean;
      refus: { champ: string; raison: string }[];
    };
    expect(corps.ok).toBe(false);
    expect(corps.refus).toEqual([{ champ: "mention", raison: "mention-vide" }]);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });

  it("SC-08c — un document sans contenu n'écrit rien", async () => {
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    const reponse = await enregistrer(cookie, { document: doc() });

    expect(reponse.status).toBe(400);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});

describe("SC-08e — seule la mention porte un brouillon", () => {
  it("SC-08e — une correction ne marque que la mention, et la seconde remplace la première", async () => {
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    await enregistrer(cookie, { document: doc(PARAGRAPHE_RICHE) });

    const reponse = await enregistrer(cookie, {
      document: doc({
        type: "paragraph",
        content: [{ type: "text", text: "Texte corrigé" }],
      }),
    });

    expect(reponse.status).toBe(200);
    const lignes = await lireBrouillons(db);
    expect(lignes.map((l) => l.reglage)).toEqual(["mention"]);
    expect(JSON.parse(lignes[0].contenu)).toBe("Texte corrigé");
  });

  it("SC-08e — sans session, rien n'est écrit", async () => {
    const db = await assurerSchema();

    const reponse = await exports.default.fetch(
      new Request(ROUTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document: doc(PARAGRAPHE_RICHE) }),
      }),
    );

    expect(reponse.status).toBe(401);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});
