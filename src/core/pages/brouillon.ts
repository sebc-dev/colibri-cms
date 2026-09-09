/**
 * Le brouillon d'une page — ticket 04
 * (openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md),
 * ADR-0012.
 *
 * Zone `core` (docs/architecture.md, I1/I2) : zéro dépendance, ni framework
 * ni plateforme — ce module ne lit, n'écrit et ne persiste rien lui-même.
 * L'écriture réelle en D1 vit dans `src/platform/brouillons/magasin.ts`, qui
 * appelle ce module avec le brouillon déjà lu (I1 : `platform → core`,
 * jamais l'inverse).
 *
 * SC-04a : appliquer une correction produit un NOUVEAU brouillon (structure
 * persistante — `Map` recopiée, jamais mutée en place), sans jamais toucher
 * l'état publié, qui n'a même aucune représentation dans ce module.
 *
 * SC-04b : « porte un brouillon » n'est jamais un champ stocké — c'est une
 * dérivation pure de la seule présence d'au moins une correction
 * (`pagePorteUnBrouillon`).
 *
 * SC-04c/FR-024/025 : `emplacementsDeclares` vient toujours de la lecture de
 * la déclaration (ADR-0012, `core/pages/declaration.ts`), jamais de la
 * requête — c'est ce qui permet de refuser une correction visant un
 * emplacement non déclaré ou d'une nature différente de celle déclarée
 * (aucun geste de structure — ajout, retrait, déplacement, renommage — n'est
 * jamais offert par cette route : seule une correction de CONTENU d'un
 * emplacement déjà déclaré est possible).
 *
 * SC-04h : la destination d'un bouton est validée par liste blanche de
 * schémas (`https`, `mailto`, `tel`, chemin relatif), purement — une
 * destination hors liste est refusée sans qu'aucun appelant n'écrive quoi
 * que ce soit (le refus est rendu par valeur, jamais par exception).
 *
 * Ticket 05 (openspec/changes/003-remplir-emplacements/tickets/
 * 05-regler-lien-video.md) étend `ContenuCorrige` du variant `lien-video` et
 * ajoute `appliquerCorrectionLienVideo`, même patron que la correction de
 * bouton d'action ci-dessus : la reconnaissance du lien (liste blanche
 * d'hébergeurs, SC-05a) vit en un seul lieu, `core/pages/lien-video.ts`.
 *
 * Ticket 06 (openspec/changes/003-remplir-emplacements/tickets/
 * 06-corriger-texte-riche.md) étend `ContenuCorrige` du variant `texte-riche`
 * et ajoute `appliquerCorrectionTexteRiche`, même patron : la correction
 * brute porte le document JSON produit par l'éditeur (TipTap, monté dans
 * l'îlot `admin/ilots-svelte-5/TexteRiche.svelte`) ; sa sérialisation en
 * Markdown restreint (marques retenues, schémas de lien, SC-06a/b/c) vit en
 * un seul lieu, `core/pages/texte-riche.ts`.
 */
import type { Emplacement } from './declaration.ts';
import { lienVideoAutorise } from './lien-video.ts';
import { serialiserMarkdownRestreint, type NoeudDocument } from './texte-riche.ts';

/** Le contenu corrigé d'un emplacement de bouton d'action (SC-04a). */
export interface ContenuBoutonAction {
  readonly nature: 'bouton-action';
  readonly libelle: string;
  readonly destination: string;
}

/** Le contenu corrigé d'un emplacement de lien de vidéo (ticket 05, SC-05a/b). */
export interface ContenuLienVideo {
  readonly nature: 'lien-video';
  readonly lien: string;
}

/** Le contenu corrigé d'un emplacement de texte riche (ticket 06, SC-06a/e). */
export interface ContenuTexteRiche {
  readonly nature: 'texte-riche';
  readonly markdown: string;
}

/**
 * Le contenu corrigé d'un emplacement d'image (ticket 03,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 03-modele-emplacement-image.md, SC-03a/b) — l'identité stable de l'image
 * posée, jamais une copie.
 */
export interface ContenuImage {
  readonly nature: 'image';
  readonly mediaId: string;
}

/**
 * Le contenu corrigé d'un emplacement de galerie (ticket 03, SC-03a/b) — les
 * identités stables des images composées, dans l'ordre voulu. Réordonner ou
 * retirer une image est un remplacement de tout le tableau (modification de
 * CONTENU, jamais de structure, FR-024/025).
 */
export interface ContenuGalerie {
  readonly nature: 'galerie';
  readonly mediaIds: readonly string[];
}

