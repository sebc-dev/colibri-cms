/**
 * Le magasin de l'état publié (change 011-apercu-et-publication, ticket 01 ;
 * migration 0010, ADR-0019). Lecture seule : l'écriture par la publication
 * relève d'un autre ticket. Même patron que les magasins de brouillons :
 * table recréée défensivement au premier accès, requêtes D1 préparées
 * exclusivement, ligne de forme inattendue tenue pour absente.
 *
 * Zone `platform` : n'importe que `core/` (I1) ; la superposition
 * déclaration < publié < brouillon se fait en `core/`, sur les données lues ici.
 */
import type { Brouillon, ContenuCorrige } from '../../core/pages/brouillon.ts';
import type { ContenuOptions } from '../../core/formulaires/options.ts';

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<unknown>;
      all(): Promise<{ results: unknown[] }>;
    };
  };
}

export type NomReglagePublie = 'coordonnees' | 'reseaux' | 'mention';

/** Les réglages publiés présents, par réglage (contenu JSON décodé). */
export type ReglagesPublies = Partial<Record<NomReglagePublie, unknown>>;

const DEFINITIONS = [
  `create table if not exists publies_emplacements (
      page_slug text not null,
      id_emplacement text not null,
      nature text not null,
      contenu text not null,
      publie_le integer not null,
      primary key (page_slug, id_emplacement)
    )`,
  `create table if not exists publies_reglages (
      reglage text primary key check (reglage in ('coordonnees', 'reseaux', 'mention')),
      contenu text not null,
      publie_le integer not null
    )`,
  `create table if not exists publies_formulaires (
      formulaire text primary key,
      contenu text not null,
      publie_le integer not null
    )`,
];

let schemaAssure: Promise<void> | null = null;

/** Recrée les trois tables si absentes — mêmes définitions que la migration 0010. */
async function assurerTablesPubliees(db: DB): Promise<void> {
  schemaAssure ??= (async () => {
    for (const definition of DEFINITIONS) {
      await db.prepare(definition).bind().run();
    }
  })().then(
    () => undefined,
    (erreur: unknown) => {
      schemaAssure = null;
      throw erreur;
    },
  );
  await schemaAssure;
}

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function decoder(contenu: string): unknown {
  try {
    return JSON.parse(contenu) as unknown;
  } catch {
    return undefined;
  }
}

interface LigneEmplacement {
  readonly id_emplacement: string;
  readonly contenu: string;
}

/** La dernière version publiée des emplacements d'une page (clé = identifiant d'emplacement). */
export async function obtenirPublieEmplacements(db: DB, slugPage: string): Promise<Brouillon> {
  await assurerTablesPubliees(db);
  const resultat = await db
    .prepare('select id_emplacement, contenu from publies_emplacements where page_slug = ?1')
    .bind(slugPage)
    .all();
  const publie = new Map<string, ContenuCorrige>();
  for (const ligne of resultat.results as LigneEmplacement[]) {
    const lu = decoder(ligne.contenu);
    if (estObjet(lu) && typeof lu.nature === 'string') {
      publie.set(ligne.id_emplacement, lu as unknown as ContenuCorrige);
    }
  }
  return publie;
}

interface LigneReglage {
  readonly reglage: string;
  readonly contenu: string;
}

/** Les réglages publiés ; une ligne illisible est ignorée. */
export async function obtenirPubliesReglages(db: DB): Promise<ReglagesPublies> {
  await assurerTablesPubliees(db);
  const resultat = await db.prepare('select reglage, contenu from publies_reglages').bind().all();
  const publies: ReglagesPublies = {};
  for (const ligne of resultat.results as LigneReglage[]) {
    if (ligne.reglage !== 'coordonnees' && ligne.reglage !== 'reseaux' && ligne.reglage !== 'mention') continue;
    const lu = decoder(ligne.contenu);
    if (lu !== undefined) publies[ligne.reglage] = lu;
  }
  return publies;
}

interface LigneFormulaire {
  readonly contenu: string;
}

/** La dernière version publiée d'un formulaire, ou `undefined` s'il n'en a jamais eu. */
export async function obtenirPublieFormulaire(
  db: DB,
  formulaire: string,
): Promise<ContenuOptions | undefined> {
  await assurerTablesPubliees(db);
  const resultat = await db
    .prepare('select contenu from publies_formulaires where formulaire = ?1')
    .bind(formulaire)
    .all();
  const ligne = (resultat.results as LigneFormulaire[]).at(0);
  if (ligne === undefined) return undefined;
  const lu = decoder(ligne.contenu);
  if (!estObjet(lu) || !estObjet(lu.champs)) return undefined;
  const derniersNumeros = estObjet(lu.derniersNumeros) ? lu.derniersNumeros : {};
  return { champs: lu.champs, derniersNumeros } as unknown as ContenuOptions;
}
