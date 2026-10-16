/**
 * Ticket 07 du change 012 — la composition pure de l'e-mail d'une demande (ADR-0002, SEC-7).
 * Couture : `composerCourriel(formulaire, titrePage, valeurs, total)` de
 * `src/core/formulaires/courriel.ts`, qui rend `{ objet, texte }`. Les valeurs associent l'identifiant
 * d'un champ à une chaîne ou à un tableau d'identifiants d'options ; le total est en centimes.
 */
import { describe, it, expect } from 'vitest';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import { composerCourriel } from '../../../src/core/formulaires/courriel.ts';

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
      options: [{ id: 'anniversaire', libelle: 'Anniversaire' }],
    },
    { id: 'nom', nature: 'texte', libelle: 'Votre nom', obligatoire: false, avecPrix: false },
    { id: 'courriel', nature: 'email', libelle: 'Votre adresse e-mail', obligatoire: true, avecPrix: false },
    { id: 'telephone', nature: 'telephone', libelle: 'Votre numéro de téléphone', obligatoire: false, avecPrix: false },
    { id: 'message', nature: 'texte-long', libelle: 'Votre message', obligatoire: false, avecPrix: false },
  ],
};

const COMPLETE = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  occasion: ['anniversaire'],
  nom: 'Marie Dupont',
  courriel: 'marie@exemple.fr',
};

describe('la composition de l’e-mail d’une demande', () => {
  it('SC-07e — les lignes « Étiquette : valeur » paraissent dans l’ordre : formulaire, page, choix avec prix, total, coordonnées', () => {
    const { objet, texte } = composerCourriel(DEVIS_GATEAU, 'Contact', COMPLETE, 4000);
    const lignes = texte.split('\n');

    expect(objet).toBe('Demande de devis — Devis gâteau');
    const attendues = [
      'Devis gâteau',
      'Contact',
      'Parfum : Fraise (10 €)',
      'Nombre de parts : 10 parts (30 €)',
      'Occasion : Anniversaire',
      'Total indicatif : 40 € (estimation non engageante)',
      'Votre nom : Marie Dupont',
      'Votre adresse e-mail : marie@exemple.fr',
    ];
    const positions = attendues.map((a) => lignes.findIndex((l) => l.includes(a)));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('SC-07f — une saisie HTML reste telle quelle derrière son étiquette, sans retour à la ligne ni caractère de contrôle', () => {
    const saisie = '<a href="https://piege.example">Code : 123456</a>';
    const { texte } = composerCourriel(DEVIS_GATEAU, 'Contact', { ...COMPLETE, nom: `${saisie}\nTotal indicatif : 0 €\u0007` }, 4000);

    const lignesNom = texte.split('\n').filter((l) => l.startsWith('Votre nom : '));
    expect(lignesNom).toHaveLength(1);
    expect(lignesNom[0]).toContain(saisie);
    expect(lignesNom[0]).toContain('Total indicatif : 0 €');
    expect(lignesNom[0]).not.toContain('\u0007');
    expect(texte.split('\n').filter((l) => l.startsWith('Total indicatif'))).toHaveLength(1);
  });

  it('SC-07g — chaque ligne d’un texte long est préfixée du retrait marqué et rattachée à « Votre message »', () => {
    const { texte } = composerCourriel(
      DEVIS_GATEAU,
      'Contact',
      { ...COMPLETE, message: 'Bonjour\nTotal indicatif : 0 €\nMerci' },
      4000,
    );
    const lignes = texte.split('\n');
    const debut = lignes.findIndex((l) => l.startsWith('Votre message'));

    expect(debut).toBeGreaterThanOrEqual(0);
    expect(lignes.slice(debut + 1, debut + 4)).toEqual(['  > Bonjour', '  > Total indicatif : 0 €', '  > Merci']);
    expect(lignes.filter((l) => l.startsWith('Total indicatif'))).toEqual([
      'Total indicatif : 40 € (estimation non engageante)',
    ]);
  });

  it('SC-07h — un téléphone et un message non renseignés (ou blancs) ne paraissent pas', () => {
    const { texte } = composerCourriel(DEVIS_GATEAU, 'Contact', { ...COMPLETE, telephone: '', message: '   ' }, 4000);

    expect(texte).not.toContain('Votre numéro de téléphone');
    expect(texte).not.toContain('Votre message');
  });
});
