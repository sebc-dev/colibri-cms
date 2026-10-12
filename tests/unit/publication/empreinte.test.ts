/**
 * Change 011, ticket 15 — l'empreinte du récapitulatif (logique pure) : elle ne dépend pas de
 * l'ordre des objets engagés, et change dès que l'un d'eux change.
 */
import { it, expect } from 'vitest';
import { empreinteDuRecapitulatif, type ObjetEngage } from '../../../src/core/publication/recapitulatif.ts';

const PAGE: ObjetEngage = { genre: 'page', id: 'tarifs/presentation', version: '1000' };
const REGLAGE: ObjetEngage = { genre: 'reglage', id: 'coordonnees', version: '1200' };
const IMAGE_EFFACEE: ObjetEngage = { genre: 'image-effacee', id: 'img-a', version: '' };

it('ticket 15 — même liste dans un autre ordre : même empreinte', async () => {
  // Arrange
  const liste = [PAGE, REGLAGE, IMAGE_EFFACEE];
  const permutee = [IMAGE_EFFACEE, PAGE, REGLAGE];

  // Act
  const empreinte = await empreinteDuRecapitulatif(liste);
  const empreintePermutee = await empreinteDuRecapitulatif(permutee);

  // Assert
  expect(empreintePermutee).toBe(empreinte);
});

it("ticket 15 — un brouillon corrigé (maj_le différent) change l'empreinte", async () => {
  // Arrange
  const avant: ObjetEngage = { genre: 'page', id: 'tarifs/presentation', version: '1000' };
  const corrige: ObjetEngage = { genre: 'page', id: 'tarifs/presentation', version: '2000' };

  // Act
  const empreinteAvant = await empreinteDuRecapitulatif([avant]);
  const empreinteCorrigee = await empreinteDuRecapitulatif([corrige]);

  // Assert
  expect(empreinteCorrigee).not.toBe(empreinteAvant);
});

it("ticket 15 — la description d'une image redécrite qui change change l'empreinte", async () => {
  // Arrange
  const decriteA: ObjetEngage = { genre: 'image-redecrite', id: 'img-r', version: 'A' };
  const decriteB: ObjetEngage = { genre: 'image-redecrite', id: 'img-r', version: 'B' };

  // Act
  const empreinteA = await empreinteDuRecapitulatif([PAGE, decriteA]);
  const empreinteB = await empreinteDuRecapitulatif([PAGE, decriteB]);

  // Assert
  expect(empreinteB).not.toBe(empreinteA);
});

it("ticket 15 — une image effacée de plus change l'empreinte", async () => {
  // Arrange
  const liste = [PAGE, REGLAGE, IMAGE_EFFACEE];
  const avecUneDePlus = [...liste, { genre: 'image-effacee' as const, id: 'img-b', version: '' }];

  // Act
  const empreinte = await empreinteDuRecapitulatif(liste);
  const empreinteAvecUneDePlus = await empreinteDuRecapitulatif(avecUneDePlus);

  // Assert
  expect(empreinteAvecUneDePlus).not.toBe(empreinte);
});

it("ticket 15 — l'empreinte est un condensat SHA-256 en hexadécimal", async () => {
  // Arrange
  const liste = [PAGE, REGLAGE, IMAGE_EFFACEE];

  // Act
  const empreinte = await empreinteDuRecapitulatif(liste);

  // Assert
  expect(empreinte).toMatch(/^[0-9a-f]{64}$/);
});
