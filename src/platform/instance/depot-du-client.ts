/**
 * Logique décidable de la préparation du dépôt du client (geste `depot` de
 * `scripts/livraison.mjs`, ADR-0034, ADR-0035, I9). Pure : ne lit ni ne
 * n'écrit rien, ne lance aucun processus ; l'enveloppe fournit les faits.
 */

/**
 * Ce qui n'entre jamais dans le dépôt du client : l'automatisation de la
 * forge (la publication n'y écrit jamais, I9 et ADR-0025), puis l'outillage
 * et les documents de travail de l'intégrateur, qui portent ses identifiants.
 */
export const EXCLUSIONS_DU_DEPOT: readonly string[] = [
  '.github',
  '.claude',
  'openspec',
  'docs',
  'recette',
  'CLAUDE.md',
];

/** Vrai si le chemin (relatif à la racine du produit) est l'une des exclusions ou s'y trouve. */
export function estExclu(chemin: string): boolean {
  const propre = chemin.replace(/^\.\//, '');
  return EXCLUSIONS_DU_DEPOT.some((exclu) => propre === exclu || propre.startsWith(`${exclu}/`));
}

/** Les chemins que `git archive` ne doit pas extraire, en pathspec d'exclusion. */
export function specificationsDExclusion(): string[] {
  return EXCLUSIONS_DU_DEPOT.map((exclu) => `:(exclude)${exclu}`);
}

export interface EtatDuDepot {
  /** Le dépôt porte déjà au moins un commit (il a déjà été préparé). */
  readonly aDejaUnCommit: boolean;
  /** La branche des images existe déjà (en local ou sur l'origine). */
  readonly brancheDesImagesPosee: boolean;
}

export interface DecisionDeRemplissage {
  /** `depart` : poser le contenu de départ ; `garder` : le contenu du dépôt reste tel quel. */
  readonly contenu: 'depart' | 'garder';
  /** `amorcer` : créer la branche des images ; `laisser` : ne pas y toucher. */
  readonly images: 'amorcer' | 'laisser';
}

/**
 * Premier remplissage ou rejeu. Le contenu de départ n'est posé que sur un
 * dépôt sans commit ; la branche des images n'est amorcée qu'une fois, ensuite
 * c'est la publication qui l'écrit.
 */
export function decider(etat: EtatDuDepot): DecisionDeRemplissage {
  return {
    contenu: etat.aDejaUnCommit ? 'garder' : 'depart',
    images: etat.brancheDesImagesPosee ? 'laisser' : 'amorcer',
  };
}

const EXTENSIONS_D_IMAGE = ['png', 'jpg', 'jpeg', 'webp'];

export interface ImagesRetenues {
  /** Chemins (dans la branche des images) des octets à reprendre. */
  readonly retenues: string[];
  /** Identités des images désignées dont aucun octet n'existe dans la source. */
  readonly manquantes: string[];
}

/**
 * Les images que le contenu de départ désigne : pour chaque identité de fiche,
 * le fichier `medias/<id>.<extension>` de la source. Les variantes
 * (`medias/variantes/…`) ne sont jamais reprises : la construction les produit.
 */
export function choisirLesImages(identites: readonly string[], cheminsDeLaSource: readonly string[]): ImagesRetenues {
  const retenues: string[] = [];
  const manquantes: string[] = [];
  for (const id of [...new Set(identites)]) {
    const trouve = EXTENSIONS_D_IMAGE.map((extension) => `medias/${id}.${extension}`).find((chemin) =>
      cheminsDeLaSource.includes(chemin),
    );
    if (trouve === undefined) manquantes.push(id);
    else retenues.push(trouve);
  }
  return { retenues, manquantes };
}

/** L'identité d'une fiche d'image (`content/medias/<id>.json`), lue sur son texte ; `null` si elle n'en porte pas. */
export function identiteDeLaFiche(texte: string): string | null {
  try {
    const brut: unknown = JSON.parse(texte);
    if (typeof brut !== 'object' || brut === null) return null;
    const { id } = brut as Record<string, unknown>;
    return typeof id === 'string' && id.trim() !== '' ? id : null;
  } catch {
    return null;
  }
}
