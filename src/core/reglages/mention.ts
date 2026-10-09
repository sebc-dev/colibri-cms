/**
 * Vérification de la mention d'information (ticket 08,
 * openspec/changes/008-reglages-transverses/tickets/
 * 08-corriger-la-mention.md ; ADR-0017).
 *
 * Zone `core` (I1/I2) : logique pure. Les règles de liens et de marques sont
 * celles du texte riche des pages (`serialiserMarkdownRestreint`) : un seul
 * lieu de vérité. Un refus porte un code de raison, jamais un texte.
 */
import { serialiserMarkdownRestreint, type NoeudDocument } from '../pages/texte-riche.ts';

export type RaisonRefusMention = 'mention-vide';

export type ResultatMention =
  | { readonly accepte: true; readonly markdown: string }
  | { readonly accepte: false; readonly raison: 'forme-invalide' }
  | { readonly accepte: false; readonly raison: 'valeur-refusee'; readonly refus: readonly { readonly champ: string; readonly raison: RaisonRefusMention }[] };

function estMarque(brut: unknown): boolean {
  return typeof brut === 'object' && brut !== null && typeof (brut as Record<string, unknown>).type === 'string';
}

function estNoeud(brut: unknown): boolean {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return false;
  const n = brut as Record<string, unknown>;
  if (typeof n.type !== 'string') return false;
  if (n.content !== undefined && (!Array.isArray(n.content) || !n.content.every(estNoeud))) return false;
  if (n.text !== undefined && typeof n.text !== 'string') return false;
  if (n.marks !== undefined && (!Array.isArray(n.marks) || !n.marks.every(estMarque))) return false;
  if (n.attrs !== undefined && (typeof n.attrs !== 'object' || n.attrs === null)) return false;
  return true;
}

function estDocument(brut: unknown): brut is NoeudDocument {
  return estNoeud(brut);
}

function texteDe(noeud: unknown): string {
  const n = noeud as { text?: unknown; content?: unknown };
  let sortie = typeof n.text === 'string' ? n.text : '';
  if (Array.isArray(n.content)) for (const enfant of n.content) sortie += texteDe(enfant);
  return sortie;
}

/**
 * Applique une soumission de la mention. Forme attendue : `{ document }`
 * (le JSON de l'éditeur). Vide ou faite d'espaces après sérialisation : refus.
 */
export function appliquerMention(corpsBrut: unknown): ResultatMention {
  if (typeof corpsBrut !== 'object' || corpsBrut === null || Array.isArray(corpsBrut)) {
    return { accepte: false, raison: 'forme-invalide' };
  }
  const document = (corpsBrut as Record<string, unknown>).document;
  if (!estDocument(document)) return { accepte: false, raison: 'forme-invalide' };

  const markdown = serialiserMarkdownRestreint(document).trim();
  if (texteDe(document).trim().length === 0 || markdown.length === 0) {
    return { accepte: false, raison: 'valeur-refusee', refus: [{ champ: 'mention', raison: 'mention-vide' }] };
  }
  return { accepte: true, markdown };
}
