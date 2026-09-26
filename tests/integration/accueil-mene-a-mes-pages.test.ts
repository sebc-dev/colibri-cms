/**
 * Ticket 01 (change 005-mise-en-page-administration) — Après la connexion,
 * l'éditrice arrive sur « Mes pages »
 * (openspec/changes/005-mise-en-page-administration/tickets/
 * 01-accueil-mene-a-mes-pages.md).
 *
 * Couture retenue, à l'image de `code-ouvre-la-session.test.ts`,
 * `fin-de-session.test.ts` et `liste-des-pages.test.ts` (SPEC.md § Décisions
 * de test, ADR-0003) : requête HTTP réelle via `exports.default.fetch`
 * contre le worker compilé, dans `workerd`, contre la vraie D1 locale —
 * jamais de double interne. `exports.default.fetch` invoque directement le
 * gestionnaire du worker : il ne suit aucun renvoi tout seul (à la
 * différence d'un `fetch` de navigateur), donc chaque renvoi de la chaîne
 * est rejoué ici à la main, requête après requête.
 *
 * **Rien n'implémente encore ce ticket** : `src/pages/admin/index.astro`
 * rend aujourd'hui « Vous êtes connectée. » (200) pour toute session
 * valide, sans jamais renvoyer vers `/admin/mes-pages`. Les deux tests
 * ci-dessous sont donc censés échouer aujourd'hui — c'est le rouge attendu
 * du mode `tdd`.
 *
 * SC-01a s'appuie sur une session semée directement (même geste que
 * `liste-des-pages.test.ts` et `fin-de-session.test.ts`, table `sessions`
 * de `migrations/0003_sessions.sql`) : le critère ne porte que sur la
 * réponse de l'accueil face à une session déjà valide, sans exiger de
 * rejouer tout le parcours de connexion.
 *
 * SC-01b rejoue le parcours réel de bout en bout, comme
 * `code-ouvre-la-session.test.ts` (migration
 * `0002_adresses_autorisees_et_codes_connexion.sql` rejouée, empreinte
 * salée recomposée à la main — l'algorithme de hachage n'est exporté par
 * aucun module de production, donc jamais importé) : GET de l'écran de
 * connexion (pose le cookie d'appareil), POST du code valide (ouvre la
 * session, pose le cookie `__Host-session`), puis chaque renvoi est suivi à
 * la main jusqu'à la réponse finale — en observant qu'aucune étape
 * intermédiaire ne rend un écran à 200 (un écran sans suite) avant d'y
 * arriver.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, assert, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const TABLE_SESSIONS = 'sessions';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const DUREE_DE_VIE_CODE_MS = 15 * 60 * 1000; // ADR-0001.

const PATH_MES_PAGES_RE = /^\/admin\/mes-pages\/?$/;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

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

let schemaSessionsPret: Promise<void> | null = null;
async function assurerSchemaSessions(): Promise<DBLike> {
  const db = obtenirDB();
  schemaSessionsPret ??= (async () => {
    const module = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(module.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
  })();
  await schemaSessionsPret;
  return db;
}

let schemaCodesPret: Promise<void> | null = null;
async function assurerSchemaCodes(): Promise<DBLike> {
  const db = obtenirDB();
  schemaCodesPret ??= (async () => {
    const module = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    for (const requete of separerRequetes(module.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaCodesPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  try {
    await db.prepare(`delete from ${TABLE_SESSIONS}`).run();
    await db.prepare(`delete from ${TABLE_CODES}`).run();
    await db.prepare(`delete from ${TABLE_ADRESSES}`).run();
  } catch (erreur) {
    console.warn('nettoyage D1 ignoré (schéma absent, rouge attendu) :', erreur);
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-accueil-mene-a-mes-pages-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function semerAdresseAutorisee(db: DBLike, adresse: string): Promise<void> {
  await db.prepare(`insert into ${TABLE_ADRESSES} (adresse) values (?1)`).bind(adresse).run();
}

function octetsVersHex(octets: Uint8Array): string {
  return Array.from(octets)
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Réplique de l'algorithme d'empreinte de `src/platform/auth/magasin.ts`
 * (SHA-256 salé, hex) — jamais importé, comme dans
 * `code-ouvre-la-session.test.ts`.
 */
async function empreinteSalee(sel: string, codeClair: string): Promise<string> {
  const donnees = new TextEncoder().encode(`${sel}:${codeClair}`);
  const digest = await crypto.subtle.digest('SHA-256', donnees);
  return octetsVersHex(new Uint8Array(digest));
}

