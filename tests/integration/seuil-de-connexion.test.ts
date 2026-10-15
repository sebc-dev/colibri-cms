/**
 * Ticket 02 — L'écran de connexion refuse une origine au-delà de vingt
 * tentatives par heure, sans retenir aucune adresse IP
 * (openspec/changes/012-envoi-des-demandes-de-devis/tickets/
 * 02-seuil-de-connexion-par-origine.md), ADR-0028.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * de production, dans workerd, contre la vraie D1 locale ; l'origine est
 * posée par l'en-tête `CF-Connecting-IP`. Le temps n'est jamais simulé : la
 * bascule de fenêtre est provoquée en vieillissant la ligne de
 * `fenetre_seuil` dans la vraie base.
 *
 * Contrat posé par ces assertions, faute d'antériorité :
 * - `migrations/0012_seuil_par_origine.sql` crée `fenetre_seuil` (une ligne :
 *   `debut` en millisecondes, `cle` sur 32 octets) et `comptes_seuil`
 *   (`surface`, `empreinte`, `nombre`) ;
 * - `src/platform/frequence/index.ts` exporte
 *   `compterEtJuger(db, surface, origine, maintenant)` qui rend 'traitee' ou
 *   'refusee' ;
 * - l'annonce du seuil est le texte `TEXTE_ANNONCE_SEUIL` ci-dessous, rendu
 *   par l'écran de connexion dans son message d'état ambre.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, vi } from 'vitest';
import { DELAI_PLANCHER_MS } from '../../src/core/auth/regles.ts';
import { compterEtJuger } from '../../src/platform/frequence/index.ts';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const NOM_COOKIE_SESSION = '__Host-session';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const ADRESSE_QUELCONQUE = 'quelquun-dautre@example.com';
const CLE_LIAISON_EXPEDITION = 'EXPEDITEUR_CODE_CONNEXION';
const SEUIL = 20;
/** Code de l'alphabet, déjà en forme canonique : la normalisation le laisse tel quel. */
const CODE_VALIDE = '10203040';
const DEUX_HEURES_MS = 2 * 60 * 60 * 1000;
const DUREE_DE_VIE_CODE_MS = 15 * 60 * 1000;
const DELAI_TEST_MS = 60_000;

const TEXTE_ANNONCE_SEUIL =
  'Trop de tentatives de connexion depuis votre accès à internet. Merci de patienter une heure avant de réessayer.';

const ORIGINE_A = '203.0.113.7';
const ORIGINE_B = '198.51.100.23';
const ORIGINE_IPV6 = '2001:db8:85a3::8a2e:370:7334';

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
  vi.restoreAllMocks();
  Reflect.deleteProperty(env, CLE_LIAISON_EXPEDITION);
  const db = obtenirDB();
  for (const table of ['comptes_seuil', 'fenetre_seuil', 'codes_connexion', 'adresses_autorisees', 'sessions']) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch {
      // Table absente : le schéma n'est pas encore écrit (rouge attendu).
    }
  }
});

async function lignes(db: DBLike, table: string): Promise<Record<string, unknown>[]> {
  return (await db.prepare(`select * from ${table}`).all()).results;
}

async function compter(db: DBLike, table: string): Promise<number> {
  return (await lignes(db, table)).length;
}

