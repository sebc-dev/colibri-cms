/**
 * Ticket 11 — Voir où une image est posée, et la supprimer partout
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 11-ou-posee-et-supprimer.md).
 *
 * Couture retenue, même patron que `poser-remplacer-image.test.ts` (ticket
 * 08) et `composer-galerie-carrousel.test.ts` (ticket 09) : requête HTTP
 * réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, contre la vraie D1 locale (ADR-0003/ADR-0014). Les migrations
 * `0003_sessions.sql`, `0004_brouillons_emplacements.sql`,
 * `0005_medias_brouillon.sql` et `0006_medias_brouillon_affichage.sql` sont
 * rejouées ici même ; une session valide, une image en brouillon et des
 * lignes de `brouillons_emplacements` sont semées directement en D1, sans
 * rejouer la pose (ticket 08) elle-même.
 *
 * `content/pages/accueil/page.json` (emplacement `image-hero`) et
 * `content/pages/contact/page.json` (emplacement `photo-equipe`) portent
 * déjà, chacune, un unique emplacement de nature `image` — aucune n'est
 * modifiée par ce fichier (le ticket exclut explicitement toute
 * modification de la déclaration des emplacements) : SC-11d exerce donc le
 * retrait multi-pages sur ces deux emplacements déjà déclarés.
 *
 * SC-11a/SC-11b se lisent sur `data-emplacements`, l'attribut JSON que
 * `src/pages/admin/medias/[id].astro` sert au point de montage de la fiche
 * — même proxy d'assertion que `data-media-id`/`data-media-ids` déjà
 * utilisé par `poser-remplacer-image.test.ts`/`composer-galerie-carrousel
 * .test.ts` pour ce qui est effectivement composé côté serveur et repris
 * tel quel par l'îlot (`monter.ts`, ticket 11) sans seconde lecture.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, describe } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const TABLE_MEDIAS = 'medias_brouillon';
const ROUTE_FICHE = (id: string) => `https://example.com/admin/medias/${id}`;
const ROUTE_SUPPRIMER = (id: string) => `https://example.com/admin/medias/${id}/supprimer`;
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';

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
    const affichage = await import('../../migrations/0006_medias_brouillon_affichage.sql?raw');
    for (const requete of separerRequetes(affichage.default)) {
      try {
        await db.prepare(requete).run();
      } catch {
        // colonne déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
      }
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
  const id = `session-ou-posee-et-supprimer-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

/** Sème une image en brouillon (même geste que `fiche-renommer-decrire.test.ts`). */
async function semerMediaBrouillon(db: DBLike, id: string, nomOrigine: string): Promise<void> {
  const octets = new Uint8Array([1, 2, 3, 4]);
  await db
    .prepare(
      `insert into ${TABLE_MEDIAS} (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(id, nomOrigine, 'png', 10, 10, octets.length, octets, Date.now())
    .run();
}

/** Sème directement une ligne de brouillon d'emplacement d'image, référençant `mediaId` (même forme que `enregistrerCorrectionImage`). */
async function semerEmplacementImage(db: DBLike, pageSlug: string, idEmplacement: string, mediaId: string): Promise<void> {
  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, 'image', ?3, ?4)`,
    )
    .bind(pageSlug, idEmplacement, JSON.stringify({ nature: 'image', mediaId }), Date.now())
    .run();
}

/** Sème directement une ligne de brouillon d'emplacement de galerie ou de carrousel, référençant `mediaIds` (même forme que `enregistrerCorrectionGalerie`/`enregistrerCorrectionCarrousel`). */
async function semerEmplacementMediaIds(
  db: DBLike,
  pageSlug: string,
  idEmplacement: string,
  nature: 'galerie' | 'carrousel',
  mediaIds: string[],
): Promise<void> {
  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(pageSlug, idEmplacement, nature, JSON.stringify({ nature, mediaIds }), Date.now())
    .run();
}

async function requeteAvecSession(route: string, cookieSession: string | null): Promise<Response> {
  return exports.default.fetch(
    new Request(route, {
      headers: cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {},
    }),
  );
}

async function poster(route: string, cookieSession: string | null): Promise<Response> {
  return exports.default.fetch(
    new Request(route, {
      method: 'POST',
      // `content-type: application/json` évite la garde anti-CSRF native
      // d'Astro (« Cross-site POST form submissions are forbidden »), qui ne
      // vise que les soumissions FORM (même geste que `poster` de
      // `fiche-renommer-decrire.test.ts`/`poserImage` de
      // `poser-remplacer-image.test.ts`) — l'anti-forgerie propre au produit
      // reste le seul cookie de session `SameSite=Strict` (ADR-0011).
      headers: {
        'content-type': 'application/json',
        ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
      },
    }),
  );
}

