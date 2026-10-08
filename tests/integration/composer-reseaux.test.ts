/**
 * Ticket 07 (008) — La liste des réseaux sociaux s'écrit au brouillon.
 * Couture : requête HTTP réelle via `exports.default.fetch`, dans `workerd`,
 * contre la vraie D1 locale. Session valide semée directement.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_BROUILLONS = "brouillons_reglages";
const ROUTE = "https://example.com/admin/reglages/reseaux";

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
  const id = `session-reseaux-${crypto.randomUUID()}`;
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

describe("SC-07b — enregistrer trois liens", () => {
  it("SC-07b — écrit trois liens dans l'ordre soumis au brouillon des réseaux", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    const reseaux = [
      { nom: "Instagram", lien: "https://instagram.com/atelier" },
      { nom: "Facebook", lien: "https://facebook.com/atelier" },
      { nom: "Mon blog", lien: "https://blog.exemple.fr" },
    ];

    // Act
    const reponse = await enregistrer(cookie, { reseaux });

    // Assert
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true });
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].reglage).toBe("reseaux");
    expect(JSON.parse(lignes[0].contenu)).toEqual(reseaux);
  });

  it("SC-07b — une seconde liste remplace entièrement le brouillon des réseaux", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    await enregistrer(cookie, {
      reseaux: [
        { nom: "Instagram", lien: "https://instagram.com/atelier" },
        { nom: "Facebook", lien: "https://facebook.com/atelier" },
        { nom: "Mon blog", lien: "https://blog.exemple.fr" },
      ],
    });
    const seconde = [
      { nom: "Pinterest", lien: "https://pinterest.com/atelier" },
    ];

    // Act
    const reponse = await enregistrer(cookie, { reseaux: seconde });

    // Assert
    expect(reponse.status).toBe(200);
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].reglage).toBe("reseaux");
    expect(JSON.parse(lignes[0].contenu)).toEqual(seconde);
  });
});

describe("SC-07c — liste vide", () => {
  it("SC-07c — une liste sans aucun lien écrit une liste vide au brouillon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(cookie, { reseaux: [] });

    // Assert
    expect(reponse.status).toBe(200);
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].reglage).toBe("reseaux");
    expect(JSON.parse(lignes[0].contenu)).toEqual([]);
  });
});

describe("SC-07e — un seul lien refusé refuse toute la liste", () => {
  it("SC-07e — deux liens valides et une adresse en http n'écrivent rien et désignent l'adresse refusée", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(cookie, {
      reseaux: [
        { nom: "Instagram", lien: "https://instagram.com/atelier" },
        { nom: "Blog", lien: "http://blog.exemple.fr" },
        { nom: "Facebook", lien: "https://facebook.com/atelier" },
      ],
    });

    // Assert
    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as {
      ok: boolean;
      refus: { champ: string; raison: string }[];
    };
    expect(corps.ok).toBe(false);
    expect(corps.refus).toEqual([
      { champ: "reseaux.1.lien", raison: "adresse-pas-https" },
    ]);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });

  it("SC-07e — un refus laisse intact le brouillon existant et les autres réglages", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    await db
      .prepare(
        `insert into ${TABLE_BROUILLONS} (reglage, contenu, maj_le) values (?1, ?2, ?3)`,
      )
      .bind("coordonnees", '{"telephone":"0123456789"}', 1)
      .run();
    const bon = [{ nom: "Blog", lien: "https://blog.exemple.fr" }];
    expect((await enregistrer(cookie, { reseaux: bon })).status).toBe(200);

    // Act
    const reponse = await enregistrer(cookie, {
      reseaux: [{ nom: "Blog", lien: "http://blog.exemple.fr" }],
    });

    // Assert
    expect(reponse.status).toBe(400);
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(2);
    const reseaux = lignes.find((l) => l.reglage === "reseaux");
    expect(JSON.parse(reseaux?.contenu ?? "null")).toEqual(bon);
    const coordonnees = lignes.find((l) => l.reglage === "coordonnees");
    expect(JSON.parse(coordonnees?.contenu ?? "null")).toEqual({
      telephone: "0123456789",
    });
  });

  it("SC-07e — sans session, la liste est refusée en 401 et rien n'est écrit", async () => {
    // Arrange
    const db = await assurerSchema();

    // Act
    const reponse = await exports.default.fetch(
      new Request(ROUTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reseaux: [] }),
      }),
    );

    // Assert
    expect(reponse.status).toBe(401);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});
