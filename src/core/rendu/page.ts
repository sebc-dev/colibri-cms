/**
 * La composition d'une page publique (change 011-apercu-et-publication,
 * ticket 04 ; ADR-0024) : fonction pure qui assemble, depuis la déclaration,
 * l'état publié, les brouillons voulus et les réglages, tout ce que le
 * gabarit du site dessine — titre, navigation, emplacements dans l'ordre,
 * pied de page. Le site publié et l'aperçu (ticket 08) passent par elle ;
 * seule l'origine des brouillons diffère.
 *
 * Zone `core` (I1/I2) : aucune lecture, aucune dépendance de plateforme. Les
 * destinations sont revérifiées ici (`destinationBoutonAutorisee`,
 * `lienVideoAutorise`) : un lien refusé devient du texte, jamais un lien.
 * Rien n'est échappé ici — le gabarit n'écrit que par interpolation (I5).
 */
import {
  adresseDeLaPage,
  type Emplacement,
  type EmplacementCarrousel,
  type EmplacementGalerie,
  type EmplacementImage,
  type PageAvecEmplacements,
  type PageDeclaree,
} from '../pages/declaration.ts';
import { destinationBoutonAutorisee, type Brouillon, type ContenuCorrige } from '../pages/brouillon.ts';
import { lienVideoAutorise } from '../pages/lien-video.ts';
import {
  analyserMarkdownRestreint,
  lienDeTexteRicheAutorise,
  type NoeudDocument,
} from '../pages/texte-riche.ts';
import type { NatureCoordonnee, ReglagesDeclares, ReseauDeclare } from '../reglages/declaration.ts';
import { coordonneesCourantes } from '../reglages/coordonnees.ts';
import type { ChampDeclare, FormulaireDeclare, NatureChamp } from '../formulaires/declaration.ts';
import { formaterPrix } from '../formulaires/prix.ts';

/** Une entrée de la navigation : une page déclarée, la courante marquée. */
export interface EntreeNavigation {
  readonly titre: string;
  readonly adresse: string;
  readonly courante: boolean;
}

/** Un bouton d'action : `adresse` est `null` quand la destination est refusée (texte seul). */
export interface BoutonRendu {
  readonly id: string;
  readonly nature: 'bouton-action';
  readonly libelle: string;
  readonly adresse: string | null;
}

/** Un lien de vidéo : `adresse` est `null` quand l'hébergeur n'est pas reconnu (texte seul). */
export interface LienVideoRendu {
  readonly id: string;
  readonly nature: 'lien-video';
  readonly adresse: string | null;
  readonly lien: string;
}

/** Un texte riche : l'arbre du Markdown restreint, chaque lien revérifié. */
export interface TexteRicheRendu {
  readonly id: string;
  readonly nature: 'texte-riche';
  readonly document: NoeudDocument;
}

/**
 * Une image telle que le rendu la reçoit : `source` est l'adresse que le
 * gabarit écrit (image empaquetée à la construction, ou adresse gardée de
 * l'aperçu), `description` devient le texte de remplacement (vide : image
 * décorative).
 */
export interface ImageRendue {
  readonly source: string;
  readonly largeur: number;
  readonly hauteur: number;
  readonly description: string;
}

/** Une image connue du rendu, par identité stable. */
export type ImagesConnues = ReadonlyMap<string, ImageRendue>;

/** Un emplacement d'image : `image` est `null` quand rien n'est posé (rien ne se dessine). */
export interface ImageEmplacementRendu {
  readonly id: string;
  readonly nature: 'image';
  readonly image: ImageRendue | null;
}

/** Une galerie ou un carrousel : les images dans l'ordre posé, vide si aucune. */
export interface EnsembleImagesRendu {
  readonly id: string;
  readonly nature: 'galerie' | 'carrousel';
  readonly images: readonly ImageRendue[];
}

/** Une option d'un champ à choix ; prix (centimes) et prix affiché seulement en champ avec prix. */
export interface OptionRendue {
  readonly id: string;
  readonly libelle: string;
  readonly prix?: number;
  readonly prixAffiche?: string;
}

