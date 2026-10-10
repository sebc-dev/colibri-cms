/**
 * Change 010, ticket 05 — Une correction des options s'enregistre au brouillon
 * du formulaire.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale (ADR-0003). Les migrations 0003 et 0008 sont
 * rejouées ici même ; une session valide est semée directement. Les
 * formulaires lus sont ceux déclarés au dépôt (`content/formulaires/*`).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";

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

interface OptionCorps {
  id?: string;
  libelle: string;
  prix?: string;
}
interface OptionLue {
  id: string;
  libelle: string;
  prix?: number;
}
interface ChampLu {
  id: string;
  options: OptionLue[];
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
  const id = `session-enregistrer-options-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

function parfumsDeBase(): OptionCorps[] {
  return [
    { id: "vanille", libelle: "Vanille", prix: "8" },
    { id: "chocolat", libelle: "Chocolat", prix: "9" },
    { id: "fraise", libelle: "Fraise", prix: "10" },
  ];
}

/** Le corps complet de « Devis gâteau » : tous les champs à choix, parfums remplaçables. */
function corpsGateau(parfums: OptionCorps[] = parfumsDeBase()): {
  champs: { id: string; options: OptionCorps[] }[];
} {
  return {
    champs: [
      { id: "parfum", options: parfums },
      {
        id: "nombre-de-parts",
        options: [
          { id: "six-parts", libelle: "6 parts", prix: "18" },
          { id: "dix-parts", libelle: "10 parts", prix: "30" },
          { id: "vingt-parts", libelle: "20 parts", prix: "55" },
        ],
      },
      {
        id: "occasion",
        options: [
          { id: "anniversaire", libelle: "Anniversaire" },
          { id: "mariage", libelle: "Mariage" },
          { id: "bapteme", libelle: "Baptême & communion" },
        ],
      },
    ],
  };
}

async function poster(
  cookie: string | null,
  corps: string,
  url = ROUTE_GATEAU,
): Promise<Response> {
  return exports.default.fetch(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } : {}),
      },
      body: corps,
    }),
  );
}

async function lignes(
  db: DBLike,
): Promise<{ formulaire: string; contenu: string }[]> {
  const r = await db
    .prepare(`select formulaire, contenu from ${TABLE_BROUILLONS}`)
    .all();
  return r.results as { formulaire: string; contenu: string }[];
}

async function parfumsRetournes(reponse: Response): Promise<OptionLue[]> {
  const json = (await reponse.json()) as { ok: boolean; champs: ChampLu[] };
  const parfum = json.champs.find((c) => c.id === "parfum");
  return parfum?.options ?? [];
}

describe("SC-05a — corriger le prix d’une option", () => {
  it("SC-05a — « Vanille » à 10 au lieu de 8 € est portée au brouillon, les autres options inchangées", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const parfums = parfumsDeBase();
    parfums[0] = { id: "vanille", libelle: "Vanille", prix: "10" };

    // Act
    const reponse = await poster(cookie, JSON.stringify(corpsGateau(parfums)));

    // Assert
    expect(reponse.status).toBe(200);
    const retour = await parfumsRetournes(reponse);
    expect(retour).toEqual([
      { id: "vanille", libelle: "Vanille", prix: 1000 },
      { id: "chocolat", libelle: "Chocolat", prix: 900 },
      { id: "fraise", libelle: "Fraise", prix: 1000 },
    ]);
    const stocke = await lignes(db);
    expect(stocke).toHaveLength(1);
    const contenu = JSON.parse(stocke[0]?.contenu ?? "{}") as {
      champs: Record<string, OptionLue[]>;
    };
    expect(contenu.champs.parfum).toEqual(retour);
  });
});

describe("SC-05b — renommer une option", () => {
  it("SC-05b — « Fraise des bois » garde le rang et l’identifiant de « Fraise »", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const parfums = parfumsDeBase();
    parfums[2] = { id: "fraise", libelle: "Fraise des bois", prix: "10" };

    // Act
    const reponse = await poster(cookie, JSON.stringify(corpsGateau(parfums)));

    // Assert
    expect(reponse.status).toBe(200);
    const retour = await parfumsRetournes(reponse);
    expect(retour[2]).toEqual({
      id: "fraise",
      libelle: "Fraise des bois",
      prix: 1000,
    });
    expect(retour.map((o) => o.libelle)).toEqual([
      "Vanille",
      "Chocolat",
      "Fraise des bois",
    ]);
  });
});

