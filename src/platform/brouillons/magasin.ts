/**
 * Le magasin des brouillons d'emplacement — ticket 04
 * (openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md) ;
 * ticket 05 (openspec/changes/003-remplir-emplacements/tickets/
 * 05-regler-lien-video.md) y ajoute `enregistrerCorrectionLienVideo`, même
 * patron.
 *
 * Zone `platform` (docs/architecture.md, I1) : n'importe que `core/`
 * (`appliquerCorrectionBoutonAction`, `appliquerCorrectionLienVideo`,
 * `pagePorteUnBrouillon`) — jamais `admin/`, `render/`, `site/`, ni un autre
 * fichier de `platform/` (même matrice que `src/platform/auth/magasin.ts`/
 * `src/platform/session/index.ts`).
 *
 * Table `brouillons_emplacements` (`migrations/0004_brouillons_emplacements.sql`,
 * SC-04d) : une ligne par emplacement corrigé, clé `(page_slug,
 * id_emplacement)` — l'identité stable posée par la déclaration (ADR-0012).
 * L'état publié n'a ici aucune représentation : ce magasin ne connaît que le
 * brouillon (SC-04a/e).
 *
 * `assurerTableBrouillons` (même geste défensif que `assurerTableSessions`,
 * `src/platform/session/index.ts`) recrée cette table si elle est absente :
 * les couture de test des écrans qui n'ont besoin d'aucun brouillon (par
 * exemple `tests/integration/liste-des-pages.test.ts`, ticket 02) ne rejouent
 * jamais cette migration elle-même, et restent donc fonctionnelles sur une D1
 * où seules les migrations 0001-0003 ont été rejouées.
 */
import {
  appliquerCorrectionBoutonAction,
  appliquerCorrectionLienVideo,
  pagePorteUnBrouillon as pagePorteUnBrouillonPur,
  type Brouillon,
  type ContenuCorrige,
  type ResultatCorrection,
} from '../../core/pages/brouillon.ts';
import type { Emplacement } from '../../core/pages/declaration.ts';

const TABLE_BROUILLONS = 'brouillons_emplacements';

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé, cf. D1Database). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<unknown>;
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
  };
}

let schemaBrouillonsAssure: Promise<void> | null = null;

/**
 * Crée `brouillons_emplacements` si elle n'existe pas encore — même
 * définition que `migrations/0004_brouillons_emplacements.sql` (voir son
 * commentaire) : ce garde défensif la rejoue pour rester fonctionnel sur une
 * D1 où cette migration n'a pas été rejouée par la couture de test courante.
 */
async function assurerTableBrouillons(db: DB): Promise<void> {
  if (!schemaBrouillonsAssure) {
    schemaBrouillonsAssure = db
      .prepare(
        `create table if not exists ${TABLE_BROUILLONS} (
          page_slug text not null,
          id_emplacement text not null,
          nature text not null,
          contenu text not null,
          maj_le integer not null,
          primary key (page_slug, id_emplacement)
        )`,
      )
      .bind()
      .run()
      .then(() => undefined);
  }
  await schemaBrouillonsAssure;
}

interface LigneBrouillonBrute {
  readonly id_emplacement: string;
  readonly contenu: string;
}

/**
 * Le brouillon courant d'une page, reconstruit depuis D1 (clé = identifiant
 * d'emplacement, ADR-0012). Une ligne dont le `contenu` n'est pas un JSON
 * valide est ignorée plutôt que de faire échouer toute la lecture (même
 * principe défensif que `core/pages/declaration.ts` face à une forme
 * invalide).
 */
export async function obtenirBrouillon(db: DB, slugPage: string): Promise<Brouillon> {
  await assurerTableBrouillons(db);
  const resultat = await db
    .prepare(`select id_emplacement, contenu from ${TABLE_BROUILLONS} where page_slug = ?1`)
    .bind(slugPage)
    .all<LigneBrouillonBrute>();

  const brouillon = new Map<string, ContenuCorrige>();
  for (const ligne of resultat.results) {
    try {
      brouillon.set(ligne.id_emplacement, JSON.parse(ligne.contenu) as ContenuCorrige);
    } catch {
      // Ligne corrompue : ignorée, sans faire échouer la lecture des autres.
    }
  }
  return brouillon;
}

