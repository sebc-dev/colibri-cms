/**
 * Libellé du compte d'images d'une galerie ou d'un carrousel, partagé.
 *
 * Utilitaire pur (même rôle que `message-erreur-correction.ts`) qui accorde
 * correctement le texte selon le nombre d'images — le défaut recopié à
 * quatre endroits (`EmplacementComposition.svelte` (alors deux fichiers,
 * galerie et carrousel) et les deux blocs de
 * `src/pages/admin/pages/[slug].astro`) rendait
 * « 1 image composent cette galerie. » pour une seule image. Un seul lieu
 * d'accord, aucun terme de développeur (FR-117).
 */

/** Le texte présenté à l'éditrice pour le compte d'images d'un emplacement. */
export function libelleCompteImages(nombre: number, nature: 'galerie' | 'carrousel'): string {
  const mot = nature === 'galerie' ? 'cette galerie' : 'ce carrousel';
  if (nombre === 0) return `Aucune image ne compose ${mot}.`;
  if (nombre === 1) return `1 image compose ${mot}.`;
  return `${String(nombre)} images composent ${mot}.`;
}
