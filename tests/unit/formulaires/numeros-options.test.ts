/**
 * Change 015, ticket 04 — SC-04f : un numéro d'option attribué ne revient jamais,
 * même quand le brouillon qui le portait est supprimé par le retour du formulaire
 * (ADR-0018, ADR-0026). Couture : fonctions pures de `src/core/formulaires/options.ts` (I2).
 */
import { describe, it, expect } from 'vitest';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import { appliquerOptions, numerosDuBrouillon } from '../../../src/core/formulaires/options.ts';

const DECLARATION: FormulaireDeclare = {
  id: 'gateau',
  nom: 'Devis gâteau',
  champs: [
    {
      id: 'parfum',
      nature: 'choix-unique',
      libelle: 'Parfum',
      obligatoire: true,
      avecPrix: false,
      options: [
        { id: 'vanille', libelle: 'Vanille' },
        { id: 'chocolat', libelle: 'Chocolat' },
      ],
    },
    {
      id: 'decor',
      nature: 'choix-multiple',
      libelle: 'Décor',
      obligatoire: false,
      avecPrix: false,
      options: [{ id: 'fleurs', libelle: 'Fleurs' }],
    },
  ],
};

const BROUILLON_VIDE = { champs: {}, derniersNumeros: {} };

function soumission(parfums: unknown[]): unknown {
  return {
    champs: [
      { id: 'parfum', options: parfums },
      { id: 'decor', options: [{ id: 'fleurs', libelle: 'Fleurs' }] },
    ],
  };
}

const DEUX_PARFUMS = [
  { id: 'vanille', libelle: 'Vanille' },
  { id: 'chocolat', libelle: 'Chocolat' },
];

describe('SC-04f — numerosDuBrouillon', () => {
  it('SC-04f — rend, par champ, le plus grand de derniersNumeros et des suffixes o<n> des options', () => {
    // Arrange
    const brouillon = {
      champs: {
        parfum: [
          { id: 'vanille', libelle: 'Vanille' },
          { id: 'o7', libelle: 'Pistache' },
        ],
        decor: [{ id: 'o2', libelle: 'Fleurs' }],
      },
      derniersNumeros: { parfum: 4, decor: 5 },
    };

    // Act
    const numeros = numerosDuBrouillon(brouillon);

    // Assert : 7 (suffixe) l'emporte sur 4 ; 5 (compteur) l'emporte sur 2.
    expect(numeros).toEqual({ parfum: 7, decor: 5 });
  });

  it('SC-04f — un brouillon vide ne porte aucun numéro', () => {
    expect(numerosDuBrouillon(BROUILLON_VIDE)).toEqual({});
  });

  it('SC-04f — un champ sans numéro attribué (identifiants de départ seuls) est rendu à zéro', () => {
    // Arrange
    const brouillon = {
      champs: { parfum: [{ id: 'vanille', libelle: 'Vanille' }] },
      derniersNumeros: {},
    };

    // Act
    const numeros = numerosDuBrouillon(brouillon);

    // Assert
    expect(numeros).toEqual({ parfum: 0 });
  });
});

describe('SC-04f — appliquerOptions avec la table des numéros retenus', () => {
  it('SC-04f — sans brouillon ni publié, une option ajoutée reçoit un numéro au-delà de ceux retenus', () => {
    // Arrange : le brouillon qui portait o1 et o2 a été supprimé par le retour.
    const retenus = { parfum: 2 };

    // Act
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      soumission([...DEUX_PARFUMS, { libelle: 'Pistache' }]),
      undefined,
      retenus,
    );

    // Assert
    if (!r.ok) throw new Error('correction refusée');
    expect(r.contenu.champs.parfum.at(2)?.id).toBe('o3');
    expect(r.contenu.derniersNumeros.parfum).toBe(3);
  });

  it('SC-04f — sans la table, le même cas redonnerait o1 : la table est bien la source qui l’empêche', () => {
    // Arrange / Act
    const r = appliquerOptions(DECLARATION, BROUILLON_VIDE, soumission([...DEUX_PARFUMS, { libelle: 'Pistache' }]));

    // Assert
    if (!r.ok) throw new Error('correction refusée');
    expect(r.contenu.champs.parfum.at(2)?.id).toBe('o1');
  });

  it('SC-04f — la table d’un champ ne décale pas les autres champs', () => {
    // Arrange
    const retenus = { parfum: 9 };

    // Act
    const r = appliquerOptions(
      DECLARATION,
      BROUILLON_VIDE,
      {
        champs: [
          { id: 'parfum', options: DEUX_PARFUMS },
          { id: 'decor', options: [{ id: 'fleurs', libelle: 'Fleurs' }, { libelle: 'Rubans' }] },
        ],
      },
      undefined,
      retenus,
    );

    // Assert
    if (!r.ok) throw new Error('correction refusée');
    expect(r.contenu.champs.decor.at(1)?.id).toBe('o1');
  });

  it('SC-04f — un plus grand numéro du brouillon courant l’emporte sur la table', () => {
    // Arrange
    const brouillon = {
      champs: { parfum: [...DEUX_PARFUMS, { id: 'o5', libelle: 'Café' }] },
      derniersNumeros: { parfum: 5 },
    };

    // Act
    const r = appliquerOptions(
      DECLARATION,
      brouillon,
      soumission([...DEUX_PARFUMS, { id: 'o5', libelle: 'Café' }, { libelle: 'Noix' }]),
      undefined,
      { parfum: 2 },
    );

    // Assert
    if (!r.ok) throw new Error('correction refusée');
    expect(r.contenu.champs.parfum.at(3)?.id).toBe('o6');
  });
});
