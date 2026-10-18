/**
 * Le détail d'une demande gardée et sa coordonnée de réponse (change 013, ticket 01, ADR-0030).
 * Fonctions pures (I2) : libellés, options et prix sont copiés de la déclaration vérifiée, tels
 * qu'au moment de l'envoi.
 */
import type { ChampDeclare, FormulaireDeclare } from '../formulaires/declaration.ts';

type Valeurs = Readonly<Record<string, string | readonly string[]>>;

export interface OptionGardee {
  readonly libelle: string;
  readonly prix?: number;
}

export type LigneDeDetail =
  | { readonly etiquette: string; readonly options: readonly OptionGardee[] }
  | { readonly etiquette: string; readonly lignes: readonly string[] }
  | { readonly etiquette: string; readonly valeur: string };

function texteSaisi(valeurs: Valeurs, id: string): string {
  const valeur = valeurs[id];
  return typeof valeur === 'string' ? valeur : '';
}

function ligneDeChoix(champ: ChampDeclare, valeurs: Valeurs): LigneDeDetail | null {
  const valeur = valeurs[champ.id];
  const choisies: readonly string[] = Array.isArray(valeur) ? (valeur as string[]) : [];
  const options = (champ.options ?? [])
    .filter((o) => choisies.includes(o.id))
    .map((o): OptionGardee => (champ.avecPrix && o.prix !== undefined ? { libelle: o.libelle, prix: o.prix } : { libelle: o.libelle }));
  return options.length === 0 ? null : { etiquette: champ.libelle, options };
}

function ligneDeTexte(champ: ChampDeclare, valeurs: Valeurs): LigneDeDetail | null {
  const saisie = texteSaisi(valeurs, champ.id);
  if (saisie.trim() === '') return null;
  if (champ.nature === 'texte-long') {
    return { etiquette: champ.libelle, lignes: saisie.split(/\r\n|\r|\n/) };
  }
  return { etiquette: champ.libelle, valeur: saisie };
}

/** Les champs renseignés, dans l'ordre déclaré ; un champ facultatif vide est omis. */
export function composerDetail(formulaire: FormulaireDeclare, valeurs: Valeurs): LigneDeDetail[] {
  const detail: LigneDeDetail[] = [];
  for (const champ of formulaire.champs) {
    const aChoix = champ.nature === 'choix-unique' || champ.nature === 'choix-multiple';
    const ligne = aChoix ? ligneDeChoix(champ, valeurs) : ligneDeTexte(champ, valeurs);
    if (ligne !== null) detail.push(ligne);
  }
  return detail;
}

function saisieDeNature(formulaire: FormulaireDeclare, valeurs: Valeurs, nature: 'email' | 'telephone'): string {
  for (const champ of formulaire.champs) {
    const saisie = champ.nature === nature ? texteSaisi(valeurs, champ.id).trim() : '';
    if (saisie !== '') return saisie;
  }
  return '';
}

/** L'adresse e-mail saisie, sinon le téléphone ; chaîne vide si aucun des deux. */
export function contactDeReponse(formulaire: FormulaireDeclare, valeurs: Valeurs): string {
  const courriel = saisieDeNature(formulaire, valeurs, 'email');
  return courriel !== '' ? courriel : saisieDeNature(formulaire, valeurs, 'telephone');
}

/** Le total affiché n'est gardé que pour un formulaire qui porte des prix (FR-068). */
export function totalAGarder(formulaire: FormulaireDeclare, total: number): number | null {
  return formulaire.champs.some((c) => c.avecPrix) ? total : null;
}
