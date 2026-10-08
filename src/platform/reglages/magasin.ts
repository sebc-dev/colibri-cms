/**
 * Le magasin des brouillons de réglages (ticket 05,
 * openspec/changes/008-reglages-transverses/tickets/
 * 05-enregistrer-les-coordonnees.md ; migration 0007). Même patron que
 * `src/platform/brouillons/magasin.ts` : lire, appliquer en `core/`, écrire
 * ssi acceptée. Zone `platform` : n'importe que `core/` (I1). Requêtes D1
 * préparées exclusivement ; aucune valeur saisie n'est journalisée.
 */
import {
  appliquerCorrectionCoordonnees,
  type ResultatEnregistrementCoordonnees,
} from '../../core/reglages/coordonnees.ts';
import { appliquerListeReseaux, type ResultatReseaux } from '../../core/reglages/reseaux.ts';
import { appliquerMention, type ResultatMention } from '../../core/reglages/mention.ts';
import type { CoordonneeDeclaree } from '../../core/reglages/declaration.ts';

export type NomReglage = 'coordonnees' | 'reseaux' | 'mention';

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

/**
 * Recrée `brouillons_reglages` si absente — même définition que la migration 0007.
 * Un échec n'est pas mis en cache : l'appel suivant retente.
 */
async function assurerTableBrouillonsReglages(db: DB): Promise<void> {
  schemaAssure ??= db
    .prepare(
      `create table if not exists brouillons_reglages (
          reglage text primary key check (reglage in ('coordonnees', 'reseaux', 'mention')),
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

/** Les brouillons présents, par réglage (contenu JSON décodé). */
export type BrouillonsReglages = Partial<Record<NomReglage, unknown>>;

interface LigneBrute {
  readonly reglage: string;
  readonly contenu: string;
}

/** Lit les trois brouillons ; une ligne illisible est ignorée. */
export async function obtenirBrouillonsReglages(db: DB): Promise<BrouillonsReglages> {
  await assurerTableBrouillonsReglages(db);
  const resultat = await db.prepare('select reglage, contenu from brouillons_reglages').bind().all();
  const brouillons: BrouillonsReglages = {};
  for (const ligne of resultat.results as LigneBrute[]) {
    if (ligne.reglage !== 'coordonnees' && ligne.reglage !== 'reseaux' && ligne.reglage !== 'mention') continue;
    try {
      brouillons[ligne.reglage] = JSON.parse(ligne.contenu) as unknown;
    } catch {
      // Ligne corrompue : ignorée.
    }
  }
  return brouillons;
}

/** Applique et persiste une soumission de coordonnées ; rien n'est écrit si refusée. */
export async function enregistrerCoordonnees(
  db: DB,
  declarees: readonly CoordonneeDeclaree[],
  corpsBrut: unknown,
  maintenant: number,
): Promise<ResultatEnregistrementCoordonnees> {
  await assurerTableBrouillonsReglages(db);
  const resultat = appliquerCorrectionCoordonnees(declarees, corpsBrut);
  if (resultat.accepte) {
    await db
      .prepare(
        `insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)
       on conflict(reglage) do update set contenu = excluded.contenu, maj_le = excluded.maj_le`,
      )
      .bind('coordonnees', JSON.stringify(resultat.valeurs), maintenant)
      .run();
  }
  return resultat;
}

/** Applique et persiste la liste des réseaux (remplace sa ligne entière) ; rien n'est écrit si refusée. */
export async function enregistrerReseaux(db: DB, corpsBrut: unknown, maintenant: number): Promise<ResultatReseaux> {
  await assurerTableBrouillonsReglages(db);
  const resultat = appliquerListeReseaux(corpsBrut);
  if (resultat.accepte) {
    await db
      .prepare(
        `insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)
       on conflict(reglage) do update set contenu = excluded.contenu, maj_le = excluded.maj_le`,
      )
      .bind('reseaux', JSON.stringify(resultat.reseaux), maintenant)
      .run();
  }
  return resultat;
}

/** Applique et persiste la mention (Markdown restreint, remplace sa ligne entière) ; rien n'est écrit si refusée. */
export async function enregistrerMention(db: DB, corpsBrut: unknown, maintenant: number): Promise<ResultatMention> {
  await assurerTableBrouillonsReglages(db);
  const resultat = appliquerMention(corpsBrut);
  if (resultat.accepte) {
    await db
      .prepare(
        `insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)
       on conflict(reglage) do update set contenu = excluded.contenu, maj_le = excluded.maj_le`,
      )
      .bind('mention', JSON.stringify(resultat.markdown), maintenant)
      .run();
  }
  return resultat;
}
