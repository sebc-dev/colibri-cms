/**
 * Ticket 05 du change 013 — la composition pure des nombres du site et de chaque formulaire.
 * Couture : `src/core/demandes/nombres.ts` (`composerNombres`), alimentée par les comptes que
 * rend le magasin (une ligne par formulaire : présentes, commandes, retirées, nom gardé).
 */
import { it, expect } from 'vitest';
import { composerNombres } from '../../../src/core/demandes/nombres.ts';

const DECLARES = [
  { id: 'devis-gateau', nom: 'Devis gâteau' },
  { id: 'devis-atelier', nom: 'Devis atelier' },
];

it('SC-05a — onze demandes dont trois commandes et trois sans commande : 14 et 3 pour le site, 11 et 3, puis 3 et 0', () => {
  const nombres = composerNombres(
    [
      { formulaireId: 'devis-gateau', nom: 'Devis gâteau', presentes: 11, commandes: 3, retirees: 0 },
      { formulaireId: 'devis-atelier', nom: 'Devis atelier', presentes: 3, commandes: 0, retirees: 0 },
    ],
    DECLARES,
  );

  expect(nombres.site).toEqual({ demandes: 14, commandes: 3, retirees: 0 });
  expect(nombres.formulaires).toEqual([
    { id: 'devis-atelier', nom: 'Devis atelier', demandes: 3, commandes: 0, retirees: 0 },
    { id: 'devis-gateau', nom: 'Devis gâteau', demandes: 11, commandes: 3, retirees: 0 },
  ]);
  expect(nombres.montrerRetirees).toBe(false);
});

it('SC-05a — cas limite : aucune demande, des zéros et aucun formulaire', () => {
  const nombres = composerNombres([], DECLARES);

  expect(nombres.site).toEqual({ demandes: 0, commandes: 0, retirees: 0 });
  expect(nombres.formulaires).toEqual([]);
  expect(nombres.montrerRetirees).toBe(false);
});

it('SC-05a — cas limite : un formulaire sans demande présente ni retirée n’est pas listé', () => {
  const nombres = composerNombres(
    [{ formulaireId: 'devis-atelier', nom: 'Devis atelier', presentes: 0, commandes: 0, retirees: 0 }],
    DECLARES,
  );

  expect(nombres.formulaires).toEqual([]);
});

it('SC-05a — cas limite : un formulaire qui n’a que des retirées est listé, et les retirées sont montrées', () => {
  const nombres = composerNombres(
    [{ formulaireId: 'devis-atelier', nom: 'Devis atelier', presentes: 0, commandes: 1, retirees: 2 }],
    DECLARES,
  );

  expect(nombres.site).toEqual({ demandes: 0, commandes: 1, retirees: 2 });
  expect(nombres.formulaires).toEqual([
    { id: 'devis-atelier', nom: 'Devis atelier', demandes: 0, commandes: 1, retirees: 2 },
  ]);
  expect(nombres.montrerRetirees).toBe(true);
});

it('SC-05a — cas limite : le nom déclaré l’emporte sur le nom gardé, le nom gardé sert sinon', () => {
  const nombres = composerNombres(
    [
      { formulaireId: 'devis-gateau', nom: 'Ancien nom gâteau', presentes: 1, commandes: 0, retirees: 0 },
      { formulaireId: 'ancien-form', nom: 'Formulaire disparu', presentes: 2, commandes: 0, retirees: 0 },
    ],
    DECLARES,
  );

  expect(nombres.formulaires.map((f) => f.nom)).toEqual(['Devis gâteau', 'Formulaire disparu']);
});

it('SC-05b — la somme des nombres des formulaires égale celle du site, pour les demandes, les commandes et les retirées', () => {
  const comptes = [
    { formulaireId: 'devis-gateau', nom: 'Devis gâteau', presentes: 7, commandes: 3, retirees: 2 },
    { formulaireId: 'devis-atelier', nom: 'Devis atelier', presentes: 4, commandes: 1, retirees: 1 },
    { formulaireId: 'devis-mariage', nom: 'Devis mariage', presentes: 0, commandes: 2, retirees: 3 },
  ];

  const nombres = composerNombres(comptes, DECLARES);

  const somme = (cle: 'demandes' | 'commandes' | 'retirees'): number =>
    nombres.formulaires.reduce((total, f) => total + f[cle], 0);
  expect(nombres.formulaires).toHaveLength(3);
  expect(somme('demandes')).toBe(nombres.site.demandes);
  expect(somme('commandes')).toBe(nombres.site.commandes);
  expect(somme('retirees')).toBe(nombres.site.retirees);
  expect(nombres.site).toEqual({ demandes: 11, commandes: 6, retirees: 6 });
});