async function semerLigneDeCode(
  db: DBLike,
  options: { codeClair: string; identifiantAppareil: string },
): Promise<void> {
  const sel = 'sel-de-semis-005-01';
  const empreinte = await empreinteSalee(sel, options.codeClair);
  const creeeLe = Date.now();
  const expireLe = creeeLe + DUREE_DE_VIE_CODE_MS;
  await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, utilise_le, annule_le) values (?1, ?2, ?3, ?4, ?5, 0, null, null)`,
    )
    .bind(options.identifiantAppareil, empreinte, sel, creeeLe, expireLe)
    .run();
}

function extraireCookieValeur(reponse: Response, nom: string): string | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire] = entete.split(';').map((s) => s.trim());
    const [cle, valeur] = paire.split('=');
    if (cle === nom) return valeur;
  }
  return null;
}

function cheminDeLocation(reponse: Response): string | null {
  const location = reponse.headers.get('location');
  if (!location) return null;
  return new URL(location, 'https://example.com').pathname;
}

async function accederAAccueil(cookieSession: string): Promise<Response> {
  return exports.default.fetch(
    new Request('https://example.com/admin/', {
      redirect: 'manual',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
    }),
  );
}

async function afficherEcranDeConnexion(): Promise<Response> {
  return exports.default.fetch(new Request('https://example.com/admin/connexion'));
}

async function soumettreCode(saisie: string, identifiantAppareil: string): Promise<Response> {
  return exports.default.fetch(
    new Request('https://example.com/admin/connexion', {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://example.com',
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
      },
      body: `code=${encodeURIComponent(saisie)}`,
    }),
  );
}

/**
 * Suit à la main chaque renvoi émis à partir de `reponseInitiale`, en
 * portant le cookie de session fourni au fil des requêtes suivantes,
 * jusqu'à une réponse qui n'est plus un renvoi. Rend la liste des statuts
 * traversés (renvois puis réponse finale), dans l'ordre — c'est sur cette
 * liste que se juge « aucun écran sans suite traversé ».
 */
async function suivreLesRenvois(
  reponseInitiale: Response,
  cheminInitial: string,
  cookieSession: string,
): Promise<{ statuts: number[]; cheminFinal: string; reponseFinale: Response }> {
  const statuts: number[] = [reponseInitiale.status];
  let reponseCourante = reponseInitiale;
  let cheminCourant = cheminInitial;

  while (REDIRECT_STATUSES.includes(reponseCourante.status)) {
    const chemin = cheminDeLocation(reponseCourante);
    assert(chemin !== null, 'un renvoi sans en-tête Location — impossible de poursuivre la chaîne');
    cheminCourant = chemin;
    reponseCourante = await exports.default.fetch(
      new Request(new URL(chemin, 'https://example.com').toString(), {
        redirect: 'manual',
        headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
      }),
    );
    statuts.push(reponseCourante.status);
  }

  return { statuts, cheminFinal: cheminCourant, reponseFinale: reponseCourante };
}

// --- SC-01a — l'accueil, derrière une session valide, renvoie vers « Mes pages » sans rendre l'accueil ---

it('SC-01a — l’accueil demandé avec une session valide renvoie vers « Mes pages » sans rendre le contenu propre à l’accueil', async () => {
  const db = await assurerSchemaSessions();
  const cookieSession = await semerSessionValide(db);

  const reponse = await accederAAccueil(cookieSession);
  const corps = await reponse.text();

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_MES_PAGES_RE);
  expect(corps).not.toContain('Vous êtes connectée');
});

// --- SC-01b — depuis la connexion, suivre les renvois mène à « Mes pages », sans écran sans suite ---

it('SC-01b — juste après l’ouverture de session par le code recopié, suivre les renvois mène à « Mes pages » sans traverser d’écran sans suite', async () => {
  const dbCodes = await assurerSchemaCodes();
  await assurerSchemaSessions();
  await semerAdresseAutorisee(dbCodes, ADRESSE_AUTORISEE);

  const reponseConnexion = await afficherEcranDeConnexion();
  const identifiantAppareil = extraireCookieValeur(reponseConnexion, NOM_COOKIE_APPAREIL);
  assert(identifiantAppareil !== null, 'aucun cookie d’appareil posé par l’écran de connexion');
  await semerLigneDeCode(dbCodes, { codeClair: 'P9X3M7Q1', identifiantAppareil });

  const reponseApresCode = await soumettreCode('P9X3M7Q1', identifiantAppareil);
  const cookieSession = extraireCookieValeur(reponseApresCode, NOM_COOKIE_SESSION);
  assert(cookieSession !== null, 'aucune session ouverte par le code — précondition du critère non remplie');

  const { statuts, cheminFinal, reponseFinale } = await suivreLesRenvois(
    reponseApresCode,
    '/admin/connexion',
    cookieSession,
  );

  // Chaque étape avant la dernière doit être un renvoi : un 200 intermédiaire
  // serait l'écran sans suite que ce critère interdit de traverser.
  expect(statuts.slice(0, -1).every((statut) => REDIRECT_STATUSES.includes(statut))).toBe(true);
  expect(reponseFinale.status).toBe(200);
  expect(cheminFinal).toMatch(PATH_MES_PAGES_RE);
});