async function compterLignes(db: DBLike, table: string): Promise<number> {
  const resultat = await db.prepare(`select 1 as un from ${table}`).bind().all();
  return resultat.results.length;
}

async function existeMedia(db: DBLike, id: string): Promise<boolean> {
  const resultat = await db.prepare(`select id from ${TABLE_MEDIAS} where id = ?1`).bind(id).all();
  return resultat.results.length > 0;
}

// --- SC-11a — la fiche d'une image posée présente la liste des emplacements
// qui la posent, désignés par leur page et leur place ---

it(
  "SC-11a — par la couture HTTP, la fiche d'une image posée sur un emplacement compose la page et la place qui la posent",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-posee-accueil', 'photo-hero.png');
    await semerEmplacementImage(db, 'accueil', 'image-hero', 'media-posee-accueil');

    // Act
    const reponse = await requeteAvecSession(ROUTE_FICHE('media-posee-accueil'), cookieSession);

    // Assert : la fiche compose bien la page « Accueil » et la place
    // « image » (nature seule, un unique emplacement `image` sur cette page)
    // — jamais l'identifiant technique `image-hero`.
    expect(reponse.status).toBe(200);
    const corps = await reponse.text();
    expect(corps).toContain('data-emplacements=');
    const attribut = /data-emplacements="([^"]*)"/.exec(corps)?.[1] ?? '';
    const emplacements = JSON.parse(attribut.replace(/&quot;/g, '"')) as { pageTitre: string; place: string }[];
    expect(emplacements).toEqual([{ pageTitre: 'Accueil', place: 'image' }]);
    expect(attribut).not.toContain('image-hero');
  },
);

it(
  "SC-11a — par la couture HTTP, la fiche d'une image posée dans une galerie et un carrousel compose les deux pages et leur place, sans identifiant technique",
  async () => {
    // Arrange : `galerie-realisations` (accueil) et `carrousel-clients`
    // (contact) sont déjà déclarés (content/pages/), aucune déclaration
    // n'est modifiée ici.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-en-galerie-fiche', 'photo-galerie.png');
    await semerEmplacementMediaIds(db, 'accueil', 'galerie-realisations', 'galerie', [
      'autre-a',
      'media-en-galerie-fiche',
    ]);
    await semerEmplacementMediaIds(db, 'contact', 'carrousel-clients', 'carrousel', ['media-en-galerie-fiche']);

    // Act
    const reponse = await requeteAvecSession(ROUTE_FICHE('media-en-galerie-fiche'), cookieSession);

    // Assert : chaque page n'a qu'un emplacement de cette nature — la place
    // est la nature seule, jamais l'identifiant technique de l'emplacement.
    expect(reponse.status).toBe(200);
    const corps = await reponse.text();
    const attribut = /data-emplacements="([^"]*)"/.exec(corps)?.[1] ?? '';
    const emplacements = JSON.parse(attribut.replace(/&quot;/g, '"')) as { pageTitre: string; place: string }[];
    expect(emplacements.slice().sort((a, b) => a.pageTitre.localeCompare(b.pageTitre))).toEqual([
      { pageTitre: 'Accueil', place: 'galerie' },
      { pageTitre: 'Contact', place: 'carrousel' },
    ]);
    expect(attribut).not.toContain('galerie-realisations');
    expect(attribut).not.toContain('carrousel-clients');
  },
);

// --- SC-11b — la fiche d'une image posée dans aucun emplacement indique
// qu'elle n'est posée nulle part ---

it(
  "SC-11b — par la couture HTTP, la fiche d'une image posée dans aucun emplacement compose une liste vide",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-orpheline', 'photo-seule.png');

    // Act
    const reponse = await requeteAvecSession(ROUTE_FICHE('media-orpheline'), cookieSession);

    // Assert : aucun emplacement composé — c'est ce tableau vide qui pilote
    // l'état « posée nulle part » affiché par `FicheMedia.svelte`.
    expect(reponse.status).toBe(200);
    const corps = await reponse.text();
    expect(corps).toContain('data-emplacements="[]"');
  },
);

// --- SC-11d — confirmer la suppression d'une image posée dans plusieurs
// emplacements de pages différentes la retire de chacun, l'état publié
// reste intact et chaque page touchée bascule à « brouillon » ---

