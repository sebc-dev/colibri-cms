/**
 * Le total estimé d'un formulaire de devis (change 012, ticket 05, ADR-0018).
 * Fonction pure (I2) : des centimes entiers, jamais de flottant.
 */

/** Pour chaque champ (par identifiant), les identifiants des options choisies. */
export type Selection = Readonly<Record<string, readonly string[]>>;

/** La seule forme dont le calcul a besoin : une déclaration, ou sa description côté navigateur. */
export interface FormulaireAPrix {
  readonly champs: readonly {
    readonly id: string;
    readonly avecPrix: boolean;
    readonly options?: readonly { readonly id: string; readonly prix?: number }[];
  }[];
}

/** La somme, en centimes, des prix des options choisies dans les champs avec prix. */
export function totalDeLaSelection(formulaire: FormulaireAPrix, selection: Selection): number {
  let total = 0;
  for (const champ of formulaire.champs) {
    if (!champ.avecPrix) continue;
    const choisies = selection[champ.id] ?? [];
    for (const option of champ.options ?? []) {
      if (choisies.includes(option.id)) total += option.prix ?? 0;
    }
  }
  return total;
}
