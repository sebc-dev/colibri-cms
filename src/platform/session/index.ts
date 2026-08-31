/**
 * Le garde de session (ADR-0007) — `docs/adr/0007-garde-de-session-par-import-et-surface-publique-close.md`.
 *
 * Tout fichier de route sous `src/pages/admin/` (et, plus tard, sous
 * `src/pages/api/` hors `src/pages/api/public/`) importe ce module : la
 * polarité tenue par l'ADR est le placement de l'import, pas la seule
 * invocation.
 *
 * Ticket 06 (specs/001-connexion-par-code/06-code-ouvre-la-session.md) : une
 * session existe désormais réellement, tenue en D1 (ADR-0001) — une ligne de
 * `sessions` dont l'`id` est le jeton même porté par le cookie
 * `__Host-session` (`src/platform/auth/magasin.ts` l'écrit ;
 * `src/pages/admin/connexion.astro` pose le cookie et
 * `src/pages/admin/index.astro` invoque ce garde). Aucune clé de signature à
 * vérifier : la session est « opaque en base », sa validité se juge par la
 * seule présence de la ligne.
 *
 * Zone `platform` (docs/archi.md, I1) : n'importe que `core/` — jamais un
 * autre fichier de `platform/` (la matrice ne fait aucune exception) ; le
 * sous-ensemble de D1 dont ce garde a besoin est donc dupliqué ici plutôt
 * qu'importé de `src/platform/auth/magasin.ts`.
 */

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';

/** Une session d'administration ouverte et valide. */
export interface Session {
  readonly id: string;
}

/** Le sous-ensemble de D1 dont ce garde a besoin (duck-typé, cf. D1Database). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<unknown>;
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
  };
}

let schemaSessionsAssure: Promise<void> | null = null;

/**
 * Crée `sessions` si elle n'existe pas encore — même définition que
 * `migrations/0003_sessions.sql` et que le garde défensif dupliqué dans
 * `src/platform/auth/magasin.ts` (I1 interdit à ce module de l'importer) :
 * reste fonctionnel sur une D1 où seule la migration 0002 a été rejouée
 * (couture de test du ticket 06).
 */
async function assurerTableSessions(db: DB): Promise<void> {
  if (!schemaSessionsAssure) {
    schemaSessionsAssure = db
      .prepare(
        `create table if not exists ${TABLE_SESSIONS} (id text primary key, identifiant_appareil text not null, creee_le integer not null)`,
      )
      .bind()
      .run()
      .then(() => undefined);
  }
  await schemaSessionsAssure;
}

function lireCookie(request: Request, nom: string): string | null {
  const entete = request.headers.get('cookie');
  if (!entete) return null;
  for (const paire of entete.split(';')) {
    const separateur = paire.indexOf('=');
    if (separateur === -1) continue;
    const cle = paire.slice(0, separateur).trim();
    if (cle === nom) return paire.slice(separateur + 1).trim();
  }
  return null;
}

/**
 * Rend la session valide portée par la requête, ou `null` s'il n'en existe
 * aucune (aucun cookie `__Host-session`, ou cookie ne correspondant à aucune
 * ligne de `sessions`).
 */
export async function verifierSession(db: DB, request: Request): Promise<Session | null> {
  const jeton = lireCookie(request, NOM_COOKIE_SESSION);
  if (!jeton) return null;

  await assurerTableSessions(db);
  const resultat = await db
    .prepare(`select id from ${TABLE_SESSIONS} where id = ?1`)
    .bind(jeton)
    .all<{ id: string }>();
  return resultat.results.length > 0 ? { id: jeton } : null;
}
