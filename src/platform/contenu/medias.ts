/**
 * Le chargement des images publiées posées au départ — change
 * 011-apercu-et-publication, ticket 02 (ADR-0020, ADR-0022).
 *
 * `import.meta.glob` empaquette au build : les fiches (`content/medias/
 * <id>.json`) et l'adresse statique de la variante ORIGINALE de chaque image
 * dont les octets ont été récupérés dans `./medias` par
 * `scripts/recuperer-images-publiees.mjs` (`prebuild`). Aucun accès disque
 * au moment de la requête.
 *
 * Zone `platform` (I1) : n'importe que `core/`. Les motifs de glob sont des
 * littéraux (Vite n'accepte rien d'autre) et soustraits à la mutation, comme
 * dans `pages.ts` : un motif muté ne résout plus rien, en silence.
 */
import type { ImagesConnues, ImageRendue } from '../../core/rendu/page.ts';
import { lireFicheMedia, type FicheMedia } from '../../core/medias/fiche.ts';

// Stryker disable all
const MODULES_FICHES = import.meta.glob('/content/medias/*.json', {
  eager: true,
  import: 'default',
});

const ADRESSES_ORIGINALES = import.meta.glob('/medias/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?no-inline',
  import: 'default',
});
// Stryker restore all

/** Les fiches d'images publiées empaquetées, mal formées écartées. */
export function listerFichesMedias(): FicheMedia[] {
  return Object.values(MODULES_FICHES)
    .map((brut) => lireFicheMedia(brut))
    .filter((fiche): fiche is FicheMedia => fiche !== null);
}

/** L'adresse statique de la variante originale empaquetée de chaque image, par identité (le nom du fichier sans extension). */
export function adressesOriginalesEmpaquetees(): ReadonlyMap<string, string> {
  const adresses = new Map<string, string>();
  for (const [chemin, adresse] of Object.entries(ADRESSES_ORIGINALES)) {
    const nom = chemin.slice(chemin.lastIndexOf('/') + 1);
    adresses.set(nom.slice(0, nom.lastIndexOf('.')), String(adresse));
  }
  return adresses;
}

/** Les images publiées que le rendu peut poser : fiche ET octets empaquetés ; une fiche sans octets n'en fait pas partie. */
export function imagesPubliees(): ImagesConnues {
  const adresses = adressesOriginalesEmpaquetees();
  const images = new Map<string, ImageRendue>();
  for (const fiche of listerFichesMedias()) {
    const source = adresses.get(fiche.id);
    if (source === undefined) continue;
    images.set(fiche.id, {
      source,
      largeur: fiche.largeur,
      hauteur: fiche.hauteur,
      description: fiche.description,
    });
  }
  return images;
}
