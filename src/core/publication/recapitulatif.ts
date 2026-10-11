/**
 * Le récapitulatif de l'écran Publier, pur (change 011, ticket 10) : depuis
 * les déclarations et les objets portant un brouillon, les trois listes de ce
 * qui partirait en ligne. Aucune lecture ici : la plateforme fournit les
 * entrées. Les images et l'exactitude complète sont le ticket 11.
 */

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

export interface Recapitulatif {
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
}

export function composerRecapitulatif(entrees: EntreesRecapitulatif): Recapitulatif {
  return {
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
    recapitulatif.pages.length === 0 && recapitulatif.reglages.length === 0 && recapitulatif.formulaires.length === 0
  );
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
