/**
 * La logique de liste de l'écran d'un formulaire (ticket 07,
 * openspec/changes/010-reglage-des-formulaires/) : ajouter, retirer, monter,
 * descendre un choix, plafond. Fonctions pures, testables sans le DOM ; les
 * bornes viennent du noyau, jamais recopiées.
 */
import { OPTIONS_PAR_CHAMP_MAX } from '../../core/formulaires/declaration.ts';
import { formaterPrix } from '../../core/formulaires/prix.ts';
import type { OptionBrouillon } from '../../core/formulaires/options.ts';

/** Le nombre minimal de choix d'un champ : au moins un. */
export const OPTIONS_PAR_CHAMP_MIN = 1;

/** Un champ à choix tel que l'écran le reçoit du serveur. */
export interface ChampCarte {
  readonly id: string;
  readonly libelle: string;
  readonly nature: 'choix-unique' | 'choix-multiple';
  readonly avecPrix: boolean;
  readonly options: readonly OptionBrouillon[];
}

/** Une ligne de choix éditable : `cle` identifie la ligne à l'écran, `id` l'option enregistrée. */
export interface LigneChoix {
  readonly cle: number;
  readonly id: string | undefined;
  readonly libelle: string;
  readonly prix: string;
}

export function lignesDepuis(options: readonly OptionBrouillon[], cleDepart: number): LigneChoix[] {
  return options.map((option, i) => ({
    cle: cleDepart + i,
    id: option.id,
    libelle: option.libelle,
    prix: option.prix === undefined ? '' : formaterPrix(option.prix),
  }));
}

export function peutAjouter(lignes: readonly unknown[]): boolean {
  return lignes.length < OPTIONS_PAR_CHAMP_MAX;
}

export function peutRetirer(lignes: readonly unknown[]): boolean {
  return lignes.length > OPTIONS_PAR_CHAMP_MIN;
}

/** Ajoute une ligne vide en fin de liste ; inchangée au plafond. */
export function ajouter(lignes: readonly LigneChoix[], cle: number): LigneChoix[] {
  if (!peutAjouter(lignes)) return [...lignes];
  return [...lignes, { cle, id: undefined, libelle: '', prix: '' }];
}

/** Retire la ligne au rang donné ; inchangée s'il n'en resterait aucune. */
export function retirer(lignes: readonly LigneChoix[], rang: number): LigneChoix[] {
  if (!peutRetirer(lignes) || rang < 0 || rang >= lignes.length) return [...lignes];
  return lignes.filter((_, i) => i !== rang);
}

/** Déplace la ligne de `sens` rang (-1 monte, 1 descend) ; inchangée hors bornes. */
export function deplacer(lignes: readonly LigneChoix[], rang: number, sens: -1 | 1): LigneChoix[] {
  const cible = rang + sens;
  if (rang < 0 || rang >= lignes.length || cible < 0 || cible >= lignes.length) return [...lignes];
  const copie = [...lignes];
  const [ligne] = copie.splice(rang, 1);
  copie.splice(cible, 0, ligne);
  return copie;
}

/** Le corps envoyé à la route : la saisie telle quelle, sans prix pour un champ sans prix. */
export function corpsDEnregistrement(
  champs: readonly { readonly id: string; readonly avecPrix: boolean; readonly lignes: readonly LigneChoix[] }[],
): { champs: { id: string; options: { id?: string; libelle: string; prix?: string }[] }[] } {
  return {
    champs: champs.map((champ) => ({
      id: champ.id,
      options: champ.lignes.map((ligne) => ({
        ...(ligne.id === undefined ? {} : { id: ligne.id }),
        libelle: ligne.libelle,
        ...(champ.avecPrix ? { prix: ligne.prix } : {}),
      })),
    })),
  };
}