/** Un champ du formulaire rendu, dans l'ordre déclaré. */
export interface ChampRendu {
  readonly id: string;
  readonly nature: NatureChamp;
  readonly libelle: string;
  readonly obligatoire: boolean;
  readonly avecPrix: boolean;
  readonly options?: readonly OptionRendue[];
}

/** Le mode d'envoi : `actif` pour un formulaire publié, `desactive` pour un brouillon (aperçu). */
export type ModeEnvoi = 'actif' | 'desactive';

/** Un formulaire posé par un emplacement, tel que le gabarit le dessine (ADR-0027). */
export interface FormulaireRendu {
  readonly id: string;
  readonly nature: 'formulaire';
  readonly nom: string;
  readonly champs: readonly ChampRendu[];
  /** La mention d'information réglée par l'éditrice, analysée en texte riche. */
  readonly mention: NoeudDocument;
  readonly mode: ModeEnvoi;
}

export type EmplacementRendu =
  | FormulaireRendu
  | BoutonRendu
  | LienVideoRendu
  | TexteRicheRendu
  | ImageEmplacementRendu
  | EnsembleImagesRendu;

/** Une image posée par le contenu mais absente des images connues : la construction doit échouer. */
export class ImageManquanteError extends Error {
  readonly mediaId: string;
  readonly page: string;

  constructor(mediaId: string, page: string) {
    super(`L'image « ${mediaId} » posée par la page « ${page} » est absente des images publiées.`);
    this.name = 'ImageManquanteError';
    this.mediaId = mediaId;
    this.page = page;
  }
}

/** Une coordonnée du pied de page. `href` est absent pour un texte ou une adresse. */
export interface CoordonneeRendue {
  readonly nature: NatureCoordonnee;
  readonly nom?: string;
  readonly valeur: string;
  readonly lignes: readonly string[];
  readonly href?: string;
}

/** Un réseau social : `adresse` est `null` quand le lien n'est pas en https (texte seul). */
export interface ReseauRendu {
  readonly nom: string;
  readonly adresse: string | null;
}

export interface PiedRendu {
  readonly coordonnees: readonly CoordonneeRendue[];
  readonly reseaux: readonly ReseauRendu[];
}

export interface PageComposee {
  readonly titre: string;
  readonly navigation: readonly EntreeNavigation[];
  readonly emplacements: readonly EmplacementRendu[];
  readonly pied: PiedRendu;
}

export interface EntreeComposition {
  /** L'identifiant de la page à composer. */
  readonly slug: string;
  /** Toutes les pages déclarées, dans l'ordre posé. */
  readonly pages: readonly PageDeclaree[];
  /** La page déclarée, avec ses emplacements. */
  readonly page: PageAvecEmplacements;
  readonly reglages: ReglagesDeclares;
  /** Les contenus publiés, par identifiant d'emplacement (absents : la déclaration seule). */
  readonly publie?: Brouillon;
  /** Les brouillons voulus (aperçu), qui l'emportent sur le publié. */
  readonly brouillon?: Brouillon;
  /** Les images connues, par identité. Absent : aucune image n'est dessinée ni vérifiée. */
  readonly images?: ImagesConnues;
  /** Les formulaires déclarés, que les emplacements de formulaire désignent. */
  readonly formulaires?: readonly FormulaireDeclare[];
  /** Le mode d'envoi des formulaires rendus (défaut : `actif`). */
  readonly modeEnvoi?: ModeEnvoi;
}

function contenuDe(
  emplacement: Emplacement,
  publie: Brouillon | undefined,
  brouillon: Brouillon | undefined,
): ContenuCorrige | undefined {
  const voulu = brouillon?.get(emplacement.id) ?? publie?.get(emplacement.id);
  return voulu?.nature === emplacement.nature ? voulu : undefined;
}

