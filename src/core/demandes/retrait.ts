/**
 * Le retrait d'une demande (change 013, ticket 08, ADR-0030). Pur (I2) : les deux motifs et la
 * forme du corps `{ ids, motif }`. Un retrait porte sur une seule demande (le groupé est le
 * ticket 09).
 */
export const MOTIFS_DE_RETRAIT = ['ordinaire', 'indesirable'] as const;

export type MotifDeRetrait = (typeof MOTIFS_DE_RETRAIT)[number];

export interface Retrait {
  readonly ids: readonly [string];
  readonly motif: MotifDeRetrait;
}

/** Le motif reçu s'il est l'un des deux motifs ; `null` sinon. */
export function lireMotif(valeur: unknown): MotifDeRetrait | null {
  return MOTIFS_DE_RETRAIT.find((motif) => motif === valeur) ?? null;
}

/** Le retrait du corps `{ ids: [un id], motif }` ; `null` si le corps n'est pas de cette forme. */
export function retraitDuCorps(corps: unknown): Retrait | null {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) return null;
  const { ids, motif } = corps as { ids?: unknown; motif?: unknown };
  const lu = lireMotif(motif);
  if (lu === null || !Array.isArray(ids) || ids.length !== 1) return null;
  const id: unknown = ids[0];
  if (typeof id !== 'string') return null;
  return { ids: [id], motif: lu };
}
