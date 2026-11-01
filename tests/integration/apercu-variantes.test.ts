/**
 * Change 014, ticket 02 — L'aperçu rend les images comme la page publique :
 * une image empaquetée porte ses variantes (à l'adresse où le site les sert),
 * une image pas encore empaquetée garde l'adresse des octets de
 * l'administration, sans `srcset` ni `sizes`.
 *
 * Couture et base semée comme `apercu-avec-brouillons.test.ts` : requête HTTP
 * réelle via `exports.default.fetch` dans `workerd`, contre la D1 locale.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLES = [
  "sessions",
  "brouillons_emplacements",
  "publies_emplacements",
  "medias",
];
const ORIGINE = "https://example.com";

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
      await import("../../migrations/0005_medias_brouillon.sql?raw"),
      await import("../../migrations/0006_medias_brouillon_affichage.sql?raw"),
      await import("../../migrations/0007_brouillons_reglages.sql?raw"),
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
      await import("../../migrations/0009_medias.sql?raw"),
      await import("../../migrations/0010_etat_publie.sql?raw"),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà créée, renommée ou ajoutée (rejeu au sein du même run) : sans effet.
        }
      }
    }
    try {
      await db
        .prepare("alter table sessions add column dernier_usage_le integer")
        .run();
    } catch {
      // déjà ajoutée : sans effet.
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
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
});

async function ouvrirSession(db: DBLike): Promise<string> {
  const id = `session-apercu-variantes-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return `${NOM_COOKIE_SESSION}=${id}`;
}

async function semerImageTeleversee(db: DBLike, id: string, description: string): Promise<void> {
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, description)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(id, "nouvelle.png", "png", 800, 400, 4, new Uint8Array([1, 2, 3, 4]), Date.now(), description)
    .run();
}

async function semerImageEnService(db: DBLike): Promise<void> {
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, publiee_le, description, description_publiee)
       values ('media-fixture-hero', 'media-fixture-hero.png', 'png', 1280, 640, 0, x'', ?1, ?2, ?3, ?3)`,
    )
    .bind(Date.now(), Date.now(), "Image d'accueil du site de démonstration")
    .run();
}

async function semerGalerieEnBrouillon(db: DBLike, mediaIds: string[]): Promise<void> {
  const contenu = { nature: "galerie", mediaIds };
  await db
    .prepare(
      "insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)",
    )
    .bind("accueil", "galerie-realisations", "galerie", JSON.stringify(contenu), Date.now())
    .run();
}

function balise(html: string, motif: RegExp): string {
  return motif.exec(html)?.[0] ?? "";
}

function attribut(balisage: string, nom: string): string | undefined {
  return new RegExp(`\\s${nom}="([^"]*)"`).exec(balisage)?.[1];
}

it("SC-02a — l'aperçu présente l'image empaquetée avec ses variantes, comme la page publique, et l'image pas encore empaquetée sans variante", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerImageEnService(db);
  await semerImageTeleversee(db, "media-nouvelle", "Pièce montée");
  await semerGalerieEnBrouillon(db, ["media-fixture-hero", "media-nouvelle"]);

  const publique = await (await exports.default.fetch(new Request(`${ORIGINE}/tarifs`))).text();
  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/apercu/`, { redirect: "manual", headers: { cookie } }),
  );
  const corps = await reponse.text();

  const imagePublique = balise(publique, /<img\b[^>]*media-fixture-hero[^>]*>/);
  const empaquetee = balise(corps, /<img\b[^>]*media-fixture-hero[^>]*>/);
  const nouvelle = balise(corps, /<img\b[^>]*media-nouvelle[^>]*>/);

  expect(reponse.status).toBe(200);
  const srcsetPublic = attribut(imagePublique, "srcset");
  expect(srcsetPublic, "srcset de la page publique").toMatch(/-360\.[^ ]+\.webp 360w, .*-720\.[^ ]+\.webp 720w, .*-1080\.[^ ]+\.webp 1080w/);
  expect(attribut(empaquetee, "srcset")).toBe(srcsetPublic);
  expect(attribut(empaquetee, "sizes")).toBe(attribut(imagePublique, "sizes"));
  expect(attribut(empaquetee, "src")).toBe(attribut(imagePublique, "src"));

  expect(attribut(nouvelle, "src")).toBe("/admin/medias/media-nouvelle/octets");
  expect(nouvelle).not.toContain("srcset");
  expect(nouvelle).not.toContain("sizes");
  expect(attribut(nouvelle, "alt")).toBe("Pièce montée");
});