/**
 * Le contenu corrigé d'un emplacement de carrousel (ticket 03, SC-03a/b) —
 * même règle que la galerie ci-dessus : un ensemble ordonné d'identités
 * stables, remplacé en bloc.
 */
export interface ContenuCarrousel {
  readonly nature: 'carrousel';
  readonly mediaIds: readonly string[];
}

/**
 * Le contenu corrigé d'un emplacement, selon sa nature. Les natures
 * `bouton-action` (ticket 04), `lien-video` (ticket 05), `texte-riche`
 * (ticket 06), `image`, `galerie` et `carrousel` (ticket 03, change 004) sont
 * corrigibles.
 */
export type ContenuCorrige =
  | ContenuBoutonAction
  | ContenuLienVideo
  | ContenuTexteRiche
  | ContenuImage
  | ContenuGalerie
  | ContenuCarrousel;

/** Le brouillon d'une page : les corrections courantes, par identifiant d'emplacement stable. */
export type Brouillon = ReadonlyMap<string, ContenuCorrige>;

/** Un brouillon sans aucune correction — l'état initial d'une page jamais corrigée. */
export const BROUILLON_VIDE: Brouillon = new Map();

/** SC-04b — « porte un brouillon » se dérive : vrai dès qu'une correction existe, faux sinon. */
export function pagePorteUnBrouillon(brouillon: Brouillon): boolean {
  return brouillon.size > 0;
}

/** La raison du refus d'une correction — rien n'est jamais persisté quand elle est rendue. */
export type RaisonRefusCorrection =
  | 'emplacement-non-declare'
  | 'nature-non-corrigible'
  | 'forme-invalide'
  | 'destination-invalide'
  | 'lien-invalide';

/** Le résultat d'une tentative de correction (SC-04a/c/h). */
export type ResultatCorrection =
  | { readonly accepte: true; readonly brouillon: Brouillon }
  | { readonly accepte: false; readonly raison: RaisonRefusCorrection };

const SCHEMAS_DESTINATION_AUTORISES: ReadonlySet<string> = new Set(['https:', 'mailto:', 'tel:']);

/**
 * SC-04h — la destination d'un bouton est autorisée si elle est un chemin
 * relatif (commence par `/`, jamais une URL absolue) ou si son schéma
 * appartient à la liste blanche (`https`, `mailto`, `tel`). Une chaîne qui
 * n'est ni l'un ni l'autre (schéma absent hors chemin relatif, schéma
 * inconnu comme `javascript:`, ou chaîne qui n'est même pas une URL) est
 * refusée.
 */
export function destinationBoutonAutorisee(destination: string): boolean {
  if (destination.startsWith('/')) return true;
  try {
    return SCHEMAS_DESTINATION_AUTORISES.has(new URL(destination).protocol);
  } catch {
    return false;
  }
}

function estFormeCorrectionBoutonAction(
  brut: unknown,
): brut is { readonly libelle: string; readonly destination: string } {
  if (typeof brut !== 'object' || brut === null) return false;
  const candidat = brut as Record<string, unknown>;
  return typeof candidat.libelle === 'string' && typeof candidat.destination === 'string';
}

/**
 * Applique une correction de bouton d'action à un brouillon (SC-04a) —
 * fonction pure, instanciable sans D1 ni HTTP (ARCH-5). `emplacementsDeclares`
 * porte la déclaration lue par ailleurs (ADR-0012) : c'est elle, jamais le
 * corps de la requête, qui décide si `idEmplacement` existe et de quelle
 * nature il est (SC-04c). `correctionBrute` est le corps non validé de la
 * requête — sa forme (deux champs texte) et sa destination (SC-04h) sont
 * vérifiées ici avant toute acceptation ; rien n'est jamais enregistré par ce
 * module lui-même, il ne fait que rendre le brouillon qui, une fois accepté,
 * revient à l'appelant pour persistance.
 */
export function appliquerCorrectionBoutonAction(
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
): ResultatCorrection {
  const declare = emplacementsDeclares.find((emplacement) => emplacement.id === idEmplacement);
  if (!declare) return { accepte: false, raison: 'emplacement-non-declare' };
  if (declare.nature !== 'bouton-action') return { accepte: false, raison: 'nature-non-corrigible' };
  if (!estFormeCorrectionBoutonAction(correctionBrute)) return { accepte: false, raison: 'forme-invalide' };
  if (!destinationBoutonAutorisee(correctionBrute.destination)) {
    return { accepte: false, raison: 'destination-invalide' };
  }

  const brouillon = new Map(brouillonActuel);
  brouillon.set(idEmplacement, {
    nature: 'bouton-action',
    libelle: correctionBrute.libelle,
    destination: correctionBrute.destination,
  });
  return { accepte: true, brouillon };
}

