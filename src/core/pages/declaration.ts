/**
 * Le modèle de lecture de la déclaration des pages (ticket 02,
 * openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md ;
 * ticket 03, openspec/changes/003-remplir-emplacements/tickets/
 * 03-editeur-emplacements.md ; ADR-0012 — la déclaration des pages et
 * emplacements, un `page.json` par page, posé par l'intégrateur hors
 * administration).
 *
 * Zone `core` (docs/architecture.md, I1/I2) : zéro dépendance, ni framework
 * ni plateforme — ce fichier ne lit aucun fichier lui-même. Le chargement du
 * contenu versionné (`content/pages/`, empaqueté au build par Vite) vit dans
 * `src/platform/contenu/pages.ts`, qui appelle ce module avec le contenu déjà
 * lu (I1 : `platform → core`, jamais l'inverse). Fonctions pures,
 * instanciables sans D1 ni Worker (ARCH-5, ADR-0012 § Vérifiable).
 *
 * SC-02a : l'ordre rendu est celui du **rang** posé dans chaque `page.json`
 * — jamais un tri recalculé sur le slug ou le titre.
 *
 * Ticket 03 : chaque `page.json` porte, pour chaque emplacement, un
 * identifiant stable, une nature (texte riche, lien de vidéo, bouton
 * d'action) et un rang (ADR-0012 § Décision) ; le contenu initial d'un
 * emplacement de texte riche vit dans un `.md` du même répertoire (candidat
 * `format-du-contenu-un-repertoire-par-objet`), déjà lu par `platform/` au
 * moment où ce module l'assemble — ce module ne lit toujours aucun fichier
 * lui-même. Une entrée d'emplacement dont la forme ne correspond pas à sa
 * nature est ignorée, au même titre qu'un `page.json` mal formé
 * (SC-02a/§ ci-dessus) : une faute de forme de l'intégrateur se constate à la
 * lecture, jamais en panne pour l'éditrice.
 */

/** La nature d'un emplacement, posée par l'intégrateur (ADR-0012). */
export type NatureEmplacement = 'texte-riche' | 'lien-video' | 'bouton-action';

const NATURES_VALIDES: readonly NatureEmplacement[] = ['texte-riche', 'lien-video', 'bouton-action'];

/** La forme attendue d'un emplacement dans un `page.json`, avant validation. */
export interface EmplacementJson {
  readonly id: string;
  readonly nature: NatureEmplacement;
  readonly rang: number;
  readonly lien?: string;
  readonly libelle?: string;
  readonly destination?: string;
}

/** La forme attendue d'un `page.json` — seuls les champs lus par ce ticket. */
export interface PageJson {
  readonly titre: string;
  readonly rang: number;
  readonly emplacements?: readonly EmplacementJson[];
}

/** Un emplacement de texte riche, présenté avec son contenu courant (SC-03c). */
export interface EmplacementTexteRiche {
  readonly id: string;
  readonly nature: 'texte-riche';
  readonly rang: number;
  readonly contenu: string;
}

/** Un emplacement de lien de vidéo, présenté avec son contenu courant (SC-03c). */
export interface EmplacementLienVideo {
  readonly id: string;
  readonly nature: 'lien-video';
  readonly rang: number;
  readonly lien: string;
}

/** Un emplacement de bouton d'action, présenté avec son contenu courant (SC-03c). */
export interface EmplacementBoutonAction {
  readonly id: string;
  readonly nature: 'bouton-action';
  readonly rang: number;
  readonly libelle: string;
  readonly destination: string;
}

/** Un emplacement déclaré, présenté selon sa nature (SC-03b). */
export type Emplacement = EmplacementTexteRiche | EmplacementLienVideo | EmplacementBoutonAction;

/** Une page déclarée, avec ses emplacements dans l'ordre posé (ticket 03). */
export interface PageAvecEmplacements {
  readonly titre: string;
  readonly emplacements: readonly Emplacement[];
}

/** Une page déclarée, telle qu'affichée par l'`Écran : Liste des pages`. */
export interface PageDeclaree {
  readonly slug: string;
  readonly titre: string;
}

/** Un fichier `page.json` brut, avant validation de sa forme. */
export interface FichierDeclarationBrut {
  readonly slug: string;
  readonly contenu: unknown;
}

function estPageJsonValide(valeur: unknown): valeur is PageJson {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const candidat = valeur as Record<string, unknown>;
  return typeof candidat.titre === 'string' && typeof candidat.rang === 'number';
}

