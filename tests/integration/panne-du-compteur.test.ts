/**
 * Ticket 13 du change 012 — une panne du compteur se dit comme un échec passager, pas comme un
 * seuil atteint (ADR-0028). La protection ne s'ouvre pas sur une panne : le refus demeure, mais il
 * ne se présente plus comme un seuil.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre la vraie D1
 * locale. La panne est provoquée par des déclencheurs `raise(abort)` sur `comptes_seuil`, retirés
 * dans un `finally`. L'origine est posée par l'en-tête `CF-Connecting-IP`. L'affichage du message
 * du formulaire se joue dans `tests/parcours/formulaire-panne.parcours.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach, vi } from 'vitest';
import { DELAI_PLANCHER_MS } from '../../src/core/auth/regles.ts';
import { compterEtJuger } from '../../src/platform/frequence/index.ts';

const ORIGINE_SITE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const ADRESSE_QUELCONQUE = 'quelquun-dautre@example.com';
const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const NOM_COOKIE_SESSION = '__Host-session';
const CODE_VALIDE = '10203040';
const DUREE_DE_VIE_CODE_MS = 15 * 60 * 1000;
const DELAI_TEST_MS = 60_000;
const ORIGINE_A = '203.0.113.7';
const TEXTE_ANNONCE_SEUIL_CONNEXION =
  'Trop de tentatives de connexion depuis votre accès à internet. Merci de patienter une heure avant de réessayer.';
const TEXTE_ANNONCE_PANNE_CONNEXION =
  "La connexion n'a pas pu se faire. Réessayez dans quelques instants.";
const TABLES = ['comptes_seuil', 'fenetre_seuil', 'codes_connexion', 'adresses_autorisees', 'sessions'];

interface DBLike {
  prepare(requete: string): {
    bind(...valeurs: unknown[]): { run(): Promise<unknown> };
    run(): Promise<unknown>;
    all(): Promise<{ results: Record<string, unknown>[] }>;
  };
}
interface MessageRemis {
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
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    const seuil = await import('../../migrations/0012_seuil_par_origine.sql?raw');
    for (const module of [adresses, sessions, seuil]) {
      for (const requete of separerRequetes(module.default)) await db.prepare(requete).run();
    }
  })();
  await schema;
  return db;
}

const messages: MessageRemis[] = [];
let precedente: unknown;

async function viderLesTables(db: DBLike): Promise<void> {
  for (const table of TABLES) await db.prepare(`delete from ${table}`).run();
}

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
  await viderLesTables(db);
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  vi.restoreAllMocks();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  await viderLesTables(obtenirDB());
});

/** Provoque la panne du compteur, joue `action`, puis retire toujours les déclencheurs. */
async function pendantLaPanne(db: DBLike, action: () => Promise<void>): Promise<void> {
  await db
    .prepare(
      "create trigger if not exists panne_compteur_insertion before insert on comptes_seuil begin select raise(abort, 'panne'); end",
    )
    .run();
  await db
    .prepare(
      "create trigger if not exists panne_compteur_maj before update on comptes_seuil begin select raise(abort, 'panne'); end",
    )
    .run();
  try {
    await action();
  } finally {
    await db.prepare('drop trigger if exists panne_compteur_insertion').run();
    await db.prepare('drop trigger if exists panne_compteur_maj').run();
  }
}

function silencerLesTraces(): void {
  for (const methode of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, methode).mockImplementation(() => undefined);
  }
}

const COMPLETE: Record<string, unknown> = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  courriel: 'marie@exemple.fr',
};

function envoyer(origine: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE_SITE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE_SITE, 'CF-Connecting-IP': origine },
      body: JSON.stringify({ formulaire: 'devis-gateau', page: 'contact', valeurs: COMPLETE, totalAffiche: 4000 }),
    }),
  );
}

function extraireCookie(reponse: Response, nom: string): string | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [cle, valeur] = entete.split(';')[0].trim().split('=');
    if (cle === nom) return valeur;
  }
  return null;
}

async function obtenirIdentifiantAppareil(): Promise<string> {
  const reponse = await exports.default.fetch(new Request(`${ORIGINE_SITE}/admin/connexion`));
  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);
  if (!cookie) throw new Error("l'écran de connexion n'a posé aucun identifiant d'appareil");
  return cookie;
}

