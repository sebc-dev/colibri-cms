/**
 * Ticket 07 — Chaque refus de code dit quel geste reprendre
 * (specs/001-connexion-par-code/07-refus-de-code.md).
 *
 * Couture retenue (héritée des tickets 03-06, SPEC.md § Décisions de test,
 * ADR-0003) : requête HTTP réelle via `SELF.fetch` contre le worker compilé,
 * dans workerd, contre la vraie D1 locale — jamais de double interne. La
 * migration `migrations/0002_adresses_autorisees_et_codes_connexion.sql`
 * porte déjà les colonnes qu'exige ce ticket (`essais`, `annule_le`) ; ce
 * fichier ne la réécrit pas, il la rejoue et sème directement des lignes de
 * `codes_connexion` (code brûlé, code annulé, code d'un autre appareil) pour
 * construire des situations qu'une vraie campagne de requêtes rendrait lente
 * et fragile à faire tenir dans quinze minutes réelles.
 *
 * **Rien n'implémente encore ce ticket** (arbre à ce ticket, cf. brief) :
 * `src/core/auth/verdict.ts` rend déjà les cinq raisons de refus héritées du
 * ticket 06 (`introuvable`, `deja-utilise`, `annule`, `expire`,
 * `mauvais-appareil`), mais rien ne distingue encore une saisie fautive
 * ordinaire d'un code brûlé à la cinquième ; la colonne `essais` n'est
 * incrémentée nulle part et `annule_le` n'est jamais écrit ;
 * `src/admin/textes.ts` n'existe pas ; et `src/pages/admin/connexion.astro`
 * réaffiche aujourd'hui le même écran, sans varier son texte selon la
 * raison du refus. Chaque test qui touche ce comportement est donc censé
 * échouer aujourd'hui — c'est le rouge attendu du mode `test`.
 *
 * **Contrat supposé, faute d'antériorité.** Rien ne nomme encore le texte de
 * chacun des trois gestes : ce fichier fixe, par ses assertions, le contrat
 * que l'implémentation doit remplir (nommage French, cohérent avec le
 * domaine, aucun terme de développeur) — une sous-chaîne pour chaque geste,
 * assez générique pour ne pas figer toute la phrase, assez spécifique pour
 * distinguer les trois gestes entre eux :
 *  - retaper : « retapez-le » ;
 *  - demander un nouveau code : « demandez un nouveau code » ;
 *  - revenir sur l'appareil demandeur : « revenez sur l'appareil » ;
 *  - l'annonce de portée de l'écran de saisie (c6) : les mots « dernier
 *    code » et « cet appareil » doivent tous deux y paraître.
 * Une future réécriture de ces phrases par l'implémenteur est un signal à
 * faire remonter, pas une raison d'affaiblir ces assertions en aval.
 *
 * **L'empreinte salée est rejouée ici, jamais importée** (comme au ticket
 * 06) : `src/platform/auth/magasin.ts` n'exporte pas sa fonction de hachage.
 * Ce fichier réplique l'algorithme documenté (SHA-256 de `${sel}:${code}`,
 * hex) pour semer une ligne dont l'empreinte correspond à un code en clair
 * connu du test.
 *
 * **Les codes clairs semés ici sont composés uniquement de chiffres** —
 * volontairement, pour rester en dehors de tout signe que
 * `src/core/auth/code.ts` (`normaliserCode`) réécrit (les confusables I, L,
 * O, U n'existent que parmi les lettres) : un code semé et soumis à
 * l'identique doit rester reconnu bit à bit, sans qu'une normalisation de la
 * saisie n'entre en jeu — hors-propos de ce ticket (déjà couvert au ticket
 * 06, c3).
 *
 * **Les délais longs se jugent à instant injecté** (SPEC.md § Décisions de
 * test) : une ligne expirée est semée avec un `creee_le`/`expire_le` situés
 * dans le passé, jamais obtenue en attendant réellement.
 *
 * **Un espion posé sur la liaison d'environnement seule**, comme aux
 * tickets 03-06 (mutation de `env` via `cloudflare:test`), pour les deux
 * tests (c4a/c4b) qui déclenchent une nouvelle demande de code — la seule
 * dépendance hors-process de cette route (`send_email`, ADR-0002), jamais un
 * double interne.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const NOM_COOKIE_SESSION = '__Host-session'; // Contrat posé au ticket 06.
const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const DUREE_DE_VIE_CODE_MS = 15 * 60 * 1000; // ADR-0001.

const PATH_ACCUEIL_RE = /^\/admin\/?$/;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

const CLE_LIAISON_EXPEDITION = 'EXPEDITEUR_CODE_CONNEXION';

// --- Contrat supposé des trois gestes (voir en-tête de fichier) ---
const GESTE_RETAPER = 'retapez-le';
const GESTE_REDEMANDER = 'demandez un nouveau code';
const GESTE_CHANGER_APPAREIL = "revenez sur l'appareil";

interface DBLike {
  exec(query: string): Promise<unknown>;
  prepare(query: string): {
    bind(...valeurs: unknown[]): { run(): Promise<unknown> };
    run(): Promise<unknown>;
    all<T = unknown>(): Promise<{ results: T[] }>;
  };
}

function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let migrationAppliquee: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  if (!migrationAppliquee) {
    migrationAppliquee = (async () => {
      const module = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
      for (const requete of separerRequetes(module.default)) {
        await db.prepare(requete).run();
      }
    })();
  }
  await migrationAppliquee;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  try {
    await db.prepare(`delete from ${TABLE_CODES}`).run();
    await db.prepare(`delete from ${TABLE_ADRESSES}`).run();
  } catch (erreur) {
    console.warn('nettoyage D1 ignoré (schéma absent, rouge attendu) :', erreur);
  }
  delete (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION];
});

function poserExpediteurEspionInerte(): unknown {
  const enveloppe = env as unknown as Record<string, unknown>;
  const precedent = enveloppe[CLE_LIAISON_EXPEDITION];
  enveloppe[CLE_LIAISON_EXPEDITION] = { send: async () => {} };
  return precedent;
}

function restaurerLiaisonExpedition(precedent: unknown): void {
  (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION] = precedent;
}

async function semerAdresseAutorisee(db: DBLike, adresse: string): Promise<void> {
  await db
    .prepare(`insert into ${TABLE_ADRESSES} (adresse) values (?1)`)
    .bind(adresse)
    .run();
}

function octetsVersHex(octets: Uint8Array): string {
  return Array.from(octets)
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Réplique de l'algorithme d'empreinte de `src/platform/auth/magasin.ts`
 * (SHA-256 salé, hex) — voir « L'empreinte salée est rejouée ici » en tête
 * de fichier.
 */