function enHex(octets: Uint8Array): string {
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

function enBase64(octets: Uint8Array): string {
  return btoa(String.fromCharCode(...octets));
}

/** Toutes les formes lisibles d'une valeur de colonne : texte, hex et base64 des octets. */
function formesDeLaValeur(valeur: unknown): string[] {
  if (typeof valeur === 'string') return [valeur];
  if (Array.isArray(valeur)) {
    const octets = Uint8Array.from(valeur as number[]);
    return [enHex(octets), enBase64(octets)];
  }
  if (valeur instanceof ArrayBuffer) {
    const octets = new Uint8Array(valeur);
    return [enHex(octets), enBase64(octets)];
  }
  return [];
}

/** Clé et empreintes lisibles dans la base — ce que ni une réponse ni un journal ne doivent contenir. */
async function secretsDeLaBase(db: DBLike): Promise<string[]> {
  const secrets: string[] = [];
  for (const table of ['fenetre_seuil', 'comptes_seuil']) {
    for (const ligne of await lignes(db, table)) {
      for (const [colonne, valeur] of Object.entries(ligne)) {
        if (colonne === 'surface') continue;
        secrets.push(...formesDeLaValeur(valeur));
      }
    }
  }
  return secrets.filter((s) => s.length >= 8);
}

async function sha256Hex(texte: string): Promise<string> {
  return enHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))));
}

interface Expediteur {
  send(message: unknown): Promise<void>;
}

function poserExpediteurEspion(): { appels: unknown[]; premier: Promise<void> } {
  const appels: unknown[] = [];
  let signaler: () => void = () => undefined;
  const premier = new Promise<void>((resolve) => {
    signaler = resolve;
  });
  const expediteur: Expediteur = {
    send(message: unknown): Promise<void> {
      appels.push(message);
      signaler();
      return Promise.resolve();
    },
  };
  (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION] = expediteur;
  return { appels, premier };
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function enTetesDOrigine(origine: string | null): Record<string, string> {
  return origine === null ? {} : { 'cf-connecting-ip': origine };
}

async function obtenirIdentifiantAppareil(): Promise<string> {
  const reponse = await exports.default.fetch(new Request('https://example.com/admin/connexion'));
  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);
  if (!cookie) throw new Error("l'écran de connexion n'a posé aucun identifiant d'appareil");
  return cookie;
}

async function soumettre(
  origine: string | null,
  identifiantAppareil: string,
  champ: 'adresse' | 'code',
  valeur: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request('https://example.com/admin/connexion', {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://example.com',
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
        ...enTetesDOrigine(origine),
      },
      body: `${champ}=${encodeURIComponent(valeur)}`,
    }),
  );
}

/** Épuise le seuil d'une origine : vingt soumissions de code (sans délai plancher). */
async function epuiserLeSeuil(origine: string | null, identifiantAppareil: string): Promise<void> {
  for (let i = 0; i < SEUIL; i += 1) {
    const reponse = await soumettre(origine, identifiantAppareil, 'code', `faux-${String(i)}`);
    expect(await reponse.text()).not.toContain(TEXTE_ANNONCE_SEUIL);
  }
}