function soumettre(
  origine: string,
  identifiantAppareil: string,
  champ: 'adresse' | 'code',
  valeur: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE_SITE}/admin/connexion`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: ORIGINE_SITE,
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
        'cf-connecting-ip': origine,
      },
      body: `${champ}=${encodeURIComponent(valeur)}`,
    }),
  );
}

async function sha256Hex(texte: string): Promise<string> {
  const octets = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)));
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

async function semerCode(db: DBLike, codeClair: string, identifiantAppareil: string): Promise<void> {
  const sel = 'sel-de-semis-ticket-13';
  const empreinte = await sha256Hex(`${sel}:${codeClair}`);
  const maintenant = Date.now();
  await db
    .prepare(
      'insert into codes_connexion (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, utilise_le, annule_le) values (?1, ?2, ?3, ?4, ?5, 0, null, null)',
    )
    .bind(identifiantAppareil, empreinte, sel, maintenant, maintenant + DUREE_DE_VIE_CODE_MS)
    .run();
}

async function lignes(db: DBLike, table: string): Promise<Record<string, unknown>[]> {
  return (await db.prepare(`select * from ${table}`).all()).results;
}

/** Le HTML rendu, entités d'apostrophe décodées : les textes se comparent tels que l'éditrice les lit. */
function lu(html: string): string {
  return html.replaceAll('&#39;', "'").replaceAll('&apos;', "'");
}

function entetesTriables(reponse: Response): [string, string][] {
  return Array.from(reponse.headers.entries())
    .filter(([cle]) => cle.toLowerCase() !== 'date')
    .sort(([a], [b]) => a.localeCompare(b));
}

it(
  'SC-13a — la base refuse de compter : le verdict est « indisponible » (jamais « refusée ») et le point d’envoi répond 503 « indisponible », pas 429',
  async () => {
    const db = await assurerSchema();
    silencerLesTraces();

    await pendantLaPanne(db, async () => {
      const verdict = await compterEtJuger(env.DB, 'demande', ORIGINE_A, Date.now());
      const reponse = await envoyer(ORIGINE_A);
      const corps = await reponse.text();

      expect(verdict).toBe('indisponible');
      expect(reponse.status).toBe(503);
      expect(JSON.parse(corps)).toEqual({ statut: 'indisponible' });
      expect(corps).not.toContain('seuil');
      expect(corps).not.toContain(ORIGINE_A);
    });
  },
  DELAI_TEST_MS,
);

it(
  'SC-13a — cas limite : la panne est dite avant même le contrôle de l’origine et du corps de la requête',
  async () => {
    const db = await assurerSchema();
    silencerLesTraces();

    await pendantLaPanne(db, async () => {
      const reponse = await exports.default.fetch(
        new Request(`${ORIGINE_SITE}/api/public/demandes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://autre.example', 'CF-Connecting-IP': ORIGINE_A },
          body: 'pas du json',
        }),
      );

      expect(reponse.status).toBe(503);
      expect(JSON.parse(await reponse.text())).toEqual({ statut: 'indisponible' });
    });
  },
  DELAI_TEST_MS,
);

it(
  'SC-13b — demande complète et base qui refuse de compter : 503 « indisponible », aucun e-mail envoyé, aucune demande retenue',
  async () => {
    const db = await assurerSchema();
    silencerLesTraces();

    await pendantLaPanne(db, async () => {
      const reponse = await envoyer(ORIGINE_A);
      const corps = await reponse.text();

      expect(reponse.status).toBe(503);
      expect(JSON.parse(corps)).toEqual({ statut: 'indisponible' });
      expect(messages).toHaveLength(0);
      expect(reponse.headers.getSetCookie()).toHaveLength(0);
    });
  },
  DELAI_TEST_MS,
);

it(
  'SC-13c — base qui refuse de compter : ni code écrit, ni message, ni session, code valide ni consommé ni accepté, panne annoncée sans seuil',
  async () => {
    const db = await assurerSchema();
    const appareil = await obtenirIdentifiantAppareil();
    await semerCode(db, CODE_VALIDE, appareil);
    silencerLesTraces();
    const expediteur = vi.fn(() => Promise.resolve());
    (env as unknown as Record<string, unknown>)[CLE_LIAISON] = { send: expediteur };

    await pendantLaPanne(db, async () => {
      const parAdresse = await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_AUTORISEE);
      const parCode = await soumettre(ORIGINE_A, appareil, 'code', CODE_VALIDE);
      await new Promise((resoudre) => setTimeout(resoudre, 150));
      const texteAdresse = lu(await parAdresse.text());
      const texteCode = lu(await parCode.text());

      for (const texte of [texteAdresse, texteCode]) {
        expect(texte).toContain(TEXTE_ANNONCE_PANNE_CONNEXION);
        expect(texte).not.toContain(TEXTE_ANNONCE_SEUIL_CONNEXION);
      }
      const codes = await lignes(db, 'codes_connexion');
      expect(codes).toHaveLength(1);
      expect(codes[0].utilise_le).toBeNull();
      expect(codes[0].essais).toBe(0);
      expect(expediteur).not.toHaveBeenCalled();
      expect(await lignes(db, 'sessions')).toHaveLength(0);
      for (const reponse of [parAdresse, parCode]) {
        expect(reponse.status).not.toBe(302);
        expect(extraireCookie(reponse, NOM_COOKIE_SESSION)).toBeNull();
      }
    });
  },
  DELAI_TEST_MS,
);

it(
  'SC-13d — base qui refuse de compter : adresse autorisée et adresse quelconque, même texte, mêmes en-têtes, toutes deux au délai plancher',
  async () => {
    const db = await assurerSchema();
    const appareil = await obtenirIdentifiantAppareil();
    silencerLesTraces();

    await pendantLaPanne(db, async () => {
      const debutAutorisee = Date.now();
      const autorisee = await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_AUTORISEE);
      const delaiAutorisee = Date.now() - debutAutorisee;
      const debutQuelconque = Date.now();
      const quelconque = await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_QUELCONQUE);
      const delaiQuelconque = Date.now() - debutQuelconque;

      const corpsAutorisee = lu(await autorisee.text());
      expect(corpsAutorisee).toContain(TEXTE_ANNONCE_PANNE_CONNEXION);
      expect(corpsAutorisee).toBe(lu(await quelconque.text()));
      expect(autorisee.status).toBe(quelconque.status);
      expect(entetesTriables(autorisee)).toEqual(entetesTriables(quelconque));
      expect(delaiAutorisee).toBeGreaterThanOrEqual(DELAI_PLANCHER_MS);
      expect(delaiQuelconque).toBeGreaterThanOrEqual(DELAI_PLANCHER_MS);
    });
  },
  DELAI_TEST_MS,
);