it(
  "SC-11d — par la couture HTTP, confirmer la suppression d'une image posée sur deux pages la retire des deux, l'état publié reste intact, chaque page bascule à « brouillon »",
  async () => {
    // Arrange : les deux emplacements référencent déjà l'image depuis un
    // brouillon existant (seule façon dont `listerEmplacementsReferencantMedia`
    // peut la trouver) — les deux pages portent donc déjà la pastille avant
    // la suppression ; ce que ce critère prouve, c'est qu'elle y reste
    // (aucune ligne n'est jamais effacée, design.md § Decisions) ET que le
    // CONTENU de chaque ligne a bien changé, jamais que la pastille
    // apparaîtrait ex nihilo.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-partagee', 'photo-partagee.png');
    await semerEmplacementImage(db, 'accueil', 'image-hero', 'media-partagee');
    await semerEmplacementImage(db, 'contact', 'photo-equipe', 'media-partagee');

    // Act
    const reponse = await poster(ROUTE_SUPPRIMER('media-partagee'), cookieSession);

    // Assert : la réponse confirme la suppression…
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true });

    // …l'image reste dans la réserve, désormais orpheline (FR-037, délégué
    // à « Aperçu et publication » — aucun effacement de `medias_brouillon`
    // ici)…
    expect(await existeMedia(db, 'media-partagee')).toBe(true);
    const fiche = await requeteAvecSession(ROUTE_FICHE('media-partagee'), cookieSession);
    expect(fiche.status).toBe(200);
    const corpsFiche = await fiche.text();
    expect(corpsFiche).toContain('data-emplacements="[]"');
    expect(corpsFiche).toContain('&quot;effacable&quot;:true');

    // …chaque ligne de brouillon touchée n'y référence plus l'image (retrait,
    // jamais une suppression de la ligne elle-même — design.md § Decisions)…
    const ligneAccueil = (
      await db
        .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('accueil', 'image-hero')
        .all()
    ).results as { contenu: string }[];
    expect(JSON.parse(ligneAccueil[0].contenu)).toEqual({ nature: 'image', mediaId: '' });
    const ligneContact = (
      await db
        .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('contact', 'photo-equipe')
        .all()
    ).results as { contenu: string }[];
    expect(JSON.parse(ligneContact[0].contenu)).toEqual({ nature: 'image', mediaId: '' });

    // …les deux pages portent désormais la pastille de brouillon…
    const listeApres = await requeteAvecSession(ROUTE_MES_PAGES, cookieSession);
    const corpsListeApres = await listeApres.text();
    expect(/<li>Accueil[\s\S]*?<\/li>/.exec(corpsListeApres)?.[0] ?? '').toMatch(/data-pastille-brouillon/);
    expect(/<li>Contact[\s\S]*?<\/li>/.exec(corpsListeApres)?.[0] ?? '').toMatch(/data-pastille-brouillon/);

    // …et l'état publié — la déclaration versionnée — n'a pas bougé.
    const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
    const accueilDeclaree = obtenirPageAvecEmplacements('accueil');
    const imageAccueilDeclaree = accueilDeclaree?.emplacements.find((emplacement) => emplacement.id === 'image-hero');
    expect(imageAccueilDeclaree).toMatchObject({ mediaId: 'media-fixture-hero' });
    const contactDeclaree = obtenirPageAvecEmplacements('contact');
    const imageContactDeclaree = contactDeclaree?.emplacements.find(
      (emplacement) => emplacement.id === 'photo-equipe',
    );
    expect(imageContactDeclaree).toMatchObject({ mediaId: 'media-fixture-equipe' });
  },
);

it(
  "SC-11d — par la couture HTTP, confirmer la suppression d'une image posée dans une galerie et un carrousel de deux pages la retire des deux listes, en bloc, sans toucher les autres images",
  async () => {
    // Arrange : les emplacements `galerie-realisations` (accueil) et
    // `carrousel-clients` (contact) sont déjà déclarés (content/pages/),
    // aucune déclaration n'est modifiée ici.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-en-galerie-retrait', 'photo-galerie.png');
    await semerEmplacementMediaIds(db, 'accueil', 'galerie-realisations', 'galerie', [
      'autre-a',
      'media-en-galerie-retrait',
      'autre-b',
    ]);
    await semerEmplacementMediaIds(db, 'contact', 'carrousel-clients', 'carrousel', [
      'media-en-galerie-retrait',
      'autre-c',
    ]);
    const comptesBrouillonsAvant = await compterLignes(db, TABLE_BROUILLONS);

    // Act
    const reponse = await poster(ROUTE_SUPPRIMER('media-en-galerie-retrait'), cookieSession);

    // Assert
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true });

    const ligneGalerie = (
      await db
        .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('accueil', 'galerie-realisations')
        .all()
    ).results as { nature: string; contenu: string }[];
    expect(ligneGalerie[0].nature).toBe('galerie');
    expect(JSON.parse(ligneGalerie[0].contenu)).toEqual({ nature: 'galerie', mediaIds: ['autre-a', 'autre-b'] });

    const ligneCarrousel = (
      await db
        .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('contact', 'carrousel-clients')
        .all()
    ).results as { nature: string; contenu: string }[];
    expect(ligneCarrousel[0].nature).toBe('carrousel');
    expect(JSON.parse(ligneCarrousel[0].contenu)).toEqual({ nature: 'carrousel', mediaIds: ['autre-c'] });

    // Aucune ligne supprimée ni ajoutée (un remplacement en bloc, jamais un
    // effacement de la ligne).
    expect(await compterLignes(db, TABLE_BROUILLONS)).toBe(comptesBrouillonsAvant);

    // L'image reste dans la réserve, désormais orpheline (FR-037, hors
    // périmètre).
    expect(await existeMedia(db, 'media-en-galerie-retrait')).toBe(true);
  },
);

