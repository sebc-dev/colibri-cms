/**
 * Le récapitulatif de l'écran Publier, pur (change 011, ticket 10) : depuis
 * les déclarations et les objets portant un brouillon, les trois listes de ce
 * qui partirait en ligne. Aucune lecture ici : la plateforme fournit les
 * entrées. Les images et l'exactitude complète sont le ticket 11.
 */

import { imageEffacable } from '../medias/references.ts';

export interface PageRecapitulee {
  readonly slug: string;
  readonly titre: string;
}

export interface ReglageRecapitule {
  readonly nom: string;
  readonly libelle: string;
}

export interface FormulaireRecapitule {
  readonly id: string;
  readonly nom: string;
}

/** Une image telle que la plateforme la fournit au récapitulatif. */
export interface ImageEntree {
  readonly id: string;
  readonly nomAffichage: string;
  readonly description: string;
  /** Vrai si l'image a déjà été publiée. */
  readonly publiee: boolean;
  readonly descriptionPubliee: string | null;
  readonly vignette: string;
}

export interface ImageRecapitulee {
  readonly id: string;
  readonly nom: string;
  readonly vignette: string;
}

export interface Recapitulatif {
  /** Les images publiées dont la description courante diffère de celle en ligne. */
  readonly imagesRedecrites: readonly ImageRecapitulee[];
  /** Les images qu'aucun emplacement ne pose dans son contenu courant. */
  readonly imagesEffacees: readonly ImageRecapitulee[];
  readonly pages: readonly PageRecapitulee[];
  readonly reglages: readonly ReglageRecapitule[];
  readonly formulaires: readonly FormulaireRecapitule[];
}

/** Les réglages dans l'ordre de l'écran Réglages. `libelle` n'est qu'un repli : l'écran Publier affiche LIBELLES_REGLAGES_PUBLIER de src/admin/textes.ts, seule source des textes de l'éditrice. */
const REGLAGES_ORDONNES: readonly ReglageRecapitule[] = [
  { nom: 'coordonnees', libelle: 'Coordonnées' },
  { nom: 'reseaux', libelle: 'Réseaux sociaux' },
  { nom: 'mention', libelle: "Mention d'information" },
];

export interface EntreesRecapitulatif {
  /** Les pages déclarées, dans l'ordre posé par l'intégrateur. */
  readonly pagesDeclarees: readonly PageRecapitulee[];
  readonly slugsAvecBrouillon: ReadonlySet<string>;
  /** Les noms de réglage qui portent un brouillon. */
  readonly reglagesAvecBrouillon: ReadonlySet<string>;
  readonly formulairesDeclares: readonly { readonly id: string; readonly nom: string }[];
  readonly formulairesAvecBrouillon: ReadonlySet<string>;
  readonly images?: readonly ImageEntree[];
  /** Les images posées par le contenu courant : emplacements sans brouillon, puis avec brouillon. */
  readonly referencesPubliees?: ReadonlySet<string>;
  readonly referencesBrouillon?: ReadonlySet<string>;
}

function versImageRecapitulee(image: ImageEntree): ImageRecapitulee {
  return { id: image.id, nom: image.nomAffichage, vignette: image.vignette };
}

export function composerRecapitulatif(entrees: EntreesRecapitulatif): Recapitulatif {
  const images = entrees.images ?? [];
  const publiees = entrees.referencesPubliees ?? new Set<string>();
  const brouillon = entrees.referencesBrouillon ?? new Set<string>();
  const effacable = (i: ImageEntree): boolean => imageEffacable(i.id, publiees, brouillon);
  return {
    imagesRedecrites: images
      .filter((i) => i.publiee && i.description !== (i.descriptionPubliee ?? '') && !effacable(i))
      .map(versImageRecapitulee),
    imagesEffacees: images.filter(effacable).map(versImageRecapitulee),
    pages: entrees.pagesDeclarees
      .filter((p) => entrees.slugsAvecBrouillon.has(p.slug))
      .map((p) => ({ slug: p.slug, titre: p.titre })),
    reglages: REGLAGES_ORDONNES.filter((r) => entrees.reglagesAvecBrouillon.has(r.nom)),
    formulaires: entrees.formulairesDeclares
      .filter((f) => entrees.formulairesAvecBrouillon.has(f.id))
      .map((f) => ({ id: f.id, nom: f.nom })),
  };
}

