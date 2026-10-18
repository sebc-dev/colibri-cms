/**
 * Ticket 11 du change 012 — l'acheminement en échec : refus de la plateforme ou adresse autorisée
 * absente. La réponse ne porte aucune donnée du visiteur, la trace de journal ne porte que le motif
 * de la plateforme, et un renvoi qui aboutit expédie un seul e-mail.
 *
 * Ce que le visiteur lit selon le sort de sa demande (gardée dans la liste ou non) relève du
 * change 013 : ces cas n'attendent plus ici un statut de réponse.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes` et la vraie D1 locale. Seule la liaison d'expédition
 * (`EXPEDITEUR_CODE_CONNEXION`, ADR-0002) est remplacée par un espion. L'affichage, le bouton et
 * la saisie conservée se jouent dans `tests/parcours/formulaire-echec.parcours.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach, vi } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const MOTIF_PLATEFORME = 'motif-plateforme-refus-42';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}
interface MessageRemis {
  from: string;
  to: string;
  subject: string;
  text: string;
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

let schema: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schema ??= (async () => {
    const module = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    for (const requete of separerRequetes(module.default)) await db.prepare(requete).run();
  })();
  await schema;
  return db;
}

const messages: MessageRemis[] = [];
let tentatives = 0;
let refuser = false;
let precedente: unknown;

beforeEach(async () => {
  messages.length = 0;
  tentatives = 0;
  refuser = false;
  const enveloppe = env as unknown as Record<string, unknown>;
  precedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      tentatives += 1;
      await Promise.resolve();
      if (refuser) throw new Error(MOTIF_PLATEFORME);
      messages.push(message);
    },
  };
  const db = await assurerSchema();
  await db.prepare('delete from adresses_autorisees').run();
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  vi.restoreAllMocks();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  await obtenirDB().prepare('delete from adresses_autorisees').run();
});

function envoyer(): Promise<Response> {
  const corps = {
    formulaire: 'devis-gateau',
    page: 'contact',
    valeurs: { parfum: ['fraise'], 'nombre-de-parts': ['dix-parts'], courriel: 'marie@exemple.fr' },
    totalAffiche: 4000,
  };
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE },
      body: JSON.stringify(corps),
    }),
  );
}

function sortieConsole(espion: { mock: { calls: unknown[][] } }): string {
  return espion.mock.calls
    .flat()
    .map((x) => (x instanceof Error ? `${x.name} ${x.message} ${x.stack ?? ''}` : String(x)))
    .join('\n');
}

it('SC-11c — la plateforme refuse l’e-mail : une seule tentative, aucune donnée du visiteur renvoyée', async () => {
  refuser = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const reponse = await envoyer();
  const corps = await reponse.text();

  expect(tentatives).toBe(1);
  expect(corps).not.toContain('marie@exemple.fr');
});

it('SC-11c — la trace de journal ne porte que le motif de la plateforme, aucune donnée du visiteur', async () => {
  refuser = true;
  const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await envoyer();

  expect(erreurs).toHaveBeenCalledTimes(1);
  const trace = sortieConsole(erreurs);
  expect(trace).toContain(MOTIF_PLATEFORME);
  expect(trace).not.toContain('marie@exemple.fr');
  expect(trace).not.toContain('fraise');
  expect(trace).not.toContain(ADRESSE_AUTORISEE);
});

it('SC-11e — après un refus, un renvoi qui aboutit est confirmé (200) et un seul e-mail parvient', async () => {
  refuser = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await envoyer();
  expect(messages).toHaveLength(0);

  refuser = false;
  const seconde = await envoyer();

  expect(seconde.status).toBe(200);
  expect(await seconde.json()).toEqual({ statut: 'envoyee' });
  expect(messages).toHaveLength(1);
  expect(messages[0]?.to).toBe(ADRESSE_AUTORISEE);
});

it('SC-11f — aucune adresse autorisée enregistrée : aucun e-mail, aucune donnée du visiteur renvoyée', async () => {
  await obtenirDB().prepare('delete from adresses_autorisees').run();

  const reponse = await envoyer();
  const corps = await reponse.text();

  expect(corps).not.toContain('marie@exemple.fr');
  expect(tentatives).toBe(0);
  expect(messages).toHaveLength(0);
});
