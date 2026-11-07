/**
 * Le magasin des brouillons de formulaires (ticket 05, migration 0008). Même
 * patron que `src/platform/reglages/magasin.ts` : lire le brouillon courant,
 * appliquer en `core/`, écrire ssi acceptée. Zone `platform` (I1) : importe
 * `core/` et, pour l'état publié d'un formulaire (sa liste et son compteur
 * `derniersNumeros`, ADR-0026), `src/platform/publication/magasin-publie.ts`,
 * seul propriétaire de `publies_formulaires` (ADR-0019). Requêtes D1 préparées
 * exclusivement ; aucune valeur saisie n'est journalisée.
 */
import {
  appliquerOptions,
  numerosDuBrouillon,
  type ContenuOptions,
  type ResultatOptions,
} from '../../core/formulaires/options.ts';
import type { FormulaireDeclare } from '../../core/formulaires/declaration.ts';
import { obtenirPublieFormulaire } from '../publication/magasin-publie.ts';
import { lotSiAucunePublicationEnCours, type DB as DBPublication } from '../publication/magasin.ts';

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<unknown>;
      all(): Promise<{ results: unknown[] }>;
    };
  };
}

let schemaAssure: Promise<void> | null = null;

/** Recrée `brouillons_formulaires` si absente — même définition que la migration 0008. */
async function assurerTableBrouillonsFormulaires(db: DB): Promise<void> {
  schemaAssure ??= db
    .prepare(
      `create table if not exists brouillons_formulaires (
          formulaire text primary key,
          contenu text not null,
          maj_le integer not null
        )`,
    )
    .bind()
    .run()
    .then(
      () => undefined,
      (erreur: unknown) => {
        schemaAssure = null;
        throw erreur;
      },
    );
  await schemaAssure;
}

let schemaNumerosAssure: Promise<void> | null = null;

/** Recrée `numeros_options` si absente — même définition que la migration 0015. */
async function assurerTableNumerosOptions(db: DB): Promise<void> {
  schemaNumerosAssure ??= db
    .prepare(
      `create table if not exists numeros_options (
          formulaire text not null,
          champ text not null,
          dernier integer not null,
          primary key (formulaire, champ)
        )`,
    )
    .bind()
    .run()
    .then(
      () => undefined,
      (erreur: unknown) => {
        schemaNumerosAssure = null;
        throw erreur;
      },
    );
  await schemaNumerosAssure;
}

/** Les plus grands numéros retenus par champ pour ce formulaire (retours antérieurs). */
async function obtenirNumerosRetenus(db: DB, formulaire: string): Promise<Record<string, number>> {
  await assurerTableNumerosOptions(db);
  const resultat = await db
    .prepare('select champ, dernier from numeros_options where formulaire = ?1')
    .bind(formulaire)
    .all();
  const retenus: Record<string, number> = {};
  for (const ligne of resultat.results as { champ: string; dernier: number }[]) {
    retenus[ligne.champ] = ligne.dernier;
  }
  return retenus;
}

interface LigneBrute {
  readonly formulaire: string;
  readonly contenu: string;
}

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function decoder(contenu: string): ContenuOptions | undefined {
  try {
    const lu: unknown = JSON.parse(contenu);
    if (!estObjet(lu) || !estObjet(lu.champs)) return undefined;
    const derniersNumeros = estObjet(lu.derniersNumeros) ? lu.derniersNumeros : {};
    return { champs: lu.champs, derniersNumeros } as unknown as ContenuOptions;
  } catch {
    return undefined;
  }
}

/** Les brouillons présents, par identifiant de formulaire ; une ligne illisible est ignorée. */
export async function obtenirBrouillonsFormulaires(db: DB): Promise<Map<string, ContenuOptions>> {
  await assurerTableBrouillonsFormulaires(db);
  const resultat = await db.prepare('select formulaire, contenu from brouillons_formulaires').bind().all();
  const brouillons = new Map<string, ContenuOptions>();
  for (const ligne of resultat.results as LigneBrute[]) {
    const contenu = decoder(ligne.contenu);
    if (contenu !== undefined) brouillons.set(ligne.formulaire, contenu);
  }
  return brouillons;
}

