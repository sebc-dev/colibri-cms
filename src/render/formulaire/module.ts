/**
 * Le module du formulaire de devis sur le site public (change 012, ticket 05,
 * ADR-0029) : recalcule le total estimé à chaque changement, sur l'appareil,
 * sans aucun échange. Lit les prix en centimes dans les `data-prix`, écrit en
 * `textContent` seulement.
 */
import { formaterPrix } from '../../core/formulaires/prix.ts';
import {
  totalDeLaSelection,
  type FormulaireAPrix,
  type Selection,
} from '../../core/formulaires/total.ts';

function optionDe(entree: HTMLInputElement): { id: string; prix?: number } {
  const prix = Number(entree.dataset.prix);
  return Number.isInteger(prix) ? { id: entree.value, prix } : { id: entree.value };
}

function decrire(formulaire: HTMLFormElement): FormulaireAPrix {
  const champs = [...formulaire.querySelectorAll<HTMLElement>('fieldset[data-champ]')].map(
    (fieldset) => ({
      id: fieldset.dataset.champ ?? '',
      avecPrix: fieldset.querySelector('input[data-prix]') !== null,
      options: [...fieldset.querySelectorAll<HTMLInputElement>('input')].map(optionDe),
    }),
  );
  return { champs };
}

function selectionDu(formulaire: HTMLFormElement): Selection {
  const selection: Record<string, string[]> = {};
  for (const fieldset of formulaire.querySelectorAll<HTMLElement>('fieldset[data-champ]')) {
    const cochees = fieldset.querySelectorAll<HTMLInputElement>('input:checked');
    selection[fieldset.dataset.champ ?? ''] = [...cochees].map((entree) => entree.value);
  }
  return selection;
}

function brancher(formulaire: HTMLFormElement): void {
  const sortie = formulaire.querySelector('[data-total]');
  if (sortie === null) return;
  const bloc = sortie.closest<HTMLElement>('.total');
  const description = decrire(formulaire);
  const afficher = (): void => {
    const total = totalDeLaSelection(description, selectionDu(formulaire));
    sortie.textContent = `${formaterPrix(total)} €`;
  };
  formulaire.addEventListener('change', afficher);
  afficher();
  if (bloc !== null) bloc.hidden = false;
}

for (const formulaire of document.querySelectorAll<HTMLFormElement>('form[data-formulaire]')) {
  brancher(formulaire);
}
