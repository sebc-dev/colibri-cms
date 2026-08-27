/**
 * Ticket 03 — L'adresse autorisée fait partir un code
 * (specs/001-connexion-par-code/03-code-vers-adresse-autorisee.md).
 *
 * Couture retenue par la spec (SPEC.md § Décisions de test, ADR-0003) :
 * requête HTTP réelle via `SELF.fetch` contre le worker de production, dans
 * son vrai moteur (workerd), et lecture de la vraie D1 locale — jamais de
 * simulacre. Ce fichier est le premier de la feature à toucher D1 : aucune
 * table de ce lot n'existe encore, et rien sous `src/core/auth/`,
 * `src/platform/auth/` ni `src/platform/email/` n'existe non plus (arbre
 * propre, cf. brief). Chaque test qui les touche est donc censé échouer
 * aujourd'hui — c'est le rouge attendu du mode `test`.
 *
 * **Contrat supposé, faute d'antériorité.** Rien ne nomme encore le cookie
 * d'appareil, les tables D1 ni les modules `src/core/auth/code.ts` /
 * `src/platform/email/` : ce fichier fixe, par ses assertions, le contrat
 * que l'implémentation doit remplir (nommage French, cohérent avec le
 * domaine) :
 *  - cookie `identifiant-appareil` (posé par le GET, jamais par le POST) ;
 *  - migration `migrations/0002_adresses_autorisees_et_codes_connexion.sql`
 *    (nom aligné sur le seul indice disponible : un run antérieur non
 *    commité de ce même ticket avait créé exactement ce fichier) créant les
 *    tables `adresses_autorisees` (colonne `adresse`) et `codes_connexion` ;
 *  - `src/core/auth/code.ts` exporte `engendrerCode()`, pur, zéro dépendance
 *    (matrice `I1` — la fonction ne peut pas toucher D1 ni fetch) ;
 *  - `src/platform/email/index.ts` exporte `demanderExpeditionDuCode(
 *    expediteur, destinataire, code)`, qui appelle `expediteur.send(...)` ;
 *  - la route lit son expéditeur depuis la liaison d'environnement
 *    `EXPEDITEUR_CODE_CONNEXION` (`import { env } from 'cloudflare:workers'`
 *    — seule porte d'entrée de la plateforme, cf. `src/platform/d1/sonde-
 *    dev.ts`), jamais construit en dur dans la route elle-même : c'est le
 *    seul point où ce fichier peut s'accrocher pour observer, depuis une
 *    vraie requête, que l'expédition a été *demandée*.
 *
 * **Portée volontairement bornée sur l'expédition (SPEC.md, arbitré le
 * 2026-08-25).** Le binding `send_email` (ADR-0002) n'est observable, en
 * local, que via l'écriture sur disque temporaire de Miniflare (mesuré :
 * `node_modules/miniflare/dist/src/workers/email/send_email.worker.js`) —
 * une dépendance d'implémentation fragile, hors de portée d'un test HTTP.
 * Ce fichier s'arrête donc là où le ticket lui-même s'arrête : prouver que
 * *l'appel* est demandé, jamais que l'envoi aboutit. La règle des doubles
 * autorise expressément un mock pour une dépendance SMTP/API externe hors-
 * process — mais un double appelé en direct, hors de toute route, ne prouve
 * que le module s'invoque lui-même : il ne traverse jamais `POST
 * /admin/connexion`. La couture retenue est donc plus haute : un espion posé
 * sur la liaison d'environnement `EXPEDITEUR_CODE_CONNEXION` (mutation de
 * `env`, cf. `import { env } from 'cloudflare:test'` — spike vérifié : cette
 * mutation est visible du même isolat via `cloudflare:workers`, donc de tout
 * code de route qui lit sa liaison par cette porte), avant un vrai
 * `SELF.fetch` POST — ce qui observe la demande d'expédition *depuis la
 * route*, sans jamais chercher à constater l'envoi réel ni sa forme.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const DUREE_MIN_CODE_SECONDES = 15 * 60; // ADR-0001 : le code expire dans les quinze minutes.
// Crockford Base32 — 32 signes, sans confusables (ni I, L, O, ni U) : le seul alphabet à 32
// caractères usuel qui tient la promesse d'ADR-0001 / SPEC.md.
const ALPHABET_CODE = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_RE = new RegExp(`^[${ALPHABET_CODE}]{8}$`);

const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const ADRESSE_QUELCONQUE = 'quelquun-dautre@example.com';

// Liaison d'environnement supposée (voir « Contrat supposé » en tête de
// fichier) : c'est par elle que la route est censée obtenir l'expéditeur à
// invoquer pour demander l'expédition du code.
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

// Retire les commentaires `--` avant de découper sur `;` : `D1Database#exec`
// refuse tout commentaire en tête de ligne (mesuré), ce que
// `unstable_splitSqlQuery` de wrangler ferait, mais cette fonction est
// Node-only (lecture disque) et donc inutilisable depuis l'intérieur de
// workerd — d'où ce découpage maison, minimal.
function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

// Mémoïsé : la vraie migration du ticket n'est appliquée qu'une fois par
// fichier (les tables persistent entre les `it()` de ce fichier — mesuré,
// aucune isolation de stockage par test par défaut), et chaque test qui en
// a besoin l'attend explicitement dans son Arrange plutôt que via un hook
// partagé : un `beforeAll` qui échoue transforme tous les tests du fichier
// en « skipped » plutôt qu'en échecs individuels lisibles (mesuré) — ce qui
// masquerait, à ce ticket, jusqu'aux tests du cookie qui n'ont rien à voir
// avec D1.
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
    // Schéma pas encore écrit (migration absente) : rien à nettoyer — c'est
    // précisément le rouge que ce fichier attend à ce ticket.
    console.warn('nettoyage D1 ignoré (schéma absent, rouge attendu) :', erreur);
  }
  // Isolation (FIRST) : aucun test ne doit laisser d'expéditeur-espion posé
  // pour le suivant.
  delete (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION];
});

/**
 * Un espion minimal sur la liaison d'expédition — Mock au sens strict
 * (vérification de comportement sortant), justifié ici : `send_email`
 * (ADR-0002) est la seule dépendance hors-process de ce ticket, et c'est
 * exactement le cas que la règle des doubles réserve au mock en dernier
 * recours.
 */
