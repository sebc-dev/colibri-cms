/**
 * Ticket 05 du change 012 — le total suit la sélection (SC-05a, SC-05b,
 * SC-05d, SC-05e, SC-05f), ADR-0018 : des centimes entiers, jamais de flottant.
 * Couture : `totalDeLaSelection(formulaire, selection)` de
 * `src/core/formulaires/total.ts`. La sélection associe l'identifiant d'un
 * champ aux identifiants des options choisies.
 */
import { describe, it, expect } from 'vitest';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import { formaterPrix } from '../../../src/core/formulaires/prix.ts';
import { totalDeLaSelection } from '../../../src/core/formulaires/total.ts';

const DEVIS_GATEAU: FormulaireDeclare = {
  id: 'devis-gateau',
  nom: 'Devis gâteau',
  champs: [
    {
      id: 'parfum',
      nature: 'choix-unique',
      libelle: 'Parfum',
      obligatoire: true,
      avecPrix: true,
      options: [
        { id: 'vanille', libelle: 'Vanille', prix: 800 },
        { id: 'chocolat', libelle: 'Chocolat', prix: 900 },
        { id: 'fraise', libelle: 'Fraise', prix: 1000 },
      ],
    },
    {
      id: 'nombre-de-parts',
      nature: 'choix-unique',
      libelle: 'Nombre de parts',
      obligatoire: false,
      avecPrix: true,
      options: [
        { id: 'six-parts', libelle: '6 parts', prix: 1800 },
        { id: 'dix-parts', libelle: '10 parts', prix: 3000 },
        { id: 'vingt-parts', libelle: '20 parts', prix: 5500 },
      ],
    },
    {
      id: 'occasion',
      nature: 'choix-multiple',
      libelle: 'Occasion',
      obligatoire: false,
      avecPrix: false,
      options: [
        { id: 'anniversaire', libelle: 'Anniversaire' },
        { id: 'mariage', libelle: 'Mariage' },
      ],
    },
    { id: 'nom', nature: 'texte', libelle: 'Votre nom', obligatoire: false, avecPrix: false },
  ],
};

function formulaireAvecPrix(prix: readonly number[], nature: 'choix-unique' | 'choix-multiple'): FormulaireDeclare {
  return {
    id: 'f',
    nom: 'F',
    champs: [
      {
        id: 'c',
        nature,
        libelle: 'C',
        obligatoire: false,
        avecPrix: true,
        options: prix.map((centimes, i) => ({ id: `o${String(i)}`, libelle: `O${String(i)}`, prix: centimes })),
      },
    ],
  };
}

describe('totalDeLaSelection', () => {
  it('SC-05a — Chocolat (9 €) et 10 parts (30 €) donnent 3900 centimes, affichés « 39 € »', () => {
    const total = totalDeLaSelection(DEVIS_GATEAU, { parfum: ['chocolat'], 'nombre-de-parts': ['dix-parts'] });

    expect(total).toBe(3900);
    expect(`${formaterPrix(total)} €`).toBe('39 €');
  });

  it('SC-05b — remplacer Chocolat par Fraise (10 €) fait passer le total de 39 € à 40 €', () => {
    const avant = totalDeLaSelection(DEVIS_GATEAU, { parfum: ['chocolat'], 'nombre-de-parts': ['dix-parts'] });
    const apres = totalDeLaSelection(DEVIS_GATEAU, { parfum: ['fraise'], 'nombre-de-parts': ['dix-parts'] });

    expect(avant).toBe(3900);
    expect(apres).toBe(4000);
  });

  it('SC-05d — cocher Mariage dans Occasion (champ sans prix) laisse le total inchangé', () => {
    const sans = totalDeLaSelection(DEVIS_GATEAU, { parfum: ['chocolat'], 'nombre-de-parts': ['dix-parts'] });
    const avec = totalDeLaSelection(DEVIS_GATEAU, {
      parfum: ['chocolat'],
      'nombre-de-parts': ['dix-parts'],
      occasion: ['mariage'],
    });

    expect(avec).toBe(sans);
  });

  it('SC-05e — sans aucun choix, le total vaut 0 centime, affiché « 0 € »', () => {
    const total = totalDeLaSelection(DEVIS_GATEAU, {});

    expect(total).toBe(0);
    expect(`${formaterPrix(total)} €`).toBe('0 €');
  });

  it('SC-05e — des champs présents mais vides, ou un champ inconnu, ne comptent pour rien', () => {
    expect(totalDeLaSelection(DEVIS_GATEAU, { parfum: [], occasion: [] })).toBe(0);
    expect(totalDeLaSelection(DEVIS_GATEAU, { inconnu: ['x'], parfum: ['inconnue'] })).toBe(0);
  });

  it('SC-05f — 10,50 € et 0,20 € font 1070 centimes, affichés « 10,70 € », exacts', () => {
    const formulaire = formaterDeuxOptions();
    const total = totalDeLaSelection(formulaire, { c: ['o0', 'o1'] });

    expect(total).toBe(1070);
    expect(Number.isInteger(total)).toBe(true);
    expect(`${formaterPrix(total)} €`).toBe('10,70 €');
  });

  it('SC-05f — la somme de 10 options à 0,10 € vaut exactement 1 €, sans dérive de flottant', () => {
    const formulaire = formulaireAvecPrix(Array<number>(10).fill(10), 'choix-multiple');
    const toutes = formulaire.champs[0]?.options?.map((o) => o.id) ?? [];

    expect(totalDeLaSelection(formulaire, { c: toutes })).toBe(100);
  });

  it('SC-05a — cas limite : une option à 0 ne change pas le total', () => {
    const formulaire = formulaireAvecPrix([0, 500], 'choix-unique');

    expect(totalDeLaSelection(formulaire, { c: ['o0'] })).toBe(0);
    expect(totalDeLaSelection(formulaire, { c: ['o1'] })).toBe(500);
  });

  it('SC-05a — cas limite : le prix maximal 9 999 999 centimes est rendu tel quel', () => {
    const formulaire = formulaireAvecPrix([9_999_999], 'choix-unique');
    const total = totalDeLaSelection(formulaire, { c: ['o0'] });

    expect(total).toBe(9_999_999);
    expect(`${formaterPrix(total)} €`).toBe('99999,99 €');
  });

  it('SC-05a — cas limite : choix multiple avec prix, toutes options cochées, additionne tout', () => {
    const formulaire = formulaireAvecPrix([150, 275, 1000], 'choix-multiple');

    expect(totalDeLaSelection(formulaire, { c: ['o0', 'o1', 'o2'] })).toBe(1425);
  });
});

function formaterDeuxOptions(): FormulaireDeclare {
  return formulaireAvecPrix([1050, 20], 'choix-multiple');
}
