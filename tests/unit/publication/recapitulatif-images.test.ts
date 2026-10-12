/**
 * Change 011, ticket 11 — les deux listes d'images du récapitulatif (logique pure).
 */
import { it, expect } from 'vitest';
import {
  composerRecapitulatif,
  recapitulatifEstVide,
  type EntreesRecapitulatif,
  type ImageEntree,
} from '../../../src/core/publication/recapitulatif.ts';

function image(id: string, surcharge: Partial<ImageEntree> = {}): ImageEntree {
  return {
    id,
    nomAffichage: `nom-${id}`,
    description: '',
    publiee: false,
    descriptionPubliee: null,
    vignette: `/v/${id}`,
    ...surcharge,
  };
}

function entrees(surcharge: Partial<EntreesRecapitulatif>): EntreesRecapitulatif {
  return {
    pagesDeclarees: [],
    slugsAvecBrouillon: new Set(),
    reglagesAvecBrouillon: new Set(),
    formulairesDeclares: [],
    formulairesAvecBrouillon: new Set(),
    ...surcharge,
  };
}

it("SC-11a — une image qu'aucun emplacement ne pose est présentée parmi les effacées, avec sa vignette", () => {
  const recap = composerRecapitulatif(
    entrees({
      pagesDeclarees: [{ slug: 'accueil', titre: 'Accueil' }],
      images: [image('libre'), image('posee')],
      referencesPubliees: new Set(['posee']),
    }),
  );

  expect(recap.imagesEffacees).toEqual([{ id: 'libre', nom: 'nom-libre', vignette: '/v/libre' }]);
  expect(recap.pages).toEqual([]);
  expect(recap.imagesRedecrites).toEqual([]);
  expect(recapitulatifEstVide(recap)).toBe(false);
});

it("SC-11b — une image publiée dont la description a changé figure parmi les redécrites", () => {
  const recap = composerRecapitulatif(
    entrees({
      images: [
        image('changee', { publiee: true, description: 'neuve', descriptionPubliee: 'ancienne' }),
        image('identique', { publiee: true, description: 'même', descriptionPubliee: 'même' }),
        image('jamais-publiee', { description: 'brouillon' }),
      ],
      referencesPubliees: new Set(['changee', 'identique', 'jamais-publiee']),
    }),
  );

  expect(recap.imagesRedecrites.map((i) => i.id)).toEqual(['changee']);
  expect(recap.imagesEffacees).toEqual([]);
  expect(recapitulatifEstVide(recap)).toBe(false);
});

it("SC-11b — une image publiée sans description en ligne et sans description courante n'est pas redécrite", () => {
  const recap = composerRecapitulatif(
    entrees({
      images: [image('muette', { publiee: true, description: '', descriptionPubliee: null })],
      referencesPubliees: new Set(['muette']),
    }),
  );

  expect(recap.imagesRedecrites).toEqual([]);
  expect(recapitulatifEstVide(recap)).toBe(true);
});

it("SC-11b — une image publiée redécrite mais posée par aucun emplacement figure seulement parmi les effacées", () => {
  const recap = composerRecapitulatif(
    entrees({
      images: [image('redecrite-orpheline', { publiee: true, description: 'nouvelle', descriptionPubliee: 'ancienne' })],
      referencesPubliees: new Set(),
      referencesBrouillon: new Set(),
    }),
  );

  expect(recap.imagesEffacees.map((i) => i.id)).toContain('redecrite-orpheline');
  expect(recap.imagesRedecrites).toEqual([]);
});

it("SC-11c — une image posée seulement dans un emplacement que le brouillon remplace est effacée", () => {
  const recap = composerRecapitulatif(
    entrees({
      images: [image('remplacee', { publiee: true }), image('remplacante')],
      // Contenu courant : seul le brouillon pose « remplacante ».
      referencesPubliees: new Set(),
      referencesBrouillon: new Set(['remplacante']),
    }),
  );

  expect(recap.imagesEffacees.map((i) => i.id)).toEqual(['remplacee']);
});

it("SC-11d — une image posée par la dernière version publiée d'un emplacement sans brouillon n'est pas effacée", () => {
  const recap = composerRecapitulatif(
    entrees({
      images: [image('publiee-seule', { publiee: true })],
      referencesPubliees: new Set(['publiee-seule']),
      referencesBrouillon: new Set(),
    }),
  );

  expect(recap.imagesEffacees).toEqual([]);
  expect(recapitulatifEstVide(recap)).toBe(true);
});

it('SC-11e — titres et noms contenant <, >, & ou guillemets traversent tels quels (texte, pas balisage)', () => {
  const nom = `<img src=x onerror="a()"> & "b" 'c'`;
  const recap = composerRecapitulatif(
    entrees({
      pagesDeclarees: [{ slug: 'p', titre: nom }],
      slugsAvecBrouillon: new Set(['p']),
      formulairesDeclares: [{ id: 'f', nom }],
      formulairesAvecBrouillon: new Set(['f']),
      images: [image('i', { nomAffichage: nom })],
    }),
  );

  expect(recap.pages[0]?.titre).toBe(nom);
  expect(recap.formulaires[0]?.nom).toBe(nom);
  expect(recap.imagesEffacees[0]?.nom).toBe(nom);
});