async function empreinteSalee(sel: string, codeClair: string): Promise<string> {
  const donnees = new TextEncoder().encode(`${sel}:${codeClair}`);
  const digest = await crypto.subtle.digest('SHA-256', donnees);
  return octetsVersHex(new Uint8Array(digest));
}

/**
 * Sème directement une ligne de `codes_connexion` dont l'empreinte
 * correspond à `codeClair` — permet de construire, sans dépendre du
 * brûlage ni de l'annulation (comportements encore absents, ticket 07), une
 * ligne déjà brûlée (`essais`), déjà utilisée (`utiliseLe`), annulée
 * (`annuleLe`) ou expirée (`creeeLe`/`expireLe` dans le passé).
 */
async function semerLigneDeCode(
  db: DBLike,
  options: {
    codeClair: string;
    identifiantAppareil: string;
    creeeLe?: number;
    expireLe?: number;
    essais?: number;
    utiliseLe?: number | null;
    annuleLe?: number | null;
  },
): Promise<void> {
  const sel = 'sel-de-semis-ticket-07';
  const empreinte = await empreinteSalee(sel, options.codeClair);
  const creeeLe = options.creeeLe ?? Date.now();
  const expireLe = options.expireLe ?? creeeLe + DUREE_DE_VIE_CODE_MS;
  await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, utilise_le, annule_le) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      options.identifiantAppareil,
      empreinte,
      sel,
      creeeLe,
      expireLe,
      options.essais ?? 0,
      options.utiliseLe ?? null,
      options.annuleLe ?? null,
    )
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

async function afficherEcranDeConnexion(cookieExistant?: string): Promise<Response> {
  return SELF.fetch('https://example.com/admin/connexion', {
    headers: cookieExistant ? { cookie: `${NOM_COOKIE_APPAREIL}=${cookieExistant}` } : {},
  });
}

async function obtenirIdentifiantAppareil(): Promise<string> {
  const reponse = await afficherEcranDeConnexion();
  const cookie = extraireCookieValeur(reponse, NOM_COOKIE_APPAREIL);
  if (!cookie) {
    throw new Error(
      `l'écran de connexion n'a posé aucun cookie « ${NOM_COOKIE_APPAREIL} » — impossible d'obtenir un identifiant d'appareil pour préparer ce test`,
    );
  }
  return cookie;
}

async function soumettreCode(saisie: string, identifiantAppareil: string): Promise<Response> {
  return SELF.fetch('https://example.com/admin/connexion', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://example.com',
      cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
    },
    body: `code=${encodeURIComponent(saisie)}`,
  });
}

