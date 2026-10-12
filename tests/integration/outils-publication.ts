/**
 * Outils partagés des tests de la publication (change 011, ticket 15) : schéma
 * de la vraie D1 locale, nettoyage, semis des brouillons et de l'état publié.
 * Aucun double ici : le seul double du ticket est le dépôt en mémoire.
 */
import { env } from 'cloudflare:workers';
import { expect } from 'vitest';

export const NOM_COOKIE_SESSION = '__Host-session';
export const BASE = 'https://example.com';

const TABLES = [
  'sessions',
  'brouillons_emplacements',
  'brouillons_reglages',
  'brouillons_formulaires',
  'publies_emplacements',
  'publies_reglages',
  'publies_formulaires',
  'medias',
  'publication',
];

interface Liee {
  run(): Promise<{ meta: { changes: number } }>;
  all(): Promise<{ results: unknown[] }>;
}
interface InstructionLike {
  bind(...valeurs: unknown[]): Liee;
  run(): Promise<unknown>;
}
export interface DBLike {
  prepare(query: string): InstructionLike;
  batch(instructions: readonly unknown[]): Promise<unknown[]>;
}

export function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

// Les originales empaquetées (`medias/`), lues telles quelles. La route de la suite les lit par la
// liaison ASSETS, à des adresses que seul le site construit connaît : vues d'un test, elles ne
// mènent nulle part. Mêmes fichiers, mêmes octets.
const ORIGINALES_EN_LIGNE = import.meta.glob<string>('/medias/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?inline',
  import: 'default',
});

function octetsDeLAdresseEnLigne(adresse: string): Uint8Array {
  const base64 = adresse.slice(adresse.indexOf(',') + 1);
  return Uint8Array.from(atob(base64), (caractere) => caractere.codePointAt(0) ?? 0);
}

/** Le lecteur des originales empaquetées : les octets de `medias/<id>.<ext>`, `null` sans originale. */
export function lecteurDesOriginales(): (id: string) => Promise<Uint8Array | null> {
  return (id) => {
    for (const [chemin, adresse] of Object.entries(ORIGINALES_EN_LIGNE)) {
      const nom = chemin.slice(chemin.lastIndexOf('/') + 1);
      if (nom.slice(0, nom.lastIndexOf('.')) === id) return Promise.resolve(octetsDeLAdresseEnLigne(adresse));
    }
    return Promise.resolve(null);
  };
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
export async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const modules = [
      await import('../../migrations/0003_sessions.sql?raw'),
      await import('../../migrations/0004_brouillons_emplacements.sql?raw'),
      await import('../../migrations/0005_medias_brouillon.sql?raw'),
      await import('../../migrations/0006_medias_brouillon_affichage.sql?raw'),
      await import('../../migrations/0007_brouillons_reglages.sql?raw'),
      await import('../../migrations/0008_brouillons_formulaires.sql?raw'),
      await import('../../migrations/0009_medias.sql?raw'),
      await import('../../migrations/0010_etat_publie.sql?raw'),
      await import('../../migrations/0011_publication.sql?raw'),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà appliqué : sans effet.
        }
      }
    }
    try {
      await db.prepare('alter table sessions add column dernier_usage_le integer').run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

/** Vide les tables, puis remet la ligne unique de la publication. */
export async function nettoyer(): Promise<void> {
  const db = obtenirDB();
  for (const table of TABLES) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
  try {
    await db.prepare('insert or ignore into publication (id) values (1)').run();
  } catch (erreur) {
    console.warn('ligne de publication ignorée :', erreur);
  }
}

export async function semerSession(db: DBLike): Promise<string> {
  const id = `session-publication-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

export async function semerBrouillonEmplacement(
  db: DBLike,
  slug: string,
  idEmplacement: string,
  contenu: Record<string, unknown>,
  majLe: number = Date.now(),
): Promise<void> {
  await db
    .prepare(
      `insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)
       on conflict(page_slug, id_emplacement) do update set contenu = excluded.contenu, maj_le = excluded.maj_le`,
    )
    .bind(slug, idEmplacement, String(contenu.nature), JSON.stringify(contenu), majLe)
    .run();
}

export async function semerBrouillonReglage(db: DBLike, reglage: string, contenu: unknown): Promise<void> {
  await db
    .prepare('insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)')
    .bind(reglage, JSON.stringify(contenu), Date.now())
    .run();
}

export async function semerBrouillonFormulaire(db: DBLike, formulaire: string, contenu: unknown): Promise<void> {
  await db
    .prepare('insert into brouillons_formulaires (formulaire, contenu, maj_le) values (?1, ?2, ?3)')
    .bind(formulaire, JSON.stringify(contenu), Date.now())
    .run();
}

export async function semerPublieEmplacement(
  db: DBLike,
  slug: string,
  idEmplacement: string,
  contenu: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      'insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(slug, idEmplacement, String(contenu.nature), JSON.stringify(contenu), Date.now())
    .run();
}

export async function semerImage(db: DBLike, id: string, octets: Uint8Array<ArrayBuffer>): Promise<void> {
  await db
    .prepare(
      `insert into medias (id, nom_origine, nom_affichage, description, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, 'png', 10, 10, ?5, ?6, ?7)`,
    )
    .bind(id, `${id}.png`, id, 'Une image', octets.length, octets, Date.now())
    .run();
}

export async function lireLignes(db: DBLike, requete: string, ...valeurs: unknown[]): Promise<unknown[]> {
  return (await db.prepare(requete).bind(...valeurs).all()).results;
}

export async function compter(db: DBLike, table: string, condition = '1 = 1', ...valeurs: unknown[]): Promise<number> {
  const lignes = (await lireLignes(db, `select count(*) as n from ${table} where ${condition}`, ...valeurs)) as {
    n: number;
  }[];
  return lignes[0]?.n ?? Number.NaN;
}

export function exigerPresent<T>(valeur: T | undefined | null, quoi: string): T {
  expect(valeur, quoi).toBeDefined();
  expect(valeur, quoi).not.toBeNull();
  return valeur as T;
}
