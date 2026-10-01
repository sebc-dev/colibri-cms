/**
 * Validation pure de l'adresse d'expéditeur déclarée par l'instance
 * (`senderAddress` dans `instance.json`, I8). Appelée par `astro.config.ts`,
 * seul lecteur du fichier d'instance (I10) : une valeur refusée arrête la
 * construction du site en nommant le champ. Ce module ne lit aucun fichier.
 */
const FORME_ADRESSE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function exigerAdresseExpediteur(valeur: unknown): string {
  if (typeof valeur !== 'string' || valeur === '') {
    throw new Error(
      "instance.json : le champ senderAddress est manquant ou n'est pas une adresse e-mail.",
    );
  }
  if (!FORME_ADRESSE.test(valeur)) {
    throw new Error(
      `instance.json : le champ senderAddress est invalide (« ${valeur} » n'est pas une adresse e-mail).`,
    );
  }
  return valeur;
}