async function soumettreAdresse(adresse: string, identifiantAppareil: string): Promise<Response> {
  return SELF.fetch('https://example.com/admin/connexion', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://example.com',
      cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
    },
    body: `adresse=${encodeURIComponent(adresse)}`,
  });
}

function cheminDeLocation(reponse: Response): string | null {
  const location = reponse.headers.get('location');
  if (!location) return null;
  return new URL(location, 'https://example.com').pathname;
}

// --- c1 — une saisie fautive, sur un code actif non brûlé, invite à retaper ---

it('une saisie fautive sur un code actif non brûlé invite à retaper, sans ouvrir de session', async () => {
  const db = await assurerSchema();
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: '10203040', identifiantAppareil, essais: 0 });

  const reponse = await soumettreCode('99999999', identifiantAppareil);

  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toContain(GESTE_RETAPER);
  expect(corps).not.toContain(GESTE_REDEMANDER);
});

// --- c2 — la cinquième saisie fautive brûle le code actif de l'appareil ---

it('la cinquième saisie fautive sur un code actif le brûle : invite à demander un nouveau code, jamais aucune session ensuite', async () => {
  const db = await assurerSchema();
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  // Quatre saisies fautives déjà comptées contre la ligne active : la
  // cinquième, soumise ci-dessous, doit la brûler.
  await semerLigneDeCode(db, { codeClair: '20304050', identifiantAppareil, essais: 4 });

  const reponseCinquiemeEssai = await soumettreCode('88888888', identifiantAppareil);

  expect(extraireCookieValeur(reponseCinquiemeEssai, NOM_COOKIE_SESSION)).toBeNull();
  const corps = (await reponseCinquiemeEssai.text()).toLowerCase();
  expect(corps).toContain(GESTE_REDEMANDER);
  expect(corps).not.toContain(GESTE_RETAPER);

  // Le code brûlé reste inutilisable pour toute présentation ultérieure —
  // même présenté correctement.
  const reponseCodeCorrectApresBrulage = await soumettreCode('20304050', identifiantAppareil);
  expect(extraireCookieValeur(reponseCodeCorrectApresBrulage, NOM_COOKIE_SESSION)).toBeNull();
});

// --- c3 — un code valide présenté depuis un appareil qui ne l'a jamais demandé ---

it('un code valide présenté depuis un appareil qui ne l’a jamais demandé invite à revenir sur l’appareil demandeur, jamais à en redemander un', async () => {
  const db = await assurerSchema();
  const identifiantAppareilDemandeur = await obtenirIdentifiantAppareil();
  const identifiantAutreAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: '30405060', identifiantAppareil: identifiantAppareilDemandeur });

  const reponse = await soumettreCode('30405060', identifiantAutreAppareil);

  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toContain(GESTE_CHANGER_APPAREIL);
  expect(corps).not.toContain(GESTE_REDEMANDER);
});

// --- c4a — une nouvelle demande depuis le même appareil annule le code précédent de cet appareil ---

it('une nouvelle demande depuis le même appareil rend inutilisable le code précédent de cet appareil', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: '40506070', identifiantAppareil });
  const precedent = poserExpediteurEspionInerte();

  try {
    await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  const reponse = await soumettreCode('40506070', identifiantAppareil);
  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
});

// --- c4b — un code demandé depuis un autre appareil n'est pas affecté par une nouvelle demande ---

it('un code demandé depuis un autre appareil n’est pas affecté par une nouvelle demande, et reste utilisable', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareilA = await obtenirIdentifiantAppareil();
  const identifiantAppareilB = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: '50607080', identifiantAppareil: identifiantAppareilB });
  const precedent = poserExpediteurEspionInerte();

  try {
    // Nouvelle demande depuis l'appareil A — ne doit rien annuler pour B.
    await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilA);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  const reponse = await soumettreCode('50607080', identifiantAppareilB);
  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).not.toBeNull();
});

// --- c5 — un code expiré invite à demander un nouveau code, jamais à changer d'appareil ---

it('un code expiré invite à demander un nouveau code, jamais à revenir sur un autre appareil', async () => {
  const db = await assurerSchema();
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const ilYALongtemps = Date.now() - DUREE_DE_VIE_CODE_MS - 60_000;
  await semerLigneDeCode(db, {
    codeClair: '60708090',
    identifiantAppareil,
    creeeLe: ilYALongtemps,
    expireLe: ilYALongtemps + DUREE_DE_VIE_CODE_MS,
  });

  const reponse = await soumettreCode('60708090', identifiantAppareil);

  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toContain(GESTE_REDEMANDER);
  expect(corps).not.toContain(GESTE_CHANGER_APPAREIL);
});

