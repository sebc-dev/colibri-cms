/**
 * Ticket 06 du change 013 — la relecture tolérante du détail gardé d'une demande. Couture :
 * `relireDetail(json)` de `src/core/demandes/detail.ts` (pur, I2). Elle n'accepte que la forme
 * posée par `composerDetail` ; toute autre forme rend un détail vide, sans lever d'erreur.
 */
import { describe, it, expect } from 'vitest';
import { relireDetail } from '../../../src/core/demandes/detail.ts';

const FORME_GARDEE = [
  { etiquette: 'Parfum', options: [{ libelle: 'Fraise', prix: 1000 }] },
  { etiquette: 'Occasion', options: [{ libelle: 'Anniversaire' }, { libelle: 'Mariage' }] },
  { etiquette: 'Votre nom', valeur: 'Marie Dupont' },
  { etiquette: 'Votre message', lignes: ['un', '', 'trois'] },
];

describe('relireDetail', () => {
  it('SC-06a — la forme posée par composerDetail est relue à l’identique', () => {
    const lignes = relireDetail(JSON.stringify(FORME_GARDEE));

    expect(lignes).toEqual(FORME_GARDEE);
  });

  it('SC-06b — cas limite : un texte long garde sa ligne vide au milieu', () => {
    const lignes = relireDetail(JSON.stringify([{ etiquette: 'Votre message', lignes: ['a', '', 'c'] }]));

    expect(lignes).toEqual([{ etiquette: 'Votre message', lignes: ['a', '', 'c'] }]);
  });

  it('SC-06a — cas limite : un détail vide (« [] ») rend aucune ligne', () => {
    expect(relireDetail('[]')).toEqual([]);
  });

  it.each([
    ['un JSON illisible', '{pas du json'],
    ['une chaîne vide', ''],
    ['null', 'null'],
    ['un objet au lieu d’un tableau', '{"etiquette":"Parfum","valeur":"x"}'],
    ['un nombre', '42'],
    ['une ligne qui n’est pas un objet', '["texte"]'],
    ['une ligne sans étiquette', '[{"valeur":"x"}]'],
    ['une étiquette qui n’est pas du texte', '[{"etiquette":3,"valeur":"x"}]'],
    ['une valeur qui n’est pas du texte', '[{"etiquette":"Nom","valeur":3}]'],
    ['des lignes qui ne sont pas toutes du texte', '[{"etiquette":"Message","lignes":["a",2]}]'],
    ['des options qui ne sont pas un tableau', '[{"etiquette":"Parfum","options":"Fraise"}]'],
    ['une option sans libellé', '[{"etiquette":"Parfum","options":[{"prix":100}]}]'],
    ['un prix non entier', '[{"etiquette":"Parfum","options":[{"libelle":"Fraise","prix":10.5}]}]'],
    ['un prix négatif', '[{"etiquette":"Parfum","options":[{"libelle":"Fraise","prix":-1}]}]'],
    ['un prix textuel', '[{"etiquette":"Parfum","options":[{"libelle":"Fraise","prix":"10"}]}]'],
    ['une ligne qui porte à la fois valeur et lignes', '[{"etiquette":"X","valeur":"a","lignes":["b"]}]'],
  ])('SC-06a — cas limite : %s rend un détail vide, sans erreur', (_nom, brut) => {
    expect(() => relireDetail(brut)).not.toThrow();
    expect(relireDetail(brut)).toEqual([]);
  });

  it('SC-06a — cas limite : une ligne corrompue au milieu ne laisse passer aucune ligne', () => {
    const brut = JSON.stringify([{ etiquette: 'Votre nom', valeur: 'Marie' }, { etiquette: 'Casse', valeur: 7 }]);

    expect(relireDetail(brut)).toEqual([]);
  });
});
