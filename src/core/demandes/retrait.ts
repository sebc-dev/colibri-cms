/**
 * Le retrait d'une demande (change 013, ticket 08, ADR-0030). Pur (I2) : les deux motifs et la
 * forme du corps `{ ids, motif }`. Un retrait porte sur 1 à 50 demandes distinctes (une page au
 * plus, ticket 09), avec un motif unique pour toute la sélection.
 */
export const MOTIFS_DE_RETRAIT = ['ordinaire', 'indesirable'] as const;

export type MotifDeRetrait = (typeof MOTIFS_DE_RETRAIT)[number];

export interface Retrait {
  readonly ids: readonly string[];
  readonly motif: MotifDeRetrait;
}

/** Le motif reçu s'il est l'un des deux motifs ; `null` sinon. */
export function lireMotif(valeur: unknown): MotifDeRetrait | null {
  return MOTIFS_DE_RETRAIT.find((motif) => motif === valeur) ?? null;
}

/** Le plus grand nombre de demandes retirées en un geste : une page de la liste. */
export const RETRAIT_MAX = 50;

/** Le retrait du corps `{ ids: [1 à 50 id textuels distincts], motif }` ; `null` sinon. */
export function retraitDuCorps(corps: unknown): Retrait | null {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) return null;
  const { ids, motif } = corps as { ids?: unknown; motif?: unknown };
  const lu = lireMotif(motif);
  if (lu === null || !Array.isArray(ids) || ids.length < 1 || ids.length > RETRAIT_MAX) return null;
  const textuels: string[] = [];
  for (const id of ids as unknown[]) {
    if (typeof id !== 'string') return null;
    textuels.push(id);
  }
  if (new Set(textuels).size !== textuels.length) return null;
  return { ids: textuels, motif: lu };
}
