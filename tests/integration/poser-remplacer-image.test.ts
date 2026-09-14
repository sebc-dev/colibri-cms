/**
 * Ticket 08 — Poser et remplacer une image dans un emplacement d'image
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 08-poser-remplacer-image.md).
 *
 * Couture retenue, même patron que `regler-lien-video.test.ts` (ticket 05) :
 * - SC-08a/b passent par la couture HTTP réelle (`exports.default.fetch`
 *   contre le worker compilé, dans `workerd`, contre la vraie D1 locale,
 *   ADR-0003) — les migrations `0003_sessions.sql`,
 *   `0004_brouillons_emplacements.sql` et `0005_medias_brouillon.sql` sont
 *   rejouées ici même, une session valide est semée directement, ainsi
 *   qu'une image « déjà présente » dans la réserve brouillon (la pose ne
 *   téléverse jamais, elle référence une identité déjà connue).
 *   `content/pages/accueil/page.json` (emplacement `image-hero`, déjà posé)
 *   et `content/pages/contact/page.json` (emplacement `photo-equipe`, déjà
 *   posé) portent les fixtures réelles de ce ticket.
 * - SC-08c porte sur l'absence de terme de développeur dans le sélecteur
 *   d'image : aucune infrastructure de test de composant Svelte n'existe
 *   encore dans ce dépôt (docs/test.md). Il se vérifie donc, comme
 *   `regler-lien-video.test.ts` le fait pour `ReglageLienVideo.svelte`, en
 *   inspectant la SOURCE de l'îlot (`?raw`, Vite).
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, describe } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const TABLE_MEDIAS = 'medias_brouillon';
const ROUTE_ACCUEIL_IMAGE = 'https://example.com/admin/pages/accueil/emplacements/image-hero';
const ROUTE_CONTACT_IMAGE = 'https://example.com/admin/pages/contact/emplacements/photo-equipe';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';
const ROUTE_EDITEUR_ACCUEIL = 'https://example.com/admin/pages/accueil';
const ROUTE_EDITEUR_CONTACT = 'https://example.com/admin/pages/contact';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
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
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
    const brouillons = await import('../../migrations/0004_brouillons_emplacements.sql?raw');
    for (const requete of separerRequetes(brouillons.default)) {
      await db.prepare(requete).run();
    }
    const medias = await import('../../migrations/0005_medias_brouillon.sql?raw');
    for (const requete of separerRequetes(medias.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS, TABLE_MEDIAS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-poser-remplacer-image-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

/** Sème une image « déjà présente » dans la réserve brouillon (SC-08a/b : poser référence, jamais ne téléverse). */
async function semerMediaDejaPresent(db: DBLike, id: string, nomOrigine: string): Promise<void> {
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_MEDIAS} (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(id, nomOrigine, 'jpeg', 10, 10, 4, new Uint8Array([1, 2, 3, 4]), maintenant)
    .run();
}

async function comptabiliserMedias(db: DBLike): Promise<number> {
  const resultat = await db.prepare(`select id from ${TABLE_MEDIAS}`).bind().all();
  return resultat.results.length;
}

async function poserImage(route: string, cookieSession: string | null, corps: unknown): Promise<Response> {
  return exports.default.fetch(
    new Request(route, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
      },
      body: JSON.stringify(corps),
    }),
  );
}

// --- SC-08a — poser, par la couture HTTP, une image déjà présente dans un
// emplacement d'image référence cette image dans le brouillon, sans
// téléversement, l'état publié intact, la page bascule à « brouillon » ---

