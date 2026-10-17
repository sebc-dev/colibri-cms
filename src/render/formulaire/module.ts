/**
 * Le module du formulaire de devis sur le site public (change 012, ticket 05,
 * ADR-0029) : recalcule le total estimé à chaque changement, sur l'appareil,
 * sans aucun échange. Lit les prix en centimes dans les `data-prix`, écrit en
 * `textContent` seulement.
 */
import { formaterPrix } from '../../core/formulaires/prix.ts';
import { verifierSaisie, LONGUEUR_MAX_SAISIE, type ChampRefuse } from '../../core/formulaires/saisie.ts';
import type { FormulaireDeclare, NatureChamp } from '../../core/formulaires/declaration.ts';
import { TEXTES_FORMULAIRE as T } from './textes.ts';
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

function libelleDe(champ: HTMLElement): string {
  const titre = champ.querySelector('legend, label');
  if (titre === null) return '';
  const copie = titre.cloneNode(true) as HTMLElement;
  copie.querySelector('.obligatoire')?.remove();
  return copie.textContent.trim();
}

function declarationDu(formulaire: HTMLFormElement): FormulaireDeclare {
  const champs = [...formulaire.querySelectorAll<HTMLElement>('[data-champ]')].map((champ) => ({
    id: champ.dataset.champ ?? '',
    nature: (champ.dataset.nature ?? 'texte') as NatureChamp,
    libelle: libelleDe(champ),
    obligatoire: champ.dataset.obligatoire === 'oui',
    avecPrix: false,
  }));
  return { id: formulaire.dataset.formulaire ?? '', nom: '', champs };
}

function messageDu(refus: ChampRefuse, nature: NatureChamp): string {
  if (refus.motif === 'vide') return T.champVide;
  if (refus.motif === 'longueur') {
    const max = LONGUEUR_MAX_SAISIE[nature as keyof typeof LONGUEUR_MAX_SAISIE];
    return T.texteTropLong(max);
  }
  return nature === 'telephone' ? T.telephoneIncomplet : T.courrielIncomplet;
}

function effacerRefus(formulaire: HTMLFormElement): void {
  for (const e of formulaire.querySelectorAll('[data-refus]')) e.remove();
}

/** Désigne chaque champ en cause, dresse le résumé en tête et lui donne le focus. */
function designer(formulaire: HTMLFormElement, refus: readonly ChampRefuse[]): void {
  effacerRefus(formulaire);
  const resume = document.createElement('div');
  resume.dataset.refus = 'resume';
  resume.setAttribute('role', 'alert');
  resume.tabIndex = -1;
  resume.append(document.createTextNode(T.resumeSaisie));
  const liste = document.createElement('ul');
  for (const r of refus) {
    const champ = formulaire.querySelector<HTMLElement>(`[data-champ="${CSS.escape(r.champ)}"]`);
    if (champ === null) continue;
    const nature = (champ.dataset.nature ?? 'texte') as NatureChamp;
    const message = document.createElement('p');
    message.dataset.refus = 'message';
    message.id = `refus-${r.champ}`;
    message.textContent = messageDu(r, nature);
    champ.append(message);
    const saisie = champ.querySelector<HTMLElement>('input, textarea');
    saisie?.setAttribute('aria-describedby', message.id);
    const item = document.createElement('li');
    const lien = document.createElement('a');
    lien.href = `#${saisie?.id ?? ''}`;
    lien.textContent = libelleDe(champ);
    lien.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      saisie?.focus();
    });
    item.append(lien);
    liste.append(item);
  }
  resume.append(liste);
  formulaire.prepend(resume);
  resume.focus();
}

function montrerEtat(formulaire: HTMLFormElement, etat: string): void {
  for (const p of formulaire.querySelectorAll<HTMLElement>('[data-etat]')) p.hidden = p.dataset.etat !== etat;
}

/** Le message d'état paraît et reçoit le focus, pour être annoncé aux lecteurs d'écran (D6). */
function montrerMessage(formulaire: HTMLFormElement, etat: string): void {
  montrerEtat(formulaire, etat);
  const message = formulaire.querySelector<HTMLElement>(`[data-etat="${etat}"]`);
  if (message === null) return;
  message.tabIndex = -1;
  message.focus();
}

function montrerEchec(formulaire: HTMLFormElement): void {
  montrerMessage(formulaire, 'echec');
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
  const bouton = formulaire.querySelector<HTMLButtonElement>('button[type="submit"]');
  let enCours = false;
  const quitterEnvoi = (): void => {
    enCours = false;
    if (bouton !== null) {
      bouton.disabled = false;
      bouton.textContent = T.boutonEnvoi;
    }
  };
  const echec = (): void => {
    quitterEnvoi();
    montrerEchec(formulaire);
  };
  intercepterEnvoi(formulaire, () => {
    if (enCours) return;
    const verdict = verifierSaisie(declarationDu(formulaire), valeursDu(formulaire));
    if (!verdict.ok) {
      designer(formulaire, verdict.champs);
      return;
    }
    effacerRefus(formulaire);
    enCours = true;
    montrerEtat(formulaire, 'envoi');
    if (bouton !== null) {
      bouton.disabled = true;
      bouton.textContent = T.envoiEnCours;
    }
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
        if (reponse.ok) {
          confirmer(formulaire);
          return;
        }
        quitterEnvoi();
        if (reponse.status === 409) montrerEtat(formulaire, 'modifie');
        else if (reponse.status === 429) montrerMessage(formulaire, 'limite');
        else if (reponse.status === 400) {
          void reponse
            .json()
            .then((corps: { statut?: string; champs?: ChampRefuse[] }) => {
              if (corps.statut === 'champs' && Array.isArray(corps.champs)) {
                montrerEtat(formulaire, '');
                designer(formulaire, corps.champs);
              } else montrerEchec(formulaire);
            })
            .catch(() => {
              montrerEchec(formulaire);
            });
        } else montrerEchec(formulaire);
      })
      .catch(echec);
  });
}

for (const formulaire of document.querySelectorAll<HTMLFormElement>('form[data-formulaire]')) {
  brancher(formulaire);
  if (formulaire.dataset.mode === 'desactive') brancherAvis(formulaire);
  else brancherEnvoi(formulaire);
}
