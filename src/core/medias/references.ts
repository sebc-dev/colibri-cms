/**
 * Effaçabilité d'une image — ticket 02
 * (openspec/changes/004-bibliotheque-de-medias/tickets/02-deriver-effacabilite.md),
 * ADR-0012.
 *
 * Zone `core` (docs/architecture.md, I1/I2) : zéro dépendance, ni framework
 * ni plateforme (ARCH-5) — cette fonction ne lit, n'interroge et ne persiste
 * rien elle-même. Le comptage de références prend les références en
 * DONNÉES (design.md § Decisions), jamais en les interrogeant : les deux
 * ensembles — publié et brouillon — sont reçus en paramètre par l'appelant,
 * qui vit côté `platform/` (I1 : `platform → core`, jamais l'inverse).
 *
 * Aujourd'hui l'ensemble publié est toujours vide (aucune représentation de
 * l'état publié avant la feature de publication), mais la signature accepte
 * déjà les deux ensembles pour que rien ne soit à recâbler plus tard.
 *
 * SC-02a : une image référencée par au moins un emplacement — publié ou
 * brouillon — n'est pas effaçable.
 * SC-02b : une image qu'aucun emplacement, ni publié ni brouillon, ne
 * référence est effaçable.
 */

import type { Emplacement } from '../pages/declaration.ts';
import type { Brouillon, ContenuCorrige } from '../pages/brouillon.ts';

/**
 * Dit si une image est effaçable : vrai si et seulement si aucun des deux
 * ensembles de références — publié et brouillon — ne la contient
 * (SC-02a/SC-02b). `idImage` est l'identifiant d'une image tel qu'un
 * emplacement le référence.
 */
export function imageEffacable(
  idImage: string,
  referencesPubliees: ReadonlySet<string>,
  referencesBrouillon: ReadonlySet<string>,
): boolean {
  return !referencesPubliees.has(idImage) && !referencesBrouillon.has(idImage);
}

/*
 * Change 011, ticket 03 — l'effacement suit le CONTENU COURANT de chaque
 * emplacement : le brouillon s'il en a un, sinon la dernière version publiée,
 * sinon le contenu de départ posé par l'intégrateur (ADR-0012, ADR-0019).
 * Tout est reçu en données ; rien n'est lu ici (I2).
 */

/** Une page avec ce qu'il faut pour dire ce que ses emplacements posent. */
export interface PageContenuCourant {
  readonly slug: string;
  readonly declares: readonly Emplacement[];
  readonly publie: Brouillon;
  readonly brouillon: Brouillon;
}

/** D'où vient le contenu courant d'un emplacement. */
type SourceContenu = 'brouillon' | 'publie' | 'depart';

interface ContenuCourant {
  readonly source: SourceContenu;
  readonly contenu: ContenuCorrige | undefined;
}

function contenuDeDepart(emplacement: Emplacement): ContenuCorrige | undefined {
  switch (emplacement.nature) {
    case 'image':
      return { nature: 'image', mediaId: emplacement.mediaId };
    case 'galerie':
    case 'carrousel':
      return { nature: emplacement.nature, mediaIds: emplacement.mediaIds };
    default:
      return undefined;
  }
}

function contenuCourant(emplacement: Emplacement, page: PageContenuCourant): ContenuCourant {
  const enBrouillon = page.brouillon.get(emplacement.id);
  if (enBrouillon) return { source: 'brouillon', contenu: enBrouillon };
  const publie = page.publie.get(emplacement.id);
  if (publie) return { source: 'publie', contenu: publie };
  return { source: 'depart', contenu: contenuDeDepart(emplacement) };
}

function imagesPosees(contenu: ContenuCorrige | undefined): readonly string[] {
  if (!contenu) return [];
  switch (contenu.nature) {
    case 'image':
      return contenu.mediaId === '' ? [] : [contenu.mediaId];
    case 'galerie':
    case 'carrousel':
      return contenu.mediaIds;
    default:
      return [];
  }
}

/**
 * Les images posées par le contenu courant de tous les emplacements : l'ensemble
 * `brouillon` vient des emplacements qui portent un brouillon, l'ensemble
 * `publiees` des autres (version publiée, ou contenu de départ s'ils n'ont
 * jamais été publiés). Une image que le brouillon remplace n'y figure plus.
 */
export function referencesDuContenuCourant(pages: readonly PageContenuCourant[]): {
  readonly publiees: ReadonlySet<string>;
  readonly brouillon: ReadonlySet<string>;
} {
  const publiees = new Set<string>();
  const brouillon = new Set<string>();
  for (const page of pages) {
    for (const emplacement of page.declares) {
      const { source, contenu } = contenuCourant(emplacement, page);
      const cible = source === 'brouillon' ? brouillon : publiees;
      for (const id of imagesPosees(contenu)) cible.add(id);
    }
  }
  return { publiees, brouillon };
}

/** Un emplacement désigné par sa page et son identifiant. */
export interface EmplacementDePage {
  readonly pageSlug: string;
  readonly idEmplacement: string;
}

/** Les emplacements dont le contenu courant pose l'image `mediaId`. */
export function emplacementsPosantImage(
  pages: readonly PageContenuCourant[],
  mediaId: string,
): readonly EmplacementDePage[] {
  const posant: EmplacementDePage[] = [];
  for (const page of pages) {
    for (const emplacement of page.declares) {
      if (imagesPosees(contenuCourant(emplacement, page).contenu).includes(mediaId)) {
        posant.push({ pageSlug: page.slug, idEmplacement: emplacement.id });
      }
    }
  }
  return posant;
}

/** Le contenu sans l'image `mediaId` : image simple vidée, galerie ou carrousel recomposé sans elle. */
function contenuSansImage(contenu: ContenuCorrige, mediaId: string): ContenuCorrige {
  switch (contenu.nature) {
    case 'image':
      return { nature: 'image', mediaId: '' };
    case 'galerie':
    case 'carrousel':
      return { nature: contenu.nature, mediaIds: contenu.mediaIds.filter((autre) => autre !== mediaId) };
    default:
      return contenu;
  }
}

/** Un retrait à inscrire au brouillon : le contenu courant, sans l'image. */
export interface RetraitImage extends EmplacementDePage {
  readonly contenu: ContenuCorrige;
}

/**
 * Les retraits à inscrire au brouillon pour que plus aucun emplacement ne pose
 * `mediaId` : image simple vidée, galerie ou carrousel recomposé sans elle.
 */
export function retraitsDeImage(pages: readonly PageContenuCourant[], mediaId: string): readonly RetraitImage[] {
  const retraits: RetraitImage[] = [];
  for (const page of pages) {
    for (const emplacement of page.declares) {
      const { contenu } = contenuCourant(emplacement, page);
      if (!contenu || !imagesPosees(contenu).includes(mediaId)) continue;
      const sans = contenuSansImage(contenu, mediaId);
      retraits.push({ pageSlug: page.slug, idEmplacement: emplacement.id, contenu: sans });
    }
  }
  return retraits;
}
