// Fixture (FR-002/FR-025) : fonction pure minimaliste. Le test jumeau ne
// couvre pas le bord exact (18), donc un mutant sur l'opérateur `>=`
// (mutation de comparaison, ex. `>`) survit à la suite existante.
export function estMajeur(age: number): boolean {
  return age >= 18;
}
