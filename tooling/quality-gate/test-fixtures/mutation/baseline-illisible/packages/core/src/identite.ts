// Fixture (FR-029) : fonction pure sans opérateur mutable (aucun mutant
// Stryker exploitable), pour que l'issue du contrôle dépende exclusivement
// de l'état de la base de référence (illisible), jamais d'un survivant réel.
export function identite<T>(valeur: T): T {
  return valeur;
}
