/**
 * La règle des variantes réduites d'une image publiée — change
 * 014-site-public-rapide, ticket 02 (ADR-0031). Fonctions pures (I2) : aucun
 * fichier, aucun décodage. Seul porteur des largeurs de référence.
 */

/** Les largeurs de référence des variantes, en pixels, croissantes. */
const LARGEURS_DE_REFERENCE: readonly number[] = [360, 720, 1080];

/** La largeur au plus de laquelle la source par défaut est cherchée. */
const LARGEUR_SOURCE_MAX = 720;

const NOM_DE_VARIANTE = /^([A-Za-z0-9-]+)-(\d+)\.webp$/;

/** Les largeurs des variantes d'une image de `largeur` px : celles de référence plus étroites qu'elle, puis la sienne (plafonnée à la plus grande), jamais agrandie. */
export function largeursDeVariantes(largeur: number): readonly number[] {
  const plafond = LARGEURS_DE_REFERENCE[LARGEURS_DE_REFERENCE.length - 1];
  const propre = Math.min(largeur, plafond);
  return [...LARGEURS_DE_REFERENCE.filter((w) => w < largeur && w !== propre), propre];
}

/** La hauteur proportionnelle d'une variante de `largeurCible` px, arrondie, jamais nulle. */
export function hauteurDeVariante(largeur: number, hauteur: number, largeurCible: number): number {
  return Math.max(1, Math.round((hauteur * largeurCible) / largeur));
}

/** Le nom du fichier d'une variante : l'identité de l'image et la largeur. */
export function nomDeVariante(id: string, largeur: number): string {
  return `${id}-${String(largeur)}.webp`;
}

/** Relit l'identité et la largeur d'un nom de variante ; `null` si le nom n'a pas de largeur entière lisible. */
export function lireNomDeVariante(nom: string): { readonly id: string; readonly largeur: number } | null {
  const trouve = NOM_DE_VARIANTE.exec(nom);
  if (trouve === null) return null;
  const largeur = Number.parseInt(trouve[2], 10);
  if (!Number.isSafeInteger(largeur) || largeur < 1) return null;
  return { id: trouve[1], largeur };
}

/** La largeur de la source par défaut : la plus grande variante d'au plus 720 px, sinon la plus petite. */
export function largeurParDefaut(largeurs: readonly number[]): number {
  const admissibles = largeurs.filter((w) => w <= LARGEUR_SOURCE_MAX);
  return admissibles.length > 0 ? Math.max(...admissibles) : Math.min(...largeurs);
}
