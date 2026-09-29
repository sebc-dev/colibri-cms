/**
 * Ticket 02 — La bibliothèque désigne un emplacement par son nom
 * (openspec/changes/006-nom-des-emplacements/tickets/
 * 02-bibliotheque-designe-par-le-nom.md, ADR-0012, design D3).
 *
 * Couture retenue, même patron que `tests/integration/
 * ou-posee-et-supprimer.test.ts` (ticket 11) : requête HTTP réelle via
 * `exports.default.fetch` contre le worker compilé, dans `workerd`, contre
 * la vraie D1 locale (ADR-0003/ADR-0014). Les migrations `0003_sessions.sql`,
 * `0004_brouillons_emplacements.sql`, `0005_medias_brouillon.sql` et
 * `0006_medias_brouillon_affichage.sql` sont rejouées ici même ; une session
 * valide, une image en brouillon et des lignes de `brouillons_emplacements`
 * sont semées directement en D1, sans rejouer la pose (ticket 08).
 *
 * `content/pages/tarifs/page.json` porte déjà un emplacement `bandeau-tarifs`
 * nommé « Bandeau des tarifs » (ticket 01) et `content/pages/accueil/
 * page.json` un emplacement `image-hero` sans nom — aucune des deux
 * déclarations n'est modifiée par ce fichier.
 *
 * SC-02a/SC-02c se lisent sur `data-emplacements`, l'attribut JSON que
 * `src/pages/admin/medias/[id].astro` sert au point de montage de la fiche
 * — même proxy d'assertion que `ou-posee-et-supprimer.test.ts`. SC-02d se
 * lit sur ce même attribut, composé au GET de la fiche, AVANT toute
 * application : `src/pages/admin/medias/[id]/supprimer.ts` n'est pas touché
 * par ce ticket et ne compose aucune liste propre — la confirmation reprend
 * donc nécessairement, telle quelle, la liste déjà correcte de la fiche
 * (design.md § Décisions : « une seule liste alimente la fiche et la
 * confirmation »).
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, describe } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const TABLE_MEDIAS = 'medias_brouillon';
const ROUTE_FICHE = (id: string) => `https://example.com/admin/medias/${id}`;
const ROUTE_SUPPRIMER = (id: string) => `https://example.com/admin/medias/${id}/supprimer`;

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
  const id = `session-nom-emplacement-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

/** Sème une image en brouillon (même geste que `ou-posee-et-supprimer.test.ts`). */
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

