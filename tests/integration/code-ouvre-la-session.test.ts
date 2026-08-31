/**
 * Ticket 06 — Le code recopié ouvre la session
 * (specs/001-connexion-par-code/06-code-ouvre-la-session.md).
 *
 * Couture retenue (héritée des tickets 03/04/05, SPEC.md § Décisions de
 * test, ADR-0003) : requête HTTP réelle via `SELF.fetch` contre le worker
 * compilé, dans workerd, contre la vraie D1 locale — jamais de double
 * interne. La migration `migrations/0002_adresses_autorisees_et_codes_
 * connexion.sql` (ticket 03) porte déjà les colonnes qu'exige ce ticket
 * (`empreinte`, `sel`, `identifiant_appareil`, `creee_le`, `expire_le`) ;
 * ce fichier ne la réécrit pas, il la rejoue et sème directement des lignes
 * de `codes_connexion` pour construire des situations (code déjà utilisé,
 * code expiré) qu'une vraie campagne de requêtes rendrait lente et fragile
 * à faire tenir dans quinze minutes réelles.
 *
 * **Rien n'implémente encore ce ticket** (arbre à ce ticket, cf. brief) :
 * `src/platform/session/index.ts` refuse toute session sans exception
 * (commentaire du ticket 01, qui annonce lui-même que c'est ce ticket qui
 * doit lui apprendre à en reconnaître une), et `src/pages/admin/
 * connexion.astro` ne lit aujourd'hui qu'un champ `adresse` : rien ne
 * distingue encore une soumission de code. Chaque test qui touche ce
 * comportement est donc censé échouer aujourd'hui — c'est le rouge attendu
 * du mode `test`.
 *
 * **Contrat supposé, faute d'antériorité.** Rien ne nomme encore comment la
 * seconde étape (code → session) transite sur la route unique : ce fichier
 * fixe, par ses assertions, le contrat que l'implémentation doit remplir
 * (nommage French, cohérent avec le reste de la feature) :
 *  - le POST de `/admin/connexion` reconnaît un champ `code` (distinct du
 *    champ `adresse` de l'étape 1) et, si l'empreinte salée du code soumis
 *    — après normalisation — correspond à une ligne non expirée, non encore
 *    utilisée, de l'appareil courant, ouvre une session ;
 *  - la session ouverte se communique par un cookie nommé `__Host-session`
 *    (préfixe exigé par c6), posé sur la réponse ;
 *  - le succès redirige vers `/admin/` (l'accueil), jamais vers l'écran de
 *    connexion.
 * Une future réécriture du contrat par l'implémenteur (autre nom de champ,
 * autre nom de cookie) est un signal à faire remonter, pas une raison
 * d'affaiblir ces assertions en aval.
 *
 * **La normalisation de la saisie (c3) est rejouée ici, jamais importée** :
 * `src/core/auth/code.ts` n'exporte que `engendrerCode` et la durée de vie,
 * jamais son alphabet — ce fichier compose donc ses propres codes canoniques
 * à la main, avec des signes valides de l'alphabet Crockford Base32 sans
 * confusables (ni I, L, O, ni U), et soumet des variantes défigurées de ces
 * mêmes codes (casse, séparateurs, confusables) en attendant qu'elles soient
 * reconnues comme équivalentes.
 *
 * **L'empreinte salée est rejouée ici, jamais importée** : `src/platform/
 * auth/magasin.ts` n'exporte pas sa fonction de hachage. Ce fichier réplique
 * l'algorithme documenté (SHA-256 de `${sel}:${code}`, hex) pour semer une
 * ligne dont l'empreinte correspond à un code en clair connu du test — il ne
 * le lit jamais depuis la production, il le rejoue, à l'image de la
 * migration rejouée.
 *
 * **Les quinze minutes se jugent à instant injecté** (SPEC.md § Décisions de
 * test) : une ligne expirée est semée avec un `creee_le`/`expire_le` situés
 * dans le passé, jamais obtenue en attendant réellement.
 *
 * **Un espion posé sur la liaison d'environnement seule**, comme aux tickets
 * 03/04/05 (mutation de `env` via `cloudflare:test`), pour les deux tests qui
 * déclenchent l'étape 1 (c7) : la seule dépendance hors-process de cette
 * route (`send_email`, ADR-0002), jamais un double interne.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const NOM_COOKIE_SESSION = '__Host-session'; // Contrat supposé — voir en-tête.
const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const DUREE_DE_VIE_CODE_MS = 15 * 60 * 1000; // ADR-0001.

const PATH_ACCUEIL_RE = /^\/admin\/?$/;
const PATH_CONNEXION_RE = /^\/admin\/connexion\/?$/;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

const CLE_LIAISON_EXPEDITION = 'EXPEDITEUR_CODE_CONNEXION';

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
 * correspond à `codeClair` — c'est le seul moyen de connaître à l'avance le
 * code en clair à soumettre (ou une saisie défigurée de ce code) sans
 * dépendre de l'expédition réelle (ticket 03, hors-portée ici).
 */
