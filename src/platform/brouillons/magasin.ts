/**
 * Le magasin des brouillons d'emplacement — ticket 04
 * (openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md) ;
 * ticket 05 (openspec/changes/003-remplir-emplacements/tickets/
 * 05-regler-lien-video.md) y ajoute `enregistrerCorrectionLienVideo`, même
 * patron.
 *
 * Zone `platform` (docs/architecture.md, I1) : n'importe que `core/`
 * (`appliquerCorrectionBoutonAction`, `appliquerCorrectionLienVideo`,
 * `appliquerCorrectionTexteRiche`) — jamais `admin/`, `render/`, `site/`, ni un autre
 * fichier de `platform/` (même matrice que `src/platform/auth/magasin.ts`/
 * `src/platform/session/index.ts`).
 *
 * Ticket 06 (openspec/changes/003-remplir-emplacements/tickets/
 * 06-corriger-texte-riche.md) y ajoute `enregistrerCorrectionTexteRiche`,
 * même patron.
 *
 * Ticket 08 (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 08-poser-remplacer-image.md) y ajoute `enregistrerCorrectionImage`, même
 * patron — poser une image et la remplacer sont le même geste (`core/`,
 * `appliquerCorrectionImage`).
 *
 * Ticket 09 (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 09-composer-galerie-carrousel.md) y ajoute `enregistrerCorrectionGalerie`
 * et `enregistrerCorrectionCarrousel`, même patron — ajouter, réordonner ou
 * retirer une image de l'ensemble est un remplacement en bloc de `mediaIds`
 * (`core/`, `appliquerCorrectionGalerie`/`appliquerCorrectionCarrousel`),
 * jamais un diff incrémental : c'est ce remplacement qui rend le geste
 * « contenu, pas structure » (SC-09a/b, FR-024/025).
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
  appliquerCorrectionTexteRiche,
  appliquerCorrectionImage,
  appliquerCorrectionGalerie,
  appliquerCorrectionCarrousel,
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
      all(): Promise<{ results: unknown[] }>;
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
  schemaBrouillonsAssure ??= db
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
    .all();

  const brouillon = new Map<string, ContenuCorrige>();
  for (const ligne of resultat.results as LigneBrouillonBrute[]) {
    try {
      brouillon.set(ligne.id_emplacement, JSON.parse(ligne.contenu) as ContenuCorrige);
    } catch {
      // Ligne corrompue : ignorée, sans faire échouer la lecture des autres.
    }
  }
  return brouillon;
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
    .all();
  return new Set((resultat.results as LigneSlugBrute[]).map((ligne) => ligne.page_slug));
}

/**
 * Le patron commun aux trois enregistrements ci-dessous, et la raison pour
 * laquelle aucun ne le réécrit : lire le brouillon courant de la page,
 * appliquer la correction en `core/` (pure), puis, si elle est acceptée,
 * écrire (ou remplacer) la seule ligne de l'emplacement corrigé — jamais
 * l'état publié, qui n'est pas représenté ici. Rien n'est écrit quand la
 * correction est refusée (SC-04c/h, SC-05c) : `core/` rend le refus par
 * valeur avant que ce magasin n'atteigne l'écriture.
 *
 * Chaque `appliquerCorrection*` de `core/pages/brouillon.ts` porte cette
 * signature ; c'est elle qui distingue les trois enregistrements.
 */
type ApplicationCorrection = (
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
) => ResultatCorrection;

async function enregistrerCorrection(
  appliquer: ApplicationCorrection,
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  const brouillonActuel = await obtenirBrouillon(db, slugPage);
  const resultat = appliquer(
    emplacementsDeclares,
    brouillonActuel,
    idEmplacement,
    correctionBrute,
  );

  // `appliquer` pose toujours la clé qu'elle vient de traiter quand elle
  // accepte : un `contenu` absent sur une acceptation est une garde défensive
  // contre une future divergence, jamais un chemin exercé en pratique.
  const contenu = resultat.accepte ? resultat.brouillon.get(idEmplacement) : undefined;
  if (contenu) {
    await db
      .prepare(
        `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le)
       values (?1, ?2, ?3, ?4, ?5)
       on conflict(page_slug, id_emplacement) do update set
         nature = excluded.nature, contenu = excluded.contenu, maj_le = excluded.maj_le`,
      )
      .bind(slugPage, idEmplacement, contenu.nature, JSON.stringify(contenu), maintenant)
      .run();
  }

  return resultat;
}

