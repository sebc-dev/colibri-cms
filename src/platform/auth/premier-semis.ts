/**
 * Verdict du premier semis de l'adresse autorisée (change 020, ticket 08, design D6).
 * Fonction pure : l'adresse demandée et le contenu de `adresses_autorisees` en entrée,
 * un verdict en sortie ; l'écriture revient à l'appelant, seulement dans « a-inscrire ».
 * La forme est jugée par la règle déjà employée pour les adresses e-mail du produit ;
 * la reconnaissance suit celle de la connexion (casse et espaces de bord ignorés).
 */
import { EMAIL_FORME } from '../../core/reglages/coordonnees.ts';

export type VerdictDuSemis =
  | { verdict: 'a-inscrire'; adresse: string }
  | { verdict: 'deja-en-place' }
  | { verdict: 'autre-adresse-en-place' }
  | { verdict: 'adresse-mal-formee' };

export function jugerLePremierSemis(
  adresseDemandee: string,
  lignes: readonly { adresse: string }[],
): VerdictDuSemis {
  const adresse = adresseDemandee.trim();
  if (!EMAIL_FORME.test(adresse)) return { verdict: 'adresse-mal-formee' };
  if (lignes.length === 0) return { verdict: 'a-inscrire', adresse };
  const reconnue = lignes.some((ligne) => ligne.adresse.trim().toLowerCase() === adresse.toLowerCase());
  return reconnue ? { verdict: 'deja-en-place' } : { verdict: 'autre-adresse-en-place' };
}