export function recapitulatifEstVide(recapitulatif: Recapitulatif): boolean {
  return (
    recapitulatif.pages.length === 0 &&
    recapitulatif.reglages.length === 0 &&
    recapitulatif.formulaires.length === 0 &&
    recapitulatif.imagesRedecrites.length === 0 &&
    recapitulatif.imagesEffacees.length === 0
  );
}

/** Un objet que la confirmation engage : son genre, son identité et la version qui le date. */
export interface ObjetEngage {
  readonly genre: 'page' | 'reglage' | 'formulaire' | 'image-redecrite' | 'image-effacee';
  readonly id: string;
  /** Le `maj_le` d'un brouillon, la description d'une image redécrite. */
  readonly version: string;
}

/**
 * Compare deux lignes par unités de code UTF-16, sans dépendre de la langue : l'empreinte
 * doit être la même d'une exécution à l'autre, et deux lignes distinctes ne sont jamais égales.
 */
function comparerParUnitesDeCode(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function hexadecimal(octets: Uint8Array): string {
  return [...octets].map((octet) => octet.toString(16).padStart(2, '0')).join('');
}

/**
 * L'empreinte de ce que le récapitulatif présente : le condensat SHA-256 de la liste triée
 * des objets engagés. Deux listes égales donnent la même empreinte, quel que soit l'ordre
 * de lecture ; un brouillon corrigé (son `maj_le`), une image redécrite ou effacée de plus
 * ou de moins la change (SC-016).
 */
export async function empreinteDuRecapitulatif(objets: readonly ObjetEngage[]): Promise<string> {
  const lignes = objets.map((o) => JSON.stringify([o.genre, o.id, o.version])).sort(comparerParUnitesDeCode);
  const condensat = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lignes.join('\n')));
  return hexadecimal(new Uint8Array(condensat));
}

export const RETOUR_PAR_DEFAUT = '/admin/mes-pages';

/**
 * Vrai si le texte porte un caractère de contrôle (U+0000 à U+001F, U+007F).
 * Parcours par unité UTF-16 : ces caractères y tiennent chacun en une seule
 * unité, et aucune moitié de paire de substitution ne tombe dans ces bornes.
 */
function contientUnCaractereDeControle(texte: string): boolean {
  for (let i = 0; i < texte.length; i += 1) {
    const code = texte.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/**
 * L'adresse de retour de « Annuler » : un chemin interne sous /admin/, jamais
 * une adresse absolue, relative au protocole, ni l'écran Publier lui-même ;
 * sinon l'écran par défaut (pas de redirection ouverte). Les segments de point,
 * en clair ou encodés (%2e), sont refusés.
 */
export function retourSur(brut: string | null | undefined): string {
  if (typeof brut !== 'string') return RETOUR_PAR_DEFAUT;
  if (!brut.startsWith('/admin/')) return RETOUR_PAR_DEFAUT;
  if (brut.includes('\\') || brut.includes('//') || contientUnCaractereDeControle(brut)) {
    return RETOUR_PAR_DEFAUT;
  }
  const chemin = brut.split(/[?#]/, 1)[0] ?? '';
  if (
    chemin.split('/').some((segment) => {
      const point = segment.toLowerCase().replace(/%2e/g, '.');
      return point === '..' || point === '.';
    })
  ) {
    return RETOUR_PAR_DEFAUT;
  }
  if (chemin === '/admin/publier' || chemin.startsWith('/admin/publier/')) return RETOUR_PAR_DEFAUT;
  return brut;
}
