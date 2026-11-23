/**
 * Ticket 08 (020-deploiement-instance-client) — le premier semis de l'adresse
 * autorisée, de bout en bout dans workerd contre la vraie D1 locale (ADR-0014).
 * Le verdict est rendu sur le contenu réel de `adresses_autorisees`, l'écriture
 * décidée est appliquée à la base, puis l'écran de connexion est interrogé.
 * Seule la liaison d'expédition est remplacée par un espion (ADR-0002).
 * Montage repris de adresse-de-connexion-sans-casse.test.ts.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';
import { jugerLePremierSemis } from '../../src/platform/auth/premier-semis.ts';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const CLE_LIAISON_EXPEDITION = 'EXPEDITEUR_CODE_CONNEXION';
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

async function inscrire(db: DBLike, adresse: string): Promise<void> {
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(adresse).run();
}

async function lireTable(db: DBLike): Promise<string[]> {
  const resultat = await db.prepare('select adresse from adresses_autorisees').all();
  return resultat.results.map((ligne) => String(ligne.adresse));
}

/** Le geste `semer` : lit la table, juge, n'écrit que dans « à inscrire ». */
async function semer(db: DBLike, adresse: string): Promise<string> {
  const resultat = await db.prepare('select adresse from adresses_autorisees').all();
  const lignes = resultat.results.map((ligne) => ({ adresse: String(ligne.adresse) }));
  const jugement = jugerLePremierSemis(adresse, lignes);
  if (jugement.verdict === 'a-inscrire') await inscrire(db, jugement.adresse);
  return jugement.verdict;
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

/** Demande un code à l'écran de connexion ; rend les destinataires des expéditions demandées. */
async function demanderUnCode(saisie: string): Promise<string[]> {
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const { expediteur, appels, demande } = creerExpediteurEspion();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION] = expediteur;
  await exports.default.fetch(
    new Request('https://example.com/admin/connexion', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://example.com',
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
      },
      body: `adresse=${encodeURIComponent(saisie)}`,
    }),
  );
  await attendreExpedition(demande);
  return appels.map((message) => (message as { to: string }).to);
}

it('SC-08a — une instance sans adresse autorisée : l’adresse semée est inscrite et l’écran de connexion lui envoie un code', async () => {
  const db = await assurerSchema();

  const verdict = await semer(db, 'editrice@example.com');
  const destinataires = await demanderUnCode('editrice@example.com');

  expect(verdict).toBe('a-inscrire');
  expect(await lireTable(db)).toEqual(['editrice@example.com']);
  expect(destinataires).toEqual(['editrice@example.com']);
});

it('SC-08b — une autre adresse sur une instance qui en a déjà une : refusé, table inchangée, aucun code pour l’autre adresse', async () => {
  const db = await assurerSchema();
  await inscrire(db, 'editrice@example.com');

  const verdict = await semer(db, 'autre@example.com');
  const destinataires = await demanderUnCode('autre@example.com');

  expect(verdict).toBe('autre-adresse-en-place');
  expect(await lireTable(db)).toEqual(['editrice@example.com']);
  expect(destinataires).toEqual([]);
});

it('SC-08c — le semis relancé, même avec une autre casse : une seule adresse autorisée, la même', async () => {
  const db = await assurerSchema();
  await semer(db, 'editrice@example.com');

  const relance = await semer(db, 'editrice@example.com');
  const autreCasse = await semer(db, 'Editrice@Example.com');

  expect(relance).toBe('deja-en-place');
  expect(autreCasse).toBe('deja-en-place');
  expect(await lireTable(db)).toEqual(['editrice@example.com']);
});

it.each([
  ['vide', ''],
  ['sans arobase', 'editrice.example.com'],
  ['faite d’espaces', '   '],
])('SC-08d — une adresse %s : refusé, rien n’est écrit dans la base', async (_cas, saisie) => {
  const db = await assurerSchema();

  const verdict = await semer(db, saisie);

  expect(verdict).toBe('adresse-mal-formee');
  expect(await lireTable(db)).toEqual([]);
});