function estFormeCorrectionLienVideo(brut: unknown): brut is { readonly lien: string } {
  if (typeof brut !== 'object' || brut === null) return false;
  const candidat = brut as Record<string, unknown>;
  return typeof candidat.lien === 'string';
}

/**
 * Applique une correction de lien de vidéo à un brouillon (ticket 05,
 * SC-05a/b/c) — même patron que `appliquerCorrectionBoutonAction` ci-dessus :
 * fonction pure, `emplacementsDeclares` décide seule de l'existence et de la
 * nature de `idEmplacement` (jamais le corps de la requête). Un lien dont
 * l'hôte n'appartient pas à la liste blanche d'hébergeurs
 * (`lienVideoAutorise`, `core/pages/lien-video.ts`) est refusé sans que rien
 * ne soit jamais enregistré par ce module lui-même — le refus est rendu par
 * valeur, avant toute persistance côté appelant.
 */
export function appliquerCorrectionLienVideo(
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
): ResultatCorrection {
  const declare = emplacementsDeclares.find((emplacement) => emplacement.id === idEmplacement);
  if (!declare) return { accepte: false, raison: 'emplacement-non-declare' };
  if (declare.nature !== 'lien-video') return { accepte: false, raison: 'nature-non-corrigible' };
  if (!estFormeCorrectionLienVideo(correctionBrute)) return { accepte: false, raison: 'forme-invalide' };
  if (!lienVideoAutorise(correctionBrute.lien)) {
    return { accepte: false, raison: 'lien-invalide' };
  }

  const brouillon = new Map(brouillonActuel);
  brouillon.set(idEmplacement, { nature: 'lien-video', lien: correctionBrute.lien });
  return { accepte: true, brouillon };
}

function estFormeCorrectionTexteRiche(brut: unknown): brut is { readonly document: NoeudDocument } {
  if (typeof brut !== 'object' || brut === null) return false;
  const candidat = brut as Record<string, unknown>;
  return typeof candidat.document === 'object' && candidat.document !== null;
}

/**
 * Applique une correction de texte riche à un brouillon (ticket 06,
 * SC-06a/b/c/e) — même patron que les fonctions ci-dessus : fonction pure,
 * `emplacementsDeclares` décide seule de l'existence et de la nature de
 * `idEmplacement` (jamais le corps de la requête). `correctionBrute.document`
 * porte le document JSON produit par l'éditeur (TipTap) ; il est sérialisé en
 * Markdown restreint par `serialiserMarkdownRestreint`
 * (`core/pages/texte-riche.ts`), qui écarte déjà toute marque hors liste et
 * tout lien de schéma non autorisé (SC-06b/c) — cette fonction n'a donc rien
 * de plus à refuser une fois la forme reconnue : une correction de texte
 * riche formée n'est jamais rejetée pour son CONTENU, seule sa mise en forme
 * l'est, marque par marque.
 */
export function appliquerCorrectionTexteRiche(
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
): ResultatCorrection {
  const declare = emplacementsDeclares.find((emplacement) => emplacement.id === idEmplacement);
  if (!declare) return { accepte: false, raison: 'emplacement-non-declare' };
  if (declare.nature !== 'texte-riche') return { accepte: false, raison: 'nature-non-corrigible' };
  if (!estFormeCorrectionTexteRiche(correctionBrute)) return { accepte: false, raison: 'forme-invalide' };

  const markdown = serialiserMarkdownRestreint(correctionBrute.document);
  const brouillon = new Map(brouillonActuel);
  brouillon.set(idEmplacement, { nature: 'texte-riche', markdown });
  return { accepte: true, brouillon };
}

function estFormeCorrectionImage(brut: unknown): brut is { readonly mediaId: string } {
  if (typeof brut !== 'object' || brut === null) return false;
  const candidat = brut as Record<string, unknown>;
  return typeof candidat.mediaId === 'string' && candidat.mediaId.length > 0;
}

function estFormeCorrectionMediaIds(brut: unknown): brut is { readonly mediaIds: readonly string[] } {
  if (typeof brut !== 'object' || brut === null) return false;
  const candidat = brut as Record<string, unknown>;
  return (
    Array.isArray(candidat.mediaIds) &&
    candidat.mediaIds.every((element) => typeof element === 'string' && element.length > 0)
  );
}

/**
 * Applique la pose d'une image à un brouillon (ticket 03,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 03-modele-emplacement-image.md, SC-03b) — même patron que
 * `appliquerCorrectionBoutonAction` ci-dessus : fonction pure,
 * `emplacementsDeclares` décide seule de l'existence et de la nature de
 * `idEmplacement` (jamais le corps reçu). Ce module ne vérifie pas que
 * `mediaId` existe réellement dans la bibliothèque des médias (hors
 * périmètre de ce ticket) — seule la forme (chaîne non vide) est validée
 * ici.
 */
