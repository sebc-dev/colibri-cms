/**
 * La vérification d'une demande de devis reçue (change 012, ticket 07, ADR-0018) : fonction pure (I2)
 * contre la déclaration empaquetée du formulaire, jamais contre la base. Rend les valeurs réduites
 * aux seuls champs déclarés — chaîne pour un texte, identifiants d'options pour un choix.
 */
import type { ChampDeclare, FormulaireDeclare } from './declaration.ts';
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

/** Vérifie les valeurs reçues contre le formulaire déclaré. */
export function verifierDemande(formulaire: FormulaireDeclare, recues: unknown): VerdictDemande {
  if (typeof recues !== 'object' || recues === null || Array.isArray(recues)) return { ok: false };
  const brutes = recues as Record<string, unknown>;
  const connus = new Set(formulaire.champs.map((c) => c.id));
  if (Object.keys(brutes).some((cle) => !connus.has(cle))) return { ok: false };
  const valeurs: Record<string, string | readonly string[]> = {};
  for (const champ of formulaire.champs) {
    const aChoix = champ.nature === 'choix-unique' || champ.nature === 'choix-multiple';
    const lue = aChoix ? lireChoix(champ, brutes[champ.id]) : lireTexte(champ, brutes[champ.id]);
    if (lue === undefined) return { ok: false };
    if (champ.obligatoire && lue.length === 0) return { ok: false };
    valeurs[champ.id] = lue;
  }
  return { ok: true, valeurs };
}
