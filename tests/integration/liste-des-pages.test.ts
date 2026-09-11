/**
 * Ticket 02 — La liste des pages
 * (openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md).
 *
 * Couture retenue, à l'image de `code-ouvre-la-session.test.ts` et
 * `fin-de-session.test.ts` (SPEC.md § Décisions de test, ADR-0003) : requête
 * HTTP réelle via `SELF.fetch` contre le worker compilé, dans `workerd`,
 * contre la vraie D1 locale — jamais de double interne. La table `sessions`
 * n'a besoin d'aucun parcours de connexion complet pour ce ticket : une
 * ligne y est semée directement (même geste que `fin-de-session.test.ts`),
 * ce qui suffit à `verifierSession` (`src/platform/session/index.ts`) pour
 * ouvrir l'accès à la route gardée.
 *
 * SC-02a s'appuie sur les trois `page.json` réels du dépôt
 * (`content/pages/{accueil,tarifs,contact}/page.json`, rangs 0/1/2) : ce
 * fichier ne sème aucune fixture de déclaration, il lit celle déjà posée
 * (ADR-0012 — la déclaration est un geste d'intégration, jamais un geste de
 * test qui l'imiterait par un double).
 *
 * SC-02b (l'état vide) ne se prête pas à cette même requête HTTP : les trois
 * `page.json` réels sont présents sur toute instance de ce dépôt, et ce
 * fichier ne les retire ni ne les double — voir
 * `tests/static/liste-des-pages-statique.test.ts`, qui prouve l'état vide au
 * niveau du modèle pur (`trierPagesDeclarees`, ADR-0012) et de la structure
 * de la route, sans requête.
 *
 * SC-02e : depuis l'arbitrage du chantier
 * docs/chantiers/en-cours/2026-09-07-run-liste-des-pages-02.md (point 3), la
 * liste (titre + `<li>` ou message d'état vide) est rendue à même le corps
 * de la réponse, dans le point de montage `#ilot-cadre` — jamais dans un
 * `<template>` inerte : c'est ce qui garde SC-02a-d observables par une
 * requête HTTP réelle, sans exécuter de JavaScript. Le test SC-02e ci-dessous
 * ne prouve donc que cette moitié « rendu HTTP » du critère : le point de
 * montage est présent et enveloppe directement ce contenu, et le `<script>`
 * qui doit transporter le cadre (barre latérale + menu, ticket 01) autour de
 * lui, côté client, est bien présent dans la réponse. La moitié
 * « assemblage » elle-même — le cadre effectivement visible autour de la
 * liste dans un navigateur — n'est pas observable ici : l'îlot `Cadre` est
 * monté par script seul (ADR-0006) et `workerd` n'exécute aucun DOM ; elle
 * se vérifie en `observé` (voir le ticket, section « Vérif »).
 */
/// <reference types="@cloudflare/vitest-plugin/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';

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
    console.warn('nettoyage D1 ignoré (schéma absent) :', erreur);
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-liste-des-pages-${Math.random().toString(36).slice(2)}`;
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
  return SELF.fetch(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  });
}

// --- SC-02a — les pages déclarées s'affichent dans l'ordre posé, une ligne par page ---

it('SC-02a — la liste des pages affiche une ligne par page déclarée, dans l’ordre posé', async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  const reponse = await accederAMesPages(cookieSession);

  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const lignes = [...corps.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((correspondance) =>
    correspondance[1].trim(),
  );

  // Une ligne par page déclarée (`content/pages/{accueil,tarifs,contact}/page.json`) —
  // ni plus, ni moins — dans l'ordre du rang posé (0, 1, 2), jamais un ordre recalculé.
  expect(lignes).toEqual(['Accueil', 'Tarifs', 'Contact']);
});

// --- SC-02e (moitié observable par requête HTTP) — le contenu de l'écran est rendu à même
// la réponse, dans le point de montage du cadre, prêt à être transporté côté client ---

it('SC-02e — le point de montage du cadre est présent et enveloppe directement le contenu de l’écran, avec le script qui doit le transporter', async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  const reponse = await accederAMesPages(cookieSession);

  const corps = await reponse.text();
  const indexPointDeMontage = corps.indexOf('<div id="ilot-cadre">');
  const indexTitre = corps.indexOf('<h1>Mes pages</h1>');

  // Le point de montage existe et précède le titre : le titre (et la liste) sont bien
  // rendus À L'INTÉRIEUR de ce nœud, pas ailleurs dans le corps de la réponse.
  expect(indexPointDeMontage).toBeGreaterThanOrEqual(0);
  expect(indexTitre).toBeGreaterThan(indexPointDeMontage);

  // Jamais dans un gabarit inerte : le contenu est littéralement dans le DOM de la
  // réponse, observable sans exécuter de JavaScript (approche <template> annulée).
  expect(corps).not.toMatch(/<template[\s>]/i);

  // Le script qui doit transporter le cadre (barre latérale + menu) autour de ce
  // contenu, côté client, est bien référencé dans la réponse — Astro/Vite le
  // bundle en un fichier externe (`<script type="module" src>`, jamais son texte
  // en clair, cf. `src/admin/ilots-svelte-5/monter.ts` § en-tête) : c'est cette
  // référence qui est observable ici, jamais son exécution — la partie qui reste
  // vérifiée en `observé`, c'est l'assemblage effectif dans un navigateur.
  expect(corps).toMatch(/<script\s+type="module"\s+src="[^"]+"><\/script>/);
});

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
