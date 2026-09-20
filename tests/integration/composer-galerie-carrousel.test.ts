/**
 * Ticket 09 — Composer une galerie ou un carrousel
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 09-composer-galerie-carrousel.md).
 *
 * Couture retenue, même patron que `poser-remplacer-image.test.ts` (ticket
 * 08) : SC-09a/b passent par la couture HTTP réelle (`exports.default.fetch`
 * contre le worker compilé, dans `workerd`, contre la vraie D1 locale,
 * ADR-0003) — les migrations `0003_sessions.sql`,
 * `0004_brouillons_emplacements.sql`, `0005_medias_brouillon.sql` et
 * `0006_medias_brouillon_affichage.sql` sont rejouées ici même, une session
 * valide est semée directement, ainsi que des images « déjà présentes »
 * dans la réserve brouillon (composer une galerie/un carrousel référence
 * des identités déjà connues, jamais un téléversement).
 *
 * Aucune page déclarée (`content/pages/`) ne portait encore d'emplacement
 * de nature `galerie` ou `carrousel` avant ce fichier — l'implémentation du
 * ticket (route générique, magasin, îlots) était déjà en place, mais aucune
 * fixture de contenu ne l'exerçait par la couture HTTP réelle (même besoin
 * que `image-hero`/`photo-equipe`, ajoutées en fixture par le ticket 08).
 * Ce fichier de test ajoute donc deux emplacements de contenu, additifs et
 * sans image initiale (`mediaIds: []`) — de la DONNÉE déclarative
 * (ADR-0012), jamais du code : `content/pages/accueil/page.json` gagne
 * `galerie-realisations` (nature galerie), `content/pages/contact/page.json`
 * gagne `carrousel-clients` (nature carrousel) — exerçant ainsi les DEUX
 * natures à travers les deux critères.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const TABLE_MEDIAS = 'medias_brouillon';
const ROUTE_ACCUEIL_GALERIE = 'https://example.com/admin/pages/accueil/emplacements/galerie-realisations';
const ROUTE_CONTACT_CARROUSEL = 'https://example.com/admin/pages/contact/emplacements/carrousel-clients';
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
    try {
      await db.prepare(`alter table ${TABLE_MEDIAS} add column nom_affichage text`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
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
  const id = `session-composer-galerie-carrousel-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

/** Sème une image « déjà présente » dans la réserve brouillon (référencée, jamais téléversée). */
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

