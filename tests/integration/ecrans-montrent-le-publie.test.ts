/**
 * Change 011, ticket 01 — Hors brouillon, les écrans montrent la dernière
 * version publiée.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. Aucun geste ne publie encore : l'état publié est
 * semé directement dans les tables de la migration 0010. La déclaration lue est
 * celle du dépôt (`content/`).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLES = [
  "sessions",
  "brouillons_emplacements",
  "brouillons_reglages",
  "brouillons_formulaires",
  "publies_emplacements",
  "publies_reglages",
  "publies_formulaires",
];
const MARQUE = "data-pastille-brouillon";
const BASE = "https://example.com/admin";

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
    const modules = [
      await import("../../migrations/0003_sessions.sql?raw"),
      await import("../../migrations/0004_brouillons_emplacements.sql?raw"),
      await import("../../migrations/0007_brouillons_reglages.sql?raw"),
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
      await import("../../migrations/0010_etat_publie.sql?raw"),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        await db.prepare(requete).run();
      }
      if (module === modules[0]) {
        try {
          await db
            .prepare("alter table sessions add column dernier_usage_le integer")
            .run();
        } catch {
          // déjà ajoutée : sans effet.
        }
      }
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  for (const table of TABLES) {
    try {
      await obtenirDB().prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(
        `nettoyage D1 ignoré pour ${table} (schéma absent) :`,
        erreur,
      );
    }
  }
});

async function ouvrir(db: DBLike, route: string): Promise<string> {
  const id = `session-publie-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  const reponse = await exports.default.fetch(
    new Request(`${BASE}${route}`, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${id}` },
    }),
  );
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, "le contenu (<main>) devrait être présent").toBeDefined();
  return main ?? "";
}

async function semerPublieEmplacement(
  db: DBLike,
  idEmplacement: string,
  contenu: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      "insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(
      "accueil",
      idEmplacement,
      String(contenu.nature),
      JSON.stringify(contenu),
      Date.now(),
    )
    .run();
}

async function semerBrouillonEmplacement(
  db: DBLike,
  idEmplacement: string,
  contenu: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(
      "accueil",
      idEmplacement,
      String(contenu.nature),
      JSON.stringify(contenu),
      Date.now(),
    )
    .run();
}

async function semerPublieReglage(
  db: DBLike,
  reglage: string,
  contenu: unknown,
): Promise<void> {
  await db
    .prepare(
      "insert into publies_reglages (reglage, contenu, publie_le) values (?1, ?2, ?3)",
    )
    .bind(reglage, JSON.stringify(contenu), Date.now())
    .run();
}

function carte(main: string, idTitre: string): string {
  const section = new RegExp(
    `<section[^>]*aria-labelledby="${idTitre}"[\\s\\S]*?</section>`,
  ).exec(main)?.[0];
  expect(section, `la carte ${idTitre} devrait être présente`).toBeDefined();
  return section ?? "";
}

const BOUTON_PUBLIE = {
  nature: "bouton-action",
  libelle: "Réserver maintenant",
  destination: "/reserver",
};

it("SC-01a — l'éditeur montre le brouillon d'un emplacement qui en porte un, le publié des autres, le départ du reste", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerPublieEmplacement(db, "bouton-devis", BOUTON_PUBLIE);
  await semerPublieEmplacement(db, "video-presentation", {
    nature: "lien-video",
    lien: "https://www.youtube.com/watch?v=publiee",
  });
  await semerBrouillonEmplacement(db, "bouton-devis", {
    nature: "bouton-action",
    libelle: "Libellé du brouillon",
    destination: "/brouillon",
  });

  // Act
  const main = await ouvrir(db, "/pages/accueil");

  // Assert
  expect(main).toContain("Libellé : Libellé du brouillon");
  expect(main).toContain("Destination : /brouillon");
  expect(main).not.toContain("Réserver maintenant");
  expect(main).toContain("https://www.youtube.com/watch?v=publiee");
  expect(main).not.toContain("dQw4w9WgXcQ");
});

it("SC-01b — page sans brouillon, le bouton présente le libellé et la destination publiés, non ceux du départ", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerPublieEmplacement(db, "bouton-devis", BOUTON_PUBLIE);

  // Act
  const main = await ouvrir(db, "/pages/accueil");

  // Assert
  expect(main).toContain("Libellé : Réserver maintenant");
  expect(main).toContain("Destination : /reserver");
  expect(main).not.toContain("Demander un devis");
  expect(main).not.toContain("Destination : /contact");
});

it("SC-01c — seul Réseaux sociaux porte un brouillon : liste du brouillon dans sa carte, départ dans Coordonnées et Mention", async () => {
  // Arrange
  const db = await assurerSchema();
  await db
    .prepare(
      "insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)",
    )
    .bind(
      "reseaux",
      JSON.stringify([
        { nom: "Mastodon", lien: "https://mastodon.example/@atelier" },
      ]),
      Date.now(),
    )
    .run();

  // Act
  const main = await ouvrir(db, "/reglages");

  // Assert
  const reseaux = carte(main, "carte-reseaux");
  expect(reseaux).toContain("Mastodon");
  expect(reseaux).not.toContain("Instagram");
  expect(reseaux).toContain(MARQUE);
  const coordonnees = carte(main, "carte-coordonnees");
  expect(coordonnees).toContain("01 23 45 67 89");
  expect(coordonnees).not.toContain(MARQUE);
  const mention = carte(main, "carte-mention");
  expect(mention).toContain("ne sont ni revendues ni transmises à des tiers");
  expect(mention).not.toContain(MARQUE);
});

it("SC-01d — mention publiée, sans brouillon : la mention publiée est dans sa carte, sans marque, non celle de départ", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerPublieReglage(
    db,
    "mention",
    "Nouvelle mention publiée par l'atelier.",
  );

  // Act
  const main = await ouvrir(db, "/reglages");

  // Assert
  const mention = carte(main, "carte-mention");
  expect(mention).toMatch(/Nouvelle mention publiée par l(?:'|&#39;)atelier\./);
  expect(mention).not.toContain("ne sont ni revendues");
  expect(mention).not.toContain(MARQUE);
  expect(main).not.toContain(MARQUE);
});

it("SC-01e — « Devis gâteau » après publication ajoutant « Pistache » à 12 €, sans brouillon : « Pistache » à 12 € dans « Parfum », sans marque", async () => {
  // Arrange
  const db = await assurerSchema();
  await db
    .prepare(
      "insert into publies_formulaires (formulaire, contenu, publie_le) values (?1, ?2, ?3)",
    )
    .bind(
      "devis-gateau",
      JSON.stringify({
        champs: {
          parfum: [
            { id: "vanille", libelle: "Vanille", prix: 800 },
            { id: "chocolat", libelle: "Chocolat", prix: 900 },
            { id: "fraise", libelle: "Fraise", prix: 1000 },
            { id: "pistache", libelle: "Pistache", prix: 1200 },
          ],
        },
        derniersNumeros: {},
      }),
      Date.now(),
    )
    .run();

  // Act
  const main = await ouvrir(db, "/formulaires/devis-gateau");

  // Assert
  const parfum = /<section[\s\S]*?<\/section>/.exec(main)?.[0] ?? "";
  expect(parfum).toContain("Parfum");
  const champs = [...parfum.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
  expect(champs.some((c) => c.includes('value="Pistache"'))).toBe(true);
  expect(champs.some((c) => /value="12(?:[,.]00)?"/.test(c))).toBe(true);
  expect(main).not.toContain(MARQUE);
});

it("SC-01g — après un changement de déclaration, la version publiée d'un emplacement retiré n'est plus montrée, l'ajouté présente son départ", async () => {
  // Arrange : « ancien-emplacement » n'est plus déclaré ; « bouton-devis »
  // (déclaré) n'a jamais été publié ; « presentation » change de nature.
  const db = await assurerSchema();
  await semerPublieEmplacement(db, "ancien-emplacement", {
    nature: "bouton-action",
    libelle: "Libellé de l'emplacement retiré",
    destination: "/retire",
  });
  await semerPublieEmplacement(db, "presentation", {
    nature: "bouton-action",
    libelle: "Mauvaise nature publiée",
    destination: "/mauvaise-nature",
  });

  // Act
  const main = await ouvrir(db, "/pages/accueil");

  // Assert
  expect(main).not.toContain("emplacement retiré");
  expect(main).not.toContain("ancien-emplacement");
  expect(main).not.toContain("Mauvaise nature publiée");
  expect(main).toContain("Libellé : Demander un devis");
  expect(main).toContain("Destination : /contact");
});