/** Revérifie chaque lien de l'arbre : une marque refusée disparaît, le texte reste. */
function sansLienRefuse(noeud: NoeudDocument): NoeudDocument {
  const marks = noeud.marks?.filter((m) => {
    if (m.type !== 'link') return true;
    const href = m.attrs?.href;
    return typeof href === 'string' && lienDeTexteRicheAutorise(href);
  });
  return {
    ...noeud,
    ...(marks !== undefined ? { marks } : {}),
    ...(noeud.content !== undefined ? { content: noeud.content.map(sansLienRefuse) } : {}),
  };
}

function imageDe(mediaId: string, slug: string, images: ImagesConnues): ImageRendue {
  const image = images.get(mediaId);
  if (image === undefined) throw new ImageManquanteError(mediaId, slug);
  return image;
}

/** L'image posée dans un emplacement d'image : le contenu voulu, sinon la déclaration (`''` : rien de posé). */
function mediaIdPose(emplacement: EmplacementImage, contenu: ContenuCorrige | undefined): string {
  return contenu?.nature === 'image' ? contenu.mediaId : emplacement.mediaId;
}

/** Les images posées dans une galerie ou un carrousel, dans l'ordre : le contenu voulu, sinon la déclaration. */
function mediaIdsPoses(
  emplacement: EmplacementGalerie | EmplacementCarrousel,
  contenu: ContenuCorrige | undefined,
): readonly string[] {
  return contenu?.nature === 'galerie' || contenu?.nature === 'carrousel' ? contenu.mediaIds : emplacement.mediaIds;
}

function composerImage(
  emplacement: EmplacementImage,
  contenu: ContenuCorrige | undefined,
  slug: string,
  images: ImagesConnues | undefined,
): ImageEmplacementRendu {
  const mediaId = mediaIdPose(emplacement, contenu);
  return {
    id: emplacement.id,
    nature: 'image',
    image: images === undefined || mediaId === '' ? null : imageDe(mediaId, slug, images),
  };
}

function composerEnsemble(
  emplacement: EmplacementGalerie | EmplacementCarrousel,
  contenu: ContenuCorrige | undefined,
  slug: string,
  images: ImagesConnues | undefined,
): EnsembleImagesRendu {
  const mediaIds = mediaIdsPoses(emplacement, contenu);
  return {
    id: emplacement.id,
    nature: emplacement.nature,
    images: images === undefined ? [] : mediaIds.map((mediaId) => imageDe(mediaId, slug, images)),
  };
}

function composerChamp(champ: ChampDeclare): ChampRendu {
  const base = {
    id: champ.id,
    nature: champ.nature,
    libelle: champ.libelle,
    obligatoire: champ.obligatoire,
    avecPrix: champ.avecPrix,
  };
  if (champ.options === undefined) return base;
  return {
    ...base,
    options: champ.options.map(
      (o): OptionRendue =>
        champ.avecPrix && o.prix !== undefined
          ? { id: o.id, libelle: o.libelle, prix: o.prix, prixAffiche: `${formaterPrix(o.prix)} €` }
          : { id: o.id, libelle: o.libelle },
    ),
  };
}

/** Le formulaire désigné, ou `null` quand il n'est pas déclaré (rien ne se dessine). */
function composerFormulaire(
  emplacement: { readonly id: string; readonly formulaire: string },
  formulaires: readonly FormulaireDeclare[],
  reglages: ReglagesDeclares,
  mode: ModeEnvoi,
): FormulaireRendu | null {
  const declare = formulaires.find((f) => f.id === emplacement.formulaire);
  if (declare === undefined) return null;
  return {
    id: emplacement.id,
    nature: 'formulaire',
    nom: declare.nom,
    champs: declare.champs.map(composerChamp),
    mention: sansLienRefuse(analyserMarkdownRestreint(reglages.mention)),
    mode,
  };
}

