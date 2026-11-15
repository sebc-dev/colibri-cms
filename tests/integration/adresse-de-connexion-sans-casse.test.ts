/**
 * Ticket 01 (change 019) — L'adresse de connexion se reconnaît sans tenir
 * compte des majuscules ni des espaces de bord (issue #354).
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * de production, dans workerd, contre la vraie D1 locale (ADR-0014). Seule
 * la liaison d'expédition est remplacée par un espion (dépendance hors
 * process, ADR-0002). Oracle : une ligne de code de plus, et un destinataire
 * égal à l'adresse telle qu'elle est enregistrée, jamais à la saisie.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const CLE_LIAISON_EXPEDITION = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_ENREGISTREE = 'editrice@example.com';
const ADRESSE_ENREGISTREE_AVEC_MAJUSCULES = 'Editrice@Example.com';
const ATTENTE_MAX_EXPEDITION_MS = 3000;

interface DBLike {
  prepare(requete: string): {
    bind(...valeurs: unknown[]): { run(): Promise<unknown> };
    run(): Promise<unknown>;
    all(): Promise<{ results: Record<string, unknown>[] }>;
  };
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

let schemaApplique: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaApplique ??= (async () => {
    const adresses = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    const seuil = await import('../../migrations/0012_seuil_par_origine.sql?raw');
    for (const module of [adresses, sessions, seuil]) {
      for (const requete of separerRequetes(module.default)) {
        await db.prepare(requete).run();
      }
    }
  })();
  await schemaApplique;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  await db.prepare('delete from codes_connexion').run();
  await db.prepare('delete from adresses_autorisees').run();
  await db.prepare('delete from comptes_seuil').run();
  Reflect.deleteProperty(env, CLE_LIAISON_EXPEDITION);
});

function creerExpediteurEspion(): {
  expediteur: { send(message: unknown): void };
  appels: unknown[];
  demande: Promise<void>;
} {
  const appels: unknown[] = [];
  let resoudreDemande: () => void = () => undefined;
  const demande = new Promise<void>((resolve) => {
    resoudreDemande = resolve;
  });
  return {
    expediteur: {
      send(message: unknown): void {
        appels.push(message);
        resoudreDemande();
      },
    },
    appels,
    demande,
  };
}

async function attendreExpedition(demande: Promise<void>): Promise<void> {
  await Promise.race([
    demande,
    new Promise<void>((resolve) => setTimeout(resolve, ATTENTE_MAX_EXPEDITION_MS)),
  ]);
}

async function semerAdresse(db: DBLike, adresse: string): Promise<void> {
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(adresse).run();
}

async function compterCodes(db: DBLike): Promise<number> {
  const resultat = await db.prepare('select count(*) as n from codes_connexion').all();
  return Number(resultat.results.at(0)?.n ?? 0);
}

async function obtenirIdentifiantAppareil(): Promise<string> {
  const reponse = await exports.default.fetch(new Request('https://example.com/admin/connexion'));
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire] = entete.split(';');
    const [cle, valeur] = paire.split('=');
    if (cle === NOM_COOKIE_APPAREIL) return valeur;
  }
  throw new Error(`aucun cookie « ${NOM_COOKIE_APPAREIL} » posé par l'écran de connexion`);
}

async function soumettreAdresse(adresse: string, identifiantAppareil: string): Promise<Response> {
  return exports.default.fetch(
    new Request('https://example.com/admin/connexion', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://example.com',
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
      },
      body: `adresse=${encodeURIComponent(adresse)}`,
    }),
  );
}

/** Sème l'adresse enregistrée, soumet la saisie, rend ce qu'on observe. */
async function soumettreEtObserver(
  enregistree: string,
  saisie: string,
): Promise<{ codesEcrits: number; destinataires: string[] }> {
  const db = await assurerSchema();
  await semerAdresse(db, enregistree);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const { expediteur, appels, demande } = creerExpediteurEspion();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION] = expediteur;
  const avant = await compterCodes(db);

  await soumettreAdresse(saisie, identifiantAppareil);
  await attendreExpedition(demande);

  return {
    codesEcrits: (await compterCodes(db)) - avant,
    destinataires: appels.map((message) => (message as { to: string }).to),
  };
}

// Quatre saisies de l'adresse enregistrée, même oracle : un code de plus, et
// le destinataire est l'adresse telle qu'elle est en base, jamais la saisie.
it.each([
  ['SC-01a — une majuscule en tête de l’adresse autorisée', 'Editrice@example.com'],
  ['SC-01a — une adresse autorisée toute en majuscules', 'EDITRICE@EXAMPLE.COM'],
  ['SC-01b — des espaces autour de l’adresse autorisée', '  editrice@example.com  '],
  ['SC-01b — une tabulation et des espaces de bord', '\t editrice@example.com \t'],
])('%s : un code est écrit et l’expédition est demandée à l’adresse enregistrée', async (_cas, saisie) => {
  const observe = await soumettreEtObserver(ADRESSE_ENREGISTREE, saisie);

  expect(observe.codesEcrits).toBe(1);
  expect(observe.destinataires).toEqual([ADRESSE_ENREGISTREE]);
});

it('SC-01c — une adresse enregistrée avec des majuscules, soumise en minuscules, écrit un code et demande l’expédition à l’adresse enregistrée', async () => {
  const observe = await soumettreEtObserver(
    ADRESSE_ENREGISTREE_AVEC_MAJUSCULES,
    'editrice@example.com',
  );

  expect(observe.codesEcrits).toBe(1);
  expect(observe.destinataires).toEqual([ADRESSE_ENREGISTREE_AVEC_MAJUSCULES]);
});

it('SC-01c — une adresse enregistrée avec une majuscule accentuée, soumise à l’identique, reste reconnue', async () => {
  // La casse est pliée par la base des deux côtés : elle ne plie que l'ASCII,
  // donc une adresse à majuscule accentuée n'est reconnue qu'à l'identique.
  const observe = await soumettreEtObserver('Éditrice@example.com', 'Éditrice@example.com');

  expect(observe.codesEcrits).toBe(1);
  expect(observe.destinataires).toEqual(['Éditrice@example.com']);
});

it('SC-01c — une adresse voisine n’écrit aucun code et ne demande aucune expédition (borne de SC-01a à SC-01c)', async () => {
  const observe = await soumettreEtObserver(ADRESSE_ENREGISTREE, 'editrice@example.org');

  expect(observe.codesEcrits).toBe(0);
  expect(observe.destinataires).toEqual([]);
});

it('SC-01d — l’écran de connexion demande un clavier d’adresse e-mail pour le champ de l’adresse', async () => {
  const reponse = await exports.default.fetch(new Request('https://example.com/admin/connexion'));
  const html = await reponse.text();

  const champ = /<input\b[^>]*\bname="adresse"[^>]*>/.exec(html)?.[0] ?? '';
  expect(champ).toMatch(/\binputmode="email"/);
});
