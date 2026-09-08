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
 */
import type { Emplacement } from './declaration.ts';

/** Le contenu corrigé d'un emplacement de bouton d'action (SC-04a). */
export interface ContenuBoutonAction {
  readonly nature: 'bouton-action';
  readonly libelle: string;
  readonly destination: string;
}

/**
 * Le contenu corrigé d'un emplacement, selon sa nature. Seule la nature
 * `bouton-action` est corrigible à ce ticket — les tickets 05 (lien de
 * vidéo) et 06 (texte riche) étendront cette union avec leur propre forme,
 * hors périmètre ici (design.md § Non-Goals).
 */
export type ContenuCorrige = ContenuBoutonAction;

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
  | 'destination-invalide';

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
  return emplacement;
}
