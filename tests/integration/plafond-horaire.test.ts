/**
 * Ticket 05 — Le plafond de cinq messages par heure glissante
 * (specs/001-connexion-par-code/05-plafond-horaire.md).
 *
 * Couture retenue (héritée des tickets 03/04, SPEC.md § Décisions de test,
 * ADR-0003) : requête HTTP réelle via `SELF.fetch` contre le worker compilé,
 * dans workerd, contre la vraie D1 locale. La migration
 * `migrations/0002_adresses_autorisees_et_codes_connexion.sql` (ticket 03)
 * porte déjà les colonnes qu'exige ce ticket (`essais`, `annule_le`) — ce
 * fichier ne la réécrit pas, il la rejoue et sème directement des lignes de
 * `codes_connexion` pour construire des situations (heure pleine, ligne
 * sortie de l'heure, ligne morte) qu'une vraie campagne de requêtes rendrait
 * lente et fragile à faire tenir dans une heure réelle.
 *
 * **Rien n'implémente encore ce plafond** (arbre à ce ticket, cf. brief) :
 * `src/pages/admin/connexion.astro` écrit un code et demande une expédition
 * sans jamais consulter combien de codes ont déjà été écrits dans l'heure.
 * Chaque test qui touche ce comportement est donc censé échouer aujourd'hui
 * — c'est le rouge attendu du mode `test`.
 *
 * **Semer une ligne « morte » sans attendre les tickets 06/07.** Les
 * colonnes `essais` (brûlage) et `annule_le` (annulation par nouvelle
 * demande) existent déjà dans le schéma, mais rien ne les écrit encore
 * (tickets 06/07, non bloquants ici). Ce fichier les pose donc directement
 * en SQL pour simuler une ligne brûlée ou annulée, sans dépendre d'aucun
 * comportement de ces tickets à venir.
 *
 * **L'heure glissante se juge à instant injecté** (SPEC.md § Décisions de
 * test : « les délais longs se jugent à instant injecté »), jamais en
 * attendant réellement une heure : une ligne « sortie de l'heure » est semée
 * avec un `creee_le` situé dans le passé, jamais obtenue en patientant.
 *
 * **Un espion posé sur la liaison d'environnement seule**, comme aux
 * tickets 03/04 (mutation de `env` via `cloudflare:test`, jamais un double
 * interne) : seule dépendance hors-process de cette route (`send_email`,
 * ADR-0002).
 *
 * **c5 (indivisibilité sous concurrence, signalé par le brief).** Deux
 * `SELF.fetch` lancées via `Promise.all` sont nécessaires pour espérer
 * déclencher une course, sans garantie absolue de la déclencher à tout coup.
 * L'assertion porte donc sur un invariant qui doit tenir *que la course ait
 * eu lieu ou non* — jamais un nombre différent selon 5+1 ou 4+2 : le compte
 * final ne dépasse jamais cinq — plutôt que sur l'observation directe d'une
 * collision.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const ADRESSE_QUELCONQUE = 'quelquun-dautre@example.com';
const PLAFOND = 5;
const UNE_HEURE_MS = 60 * 60 * 1000;
const DUREE_DE_VIE_CODE_MS = 15 * 60 * 1000; // ADR-0001, indépendant de src/core/auth/code.ts.

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

/**
 * Un espion minimal sur la liaison d'expédition (Mock, dernier recours — cf.
 * tickets 03/04). Expose `demande` : une promesse qui ne résout qu'au premier
 * appel — le seul point de synchronisation fiable, l'expédition étant remise
 * à la plateforme *après* la réponse (ADR-0007, `ctx.waitUntil`) : rien ne
 * garantit qu'elle a déjà eu lieu au seul retour de `SELF.fetch` (même
 * précaution qu'aux tickets 03/04).
 */
