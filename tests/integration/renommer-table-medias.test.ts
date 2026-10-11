/**
 * Le renommage de la table des images — PR directe posée avant les tickets du
 * change 011-apercu-et-publication (design D4, ADR-0020).
 *
 * `migrations/0009_medias.sql` renomme `medias_brouillon` (0005, 0006) en
 * `medias` et lui ajoute les trois colonnes de l'état publié. Deux promesses,
 * éprouvées contre la vraie D1 locale (ADR-0014), sans simulacre :
 * - le renommage garde chaque ligne telle quelle, et les colonnes ajoutées
 *   sont vides ;
 * - le rejeu défensif du magasin (`assurerTableMedias`, appelé par chaque
 *   fonction exportée de `src/platform/medias/magasin.ts`) ne recrée jamais
 *   `medias_brouillon` sur une base déjà renommée.
 *
 * Aucun critère `SC-…` : ce renommage ne livre aucun comportement nouveau.
 */
import { env } from 'cloudflare:workers';
import { it, expect } from 'vitest';
import { listerMediasBrouillon } from '../../src/platform/medias/magasin.ts';

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

async function appliquer(db: DBLike, migration: string): Promise<void> {
  for (const requete of separerRequetes(migration)) {
    await db.prepare(requete).run();
  }
}

async function tableExiste(db: DBLike, table: string): Promise<boolean> {
  try {
    await db.prepare(`select 1 from ${table} limit 0`).all();
    return true;
  } catch {
    return false;
  }
}

/** Amène la base à l'état renommé, sans jamais rejouer 0005 sur une base déjà renommée. */
async function assurerBaseRenommee(db: DBLike): Promise<void> {
  if (await tableExiste(db, 'medias')) return;
  await appliquer(db, (await import('../../migrations/0005_medias_brouillon.sql?raw')).default);
  await appliquer(db, (await import('../../migrations/0006_medias_brouillon_affichage.sql?raw')).default);
  await appliquer(db, (await import('../../migrations/0009_medias.sql?raw')).default);
}

it('le renommage garde chaque ligne de `medias_brouillon` dans `medias`, et les trois colonnes ajoutées y sont vides', async () => {
  const db = obtenirDB();
  // Part d'une base où ni l'une ni l'autre table n'existe, quel que soit l'ordre des tests.
  for (const table of ['medias', 'medias_brouillon']) {
    if (await tableExiste(db, table)) {
      await db.prepare(`drop table ${table}`).run();
    }
  }
  await appliquer(db, (await import('../../migrations/0005_medias_brouillon.sql?raw')).default);
  await appliquer(db, (await import('../../migrations/0006_medias_brouillon_affichage.sql?raw')).default);
  const octets = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await db
    .prepare(
      'insert into medias_brouillon (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, nom_affichage, description) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)',
    )
    .bind('media-avant-renommage', 'gateau.png', 'png', 640, 480, octets.byteLength, octets, 1_700_000_000_000, 'Gâteau', 'Gâteau à la fraise')
    .run();

  await appliquer(db, (await import('../../migrations/0009_medias.sql?raw')).default);

  const { results } = await db.prepare('select * from medias').all();
  expect(results).toHaveLength(1);
  const ligne = results[0] as Record<string, unknown>;
  expect(ligne).toMatchObject({
    id: 'media-avant-renommage',
    nom_origine: 'gateau.png',
    format: 'png',
    largeur: 640,
    hauteur: 480,
    poids_octets: octets.byteLength,
    creee_le: 1_700_000_000_000,
    nom_affichage: 'Gâteau',
    description: 'Gâteau à la fraise',
    publiee_le: null,
    description_publiee: null,
    empreinte_depot: null,
  });
  expect(Array.from(new Uint8Array(ligne.octets as ArrayBuffer))).toEqual(Array.from(octets));
  expect(await tableExiste(db, 'medias_brouillon')).toBe(false);
});

it('sur une base déjà renommée, le rejeu défensif du magasin lit `medias` sans recréer `medias_brouillon`', async () => {
  const db = obtenirDB();
  await assurerBaseRenommee(db);

  await listerMediasBrouillon(db, new Set());

  expect(await tableExiste(db, 'medias')).toBe(true);
  expect(await tableExiste(db, 'medias_brouillon')).toBe(false);
});
