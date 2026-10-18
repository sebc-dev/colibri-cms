/**
 * Ticket 01 du change 013 — la composition pure du détail d'une demande gardée et de sa coordonnée
 * de réponse (ADR-0030, I2). Couture : `composerDetail(formulaire, valeurs)`,
 * `contactDeReponse(formulaire, valeurs)` et `totalAGarder(formulaire, total)` de
 * `src/core/demandes/detail.ts`. Les libellés, options et prix sont copiés de la déclaration
 * vérifiée ; le total est en centimes.
 */
import { describe, it, expect } from 'vitest';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import { composerDetail, contactDeReponse, totalAGarder } from '../../../src/core/demandes/detail.ts';

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
        { id: 'fraise', libelle: 'Fraise', prix: 1000 },
      ],
    },
    {
      id: 'nombre-de-parts',
      nature: 'choix-unique',
      libelle: 'Nombre de parts',
      obligatoire: false,
      avecPrix: true,
      options: [{ id: 'dix-parts', libelle: '10 parts', prix: 3000 }],
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
        { id: 'bapteme', libelle: 'Baptême & communion' },
      ],
    },
    { id: 'nom', nature: 'texte', libelle: 'Votre nom', obligatoire: false, avecPrix: false },
    { id: 'courriel', nature: 'email', libelle: 'Votre adresse e-mail', obligatoire: false, avecPrix: false },
    { id: 'telephone', nature: 'telephone', libelle: 'Votre numéro de téléphone', obligatoire: false, avecPrix: false },
    { id: 'message', nature: 'texte-long', libelle: 'Votre message', obligatoire: false, avecPrix: false },
  ],
};

const SANS_PRIX: FormulaireDeclare = {
  id: 'contact-simple',
  nom: 'Contact simple',
  champs: [
    { id: 'nom', nature: 'texte', libelle: 'Votre nom', obligatoire: false, avecPrix: false },
    { id: 'courriel', nature: 'email', libelle: 'Votre adresse e-mail', obligatoire: false, avecPrix: false },
  ],
};

const COMPLETE = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  occasion: ['anniversaire'],
  nom: 'Marie Dupont',
  courriel: 'marie@exemple.fr',
};

describe('le détail d’une demande gardée', () => {
  it('SC-01a — les champs renseignés paraissent dans l’ordre déclaré, choix avec options et prix, texte avec sa valeur', () => {
    const detail = composerDetail(DEVIS_GATEAU, COMPLETE);

    expect(detail).toEqual([
      { etiquette: 'Parfum', options: [{ libelle: 'Fraise', prix: 1000 }] },
      { etiquette: 'Nombre de parts', options: [{ libelle: '10 parts', prix: 3000 }] },
      { etiquette: 'Occasion', options: [{ libelle: 'Anniversaire' }] },
      { etiquette: 'Votre nom', valeur: 'Marie Dupont' },
      { etiquette: 'Votre adresse e-mail', valeur: 'marie@exemple.fr' },
    ]);
  });

  it('SC-01b — cas limite : un champ facultatif vide ou absent est omis du détail', () => {
    const detail = composerDetail(DEVIS_GATEAU, {
      parfum: ['fraise'],
      'nombre-de-parts': [],
      nom: '',
      courriel: 'marie@exemple.fr',
      telephone: '',
      message: '',
    });

    expect(detail.map((ligne) => ligne.etiquette)).toEqual(['Parfum', 'Votre adresse e-mail']);
  });

  it('SC-01b — cas limite : un choix multiple à plusieurs options les garde toutes, dans l’ordre déclaré', () => {
    const detail = composerDetail(DEVIS_GATEAU, { parfum: ['fraise'], occasion: ['bapteme', 'anniversaire'] });

    expect(detail).toContainEqual({
      etiquette: 'Occasion',
      options: [{ libelle: 'Anniversaire' }, { libelle: 'Baptême & communion' }],
    });
  });

  it('SC-01b — cas limite : un texte long d’une ligne et un de trois lignes avec une ligne vide au milieu', () => {
    const uneLigne = composerDetail(DEVIS_GATEAU, { parfum: ['fraise'], message: 'Bonjour' });
    const troisLignes = composerDetail(DEVIS_GATEAU, { parfum: ['fraise'], message: 'Bonjour\n\nMerci' });

    expect(uneLigne).toContainEqual({ etiquette: 'Votre message', lignes: ['Bonjour'] });
    expect(troisLignes).toContainEqual({ etiquette: 'Votre message', lignes: ['Bonjour', '', 'Merci'] });
  });

  it('SC-01b — cas limite : <, >, &, guillemets et émojis sont gardés tels quels', () => {
    const saisie = '<b>"Salut" & \'merci\'</b> 🎂';
    const detail = composerDetail(DEVIS_GATEAU, { parfum: ['fraise'], nom: saisie, message: saisie });

    expect(detail).toContainEqual({ etiquette: 'Votre nom', valeur: saisie });
    expect(detail).toContainEqual({ etiquette: 'Votre message', lignes: [saisie] });
  });

  it('SC-01a — cas limite : un formulaire sans prix ne porte aucun prix dans son détail', () => {
    const detail = composerDetail(SANS_PRIX, { nom: 'Marie', courriel: 'marie@exemple.fr' });

    expect(detail).toEqual([
      { etiquette: 'Votre nom', valeur: 'Marie' },
      { etiquette: 'Votre adresse e-mail', valeur: 'marie@exemple.fr' },
    ]);
    expect(JSON.stringify(detail)).not.toContain('prix');
  });
});

describe('la coordonnée de réponse', () => {
  it('SC-01a — l’adresse e-mail seule est la coordonnée de réponse', () => {
    expect(contactDeReponse(DEVIS_GATEAU, { parfum: ['fraise'], courriel: 'marie@exemple.fr' })).toBe('marie@exemple.fr');
  });

  it('SC-01a — cas limite : le téléphone seul est la coordonnée de réponse', () => {
    expect(contactDeReponse(DEVIS_GATEAU, { parfum: ['fraise'], telephone: '06 12 34 56 78' })).toBe('06 12 34 56 78');
  });

  it('SC-01a — cas limite : avec les deux, l’adresse e-mail l’emporte', () => {
    expect(
      contactDeReponse(DEVIS_GATEAU, { parfum: ['fraise'], courriel: 'marie@exemple.fr', telephone: '06 12 34 56 78' }),
    ).toBe('marie@exemple.fr');
  });

  it('SC-01a — cas limite : une adresse e-mail facultative vide laisse la place au téléphone renseigné', () => {
    expect(contactDeReponse(DEVIS_GATEAU, { parfum: ['fraise'], courriel: '', telephone: '06 12 34 56 78' })).toBe(
      '06 12 34 56 78',
    );
  });
});

describe('le total gardé', () => {
  it('SC-01a — cas limite : un formulaire sans prix garde un total nul', () => {
    expect(totalAGarder(SANS_PRIX, 0)).toBeNull();
  });

  it('SC-01a — un formulaire qui porte des prix garde le total affiché', () => {
    expect(totalAGarder(DEVIS_GATEAU, 4000)).toBe(4000);
  });
});
