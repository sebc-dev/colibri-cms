/**
 * La vérification d'une demande de devis reçue (change 012, ticket 07, ADR-0018) : fonction pure (I2)
 * contre la déclaration empaquetée du formulaire, jamais contre la base. Rend les valeurs réduites
 * aux seuls champs déclarés — chaîne pour un texte, identifiants d'options pour un choix.
 */
import type { ChampDeclare, FormulaireDeclare } from './declaration.ts';
import { totalDeLaSelection } from './total.ts';
import { LONGUEUR_MAX_SAISIE, aLaFormeDUnCourriel, longueurEnCaracteres } from './saisie.ts';

/** Ce que le visiteur a saisi, champ par champ. */
export type ValeursDemande = Readonly<Record<string, string | readonly string[]>>;

export type VerdictDemande =
  | { readonly ok: true; readonly valeurs: ValeursDemande }
  | { readonly ok: false };


function lireChoix(champ: ChampDeclare, brut: unknown): readonly string[] | undefined {
  if (brut === undefined) return [];
  if (!Array.isArray(brut)) return undefined;
  const choisies = brut as unknown[];
  const connues = new Set((champ.options ?? []).map((o) => o.id));
  const ids: string[] = [];
  for (const id of choisies) {
    if (typeof id !== 'string' || !connues.has(id) || ids.includes(id)) return undefined;
    ids.push(id);
  }
  if (champ.nature === 'choix-unique' && ids.length > 1) return undefined;
  return ids;
}

function lireTexte(champ: ChampDeclare, brut: unknown): string | undefined {
  if (brut === undefined) return '';
  if (typeof brut !== 'string') return undefined;
  const texte = brut.trim();
  if (champ.nature === 'choix-unique' || champ.nature === 'choix-multiple') return undefined;
  if (longueurEnCaracteres(texte) > LONGUEUR_MAX_SAISIE[champ.nature]) return undefined;
  if (champ.nature === 'email' && texte !== '' && !aLaFormeDUnCourriel(texte)) return undefined;
  return texte;
}

function valeurPropre(brutes: Readonly<Record<string, unknown>>, id: string): unknown {
  return Object.hasOwn(brutes, id) ? brutes[id] : undefined;
}

/** Vrai si toute clé reçue est l'identifiant d'un champ déclaré du formulaire. */
export function clesToutesDeclarees(
  formulaire: FormulaireDeclare,
  recues: Readonly<Record<string, unknown>>,
): boolean {
  const connus = new Set(formulaire.champs.map((c) => c.id));
  return Object.keys(recues).every((cle) => connus.has(cle));
}

/** Vérifie les valeurs reçues contre le formulaire déclaré. */
export function verifierDemande(formulaire: FormulaireDeclare, recues: unknown): VerdictDemande {
  if (typeof recues !== 'object' || recues === null || Array.isArray(recues)) return { ok: false };
  const brutes = recues as Record<string, unknown>;
  const connus = new Set(formulaire.champs.map((c) => c.id));
  if (!clesToutesDeclarees(formulaire, brutes)) return { ok: false };
  if (Object.hasOwn(brutes, '__proto__') && !connus.has('__proto__')) return { ok: false };
  const valeurs: Record<string, string | readonly string[]> = {};
  for (const champ of formulaire.champs) {
    const aChoix = champ.nature === 'choix-unique' || champ.nature === 'choix-multiple';
    const lue = aChoix ? lireChoix(champ, valeurPropre(brutes, champ.id))
      : lireTexte(champ, valeurPropre(brutes, champ.id));
    if (lue === undefined) return { ok: false };
    if (champ.obligatoire && lue.length === 0) return { ok: false };
    valeurs[champ.id] = lue;
  }
  return { ok: true, valeurs };
}

/** Vrai si la page d'origine pose bien ce formulaire dans l'un de ses emplacements. */
export function pagePoseLeFormulaire(
  emplacements: readonly { readonly nature: string; readonly formulaire?: string }[],
  idFormulaire: string,
): boolean {
  return emplacements.some((e) => e.nature === 'formulaire' && e.formulaire === idFormulaire);
}

/** Vrai si le total annoncé est un entier de centimes égal au total recalculé depuis les prix publiés. */
export function totalAnnonceAccorde(
  formulaire: FormulaireDeclare,
  valeurs: ValeursDemande,
  totalAffiche: unknown,
): boolean {
  if (typeof totalAffiche !== 'number' || !Number.isSafeInteger(totalAffiche) || totalAffiche < 0) return false;
  const selection: Record<string, readonly string[]> = {};
  for (const [id, v] of Object.entries(valeurs)) if (typeof v !== 'string') selection[id] = v;
  return totalDeLaSelection(formulaire, selection) === totalAffiche;
}