/** Sème directement une ligne de brouillon d'emplacement d'image, référençant `mediaId`. */
async function semerEmplacementImage(db: DBLike, pageSlug: string, idEmplacement: string, mediaId: string): Promise<void> {
  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, 'image', ?3, ?4)`,
    )
    .bind(pageSlug, idEmplacement, JSON.stringify({ nature: 'image', mediaId }), Date.now())
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
      headers: {
        'content-type': 'application/json',
        ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
      },
    }),
  );
}

async function lireEmplacementsComposes(reponse: Response): Promise<{ pageTitre: string; place: string }[]> {
  const corps = await reponse.text();
  const attribut = /data-emplacements="([^"]*)"/.exec(corps)?.[1] ?? '';
  return JSON.parse(attribut.replace(/&quot;/g, '"')) as { pageTitre: string; place: string }[];
}

// --- SC-02a — un emplacement nommé se désigne par la page et le nom ---

describe("SC-02a — la fiche d'une image posée dans un emplacement nommé la désigne par le titre de sa page et le nom de l'emplacement", () => {
  it(
    "SC-02a — par la couture HTTP, la fiche d'une image posée dans « Bandeau des tarifs » (page Tarifs) compose « Tarifs — Bandeau des tarifs »",
    async () => {
      // Arrange
      const db = await assurerSchema();
      const cookieSession = await semerSessionValide(db);
      await semerMediaBrouillon(db, 'media-bandeau-tarifs', 'photo-bandeau.png');
      await semerEmplacementImage(db, 'tarifs', 'bandeau-tarifs', 'media-bandeau-tarifs');

      // Act
      const reponse = await requeteAvecSession(ROUTE_FICHE('media-bandeau-tarifs'), cookieSession);

      // Assert : la page et le NOM de l'emplacement, jamais sa nature ni
      // son identifiant technique.
      expect(reponse.status).toBe(200);
      const emplacements = await lireEmplacementsComposes(reponse);
      expect(emplacements).toEqual([{ pageTitre: 'Tarifs', place: 'Bandeau des tarifs' }]);
    },
  );
});

// --- SC-02c — sur la même fiche, un emplacement nommé et un emplacement
// sans nom se désignent chacun selon sa propre règle ---

describe(
  "SC-02c — sur la même fiche, un emplacement nommé d'une page et un emplacement sans nom d'une autre page se désignent chacun selon leur propre règle",
  () => {
    it(
      "SC-02c — par la couture HTTP, la fiche d'une image posée dans « Bandeau des tarifs » (Tarifs, nommé) et dans « image-hero » (Accueil, sans nom) désigne le premier par son nom et le second par sa nature",
      async () => {
        // Arrange : `image-hero` est le seul emplacement `image` de la page
        // Accueil (content/pages/accueil/page.json) — sa désignation, sans
        // nom, est donc la nature seule, sans rang.
        const db = await assurerSchema();
        const cookieSession = await semerSessionValide(db);
        await semerMediaBrouillon(db, 'media-mixte', 'photo-mixte.png');
        await semerEmplacementImage(db, 'tarifs', 'bandeau-tarifs', 'media-mixte');
        await semerEmplacementImage(db, 'accueil', 'image-hero', 'media-mixte');

        // Act
        const reponse = await requeteAvecSession(ROUTE_FICHE('media-mixte'), cookieSession);

        // Assert
        expect(reponse.status).toBe(200);
        const emplacements = await lireEmplacementsComposes(reponse);
        expect(emplacements.slice().sort((a, b) => a.pageTitre.localeCompare(b.pageTitre))).toEqual([
          { pageTitre: 'Accueil', place: 'image' },
          { pageTitre: 'Tarifs', place: 'Bandeau des tarifs' },
        ]);
      },
    );
  },
);

// --- SC-02d — la confirmation de suppression reprend la même désignation
// que la fiche, avant toute application ---

describe(
  "SC-02d — la liste des emplacements présentée avant la suppression désigne un emplacement nommé par sa page et son nom, comme la fiche",
  () => {
    it(
      "SC-02d — par la couture HTTP, la liste composée au chargement de la fiche (reprise telle quelle par la confirmation, avant toute application) désigne l'emplacement nommé par sa page et son nom",
      async () => {
        // Arrange
        const db = await assurerSchema();
        const cookieSession = await semerSessionValide(db);
        await semerMediaBrouillon(db, 'media-avant-suppression', 'photo-avant-suppression.png');
        await semerEmplacementImage(db, 'tarifs', 'bandeau-tarifs', 'media-avant-suppression');

        // Act : la fiche est chargée — c'est cette même réponse, avant
        // toute application, que la confirmation de suppression reprend
        // telle quelle (design.md § Décisions ; `[id]/supprimer.ts` n'est
        // pas touché par ce ticket et ne compose aucune liste propre).
        const reponseFiche = await requeteAvecSession(ROUTE_FICHE('media-avant-suppression'), cookieSession);

        // Assert : la désignation par page et nom, comme SC-02a.
        expect(reponseFiche.status).toBe(200);
        const emplacements = await lireEmplacementsComposes(reponseFiche);
        expect(emplacements).toEqual([{ pageTitre: 'Tarifs', place: 'Bandeau des tarifs' }]);

        // Act : l'application de la suppression, elle, ne recompose ni ne
        // renvoie de liste propre — la seule source de vérité pour la
        // confirmation est celle déjà lue ci-dessus.
        const reponseSuppression = await poster(ROUTE_SUPPRIMER('media-avant-suppression'), cookieSession);

        // Assert : aucune liste alternative n'est jamais renvoyée par
        // l'application elle-même.
        expect(reponseSuppression.status).toBe(200);
        const corpsSuppression = await reponseSuppression.json();
        expect(corpsSuppression).toEqual({ ok: true });
      },
    );
  },
);
