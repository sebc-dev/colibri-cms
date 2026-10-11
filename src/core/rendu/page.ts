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

/** Les natures que ce ticket ne dessine pas encore (images : 06). */
export interface EmplacementNonDessine {
  readonly id: string;
  readonly nature: 'image' | 'galerie' | 'carrousel';
}

export type EmplacementRendu = BoutonRendu | LienVideoRendu | TexteRicheRendu | EmplacementNonDessine;

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

function composerEmplacement(
  emplacement: Emplacement,
  publie: Brouillon | undefined,
  brouillon: Brouillon | undefined,
): EmplacementRendu {
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
  return { id: emplacement.id, nature: emplacement.nature };
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
    emplacements: entree.page.emplacements.map((e) => composerEmplacement(e, entree.publie, entree.brouillon)),
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