function creerExpediteurEspion(): { expediteur: { send(message: unknown): void }; appels: unknown[] } {
  const appels: unknown[] = [];
  return {
    expediteur: {
      send(message: unknown): void {
        appels.push(message);
      },
    },
    appels,
  };
}

/** Pose l'espion sur la liaison lue par la route ; rend la valeur précédente. */
function poserExpediteurEspion(expediteur: unknown): unknown {
  const enveloppe = env as unknown as Record<string, unknown>;
  const precedent = enveloppe[CLE_LIAISON_EXPEDITION];
  enveloppe[CLE_LIAISON_EXPEDITION] = expediteur;
  return precedent;
}

/** Restaure la liaison d'expédition à sa valeur d'avant le test. */
function restaurerLiaisonExpedition(precedent: unknown): void {
  (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION] = precedent;
}

async function semerAdresseAutorisee(db: DBLike, adresse: string): Promise<void> {
  await db
    .prepare(`insert into ${TABLE_ADRESSES} (adresse) values (?1)`)
    .bind(adresse)
    .run();
}

async function compterCodes(db: DBLike): Promise<number> {
  const resultat = await db.prepare(`select count(*) as n from ${TABLE_CODES}`).all<{ n: number }>();
  return resultat.results[0]?.n ?? 0;
}

async function derniereLigneDeCode(db: DBLike): Promise<Record<string, unknown> | null> {
  const resultat = await db
    .prepare(`select * from ${TABLE_CODES} order by rowid desc limit 1`)
    .all<Record<string, unknown>>();
  return resultat.results[0] ?? null;
}

function extraireCookie(reponse: Response, nom: string): { valeur: string; maxAge: number | null } | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire, ...attributs] = entete.split(';').map((s) => s.trim());
    const [cle, valeur] = paire.split('=');
    if (cle === nom) {
      const attributMaxAge = attributs.find((a) => a.toLowerCase().startsWith('max-age='));
      const maxAge = attributMaxAge ? Number(attributMaxAge.split('=')[1]) : null;
      return { valeur, maxAge };
    }
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
  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);
  if (!cookie) {
    throw new Error(
      `l'écran de connexion n'a posé aucun cookie « ${NOM_COOKIE_APPAREIL} » — impossible d'obtenir un identifiant d'appareil pour préparer ce test`,
    );
  }
  return cookie.valeur;
}

async function soumettreAdresse(adresse: string, identifiantAppareil: string): Promise<Response> {
  return SELF.fetch('https://example.com/admin/connexion', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // Origin explicite : la protection anti-cross-site d'Astro refuse sinon
      // tout POST (mesuré, 403 « Cross-site POST form submissions are
      // forbidden ») avant même d'atteindre la logique de la route.
      origin: 'https://example.com',
      cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
    },
    body: `adresse=${encodeURIComponent(adresse)}`,
  });
}

