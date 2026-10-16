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

/** Le bouton, désactivé dans le HTML tant que le module n'est pas chargé, devient actif ; l'envoi natif est intercepté et confié à `traiter`. */
function intercepterEnvoi(formulaire: HTMLFormElement, traiter: () => void): void {
  const bouton = formulaire.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (bouton !== null) bouton.disabled = false;
  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    traiter();
  });
}

/** Dans l'aperçu, le bouton n'envoie rien : il montre seulement l'avis et lui donne le focus, pour qu'il soit annoncé. */
function brancherAvis(formulaire: HTMLFormElement): void {
  intercepterEnvoi(formulaire, () => {
    const avis = formulaire.querySelector<HTMLElement>('[data-avis-envoi-desactive]');
    if (avis !== null) {
      avis.hidden = false;
      avis.tabIndex = -1;
      avis.focus();
    }
  });
}

function valeursDu(formulaire: HTMLFormElement): Record<string, string | string[]> {
  const valeurs: Record<string, string | string[]> = {};
  for (const champ of formulaire.querySelectorAll<HTMLElement>('[data-champ]')) {
    const id = champ.dataset.champ ?? '';
    if (champ.dataset.nature === 'choix-unique' || champ.dataset.nature === 'choix-multiple') {
      valeurs[id] = [...champ.querySelectorAll<HTMLInputElement>('input:checked')].map((e) => e.value);
    } else {
      const saisie = champ.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
      valeurs[id] = saisie?.value ?? '';
    }
  }
  return valeurs;
}

function montrerEtat(formulaire: HTMLFormElement, etat: string): void {
  for (const p of formulaire.querySelectorAll<HTMLElement>('[data-etat]')) p.hidden = p.dataset.etat !== etat;
}

/** Le formulaire laisse place à la confirmation, qui reçoit le focus pour être annoncée. */
function confirmer(formulaire: HTMLFormElement): void {
  const confirmation = formulaire.querySelector<HTMLElement>('[data-etat="confirmation"]');
  if (confirmation === null) return;
  for (const enfant of [...formulaire.children]) if (enfant !== confirmation) enfant.remove();
  confirmation.hidden = false;
  confirmation.tabIndex = -1;
  confirmation.focus();
}

/** En mode actif, l'envoi part en JSON vers la route des demandes, et la confirmation n'arrive qu'après la remise. */
function brancherEnvoi(formulaire: HTMLFormElement): void {
  intercepterEnvoi(formulaire, () => {
    const total = totalDeLaSelection(decrire(formulaire), selectionDu(formulaire));
    const corps = JSON.stringify({
      formulaire: formulaire.dataset.formulaire ?? '',
      page: formulaire.dataset.page ?? '',
      valeurs: valeursDu(formulaire),
      totalAffiche: total,
    });
    void fetch('/api/public/demandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corps,
    })
      .then((reponse) => {
        if (reponse.ok) confirmer(formulaire);
        else montrerEtat(formulaire, 'echec');
      })
      .catch(() => {
        montrerEtat(formulaire, 'echec');
      });
  });
}

for (const formulaire of document.querySelectorAll<HTMLFormElement>('form[data-formulaire]')) {
  brancher(formulaire);
  if (formulaire.dataset.mode === 'desactive') brancherAvis(formulaire);
  else brancherEnvoi(formulaire);
}
