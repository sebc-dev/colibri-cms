/**
 * La bibliothèque montre les images publiées et celles posées au départ —
 * change 011-apercu-et-publication, ticket 02 (ADR-0020, ADR-0022).
 * Éprouvé contre la vraie D1 locale (ADR-0014), sans simulacre.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect } from "vitest";
import {
  inscrireImagesDeDepart,
  listerMediasBrouillon,
  obtenirFicheMediaBrouillon,
} from "../../src/platform/medias/magasin.ts";
import {
  adressesOriginalesEmpaquetees,
  listerFichesMedias,
} from "../../src/platform/contenu/medias.ts";

type DB = Parameters<typeof listerMediasBrouillon>[0];

function obtenirDB(): DB {
  return (env as unknown as { DB: DB }).DB;
}

it("SC-02a — une image posée au départ, jamais téléversée, paraît dans la grille avec sa vignette, son nom et sa description", async () => {
  const db = obtenirDB();
  const fiches = listerFichesMedias();
  const hero = fiches.find((f) => f.id === "media-fixture-hero");
  expect(hero).toBeDefined();

  await inscrireImagesDeDepart(db, fiches, 1_000);
  const medias = await listerMediasBrouillon(
    db,
    new Set(),
    adressesOriginalesEmpaquetees(),
  );

  const ligne = medias.find((m) => m.id === "media-fixture-hero");
  expect(ligne?.nomAffichage).toBe(hero?.nomOrigine);
  expect(ligne?.description).toBe(hero?.description);
  expect(ligne?.vignette).toBe(
    adressesOriginalesEmpaquetees().get("media-fixture-hero"),
  );
  expect(ligne?.vignette).not.toBe("/admin/medias/media-fixture-hero/octets");
  expect(medias.some((m) => m.id === "media-fixture-equipe")).toBe(true);
});

it("SC-02a — l'inscription est idempotente et ne retouche pas une image déjà inscrite", async () => {
  const db = obtenirDB();
  const fiches = listerFichesMedias();
  await inscrireImagesDeDepart(db, fiches, 1_000);
  await db
    .prepare(
      "update medias set nom_affichage = 'Renommée', description = 'Décrite' where id = 'media-fixture-hero'",
    )
    .bind()
    .run();

  await inscrireImagesDeDepart(db, fiches, 2_000);
  const medias = await listerMediasBrouillon(
    db,
    new Set(),
    adressesOriginalesEmpaquetees(),
  );

  expect(medias.filter((m) => m.id === "media-fixture-hero")).toHaveLength(1);
  const ligne = medias.find((m) => m.id === "media-fixture-hero");
  expect(ligne?.nomAffichage).toBe("Renommée");
  expect(ligne?.description).toBe("Décrite");
});

it("SC-02b — une image publiée dont la base ne garde plus les octets paraît avec la vignette de sa variante empaquetée", async () => {
  const db = obtenirDB();
  await inscrireImagesDeDepart(db, [], 1_000);
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, publiee_le, description_publiee)
       values ('image-publiee', 'publiee.png', 'png', 10, 10, 0, x'', 5, 6, 'Publiée')`,
    )
    .bind()
    .run();
  const statiques = new Map([["image-publiee", "/medias/publiee-abc.png"]]);

  const medias = await listerMediasBrouillon(db, new Set(), statiques);
  const fiche = await obtenirFicheMediaBrouillon(
    db,
    "image-publiee",
    new Set(),
    statiques,
  );

  expect(medias.find((m) => m.id === "image-publiee")?.vignette).toBe(
    "/medias/publiee-abc.png",
  );
  expect(fiche?.vignette).toBe("/medias/publiee-abc.png");
});

it("SC-02b — une image dont la base garde les octets garde la route gardée, même si une variante empaquetée existe", async () => {
  const db = obtenirDB();
  await inscrireImagesDeDepart(db, [], 1_000);
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values ('image-gardee', 'gardee.png', 'png', 10, 10, 3, x'010203', 7)`,
    )
    .bind()
    .run();
  const statiques = new Map([["image-gardee", "/medias/gardee.png"]]);

  const medias = await listerMediasBrouillon(db, new Set(), statiques);

  expect(medias.find((m) => m.id === "image-gardee")?.vignette).toBe(
    "/admin/medias/image-gardee/octets",
  );
});

// --- Par l'Écran : Médias — requête HTTP réelle contre le worker compilé,
// même couture que `fiche-renommer-decrire.test.ts` : c'est la page
// elle-même qui doit inscrire les images posées au départ et passer les
// adresses des variantes empaquetées, sans qu'aucun test ne le fasse à sa
// place.

const NOM_COOKIE_SESSION = "__Host-session";
const ROUTE_ECRAN_MEDIAS = "https://example.com/admin/medias";

function separerRequetes(sql: string): string[] {
  return sql
    .split("\n")
    .map((ligne) => ligne.replace(/--.*/, ""))
    .join("\n")
    .split(";")
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let sessionsPretes: Promise<void> | null = null;
async function assurerTableSessions(db: DB): Promise<void> {
  sessionsPretes ??= (async () => {
    const sessions = await import("../../migrations/0003_sessions.sql?raw");
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).bind().run();
    }
    try {
      await db
        .prepare("alter table sessions add column dernier_usage_le integer")
        .bind()
        .run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
  })();
  await sessionsPretes;
}

