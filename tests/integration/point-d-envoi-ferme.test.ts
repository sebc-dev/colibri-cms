/**
 * Ticket 10 du change 012 — le point d'envoi refuse ce qui ne vient pas du site (FR-097, FR-061, I6).
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes`. Seule la liaison d'expédition est espionnée : un refus n'envoie rien.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
let precedente: unknown;

beforeEach(async () => {
  messages.length = 0;
  const enveloppe = env as unknown as Record<string, unknown>;
  precedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      await Promise.resolve();
      messages.push(message);
    },
  };
  const db = await assurerSchema();
  await db.prepare('delete from adresses_autorisees').run();
  await db
    .prepare(
      'create table if not exists comptes_seuil (surface text not null, empreinte blob not null, nombre integer not null, primary key (surface, empreinte))',
    )
    .run();
  await db.prepare('delete from comptes_seuil').run();
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  await obtenirDB().prepare('delete from adresses_autorisees').run();
});

const CORPS_UTILE = {
  formulaire: 'devis-gateau',
  page: 'contact',
  valeurs: {
    parfum: ['fraise'],
    'nombre-de-parts': ['dix-parts'],
    occasion: ['anniversaire'],
    nom: 'Marie Dupont',
    courriel: 'marie@exemple.fr',
  },
  totalAffiche: 4000,
};
const TAILLE_DEMANDE = 16 * 1024;

function poster(corps: BodyInit, entetes: Record<string, string>): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, { method: 'POST', headers: entetes, body: corps }),
  );
}

function expectRefusSansRien(reponse: Response, statut: number): void {
  expect(reponse.status).toBe(statut);
  expect(reponse.headers.get('set-cookie')).toBeNull();
  expect(messages).toHaveLength(0);
}

it('SC-10a — une origine qui n’est pas celle du site est refusée (403), sans e-mail', async () => {
  const json = JSON.stringify(CORPS_UTILE);
  for (const origine of ['https://pirate.example.net', 'http://example.com', 'https://autre.example.com']) {
    const reponse = await poster(json, { 'Content-Type': 'application/json', Origin: origine });
    expectRefusSansRien(reponse, 403);
    expect(await reponse.text()).not.toContain('Marie');
  }
});

it('SC-10a — sans en-tête Origin, la demande est refusée (403), sans e-mail', async () => {
  const reponse = await poster(JSON.stringify(CORPS_UTILE), { 'Content-Type': 'application/json' });
  expectRefusSansRien(reponse, 403);
});

it('une autre méthode que POST est refusée (405), sans e-mail', async () => {
  for (const methode of ['GET', 'PUT', 'DELETE']) {
    const init: RequestInit = { method: methode, headers: { Origin: ORIGINE, 'Content-Type': 'application/json' } };
    if (methode !== 'GET') init.body = JSON.stringify(CORPS_UTILE);
    const reponse = await exports.default.fetch(new Request(`${ORIGINE}/api/public/demandes`, init));
    expectRefusSansRien(reponse, 405);
    expect(reponse.headers.get('allow')).toBe('POST');
    expect(await reponse.text()).not.toContain('Marie');
  }
});

it('SC-10b — un formulaire à pièces jointes est refusé (415) sans e-mail', async () => {
  const frontiere = 'frontiere-de-test';
  const multipart =
    `--${frontiere}\r\nContent-Disposition: form-data; name="nom"\r\n\r\nMarie Dupont\r\n--${frontiere}--\r\n`;
  const reponse = await poster(multipart, {
    'Content-Type': `multipart/form-data; boundary=${frontiere}`,
    Origin: ORIGINE,
  });
  expectRefusSansRien(reponse, 415);
});

it('SC-10b — un corps qui n’est pas du JSON (texte brut) est refusé (415) sans e-mail', async () => {
  const reponse = await poster(JSON.stringify(CORPS_UTILE), { 'Content-Type': 'text/plain', Origin: ORIGINE });
  expectRefusSansRien(reponse, 415);
});

it('SC-10b — un formulaire à pièces jointes au corps sans fin est refusé (415) sans être lu, sans e-mail', async () => {
  // Le corps ne se termine jamais : une route qui le lirait n'aurait jamais de réponse à rendre.
  let premier = true;
  const flux = new ReadableStream<Uint8Array>({
    async pull(controleur) {
      if (premier) {
        premier = false;
        controleur.enqueue(
          new TextEncoder().encode('--frontiere\r\nContent-Disposition: form-data; name="nom"\r\n\r\nMarie'),
        );
        return;
      }
      await new Promise<void>(() => undefined);
    },
  });
  const envoi = exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=frontiere', Origin: ORIGINE },
      body: flux,
      duplex: 'half',
    } as RequestInit),
  );
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_resoudre, rejeter) => {
    minuterie = setTimeout(() => {
      rejeter(new Error('aucune réponse en 3 s : la route attend la fin du corps'));
    }, 3000);
  });
  try {
    const reponse = await Promise.race([envoi, delai]);
    expectRefusSansRien(reponse, 415);
  } finally {
    clearTimeout(minuterie);
  }
});

it('SC-10c — un corps de 16 Kio + 1 octet est refusé (413) sans e-mail', async () => {
  const base = JSON.stringify({ ...CORPS_UTILE, remplissage: '' });
  const corps = JSON.stringify({ ...CORPS_UTILE, remplissage: 'x'.repeat(TAILLE_DEMANDE + 1 - base.length) });
  expect(new TextEncoder().encode(corps).byteLength).toBe(TAILLE_DEMANDE + 1);
  const reponse = await poster(corps, { 'Content-Type': 'application/json', Origin: ORIGINE });
  expectRefusSansRien(reponse, 413);
});

it('SC-10c — un corps de 16 Kio exactement est accepté, et l’e-mail part', async () => {
  const base = JSON.stringify({ ...CORPS_UTILE, remplissage: '' });
  const corps = JSON.stringify({ ...CORPS_UTILE, remplissage: 'x'.repeat(TAILLE_DEMANDE - base.length) });
  expect(new TextEncoder().encode(corps).byteLength).toBe(TAILLE_DEMANDE);
  const reponse = await poster(corps, { 'Content-Type': 'application/json', Origin: ORIGINE });
  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ statut: 'envoyee' });
  expect(messages).toHaveLength(1);
});

it('SC-10c — un corps très grand, sans taille annoncée, est refusé (413) sans e-mail', async () => {
  const morceau = new TextEncoder().encode('x'.repeat(1024));
  let envoyes = 0;
  const flux = new ReadableStream<Uint8Array>({
    pull(controleur) {
      envoyes += 1;
      if (envoyes > 40) controleur.close();
      else controleur.enqueue(morceau);
    },
  });
  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE },
      body: flux,
      duplex: 'half',
    } as RequestInit),
  );
  expectRefusSansRien(reponse, 413);
});

it('un JSON invalide est refusé (400), sans e-mail', async () => {
  const reponse = await poster('{"formulaire":', { 'Content-Type': 'application/json', Origin: ORIGINE });
  expectRefusSansRien(reponse, 400);
  expect(await reponse.json()).toEqual({ statut: 'refusee' });
});