async function poserCorrection(route: string, cookieSession: string | null, corps: unknown): Promise<Response> {
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

// --- SC-09a — poser, par la couture HTTP, plusieurs images de la réserve
// dans un emplacement de galerie, dans un ordre choisi, référence l'ensemble
// ORDONNÉ de ces images par leurs identités dans le brouillon ; l'état
// publié reste intact et la page bascule à « brouillon » ---

it('SC-09a — composer une galerie référence l’ensemble ordonné des images dans le brouillon, l’état publié intact, la page bascule à « brouillon »', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  await semerMediaDejaPresent(db, 'media-realisation-un', 'realisation-un.jpg');
  await semerMediaDejaPresent(db, 'media-realisation-deux', 'realisation-deux.jpg');
  await semerMediaDejaPresent(db, 'media-realisation-trois', 'realisation-trois.jpg');

  const listeAvant = await exports.default.fetch(
    new Request(ROUTE_MES_PAGES, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const ligneAccueilAvant = /<li>Accueil[\s\S]*?<\/li>/.exec(await listeAvant.text())?.[0] ?? '';
  expect(ligneAccueilAvant).not.toMatch(/data-pastille-brouillon/);

  // Act : pose de trois images, dans un ordre choisi qui n'est pas celui de
  // leur création (preuve que l'ordre posé est bien celui retenu, jamais un
  // tri implicite par identité ou par date).
  const ordreChoisi = ['media-realisation-trois', 'media-realisation-un', 'media-realisation-deux'];
  const reponse = await poserCorrection(ROUTE_ACCUEIL_GALERIE, cookieSession, { mediaIds: ordreChoisi });

  // Assert : la réponse confirme l'enregistrement et le basculement au brouillon…
  expect(reponse.status).toBe(200);
  const corpsReponse = (await reponse.json()) as { ok: boolean; porteUnBrouillon: boolean };
  expect(corpsReponse.ok).toBe(true);
  expect(corpsReponse.porteUnBrouillon).toBe(true);

  // …la ligne existe bien en D1, sous l'identité stable (page, emplacement),
  // et porte l'ensemble ORDONNÉ tel que posé.
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('accueil', 'galerie-realisations')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({ nature: 'galerie', mediaIds: ordreChoisi });

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

  // …et l'éditeur montre l'ensemble ordonné composé, jamais un autre ordre
  // ni un sous-ensemble.
  expect(corpsEditeurApres).toContain(`data-media-ids="${JSON.stringify(ordreChoisi).replace(/"/g, '&quot;')}"`);

  // …et la déclaration versionnée (l'état publié) n'a pas bougé : lue depuis
  // `content/pages/accueil/page.json` (jamais depuis le brouillon), elle
  // porte toujours une galerie vide, telle que déclarée par l'intégrateur.
  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const pageDeclaree = obtenirPageAvecEmplacements('accueil');
  const galerieDeclaree = pageDeclaree?.emplacements.find(
    (emplacement) => emplacement.id === 'galerie-realisations',
  );
  expect(galerieDeclaree).toMatchObject({ mediaIds: [] });
});

// --- SC-09b — réordonner ou retirer, par la couture HTTP, une image d'un
// emplacement de carrousel déjà composé met à jour le brouillon SANS que ce
// soit traité comme un geste de structure, et la page bascule à
// « brouillon » ---

it('SC-09b — réordonner et retirer une image d’un carrousel remplace le brouillon en bloc, sans geste de structure, la page bascule à « brouillon »', async () => {
  // Arrange : un carrousel déjà composé de trois images (mise en place, pas
  // le geste sous test).
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  await semerMediaDejaPresent(db, 'media-client-alpha', 'client-alpha.jpg');
  await semerMediaDejaPresent(db, 'media-client-beta', 'client-beta.jpg');
  await semerMediaDejaPresent(db, 'media-client-gamma', 'client-gamma.jpg');

  const compositionInitiale = await poserCorrection(ROUTE_CONTACT_CARROUSEL, cookieSession, {
    mediaIds: ['media-client-alpha', 'media-client-beta', 'media-client-gamma'],
  });
  expect(compositionInitiale.status).toBe(200);

  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const structureAvant = obtenirPageAvecEmplacements('contact')?.emplacements.map((emplacement) => ({
    id: emplacement.id,
    nature: emplacement.nature,
  }));

  // Act : le geste sous test — réordonner (gamma avant alpha) ET retirer
  // (beta disparaît), en un seul remplacement en bloc du tableau.
  const nouvelOrdreSansBeta = ['media-client-gamma', 'media-client-alpha'];
  const reponse = await poserCorrection(ROUTE_CONTACT_CARROUSEL, cookieSession, {
    mediaIds: nouvelOrdreSansBeta,
  });

  // Assert : la réponse confirme l'enregistrement et le basculement au brouillon…
  expect(reponse.status).toBe(200);
  const corpsReponse = (await reponse.json()) as { ok: boolean; porteUnBrouillon: boolean };
  expect(corpsReponse.ok).toBe(true);
  expect(corpsReponse.porteUnBrouillon).toBe(true);

  // …une SEULE ligne existe en D1 pour ce couple (page, emplacement), et
  // elle porte le nouvel ensemble EXACT (remplacement en bloc, jamais un
  // ajout de ligne ni un diff incrémental).
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('contact', 'carrousel-clients')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({ nature: 'carrousel', mediaIds: nouvelOrdreSansBeta });

  // …ce n'est jamais un geste de STRUCTURE : la liste des emplacements
  // déclarés de la page (identité, nature, ordre) n'a pas bougé — seul le
  // CONTENU de l'emplacement `carrousel-clients` a changé.
  const structureApres = obtenirPageAvecEmplacements('contact')?.emplacements.map((emplacement) => ({
    id: emplacement.id,
    nature: emplacement.nature,
  }));
  expect(structureApres).toEqual(structureAvant);

  // …et la déclaration versionnée (l'état publié) n'a pas bougé : le
  // carrousel déclaré reste vide, tel que posé par l'intégrateur.
  const carrouselDeclare = obtenirPageAvecEmplacements('contact')?.emplacements.find(
    (emplacement) => emplacement.id === 'carrousel-clients',
  );
  expect(carrouselDeclare).toMatchObject({ mediaIds: [] });

  // …la page « Contact » porte désormais la pastille de brouillon…
  const listeApres = await exports.default.fetch(
    new Request(ROUTE_MES_PAGES, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const ligneContactApres = /<li>Contact[\s\S]*?<\/li>/.exec(await listeApres.text())?.[0] ?? '';
  expect(ligneContactApres).toMatch(/data-pastille-brouillon/);

  // …et l'éditeur montre le nouvel ensemble COMPOSÉ exact — gamma puis
  // alpha, jamais beta ni un autre ordre : la valeur littérale de
  // `data-media-ids` EST l'ensemble attendu, ce qui exclut beta par
  // construction (`beta` reste par ailleurs visible ailleurs dans la
  // réponse comme image encore disponible dans la réserve via
  // `data-medias`, ce qui n'est pas ce que ce critère prouve).
  const editeurApres = await exports.default.fetch(
    new Request(ROUTE_EDITEUR_CONTACT, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } }),
  );
  const corpsEditeurApres = await editeurApres.text();
  expect(corpsEditeurApres).toContain(
    `data-media-ids="${JSON.stringify(nouvelOrdreSansBeta).replace(/"/g, '&quot;')}"`,
  );
});
