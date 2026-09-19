/**
 * Ticket 07 — La fiche d'une image : renommer et décrire
 * (openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md).
 *
 * Couture retenue, même patron que `reserve-persister-servir.test.ts`
 * (ticket 04) et `regler-lien-video.test.ts` (ticket 05) : requête HTTP
 * réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, contre la vraie D1 locale (ADR-0003/ADR-0014) — jamais de
 * simulacre. Les migrations `0003_sessions.sql`, `0005_medias_brouillon.sql`
 * et `0006_medias_brouillon_affichage.sql` sont rejouées ici même ; une
 * session valide et une image en brouillon sont semées directement en D1
 * (même geste que `semerSessionValide` des fichiers voisins) — le
 * téléversement lui-même (ticket 04) n'est pas rejoué ici, il l'est déjà par
 * `reserve-persister-servir.test.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_MEDIAS = 'medias_brouillon';
const ROUTE_RENOMMER = (id: string) => `https://example.com/admin/medias/${id}/renommer`;
const ROUTE_DECRIRE = (id: string) => `https://example.com/admin/medias/${id}/decrire`;

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
  for (const table of [TABLE_SESSIONS, TABLE_MEDIAS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-fiche-media-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

/**
 * Sème directement une image en brouillon (sans rejouer le téléversement du
 * ticket 04, déjà couvert par `reserve-persister-servir.test.ts`) : seul le
 * nom d'origine importe à ce ticket, pour prouver qu'il n'est JAMAIS touché
 * par le renommage (SC-07a).
 */
async function semerMediaBrouillon(db: DBLike, nomOrigine: string): Promise<string> {
  const id = `media-fiche-${crypto.randomUUID()}`;
  const octets = new Uint8Array([1, 2, 3, 4]);
  await db
    .prepare(
      `insert into ${TABLE_MEDIAS} (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(id, nomOrigine, 'png', 10, 10, octets.length, octets, Date.now())
    .run();
  return id;
}

async function poster(route: string, cookieSession: string | null, corps: unknown): Promise<Response> {
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

interface LigneMediaBrute {
  readonly nom_origine: string;
  readonly nom_affichage: string | null;
  readonly description: string | null;
}

async function lireLigne(db: DBLike, id: string): Promise<LigneMediaBrute> {
  const resultat = await db
    .prepare(`select nom_origine, nom_affichage, description from ${TABLE_MEDIAS} where id = ?1`)
    .bind(id)
    .all();
  return (resultat.results as LigneMediaBrute[])[0];
}

// --- SC-07a — renommer enregistre le nom d'affichage, le nom d'origine
// reste inchangé ---

it(
  "SC-07a — par la couture HTTP, renommer une image enregistre le nouveau nom d'affichage ; le nom d'origine reste inchangé",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    const id = await semerMediaBrouillon(db, 'photo-de-couverture.png');

    // Act
    const reponse = await poster(ROUTE_RENOMMER(id), cookieSession, { nom: 'Bandeau de la page Accueil' });

    // Assert : la réponse confirme l'enregistrement…
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as { ok: boolean; nomAffichage: string };
    expect(corps.ok).toBe(true);
    expect(corps.nomAffichage).toBe('Bandeau de la page Accueil');

    // …le nom d'affichage est bien celui écrit en D1…
    const ligne = await lireLigne(db, id);
    expect(ligne.nom_affichage).toBe('Bandeau de la page Accueil');
    // …et le nom d'ORIGINE, lui, n'a pas bougé.
    expect(ligne.nom_origine).toBe('photo-de-couverture.png');
  },
);

// --- SC-07b — saisir puis modifier la description l'enregistre au magasin
// brouillon ---

it(
  "SC-07b — par la couture HTTP, saisir puis modifier la description d'une image l'enregistre au magasin brouillon",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    const id = await semerMediaBrouillon(db, 'bandeau.png');

    // Act : saisie d'une première description…
    const reponseSaisie = await poster(ROUTE_DECRIRE(id), cookieSession, {
      description: "Le bandeau de la page d'accueil, vue de la vitrine.",
    });

    // Assert : elle est bien enregistrée…
    expect(reponseSaisie.status).toBe(200);
    const corpsSaisie = (await reponseSaisie.json()) as { ok: boolean; description: string };
    expect(corpsSaisie.ok).toBe(true);
    const ligneApresSaisie = await lireLigne(db, id);
    expect(ligneApresSaisie.description).toBe("Le bandeau de la page d'accueil, vue de la vitrine.");

    // Act : … puis sa modification.
    const reponseModification = await poster(ROUTE_DECRIRE(id), cookieSession, {
      description: 'Le bandeau de la page d’accueil, prise de vue du matin.',
    });

    // Assert : c'est bien la nouvelle valeur qui est enregistrée, la
    // précédente ne survit pas à côté.
    expect(reponseModification.status).toBe(200);
    const ligneApresModification = await lireLigne(db, id);
    expect(ligneApresModification.description).toBe('Le bandeau de la page d’accueil, prise de vue du matin.');
  },
);

// --- SC-07a — sans session valide, renommer une image n'écrit rien ---

it(
  "SC-07a — sans session valide, renommer une image n'écrit rien",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const id = await semerMediaBrouillon(db, 'photo.png');

    // Act : aucun cookie de session sur la demande.
    const reponse = await poster(ROUTE_RENOMMER(id), null, { nom: 'Nouveau nom' });

    // Assert : refusée, et rien n'a été écrit.
    expect(reponse.status).toBe(401);
    const ligne = await lireLigne(db, id);
    expect(ligne.nom_affichage).toBeNull();
    expect(ligne.nom_origine).toBe('photo.png');
  },
);

// --- SC-07b — sans session valide, décrire une image n'écrit rien ---

it(
  "SC-07b — sans session valide, décrire une image n'écrit rien",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const id = await semerMediaBrouillon(db, 'photo.png');

    // Act : aucun cookie de session sur la demande.
    const reponse = await poster(ROUTE_DECRIRE(id), null, { description: 'Texte' });

    // Assert : refusée, et rien n'a été écrit.
    expect(reponse.status).toBe(401);
    const ligne = await lireLigne(db, id);
    expect(ligne.description).toBeNull();
  },
);

// --- SC-07a/SC-07b — un corps qui n'est pas un objet est refusé sans écriture ---

it(
  "SC-07a/SC-07b — un corps qui n'est pas un objet est refusé sans écriture",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    const id = await semerMediaBrouillon(db, 'photo.png');

    // Act
    const reponseRenommer = await poster(ROUTE_RENOMMER(id), cookieSession, null);
    const reponseDecrire = await poster(ROUTE_DECRIRE(id), cookieSession, null);

    // Assert : refusées, et rien n'a été écrit.
    expect(reponseRenommer.status).toBe(400);
    expect(await reponseRenommer.json()).toEqual({ ok: false, raison: 'forme-invalide' });
    expect(reponseDecrire.status).toBe(400);
    expect(await reponseDecrire.json()).toEqual({ ok: false, raison: 'forme-invalide' });

    const ligne = await lireLigne(db, id);
    expect(ligne.nom_affichage).toBeNull();
    expect(ligne.description).toBeNull();
  },
);