function creerExpediteurEspion(options?: { echoue?: boolean }): {
  expediteur: { send(message: unknown): Promise<void> };
  appels: unknown[];
  demande: Promise<void>;
} {
  const appels: unknown[] = [];
  let resoudreDemande: () => void;
  const demande = new Promise<void>((resolve) => {
    resoudreDemande = resolve;
  });
  return {
    expediteur: {
      async send(message: unknown): Promise<void> {
        appels.push(message);
        resoudreDemande();
        if (options?.echoue) {
          throw new Error('échec simulé d’expédition (test)');
        }
      },
    },
    appels,
    demande,
  };
}

/**
 * Attend un court délai réel. Sert uniquement à laisser sa chance à un appel
 * *différé* de se produire avant de constater son absence (`ctx.waitUntil`
 * ne garantit rien au retour de `SELF.fetch` — voir `creerExpediteurEspion`).
 * Une promesse qui n'a pas vocation à résoudre un jour (« aucun appel ») ne
 * peut se borner que par un délai — jamais par une attente indéfinie.
 */
function attendreDelaiCourt(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function poserExpediteurEspion(expediteur: unknown): unknown {
  const enveloppe = env as unknown as Record<string, unknown>;
  const precedent = enveloppe[CLE_LIAISON_EXPEDITION];
  enveloppe[CLE_LIAISON_EXPEDITION] = expediteur;
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

async function compterCodes(db: DBLike): Promise<number> {
  const resultat = await db.prepare(`select count(*) as n from ${TABLE_CODES}`).all<{ n: number }>();
  return resultat.results[0]?.n ?? 0;
}

/**
 * Sème directement une ligne de `codes_connexion`, sans passer par
 * `POST /admin/connexion` — c'est le seul moyen de fixer précisément
 * `creee_le` (heure glissante à instant injecté) et de simuler une ligne
 * morte (`essais`/`annule_le`) sans dépendre du brûlage ni de l'annulation
 * (tickets 06/07, non écrits).
 */
async function semerLigneDeCode(
  db: DBLike,
  options: {
    creeeLe?: number;
    identifiantAppareil?: string;
    essais?: number;
    annuleLe?: number | null;
  } = {},
): Promise<void> {
  const creeeLe = options.creeeLe ?? Date.now();
  await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, annule_le) values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      options.identifiantAppareil ?? `appareil-de-semis-${crypto.randomUUID()}`,
      'empreinte-de-semis',
      'sel-de-semis',
      creeeLe,
      creeeLe + DUREE_DE_VIE_CODE_MS,
      options.essais ?? 0,
      options.annuleLe ?? null,
    )
    .run();
}

/** Sème `n` lignes « saines », écrites à l'instant, dans l'heure courante. */
async function semerLignesSaines(db: DBLike, n: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await semerLigneDeCode(db, { creeeLe: Date.now() });
  }
}

function extraireCookie(reponse: Response, nom: string): { valeur: string } | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire] = entete.split(';').map((s) => s.trim());
    const [cle, valeur] = paire.split('=');
    if (cle === nom) return { valeur };
  }
  return null;
}

function entetesTriables(reponse: Response): [string, string][] {
  return Array.from(reponse.headers.entries())
    .filter(([cle]) => cle.toLowerCase() !== 'date')
    .sort(([a], [b]) => a.localeCompare(b));
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
      origin: 'https://example.com',
      cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
    },
    body: `adresse=${encodeURIComponent(adresse)}`,
  });
}

// --- c1 — le sixième code d'une heure pleine n'est ni écrit, ni demandé ---

it('quand cinq codes ont déjà été écrits dans l’heure, une sixième soumission n’ajoute aucune ligne', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  await semerLignesSaines(db, PLAFOND);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const avant = await compterCodes(db);

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);

  expect(await compterCodes(db)).toBe(avant);
});

