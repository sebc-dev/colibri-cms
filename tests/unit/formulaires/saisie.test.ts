/**
 * Ticket 08 du change 012 — les règles de saisie, en une seule fonction pure (FR-058).
 * Couture : `verifierSaisie(formulaire, valeurs)` de `src/core/formulaires/saisie.ts`, qui rend
 * `{ ok: true }` ou `{ ok: false, champs: [{ champ, motif }] }` (motif : « vide », « forme » ou
 * « longueur »). Les valeurs associent l'identifiant d'un champ à une chaîne ou à des identifiants
 * d'options ; jamais de valeur saisie dans le verdict.
 */
import { describe, it, expect } from 'vitest';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import { verifierSaisie } from '../../../src/core/formulaires/saisie.ts';

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

const COMPLETE: Record<string, string | string[]> = {
  parfum: ['fraise'],
  courriel: 'marie@exemple.fr',
};

function verifier(surcharge: Record<string, string | string[]> = {}, retirer: string[] = []) {
  const valeurs = Object.fromEntries(
    Object.entries({ ...COMPLETE, ...surcharge }).filter(([cle]) => !retirer.includes(cle)),
  );
  return verifierSaisie(DEVIS_GATEAU, valeurs);
}

describe('la saisie complète', () => {
  it('une saisie complète et bien formée est acceptée', () => {
    expect(verifier()).toEqual({ ok: true });
  });
});

describe('SC-08 — un champ à renseigner', () => {
  it('SC-08a — sans « Votre adresse e-mail », le champ est désigné comme à renseigner', () => {
    expect(verifier({}, ['courriel'])).toEqual({ ok: false, champs: [{ champ: 'courriel', motif: 'vide' }] });
  });

  it('SC-08b — sans parfum choisi, « Parfum » est désigné comme à renseigner', () => {
    expect(verifier({ parfum: [] })).toEqual({ ok: false, champs: [{ champ: 'parfum', motif: 'vide' }] });
    expect(verifier({}, ['parfum'])).toEqual({ ok: false, champs: [{ champ: 'parfum', motif: 'vide' }] });
  });

  it('SC-08c — que des espaces dans « Votre adresse e-mail » : désigné comme à renseigner', () => {
    expect(verifier({ courriel: '   \t ' })).toEqual({ ok: false, champs: [{ champ: 'courriel', motif: 'vide' }] });
  });

  it('SC-08a — plusieurs champs en cause sont tous désignés, dans l’ordre du formulaire', () => {
    expect(verifier({ parfum: [] }, ['courriel'])).toEqual({
      ok: false,
      champs: [
        { champ: 'parfum', motif: 'vide' },
        { champ: 'courriel', motif: 'vide' },
      ],
    });
  });
});

describe('SC-08d — la forme d’une adresse e-mail', () => {
  it('SC-08d — « marie.exemple.fr » est désignée comme n’ayant pas la forme d’une adresse', () => {
    expect(verifier({ courriel: 'marie.exemple.fr' })).toEqual({
      ok: false,
      champs: [{ champ: 'courriel', motif: 'forme' }],
    });
  });

  it.each(['nom@', '@domaine.fr'])('SC-08d — « %s » est refusée pour sa forme', (courriel) => {
    expect(verifier({ courriel })).toEqual({ ok: false, champs: [{ champ: 'courriel', motif: 'forme' }] });
  });

  it('SC-08d — « nom@domaine.fr » est acceptée', () => {
    expect(verifier({ courriel: 'nom@domaine.fr' })).toEqual({ ok: true });
  });
});

describe('SC-08 — la forme d’un numéro de téléphone', () => {
  it.each(['+33 6 12 34 56 78', '06.12.34.56.78', '(0)6-12-34-56-78'])('« %s » est accepté', (telephone) => {
    expect(verifier({ telephone })).toEqual({ ok: true });
  });

  it.each(['06 12 34 56 7a', '06+12 34 56 78', 'abc'])('« %s » est refusé pour sa forme', (telephone) => {
    expect(verifier({ telephone })).toEqual({ ok: false, champs: [{ champ: 'telephone', motif: 'forme' }] });
  });
});

describe('SC-08e — la longueur maximale', () => {
  it('SC-08e — 2 001 caractères dans « Votre message » : désigné pour sa longueur', () => {
    expect(verifier({ message: 'a'.repeat(2001) })).toEqual({
      ok: false,
      champs: [{ champ: 'message', motif: 'longueur' }],
    });
  });

  it.each([
    ['message', 2000],
    ['nom', 200],
    ['telephone', 30],
  ])('SC-08e — « %s » accepte %i caractères et refuse le suivant', (champ, borne) => {
    const rempli = champ === 'telephone' ? '1'.repeat(borne) : 'a'.repeat(borne);
    const trop = champ === 'telephone' ? '1'.repeat(borne + 1) : 'a'.repeat(borne + 1);
    expect(verifier({ [champ]: rempli })).toEqual({ ok: true });
    expect(verifier({ [champ]: trop })).toEqual({ ok: false, champs: [{ champ, motif: 'longueur' }] });
  });

  it('SC-08e — une adresse e-mail de 254 caractères est acceptée, de 255 refusée', () => {
    const courriel = (n: number) => `${'a'.repeat(n - '@exemple.fr'.length)}@exemple.fr`;
    expect(verifier({ courriel: courriel(254) })).toEqual({ ok: true });
    expect(verifier({ courriel: courriel(255) })).toEqual({
      ok: false,
      champs: [{ champ: 'courriel', motif: 'longueur' }],
    });
  });

  it('SC-08e — un émoji compte pour un caractère', () => {
    expect(verifier({ nom: '😀'.repeat(200) })).toEqual({ ok: true });
    expect(verifier({ nom: '😀'.repeat(201) })).toEqual({ ok: false, champs: [{ champ: 'nom', motif: 'longueur' }] });
  });
});

describe('SC-08f — aucune valeur saisie dans le verdict', () => {
  it('le verdict de refus ne reprend aucune valeur saisie', () => {
    const verdict = verifier({ courriel: 'marie.exemple.fr', nom: 'Marie Dupont' });
    expect(JSON.stringify(verdict)).not.toContain('marie.exemple.fr');
    expect(JSON.stringify(verdict)).not.toContain('Marie');
  });
});
