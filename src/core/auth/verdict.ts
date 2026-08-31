/**
 * Le verdict d'un code soumis — ticket 06 (specs/001-connexion-par-code/
 * 06-code-ouvre-la-session.md), affiné au ticket 07 (chaque refus dit quel
 * geste reprendre, specs/001-connexion-par-code/07-refus-de-code.md).
 *
 * Zone `core` (docs/archi.md, I1) : zéro dépendance, y compris vers un autre
 * fichier de `core/` (la matrice ne fait aucune exception). Ce module ne
 * touche ni D1 ni le hachage — seulement les bornes qui définissent un code
 * valide : le bon appareil, une seule fois, dans les quinze minutes.
 *
 * Le piège que ce module existe pour éviter (ticket 07 § « le piège à ne pas
 * ouvrir ») : filtrer les lignes candidates *avant* de les lire renverrait
 * l'éditrice sur un autre appareil pour un code qu'elle a bien demandé sur
 * le sien — c'est ce verdict, et lui seul, qui tranche à partir de l'état
 * lu, jamais une clause `where` qui aurait déjà exclu la ligne.
 */

/** Pourquoi un code soumis est refusé. */
export type RaisonRefus =
  | 'introuvable'
  | 'deja-utilise'
  | 'annule'
  | 'expire'
  | 'mauvais-appareil';

export type Verdict = { readonly valide: true } | { readonly valide: false; readonly raison: RaisonRefus };

/** Ce que porte la ligne de `codes_connexion` dont l'empreinte a été reconnue. */
export interface LigneCode {
  readonly identifiantAppareil: string;
  readonly expireLe: number;
  readonly utiliseLe: number | null;
  readonly annuleLe: number | null;
}

/**
 * Rend le verdict d'un code dont l'empreinte a été reconnue (`ligne`, ou
 * `null` si aucune ligne ne correspond) — trois bornes tranchent, dans cet
 * ordre : déjà utilisé, annulé, puis expiré ; enfin, seul l'appareil qui l'a
 * demandé peut le présenter.
 */
export function rendreVerdict(params: {
  ligne: LigneCode | null;
  identifiantAppareilCourant: string;
  maintenant: number;
}): Verdict {
  const { ligne, identifiantAppareilCourant, maintenant } = params;
  if (!ligne) return { valide: false, raison: 'introuvable' };
  if (ligne.utiliseLe !== null) return { valide: false, raison: 'deja-utilise' };
  if (ligne.annuleLe !== null) return { valide: false, raison: 'annule' };
  if (ligne.expireLe <= maintenant) return { valide: false, raison: 'expire' };
  if (ligne.identifiantAppareil !== identifiantAppareilCourant) {
    return { valide: false, raison: 'mauvais-appareil' };
  }
  return { valide: true };
}
