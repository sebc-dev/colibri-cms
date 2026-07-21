// Fixture (FR-025, borne) : deux fonctions pures, chacune laissant survivre un
// mutant faute de test au bord exact. La base de référence de ce scénario ne
// couvre que le survivant de `estMajeur`, jamais celui de `estAdulte` — elle
// n'est donc pas exhaustive.
export function estMajeur(age: number): boolean {
  return age >= 18;
}

export function estAdulte(age: number): boolean {
  return age >= 21;
}
