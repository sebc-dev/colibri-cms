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
