/**
 * La composition pure des nombres de l'écran Demandes (change 013, ticket 05, ADR-0030) : somme
 * du site, nom de chaque formulaire, tri par nom, règle d'affichage des retirées. Sans framework
 * ni plateforme (I2).
 */
import { nomDuFormulaire, type FormulairePresent } from './liste.ts';

/** Les comptes d'un formulaire, tels que le magasin les rend (une ligne par formulaire). */
export interface ComptesFormulaire {
  readonly formulaireId: string;
  readonly nom: string;
  readonly presentes: number;
  readonly commandes: number;
  readonly retirees: number;
}

export interface NombresSite {
  readonly demandes: number;
  readonly commandes: number;
  readonly retirees: number;
}

export interface NombresFormulaire extends NombresSite {
  readonly id: string;
  readonly nom: string;
}

export interface NombresComposes {
  readonly site: NombresSite;
  readonly formulaires: readonly NombresFormulaire[];
  /** Vrai si le nombre du site de retirées n'est pas nul : « · N retirées » et la colonne Retirées. */
  readonly montrerRetirees: boolean;
}

export function composerNombres(
  comptes: readonly ComptesFormulaire[],
  declares: readonly FormulairePresent[],
): NombresComposes {
  const formulaires = comptes
    .filter((c) => c.presentes > 0 || c.retirees > 0)
    .map((c) => ({
      id: c.formulaireId,
      nom: nomDuFormulaire(c.formulaireId, declares, [{ nom: c.nom, recueLe: 0 }]),
      demandes: c.presentes,
      commandes: c.commandes,
      retirees: c.retirees,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const site = { demandes: 0, commandes: 0, retirees: 0 };
  for (const f of comptes) {
    site.demandes += f.presentes;
    site.commandes += f.commandes;
    site.retirees += f.retirees;
  }
  return { site, formulaires, montrerRetirees: site.retirees > 0 };
}