it('quand cinq codes ont déjà été écrits dans l’heure, une sixième soumission ne demande aucune expédition', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  await semerLignesSaines(db, PLAFOND);
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const { expediteur, appels, demande } = creerExpediteurEspion();
  const precedent = poserExpediteurEspion(expediteur);

  try {
    await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
    // Laisse sa chance à un appel différé (voir `attendreDelaiCourt`) : sans
    // cette attente, l'absence constatée mesurerait l'instant de retour du
    // handler, jamais celui — potentiel — de la remise différée.
    await Promise.race([demande, attendreDelaiCourt()]);
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  expect(appels).toEqual([]);
});

// --- c2 — le plafond compte les codes écrits, jamais les expéditions abouties ---

it('cinq codes écrits dont chaque expédition échoue suffisent à atteindre le plafond', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);

  // Cinq soumissions réelles, chacune avec une expédition qui échoue : si le
  // plafond ne comptait que les envois *aboutis* (jamais ceux qui échouent),
  // aucune de ces cinq ne compterait, et la sixième ci-dessous serait servie
  // normalement.
  for (let i = 0; i < PLAFOND; i += 1) {
    const identifiantAppareil = await obtenirIdentifiantAppareil();
    const { expediteur } = creerExpediteurEspion({ echoue: true });
    const precedent = poserExpediteurEspion(expediteur);
    try {
      await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
    } finally {
      restaurerLiaisonExpedition(precedent);
    }
  }
  expect(await compterCodes(db)).toBe(PLAFOND);

  const identifiantAppareilSixieme = await obtenirIdentifiantAppareil();
  const avantSixieme = await compterCodes(db);

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilSixieme);

  expect(await compterCodes(db)).toBe(avantSixieme);
});

// --- c3 — une ligne annulée ou brûlée reste comptée tant qu'elle n'est pas sortie de l'heure ---

it('cinq lignes annulées ou brûlées, écrites dans l’heure, suffisent à atteindre le plafond', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  // Trois brûlées (essais au seuil du ticket 07) et deux annulées
  // (`annule_le` posé), toutes écrites à l'instant — dans l'heure.
  await semerLigneDeCode(db, { creeeLe: Date.now(), essais: 5 });
  await semerLigneDeCode(db, { creeeLe: Date.now(), essais: 5 });
  await semerLigneDeCode(db, { creeeLe: Date.now(), essais: 5 });
  await semerLigneDeCode(db, { creeeLe: Date.now(), annuleLe: Date.now() });
  await semerLigneDeCode(db, { creeeLe: Date.now(), annuleLe: Date.now() });
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const avant = await compterCodes(db);
  expect(avant).toBe(PLAFOND);

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);

  expect(await compterCodes(db)).toBe(avant);
});

// --- c4 — une ligne sortie de l'heure cesse d'être comptée, et une soumission redevient possible ---

it('cinq lignes écrites il y a plus d’une heure ne comptent plus : une nouvelle soumission ajoute une ligne', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const ilYAPlusDUneHeure = Date.now() - UNE_HEURE_MS - 60_000;
  for (let i = 0; i < PLAFOND; i += 1) {
    await semerLigneDeCode(db, { creeeLe: ilYAPlusDUneHeure });
  }
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const avant = await compterCodes(db);

  await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);

  expect(await compterCodes(db)).toBe(avant + 1);
});

it('cinq lignes écrites il y a plus d’une heure ne comptent plus : une nouvelle soumission demande une expédition', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const ilYAPlusDUneHeure = Date.now() - UNE_HEURE_MS - 60_000;
  for (let i = 0; i < PLAFOND; i += 1) {
    await semerLigneDeCode(db, { creeeLe: ilYAPlusDUneHeure });
  }
  const identifiantAppareil = await obtenirIdentifiantAppareil();
  const { expediteur, appels, demande } = creerExpediteurEspion();
  const precedent = poserExpediteurEspion(expediteur);

  try {
    await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareil);
    // L'expédition est remise après la réponse (`ctx.waitUntil`) : attendre
    // qu'elle ait eu lieu avant d'observer, sinon l'espion n'a pas encore
    // été appelé au seul retour de `SELF.fetch` (même précaution qu'aux
    // tickets 03/04).
    await demande;
  } finally {
    restaurerLiaisonExpedition(precedent);
  }

  expect(appels.length).toBe(1);
});

