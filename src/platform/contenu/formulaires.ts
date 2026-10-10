/**
 * Le chargement de la déclaration des formulaires posée par l'intégrateur
 * (ADR-0018) — `content/formulaires/<id>/formulaire.json`, versionnés au
 * dépôt, jamais écrits depuis l'administration. Empaquetés au build par
 * `import.meta.glob` (comme `reglages.ts`). Zone `platform` : n'importe que
 * `core/` (I1).
 */
import {
  lireFormulairesDeclares,
  type FormulaireDeclare,
} from '../../core/formulaires/declaration.ts';

// Stryker disable all
const MODULES_FORMULAIRES = import.meta.glob('/content/formulaires/*/formulaire.json', {
  eager: true,
  import: 'default',
});
// Stryker restore all

const CHEMIN = /^\/content\/formulaires\/([^/]+)\/formulaire\.json$/;

/** Les formulaires déclarés, triés par identifiant. */
export function lireFormulairesDeLaDeclaration(): FormulaireDeclare[] {
  const fichiers = Object.entries(MODULES_FORMULAIRES).flatMap(([chemin, contenu]) => {
    const id = CHEMIN.exec(chemin)?.[1];
    return id === undefined ? [] : [{ id, contenu }];
  });
  return lireFormulairesDeclares(fichiers);
}

/** Le formulaire d'un identifiant, cherché dans la liste déjà chargée. */
export function lireFormulaireDeLaDeclaration(id: string): FormulaireDeclare | undefined {
  return lireFormulairesDeLaDeclaration().find((f) => f.id === id);
}
