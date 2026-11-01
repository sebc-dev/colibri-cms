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
import type { ImagesConnues, ImageRendue, VarianteRendue } from '../../core/rendu/page.ts';
import { lireFicheMedia, type FicheMedia } from '../../core/medias/fiche.ts';
import { largeurParDefaut, lireNomDeVariante } from '../../core/medias/variantes.ts';

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

// Les variantes réduites produites au build (ticket 02 de 014, ADR-0031) :
// seules sources que le site public cite.
const ADRESSES_VARIANTES = import.meta.glob('/medias/variantes/*.{webp,png,jpg,jpeg}', {
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

/** Les variantes empaquetées de chaque image, par identité, triées par largeur croissante. */
function variantesEmpaquetees(): ReadonlyMap<string, VarianteRendue[]> {
  const parImage = new Map<string, VarianteRendue[]>();
  for (const [chemin, adresse] of Object.entries(ADRESSES_VARIANTES)) {
    const lue = lireNomDeVariante(chemin.slice(chemin.lastIndexOf('/') + 1));
    if (lue === null) continue;
    const liste = parImage.get(lue.id) ?? [];
    liste.push({ adresse: String(adresse), largeur: lue.largeur });
    parImage.set(lue.id, liste);
  }
  for (const liste of parImage.values()) liste.sort((a, b) => a.largeur - b.largeur);
  return parImage;
}

/** Les images publiées que le rendu peut poser : fiche ET variantes empaquetées ; une fiche sans octets n'en fait pas partie, une image dont les octets sont là sans aucune variante fait échouer la construction. */
export function imagesPubliees(): ImagesConnues {
  const originaux = adressesOriginalesEmpaquetees();
  const variantes = variantesEmpaquetees();
  const images = new Map<string, ImageRendue>();
  for (const fiche of listerFichesMedias()) {
    if (!originaux.has(fiche.id)) continue;
    const siennes = variantes.get(fiche.id);
    if (siennes === undefined || siennes.length === 0) {
      throw new Error(`L'image publiée « ${fiche.id} » n'a aucune variante réduite : la construction ne peut pas la proposer.`);
    }
    const source = siennes.find((v) => v.largeur === largeurParDefaut(siennes.map((w) => w.largeur)));
    images.set(fiche.id, {
      source: (source ?? siennes[0]).adresse,
      largeur: fiche.largeur,
      hauteur: fiche.hauteur,
      description: fiche.description,
      variantes: siennes,
    });
  }
  return images;
}
