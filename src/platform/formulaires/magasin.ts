/**
 * Le magasin des brouillons de formulaires (ticket 05, migration 0008). Même
 * patron que `src/platform/reglages/magasin.ts` : lire le brouillon courant,
 * appliquer en `core/`, écrire ssi acceptée. Zone `platform` : n'importe que
 * `core/` (I1). Requêtes D1 préparées exclusivement ; aucune valeur saisie
 * n'est journalisée.
 */
import {
  appliquerOptions,
  type ContenuOptions,
  type ResultatOptions,
} from '../../core/formulaires/options.ts';
import type { FormulaireDeclare } from '../../core/formulaires/declaration.ts';

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
  const resultat = appliquerOptions(declare, courant, corpsBrut);
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