// --- c5 — un code déjà utilisé invite à demander un nouveau code, jamais à changer d'appareil ---

it('un code déjà utilisé invite à demander un nouveau code, jamais à revenir sur un autre appareil', async () => {
  const db = await assurerSchema();
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, {
    codeClair: '70809010',
    identifiantAppareil,
    utiliseLe: Date.now(),
  });

  const reponse = await soumettreCode('70809010', identifiantAppareil);

  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toContain(GESTE_REDEMANDER);
  expect(corps).not.toContain(GESTE_CHANGER_APPAREIL);
});

// --- c5 — un code annulé invite à demander un nouveau code, jamais à changer d'appareil ---

it('un code annulé invite à demander un nouveau code, jamais à revenir sur un autre appareil', async () => {
  const db = await assurerSchema();
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, {
    codeClair: '80901020',
    identifiantAppareil,
    annuleLe: Date.now(),
  });

  const reponse = await soumettreCode('80901020', identifiantAppareil);

  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toContain(GESTE_REDEMANDER);
  expect(corps).not.toContain(GESTE_CHANGER_APPAREIL);
});

// --- c6 — l'écran de saisie annonce la portée par appareil du dernier code ---

it('l’écran de saisie du code annonce que seul le dernier code demandé sur cet appareil permet d’entrer', async () => {
  const reponse = await afficherEcranDeConnexion();

  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toContain('dernier code');
  expect(corps).toContain('cet appareil');
});

// --- c7 — aucun terme de développeur dans les textes de refus, sur les cinq causes ---

it('aucun des cinq refus (saisie fautive, brûlé, mauvais appareil, expiré, déjà utilisé) n’affiche un terme de développeur', async () => {
  const db = await assurerSchema();
  const corps: string[] = [];

  // 1. Saisie fautive.
  {
    const identifiantAppareil = await obtenirIdentifiantAppareil();
    await semerLigneDeCode(db, { codeClair: '11112222', identifiantAppareil, essais: 0 });
    const reponse = await soumettreCode('99998888', identifiantAppareil);
    corps.push((await reponse.text()).toLowerCase());
  }
  // 2. Brûlé (cinquième saisie fautive).
  {
    const identifiantAppareil = await obtenirIdentifiantAppareil();
    await semerLigneDeCode(db, { codeClair: '22223333', identifiantAppareil, essais: 4 });
    const reponse = await soumettreCode('99997777', identifiantAppareil);
    corps.push((await reponse.text()).toLowerCase());
  }
  // 3. Mauvais appareil.
  {
    const identifiantAppareilDemandeur = await obtenirIdentifiantAppareil();
    const identifiantAutreAppareil = await obtenirIdentifiantAppareil();
    await semerLigneDeCode(db, { codeClair: '33334444', identifiantAppareil: identifiantAppareilDemandeur });
    const reponse = await soumettreCode('33334444', identifiantAutreAppareil);
    corps.push((await reponse.text()).toLowerCase());
  }
  // 4. Expiré.
  {
    const identifiantAppareil = await obtenirIdentifiantAppareil();
    const ilYALongtemps = Date.now() - DUREE_DE_VIE_CODE_MS - 60_000;
    await semerLigneDeCode(db, {
      codeClair: '44445555',
      identifiantAppareil,
      creeeLe: ilYALongtemps,
      expireLe: ilYALongtemps + DUREE_DE_VIE_CODE_MS,
    });
    const reponse = await soumettreCode('44445555', identifiantAppareil);
    corps.push((await reponse.text()).toLowerCase());
  }
  // 5. Déjà utilisé.
  {
    const identifiantAppareil = await obtenirIdentifiantAppareil();
    await semerLigneDeCode(db, { codeClair: '55556666', identifiantAppareil, utiliseLe: Date.now() });
    const reponse = await soumettreCode('55556666', identifiantAppareil);
    corps.push((await reponse.text()).toLowerCase());
  }

  const termesDeveloppeur = [
    'commit',
    'branche',
    'build',
    'déploiement',
    'déployer',
    'repository',
    'dépôt git',
    'endpoint',
    'webhook',
    'backend',
    'front-end',
    'framework',
    'token',
    'session id',
    'cookie',
  ];

  for (const [index, texte] of corps.entries()) {
    for (const terme of termesDeveloppeur) {
      expect(texte, `le refus n°${index + 1} ne devrait pas contenir « ${terme} »`).not.toContain(terme);
    }
  }
});
