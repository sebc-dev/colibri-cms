/**
 * Ticket 05 (016) — La présentation d'un code de secours compte dans le seuil
 * de connexion (openspec/changes/016-moyen-de-reprise/tickets/
 * 05-le-code-compte-dans-le-seuil.md), ADR-0028, ADR-0032.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * de production, dans workerd, contre la vraie D1 locale ; l'origine est
 * posée par `CF-Connecting-IP`. La panne du compteur est une vraie panne de
 * la D1 (déclencheurs refusant l'écriture de `comptes_seuil`).
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';
import { DELAI_PLANCHER_MS } from '../../src/core/auth/regles.ts';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const NOM_COOKIE_SESSION = '__Host-session';
const ORIGINE = 'https://example.com';
const SEUIL = 20;
const DELAI_TEST_MS = 60_000;
const ORIGINE_A = '203.0.113.7';

const CODE = '0123456789ABCDEFGHJKMNPQRV';
const CODE_FAUX = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZ';

const TEXTE_ANNONCE_SEUIL =
  'Trop de tentatives de connexion depuis votre accès à internet. Merci de patienter une heure avant de réessayer.';
const TEXTE_ANNONCE_PANNE = "La connexion n'a pas pu se faire. Réessayez dans quelques instants.";

interface InstructionLike {
  bind(...valeurs: unknown[]): InstructionLike;
  run(): Promise<unknown>;
  all(): Promise<{ results: Record<string, unknown>[] }>;
}
interface DBLike {
  prepare(requete: string): InstructionLike;
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
    const adresses = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    const seuil = await import('../../migrations/0012_seuil_par_origine.sql?raw');
    const secours = await import('../../migrations/0016_code_de_secours.sql?raw');
    for (const module of [adresses, sessions, seuil, secours]) {
      for (const requete of separerRequetes(module.default)) {
        await db.prepare(requete).run();
      }
    }
    try {
      await db.prepare('alter table sessions add column dernier_usage_le integer').run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const declencheur of ['panne_seuil_insertion', 'panne_seuil_mise_a_jour']) {
    try {
      await db.prepare(`drop trigger if exists ${declencheur}`).run();
    } catch {
      // Table absente : le schéma n'est pas encore écrit.
    }
  }
  for (const table of ['comptes_seuil', 'fenetre_seuil', 'codes_connexion', 'sessions', 'code_de_secours']) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch {
      // Table absente : le schéma n'est pas encore écrit.
    }
  }
});

async function empreinte(code: string): Promise<string> {
  const condense = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(condense), (o) => o.toString(16).padStart(2, '0')).join('');
}

async function mettreCodeEnPlace(db: DBLike): Promise<void> {
  await db
    .prepare('insert into code_de_secours (id, empreinte, cree_le) values (1, ?1, ?2)')
    .bind(await empreinte(CODE), Date.now())
    .run();
}

async function empreinteEnBase(db: DBLike): Promise<string | null> {
  const { results } = await db.prepare('select empreinte from code_de_secours where id = 1').all();
  return results.length === 0 ? null : String(results[0].empreinte);
}

async function nombreDeSessions(db: DBLike): Promise<number> {
  return (await db.prepare('select id from sessions').all()).results.length;
}

function extraireCookie(reponse: Response, nom: string): string | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire] = entete.split(';').map((s) => s.trim());
    const [cle, valeur] = paire.split('=');
    if (cle === nom) return valeur;
  }
  return null;
}

function entetesTriables(reponse: Response): [string, string][] {
  return Array.from(reponse.headers.entries())
    .filter(([cle]) => cle.toLowerCase() !== 'date')
    .sort(([a], [b]) => a.localeCompare(b));
}

async function obtenirIdentifiantAppareil(): Promise<string> {
  const reponse = await exports.default.fetch(new Request(`${ORIGINE}/admin/connexion`));
  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);
  if (!cookie) throw new Error("l'écran de connexion n'a posé aucun identifiant d'appareil");
  return cookie;
}

function poster(chemin: string, origine: string, appareil: string, corps: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${chemin}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: ORIGINE,
        cookie: `${NOM_COOKIE_APPAREIL}=${appareil}`,
        'cf-connecting-ip': origine,
      },
      body: corps,
    }),
  );
}

function soumettreConnexion(origine: string, appareil: string, code: string): Promise<Response> {
  return poster('/admin/connexion', origine, appareil, `code=${encodeURIComponent(code)}`);
}

function presenterSecours(origine: string, appareil: string, code: string): Promise<Response> {
  return poster('/admin/reprise', origine, appareil, `code=${encodeURIComponent(code)}`);
}

/** Épuise le seuil : vingt soumissions mêlées de l'écran de connexion et de celui du code de secours. */
async function epuiserLeSeuilEnMelant(origine: string, appareil: string): Promise<void> {
  for (let i = 0; i < SEUIL; i += 1) {
    const reponse =
      i % 2 === 0
        ? await soumettreConnexion(origine, appareil, `faux-${String(i)}`)
        : await presenterSecours(origine, appareil, CODE_FAUX);
    expect(await reponse.text()).not.toContain(TEXTE_ANNONCE_SEUIL);
  }
}

