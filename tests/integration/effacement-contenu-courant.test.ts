/**
 * Change 011, ticket 03 — L'effacement d'une image suit le contenu courant de
 * chaque emplacement.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. L'état publié est semé directement dans les
 * tables de la migration 0010 (aucun geste ne publie encore). La liste des
 * emplacements d'une fiche se lit sur `data-emplacements`.
 * `content/pages/accueil` porte l'emplacement d'image `image-hero`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLES = ['sessions', 'brouillons_emplacements', 'publies_emplacements', 'medias'];
const BASE = 'https://example.com/admin';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
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
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const modules = [
      await import('../../migrations/0003_sessions.sql?raw'),
      await import('../../migrations/0004_brouillons_emplacements.sql?raw'),
      await import('../../migrations/0005_medias_brouillon.sql?raw'),
      await import('../../migrations/0006_medias_brouillon_affichage.sql?raw'),
      await import('../../migrations/0009_medias.sql?raw'),
      await import('../../migrations/0010_etat_publie.sql?raw'),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà appliqué (rejeu au sein du même run de fichier) : sans effet.
        }
      }
    }
    try {
      await db.prepare('alter table sessions add column dernier_usage_le integer').run();
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
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-effacement-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function semerMedia(db: DBLike, id: string): Promise<void> {
  const octets = new Uint8Array([1, 2, 3, 4]);
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(id, `${id}.png`, 'png', 10, 10, octets.length, octets, Date.now())
    .run();
}

async function semerPublieImage(db: DBLike, mediaId: string): Promise<void> {
  await db
    .prepare(
      "insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values ('accueil', 'image-hero', 'image', ?1, ?2)",
    )
    .bind(JSON.stringify({ nature: 'image', mediaId }), Date.now())
    .run();
}

async function semerBrouillonImage(db: DBLike, mediaId: string): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values ('accueil', 'image-hero', 'image', ?1, ?2)",
    )
    .bind(JSON.stringify({ nature: 'image', mediaId }), Date.now())
    .run();
}

async function lire(db: DBLike, sql: string, ...valeurs: unknown[]): Promise<{ contenu: string }[]> {
  return (await db.prepare(sql).bind(...valeurs).all()).results as { contenu: string }[];
}

async function lireBrouillonEmplacement(
  db: DBLike,
  pageSlug: string,
  idEmplacement: string,
): Promise<{ nature: string; contenu: string }[]> {
  return (
    await db
      .prepare('select nature, contenu from brouillons_emplacements where page_slug = ?1 and id_emplacement = ?2')
      .bind(pageSlug, idEmplacement)
      .all()
  ).results as { nature: string; contenu: string }[];
}

async function ouvrirFiche(cookie: string, id: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/medias/${id}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function emplacementsDeLaFiche(corps: string): { pageTitre: string; place: string }[] {
  const attribut = /data-emplacements="([^"]*)"/.exec(corps)?.[1] ?? '[]';
  return JSON.parse(attribut.replace(/&quot;/g, '"')) as { pageTitre: string; place: string }[];
}

it("SC-03a — la fiche d'une image que la version publiée d'un emplacement sans brouillon pose liste cet emplacement", async () => {
  // Arrange
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMedia(db, 'media-publiee-seule');
  await semerPublieImage(db, 'media-publiee-seule');

  // Act
  const corps = await ouvrirFiche(cookie, 'media-publiee-seule');

  // Assert : désigné par sa page et sa place, jamais par son identifiant.
  expect(emplacementsDeLaFiche(corps)).toEqual([{ pageTitre: 'Accueil', place: 'image' }]);
  expect(corps).not.toContain('image-hero');
  // …et la fiche ne la propose pas à l'effacement : la version publiée la pose.
  expect(corps).toContain('&quot;effacable&quot;:false');
});

it("SC-03b — quand le brouillon remplace l'image publiée, l'emplacement ne figure pas dans la liste de la première image", async () => {
  // Arrange
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMedia(db, 'media-remplacee');
  await semerMedia(db, 'media-remplacante');
  await semerPublieImage(db, 'media-remplacee');
  await semerBrouillonImage(db, 'media-remplacante');
  // Témoin positif : un autre emplacement de la même page, sans brouillon, pose
  // toujours l'image publiée (le brouillon l'emporte emplacement par emplacement).
  await db
    .prepare(
      "insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values ('accueil', 'galerie-realisations', 'galerie', ?1, ?2)",
    )
    .bind(JSON.stringify({ nature: 'galerie', mediaIds: ['media-remplacee'] }), Date.now())
    .run();

  // Act
  const corps = await ouvrirFiche(cookie, 'media-remplacee');

  // Assert : seul l'emplacement sans brouillon figure ; l'image remplacée n'est pas listée.
  expect(emplacementsDeLaFiche(corps)).toEqual([{ pageTitre: 'Accueil', place: 'galerie' }]);
});

it("SC-03f — par la couture HTTP, la grille des médias marque non effaçable une image que seule la version publiée d'un emplacement sans brouillon pose", async () => {
  // Arrange : la page « accueil » ne porte aucun brouillon.
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMedia(db, 'media-publiee-grille');
  await semerPublieImage(db, 'media-publiee-grille');

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/medias`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );

  // Assert
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const attribut = /data-medias="([^"]*)"/.exec(corps)?.[1] ?? '[]';
  const medias = JSON.parse(attribut.replace(/&quot;/g, '"')) as { id: string; effacable: boolean }[];
  const media = medias.find((entree) => entree.id === 'media-publiee-grille');
  expect(media).toBeDefined();
  expect(media?.effacable).toBe(false);
});

it("SC-03g — confirmer la suppression d'une image que seule la version publiée pose écrit le retrait dans le brouillon, l'état publié reste intact", async () => {
  // Arrange : la page « accueil » ne porte aucun brouillon.
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMedia(db, 'media-publiee-a-supprimer');
  await semerPublieImage(db, 'media-publiee-a-supprimer');

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/medias/media-publiee-a-supprimer/supprimer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );

  // Assert : suppression confirmée…
  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ ok: true });

  // …retrait inscrit dans le brouillon de la page…
  const brouillon = await lire(
    db,
    "select contenu from brouillons_emplacements where page_slug = 'accueil' and id_emplacement = 'image-hero'",
  );
  expect(brouillon).toHaveLength(1);
  expect(JSON.parse(brouillon[0].contenu)).toEqual({ nature: 'image', mediaId: '' });

  // …la page bascule à « brouillon »…
  const liste = await exports.default.fetch(
    new Request(`${BASE}/mes-pages`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(/<li>Accueil[\s\S]*?<\/li>/.exec(await liste.text())?.[0] ?? '').toMatch(/data-pastille-brouillon/);

  // …l'état publié reste intact…
  const publie = await lire(
    db,
    "select contenu from publies_emplacements where page_slug = 'accueil' and id_emplacement = 'image-hero'",
  );
  expect(JSON.parse(publie[0].contenu)).toEqual({ nature: 'image', mediaId: 'media-publiee-a-supprimer' });

  // …et l'image est devenue orpheline.
  const fiche = await ouvrirFiche(cookie, 'media-publiee-a-supprimer');
  expect(emplacementsDeLaFiche(fiche)).toEqual([]);
  expect(fiche).toContain('&quot;effacable&quot;:true');
});

it("SC-03g — confirmer la suppression d'une image que seule la version publiée d'une galerie et d'un carrousel pose la retire des deux listes dans le brouillon, sans toucher les autres images ; l'état publié reste intact", async () => {
  // Arrange : aucune page ne porte de brouillon.
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMedia(db, 'media-galerie-publiee');
  const galeriePubliee = JSON.stringify({ nature: 'galerie', mediaIds: ['autre-a', 'media-galerie-publiee', 'autre-b'] });
  const carrouselPublie = JSON.stringify({ nature: 'carrousel', mediaIds: ['media-galerie-publiee', 'autre-c'] });
  const publier = db.prepare(
    'insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values (?1, ?2, ?3, ?4, ?5)',
  );
  await publier.bind('accueil', 'galerie-realisations', 'galerie', galeriePubliee, Date.now()).run();
  await publier.bind('contact', 'carrousel-clients', 'carrousel', carrouselPublie, Date.now()).run();

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/medias/media-galerie-publiee/supprimer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );

  // Assert : suppression confirmée…
  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ ok: true });

  // …la galerie et le carrousel sont recomposés sans elle dans le brouillon, les autres images gardées dans l'ordre…
  const galerie = await lireBrouillonEmplacement(db, 'accueil', 'galerie-realisations');
  expect(galerie).toHaveLength(1);
  expect(galerie[0].nature).toBe('galerie');
  expect(JSON.parse(galerie[0].contenu)).toEqual({ nature: 'galerie', mediaIds: ['autre-a', 'autre-b'] });
  const carrousel = await lireBrouillonEmplacement(db, 'contact', 'carrousel-clients');
  expect(carrousel).toHaveLength(1);
  expect(carrousel[0].nature).toBe('carrousel');
  expect(JSON.parse(carrousel[0].contenu)).toEqual({ nature: 'carrousel', mediaIds: ['autre-c'] });

  // …l'état publié reste intact…
  const galerieEnLigne = await lire(
    db,
    "select contenu from publies_emplacements where page_slug = 'accueil' and id_emplacement = 'galerie-realisations'",
  );
  expect(galerieEnLigne).toHaveLength(1);
  expect(galerieEnLigne[0].contenu).toBe(galeriePubliee);
  const carrouselEnLigne = await lire(
    db,
    "select contenu from publies_emplacements where page_slug = 'contact' and id_emplacement = 'carrousel-clients'",
  );
  expect(carrouselEnLigne).toHaveLength(1);
  expect(carrouselEnLigne[0].contenu).toBe(carrouselPublie);

  // …et l'image est devenue orpheline.
  const fiche = await ouvrirFiche(cookie, 'media-galerie-publiee');
  expect(emplacementsDeLaFiche(fiche)).toEqual([]);
});