// --- SC-11e — supprimer une image posée dans aucun emplacement ne touche
// aucun brouillon ---

it(
  "SC-11e — par la couture HTTP, supprimer une image posée dans aucun emplacement n'écrit aucun brouillon",
  async () => {
    // Arrange : une image en brouillon, et une ligne de brouillon SANS
    // rapport (une autre page, une autre image) pour prouver qu'elle n'est
    // pas touchée non plus.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-jamais-posee', 'photo-jamais-posee.png');
    await semerEmplacementImage(db, 'accueil', 'image-hero', 'media-sans-rapport');
    const contenuSansRapportAvant = (
      await db
        .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('accueil', 'image-hero')
        .all()
    ).results as { contenu: string }[];
    const comptesBrouillonsAvant = await compterLignes(db, TABLE_BROUILLONS);

    // Act
    const reponse = await poster(ROUTE_SUPPRIMER('media-jamais-posee'), cookieSession);

    // Assert : la réponse confirme la suppression, l'image reste dans la
    // réserve, orpheline (aucune ligne `medias_brouillon` n'est jamais
    // effacée ici — FR-037, délégué à « Aperçu et publication »)…
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true });
    expect(await existeMedia(db, 'media-jamais-posee')).toBe(true);

    // …et `brouillons_emplacements` n'a ni gagné ni perdu de ligne, la ligne
    // sans rapport n'a pas bougé.
    const comptesBrouillonsApres = await compterLignes(db, TABLE_BROUILLONS);
    expect(comptesBrouillonsApres).toBe(comptesBrouillonsAvant);
    const contenuSansRapportApres = (
      await db
        .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('accueil', 'image-hero')
        .all()
    ).results as { contenu: string }[];
    expect(contenuSansRapportApres[0].contenu).toBe(contenuSansRapportAvant[0].contenu);
  },
);

it(
  "supprimer une image inconnue rend 404 et ne retire aucune référence",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    await semerMediaBrouillon(db, 'media-existante', 'photo-existante.png');
    await semerEmplacementImage(db, 'accueil', 'image-hero', 'media-existante');
    const comptesMediasAvant = await compterLignes(db, TABLE_MEDIAS);

    // Act
    const reponse = await poster(ROUTE_SUPPRIMER('media-inconnue'), cookieSession);

    // Assert : refusée, rien n'a bougé.
    expect(reponse.status).toBe(404);
    const ligne = (
      await db
        .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('accueil', 'image-hero')
        .all()
    ).results as { contenu: string }[];
    expect(JSON.parse(ligne[0].contenu)).toEqual({ nature: 'image', mediaId: 'media-existante' });
    expect(await compterLignes(db, TABLE_MEDIAS)).toBe(comptesMediasAvant);
  },
);

// --- Garde de session, même patron que `fiche-renommer-decrire.test.ts` ---

describe("SC-11d/SC-11e — sans session valide, supprimer une image n'écrit rien", () => {
  it("sans session valide, supprimer une image n'écrit rien et ne retire aucune référence", async () => {
    // Arrange
    const db = await assurerSchema();
    await semerMediaBrouillon(db, 'media-sans-session', 'photo.png');
    await semerEmplacementImage(db, 'accueil', 'image-hero', 'media-sans-session');

    // Act : aucun cookie de session sur la demande.
    const reponse = await poster(ROUTE_SUPPRIMER('media-sans-session'), null);

    // Assert : refusée, l'image et sa référence restent intactes.
    expect(reponse.status).toBe(401);
    expect(await existeMedia(db, 'media-sans-session')).toBe(true);
    const ligne = (
      await db
        .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
        .bind('accueil', 'image-hero')
        .all()
    ).results as { contenu: string }[];
    expect(JSON.parse(ligne[0].contenu)).toEqual({ nature: 'image', mediaId: 'media-sans-session' });
  });
});
