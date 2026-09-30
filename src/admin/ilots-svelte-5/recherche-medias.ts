/**
 * Filtre de recherche de la bibliothèque (spec vivante `bibliotheque-de-medias`
 * § Recherche d'une image) : une image correspond quand son nom d'affichage OU
 * sa description contient le terme, sans égard à la casse. Utilitaire pur (même
 * rôle que `libelle-compte-images.ts`), pour que le filtre se teste hors du
 * composant.
 */
import type { MediaListe } from '../../platform/medias/magasin.ts';

/** Les images dont le nom ou la description contient `recherche` ; toutes si elle est vide. */
export function filtrerMedias(medias: readonly MediaListe[], recherche: string): readonly MediaListe[] {
  const terme = recherche.trim().toLocaleLowerCase('fr');
  if (terme.length === 0) return medias;
  return medias.filter(
    (media) =>
      media.nomAffichage.toLocaleLowerCase('fr').includes(terme) ||
      media.description.toLocaleLowerCase('fr').includes(terme),
  );
}