export function appliquerCorrectionImage(
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
): ResultatCorrection {
  const declare = emplacementsDeclares.find((emplacement) => emplacement.id === idEmplacement);
  if (!declare) return { accepte: false, raison: 'emplacement-non-declare' };
  if (declare.nature !== 'image') return { accepte: false, raison: 'nature-non-corrigible' };
  if (!estFormeCorrectionImage(correctionBrute)) return { accepte: false, raison: 'forme-invalide' };

  const brouillon = new Map(brouillonActuel);
  brouillon.set(idEmplacement, { nature: 'image', mediaId: correctionBrute.mediaId });
  return { accepte: true, brouillon };
}

/**
 * Applique la composition d'une galerie à un brouillon (ticket 03, SC-03b) —
 * même patron que ci-dessus. Réordonner ou retirer une image est un
 * remplacement de tout le tableau ordonné `mediaIds` (modification de
 * CONTENU, jamais de structure, FR-024/025) : cette fonction ne propose donc
 * pas d'ajout/retrait incrémental, seulement le remplacement en bloc.
 */
export function appliquerCorrectionGalerie(
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
): ResultatCorrection {
  const declare = emplacementsDeclares.find((emplacement) => emplacement.id === idEmplacement);
  if (!declare) return { accepte: false, raison: 'emplacement-non-declare' };
  if (declare.nature !== 'galerie') return { accepte: false, raison: 'nature-non-corrigible' };
  if (!estFormeCorrectionMediaIds(correctionBrute)) return { accepte: false, raison: 'forme-invalide' };

  const brouillon = new Map(brouillonActuel);
  brouillon.set(idEmplacement, { nature: 'galerie', mediaIds: correctionBrute.mediaIds });
  return { accepte: true, brouillon };
}

/**
 * Applique la composition (ou le réordonnancement) d'un carrousel à un
 * brouillon (ticket 03, SC-03b) — même patron et même règle que
 * `appliquerCorrectionGalerie` ci-dessus : un remplacement en bloc du
 * tableau ordonné `mediaIds`.
 */
export function appliquerCorrectionCarrousel(
  emplacementsDeclares: readonly Emplacement[],
  brouillonActuel: Brouillon,
  idEmplacement: string,
  correctionBrute: unknown,
): ResultatCorrection {
  const declare = emplacementsDeclares.find((emplacement) => emplacement.id === idEmplacement);
  if (!declare) return { accepte: false, raison: 'emplacement-non-declare' };
  if (declare.nature !== 'carrousel') return { accepte: false, raison: 'nature-non-corrigible' };
  if (!estFormeCorrectionMediaIds(correctionBrute)) return { accepte: false, raison: 'forme-invalide' };

  const brouillon = new Map(brouillonActuel);
  brouillon.set(idEmplacement, { nature: 'carrousel', mediaIds: correctionBrute.mediaIds });
  return { accepte: true, brouillon };
}

/**
 * Superpose le brouillon au contenu déclaré d'un emplacement, pour que
 * l'`Écran : Éditeur de page` reflète la dernière correction plutôt que la
 * seule valeur initiale posée par l'intégrateur (ADR-0012). Un emplacement
 * sans correction, ou dont la nature ne correspond pas à celle du contenu
 * corrigé trouvé, est rendu inchangé.
 */
export function appliquerBrouillonSurEmplacement(
  emplacement: Emplacement,
  brouillon: Brouillon,
): Emplacement {
  const correction = brouillon.get(emplacement.id);
  if (!correction) return emplacement;
  if (emplacement.nature === 'bouton-action' && correction.nature === 'bouton-action') {
    return { ...emplacement, libelle: correction.libelle, destination: correction.destination };
  }
  if (emplacement.nature === 'lien-video' && correction.nature === 'lien-video') {
    return { ...emplacement, lien: correction.lien };
  }
  if (emplacement.nature === 'texte-riche' && correction.nature === 'texte-riche') {
    return { ...emplacement, contenu: correction.markdown };
  }
  if (emplacement.nature === 'image' && correction.nature === 'image') {
    return { ...emplacement, mediaId: correction.mediaId };
  }
  if (emplacement.nature === 'galerie' && correction.nature === 'galerie') {
    return { ...emplacement, mediaIds: correction.mediaIds };
  }
  if (emplacement.nature === 'carrousel' && correction.nature === 'carrousel') {
    return { ...emplacement, mediaIds: correction.mediaIds };
  }
  return emplacement;
}