function composerEmplacement(
  emplacement: Emplacement,
  entree: EntreeComposition,
): EmplacementRendu | null {
  const { publie, brouillon, slug, images } = entree;
  if (emplacement.nature === 'formulaire') {
    return composerFormulaire(emplacement, entree.formulaires ?? [], entree.reglages, entree.modeEnvoi ?? 'actif');
  }
  const contenu = contenuDe(emplacement, publie, brouillon);
  if (emplacement.nature === 'bouton-action') {
    const { libelle, destination } =
      contenu?.nature === 'bouton-action' ? contenu : emplacement;
    return {
      id: emplacement.id,
      nature: 'bouton-action',
      libelle,
      adresse: destinationBoutonAutorisee(destination) ? destination : null,
    };
  }
  if (emplacement.nature === 'lien-video') {
    const lien = contenu?.nature === 'lien-video' ? contenu.lien : emplacement.lien;
    return {
      id: emplacement.id,
      nature: 'lien-video',
      lien,
      adresse: lienVideoAutorise(lien) ? lien : null,
    };
  }
  if (emplacement.nature === 'texte-riche') {
    const markdown = contenu?.nature === 'texte-riche' ? contenu.markdown : emplacement.contenu;
    return {
      id: emplacement.id,
      nature: 'texte-riche',
      document: sansLienRefuse(analyserMarkdownRestreint(markdown)),
    };
  }
  if (emplacement.nature === 'image') return composerImage(emplacement, contenu, slug, images);
  return composerEnsemble(emplacement, contenu, slug, images);
}

function hrefDeCoordonnee(nature: NatureCoordonnee, valeur: string): string | undefined {
  if (nature === 'telephone') return `tel:${valeur.replace(/[^\d+]/g, '')}`;
  if (nature === 'email') return `mailto:${valeur}`;
  return undefined;
}

function composerPied(reglages: ReglagesDeclares): PiedRendu {
  const coordonnees = reglages.coordonnees
    .filter((c) => c.valeur.trim().length > 0)
    .map((c): CoordonneeRendue => {
      const href = hrefDeCoordonnee(c.nature, c.valeur.trim());
      return {
        nature: c.nature,
        ...(c.nom !== undefined ? { nom: c.nom } : {}),
        valeur: c.valeur,
        lignes: c.valeur.split(/\r\n|\r|\n/).map((ligne) => ligne.trim()).filter((l) => l.length > 0),
        ...(href !== undefined ? { href } : {}),
      };
    });
  const reseaux = reglages.reseaux.map(
    (r): ReseauRendu => ({ nom: r.nom, adresse: r.lien.startsWith('https://') ? r.lien : null }),
  );
  return { coordonnees, reseaux };
}

/** Compose la page publique : titre, navigation, emplacements, pied de page. */
export function composerPage(entree: EntreeComposition): PageComposee {
  return {
    titre: entree.page.titre,
    navigation: entree.pages.map((p) => ({
      titre: p.titre,
      adresse: adresseDeLaPage(p.slug),
      courante: p.slug === entree.slug,
    })),
    emplacements: entree.page.emplacements
      .map((e) => composerEmplacement(e, entree))
      .filter((e): e is EmplacementRendu => e !== null),
    pied: composerPied(entree.reglages),
  };
}

/** Les réglages publiés, tels que lus en base (formes non vérifiées). */
export interface ReglagesPubliesBruts {
  readonly coordonnees?: unknown;
  readonly reseaux?: unknown;
  readonly mention?: unknown;
}

