/**
 * Ticket 04 — Les deux branches sont indiscernables
 * (specs/001-connexion-par-code/04-branches-indiscernables.md).
 *
 * Couture retenue (héritée du ticket 03, SPEC.md § Décisions de test,
 * ADR-0003) : requête HTTP réelle via `SELF.fetch` contre le worker de
 * production, dans son vrai moteur (workerd), et lecture de la vraie D1
 * locale — jamais de simulacre pour la route elle-même. La migration
 * `migrations/0002_adresses_autorisees_et_codes_connexion.sql` existe déjà
 * (ticket 03) ; ce fichier ne la réécrit pas, il la rejoue.
 *
 * **Contrat supposé, faute d'antériorité.** Rien ne nomme encore
 * `src/core/auth/regles.ts` (absent de l'arbre à ce ticket — cf. brief) :
 * ce fichier fixe, par ses assertions, le contrat que l'implémentation doit
 * remplir :
 *  - `src/core/auth/regles.ts` exporte une constante `DELAI_PLANCHER_MS`
 *    (nombre, millisecondes, strictement positif) — le délai plancher fixe
 *    évoqué par SPEC.md § Décisions d'implémentation, gelé en source et
 *    jamais réglé par une mesure ;
 *  - la route `src/pages/admin/connexion.astro` ne rend sa réponse qu'après
 *    ce délai, et ne remet l'expédition à la plateforme (`send` sur la
 *    liaison `EXPEDITEUR_CODE_CONNEXION`) qu'une fois la réponse construite
 *    — jamais avant, y compris si l'expédition échoue.
 * Chaque test qui touche ce contrat est donc censé échouer aujourd'hui :
 * `regles.ts` n'existe pas, et rien dans la route n'impose ni le plancher,
 * ni l'ordre — c'est le rouge attendu du mode `test`.
 *
 * **Ce que la mesure des durées ne couvre pas ici.** Une assertion ne juge
 * pas une durée : ce fichier vérifie que la réponse n'est *jamais rendue
 * avant* le plancher (une borne inférieure, sur un petit nombre de tirs),
 * jamais l'égalité fine des distributions de délai entre les deux branches
 * (centiles, étalement) — c'est le ticket 09 (le parcours joué contre le
 * serveur local) qui la mesure, sur une campagne dédiée et hors plafond.
 *
 * **Un espion posé sur la liaison d'environnement seule**, comme au ticket
 * 03 (mutation de `env` via `cloudflare:test`, jamais un double interne) :
 * seule dépendance hors-process de cette route (`send_email`, ADR-0002).
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
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
// refuse tout commentaire en tête de ligne (mesuré au ticket 03), ce que
// `unstable_splitSqlQuery` de wrangler ferait, mais cette fonction est
// Node-only (lecture disque) et donc inutilisable depuis l'intérieur de
// workerd — d'où ce découpage maison, minimal, repris à l'identique.
function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

// Mémoïsé comme au ticket 03 : la migration n'est appliquée qu'une fois par
// fichier, et chaque test qui en a besoin l'attend explicitement dans son
// Arrange plutôt que via un hook partagé — un `beforeAll` qui échoue
// transformerait tous les tests du fichier en « skipped » plutôt qu'en
// échecs individuels lisibles.
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
    // Schéma pas encore écrit : rien à nettoyer.
    console.warn('nettoyage D1 ignoré (schéma absent, rouge attendu) :', erreur);
  }
  // Isolation (FIRST) : aucun test ne doit laisser d'expéditeur-espion posé
  // pour le suivant.
  delete (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION];
});

/**
 * Un espion minimal sur la liaison d'expédition — Mock au sens strict
 * (vérification de comportement sortant), justifié comme au ticket 03 :
 * `send_email` est la seule dépendance hors-process de cette route.
 * `echoue: true` fait rejeter `send` — c'est le cas dégénéré du critère
 * « une expédition qui échoue ».
 */
function creerExpediteurEspion(options?: { echoue?: boolean }): {
  expediteur: { send(message: unknown): Promise<void> };
  appels: unknown[];
} {
  const appels: unknown[] = [];
  return {
    expediteur: {
      async send(message: unknown): Promise<void> {
        appels.push(message);
        if (options?.echoue) {
          throw new Error('échec simulé d’expédition (test)');
        }
      },
    },
    appels,
  };
}

/**
 * Un espion qui n'observe que l'ordre : il pousse un jalon dans le tableau
 * partagé au moment précis où la route l'invoque, sans aucun travail
 * asynchrone propre — ce qui rend le jalon fidèle à l'instant de l'appel,
 * pas à celui d'une résolution différée.
 *
 * Expose aussi `demande` : une promesse qui ne résout qu'à cet appel. C'est
 * le point de synchronisation nécessaire à c4 — si l'expédition est remise
 * à la plateforme *après* la réponse (ADR-0007, `ctx.waitUntil`), rien ne
 * garantit qu'elle a déjà eu lieu au seul retour de `SELF.fetch` : sans ce
 * point d'attente, un `expect` posé immédiatement après `await
 * soumettreAdresse` mesurerait l'instant de retour du handler, jamais celui
 * de la remise différée, et ne pourrait jamais observer un ordre conforme.
 */
