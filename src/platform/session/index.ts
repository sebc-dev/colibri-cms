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
 *
 * Ticket 08 (fin de session, specs/001-connexion-par-code/
 * 08-fin-de-session.md) : une session valide n'est plus jugée sur la seule
 * présence de la ligne — `dernier_usage_le` porte l'échéance glissante de
 * sept jours (c1), `creee_le` la butée absolue de trente jours (c2), quoi
 * qu'il arrive. La colonne `dernier_usage_le`, absente de
 * `migrations/0003_sessions.sql` (ticket 06), est ajoutée ici par un `alter
 * table` défensif — même geste que la création de table elle-même
 * (`assurerTableSessions`), pour rester fonctionnel sur une D1 qui n'a
 * rejoué que la migration d'origine.
 */
import {
  EXPIRATION_GLISSANTE_SESSION_MS,
  BUTEE_ABSOLUE_SESSION_MS,
  RAFRAICHISSEMENT_SESSION_INTERVALLE_MIN_MS,
} from '../../core/auth/regles.ts';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';

/** Une session d'administration ouverte et valide. */
export interface Session {
  readonly id: string;
}

/**
 * Compose l'en-tête `Set-Cookie` qui ouvre la session, avec les cinq
 * attributs qu'ADR-0001 impose : le préfixe `__Host-` (porté par le nom),
 * `Path=/`, `HttpOnly`, `Secure`, `SameSite=Strict`. La pose vit ici, dans
 * l'adaptateur de session, plutôt qu'inline dans la route : le nom du cookie
 * n'est défini qu'à un seul endroit, et les attributs de sécurité — dont
 * l'absence ne se voit qu'à l'attaque (ADR-0006 § Conséquences) — sont
 * auditables d'un seul regard. Le jeton est opaque (base32, sans caractère à
 * échapper), il entre tel quel dans la valeur.
 */
export function enteteCookieSession(jeton: string): string {
  return `${NOM_COOKIE_SESSION}=${jeton}; Path=/; HttpOnly; Secure; SameSite=Strict`;
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
 * (couture de test du ticket 06). Ajoute ensuite `dernier_usage_le`
 * (ticket 08) si la colonne n'existe pas déjà — `alter table` échoue sans
 * effet observable sur une D1 qui la porte déjà, l'échec est donc avalé.
 */
async function assurerTableSessions(db: DB): Promise<void> {
  if (!schemaSessionsAssure) {
    schemaSessionsAssure = (async () => {
      await db
        .prepare(
          `create table if not exists ${TABLE_SESSIONS} (id text primary key, identifiant_appareil text not null, creee_le integer not null)`,
        )
        .bind()
        .run();
      try {
        await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).bind().run();
      } catch {
        // déjà ajoutée : sans effet.
      }
    })();
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
 * aucune (aucun cookie `__Host-session`, cookie ne correspondant à aucune
 * ligne de `sessions`, échéance glissante de sept jours dépassée depuis le
 * dernier usage, ou butée absolue de trente jours dépassée depuis
 * l'ouverture — ticket 08, c1/c2).
 *
 * Un accès dans la fenêtre repousse l'échéance (c3), mais l'écriture qui la
 * repousse n'a lieu que si le dernier rafraîchissement remonte à plus de
 * `RAFRAICHISSEMENT_SESSION_INTERVALLE_MIN_MS` (c4) : une rafale de
 * requêtes immédiates ne coûte donc pas une écriture D1 à chacune.
 */
export async function verifierSession(db: DB, request: Request): Promise<Session | null> {
  const jeton = lireCookie(request, NOM_COOKIE_SESSION);
  if (!jeton) return null;

  await assurerTableSessions(db);
  const resultat = await db
    .prepare(`select creee_le, dernier_usage_le from ${TABLE_SESSIONS} where id = ?1`)
    .bind(jeton)
    .all<{ creee_le: number; dernier_usage_le: number | null }>();
  const ligne = resultat.results[0];
  if (!ligne) return null;

  const maintenant = Date.now();
  const dernierUsage = ligne.dernier_usage_le ?? ligne.creee_le;

  if (maintenant - dernierUsage > EXPIRATION_GLISSANTE_SESSION_MS) return null;
  if (maintenant - ligne.creee_le > BUTEE_ABSOLUE_SESSION_MS) return null;

  if (maintenant - dernierUsage > RAFRAICHISSEMENT_SESSION_INTERVALLE_MIN_MS) {
    await db
      .prepare(`update ${TABLE_SESSIONS} set dernier_usage_le = ?1 where id = ?2`)
      .bind(maintenant, jeton)
      .run();
  }

  return { id: jeton };
}
