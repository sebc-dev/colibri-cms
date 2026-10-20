/**
 * La suite d'une demande, choisie par l'éditrice (change 013, ticket 07). Pur (I2) : la liste
 * fermée des trois suites qui se choisissent ; « à renseigner » est l'état d'une demande neuve,
 * il ne se choisit pas.
 */
export const SUITES_CHOISISSABLES = ['sans-suite', 'devis-envoye', 'commande'] as const;

export type SuiteChoisissable = (typeof SUITES_CHOISISSABLES)[number];

/** Vrai si la valeur reçue est l'une des trois suites choisissables. */
export function lireSuite(valeur: unknown): SuiteChoisissable | null {
  return SUITES_CHOISISSABLES.find((suite) => suite === valeur) ?? null;
}

/** La suite du corps `{ suite }` ; `null` si le corps n'est pas de cette forme ou la suite refusée. */
export function suiteDuCorps(corps: unknown): SuiteChoisissable | null {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) return null;
  return lireSuite((corps as { suite?: unknown }).suite);
}