// --- FR-120 (c1) — l'identifiant d'appareil, posé à l'affichage ---

it('afficher l’écran de connexion sans identifiant d’appareil en pose un', async () => {
  const reponse = await afficherEcranDeConnexion();

  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);

  expect(cookie?.valeur).toBeTruthy();
});

it('afficher l’écran de connexion avec un identifiant d’appareil déjà présent le laisse intact', async () => {
  // Un identifiant « déjà présent » l'est réellement — posé par un premier
  // affichage — plutôt qu'une valeur inventée : sinon, tant que rien n'est
  // implémenté, l'absence de tout Set-Cookie serait vraie par défaut, et ce
  // test passerait aujourd'hui pour la mauvaise raison (aucun rouge légitime).
  const identifiantDejaPresent = await obtenirIdentifiantAppareil();

  const reponse = await afficherEcranDeConnexion(identifiantDejaPresent);

  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);
  expect(cookie).toBeNull();
});

// --- FR-120 (c2) — durée de vie de l'identifiant, pas plus courte qu'un code ---

it('l’identifiant d’appareil posé dure au moins aussi longtemps qu’un code (quinze minutes)', async () => {
  const reponse = await afficherEcranDeConnexion();

  const cookie = extraireCookie(reponse, NOM_COOKIE_APPAREIL);

  expect(cookie?.maxAge).not.toBeNull();
  expect(cookie?.maxAge ?? 0).toBeGreaterThanOrEqual(DUREE_MIN_CODE_SECONDES);
});

// --- FR-001 (c3) — soumettre l'adresse autorisée écrit un code et demande son expédition ---

it('soumettre l’adresse autorisée ajoute une ligne dans les codes de connexion', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const avant = await compterCodes(db);

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);

  expect(await compterCodes(db)).toBe(avant + 1);
});

it('soumettre l’adresse autorisée demande une expédition à la plateforme, vue depuis la route', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const { expediteur, appels } = creerExpediteurEspion();
  const precedent = poserExpediteurEspion(expediteur);

  try {
    await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  expect(appels.length).toBe(1);
});

// --- FR-005 (c4) — toute autre adresse n'écrit rien et ne demande rien ---

it('soumettre une adresse qui n’est pas l’adresse autorisée n’ajoute aucune ligne dans les codes', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const avant = await compterCodes(db);

  await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareil);

  expect(await compterCodes(db)).toBe(avant);
});

it('soumettre une adresse qui n’est pas l’adresse autorisée ne demande aucune expédition', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const { expediteur, appels } = creerExpediteurEspion();
  const precedent = poserExpediteurEspion(expediteur);

  try {
    await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  expect(appels).toEqual([]);
});

// --- ADR-0001 (c5) — huit signes, alphabet de trente-deux caractères sans confusables ---

it('le code engendré fait huit signes tirés d’un alphabet de trente-deux caractères sans confusables, sur un grand nombre de tirages', async () => {
  const { engendrerCode } = await import('../../src/core/auth/code');
  // Un seul tirage laisserait passer un alphabet erroné (ex. incluant un
  // confusable I/L/O/U) par pur hasard : quelques centaines de tirages
  // rendent la borne d'entropie (ADR-0001) robuste plutôt que probable.
  const NOMBRE_DE_TIRAGES = 500;

  const codes = Array.from({ length: NOMBRE_DE_TIRAGES }, () => engendrerCode());

  expect(codes.every((code) => CODE_RE.test(code))).toBe(true);
});

// --- ADR-0001 (c6) — la base ne conserve qu'une empreinte salée ---

it('la base ne conserve du code qu’une empreinte salée, jamais le code engendré en clair', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);

  const ligne = await derniereLigneDeCode(db);
  expect(ligne).not.toBeNull();
  const valeursEnClairPossibles = Object.values(ligne ?? {}).filter(
    (valeur) => typeof valeur === 'string' && CODE_RE.test(valeur),
  );
  expect(valeursEnClairPossibles).toEqual([]);
});

// --- FR-120 (c7) — le code écrit porte l'identifiant d'appareil de la soumission ---

it('le code écrit porte l’identifiant d’appareil de la soumission qui l’a demandé', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);

  const ligne = await derniereLigneDeCode(db);
  expect(ligne).not.toBeNull();
  expect(Object.values(ligne ?? {})).toContain(identifiantAppareil);
});