function creerExpediteurEspionOrdonne(ordre: string[]): {
  send(message: unknown): void;
  demande: Promise<void>;
} {
  let resoudreDemande: () => void;
  const demande = new Promise<void>((resolve) => {
    resoudreDemande = resolve;
  });
  return {
    send(): void {
      ordre.push('envoi-demande');
      resoudreDemande();
    },
    demande,
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

function extraireCookie(reponse: Response, nom: string): { valeur: string } | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire] = entete.split(';').map((s) => s.trim());
    const [cle, valeur] = paire.split('=');
    if (cle === nom) return { valeur };
  }
  return null;
}

/**
 * Le jeu de champs d'en-tête d'une réponse, trié et sans `date` : seul champ
 * dont la valeur varie légitimement d'une requête à l'autre (l'horloge),
 * jamais un signal que la route porterait sur l'adresse soumise.
 */
function entetesTriables(reponse: Response): [string, string][] {
  return Array.from(reponse.headers.entries())
    .filter(([cle]) => cle.toLowerCase() !== 'date')
    .sort(([a], [b]) => a.localeCompare(b));
}

// Marqueur du gabarit rendu par l'écran de connexion (le bouton du
// formulaire, cf. src/pages/admin/connexion.astro) : la même vue est rendue
// après soumission, quelle que soit l'adresse (SPEC.md § Décisions
// d'implémentation, ticket 04).
const MARQUEUR_ECRAN_DE_CONNEXION = 'Recevoir un code';

/**
 * Ancre une réponse à l'écran de connexion légitime — statut 200 et
 * marqueur du gabarit — avant de comparer deux réponses entre elles.
 * Sans cet ancrage, deux réponses d'erreur identiques (ex. 403 anti-
 * cross-site, page d'erreur commune à Astro) rendraient un test « corps et
 * en-têtes identiques » vert pour la mauvaise raison : il attesterait
 * seulement que les deux branches échouent pareil, jamais qu'elles
 * réussissent pareil (cf. ticket 03, même précaution).
 */
function expectEcranDeConnexionLegitime(reponse: Response, corps: string): void {
  expect(reponse.status).toBe(200);
  expect(corps).toContain(MARQUEUR_ECRAN_DE_CONNEXION);
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
      // tout POST (mesuré au ticket 03, 403 « Cross-site POST form
      // submissions are forbidden ») avant même d'atteindre la logique de
      // la route.
      origin: 'https://example.com',
      cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
    },
    body: `adresse=${encodeURIComponent(adresse)}`,
  });
}

// --- c1 — même corps, quelle que soit l'adresse soumise ---

it('sur une soumission donnée, le corps de la réponse est identique pour l’adresse autorisée et pour toute autre', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  // Espion posé : seule la comparaison des réponses importe ici, jamais
  // l'expédition réelle — l'éviter écarte tout bruit du binding `send_email`
  // réel (message hors de son contrat, non pertinent pour ce critère).
  const precedent = poserExpediteurEspion(creerExpediteurEspion().expediteur);

  let reponseAutorisee: Response;
  let reponseQuelconque: Response;
  try {
    reponseAutorisee = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
    reponseQuelconque = await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  const corpsAutorisee = await reponseAutorisee.text();
  const corpsQuelconque = await reponseQuelconque.text();

  // Ancrage (voir helper) : les deux réponses doivent être l'écran de
  // connexion lui-même, pas deux erreurs identiques.
  expectEcranDeConnexionLegitime(reponseAutorisee, corpsAutorisee);
  expectEcranDeConnexionLegitime(reponseQuelconque, corpsQuelconque);

  expect(corpsAutorisee).toBe(corpsQuelconque);
});

// --- c2 — mêmes champs d'en-tête, quelle que soit l'adresse soumise ---

it('les champs d’en-tête de la réponse sont identiques pour les deux branches (hors Date)', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const precedent = poserExpediteurEspion(creerExpediteurEspion().expediteur);

  let reponseAutorisee: Response;
  let reponseQuelconque: Response;
  try {
    reponseAutorisee = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
    reponseQuelconque = await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareil);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  // Ancrage (voir helper) : les deux réponses doivent être l'écran de
  // connexion lui-même, pas deux erreurs identiques (ex. 403 anti-cross-
  // site) qui partageraient aussi les mêmes champs d'en-tête.
  const entetesAutorisee = entetesTriables(reponseAutorisee);
  const entetesQuelconque = entetesTriables(reponseQuelconque);
  expectEcranDeConnexionLegitime(reponseAutorisee, await reponseAutorisee.text());
  expectEcranDeConnexionLegitime(reponseQuelconque, await reponseQuelconque.text());

  expect(entetesAutorisee).toEqual(entetesQuelconque);
});

