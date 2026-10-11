/**
 * La fiche d'une image publiée — `content/medias/<id>.json` (ADR-0022,
 * FR-108 ; change 011-apercu-et-publication, ticket 02).
 *
 * Zone `core` (docs/architecture.md, I1/I2) : zéro dépendance, aucune
 * lecture de fichier. Ce module lit et valide une fiche reçue EN DONNÉES ;
 * la publication (ticket 12) le réutilisera pour l'écrire.
 *
 * La fiche porte `{ id, nomOrigine, format, largeur, hauteur, description }` :
 * l'identité, le nom d'origine, le format et les dimensions, la description.
 * Une fiche mal formée est refusée (`null`), jamais corrigée.
 */
import type { FormatImageAdmis } from './ingestion.ts';

export interface FicheMedia {
  readonly id: string;
  readonly nomOrigine: string;
  readonly format: FormatImageAdmis;
  readonly largeur: number;
  readonly hauteur: number;
  readonly description: string;
}

const FORMATS: readonly string[] = ['jpeg', 'png', 'webp'];

function estEntierPositif(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur > 0;
}

function estTexteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

/** Lit une fiche d'image brute (JSON déjà analysé) : la fiche validée, ou `null` si elle est mal formée. */
export function lireFicheMedia(brut: unknown): FicheMedia | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const { id, nomOrigine, format, largeur, hauteur, description } = brut as Record<string, unknown>;
  if (!estTexteNonVide(id) || !estTexteNonVide(nomOrigine)) return null;
  if (typeof format !== 'string' || !FORMATS.includes(format)) return null;
  if (!estEntierPositif(largeur) || !estEntierPositif(hauteur)) return null;
  if (typeof description !== 'string') return null;
  return { id, nomOrigine, format: format as FormatImageAdmis, largeur, hauteur, description };
}