/**
 * Ordonne les pages déclarées selon le rang posé par l'intégrateur (SC-02a).
 * Une entrée dont le contenu ne correspond pas à la forme attendue est
 * ignorée plutôt que de faire échouer tout l'écran : une faute de forme de
 * l'intégrateur se constate à la lecture (ADR-0012 § Négatives), jamais en
 * panne pour l'éditrice. Un répertoire vide rend un tableau vide — l'état
 * vide de l'écran (SC-02b) en découle sans branche dédiée ici.
 */
export function trierPagesDeclarees(fichiers: readonly FichierDeclarationBrut[]): PageDeclaree[] {
  return fichiers
    .map((fichier) => ({ slug: fichier.slug, contenu: fichier.contenu }))
    .filter(
      (fichier): fichier is { slug: string; contenu: PageJson } => estPageJsonValide(fichier.contenu),
    )
    .sort((a, b) => a.contenu.rang - b.contenu.rang)
    .map((fichier) => ({ slug: fichier.slug, titre: fichier.contenu.titre }));
}

function estNatureValide(valeur: unknown): valeur is NatureEmplacement {
  return typeof valeur === 'string' && (NATURES_VALIDES as readonly string[]).includes(valeur);
}

/**
 * Valide et construit un emplacement selon sa nature (ticket 03, SC-03b) —
 * le contenu courant d'un emplacement de texte riche vient du `.md` déjà lu
 * par `platform/` (`contenusTexteRiche`, indexé par identifiant
 * d'emplacement) ; celui d'un lien de vidéo ou d'un bouton d'action vient
 * directement du `page.json` (ADR-0012). Une entrée dont la forme ne
 * correspond pas à sa nature (champ manquant ou de mauvais type) est
 * écartée — même geste que `estPageJsonValide` ci-dessus.
 */
function construireEmplacement(
  brut: unknown,
  contenusTexteRiche: ReadonlyMap<string, string>,
): Emplacement | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const candidat = brut as Record<string, unknown>;
  if (typeof candidat.id !== 'string' || typeof candidat.rang !== 'number') return null;
  if (!estNatureValide(candidat.nature)) return null;

  const { id, rang } = candidat as { id: string; rang: number };

  switch (candidat.nature) {
    case 'texte-riche':
      return { id, nature: 'texte-riche', rang, contenu: contenusTexteRiche.get(id) ?? '' };
    case 'lien-video':
      if (typeof candidat.lien !== 'string' || candidat.lien.length === 0) return null;
      return { id, nature: 'lien-video', rang, lien: candidat.lien };
    case 'bouton-action':
      if (typeof candidat.libelle !== 'string' || typeof candidat.destination !== 'string') return null;
      return { id, nature: 'bouton-action', rang, libelle: candidat.libelle, destination: candidat.destination };
    default:
      return null;
  }
}

/**
 * Ordonne les emplacements déclarés d'une page selon le rang posé par
 * l'intégrateur, chacun présenté selon sa nature avec son contenu courant
 * (ticket 03, SC-03b/SC-03c). Une entrée mal formée est écartée plutôt que
 * de faire échouer tout l'écran (même principe que `trierPagesDeclarees`).
 */
export function trierEmplacementsDeclares(
  emplacements: readonly unknown[] | undefined,
  contenusTexteRiche: ReadonlyMap<string, string> = new Map(),
): Emplacement[] {
  if (!emplacements) return [];
  return emplacements
    .map((brut) => construireEmplacement(brut, contenusTexteRiche))
    .filter((emplacement): emplacement is Emplacement => emplacement !== null)
    .sort((a, b) => a.rang - b.rang);
}

/**
 * Construit une page avec ses emplacements à partir du contenu brut d'un
 * `page.json` (ticket 03) — `null` si le contenu ne correspond pas à la
 * forme attendue d'une page déclarée (même garde que `trierPagesDeclarees`).
 */
export function construirePageAvecEmplacements(
  contenuBrut: unknown,
  contenusTexteRiche: ReadonlyMap<string, string> = new Map(),
): PageAvecEmplacements | null {
  if (!estPageJsonValide(contenuBrut)) return null;
  return {
    titre: contenuBrut.titre,
    emplacements: trierEmplacementsDeclares(contenuBrut.emplacements, contenusTexteRiche),
  };
}