// --- c3 — le délai plancher : une constante des sources, et une borne tenue ---

it('src/core/auth/regles.ts gèle un délai plancher, positif, en millisecondes', async () => {
  const regles = await import('../../src/core/auth/regles');

  expect(typeof regles.DELAI_PLANCHER_MS).toBe('number');
  expect(regles.DELAI_PLANCHER_MS).toBeGreaterThan(0);
});

it('la réponse à une soumission n’est rendue qu’après le délai plancher gelé en source', async () => {
  const regles = await import('../../src/core/auth/regles');
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();

  const debut = Date.now();
  await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareil);
  const duree = Date.now() - debut;

  expect(duree).toBeGreaterThanOrEqual(regles.DELAI_PLANCHER_MS);
});

// --- c4 — l'expédition est remise à la plateforme après la réponse, jamais avant ---

it('l’expédition n’est demandée qu’après que la réponse est rendue, jamais avant', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const ordre: string[] = [];
  const espion = creerExpediteurEspionOrdonne(ordre);
  const precedent = poserExpediteurEspion(espion);

  try {
    await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
    ordre.push('reponse-recue');
    // Point de synchronisation : la remise à la plateforme (ADR-0007,
    // `ctx.waitUntil`) est censée se poursuivre après le retour de
    // `SELF.fetch`, donc après le jalon `reponse-recue` ci-dessus. Sans
    // cette attente explicite, le jalon `envoi-demande` d'une expédition
    // conforme (différée) n'aurait tout simplement pas encore eu lieu au
    // moment de l'assertion — ce n'est pas l'ordre qui serait faux, c'est
    // l'observation qui arriverait trop tôt.
    await espion.demande;
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  // Le jalon posé par la route ne doit apparaître qu'après celui que le
  // test pose immédiatement au retour de `SELF.fetch` — jamais avant.
  expect(ordre).toEqual(['reponse-recue', 'envoi-demande']);
});

// --- c5 — une expédition qui échoue ne change rien à ce qui est rendu ---

it('une expédition qui échoue ne change ni le corps, ni les en-têtes, ni le délai de la réponse', async () => {
  const regles = await import('../../src/core/auth/regles');
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);

  const identifiantAppareilOk = await obtenirIdentifiantAppareil();
  const precedentOk = poserExpediteurEspion(creerExpediteurEspion().expediteur);
  const debutOk = Date.now();
  let reponseOk: Response;
  try {
    reponseOk = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilOk);
  } finally {
    restaurerLiaisonExpedition(precedentOk);
  }
  const dureeOk = Date.now() - debutOk;

  const identifiantAppareilEchec = await obtenirIdentifiantAppareil();
  const { expediteur: expediteurEchoue } = creerExpediteurEspion({ echoue: true });
  const precedentEchec = poserExpediteurEspion(expediteurEchoue);
  const debutEchec = Date.now();
  let reponseEchec: Response;
  try {
    reponseEchec = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilEchec);
  } finally {
    restaurerLiaisonExpedition(precedentEchec);
  }
  const dureeEchec = Date.now() - debutEchec;

  expect(await reponseEchec.text()).toBe(await reponseOk.text());
  expect(entetesTriables(reponseEchec)).toEqual(entetesTriables(reponseOk));
  expect(dureeOk).toBeGreaterThanOrEqual(regles.DELAI_PLANCHER_MS);
  expect(dureeEchec).toBeGreaterThanOrEqual(regles.DELAI_PLANCHER_MS);
});

// --- c6 — aucune adresse autorisée enregistrée : la réponse ne change pas ---

it('quand aucune adresse autorisée n’est enregistrée, la réponse reste celle d’une adresse non reconnue', async () => {
  // Schéma présent (table créée par la migration), mais sans la moindre
  // ligne — c'est l'instance « non semée » (SPEC.md § Hors-périmètre : le
  // geste qui pose l'adresse autorisée est un geste d'exploitation, hors
  // produit). `afterEach` garantit que les lignes des tests précédents ont
  // déjà été retirées.
  await assurerSchema();
  const identifiantAppareilNonSemee = await obtenirIdentifiantAppareil();
  const reponseNonSemee = await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareilNonSemee);

  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareilSemee = await obtenirIdentifiantAppareil();
  const reponseSemee = await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareilSemee);

  const corpsNonSemee = await reponseNonSemee.text();
  const corpsSemee = await reponseSemee.text();

  // Ancrage (voir helper) : les deux réponses doivent être l'écran de
  // connexion lui-même, pas deux erreurs identiques.
  expectEcranDeConnexionLegitime(reponseNonSemee, corpsNonSemee);
  expectEcranDeConnexionLegitime(reponseSemee, corpsSemee);

  expect(corpsNonSemee).toBe(corpsSemee);
  expect(entetesTriables(reponseNonSemee)).toEqual(entetesTriables(reponseSemee));
});
