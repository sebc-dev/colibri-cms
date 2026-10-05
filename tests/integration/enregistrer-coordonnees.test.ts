/**
 * Ticket 05 — Une correction des coordonnées s'enregistre au brouillon
 * (openspec/changes/008-reglages-transverses/tickets/05-enregistrer-les-coordonnees.md).
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, contre la vraie D1 locale (ADR-0003). Les
 * migrations 0003 et 0007 sont rejouées ici même ; une session valide est
 * semée directement. Les coordonnées déclarées (content/reglages/reglages.json)
 * sont : `telephone` (téléphone), `courriel` (e-mail), `adresse` (adresse).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_BROUILLONS = "brouillons_reglages";
const ROUTE = "https://example.com/admin/reglages/coordonnees";
const TAILLE_MAX = 64 * 1024;

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
      console.warn(
        `nettoyage D1 ignoré pour ${table} (schéma absent) :`,
        erreur,
      );
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-enregistrer-coordonnees-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function enregistrer(
  cookieSession: string | null,
  corps: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request(ROUTE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookieSession
          ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` }
          : {}),
      },
      body: corps,
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

describe("SC-05a — la migration 0007 est additive", () => {
  it("SC-05a — crée la seule table des brouillons de réglages, sans toucher aucune table existante", async () => {
    // Arrange
    const reglages =
      await import("../../migrations/0007_brouillons_reglages.sql?raw");
    const requetes = separerRequetes(reglages.default);

    // Act
    const db = await assurerSchema();

    // Assert : une seule instruction, une création, rien d'altérant.
    expect(requetes).toHaveLength(1);
    expect(requetes[0]).toMatch(/^create table brouillons_reglages\b/i);
    expect(reglages.default).not.toMatch(/\b(alter|drop|delete|update)\b/i);
    // La table existe et n'admet qu'un des trois réglages, une ligne chacun.
    await db
      .prepare(
        `insert into ${TABLE_BROUILLONS} (reglage, contenu, maj_le) values (?1, ?2, ?3)`,
      )
      .bind("coordonnees", "{}", 1)
      .run();
    await expect(
      db
        .prepare(
          `insert into ${TABLE_BROUILLONS} (reglage, contenu, maj_le) values (?1, ?2, ?3)`,
        )
        .bind("coordonnees", "{}", 2)
        .run(),
    ).rejects.toBeTruthy();
    await expect(
      db
        .prepare(
          `insert into ${TABLE_BROUILLONS} (reglage, contenu, maj_le) values (?1, ?2, ?3)`,
        )
        .bind("inconnu", "{}", 3)
        .run(),
    ).rejects.toBeTruthy();
  });
});

describe("SC-05b — enregistrer les trois coordonnées au brouillon", () => {
  it("SC-05b — écrit les trois valeurs trimées au brouillon des coordonnées, qui porte alors un brouillon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "  +33 1 23 45 67 89  " },
          { id: "courriel", valeur: " atelier@exemple.fr " },
          {
            id: "adresse",
            valeur: "  12 rue des Tilleuls\n75000 Paris\nFrance  ",
          },
        ],
      }),
    );

    // Assert
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true });
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].reglage).toBe("coordonnees");
    expect(JSON.parse(lignes[0].contenu)).toEqual({
      telephone: "+33 1 23 45 67 89",
      courriel: "atelier@exemple.fr",
      adresse: "12 rue des Tilleuls\n75000 Paris\nFrance",
    });
  });

  it("SC-05b — un second enregistrement remplace le brouillon des coordonnées, toujours une seule ligne", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    const premiere = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [{ id: "telephone", valeur: "+33 1 23 45 67 89" }],
      }),
    );
    expect(premiere.status).toBe(200);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "01 99 99 99 99" },
          { id: "courriel", valeur: "autre@exemple.fr" },
        ],
      }),
    );

    // Assert
    expect(reponse.status).toBe(200);
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].reglage).toBe("coordonnees");
    expect(JSON.parse(lignes[0].contenu)).toEqual({
      telephone: "01 99 99 99 99",
      courriel: "autre@exemple.fr",
    });
  });
});

describe("SC-05c — valeur vide admise", () => {
  it("SC-05c — une valeur vide pour une coordonnée est écrite vide au brouillon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "" },
          { id: "courriel", valeur: "atelier@exemple.fr" },
        ],
      }),
    );

    // Assert
    expect(reponse.status).toBe(200);
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(JSON.parse(lignes[0].contenu)).toEqual({
      telephone: "",
      courriel: "atelier@exemple.fr",
    });
  });
});

describe("SC-05d — une valeur refusée refuse toute la soumission", () => {
  it("SC-05d — un e-mail mal formé avec un téléphone valide n’écrit rien et désigne le champ e-mail", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "+33 1 23 45 67 89" },
          { id: "courriel", valeur: "pas-un-courriel" },
        ],
      }),
    );

    // Assert
    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as {
      ok: boolean;
      refus: { champ: string; raison: string }[];
    };
    expect(corps.ok).toBe(false);
    expect(corps.refus).toEqual([{ champ: "courriel", raison: "email-forme" }]);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });

  it("SC-05d — une soumission refusée laisse intact le brouillon existant", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    const premiere = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "+33 1 23 45 67 89" },
          { id: "courriel", valeur: "atelier@exemple.fr" },
        ],
      }),
    );
    expect(premiere.status).toBe(200);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "01 99 99 99 99" },
          { id: "courriel", valeur: "pas-un-courriel" },
        ],
      }),
    );

    // Assert
    expect(reponse.status).toBe(400);
    const lignes = await lireBrouillons(db);
    expect(lignes).toHaveLength(1);
    expect(JSON.parse(lignes[0].contenu)).toEqual({
      telephone: "+33 1 23 45 67 89",
      courriel: "atelier@exemple.fr",
    });
  });
});

describe("SC-05e — la nature vient de la déclaration", () => {
  it("SC-05e — « texte d’une ligne » annoncé pour le téléphone est ignoré : « bonjour » est vérifié comme téléphone et refusé", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [{ id: "telephone", nature: "texte", valeur: "bonjour" }],
      }),
    );

    // Assert
    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as {
      ok: boolean;
      refus: { champ: string; raison: string }[];
    };
    expect(corps.ok).toBe(false);
    expect(corps.refus).toEqual([
      { champ: "telephone", raison: "telephone-caracteres" },
    ]);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});

describe("SC-05f — une coordonnée non déclarée est refusée", () => {
  it("SC-05f — une valeur pour un identifiant non déclaré est refusée, rien n’est enregistré", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(
      cookie,
      JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: "+33 1 23 45 67 89" },
          { id: "fax", valeur: "01 99 99 99 99" },
        ],
      }),
    );

    // Assert
    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as {
      ok: boolean;
      refus: { champ: string }[];
    };
    expect(corps.ok).toBe(false);
    expect(corps.refus.map((r) => r.champ)).toEqual(["fax"]);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});

describe("SC-05g — sans session ouverte", () => {
  it("SC-05g — une correction sans session est refusée et n’écrit aucun brouillon", async () => {
    // Arrange
    const db = await assurerSchema();

    // Act
    const reponse = await enregistrer(
      null,
      JSON.stringify({
        coordonnees: [{ id: "telephone", valeur: "+33 1 23 45 67 89" }],
      }),
    );

    // Assert
    expect(reponse.status).toBe(401);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});

describe("SC-05h — corps illisible, inattendu ou démesuré", () => {
  it("SC-05h — un corps non JSON est refusé en 400, sans erreur serveur ni brouillon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(cookie, "{pas du json");

    // Assert
    expect(reponse.status).toBe(400);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });

  it.each([
    ["un tableau", "[]"],
    ["un objet sans la liste attendue", '{"autre":1}'],
    [
      "une liste dont une entrée n’est pas un objet",
      '{"coordonnees":["telephone"]}',
    ],
    [
      "une valeur qui n’est pas un texte",
      '{"coordonnees":[{"id":"telephone","valeur":42}]}',
    ],
  ])(
    "SC-05h — un corps de forme inattendue (%s) est refusé en 400, sans brouillon",
    async (_cas, corpsBrut) => {
      // Arrange
      const db = await assurerSchema();
      const cookie = await semerSessionValide(db);

      // Act
      const reponse = await enregistrer(cookie, corpsBrut);

      // Assert
      expect(reponse.status).toBe(400);
      expect(await lireBrouillons(db)).toHaveLength(0);
    },
  );

  it("SC-05h — un corps de plus de 64 Kio est refusé en 413, sans brouillon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    const gros = JSON.stringify({
      coordonnees: [{ id: "adresse", valeur: "x".repeat(TAILLE_MAX + 1) }],
    });

    // Act
    const reponse = await enregistrer(cookie, gros);

    // Assert
    expect(reponse.status).toBe(413);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});

describe("SC-05i — écriture forgée depuis une autre origine", () => {
  it("SC-05i — une requête cross-site, sans le cookie SameSite=Strict que le navigateur n’attache pas, n’aboutit pas", async () => {
    // Arrange
    const db = await assurerSchema();

    // Act : en-têtes d'une requête forgée depuis un autre site, sans cookie.
    const reponse = await exports.default.fetch(
      new Request(ROUTE, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://pirate.example",
          "sec-fetch-site": "cross-site",
        },
        body: JSON.stringify({
          coordonnees: [{ id: "telephone", valeur: "+33 1 23 45 67 89" }],
        }),
      }),
    );

    // Assert
    expect(reponse.status).toBe(401);
    expect(await lireBrouillons(db)).toHaveLength(0);
  });
});