async function semerSessionValide(db: DB): Promise<string> {
  await assurerTableSessions(db);
  const id = `session-images-publiees-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

/**
 * Retire les images posées au départ avant la visite : leur présence après
 * le GET prouve alors que c'est l'écran qui les inscrit, et non un test
 * précédent du fichier.
 */
async function oublierImagesDeDepart(db: DB): Promise<void> {
  await listerMediasBrouillon(db, new Set());
  await db
    .prepare(
      "delete from medias where id in ('media-fixture-hero', 'media-fixture-equipe')",
    )
    .bind()
    .run();
}

function lireDonneesMedias(html: string): unknown {
  const attribut = /id="ilot-medias" data-medias="([^"]*)"/.exec(html)?.[1];
  if (attribut === undefined)
    throw new Error("l'îlot de la bibliothèque est absent de l'écran");
  return JSON.parse(
    attribut
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&"),
  );
}

interface MediaEcran {
  readonly id: string;
  readonly nomAffichage?: string;
  readonly description?: string;
  readonly vignette?: string;
}

/** Visite l'Écran : Médias avec une session valide, sans aucune inscription préalable. */
async function visiterEcranMedias(db: DB): Promise<MediaEcran[]> {
  const idSession = await semerSessionValide(db);
  await oublierImagesDeDepart(db);
  const reponse = await exports.default.fetch(
    new Request(ROUTE_ECRAN_MEDIAS, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${idSession}` },
    }),
  );
  expect(reponse.status).toBe(200);
  return lireDonneesMedias(await reponse.text()) as MediaEcran[];
}

it("SC-02a — l'Écran : Médias présente l'image posée au départ avec sa vignette, son nom et sa description", async () => {
  const db = obtenirDB();
  const fiches = listerFichesMedias();

  const medias = await visiterEcranMedias(db);

  for (const id of ["media-fixture-hero", "media-fixture-equipe"]) {
    const fiche = fiches.find((f) => f.id === id);
    expect(fiche).toBeDefined();
    const media = medias.find((m) => m.id === id);
    expect(media).toBeDefined();
    expect(media?.nomAffichage).toBe(`${id}.png`);
    expect(media?.description).toBe(fiche?.description);
    expect(media?.vignette).toBeDefined();
    expect(media?.vignette).not.toBe(`/admin/medias/${id}/octets`);
    expect(media?.vignette?.endsWith(".png")).toBe(true);
  }
});

const SIGNATURE_PNG = [137, 80, 78, 71, 13, 10, 26, 10];

it("SC-02b — dans l'Écran : Médias, une image publiée dont la base ne garde plus les octets paraît avec la vignette de sa variante empaquetée", async () => {
  const db = obtenirDB();
  const fiche = listerFichesMedias().find((f) => f.id === "media-fixture-hero");
  expect(fiche).toBeDefined();

  const medias = await visiterEcranMedias(db);

  const resultat = await db
    .prepare(
      "select length(octets) as n from medias where id = 'media-fixture-hero'",
    )
    .bind()
    .all();
  expect((resultat.results as { n: number }[])[0]?.n).toBe(0);
  const vignette = medias.find((m) => m.id === "media-fixture-hero")?.vignette;
  expect(vignette).toBeDefined();
  expect(vignette).not.toBe("/admin/medias/media-fixture-hero/octets");
  expect(vignette?.endsWith(".png")).toBe(true);

  // L'oracle passe par le worker, pas par `adressesOriginalesEmpaquetees()`
  // appelé ici : vitest lit ce module depuis les sources, en mode dev
  // (`/medias/…?no-inline`), alors que l'écran tourne dans le worker
  // compilé, dont l'adresse est celle du build (`/_astro/…`). On exige donc
  // que l'adresse servie rende bien l'image d'origine, aux dimensions de sa
  // fiche.
  const reponse = await exports.default.fetch(
    new Request(`https://example.com${vignette ?? ""}`),
  );
  expect(reponse.status).toBe(200);
  expect(reponse.headers.get("content-type")).toBe("image/png");
  const octets = new Uint8Array(await reponse.arrayBuffer());
  expect(Array.from(octets.slice(0, 8))).toEqual(SIGNATURE_PNG);
  const ihdr = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  expect(ihdr.getUint32(16)).toBe(fiche?.largeur);
  expect(ihdr.getUint32(20)).toBe(fiche?.hauteur);
});

/** Les médias que l'éditeur d'une page passe à son emplacement d'image (`data-medias`). */
function lireMediasDeLEditeur(html: string): MediaEcran[] {
  const attribut = /data-emplacement-image[^>]*?data-medias="([^"]*)"/.exec(html)?.[1];
  if (attribut === undefined)
    throw new Error("l'emplacement d'image est absent de l'éditeur");
  return JSON.parse(
    attribut
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&"),
  ) as MediaEcran[];
}

it("CT-6.3 — dans l'éditeur d'une page, une image publiée dont la base ne garde plus les octets paraît avec la même vignette que dans l'Écran : Médias", async () => {
  const db = obtenirDB();
  const vignetteMedias = (await visiterEcranMedias(db)).find(
    (m) => m.id === "media-fixture-hero",
  )?.vignette;

  const idSession = await semerSessionValide(db);
  const reponse = await exports.default.fetch(
    new Request("https://example.com/admin/pages/accueil", {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${idSession}` },
    }),
  );
  expect(reponse.status).toBe(200);
  const medias = lireMediasDeLEditeur(await reponse.text());

  const vignette = medias.find((m) => m.id === "media-fixture-hero")?.vignette;
  expect(vignette).not.toBe("/admin/medias/media-fixture-hero/octets");
  expect(vignette?.endsWith(".png")).toBe(true);
  expect(vignette).toBe(vignetteMedias);
});
