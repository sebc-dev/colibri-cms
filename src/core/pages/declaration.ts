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
 *
 * Ticket 01 (openspec/changes/006-nom-des-emplacements/tickets/
 * 01-nom-lu-avec-la-declaration.md, D1/D2, ADR-0012) : chaque `page.json`
 * peut porter, en plus des champs ci-dessus, un `nom` facultatif par
 * emplacement — un nom court écrit par l'intégrateur pour l'éditrice,
 * affiché dans les écrans d'administration des tickets suivants (hors
 * périmètre ici). Un nom mal formé (pas du texte, ou vide après retrait des
 * espaces de bord) devient « pas de nom » plutôt que d'écarter l'emplacement
 * (SC-01c) — seul cas où une forme fautive ne fait pas perdre l'entrée dans
 * ce module. Aucun nom n'est jamais fabriqué depuis l'identifiant (FR-117).
 */

/**
 * La nature d'un emplacement, posée par l'intégrateur (ADR-0012). Ticket 03
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 03-modele-emplacement-image.md) : `image` porte une seule image, `galerie`
 * et `carrousel` portent un ensemble ORDONNÉ d'images.
 */
export type NatureEmplacement =
  | 'texte-riche'
  | 'lien-video'
  | 'bouton-action'
  | 'image'
  | 'galerie'
  | 'carrousel';

const NATURES_VALIDES: readonly NatureEmplacement[] = [
  'texte-riche',
  'lien-video',
  'bouton-action',
  'image',
  'galerie',
  'carrousel',
];

/** La forme attendue d'un emplacement dans un `page.json`, avant validation. */
export interface EmplacementJson {
  readonly id: string;
  readonly nature: NatureEmplacement;
  readonly rang: number;
  readonly nom?: string;
  readonly lien?: string;
  readonly libelle?: string;
  readonly destination?: string;
  readonly mediaId?: string;
  readonly mediaIds?: readonly string[];
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
  readonly nom?: string;
}

/** Un emplacement de lien de vidéo, présenté avec son contenu courant (SC-03c). */
export interface EmplacementLienVideo {
  readonly id: string;
  readonly nature: 'lien-video';
  readonly rang: number;
  readonly lien: string;
  readonly nom?: string;
}

/** Un emplacement de bouton d'action, présenté avec son contenu courant (SC-03c). */
export interface EmplacementBoutonAction {
  readonly id: string;
  readonly nature: 'bouton-action';
  readonly rang: number;
  readonly libelle: string;
  readonly destination: string;
  readonly nom?: string;
}

/**
 * Un emplacement d'image, présenté avec son contenu courant — l'identité
 * stable de l'image référencée (ticket 03, SC-03a).
 */
export interface EmplacementImage {
  readonly id: string;
  readonly nature: 'image';
  readonly rang: number;
  readonly mediaId: string;
  readonly nom?: string;
}

/**
 * Un emplacement de galerie, présenté avec son contenu courant — les
 * identités stables des images référencées, dans l'ordre posé (ticket 03,
 * SC-03a).
 */
export interface EmplacementGalerie {
  readonly id: string;
  readonly nature: 'galerie';
  readonly rang: number;
  readonly mediaIds: readonly string[];
  readonly nom?: string;
}

/**
 * Un emplacement de carrousel, présenté avec son contenu courant — les
 * identités stables des images référencées, dans l'ordre posé (ticket 03,
 * SC-03a).
 */
export interface EmplacementCarrousel {
  readonly id: string;
  readonly nature: 'carrousel';
  readonly rang: number;
  readonly mediaIds: readonly string[];
  readonly nom?: string;
}

/** Un emplacement déclaré, présenté selon sa nature (SC-03b). */
export type Emplacement =
  | EmplacementTexteRiche
  | EmplacementLienVideo
  | EmplacementBoutonAction
  | EmplacementImage
  | EmplacementGalerie
  | EmplacementCarrousel;

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

/**
 * L'adresse d'une page sur le site, affichée sous son titre dans « Mes pages »
 * (ticket 07, SC-07a, openspec/changes/005-mise-en-page-administration/
 * tickets/07-mes-pages-habille.md ; règle fixée au design.md du change §D5).
 * Dérivée de l'identifiant déclaré, sans lecture nouvelle (ADR-0012) : la page
 * `accueil` a pour adresse `/`, toute autre page `/<identifiant>`. Vit dans
 * `core` pour que la future route publique en tire les mêmes chemins (I1).
 */