async function semerLigneDeCode(
  db: DBLike,
  options: {
    codeClair: string;
    identifiantAppareil: string;
    creeeLe?: number;
    expireLe?: number;
    utiliseLe?: number | null;
  },
): Promise<void> {
  const sel = 'sel-de-semis-ticket-06';
  const empreinte = await empreinteSalee(sel, options.codeClair);
  const creeeLe = options.creeeLe ?? Date.now();
  const expireLe = options.expireLe ?? creeeLe + DUREE_DE_VIE_CODE_MS;
  await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, utilise_le, annule_le) values (?1, ?2, ?3, ?4, ?5, 0, ?6, null)`,
    )
    .bind(options.identifiantAppareil, empreinte, sel, creeeLe, expireLe, options.utiliseLe ?? null)
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

function extraireEnteteCookie(reponse: Response, nom: string): string | null {
  return reponse.headers.getSetCookie().find((entete) => entete.split('=')[0] === nom) ?? null;
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

async function accederAAccueil(cookieSession: string | null): Promise<Response> {
  return SELF.fetch('https://example.com/admin/', {
    redirect: 'manual',
    headers: cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {},
  });
}

function cheminDeLocation(reponse: Response): string | null {
  const location = reponse.headers.get('location');
  if (!location) return null;
  return new URL(location, 'https://example.com').pathname;
}

// --- c1 — le code recopié sur l'appareil demandeur ouvre une session et renvoie vers l'accueil ---

it('soumettre le code valide, depuis l’appareil qui l’a demandé, redirige vers l’accueil', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'A3F7K9P2', identifiantAppareil });

  const reponse = await soumettreCode('A3F7K9P2', identifiantAppareil);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
});

it('soumettre le code valide ouvre réellement une session : le cookie rendu donne ensuite accès à l’accueil', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'A3F7K9P2', identifiantAppareil });
  const reponseConnexion = await soumettreCode('A3F7K9P2', identifiantAppareil);
  const cookieSession = extraireCookieValeur(reponseConnexion, NOM_COOKIE_SESSION);

  const reponseAccueil = await accederAAccueil(cookieSession);

  expect(reponseAccueil.status).toBe(200);
  const corps = await reponseAccueil.text();
  expect(corps).toContain('Vous êtes connectée.');
});

// --- c2 — l'accueil s'affiche alors, et ne porte toujours aucune fonction ---

it('une fois la session ouverte, l’accueil affiché ne porte aucun formulaire, bouton ni lien', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'A3F7K9P2', identifiantAppareil });
  const reponseConnexion = await soumettreCode('A3F7K9P2', identifiantAppareil);
  const cookieSession = extraireCookieValeur(reponseConnexion, NOM_COOKIE_SESSION);

  const reponseAccueil = await accederAAccueil(cookieSession);

  const corps = await reponseAccueil.text();
  expect(corps).not.toMatch(/<form[\s>]/i);
  expect(corps).not.toMatch(/<button[\s>]/i);
  expect(corps).not.toMatch(/<a\s+[^>]*href=/i);
});

// --- c3 — la saisie est normalisée : casse indifférente ---

it('un code saisi tout en minuscules ouvre quand même la session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'B4G8K2Q6', identifiantAppareil });

  const reponse = await soumettreCode('b4g8k2q6', identifiantAppareil);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
});

// --- c3 — la saisie est normalisée : séparateurs ignorés ---

it('un code saisi avec des espaces et des tirets intercalés ouvre quand même la session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'B4G8K2Q6', identifiantAppareil });

  const reponse = await soumettreCode('B4-G8 K2-Q6', identifiantAppareil);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
});

// --- c3 — la saisie est normalisée : le confusable O ramené au zéro ---

it('un « O » saisi à la place d’un zéro ouvre quand même la session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'A0B4G8K2', identifiantAppareil });

  const reponse = await soumettreCode('AOB4G8K2', identifiantAppareil);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
});

// --- c3 — la saisie est normalisée : le confusable I ramené au un ---

it('un « I » saisi à la place d’un un ouvre quand même la session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'A1B4G8K2', identifiantAppareil });

  const reponse = await soumettreCode('AIB4G8K2', identifiantAppareil);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
});

// --- c3 — la saisie est normalisée : le confusable L ramené au un ---

it('un « L » saisi à la place d’un un ouvre quand même la session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'A1B4G8K2', identifiantAppareil });

  const reponse = await soumettreCode('ALB4G8K2', identifiantAppareil);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_ACCUEIL_RE);
});

// --- c4 — le même code présenté une seconde fois n'ouvre pas de session ---

it('présenter le même code une seconde fois n’ouvre aucune nouvelle session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'C5H9M3R7', identifiantAppareil });
  await soumettreCode('C5H9M3R7', identifiantAppareil);

  const reponseSeconde = await soumettreCode('C5H9M3R7', identifiantAppareil);

  expect(extraireCookieValeur(reponseSeconde, NOM_COOKIE_SESSION)).toBeNull();
});

// --- c5 — un code présenté au-delà de quinze minutes n'ouvre pas de session ---

it('un code écrit il y a plus de quinze minutes n’ouvre plus de session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const ilYALongtemps = Date.now() - DUREE_DE_VIE_CODE_MS - 60_000;
  await semerLigneDeCode(db, {
    codeClair: 'D6J1N4S8',
    identifiantAppareil,
    creeeLe: ilYALongtemps,
    expireLe: ilYALongtemps + DUREE_DE_VIE_CODE_MS,
  });

  const reponse = await soumettreCode('D6J1N4S8', identifiantAppareil);

  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
});

// --- c6 — le cookie de session porte le préfixe __Host- ---

it('le cookie de session porte le préfixe __Host-', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'E7K2P5T9', identifiantAppareil });

  const reponse = await soumettreCode('E7K2P5T9', identifiantAppareil);

  expect(extraireEnteteCookie(reponse, NOM_COOKIE_SESSION)).not.toBeNull();
});

// --- c6 — HttpOnly ---

it('le cookie de session porte l’attribut HttpOnly', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'F8M3Q6V1', identifiantAppareil });

  const reponse = await soumettreCode('F8M3Q6V1', identifiantAppareil);

  const entete = extraireEnteteCookie(reponse, NOM_COOKIE_SESSION);
  expect((entete ?? '').toLowerCase()).toContain('httponly');
});

// --- c6 — Secure ---

it('le cookie de session porte l’attribut Secure', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'G9N4R7W2', identifiantAppareil });

  const reponse = await soumettreCode('G9N4R7W2', identifiantAppareil);

  const entete = extraireEnteteCookie(reponse, NOM_COOKIE_SESSION);
  expect((entete ?? '').toLowerCase()).toContain('secure');
});

// --- c6 — SameSite=Strict ---

it('le cookie de session porte l’attribut SameSite=Strict', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'H1P5S8X3', identifiantAppareil });

  const reponse = await soumettreCode('H1P5S8X3', identifiantAppareil);

  const entete = extraireEnteteCookie(reponse, NOM_COOKIE_SESSION);
  expect((entete ?? '').toLowerCase()).toContain('samesite=strict');
});

// --- c6 — Path=/ ---

it('le cookie de session porte l’attribut Path=/', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'J2Q6T9Y4', identifiantAppareil });

  const reponse = await soumettreCode('J2Q6T9Y4', identifiantAppareil);

  const entete = extraireEnteteCookie(reponse, NOM_COOKIE_SESSION);
  expect((entete ?? '').toLowerCase()).toContain('path=/');
});

// --- c6 — rien de la session ne se lit dans le cookie (opacité) ---

it('la valeur du cookie de session ne laisse rien lire de la session', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  await semerLigneDeCode(db, { codeClair: 'K3R7V1Z5', identifiantAppareil });

  const reponse = await soumettreCode('K3R7V1Z5', identifiantAppareil);

  const valeur = extraireCookieValeur(reponse, NOM_COOKIE_SESSION);
  expect(valeur).not.toBeNull();
  const brut = valeur as string;
  // Ni l'appareil, ni le code, ni l'adresse ne doivent apparaître en clair
  // dans la valeur portée par le cookie.
  expect(brut).not.toContain(identifiantAppareil);
  expect(brut.toUpperCase()).not.toContain('K3R7V1Z5');
  expect(brut).not.toContain(ADRESSE_AUTORISEE);
  // Un identifiant opaque (jeton/uuid aléatoire), jamais un entier de ligne
  // D1 lisible tel quel (« 1 », « 2 »…).
  expect(brut.length).toBeGreaterThanOrEqual(16);
  // Ni JSON en clair, ni JSON décodable depuis du base64 : rien ne s'y lit.
  expect(() => JSON.parse(brut)).toThrow();
  let decodage: string | null = null;
  try {
    decodage = atob(brut.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    decodage = null;
  }
  if (decodage !== null) {
    expect(() => JSON.parse(decodage as string)).toThrow();
  }
});

// --- c7 — l'écran de saisie dit combien de temps le code reste bon ---

it('l’écran affiché après une demande de code annonce sa durée de validité de quinze minutes', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const precedent = poserExpediteurEspionInerte();

  let reponse: Response;
  try {
    reponse = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  const corps = (await reponse.text()).toLowerCase();
  expect(corps).toMatch(/quinze minutes|15 minutes/);
});

// --- c7 — sans aucun terme de développeur ---

it('l’écran affiché après une demande de code ne porte aucun terme de développeur', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const precedent = poserExpediteurEspionInerte();

  let reponse: Response;
  try {
    reponse = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  const corps = (await reponse.text()).toLowerCase();
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

  for (const terme of termesDeveloppeur) {
    expect(corps, `l'écran ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});

// --- garde-fou : l'écran de connexion ne redirige jamais un accès sans session vers l'accueil ---

it('accéder à l’accueil sans cookie de session redirige vers l’écran de connexion', async () => {
  const reponse = await accederAAccueil(null);

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_CONNEXION_RE);
});