function valeursPubliees(brut: unknown): Record<string, string> {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return {};
  return Object.fromEntries(Object.entries(brut).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

function listeReseaux(brut: unknown): ReseauDeclare[] | undefined {
  if (!Array.isArray(brut)) return undefined;
  const lus: ReseauDeclare[] = [];
  for (const r of brut as unknown[]) {
    if (typeof r !== 'object' || r === null) return undefined;
    const { nom, lien } = r as { nom?: unknown; lien?: unknown };
    if (typeof nom !== 'string' || typeof lien !== 'string') return undefined;
    lus.push({ nom, lien });
  }
  return lus;
}

/** La déclaration des réglages recouverte par leur dernière version publiée (jamais un brouillon). */
export function reglagesRecouvertsParLePublie(
  declares: ReglagesDeclares,
  publies: ReglagesPubliesBruts,
): ReglagesDeclares {
  return {
    coordonnees: coordonneesCourantes(declares.coordonnees, valeursPubliees(publies.coordonnees)),
    reseaux: listeReseaux(publies.reseaux) ?? declares.reseaux,
    mention: typeof publies.mention === 'string' ? publies.mention : declares.mention,
  };
}

/** La déclaration des réglages recouverte par le publié, puis par les brouillons (une seule règle de superposition). */
export function reglagesRecouvertsParLeBrouillon(
  declares: ReglagesDeclares,
  publies: ReglagesPubliesBruts,
  brouillons: ReglagesPubliesBruts,
): ReglagesDeclares {
  return reglagesRecouvertsParLePublie(reglagesRecouvertsParLePublie(declares, publies), brouillons);
}

/** Les images que la page pose, une fois le brouillon superposé au publié (sans doublon, dans l'ordre). */
export function imagesPoseesParLaPage(
  page: PageAvecEmplacements,
  publie: Brouillon | undefined,
  brouillon: Brouillon | undefined,
): string[] {
  const ids = new Set<string>();
  for (const emplacement of page.emplacements) {
    const contenu = contenuDe(emplacement, publie, brouillon);
    if (emplacement.nature === 'image') {
      const id = mediaIdPose(emplacement, contenu);
      if (id !== '') ids.add(id);
    } else if (emplacement.nature === 'galerie' || emplacement.nature === 'carrousel') {
      for (const id of mediaIdsPoses(emplacement, contenu)) ids.add(id);
    }
  }
  return [...ids];
}

/** Le chemin d'un lien interne (sans requête ni ancre), ou null pour un lien externe ou en `//hôte`. */
function cheminInterne(lien: string): { chemin: string; reste: string } | null {
  if (!lien.startsWith('/') || lien.startsWith('//')) return null;
  const fin = lien.search(/[?#]/);
  return fin === -1 ? { chemin: lien, reste: '' } : { chemin: lien.slice(0, fin), reste: lien.slice(fin) };
}

/**
 * Dans l'aperçu, un lien vers une page déclarée mène à l'aperçu de cette
 * page (requête et ancre gardées) ; tout autre lien reste identique. L'adresse
 * est construite depuis la déclaration, jamais recopiée du contenu.
 */
export function lienVersLApercu(lien: string, pages: readonly PageDeclaree[]): string {
  const interne = cheminInterne(lien);
  if (interne === null) return lien;
  const page = pages.find((p) => adresseDeLaPage(p.slug) === interne.chemin);
  return page === undefined ? lien : `/admin/apercu${adresseDeLaPage(page.slug)}${interne.reste}`;
}

function noeudVersLApercu(noeud: NoeudDocument, pages: readonly PageDeclaree[]): NoeudDocument {
  const marks = noeud.marks?.map((m) => {
    const href = m.type === 'link' ? m.attrs?.href : undefined;
    return typeof href === 'string' ? { ...m, attrs: { ...m.attrs, href: lienVersLApercu(href, pages) } } : m;
  });
  return {
    ...noeud,
    ...(marks !== undefined ? { marks } : {}),
    ...(noeud.content !== undefined ? { content: noeud.content.map((n) => noeudVersLApercu(n, pages)) } : {}),
  };
}

/** La page composée, ses liens vers les pages déclarées menant à leur aperçu (seule la route de l'aperçu l'appelle). */
export function pageAvecLiensDeLApercu(page: PageComposee, pages: readonly PageDeclaree[]): PageComposee {
  return {
    ...page,
    navigation: page.navigation.map((e) => ({ ...e, adresse: lienVersLApercu(e.adresse, pages) })),
    emplacements: page.emplacements.map((e): EmplacementRendu => {
      if (e.nature === 'bouton-action') {
        return { ...e, adresse: e.adresse === null ? null : lienVersLApercu(e.adresse, pages) };
      }
      if (e.nature === 'texte-riche') return { ...e, document: noeudVersLApercu(e.document, pages) };
      return e;
    }),
  };
}