async function semerCode(db: DBLike, codeClair: string, identifiantAppareil: string): Promise<void> {
  const sel = 'sel-de-semis-ticket-02';
  const empreinte = await sha256Hex(`${sel}:${codeClair}`);
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into codes_connexion (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, utilise_le, annule_le) values (?1, ?2, ?3, ?4, ?5, 0, null, null)`,
    )
    .bind(identifiantAppareil, empreinte, sel, maintenant, maintenant + DUREE_DE_VIE_CODE_MS)
    .run();
}

/** Texte visible d'un fragment de page : sans scripts ni styles, balises retirées, entités décodées. */
function texteVisibleDe(fragment: string): string {
  return fragment
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replaceAll('<', ' <')
    .replace(/<[^>]*>/g, ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

async function semerAdresse(db: DBLike, adresse: string): Promise<void> {
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(adresse).run();
}

async function vieillirLaFenetre(db: DBLike): Promise<void> {
  await db.prepare(`update fenetre_seuil set debut = debut - ${String(DEUX_HEURES_MS)}`).run();
}

// --- SC-02a — 20 traitées, la 21e refusée et annoncée ---

it(
  'SC-02a — une même origine : 20 soumissions (adresses et codes mêlés) traitées, la 21e refusée et annoncée',
  async () => {
    await assurerSchema();

    // Un appareil neuf à chaque soumission : seule l'origine est commune.
    for (let i = 0; i < SEUIL; i += 1) {
      const appareil = await obtenirIdentifiantAppareil();
      const reponse =
        i % 4 === 0
          ? await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_QUELCONQUE)
          : await soumettre(ORIGINE_A, appareil, 'code', `faux-${String(i)}`);
      expect(await reponse.text()).not.toContain(TEXTE_ANNONCE_SEUIL);
    }

    const appareilNeuf = await obtenirIdentifiantAppareil();
    const vingtEtUnieme = await soumettre(ORIGINE_A, appareilNeuf, 'adresse', ADRESSE_QUELCONQUE);
    expect(await vingtEtUnieme.text()).toContain(TEXTE_ANNONCE_SEUIL);
  },
  DELAI_TEST_MS,
);

it(
  'SC-02a — cas limite : sans adresse d’origine, toutes les soumissions partagent une origine commune et la 21e est refusée',
  async () => {
    await assurerSchema();

    for (let i = 0; i < SEUIL; i += 1) {
      const appareil = await obtenirIdentifiantAppareil();
      const reponse = await soumettre(null, appareil, 'code', `faux-${String(i)}`);
      expect(await reponse.text()).not.toContain(TEXTE_ANNONCE_SEUIL);
    }

    const appareilNeuf = await obtenirIdentifiantAppareil();
    const vingtEtUnieme = await soumettre(null, appareilNeuf, 'code', 'faux');
    expect(await vingtEtUnieme.text()).toContain(TEXTE_ANNONCE_SEUIL);
  },
  DELAI_TEST_MS,
);

it('SC-02a — cas limite : le verdict de la plateforme est traitee jusqu’à 20, refusee au 21e, pour une origine IPv6 comme IPv4', async () => {
  const db = await assurerSchema();

  for (const origine of [ORIGINE_A, ORIGINE_IPV6]) {
    for (let i = 1; i <= SEUIL; i += 1) {
      expect(await compterEtJuger(env.DB, 'connexion', origine, Date.now())).toBe('traitee');
    }
    expect(await compterEtJuger(env.DB, 'connexion', origine, Date.now())).toBe('refusee');
  }
  expect(await compter(db, 'comptes_seuil')).toBe(2);
});

// --- SC-02b — au-delà du seuil, rien n'est écrit, envoyé, consommé ni ouvert ---

it(
  'SC-02b — au-delà du seuil : ni code écrit, ni message envoyé, un code valide ni consommé ni accepté, aucune session',
  async () => {
    const db = await assurerSchema();
    await semerAdresse(db, ADRESSE_AUTORISEE);
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuil(ORIGINE_A, appareil);
    await semerCode(db, CODE_VALIDE, appareil);
    const codesAvant = await compter(db, 'codes_connexion');
    const espion = poserExpediteurEspion();

    const demande = await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_AUTORISEE);
    const saisie = await soumettre(ORIGINE_A, appareil, 'code', CODE_VALIDE);
    await pause(150);

    expect(await demande.text()).toContain(TEXTE_ANNONCE_SEUIL);
    expect(await saisie.text()).toContain(TEXTE_ANNONCE_SEUIL);
    expect(await compter(db, 'codes_connexion')).toBe(codesAvant);
    expect(espion.appels).toHaveLength(0);
    const [code] = await lignes(db, 'codes_connexion');
    expect(code.utilise_le).toBeNull();
    expect(code.essais).toBe(0);
    expect(saisie.status).not.toBe(302);
    expect(extraireCookie(saisie, NOM_COOKIE_SESSION)).toBeNull();
    expect(await compter(db, 'sessions')).toBe(0);
  },
  DELAI_TEST_MS,
);

it(
  'SC-02b — témoin : le même semis, depuis une origine sous le seuil, ouvre bien une session (le code semé est valide)',
  async () => {
    const db = await assurerSchema();
    await semerAdresse(db, ADRESSE_AUTORISEE);
    const appareil = await obtenirIdentifiantAppareil();
    await semerCode(db, CODE_VALIDE, appareil);

    const saisie = await soumettre(ORIGINE_B, appareil, 'code', CODE_VALIDE);

    expect(saisie.status).toBe(302);
    expect(extraireCookie(saisie, NOM_COOKIE_SESSION)).not.toBeNull();
    expect(await compter(db, 'sessions')).toBe(1);
  },
  DELAI_TEST_MS,
);

// --- SC-02c — adresse autorisée et adresse quelconque indiscernables ---

function mediane(valeurs: number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  return triees[Math.floor(triees.length / 2)];
}

it(
  'SC-02c — au-delà du seuil : adresse autorisée et adresse quelconque donnent même texte, mêmes en-têtes, délais indiscernables',
  async () => {
    const db = await assurerSchema();
    await semerAdresse(db, ADRESSE_AUTORISEE);
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuil(ORIGINE_A, appareil);
    poserExpediteurEspion();

    const delaisAutorisee: number[] = [];
    const delaisQuelconque: number[] = [];
    const reponsesAutorisee: Response[] = [];
    const reponsesQuelconque: Response[] = [];
    for (let i = 0; i < 4; i += 1) {
      let debut = Date.now();
      reponsesAutorisee.push(await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_AUTORISEE));
      delaisAutorisee.push(Date.now() - debut);
      debut = Date.now();
      reponsesQuelconque.push(await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_QUELCONQUE));
      delaisQuelconque.push(Date.now() - debut);
    }

    const [derniereAutorisee] = reponsesAutorisee.slice(-1);
    const [derniereQuelconque] = reponsesQuelconque.slice(-1);
    const corpsAutorisee = await derniereAutorisee.text();
    const corpsQuelconque = await derniereQuelconque.text();
    expect(corpsAutorisee).toContain(TEXTE_ANNONCE_SEUIL);
    expect(corpsAutorisee).toBe(corpsQuelconque);
    expect(derniereAutorisee.status).toBe(derniereQuelconque.status);
    expect(entetesTriables(derniereAutorisee)).toEqual(entetesTriables(derniereQuelconque));
    expect(Math.min(...delaisAutorisee, ...delaisQuelconque)).toBeGreaterThanOrEqual(DELAI_PLANCHER_MS);
    expect(Math.abs(mediane(delaisAutorisee) - mediane(delaisQuelconque))).toBeLessThan(100);
  },
  DELAI_TEST_MS,
);

// --- SC-02d — une autre origine se connecte normalement ---

it(
  'SC-02d — une autre origine reçoit normalement un code écrit et envoyé à l’adresse autorisée',
  async () => {
    const db = await assurerSchema();
    await semerAdresse(db, ADRESSE_AUTORISEE);
    const appareilA = await obtenirIdentifiantAppareil();
    await epuiserLeSeuil(ORIGINE_A, appareilA);
    const refusee = await soumettre(ORIGINE_A, appareilA, 'adresse', ADRESSE_AUTORISEE);
    expect(await refusee.text()).toContain(TEXTE_ANNONCE_SEUIL);
    const espion = poserExpediteurEspion();
    // Même appareil que l'origine refusée : seule l'origine change.
    const appareilB = appareilA;

    const reponse = await soumettre(ORIGINE_B, appareilB, 'adresse', ADRESSE_AUTORISEE);
    // L'envoi part après la réponse (waitUntil) : il est attendu par sondage, depuis le
    // contexte du test. Attendre une promesse que la route résout (espion.premier) fait
    // continuer le test dans le contexte de la requête, où lire le corps ou la base cale.
    for (let i = 0; i < 500 && espion.appels.length === 0; i += 1) await pause(10);

    expect(await reponse.text()).not.toContain(TEXTE_ANNONCE_SEUIL);
    const codes = await lignes(db, 'codes_connexion');
    expect(codes).toHaveLength(1);
    expect(codes[0].identifiant_appareil).toBe(appareilB);
    expect(espion.appels).toHaveLength(1);
    expect(JSON.stringify(espion.appels[0])).toContain(ADRESSE_AUTORISEE);
  },
  DELAI_TEST_MS,
);

// --- SC-02e — aucun terme de développeur dans l'annonce (FR-117) ---

it(
  'SC-02e — l’annonce du seuil ne contient aucun terme de développeur',
  async () => {
    await assurerSchema();
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuil(ORIGINE_A, appareil);

    const reponse = await soumettre(ORIGINE_A, appareil, 'code', 'faux');
    const corps = await reponse.text();

    expect(corps).toContain(TEXTE_ANNONCE_SEUIL);
    const principal = /<main\b[\s\S]*?<\/main>/i.exec(corps)?.[0] ?? corps;
    const visible = texteVisibleDe(principal);
    expect(visible).toContain('trop de tentatives de connexion');
    const termes = [
      /\bip\b/i,
      /\bhmac\b/i,
      /\bseuil\b/i,
      /\bquota\b/i,
      /rate.?limit/i,
      /\bhttp/i,
      /\b429\b/,
      /\bserveur\b/i,
      /\bworker\b/i,
      /cloudflare/i,
      /base de donn[ée]es/i,
      /\bcache\b/i,
      /\bsession\b/i,
      /\bempreinte\b/i,
    ];
    for (const terme of termes) {
      expect(visible).not.toMatch(terme);
    }
  },
  DELAI_TEST_MS,
);

// --- SC-02f — aucune adresse IP lisible dans la base ---

it('SC-02f — aucune adresse IP des origines comptées ne figure, sous forme lisible, dans la base', async () => {
  const db = await assurerSchema();
  const origines = [ORIGINE_A, ORIGINE_B, ORIGINE_IPV6];

  for (const origine of origines) {
    await compterEtJuger(env.DB, 'connexion', origine, Date.now());
    await compterEtJuger(env.DB, 'connexion', origine, Date.now());
  }

  const toutesLesLignes = [...(await lignes(db, 'fenetre_seuil')), ...(await lignes(db, 'comptes_seuil'))];
  const formes = toutesLesLignes.flatMap((ligne) => Object.values(ligne).flatMap(formesDeLaValeur));
  const texte = JSON.stringify(toutesLesLignes).toLowerCase() + formes.join('|').toLowerCase();
  for (const origine of origines) {
    const octets = new TextEncoder().encode(origine);
    expect(texte).not.toContain(origine.toLowerCase());
    expect(texte).not.toContain(enHex(octets));
    expect(texte).not.toContain(enBase64(octets).toLowerCase());
    expect(texte).not.toContain(await sha256Hex(origine));
  }
  // Trois origines, deux sollicitations chacune : trois lignes de compte, de nombre 2.
  const comptes = await lignes(db, 'comptes_seuil');
  expect(comptes).toHaveLength(3);
  expect(comptes.map((c) => c.nombre)).toEqual([2, 2, 2]);
});

// --- SC-02g — la bascule efface clé et empreintes de la fenêtre précédente ---

it('SC-02g — à la première sollicitation d’une nouvelle fenêtre, clé et empreintes précédentes disparaissent', async () => {
  const db = await assurerSchema();
  await compterEtJuger(env.DB, 'connexion', ORIGINE_A, Date.now());
  await compterEtJuger(env.DB, 'connexion', ORIGINE_B, Date.now());
  const cleAvant = JSON.stringify((await lignes(db, 'fenetre_seuil'))[0].cle);
  const empreintesAvant = (await lignes(db, 'comptes_seuil')).map((c) => JSON.stringify(c.empreinte));
  expect(empreintesAvant).toHaveLength(2);

  await vieillirLaFenetre(db);
  await compterEtJuger(env.DB, 'connexion', ORIGINE_A, Date.now());

  const fenetres = await lignes(db, 'fenetre_seuil');
  const comptes = await lignes(db, 'comptes_seuil');
  expect(fenetres).toHaveLength(1);
  expect(JSON.stringify(fenetres[0].cle)).not.toBe(cleAvant);
  expect(comptes).toHaveLength(1);
  expect(comptes[0].nombre).toBe(1);
  expect(empreintesAvant).not.toContain(JSON.stringify(comptes[0].empreinte));
});

it(
  'SC-02g — cas limite : après la bascule, l’origine qui avait atteint le seuil est de nouveau traitée',
  async () => {
    const db = await assurerSchema();
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuil(ORIGINE_A, appareil);
    const refusee = await soumettre(ORIGINE_A, appareil, 'code', 'faux');
    expect(await refusee.text()).toContain(TEXTE_ANNONCE_SEUIL);

    await vieillirLaFenetre(db);
    const reprise = await soumettre(ORIGINE_A, appareil, 'code', 'faux');

    expect(await reprise.text()).not.toContain(TEXTE_ANNONCE_SEUIL);
  },
  DELAI_TEST_MS,
);

// --- SC-02h — clés et empreintes distinctes d'une fenêtre à l'autre ---

it('SC-02h — deux fenêtres successives ont des clés différentes et l’empreinte d’une même origine diffère', async () => {
  const db = await assurerSchema();
  await compterEtJuger(env.DB, 'connexion', ORIGINE_A, Date.now());
  const cle1 = JSON.stringify((await lignes(db, 'fenetre_seuil'))[0].cle);
  const empreinte1 = JSON.stringify((await lignes(db, 'comptes_seuil'))[0].empreinte);

  await vieillirLaFenetre(db);
  await compterEtJuger(env.DB, 'connexion', ORIGINE_A, Date.now());
  const cle2 = JSON.stringify((await lignes(db, 'fenetre_seuil'))[0].cle);
  const empreinte2 = JSON.stringify((await lignes(db, 'comptes_seuil'))[0].empreinte);

  expect(cle1).not.toBe(cle2);
  expect(empreinte1).not.toBe(empreinte2);
  // Une clé de 32 octets (tableau d'octets rendu par la base).
  expect(JSON.parse(cle2) as number[]).toHaveLength(32);
});

// --- SC-02i — ni IP, ni clé, ni empreinte dans la réponse ni dans les journaux ---

it(
  'SC-02i — après comptage puis refus, ni IP, ni clé, ni empreinte dans la réponse ni dans les journaux',
  async () => {
    const db = await assurerSchema();
    const journaux = (['log', 'info', 'warn', 'error', 'debug'] as const).map((methode) =>
      vi.spyOn(console, methode).mockImplementation(() => undefined),
    );
    const appareil = await obtenirIdentifiantAppareil();
    await epuiserLeSeuil(ORIGINE_A, appareil);
    const refusee = await soumettre(ORIGINE_A, appareil, 'adresse', ADRESSE_QUELCONQUE);
    const verdict = await compterEtJuger(env.DB, 'connexion', ORIGINE_A, Date.now());

    const secrets = await secretsDeLaBase(db);
    expect(secrets.length).toBeGreaterThan(0);
    const observable = [
      await refusee.text(),
      JSON.stringify(Array.from(refusee.headers.entries())),
      JSON.stringify(verdict),
      JSON.stringify(journaux.flatMap((espion) => espion.mock.calls)),
    ].join('\n');
    expect(verdict).toBe('refusee');
    expect(observable).toContain(TEXTE_ANNONCE_SEUIL);
    for (const secret of [ORIGINE_A, ...secrets]) {
      expect(observable).not.toContain(secret);
    }
  },
  DELAI_TEST_MS,
);