async function vieillirLaFenetre(db: DBLike): Promise<void> {
  await db.prepare('update fenetre_seuil set debut = debut - 7200000').run();
}

it(
  'SC-05a — vingt soumissions mêlées connexion et code de secours, puis un code de secours : la 21e est refusée et annonce le seuil',
  async () => {
    const db = await assurerSchema();
    await mettreCodeEnPlace(db);
    const appareil = await obtenirIdentifiantAppareil();

    await epuiserLeSeuilEnMelant(ORIGINE_A, appareil);
    const vingtEtUnieme = await presenterSecours(ORIGINE_A, appareil, CODE);

    expect(await vingtEtUnieme.text()).toContain(TEXTE_ANNONCE_SEUIL);
  },
  DELAI_TEST_MS,
);

it(
  'SC-05b — au-delà du seuil, le code en place est présenté : aucune session ; il ouvre encore une session sous le seuil',
  async () => {
    const db = await assurerSchema();
    await mettreCodeEnPlace(db);
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuilEnMelant(ORIGINE_A, appareil);
    const empreinteAvant = await empreinteEnBase(db);

    const refusee = await presenterSecours(ORIGINE_A, appareil, CODE);

    expect(refusee.status).not.toBe(302);
    expect(extraireCookie(refusee, NOM_COOKIE_SESSION)).toBeNull();
    expect(await nombreDeSessions(db)).toBe(0);
    expect(await empreinteEnBase(db)).toBe(empreinteAvant);

    // L'origine revient sous le seuil : la fenêtre est vieillie dans la vraie base.
    await vieillirLaFenetre(db);
    const acceptee = await presenterSecours(ORIGINE_A, appareil, CODE);

    expect(extraireCookie(acceptee, NOM_COOKIE_SESSION)).not.toBeNull();
    expect(await nombreDeSessions(db)).toBe(1);
  },
  DELAI_TEST_MS,
);

it(
  'SC-05c — au-delà du seuil, code en place puis code faux : même texte, mêmes en-têtes, délai plancher pour les deux',
  async () => {
    const db = await assurerSchema();
    await mettreCodeEnPlace(db);
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuilEnMelant(ORIGINE_A, appareil);

    const debutEnPlace = Date.now();
    const enPlace = await presenterSecours(ORIGINE_A, appareil, CODE);
    const corpsEnPlace = await enPlace.text();
    const delaiEnPlace = Date.now() - debutEnPlace;

    const debutFaux = Date.now();
    const faux = await presenterSecours(ORIGINE_A, appareil, CODE_FAUX);
    const corpsFaux = await faux.text();
    const delaiFaux = Date.now() - debutFaux;

    expect(corpsEnPlace).toContain(TEXTE_ANNONCE_SEUIL);
    expect(corpsEnPlace).toBe(corpsFaux);
    expect(enPlace.status).toBe(faux.status);
    expect(entetesTriables(enPlace)).toEqual(entetesTriables(faux));
    expect(delaiEnPlace).toBeGreaterThanOrEqual(DELAI_PLANCHER_MS);
    expect(delaiFaux).toBeGreaterThanOrEqual(DELAI_PLANCHER_MS);
  },
  DELAI_TEST_MS,
);

it(
  "SC-05d — la base refuse de compter : aucune session, code en place intact, l'écran annonce la panne sans parler du seuil",
  async () => {
    const db = await assurerSchema();
    await mettreCodeEnPlace(db);
    const appareil = await obtenirIdentifiantAppareil();
    const empreinteAvant = await empreinteEnBase(db);
    await db
      .prepare(
        "create trigger if not exists panne_seuil_insertion before insert on comptes_seuil begin select raise(abort, 'panne'); end",
      )
      .run();
    await db
      .prepare(
        "create trigger if not exists panne_seuil_mise_a_jour before update on comptes_seuil begin select raise(abort, 'panne'); end",
      )
      .run();

    const debut = Date.now();
    const reponse = await presenterSecours(ORIGINE_A, appareil, CODE);
    // Astro échappe l'apostrophe du texte interpolé : décoder avant de comparer.
    const corps = (await reponse.text()).replaceAll('&#39;', "'");
    const delai = Date.now() - debut;

    expect(corps).toContain(TEXTE_ANNONCE_PANNE);
    expect(corps).not.toContain(TEXTE_ANNONCE_SEUIL);
    expect(extraireCookie(reponse, NOM_COOKIE_SESSION)).toBeNull();
    expect(await nombreDeSessions(db)).toBe(0);
    expect(await empreinteEnBase(db)).toBe(empreinteAvant);
    expect(delai).toBeGreaterThanOrEqual(DELAI_PLANCHER_MS);
  },
  DELAI_TEST_MS,
);
