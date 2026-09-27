/**
 * Ticket 05 — La marque de brouillon, la même partout
 * (openspec/changes/005-mise-en-page-administration/tickets/05-marque-de-brouillon.md).
 *
 * Couture retenue, même patron que `corriger-bouton-action.test.ts`
 * (ticket 04, change 003) : requête HTTP réelle via `exports.default.fetch`
 * contre le worker compilé, dans `workerd`, contre la vraie D1 locale
 * (ADR-0003) — jamais de double interne. Les migrations `0003_sessions.sql`
 * et `0004_brouillons_emplacements.sql` sont rejouées ici même, une session
 * valide est semée directement, et une correction de bouton d'action est
 * enregistrée sur `content/pages/accueil/page.json` (emplacement réel
 * `bouton-devis`, déjà utilisé par `corriger-bouton-action.test.ts`) pour
 * que la page « accueil » porte un brouillon — ce fichier ne sème aucune
 * fixture de déclaration, il s'appuie sur celle déjà posée (ADR-0012).
 *
 * SC-05a/b se prouvent tous deux sur la même moitié observable par une
 * requête HTTP réelle : le rendu serveur, avant toute exécution de script
 * par un navigateur (`workerd` n'en exécute aucun). Le geste qui révèle la
 * marque sans recharger (`afficherPastilleDeBrouillon`, cloneNode d'un
 * `<template>`) n'est, lui, pas observable par ce moyen — sa moitié
 * statique (clonage, garde anti-doublon) vit dans
 * `tests/static/marque-de-brouillon-statique.test.ts`, comme SC-05c.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const ROUTE_ACCUEIL_BOUTON = 'https://example.com/admin/pages/accueil/emplacements/bouton-devis';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';
const ROUTE_EDITEUR_ACCUEIL = 'https://example.com/admin/pages/accueil';

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
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
    const brouillons = await import('../../migrations/0004_brouillons_emplacements.sql?raw');
    for (const requete of separerRequetes(brouillons.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-marque-de-brouillon-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function marquerAccueilCommeBrouillon(cookieSession: string): Promise<void> {
  const reponse = await exports.default.fetch(new Request(ROUTE_ACCUEIL_BOUTON, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `${NOM_COOKIE_SESSION}=${cookieSession}`,
    },
    body: JSON.stringify({ libelle: 'Obtenir un devis gratuit', destination: '/contact' }),
  }));
  expect(reponse.status).toBe(200);
}

async function recupererCorps(route: string, cookieSession: string): Promise<string> {
  const reponse = await exports.default.fetch(new Request(route, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  expect(reponse.status).toBe(200);
  return reponse.text();
}

/**
 * Extrait la marque de brouillon (le `<span data-pastille-brouillon>…`
 * rendu par `MarqueBrouillon.astro`) de n'importe quel fragment de HTML qui
 * la contient — que ce soit une `<li>`, la zone `#zone-pastille-brouillon`,
 * ou le `<template>` du gabarit. La capture non gourmande s'arrête à la
 * première `</span>` rencontrée (celle du point décoratif imbriqué), avant
 * de reprendre jusqu'à la fermeture de la marque elle-même : la structure
 * imbriquée d'un seul niveau rend cette capture sans ambiguïté.
 */
function extraireMarque(html: string): string | undefined {
  return /<span[^>]*data-pastille-brouillon[^>]*>[\s\S]*?<\/span>[\s\S]*?Brouillon[\s\S]*?<\/span>/.exec(html)?.[0];
}

// --- SC-05a — la même marque, en gorge, avec le libellé « Brouillon »,
// sur la ligne de « Mes pages » et dans le titre de l'éditeur ---

it('SC-05a — une page qui porte un brouillon montre la même marque « Brouillon », en gorge, sur sa ligne de Mes pages et dans le titre de son éditeur', async () => {
  // Arrange : une session valide, et un brouillon enregistré sur « accueil ».
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  await marquerAccueilCommeBrouillon(cookieSession);

  // Act : les deux écrans qui doivent porter la marque.
  const corpsListe = await recupererCorps(ROUTE_MES_PAGES, cookieSession);
  const corpsEditeur = await recupererCorps(ROUTE_EDITEUR_ACCUEIL, cookieSession);

  // Assert : la ligne « Accueil » de la liste porte la marque…
  const ligneAccueil = /<li>Accueil[\s\S]*?<\/li>/.exec(corpsListe)?.[0] ?? '';
  const marqueListe = extraireMarque(ligneAccueil);
  expect(marqueListe, 'la ligne « Accueil » devrait porter la marque de brouillon').toBeDefined();
  expect(marqueListe).toMatch(/text-gorge/);
  expect(marqueListe).toMatch(/bg-gorge-soft/);
  expect(marqueListe).toMatch(/rounded-full/);
  expect(marqueListe).toContain('Brouillon');

  // …et le titre de l'éditeur porte, dans sa zone dédiée, exactement la même marque.
  const zoneEditeur = /<span id="zone-pastille-brouillon">[\s\S]*?<\/span>\s*<\/h1>/.exec(corpsEditeur)?.[0] ?? '';
  const marqueEditeur = extraireMarque(zoneEditeur);
  expect(marqueEditeur, 'le titre de l’éditeur devrait porter la marque de brouillon').toBeDefined();
  expect(marqueEditeur).toBe(marqueListe);
});

// --- SC-05b — le modèle inerte servi par le gabarit et la marque rendue
// par le serveur, sur un écran qui porte un brouillon, sont identiques ---

it('SC-05b — le modèle « modele-marque-brouillon » servi dans la réponse est identique à la marque rendue par le serveur, et n’apparaît qu’une fois', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  await marquerAccueilCommeBrouillon(cookieSession);

  // Act : la réponse de « Mes pages » porte à la fois la marque rendue
  // (la page « accueil » porte un brouillon) et, une fois, le modèle inerte
  // que `pastille-brouillon.ts` clonera après un enregistrement sans
  // recharger.
  const corps = await recupererCorps(ROUTE_MES_PAGES, cookieSession);

  // Assert : le modèle n'apparaît qu'une seule fois dans la réponse.
  const occurrencesModele = corps.match(/id="modele-marque-brouillon"/g) ?? [];
  expect(occurrencesModele).toHaveLength(1);

  // …et son contenu est, caractère pour caractère, la même marque que celle
  // rendue à même la ligne « Accueil ».
  const contenuModele = /<template id="modele-marque-brouillon">([\s\S]*?)<\/template>/.exec(corps)?.[1];
  expect(contenuModele, 'le modèle inerte devrait être présent dans la réponse').toBeDefined();
  const marqueDuModele = extraireMarque(contenuModele ?? '');
  expect(marqueDuModele).toBeDefined();

  const ligneAccueil = /<li>Accueil[\s\S]*?<\/li>/.exec(corps)?.[0] ?? '';
  const marqueRendue = extraireMarque(ligneAccueil);
  expect(marqueRendue).toBeDefined();

  expect(marqueDuModele).toBe(marqueRendue);
});
