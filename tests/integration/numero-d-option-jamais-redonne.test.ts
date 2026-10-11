/**
 * Change 011, ticket 14 — SC-14f : un identifiant d'option donné une fois n'est
 * jamais redonné dans le même champ, même après publication.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. L'état publié de « Devis gâteau » est semé
 * (ligne de `publies_formulaires`) : « Parfum » a reçu o1, o2 et o3, publiés ;
 * le brouillon est vide (neuf, après publication). Les deux cas suivants
 * sèment leur propre état publié — o3 donné puis retiré avant la publication,
 * puis un brouillon dont le compteur est en retard sur celui du publié.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const ROUTE_GATEAU = "https://example.com/admin/formulaires/devis-gateau/options";

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

interface OptionLue {
  id: string;
  libelle: string;
  prix?: number;
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
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
      await import("../../migrations/0010_etat_publie.sql?raw"),
    ];
    for (const migration of migrations) {
      for (const requete of separerRequetes(migration.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà jouée (table existante) : sans effet.
        }
      }
    }
    try {
      await db.prepare("alter table sessions add column dernier_usage_le integer").run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of ["sessions", "brouillons_formulaires", "publies_formulaires"]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch {
      // schéma absent : rien à nettoyer.
    }
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-numero-option-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare("insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)")
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

const PARFUMS_PUBLIES: OptionLue[] = [
  { id: "vanille", libelle: "Vanille", prix: 800 },
  { id: "chocolat", libelle: "Chocolat", prix: 900 },
  { id: "fraise", libelle: "Fraise", prix: 1000 },
  { id: "o1", libelle: "Café", prix: 1100 },
  { id: "o2", libelle: "Citron", prix: 1150 },
  { id: "o3", libelle: "Noisette", prix: 1200 },
];

interface ContenuSeme {
  champs: { parfum: OptionLue[] };
  derniersNumeros: { parfum: number };
}

async function semerPublie(
  db: DBLike,
  contenu: ContenuSeme = { champs: { parfum: PARFUMS_PUBLIES }, derniersNumeros: { parfum: 3 } },
): Promise<void> {
  await db
    .prepare("insert into publies_formulaires (formulaire, contenu, publie_le) values (?1, ?2, ?3)")
    .bind("devis-gateau", JSON.stringify(contenu), Date.now())
    .run();
}

async function semerBrouillon(db: DBLike, contenu: ContenuSeme): Promise<void> {
  await db
    .prepare("insert into brouillons_formulaires (formulaire, contenu, maj_le) values (?1, ?2, ?3)")
    .bind("devis-gateau", JSON.stringify(contenu), Date.now())
    .run();
}

/** Les options telles que l'éditrice les soumet : `id` gardé, prix saisi en euros. */
function enEuros(options: OptionLue[]): { id: string; libelle: string; prix: string }[] {
  return options.map((o) => ({ id: o.id, libelle: o.libelle, prix: String((o.prix ?? 0) / 100) }));
}

/** Soumet les parfums ; rend le statut et la liste de parfums renvoyée. */
async function soumettreParfums(
  cookie: string,
  parfums: { id?: string; libelle: string; prix: string }[],
): Promise<{ statut: number; parfums: OptionLue[] }> {
  const reponse = await exports.default.fetch(
    new Request(ROUTE_GATEAU, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
      body: corps(parfums),
    }),
  );
  if (reponse.status !== 200) return { statut: reponse.status, parfums: [] };
  const json = (await reponse.json()) as { champs: { id: string; options: OptionLue[] }[] };
  return { statut: reponse.status, parfums: json.champs.find((c) => c.id === "parfum")?.options ?? [] };
}

function corps(parfums: { id?: string; libelle: string; prix: string }[]): string {
  return JSON.stringify({
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
  });
}

describe("SC-14f — un numéro d'option donné n'est jamais redonné", () => {
  it("SC-14f — après publication de o1, o2, o3, retirer o3 puis ajouter une option donne un identifiant distinct des trois", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    await semerPublie(db);
    const sansLaDerniere = PARFUMS_PUBLIES.slice(0, 5).map((o) => ({
      id: o.id,
      libelle: o.libelle,
      prix: String((o.prix ?? 0) / 100),
    }));

    // Act
    const reponse = await exports.default.fetch(
      new Request(ROUTE_GATEAU, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
        body: corps([...sansLaDerniere, { libelle: "Pistache", prix: "12" }]),
      }),
    );

    // Assert
    expect(reponse.status).toBe(200);
    const json = (await reponse.json()) as { champs: { id: string; options: OptionLue[] }[] };
    const parfums = json.champs.find((c) => c.id === "parfum")?.options ?? [];
    const pistache = parfums.find((o) => o.libelle === "Pistache");
    expect(pistache).toBeDefined();
    expect(["o1", "o2", "o3"]).not.toContain(pistache?.id);
    expect(pistache?.id).toBe("o4");
    expect(parfums.map((o) => o.id)).not.toContain("o3");
  });

  it("SC-14f — un identifiant donné puis retiré avant la publication n'est jamais redonné : le compteur publié fait foi", async () => {
    // Arrange : o3 a été donné puis retiré avant la publication — la liste
    // publiée ne le porte plus, seul le compteur publié s'en souvient.
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const publies = PARFUMS_PUBLIES.slice(0, 5);
    await semerPublie(db, { champs: { parfum: publies }, derniersNumeros: { parfum: 3 } });

    // Act
    const { statut, parfums } = await soumettreParfums(cookie, [
      ...enEuros(publies),
      { libelle: "Pistache", prix: "12" },
    ]);

    // Assert
    expect(statut).toBe(200);
    const pistache = parfums.find((o) => o.libelle === "Pistache");
    expect(pistache).toBeDefined();
    expect(["o1", "o2", "o3"]).not.toContain(pistache?.id);
    expect(pistache?.id).toBe("o4");
  });

  it("SC-14f — le plus grand des compteurs du brouillon et du publié fait foi : un brouillon en retard ne redonne pas un numéro publié", async () => {
    // Arrange : le brouillon retient 1, le publié 3 — o2 et o3 ont déjà été donnés.
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    const quatre = PARFUMS_PUBLIES.slice(0, 4);
    await semerPublie(db, { champs: { parfum: quatre }, derniersNumeros: { parfum: 3 } });
    await semerBrouillon(db, { champs: { parfum: quatre }, derniersNumeros: { parfum: 1 } });

    // Act
    const { statut, parfums } = await soumettreParfums(cookie, [
      ...enEuros(quatre),
      { libelle: "Pistache", prix: "12" },
    ]);

    // Assert
    expect(statut).toBe(200);
    const pistache = parfums.find((o) => o.libelle === "Pistache");
    expect(pistache).toBeDefined();
    expect(["o1", "o2", "o3"]).not.toContain(pistache?.id);
    expect(pistache?.id).toBe("o4");
  });
});
