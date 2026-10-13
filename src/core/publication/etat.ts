/**
 * L'état de la dernière publication, dérivé et jamais stocké (change 011, ticket 18 ; ADR-0023,
 * FR-090, FR-091). Pur : l'horloge est un paramètre, aucune entrée-sortie.
 */

/** Au-delà de cette durée après le dépôt, une mise en ligne qui n'a pas paru n'a pas abouti. */
export const BORNE_MISE_EN_LIGNE = 30 * 60 * 1000;

export type EtatDeLaPublication = 'aucun' | 'en-train-de-partir' | 'en-cours' | 'en-ligne' | 'pas-abouti';

export interface EntreeEtat {
  /** La marque empaquetée par le site en service ; `null` : site né d'aucune publication. */
  readonly marqueDuSite: string | null;
  /** La marque de la dernière publication déposée ; `null` : aucune publication. */
  readonly derniereMarque: string | null;
  readonly deposeLe: number | null;
  readonly verrouPris: boolean;
  readonly maintenant: number;
}

export function deriverEtat(entree: EntreeEtat): EtatDeLaPublication {
  if (entree.verrouPris) return 'en-train-de-partir';
  if (entree.derniereMarque === null || entree.deposeLe === null) return 'aucun';
  if (entree.marqueDuSite === entree.derniereMarque) return 'en-ligne';
  return entree.maintenant - entree.deposeLe < BORNE_MISE_EN_LIGNE ? 'en-cours' : 'pas-abouti';
}
