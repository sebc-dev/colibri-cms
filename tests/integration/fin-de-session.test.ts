/**
 * Ticket 08 — La session s'éteint d'elle-même
 * (specs/001-connexion-par-code/08-fin-de-session.md).
 *
 * Couture retenue (héritée des tickets 01/06, SPEC.md § Décisions de test,
 * ADR-0003) : requête HTTP réelle via `SELF.fetch` contre le worker compilé,
 * dans workerd, contre la vraie D1 locale — jamais de double interne. La
 * migration `migrations/0003_sessions.sql` (ticket 06) porte la table
 * `sessions` ; ce fichier la rejoue (comme `code-ouvre-la-session.test.ts`
 * rejoue 0002) et sème directement des lignes pour construire, à instant
 * injecté, des situations (session vieille de sept/trente jours) qu'une
 * vraie attente réelle rendrait impossible à tenir dans une suite de tests.
 *
 * **Rien n'implémente encore ce ticket** (arbre à ce ticket, cf. brief) :
 * `verifierSession` (`src/platform/session/index.ts`) rend une session valide
 * dès qu'une ligne de `sessions` porte l'`id` du cookie — sans jamais juger
 * son âge. Chaque test qui touche l'expiration est donc censé échouer
 * aujourd'hui — c'est le rouge attendu du mode `test`.
 *
 * **Contrat supposé, faute d'antériorité** (à l'image du contrat que
 * `code-ouvre-la-session.test.ts` fixe pour le cookie de session). La table
 * `sessions` ne porte aujourd'hui qu'un seul horodatage, `creee_le` — or
 * juger l'échéance glissante de sept jours (dernier usage) séparément de la
 * butée absolue de trente jours (création, c2) suppose de distinguer les
 * deux dates. Ce fichier fait donc l'hypothèse d'une colonne
 * supplémentaire, `dernier_usage_le`, et l'ajoute lui-même par un `alter
 * table` **exécuté depuis ce fichier de test seul** (jamais dans
 * `migrations/` ni dans `src/`) — exactement comme il rejoue la migration
 * plutôt que d'en écrire une. Le futur `alter table` de production (ticket
 * 08, T6) est un signal à faire remonter si le nom ou l'existence même de
 * cette colonne diffère, jamais une raison d'affaiblir ces assertions.
 *
 * **Les sept et trente jours se jugent à instant injecté** (SPEC.md §
 * Décisions de test) : une session ancienne est semée avec un `creee_le`/
 * `dernier_usage_le` situés dans le passé, jamais obtenue en attendant
 * réellement (c1, c2, c5). Pour c3 (l'usage repousse l'échéance), faute
 * d'horloge injectable côté route (`Date.now()` y est direct), l'extension
 * de l'échéance se lit en état — une relecture directe de la ligne D1 après
 * l'accès — plutôt qu'en rejouant un second accès à une date ultérieure
 * réelle, ce qu'aucune primitive de ce produit ne permet aujourd'hui.
 *
 * **c4 : un espion posé sur la liaison `DB` seule**, comme les tickets 03/04/
 * 05/06 posent un espion sur la liaison d'expédition (mutation de `env` via
 * `cloudflare:test`) — jamais un double interne. Il intercepte les seules
 * requêtes d'écriture (`insert`/`update`) qui ciblent `sessions`, pour
 * compter combien de rafraîchissements une rafale de requêtes immédiates
 * déclenche réellement en base.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';

const UN_JOUR_MS = 24 * 60 * 60 * 1000;
const SEPT_JOURS_MS = 7 * UN_JOUR_MS; // Contrat supposé — voir en-tête.
const TRENTE_JOURS_MS = 30 * UN_JOUR_MS; // Contrat supposé — voir en-tête.

const PATH_CONNEXION_RE = /^\/admin\/connexion\/?$/;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all<T = unknown>(): Promise<{ results: T[] }> };
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

interface DBLike {
  prepare(query: string): InstructionLike;
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

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  if (!schemaPret) {
    schemaPret = (async () => {
      const module = await import('../../migrations/0003_sessions.sql?raw');
      for (const requete of separerRequetes(module.default)) {
        await db.prepare(requete).run();
      }
      try {
        await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
      } catch {
        // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
      }
    })();
  }
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  try {
    await db.prepare(`delete from ${TABLE_SESSIONS}`).run();
  } catch (erreur) {
    console.warn('nettoyage D1 ignoré (schéma absent, rouge attendu) :', erreur);
  }
});

async function semerSession(
  db: DBLike,
  options: {
    id: string;
    identifiantAppareil: string;
    creeeLe: number;
    dernierUsageLe: number;
  },
): Promise<void> {
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(options.id, options.identifiantAppareil, options.creeeLe, options.dernierUsageLe)
    .run();
}

async function lireDernierUsage(db: DBLike, id: string): Promise<number | null> {
  const resultat = await db
    .prepare(`select dernier_usage_le from ${TABLE_SESSIONS} where id = ?1`)
    .bind(id)
    .all<{ dernier_usage_le: number | null }>();
  return resultat.results[0]?.dernier_usage_le ?? null;
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

/**
 * Remplace la liaison `DB` par une enveloppe qui compte les écritures
 * (`insert`/`update`) ciblant `sessions` — voir « c4 » en tête de fichier.
 * `restaurer()` remet la liaison d'origine.
 */
