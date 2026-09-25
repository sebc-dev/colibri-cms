/**
 * Ticket 02 — La liste des pages
 * (openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md).
 *
 * Couture retenue, à l'image de `code-ouvre-la-session.test.ts` et
 * `fin-de-session.test.ts` (SPEC.md § Décisions de test, ADR-0003) : requête
 * HTTP réelle via `exports.default.fetch` contre le worker compilé, dans `workerd`,
 * contre la vraie D1 locale — jamais de double interne. La table `sessions`
 * n'a besoin d'aucun parcours de connexion complet pour ce ticket : une
 * ligne y est semée directement (même geste que `fin-de-session.test.ts`),
 * ce qui suffit à `verifierSession` (`src/platform/session/index.ts`) pour
 * ouvrir l'accès à la route gardée.
 *
 * Les tests s'appuient sur les trois `page.json` réels du dépôt
 * (`content/pages/{accueil,tarifs,contact}/page.json`, rangs 0/1/2) : ce
 * fichier ne sème aucune fixture de déclaration, il lit celle déjà posée
 * (ADR-0012 — la déclaration est un geste d'intégration, jamais un geste de
 * test qui l'imiterait par un double).
 *
 * SC-02a et SC-02e ont été retirés avant le change 005 (mise en page de
 * l'administration) : SC-02a exigeait qu'une ligne contienne exactement le
 * titre, ce que l'adresse ajoutée sous le titre rend faux ; SC-02e cherchait
 * le point de montage `#ilot-cadre`, que le cadre rendu par le serveur fait
 * disparaître. Leurs remplaçants — l'ordre des lignes avec leur adresse, et
 * le cadre présent dès la réponse — sont portés par les tickets 07 et 03 de
 * ce change.
 *
 * SC-02b (l'état vide) ne se prête pas à cette même requête HTTP : les trois
 * `page.json` réels sont présents sur toute instance de ce dépôt, et ce
 * fichier ne les retire ni ne les double — voir
 * `tests/static/liste-des-pages-statique.test.ts`, qui prouve l'état vide au
 * niveau du modèle pur (`trierPagesDeclarees`, ADR-0012) et de la structure
 * de la route, sans requête.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  try {
    await db.prepare(`delete from ${TABLE_SESSIONS}`).run();
  } catch (erreur) {
    console.warn('nettoyage D1 ignoré (schéma absent) :', erreur);
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-liste-des-pages-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function accederAMesPages(cookieSession: string): Promise<Response> {
  return exports.default.fetch(new Request(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
}

// --- SC-02c — aucun geste d'ajout, de retrait, de déplacement ni de renommage de page ---

it('SC-02c — la liste ne présente aucun geste d’ajout, de retrait, de déplacement ni de renommage', async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  const reponse = await accederAMesPages(cookieSession);

  const corps = await reponse.text();
  expect(corps).not.toMatch(/<form[\s>]/i);
  expect(corps).not.toMatch(/<button[\s>]/i);
  expect(corps).not.toMatch(/<input[\s>]/i);
  const corpsMinuscule = corps.toLowerCase();
  for (const geste of ['ajouter une page', 'créer une page', 'supprimer', 'renommer', 'déplacer']) {
    expect(corpsMinuscule, `la liste ne devrait pas offrir « ${geste} »`).not.toContain(geste);
  }
});

// --- SC-02d — aucun terme de développeur dans la liste ---

it('SC-02d — la liste ne porte aucun terme de développeur', async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  const reponse = await accederAMesPages(cookieSession);

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
    'slug',
  ];
  for (const terme of termesDeveloppeur) {
    expect(corps, `la liste ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});