/** Applique et persiste une correction de bouton d'action (SC-04a/e). */
export function enregistrerCorrectionBoutonAction(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  return enregistrerCorrection(
    appliquerCorrectionBoutonAction,
    db,
    slugPage,
    emplacementsDeclares,
    idEmplacement,
    correctionBrute,
    maintenant,
  );
}

/**
 * Applique et persiste une correction de lien de vidéo (ticket 05, SC-05b/c).
 * Un lien hors liste blanche, une forme invalide, un emplacement non déclaré
 * ou d'une autre nature sont des refus rendus par `core/` (SC-05c).
 */
export function enregistrerCorrectionLienVideo(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  return enregistrerCorrection(
    appliquerCorrectionLienVideo,
    db,
    slugPage,
    emplacementsDeclares,
    idEmplacement,
    correctionBrute,
    maintenant,
  );
}

/**
 * Applique et persiste une correction de texte riche (ticket 06, SC-06e) —
 * `appliquerCorrectionTexteRiche` sérialise déjà le document en Markdown
 * restreint avant que ce magasin ne l'écrive.
 */
export function enregistrerCorrectionTexteRiche(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  return enregistrerCorrection(
    appliquerCorrectionTexteRiche,
    db,
    slugPage,
    emplacementsDeclares,
    idEmplacement,
    correctionBrute,
    maintenant,
  );
}

/**
 * Applique et persiste la pose (ou le remplacement) d'une image dans un
 * emplacement d'image (ticket 08,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 08-poser-remplacer-image.md, SC-08a/b) — même patron que les trois
 * enregistrements ci-dessus : `appliquerCorrectionImage`
 * (`core/pages/brouillon.ts`, livrée au ticket 03) décide seule de
 * l'acceptation, en ne lisant jamais la bibliothèque des médias elle-même
 * (aucune vérification que `mediaId` existe réellement, hors périmètre de
 * ce ticket) — poser et remplacer sont ici le MÊME geste : la seconde pose
 * sur un emplacement déjà corrigé remplace simplement la ligne existante
 * (`on conflict … do update`, ci-dessus), jamais n'en ajoute une seconde.
 */
export function enregistrerCorrectionImage(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  return enregistrerCorrection(
    appliquerCorrectionImage,
    db,
    slugPage,
    emplacementsDeclares,
    idEmplacement,
    correctionBrute,
    maintenant,
  );
}

/**
 * Applique et persiste la composition (ajout, réordonnancement ou retrait
 * d'une image) d'un emplacement de galerie (ticket 09,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 09-composer-galerie-carrousel.md, SC-09a/b) — même patron que
 * `enregistrerCorrectionImage` ci-dessus : `appliquerCorrectionGalerie`
 * (`core/pages/brouillon.ts`, livrée au ticket 03) décide seule de
 * l'acceptation et REMPLACE en bloc `mediaIds`, jamais un ajout/retrait
 * incrémental côté magasin — c'est ce remplacement qui rend le geste
 * « contenu, pas structure » (FR-024/025). Aucune vérification que chaque
 * `mediaId` existe réellement dans la réserve (hors périmètre, comme pour
 * l'image simple du ticket 08).
 */
export function enregistrerCorrectionGalerie(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  return enregistrerCorrection(
    appliquerCorrectionGalerie,
    db,
    slugPage,
    emplacementsDeclares,
    idEmplacement,
    correctionBrute,
    maintenant,
  );
}

/**
 * Applique et persiste la composition d'un emplacement de carrousel (ticket
 * 09, SC-09a/b) — même patron et même règle que
 * `enregistrerCorrectionGalerie` ci-dessus : un remplacement en bloc de
 * `mediaIds` (`appliquerCorrectionCarrousel`, `core/pages/brouillon.ts`).
 */
export function enregistrerCorrectionCarrousel(
  db: DB,
  slugPage: string,
  emplacementsDeclares: readonly Emplacement[],
  idEmplacement: string,
  correctionBrute: unknown,
  maintenant: number,
): Promise<ResultatCorrection> {
  return enregistrerCorrection(
    appliquerCorrectionCarrousel,
    db,
    slugPage,
    emplacementsDeclares,
    idEmplacement,
    correctionBrute,
    maintenant,
  );
}