/** Le brouillon d'un formulaire, ou `undefined` s'il n'en porte pas. */
export async function obtenirBrouillonFormulaire(db: DB, formulaire: string): Promise<ContenuOptions | undefined> {
  await assurerTableBrouillonsFormulaires(db);
  const resultat = await db
    .prepare('select formulaire, contenu from brouillons_formulaires where formulaire = ?1')
    .bind(formulaire)
    .all();
  const ligne = (resultat.results as LigneBrute[]).at(0);
  return ligne === undefined ? undefined : decoder(ligne.contenu);
}

const VIDE: ContenuOptions = { champs: {}, derniersNumeros: {} };

/** Applique et persiste une correction des options (remplace la ligne entière) ; rien n'est écrit si refusée. */
export async function enregistrerOptions(
  db: DB,
  declare: FormulaireDeclare,
  corpsBrut: unknown,
  maintenant: number,
): Promise<ResultatOptions> {
  const courant = (await obtenirBrouillonFormulaire(db, declare.id)) ?? VIDE;
  const publie = await obtenirPublieFormulaire(db, declare.id);
  const retenus = await obtenirNumerosRetenus(db, declare.id);
  const resultat = appliquerOptions(declare, courant, corpsBrut, publie, retenus);
  if (resultat.ok) {
    await db
      .prepare(
        `insert into brouillons_formulaires (formulaire, contenu, maj_le) values (?1, ?2, ?3)
       on conflict(formulaire) do update set contenu = excluded.contenu, maj_le = excluded.maj_le`,
      )
      .bind(declare.id, JSON.stringify(resultat.contenu), maintenant)
      .run();
  }
  return resultat;
}

const REPRISES_DU_RETOUR = 3;

async function lireBrouillonDatee(
  db: DB,
  formulaire: string,
): Promise<{ readonly contenu: ContenuOptions; readonly majLe: number } | undefined> {
  const resultat = await db
    .prepare('select contenu, maj_le from brouillons_formulaires where formulaire = ?1')
    .bind(formulaire)
    .all();
  const ligne = (resultat.results as { contenu: string; maj_le: number }[]).at(0);
  if (ligne === undefined) return undefined;
  const contenu = decoder(ligne.contenu);
  return contenu === undefined ? undefined : { contenu, majLe: ligne.maj_le };
}

/**
 * Le retour d'un formulaire à sa version publiée (change 015, ticket 04) : les
 * plus grands numéros du brouillon sont retenus puis le brouillon supprimé, en
 * un seul lot, sous la date lue et refusé pendant une publication (ADR-0023).
 * Un brouillon corrigé entre la lecture et le lot est relu, trois fois au plus.
 */
export async function revenirFormulaireSiLibre(
  db: DB & DBPublication,
  formulaire: string,
): Promise<'ok' | 'publication-en-cours' | 'modifie-pendant-le-retour'> {
  await assurerTableBrouillonsFormulaires(db);
  await assurerTableNumerosOptions(db);
  for (let essai = 0; essai < REPRISES_DU_RETOUR; essai += 1) {
    const lu = await lireBrouillonDatee(db, formulaire);
    if (lu === undefined) {
      // Une ligne illisible est supprimée sans rien retenir ; sans ligne, rien à faire.
      const issue = await lotSiAucunePublicationEnCours(
        db,
        [],
        'delete from brouillons_formulaires where formulaire = ?1',
        formulaire,
      );
      return issue.issue;
    }
    const retenus = Object.entries(numerosDuBrouillon(lu.contenu)).map(([champ, dernier]) =>
      db
        .prepare(
          `insert into numeros_options (formulaire, champ, dernier) values (?1, ?2, ?3)
         on conflict(formulaire, champ) do update set dernier = max(dernier, excluded.dernier)`,
        )
        .bind(formulaire, champ, dernier),
    );
    const { issue, supprimees } = await lotSiAucunePublicationEnCours(
      db,
      retenus,
      'delete from brouillons_formulaires where formulaire = ?1 and maj_le = ?2',
      formulaire,
      lu.majLe,
    );
    if (issue === 'publication-en-cours') return issue;
    if (supprimees > 0) return 'ok';
  }
  return 'modifie-pendant-le-retour';
}
