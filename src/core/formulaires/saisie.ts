/**
 * Les règles de saisie d'un formulaire de devis (change 012, ticket 08, FR-058) : une seule
 * fonction pure, appelée par le module du navigateur ET par la route d'envoi. Le verdict ne porte
 * que des identifiants de champ et des codes de motif, jamais une valeur saisie.
 */
import type { ChampDeclare, FormulaireDeclare, NatureChamp } from './declaration.ts';

export type MotifSaisie = 'vide' | 'forme' | 'longueur';

export interface ChampRefuse {
  readonly champ: string;
  readonly motif: MotifSaisie;
}

export type VerdictSaisie =
  | { readonly ok: true }
  | { readonly ok: false; readonly champs: readonly ChampRefuse[] };

/** Longueur maximale (caractères) d'une saisie, par nature de champ. */
export const LONGUEUR_MAX_SAISIE: Readonly<Record<'texte' | 'texte-long' | 'email' | 'telephone', number>> = {
  texte: 200,
  'texte-long': 2000,
  email: 254,
  telephone: 30,
};

const FORME_EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function aLaFormeDUnCourriel(texte: string): boolean {
  return FORME_EMAIL.test(texte);
}
const FORME_TELEPHONE = /^\+?[0-9 .()-]+$/;

/** Le nombre de caractères visibles (un émoji compte pour un). */
export function longueurEnCaracteres(texte: string): number {
  return Array.from(texte).length;
}

function motifDuTexte(nature: NatureChamp, brut: string, obligatoire: boolean): MotifSaisie | null {
  const texte = brut.trim();
  if (texte === '') return obligatoire ? 'vide' : null;
  if (nature === 'choix-unique' || nature === 'choix-multiple') return null;
  if (longueurEnCaracteres(texte) > LONGUEUR_MAX_SAISIE[nature]) return 'longueur';
  if (nature === 'email' && !aLaFormeDUnCourriel(texte)) return 'forme';
  if (nature === 'telephone' && !(FORME_TELEPHONE.test(texte) && /\d/.test(texte))) return 'forme';
  return null;
}

/** Le motif de refus d'un champ, ou `null` s'il est recevable. */
function motifDuChamp(champ: ChampDeclare, brut: unknown): MotifSaisie | null {
  if (champ.nature === 'choix-unique' || champ.nature === 'choix-multiple') {
    const choisies = Array.isArray(brut) ? brut.length : 0;
    return champ.obligatoire && choisies === 0 ? 'vide' : null;
  }
  if (typeof brut === 'string') return motifDuTexte(champ.nature, brut, champ.obligatoire);
  return brut === undefined && champ.obligatoire ? 'vide' : null;
}

/** Vérifie la saisie contre le formulaire : les champs en cause, dans l'ordre du formulaire. */
export function verifierSaisie(
  formulaire: FormulaireDeclare,
  valeurs: Readonly<Record<string, unknown>>,
): VerdictSaisie {
  const champs: ChampRefuse[] = [];
  for (const champ of formulaire.champs) {
    const motif = motifDuChamp(champ, valeurs[champ.id]);
    if (motif !== null) champs.push({ champ: champ.id, motif });
  }
  return champs.length === 0 ? { ok: true } : { ok: false, champs };
}
