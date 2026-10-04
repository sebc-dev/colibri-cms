/**
 * Vérification des coordonnées selon leur nature (ticket 03,
 * openspec/changes/008-reglages-transverses/tickets/
 * 03-verifier-les-coordonnees.md ; ADR-0017, ADR-0005).
 *
 * Zone `core` (I2) : logique pure, sans framework ni plateforme. But :
 * arrêter la faute de frappe, pas prouver l'existence d'un numéro. Un refus
 * porte un code de raison, jamais un texte (la traduction vit dans l'îlot).
 */
import type { CoordonneeDeclaree, NatureCoordonnee } from './declaration.ts';

/** Longueur maximale d'un texte d'une ligne. */
export const TEXTE_LONGUEUR_MAX = 120;
/** Nombre minimal et maximal de chiffres d'un téléphone. */
export const TELEPHONE_CHIFFRES_MIN = 6;
export const TELEPHONE_CHIFFRES_MAX = 15;
/** Longueur maximale d'une adresse e-mail. */
export const EMAIL_LONGUEUR_MAX = 254;
/** Bornes d'une adresse postale. */
export const ADRESSE_LIGNES_MAX = 5;
export const ADRESSE_LONGUEUR_MAX = 300;

/** Le code de la raison d'un refus, par nature. */
export type RaisonRefus =
  | 'texte-trop-long'
  | 'texte-plusieurs-lignes'
  | 'telephone-caracteres'
  | 'telephone-chiffres'
  | 'email-forme'
  | 'email-trop-long'
  | 'adresse-trop-de-lignes'
  | 'adresse-trop-longue';

export type VerdictCoordonnee =
  | { readonly ok: true; readonly valeur: string }
  | { readonly ok: false; readonly raison: RaisonRefus };

const TELEPHONE_FORME = /^\+?[\d\s.\-()]+$/;
const EMAIL_FORME = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

function accepte(valeur: string): VerdictCoordonnee {
  return { ok: true, valeur };
}

function refuse(raison: RaisonRefus): VerdictCoordonnee {
  return { ok: false, raison };
}

function verifierTexte(valeur: string): VerdictCoordonnee {
  if (/[\r\n]/.test(valeur)) return refuse('texte-plusieurs-lignes');
  if (valeur.length > TEXTE_LONGUEUR_MAX) return refuse('texte-trop-long');
  return accepte(valeur);
}

function verifierTelephone(valeur: string): VerdictCoordonnee {
  if (!TELEPHONE_FORME.test(valeur)) return refuse('telephone-caracteres');
  const chiffres = valeur.replace(/\D/g, '').length;
  if (chiffres < TELEPHONE_CHIFFRES_MIN || chiffres > TELEPHONE_CHIFFRES_MAX) {
    return refuse('telephone-chiffres');
  }
  return accepte(valeur);
}

function verifierEmail(valeur: string): VerdictCoordonnee {
  if (valeur.length > EMAIL_LONGUEUR_MAX) return refuse('email-trop-long');
  if (!EMAIL_FORME.test(valeur)) return refuse('email-forme');
  return accepte(valeur);
}

function verifierAdresse(valeur: string): VerdictCoordonnee {
  if (valeur.split(/\r\n|\r|\n/).length > ADRESSE_LIGNES_MAX) {
    return refuse('adresse-trop-de-lignes');
  }
  if (valeur.length > ADRESSE_LONGUEUR_MAX) return refuse('adresse-trop-longue');
  return accepte(valeur);
}

/**
 * Dit si une valeur convient à la nature de sa coordonnée. La valeur est
 * trimée ; la vide est admise pour toute nature.
 */
export function verifierCoordonnee(nature: NatureCoordonnee, valeur: string): VerdictCoordonnee {
  const propre = valeur.trim();
  if (propre.length === 0) return accepte('');
  switch (nature) {
    case 'texte':
      return verifierTexte(propre);
    case 'telephone':
      return verifierTelephone(propre);
    case 'email':
      return verifierEmail(propre);
    case 'adresse':
      return verifierAdresse(propre);
  }
}