it('SC-08a — poser une image déjà présente référence son identité dans le brouillon, sans téléversement, l’état publié intact, la page bascule à « brouillon »', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  await semerMediaDejaPresent(db, 'media-nouvelle-hero', 'nouvelle-image.jpg');
  const comptesMediasAvant = await comptabiliserMedias(db);
  const listeAvant = await exports.default.fetch(
    new Request(ROUTE_MES_PAGES, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const ligneAccueilAvant = /<li>Accueil[\s\S]*?<\/li>/.exec(await listeAvant.text())?.[0] ?? '';
  expect(ligneAccueilAvant).not.toMatch(/data-pastille-brouillon/);

  // Act : pose sur l'emplacement `image-hero`, déjà déclaré avec une autre image.
  const reponse = await poserImage(ROUTE_ACCUEIL_IMAGE, cookieSession, { mediaId: 'media-nouvelle-hero' });

  // Assert : la réponse confirme l'enregistrement et le basculement au brouillon…
  expect(reponse.status).toBe(200);
  const corpsReponse = (await reponse.json()) as { ok: boolean; porteUnBrouillon: boolean };
  expect(corpsReponse.ok).toBe(true);
  expect(corpsReponse.porteUnBrouillon).toBe(true);

  // …la ligne existe bien en D1, sous l'identité stable (page, emplacement)…
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('accueil', 'image-hero')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({ nature: 'image', mediaId: 'media-nouvelle-hero' });

  // …aucun téléversement n'a eu lieu : la réserve des médias n'a pas grandi.
  const comptesMediasApres = await comptabiliserMedias(db);
  expect(comptesMediasApres).toBe(comptesMediasAvant);

  // …la page « Accueil » porte désormais la pastille de brouillon, à la fois
  // sur la liste des pages et dans le fil de retour de l'éditeur…
  const listeApres = await exports.default.fetch(
    new Request(ROUTE_MES_PAGES, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const ligneAccueilApres = /<li>Accueil[\s\S]*?<\/li>/.exec(await listeApres.text())?.[0] ?? '';
  expect(ligneAccueilApres).toMatch(/data-pastille-brouillon/);

  const editeurApres = await exports.default.fetch(
    new Request(ROUTE_EDITEUR_ACCUEIL, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const corpsEditeurApres = await editeurApres.text();
  const zonePastilleEditeur =
    /<span id="zone-pastille-brouillon">[\s\S]*?<\/span>\s*<\/h1>/.exec(corpsEditeurApres)?.[0] ?? '';
  expect(zonePastilleEditeur).toMatch(/data-pastille-brouillon/);

  // …et l'éditeur montre l'image posée, jamais la seule image initiale de
  // l'intégrateur : le brouillon est superposé à l'emplacement.
  expect(corpsEditeurApres).toContain('data-media-id="media-nouvelle-hero"');

  // …et la déclaration versionnée (l'état publié) n'a pas bougé : lue depuis
  // `content/pages/accueil/page.json` (jamais depuis le brouillon), elle
  // porte toujours l'image d'origine de l'intégrateur.
  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const pageDeclaree = obtenirPageAvecEmplacements('accueil');
  const imageDeclaree = pageDeclaree?.emplacements.find((emplacement) => emplacement.id === 'image-hero');
  expect(imageDeclaree).toMatchObject({ mediaId: 'media-fixture-hero' });
});

// --- SC-08b — remplacer, par la couture HTTP, l'image posée par une autre
// de la réserve référence la nouvelle à la place de l'ancienne dans le
// brouillon, l'état publié intact, la page bascule à « brouillon » ---

it('SC-08b — remplacer l’image posée par une autre de la réserve référence la nouvelle à la place de l’ancienne, l’état publié intact, la page bascule à « brouillon »', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  await semerMediaDejaPresent(db, 'media-equipe-premiere', 'premiere-equipe.jpg');
  await semerMediaDejaPresent(db, 'media-equipe-remplacement', 'nouvelle-equipe.jpg');

  // Act : une première pose, puis un remplacement par une autre image.
  const premierePose = await poserImage(ROUTE_CONTACT_IMAGE, cookieSession, {
    mediaId: 'media-equipe-premiere',
  });
  expect(premierePose.status).toBe(200);

  const remplacement = await poserImage(ROUTE_CONTACT_IMAGE, cookieSession, {
    mediaId: 'media-equipe-remplacement',
  });

  // Assert : la réponse confirme l'enregistrement et le basculement au brouillon…
  expect(remplacement.status).toBe(200);
  const corpsReponse = (await remplacement.json()) as { ok: boolean; porteUnBrouillon: boolean };
  expect(corpsReponse.ok).toBe(true);
  expect(corpsReponse.porteUnBrouillon).toBe(true);

  // …une SEULE ligne existe en D1 pour ce couple (page, emplacement), et
  // elle porte la nouvelle image, jamais l'ancienne : un remplacement,
  // jamais un ajout.
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('contact', 'photo-equipe')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({ nature: 'image', mediaId: 'media-equipe-remplacement' });

  // …la page « Contact » porte désormais la pastille de brouillon…
  const listeApres = await exports.default.fetch(
    new Request(ROUTE_MES_PAGES, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const ligneContactApres = /<li>Contact[\s\S]*?<\/li>/.exec(await listeApres.text())?.[0] ?? '';
  expect(ligneContactApres).toMatch(/data-pastille-brouillon/);

  // …l'éditeur montre la nouvelle image, jamais la première pose ni l'image
  // initiale de l'intégrateur…
  const editeurApres = await exports.default.fetch(
    new Request(ROUTE_EDITEUR_CONTACT, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const corpsEditeurApres = await editeurApres.text();
  expect(corpsEditeurApres).toContain('data-media-id="media-equipe-remplacement"');
  expect(corpsEditeurApres).not.toContain('data-media-id="media-equipe-premiere"');

  // …et la déclaration versionnée (l'état publié) n'a pas bougé.
  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const pageDeclaree = obtenirPageAvecEmplacements('contact');
  const imageDeclaree = pageDeclaree?.emplacements.find((emplacement) => emplacement.id === 'photo-equipe');
  expect(imageDeclaree).toMatchObject({ mediaId: 'media-fixture-equipe' });
});

// --- SC-08c — aucun terme de développeur ne paraît dans le sélecteur
// d'image ni à la pose ---

describe('SC-08c — le sélecteur d’image ne porte aucun terme de développeur', () => {
  it('SC-08c — les libellés, le bouton et les messages de refus visibles de `EmplacementImage.svelte` ne portent aucun terme de développeur', async () => {
    // Arrange : le texte réellement à l'écran — la zone de gabarit (après
    // `</script>`, jamais les commentaires du fichier source, qui eux ne
    // paraissent jamais à l'écran) et l'objet `TEXTES_REFUS` des messages de
    // refus, même geste de découpe que `regler-lien-video.test.ts` (SC-05e)
    // pour `ReglageLienVideo.svelte`.
    const source = (await import('../../src/admin/ilots-svelte-5/EmplacementImage.svelte?raw')).default;
    const zoneGabarit = source.slice(source.lastIndexOf('</script>')).toLowerCase();
    const zoneTextesRefus = (/const TEXTES_REFUS[\s\S]*?\};/.exec(source)?.[0] ?? '').toLowerCase();
    expect(zoneGabarit.length, 'la zone de gabarit est introuvable dans la source').toBeGreaterThan(9);
    expect(zoneTextesRefus.length, 'TEXTES_REFUS introuvable dans la source').toBeGreaterThan(0);

    const TERMES_DEVELOPPEUR = [
      'commit',
      'branche',
      'build',
      'déploiement',
      'déployer',
      'repository',
      'dépôt git',
      'endpoint',
      'webhook',
      'backend',
      'front-end',
      'framework',
      'payload',
      'requête',
      'validation',
      'regex',
    ];

    // Act / Assert
    for (const terme of TERMES_DEVELOPPEUR) {
      expect(zoneGabarit, `le gabarit du sélecteur ne devrait pas contenir « ${terme} »`).not.toContain(terme);
      expect(zoneTextesRefus, `les messages de refus ne devraient pas contenir « ${terme} »`).not.toContain(terme);
    }
  });
});