/**
 * SC-04b, portée D1 : dérivée du brouillon lu (`pagePorteUnBrouillon`,
 * `core/pages/brouillon.ts`) — ce magasin ne fait que fournir les faits bruts
 * à la dérivation pure, il ne recalcule rien lui-même.
 */
export async function pagePorteUnBrouillon(db: DB, slugPage: string): Promise<boolean> {
  return pagePorteUnBrouillonPur(await obtenirBrouillon(db, slugPage));
}

interface LigneSlugBrute {
  readonly page_slug: string;
}

/** Les slugs de page qui portent un brouillon (`Écran : Liste des pages`, SC-04f). */
export async function listerSlugsAvecBrouillon(db: DB): Promise<ReadonlySet<string>> {
  await assurerTableBrouillons(db);
  const resultat = await db
    .prepare(`select distinct page_slug from ${TABLE_BROUILLONS}`)
    .bind()
    .all<LigneSlugBrute>();
  return new Set(resultat.results.map((ligne) => ligne.page_slug));
}

/**
 * Applique et persiste une correction de bouton d'action (SC-04a/e) : lit le
 * brouillon courant de la page, applique la correction en `core/` (pure),
 * puis, si elle est acceptée, écrit (ou remplace) la seule ligne de
 * l'emplacement corrigé — jamais l'état publié, qui n'est pas représenté ici.
 * Rien n'est écrit si la correction est refusée (SC-04c/h) : `core/` rend le
 * refus par valeur avant que ce magasin n'atteigne l'écriture.
 */
export async function enregistrerCorrectionBoutonAction(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  const brouillonActuel = await obtenirBrouillon(db, slugPage);
  const resultat = appliquerCorrectionBoutonAction(
    emplacementsDeclares,
    brouillonActuel,
    idEmplacement,
    correctionBrute,
  );
  if (!resultat.accepte) return resultat;

  // Garde défensive : `appliquerCorrectionBoutonAction` pose toujours la clé
  // qu'elle vient de traiter quand elle accepte — cette branche ne s'exerce
  // jamais en pratique, elle protège seulement contre une future divergence.
  const contenu = resultat.brouillon.get(idEmplacement);
  if (!contenu) return resultat;

  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le)
       values (?1, ?2, ?3, ?4, ?5)
       on conflict(page_slug, id_emplacement) do update set
         nature = excluded.nature, contenu = excluded.contenu, maj_le = excluded.maj_le`,
    )
    .bind(slugPage, idEmplacement, contenu.nature, JSON.stringify(contenu), maintenant)
    .run();

  return resultat;
}

/**
 * Applique et persiste une correction de lien de vidéo (ticket 05,
 * SC-05b/c) — même patron que `enregistrerCorrectionBoutonAction` ci-dessus :
 * lit le brouillon courant, applique la correction en `core/` (pure,
 * `appliquerCorrectionLienVideo`), puis, si elle est acceptée, écrit (ou
 * remplace) la seule ligne de l'emplacement corrigé. Rien n'est écrit si la
 * correction est refusée (lien hors liste blanche, forme invalide,
 * emplacement non déclaré ou d'une autre nature, SC-05c) : `core/` rend le
 * refus par valeur avant que ce magasin n'atteigne l'écriture.
 */
export async function enregistrerCorrectionLienVideo(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  const brouillonActuel = await obtenirBrouillon(db, slugPage);
  const resultat = appliquerCorrectionLienVideo(
    emplacementsDeclares,
    brouillonActuel,
    idEmplacement,
    correctionBrute,
  );
  if (!resultat.accepte) return resultat;

  // Garde défensive : même remarque que `enregistrerCorrectionBoutonAction`
  // ci-dessus — cette branche ne s'exerce jamais en pratique.
  const contenu = resultat.brouillon.get(idEmplacement);
  if (!contenu) return resultat;

  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le)
       values (?1, ?2, ?3, ?4, ?5)
       on conflict(page_slug, id_emplacement) do update set
         nature = excluded.nature, contenu = excluded.contenu, maj_le = excluded.maj_le`,
    )
    .bind(slugPage, idEmplacement, contenu.nature, JSON.stringify(contenu), maintenant)
    .run();

  return resultat;
}