describe("SC-05c — ajouter une option", () => {
  it("SC-05c — « Pistache » à 12 en dernier, avec un identifiant neuf distinct des trois autres", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const parfums = [...parfumsDeBase(), { libelle: "Pistache", prix: "12" }];

    // Act
    const reponse = await poster(cookie, JSON.stringify(corpsGateau(parfums)));

    // Assert
    expect(reponse.status).toBe(200);
    const retour = await parfumsRetournes(reponse);
    expect(retour).toHaveLength(4);
    const derniere = retour.at(3);
    expect(derniere?.libelle).toBe("Pistache");
    expect(derniere?.prix).toBe(1200);
    const ids = retour.map((o) => o.id);
    expect(derniere?.id).toBeTruthy();
    expect(new Set(ids).size).toBe(4);
  });

  it("SC-05c — l’identifiant neuf de « Pistache » est stable : un second enregistrement qui le reprend remplace le brouillon, sans doublon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const r1 = await poster(
      cookie,
      JSON.stringify(
        corpsGateau([...parfumsDeBase(), { libelle: "Pistache", prix: "12" }]),
      ),
    );
    expect(r1.status).toBe(200);
    const idPistache = (await parfumsRetournes(r1)).at(3)?.id;
    expect(idPistache).toBeDefined();
    if (idPistache === undefined) throw new Error("Pistache sans identifiant");

    // Act
    const r2 = await poster(
      cookie,
      JSON.stringify(
        corpsGateau([
          ...parfumsDeBase(),
          { id: idPistache, libelle: "Pistache", prix: "13" },
        ]),
      ),
    );

    // Assert
    expect(r2.status).toBe(200);
    const retour = await parfumsRetournes(r2);
    expect(retour).toHaveLength(4);
    expect(retour.at(3)).toEqual({
      id: idPistache,
      libelle: "Pistache",
      prix: 1300,
    });
    const stocke = await lignes(db);
    expect(stocke).toHaveLength(1);
    const contenu = JSON.parse(stocke.at(0)?.contenu ?? "{}") as {
      champs: Record<string, OptionLue[]>;
    };
    expect(contenu.champs.parfum).toEqual(retour);
  });

  it("SC-05c — l’identifiant d’une option ajoutée puis retirée n’est jamais redonné", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const r1 = await poster(
      cookie,
      JSON.stringify(
        corpsGateau([...parfumsDeBase(), { libelle: "Pistache", prix: "12" }]),
      ),
    );
    expect(r1.status).toBe(200);
    const idPistache = (await parfumsRetournes(r1)).at(3)?.id;
    expect(idPistache).toBeDefined();
    const r2 = await poster(cookie, JSON.stringify(corpsGateau(parfumsDeBase())));
    expect(r2.status).toBe(200);

    // Act
    const r3 = await poster(
      cookie,
      JSON.stringify(
        corpsGateau([...parfumsDeBase(), { libelle: "Noisette", prix: "11" }]),
      ),
    );

    // Assert
    expect(r3.status).toBe(200);
    const idNoisette = (await parfumsRetournes(r3)).at(3)?.id;
    expect(idNoisette).toBeDefined();
    for (const pris of [idPistache, "vanille", "chocolat", "fraise"]) {
      expect(idNoisette).not.toBe(pris);
    }
    const stocke = await lignes(db);
    expect(stocke).toHaveLength(1);
    const contenu = JSON.parse(stocke.at(0)?.contenu ?? "{}") as {
      derniersNumeros?: Record<string, number>;
    };
    expect(contenu.derniersNumeros).toHaveProperty("parfum");
  });

  it("SC-05c — un brouillon sans derniersNumeros reste un brouillon : l’option ajoutée qu’il porte est reprise par son identifiant", async () => {
    // Arrange : un brouillon écrit sans la clé `derniersNumeros`.
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    await db
      .prepare(
        `insert into ${TABLE_BROUILLONS} (formulaire, contenu, maj_le) values (?1, ?2, ?3)`,
      )
      .bind(
        "devis-gateau",
        JSON.stringify({
          champs: {
            parfum: [
              { id: "vanille", libelle: "Vanille", prix: 800 },
              { id: "chocolat", libelle: "Chocolat", prix: 900 },
              { id: "fraise", libelle: "Fraise", prix: 1000 },
              { id: "o4", libelle: "Pistache", prix: 1200 },
            ],
          },
        }),
        Date.now(),
      )
      .run();

    // Act
    const reponse = await poster(
      cookie,
      JSON.stringify(
        corpsGateau([
          ...parfumsDeBase(),
          { id: "o4", libelle: "Pistache", prix: "12" },
        ]),
      ),
    );

    // Assert
    expect(reponse.status).toBe(200);
    expect((await parfumsRetournes(reponse)).at(3)).toEqual({
      id: "o4",
      libelle: "Pistache",
      prix: 1200,
    });
    expect(await lignes(db)).toHaveLength(1);
  });
});

describe("SC-05d — retirer une option", () => {
  it("SC-05d — sans « Chocolat », le brouillon porte « Vanille » puis « Fraise » seulement", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const parfums = parfumsDeBase().filter((o) => o.libelle !== "Chocolat");

    // Act
    const reponse = await poster(cookie, JSON.stringify(corpsGateau(parfums)));

    // Assert
    expect(reponse.status).toBe(200);
    const retour = await parfumsRetournes(reponse);
    expect(retour.map((o) => o.libelle)).toEqual(["Vanille", "Fraise"]);
    expect((await lignes(db))[0]?.contenu).not.toContain("Chocolat");
  });
});

