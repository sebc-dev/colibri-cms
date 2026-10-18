/**
 * Ticket 02 du change 013 — le visiteur est confirmé dès que sa demande est gardée dans la liste
 * OU que son e-mail est remis à la plateforme (FR-066, ADR-0028). L'échec n'est annoncé que si
 * aucun des deux n'a abouti. La saisie conservée dans le formulaire se joue côté navigateur : ici,
 * la réponse d'échec ne porte aucune valeur saisie et rien n'est gardé.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes` et la vraie D1 locale. Le refus de la base est un déclencheur
 * `raise(abort)` sur `demandes`, retiré dans un `finally`. Seule la liaison d'expédition
 * (`EXPEDITEUR_CODE_CONNEXION`, ADR-0002) est remplacée par un espion.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach, vi } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const MOTIF_PLATEFORME = 'motif-plateforme-refus-42';
const MOTIF_BASE = 'motif-base-refus-77';
const SAISIES = ['marie@exemple.fr', 'fraise', 'dix-parts'];

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
  all(): Promise<{ results: Record<string, unknown>[] }>;
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
    const adresses = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    const demandes = await import('../../migrations/0013_demandes.sql?raw');
    for (const module of [adresses, demandes]) {
      for (const requete of separerRequetes(module.default)) await db.prepare(requete).run();
    }
  })();
  await schema;
  return db;
}

const messages: MessageRemis[] = [];
let tentatives = 0;
let refuser = false;
let precedente: unknown;
let numeroOrigine = 0;

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
  await db.prepare('delete from demandes').run();
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  vi.restoreAllMocks();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  const db = obtenirDB();
  await db.prepare('drop trigger if exists base_refuse_garde').run();
  await db.prepare('delete from adresses_autorisees').run();
  await db.prepare('delete from demandes').run();
});

/** Le refus de la base : toute insertion dans `demandes` avorte, le déclencheur est toujours retiré. */
async function pendantLeRefusDeLaBase(action: () => Promise<void>): Promise<void> {
  const db = obtenirDB();
  await db
    .prepare(`create trigger if not exists base_refuse_garde before insert on demandes begin select raise(abort, '${MOTIF_BASE}'); end`)
    .run();
  try {
    await action();
  } finally {
    await db.prepare('drop trigger if exists base_refuse_garde').run();
  }
}

function envoyer(): Promise<Response> {
  numeroOrigine += 1;
  const corps = {
    formulaire: 'devis-gateau',
    page: 'contact',
    valeurs: { parfum: ['fraise'], 'nombre-de-parts': ['dix-parts'], courriel: 'marie@exemple.fr' },
    totalAffiche: 4000,
  };
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGINE,
        'CF-Connecting-IP': `198.51.100.${String(numeroOrigine % 250)}`,
      },
      body: JSON.stringify(corps),
    }),
  );
}

async function demandesGardees(): Promise<Record<string, unknown>[]> {
  return (await obtenirDB().prepare('select * from demandes').all()).results;
}

function sortieConsole(espions: { mock: { calls: unknown[][] } }[]): string {
  return espions
    .flatMap((espion) => espion.mock.calls.flat())
    .map((x) => (x instanceof Error ? `${x.name} ${x.message} ${x.stack ?? ''}` : String(x)))
    .join('\n');
}

it('SC-02a — demande gardée, e-mail refusé par la plateforme : le formulaire confirme l’envoi', async () => {
  refuser = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const reponse = await envoyer();

  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ statut: 'envoyee' });
  expect(tentatives).toBe(1);
  expect(messages).toHaveLength(0);
  expect(await demandesGardees()).toHaveLength(1);
});

it('SC-02b — la base refuse de garder, e-mail remis : le formulaire confirme l’envoi', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await pendantLeRefusDeLaBase(async () => {
    const reponse = await envoyer();

    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ statut: 'envoyee' });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.to).toBe(ADRESSE_AUTORISEE);
    expect(await demandesGardees()).toHaveLength(0);
  });
});

it('SC-02c — la base refuse de garder ET l’e-mail est refusé : échec annoncé sans valeur saisie, rien gardé', async () => {
  refuser = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await pendantLeRefusDeLaBase(async () => {
    const reponse = await envoyer();
    const corps = await reponse.text();

    expect(reponse.status).toBe(503);
    expect(JSON.parse(corps)).toEqual({ statut: 'acheminement' });
    for (const saisie of SAISIES) expect(corps).not.toContain(saisie);
    expect(await demandesGardees()).toHaveLength(0);
    expect(messages).toHaveLength(0);
  });
});

it('SC-02d — après un échec, un renvoi gardé et acheminé est confirmé : une seule demande, un seul e-mail', async () => {
  refuser = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await pendantLeRefusDeLaBase(async () => {
    const premiere = await envoyer();
    expect(premiere.status).toBe(503);
  });
  expect(messages).toHaveLength(0);

  refuser = false;
  const seconde = await envoyer();

  expect(seconde.status).toBe(200);
  expect(await seconde.json()).toEqual({ statut: 'envoyee' });
  expect(await demandesGardees()).toHaveLength(1);
  expect(messages).toHaveLength(1);
});

it('SC-02e — aucune adresse autorisée : aucun e-mail, demande gardée, le formulaire confirme l’envoi', async () => {
  await obtenirDB().prepare('delete from adresses_autorisees').run();

  const reponse = await envoyer();

  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ statut: 'envoyee' });
  expect(tentatives).toBe(0);
  expect(messages).toHaveLength(0);
  expect(await demandesGardees()).toHaveLength(1);
});

it('SC-02f — aucune adresse autorisée et la base refuse de garder : aucun e-mail, échec annoncé, rien gardé', async () => {
  await obtenirDB().prepare('delete from adresses_autorisees').run();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await pendantLeRefusDeLaBase(async () => {
    const reponse = await envoyer();
    const corps = await reponse.text();

    expect(reponse.status).toBe(503);
    expect(JSON.parse(corps)).toEqual({ statut: 'acheminement' });
    for (const saisie of SAISIES) expect(corps).not.toContain(saisie);
    expect(tentatives).toBe(0);
    expect(messages).toHaveLength(0);
    expect(await demandesGardees()).toHaveLength(0);
  });
});

it('SC-02g — demande acheminée alors que la base refuse de la garder : ni la base ni les journaux ne portent de valeur saisie', async () => {
  const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((methode) =>
    vi.spyOn(console, methode).mockImplementation(() => undefined),
  );

  await pendantLeRefusDeLaBase(async () => {
    const reponse = await envoyer();
    expect(reponse.status).toBe(200);
  });

  const trace = sortieConsole(espions);
  expect(trace).toContain('[demande] garde refusée (');
  expect(trace).toContain(MOTIF_BASE);
  for (const saisie of [...SAISIES, ADRESSE_AUTORISEE]) expect(trace).not.toContain(saisie);
  expect(JSON.stringify(await demandesGardees())).not.toContain('marie');
  expect(await demandesGardees()).toHaveLength(0);
});
