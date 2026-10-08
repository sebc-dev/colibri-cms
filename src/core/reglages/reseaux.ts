/**
 * Vérification de la liste des réseaux sociaux (ticket 07,
 * openspec/changes/008-reglages-transverses/tickets/
 * 07-composer-les-reseaux-sociaux.md ; ADR-0017).
 *
 * Zone `core` (I2) : logique pure. Un refus porte un code de raison, jamais
 * un texte (la traduction vit dans l'îlot). Un seul lien refusé refuse toute
 * la liste.
 */
import type { ReseauDeclare } from './declaration.ts';

/** Nombre maximal de liens. */
export const RESEAUX_LIENS_MAX = 12;
/** Longueur maximale du nom affiché. */
export const RESEAU_NOM_LONGUEUR_MAX = 40;
/** Longueur maximale d'une adresse. */
export const RESEAU_ADRESSE_LONGUEUR_MAX = 2048;

export type RaisonRefusReseau =
  | 'nom-vide'
  | 'nom-trop-long'
  | 'nom-plusieurs-lignes'
  | 'adresse-forme'
  | 'adresse-pas-https'
  | 'adresse-trop-longue';

/** Un champ refusé : `reseaux.<rang>.nom`, `reseaux.<rang>.lien` ou `reseaux`. */
export interface ChampReseauRefuse {
  readonly champ: string;
  readonly raison: RaisonRefusReseau | 'trop-de-liens';
}

export type ResultatReseaux =
  | { readonly accepte: true; readonly reseaux: readonly ReseauDeclare[] }
  | { readonly accepte: false; readonly raison: 'forme-invalide' }
  | { readonly accepte: false; readonly raison: 'valeur-refusee'; readonly refus: readonly ChampReseauRefuse[] };

function raisonNom(nom: string): RaisonRefusReseau | null {
  if (nom.length === 0) return 'nom-vide';
  if (/[\r\n]/.test(nom)) return 'nom-plusieurs-lignes';
  if (nom.length > RESEAU_NOM_LONGUEUR_MAX) return 'nom-trop-long';
  return null;
}

function raisonAdresse(lien: string): RaisonRefusReseau | null {
  if (lien.length > RESEAU_ADRESSE_LONGUEUR_MAX) return 'adresse-trop-longue';
  let url: URL;
  try {
    url = new URL(lien);
  } catch {
    return 'adresse-forme';
  }
  if (url.protocol !== 'https:' || url.hostname.length === 0) return 'adresse-pas-https';
  return null;
}

function lireEntree(entree: unknown): ReseauDeclare | null {
  if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) return null;
  const { nom, lien } = entree as Record<string, unknown>;
  if (typeof nom !== 'string' || typeof lien !== 'string') return null;
  return { nom: nom.trim(), lien: lien.trim() };
}

/**
 * Applique une soumission entière de la liste. Forme attendue :
 * `{ reseaux: [{ nom, lien }] }`. Liste vide admise ; l'ordre est conservé.
 */
export function appliquerListeReseaux(corpsBrut: unknown): ResultatReseaux {
  if (typeof corpsBrut !== 'object' || corpsBrut === null || Array.isArray(corpsBrut)) {
    return { accepte: false, raison: 'forme-invalide' };
  }
  const liste = (corpsBrut as Record<string, unknown>).reseaux;
  if (!Array.isArray(liste)) return { accepte: false, raison: 'forme-invalide' };

  const lus: ReseauDeclare[] = [];
  for (const brute of liste as unknown[]) {
    const entree = lireEntree(brute);
    if (entree === null) return { accepte: false, raison: 'forme-invalide' };
    lus.push(entree);
  }

  const refus: ChampReseauRefuse[] = [];
  if (lus.length > RESEAUX_LIENS_MAX) refus.push({ champ: 'reseaux', raison: 'trop-de-liens' });
  lus.forEach((r, i) => {
    const nom = raisonNom(r.nom);
    if (nom !== null) refus.push({ champ: `reseaux.${String(i)}.nom`, raison: nom });
    const adresse = raisonAdresse(r.lien);
    if (adresse !== null) refus.push({ champ: `reseaux.${String(i)}.lien`, raison: adresse });
  });
  if (refus.length > 0) return { accepte: false, raison: 'valeur-refusee', refus };
  return { accepte: true, reseaux: lus };
}