/**
 * Reconstitue les coordonnées courantes : ordre et nature de la déclaration,
 * valeur du brouillon (identifiant -> valeur) sinon valeur de départ. Une
 * valeur orpheline du brouillon est ignorée.
 */
export function coordonneesCourantes(
  declarees: readonly CoordonneeDeclaree[],
  brouillon: Readonly<Record<string, string>>,
): CoordonneeDeclaree[] {
  return declarees.map((c) => {
    const valeur = Object.hasOwn(brouillon, c.id) ? brouillon[c.id] : undefined;
    return typeof valeur === 'string' ? { ...c, valeur } : c;
  });
}

/** Un champ refusé : l'identifiant de la coordonnée et le code de la raison. */
export interface ChampRefuse {
  readonly champ: string;
  readonly raison: RaisonRefus | 'non-declaree';
}

export type ResultatEnregistrementCoordonnees =
  | { readonly accepte: true; readonly valeurs: Readonly<Record<string, string>> }
  | { readonly accepte: false; readonly raison: 'forme-invalide' }
  | { readonly accepte: false; readonly raison: 'valeur-refusee'; readonly refus: readonly ChampRefuse[] };

/** La liste `coordonnees` d'un corps de forme attendue, ou null. */
function lireListeCoordonnees(corpsBrut: unknown): unknown[] | null {
  if (typeof corpsBrut !== 'object' || corpsBrut === null || Array.isArray(corpsBrut)) return null;
  const liste = (corpsBrut as Record<string, unknown>).coordonnees;
  return Array.isArray(liste) ? (liste as unknown[]) : null;
}

/** Une entrée `{ id, valeur, nature? }` de forme attendue, ou null. La nature lue n'est jamais retournée : seule la nature déclarée compte. */
function lireEntreeCoordonnee(entree: unknown): { readonly id: string; readonly valeur: string } | null {
  if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) return null;
  const { id, valeur, nature } = entree as Record<string, unknown>;
  if (typeof id !== 'string' || typeof valeur !== 'string') return null;
  if (nature !== undefined && typeof nature !== 'string') return null;
  return { id, valeur };
}

/**
 * Applique une soumission entière des coordonnées (ticket 05). Forme attendue :
 * `{ coordonnees: [{ id, valeur, nature? }] }`. La nature annoncée par le corps
 * est ignorée : la valeur est vérifiée selon la nature DÉCLARÉE. Une seule
 * valeur refusée (ou un identifiant non déclaré) refuse toute la soumission.
 */
export function appliquerCorrectionCoordonnees(
  declarees: readonly CoordonneeDeclaree[],
  corpsBrut: unknown,
): ResultatEnregistrementCoordonnees {
  const liste = lireListeCoordonnees(corpsBrut);
  if (liste === null) return { accepte: false, raison: 'forme-invalide' };

  const valeurs: Record<string, string> = {};
  const refus: ChampRefuse[] = [];
  for (const brute of liste) {
    const entree = lireEntreeCoordonnee(brute);
    if (entree === null || Object.hasOwn(valeurs, entree.id)) {
      return { accepte: false, raison: 'forme-invalide' };
    }
    const declaree = declarees.find((c) => c.id === entree.id);
    if (!declaree) {
      refus.push({ champ: entree.id, raison: 'non-declaree' });
      continue;
    }
    const verdict = verifierCoordonnee(declaree.nature, entree.valeur);
    if (verdict.ok) valeurs[entree.id] = verdict.valeur;
    else refus.push({ champ: entree.id, raison: verdict.raison });
  }
  if (refus.length > 0) return { accepte: false, raison: 'valeur-refusee', refus };
  return { accepte: true, valeurs };
}