// --- c5 — l'épreuve du plafond et l'écriture sont indivisibles sous concurrence ---

it('deux soumissions concurrentes, à quatre codes déjà écrits dans l’heure, n’en portent jamais le total au-delà de cinq', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  await semerLignesSaines(db, PLAFOND - 1);
  const identifiantAppareilA = await obtenirIdentifiantAppareil();
  const identifiantAppareilB = await obtenirIdentifiantAppareil();

  await Promise.all([
    soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilA),
    soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilB),
  ]);

  expect(await compterCodes(db)).toBeLessThanOrEqual(PLAFOND);
});

// --- c6 — le plafond atteint s'annonce à l'écran, identiquement quelle que soit l'adresse ---

it('le plafond atteint rend un écran identique pour l’adresse autorisée et pour toute autre, distinct de l’écran habituel', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  const identifiantAppareilTemoin = await obtenirIdentifiantAppareil();
  const precedentTemoin = poserExpediteurEspion(creerExpediteurEspion().expediteur);
  let reponseTemoin: Response;
  try {
    // Écran de référence, plafond non atteint (aucune ligne encore semée) :
    // c'est à cet écran que la réponse « plafond atteint » doit différer.
    reponseTemoin = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilTemoin);
  } finally {
    restaurerLiaisonExpedition(precedentTemoin);
  }
  const corpsTemoin = await reponseTemoin.text();

  await semerLignesSaines(db, PLAFOND);
  const identifiantAppareilAutorisee = await obtenirIdentifiantAppareil();
  const identifiantAppareilQuelconque = await obtenirIdentifiantAppareil();
  const precedentAutorisee = poserExpediteurEspion(creerExpediteurEspion().expediteur);
  let reponseAutorisee: Response;
  try {
    reponseAutorisee = await soumettreAdresse(ADRESSE_AUTORISEE, identifiantAppareilAutorisee);
  } finally {
    restaurerLiaisonExpedition(precedentAutorisee);
  }
  const precedentQuelconque = poserExpediteurEspion(creerExpediteurEspion().expediteur);
  let reponseQuelconque: Response;
  try {
    reponseQuelconque = await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareilQuelconque);
  } finally {
    restaurerLiaisonExpedition(precedentQuelconque);
  }
  const corpsAutorisee = await reponseAutorisee.text();
  const corpsQuelconque = await reponseQuelconque.text();

  // Identique quelle que soit l'adresse soumise (l'adresse autorisée n'est
  // pas un secret au-delà d'une soumission, SPEC.md § Hors-périmètre).
  expect(corpsAutorisee).toBe(corpsQuelconque);
  expect(entetesTriables(reponseAutorisee)).toEqual(entetesTriables(reponseQuelconque));
  // Distinct de l'écran habituel : quelque chose s'annonce réellement.
  expect(corpsAutorisee).not.toBe(corpsTemoin);
});

// --- c7 — aucun terme de développeur ne paraît dans l'annonce ---

it('l’écran du plafond atteint ne porte aucun terme de développeur', async () => {
  const db = await assurerSchema();
  await semerAdresseAutorisee(db, ADRESSE_AUTORISEE);
  await semerLignesSaines(db, PLAFOND);
  const identifiantAppareil = await obtenirIdentifiantAppareil();

  const reponse = await soumettreAdresse(ADRESSE_QUELCONQUE, identifiantAppareil);

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
    'rate limit',
    'throttle',
    'quota',
    '429',
  ];

  for (const terme of termesDeveloppeur) {
    expect(corps, `l'écran du plafond atteint ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});