function poserEspionEcheresSessions(dbOriginal: DBLike): {
  obtenirCompte(): number;
  restaurer(): void;
} {
  let compte = 0;
  const enveloppe = env as unknown as Record<string, unknown>;
  const precedent = enveloppe.DB;
  const ciblesEcriture = /\b(insert\s+into|update)\s+sessions\b/i;

  enveloppe.DB = {
    prepare(query: string): InstructionLike {
      const instruction = dbOriginal.prepare(query);
      if (!ciblesEcriture.test(query)) return instruction;
      return {
        bind(...valeurs: unknown[]) {
          const liee = instruction.bind(...valeurs);
          return {
            run: async () => {
              compte += 1;
              return liee.run();
            },
            all: () => liee.all(),
          };
        },
        run: async () => {
          compte += 1;
          return instruction.run();
        },
        all: () => instruction.all(),
      };
    },
  } satisfies DBLike;

  return {
    obtenirCompte: () => compte,
    restaurer: () => {
      enveloppe.DB = precedent;
    },
  };
}

async function effectuerRafaleDeRequetes(cookieSession: string, nombre: number): Promise<void> {
  for (let i = 0; i < nombre; i += 1) {
    await accederAAccueil(cookieSession);
  }
}

// --- c1 — une session restée sept jours sans usage ne donne plus accès, et renvoie vers la connexion ---

it('une session dont le dernier usage remonte à plus de sept jours redirige vers l’écran de connexion', async () => {
  const db = await assurerSchema();
  const maintenant = Date.now();
  const ilYAPlusDeSeptJours = maintenant - SEPT_JOURS_MS - UN_JOUR_MS;
  await semerSession(db, {
    id: 'jeton-c1-sept-jours-inactive',
    identifiantAppareil: 'appareil-c1',
    creeeLe: ilYAPlusDeSeptJours,
    dernierUsageLe: ilYAPlusDeSeptJours,
  });

  const reponse = await accederAAccueil('jeton-c1-sept-jours-inactive');

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_CONNEXION_RE);
});

// --- c2 — une session de plus de trente jours ne donne plus accès, même utilisée chaque jour ---