export function adresseDeLaPage(slug: string): string {
  return slug === 'accueil' ? '/' : `/${slug}`;
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
 * Normalise le nom déclaré d'un emplacement (ticket 01, openspec/changes/
 * 006-nom-des-emplacements/tickets/01-nom-lu-avec-la-declaration.md, D2,
 * ADR-0012) — distincte des gardes `estXxx` ci-dessus qui ÉCARTENT une
 * entrée mal formée : un nom mal formé ne fait jamais perdre l'emplacement,
 * il devient « pas de nom » (SC-01c). Une valeur qui n'est pas du texte
 * (nombre, objet, `null`…) rend `undefined` ; une valeur texte est
 * débarrassée de ses espaces de bord (SC-01a) ; vide après ce retrait, elle
 * rend aussi `undefined` (SC-01b/c). Aucune longueur maximale. Aucun nom
 * n'est jamais fabriqué depuis l'identifiant de l'emplacement (FR-117) — ce
 * module ne lit que le champ `nom`, jamais `id`.
 */
function normaliserNomEmplacement(valeur: unknown): string | undefined {
  if (typeof valeur !== 'string') return undefined;
  const nom = valeur.trim();
  return nom.length > 0 ? nom : undefined;
}

/**
 * Valide et construit un emplacement selon sa nature (ticket 03, SC-03b) —
 * le contenu courant d'un emplacement de texte riche vient du `.md` déjà lu
 * par `platform/` (`contenusTexteRiche`, indexé par identifiant
 * d'emplacement) ; celui d'un lien de vidéo ou d'un bouton d'action vient
 * directement du `page.json` (ADR-0012). Une entrée dont la forme ne
 * correspond pas à sa nature (champ manquant ou de mauvais type) est
 * écartée — même geste que `estPageJsonValide` ci-dessus. Le nom déclaré
 * (ticket 01, SC-01a/b/c) est lu et normalisé pour chaque nature — un nom
 * mal formé ne fait JAMAIS partie des raisons d'écarter une entrée, à la
 * différence des autres champs ci-dessous.
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
  const nom = normaliserNomEmplacement(candidat.nom);
  const avecNom = nom !== undefined ? { nom } : {};

  switch (candidat.nature) {
    case 'texte-riche':
      return { id, nature: 'texte-riche', rang, contenu: contenusTexteRiche.get(id) ?? '', ...avecNom };
    case 'lien-video':
      if (typeof candidat.lien !== 'string' || candidat.lien.length === 0) return null;
      return { id, nature: 'lien-video', rang, lien: candidat.lien, ...avecNom };
    case 'bouton-action':
      if (typeof candidat.libelle !== 'string' || typeof candidat.destination !== 'string') return null;
      return {
        id,
        nature: 'bouton-action',
        rang,
        libelle: candidat.libelle,
        destination: candidat.destination,
        ...avecNom,
      };
    case 'image':
      if (typeof candidat.mediaId !== 'string' || candidat.mediaId.length === 0) return null;
      return { id, nature: 'image', rang, mediaId: candidat.mediaId, ...avecNom };
    case 'galerie':
      if (!estTableauDeMediaIds(candidat.mediaIds)) return null;
      return { id, nature: 'galerie', rang, mediaIds: candidat.mediaIds, ...avecNom };
    case 'carrousel':
      if (!estTableauDeMediaIds(candidat.mediaIds)) return null;
      return { id, nature: 'carrousel', rang, mediaIds: candidat.mediaIds, ...avecNom };
    default:
      return null;
  }
}

/**
 * Une entrée de galerie ou de carrousel n'est reconnue que si `mediaIds` est
 * un tableau (pas une chaîne, pas un objet) dont chaque élément est
 * lui-même une identité stable non vide — une identité mal formée écarte
 * l'entrée entière, comme pour les autres natures (ticket 03, SC-03a).
 */
function estTableauDeMediaIds(valeur: unknown): valeur is readonly string[] {
  return Array.isArray(valeur) && valeur.every((element) => typeof element === 'string' && element.length > 0);
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