describe("SC-05e — le brouillon est celui du seul formulaire corrigé", () => {
  it("SC-05e — « Devis gâteau » porte un brouillon ; « Devis atelier », les réglages et la déclaration n’en reçoivent pas", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const declaration =
      await import("../../content/formulaires/devis-gateau/formulaire.json?raw");

    // Act
    const reponse = await poster(cookie, JSON.stringify(corpsGateau()));

    // Assert
    expect(reponse.status).toBe(200);
    const stocke = await lignes(db);
    expect(stocke.map((l) => l.formulaire)).toEqual(["devis-gateau"]);
    // Les réglages ne portent pas de nouveau brouillon (table absente ou vide).
    const reglages = await db
      .prepare('select * from brouillons_reglages')
      .all()
      .then(
        (r) => r.results,
        () => [],
      );
    expect(reglages).toHaveLength(0);
    // La déclaration reste celle du dépôt : « Vanille » à 800 centimes.
    expect(declaration.default).toContain('"prix": 800');
  });
});

describe("SC-05f — la migration 0008 est additive", () => {
  it("SC-05f — ne crée que la table des brouillons de formulaires, sans toucher aucune table existante", async () => {
    // Arrange
    const migration =
      await import("../../migrations/0008_brouillons_formulaires.sql?raw");

    // Act
    const requetes = separerRequetes(migration.default);

    // Assert
    expect(requetes).toHaveLength(1);
    expect(requetes[0]).toMatch(/^create table brouillons_formulaires\b/i);
    expect(migration.default).not.toMatch(/\b(alter|drop|delete|update)\b/i);
  });
});

describe("SC-05g — sans session", () => {
  it("SC-05g — la correction est refusée et aucun brouillon n’est écrit", async () => {
    // Arrange
    const db = await assurerSchema();

    // Act
    const reponse = await poster(null, JSON.stringify(corpsGateau()));

    // Assert
    expect(reponse.status).toBe(401);
    expect(await lignes(db)).toHaveLength(0);
  });
});

describe("SC-05h — formulaire non déclaré", () => {
  it("SC-05h — un identifiant inconnu reçoit « introuvable » et rien n’est écrit", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);

    // Act
    const reponse = await poster(
      cookie,
      JSON.stringify(corpsGateau()),
      "https://example.com/admin/formulaires/inconnu/options",
    );

    // Assert
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ ok: false, raison: "introuvable" });
    expect(await lignes(db)).toHaveLength(0);
  });
});

describe("SC-05i — corps illisible, inattendu ou démesuré", () => {
  it.each([
    ["non JSON", "ceci n’est pas du JSON", 400],
    ["de forme inattendue", JSON.stringify({ champs: "oups" }), 400],
    [
      "démesuré (plus de 64 Kio)",
      JSON.stringify({ champs: [], bourrage: "x".repeat(70 * 1024) }),
      413,
    ],
  ])(
    "SC-05i — un corps %s est refusé sans erreur serveur et rien n’est écrit",
    async (_cas, corps, statut) => {
      // Arrange
      const db = await assurerSchema();
      const cookie = await semerSession(db);

      // Act
      const reponse = await poster(cookie, corps);

      // Assert
      expect(reponse.status).toBe(statut);
      expect(reponse.status).toBeLessThan(500);
      expect(await lignes(db)).toHaveLength(0);
    },
  );

  it("SC-05i — une valeur refusée (prix « douze » pour « Vanille ») est refusée en 400, désigne l’option fautive et laisse intact le brouillon existant", async () => {
    // Arrange : un brouillon où « Vanille » vaut 10 €.
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const parfums = parfumsDeBase();
    parfums[0] = { id: "vanille", libelle: "Vanille", prix: "10" };
    const r1 = await poster(cookie, JSON.stringify(corpsGateau(parfums)));
    expect(r1.status).toBe(200);
    const fautifs = parfumsDeBase();
    fautifs[0] = { id: "vanille", libelle: "Vanille", prix: "douze" };

    // Act
    const reponse = await poster(cookie, JSON.stringify(corpsGateau(fautifs)));

    // Assert
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toEqual({
      ok: false,
      refus: [{ champ: "parfum.0.prix", raison: "prix-invalide" }],
    });
    const stocke = await lignes(db);
    expect(stocke).toHaveLength(1);
    const contenu = JSON.parse(stocke.at(0)?.contenu ?? "{}") as {
      champs: Record<string, OptionLue[]>;
    };
    expect(contenu.champs.parfum.at(0)?.prix).toBe(1000);
  });
});

describe("SC-05j — écriture forgée depuis une autre origine", () => {
  it("SC-05j — une requête cross-site, sans le cookie SameSite=Strict que le navigateur n’attache pas, n’aboutit pas", async () => {
    // Arrange
    const db = await assurerSchema();
    await semerSession(db);

    // Act
    const reponse = await exports.default.fetch(
      new Request(ROUTE_GATEAU, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://site-pirate.example",
          "sec-fetch-site": "cross-site",
        },
        body: JSON.stringify(corpsGateau()),
      }),
    );

    // Assert
    expect(reponse.status).toBe(401);
    expect(await lignes(db)).toHaveLength(0);
  });
});