it('une session ouverte il y a plus de trente jours redirige vers la connexion, même si elle vient d’être utilisée', async () => {
  const db = await assurerSchema();
  const maintenant = Date.now();
  const ilYAPlusDeTrenteJours = maintenant - TRENTE_JOURS_MS - UN_JOUR_MS;
  await semerSession(db, {
    id: 'jeton-c2-trente-jours-butee',
    identifiantAppareil: 'appareil-c2',
    creeeLe: ilYAPlusDeTrenteJours,
    dernierUsageLe: maintenant - 1_000, // « utilisée » il y a une seconde : simule un usage quotidien jusqu'à aujourd'hui.
  });

  const reponse = await accederAAccueil('jeton-c2-trente-jours-butee');

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(cheminDeLocation(reponse)).toMatch(PATH_CONNEXION_RE);
});

// --- c3 — un usage à l'intérieur de la fenêtre repousse l'échéance des sept jours ---

it('accéder à l’accueil à l’intérieur de la fenêtre des sept jours repousse la date de dernier usage en base', async () => {
  const db = await assurerSchema();
  const maintenant = Date.now();
  const justeAvantSeptJours = maintenant - SEPT_JOURS_MS + 60 * 60 * 1000; // à une heure de l'échéance.
  await semerSession(db, {
    id: 'jeton-c3-usage-repousse',
    identifiantAppareil: 'appareil-c3',
    creeeLe: justeAvantSeptJours,
    dernierUsageLe: justeAvantSeptJours,
  });

  const reponse = await accederAAccueil('jeton-c3-usage-repousse');
  const dernierUsageApres = await lireDernierUsage(db, 'jeton-c3-usage-repousse');

  expect(reponse.status).toBe(200);
  expect(dernierUsageApres).not.toBeNull();
  expect(dernierUsageApres as number).toBeGreaterThan(justeAvantSeptJours);
  expect(maintenant - (dernierUsageApres as number)).toBeLessThan(60 * 1000);
});

// --- c4 — le rafraîchissement n'écrit pas en base à chaque requête ---

it('une rafale de requêtes immédiates sur une session proche de l’échéance ne déclenche qu’une seule écriture', async () => {
  const db = await assurerSchema();
  const maintenant = Date.now();
  const procheDeSeptJours = maintenant - SEPT_JOURS_MS + 60 * 60 * 1000; // à une heure de l'échéance : un rafraîchissement est attendu.
  await semerSession(db, {
    id: 'jeton-c4-rafale',
    identifiantAppareil: 'appareil-c4',
    creeeLe: procheDeSeptJours,
    dernierUsageLe: procheDeSeptJours,
  });
  const espion = poserEspionEcheresSessions(db);

  try {
    await effectuerRafaleDeRequetes('jeton-c4-rafale', 3);
  } finally {
    espion.restaurer();
  }

  const compte = espion.obtenirCompte();
  expect(compte).toBeGreaterThan(0);
  expect(compte).toBeLessThan(3);
});

// --- c5 — plusieurs sessions ouvertes coexistent sans que rien ne les compte ni ne les ferme ---

it('une session valide reste accessible avant et après qu’une autre, expirée, ait été refusée', async () => {
  const db = await assurerSchema();
  const maintenant = Date.now();
  const recente = maintenant - UN_JOUR_MS;
  const ilYAPlusDeSeptJours = maintenant - SEPT_JOURS_MS - UN_JOUR_MS;
  await semerSession(db, {
    id: 'jeton-c5-active',
    identifiantAppareil: 'appareil-c5-actif',
    creeeLe: recente,
    dernierUsageLe: recente,
  });
  await semerSession(db, {
    id: 'jeton-c5-expiree',
    identifiantAppareil: 'appareil-c5-inactif',
    creeeLe: ilYAPlusDeSeptJours,
    dernierUsageLe: ilYAPlusDeSeptJours,
  });

  const avant = await accederAAccueil('jeton-c5-active');
  const autreSession = await accederAAccueil('jeton-c5-expiree');
  const apres = await accederAAccueil('jeton-c5-active');

  expect(avant.status).toBe(200);
  expect(REDIRECT_STATUSES).toContain(autreSession.status);
  expect(cheminDeLocation(autreSession)).toMatch(PATH_CONNEXION_RE);
  expect(apres.status).toBe(200);
});
