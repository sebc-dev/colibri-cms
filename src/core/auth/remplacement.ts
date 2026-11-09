/**
 * Le remplacement de l'adresse n'est possible que si l'instance porte la clé
 * des adresses de destination ET l'identifiant du compte (ADR-0033). Logique
 * pure (I2) : les deux valeurs viennent de l'appelant.
 */
export function remplacementPossible(compte: string | undefined, cle: string | undefined): boolean {
  return typeof compte === 'string' && compte !== '' && typeof cle === 'string' && cle !== '';
}
