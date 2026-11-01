/**
 * Ticket 02 du change 014-site-public-rapide — la règle des variantes réduites
 * d'une image publiée (largeurs, hauteurs, noms, source par défaut). Fonctions
 * pures de `core` : aucun fichier, aucun décodage.
 */
import { describe, it, expect } from 'vitest';
import {
  largeursDeVariantes,
  hauteurDeVariante,
  nomDeVariante,
  lireNomDeVariante,
  largeurParDefaut,
} from '../../../src/core/medias/variantes.ts';

describe('largeursDeVariantes', () => {
  it('SC-02a — une image de 2 000 px est proposée en 360, 720 et 1 080 px, aucune plus large', () => {
    expect(largeursDeVariantes(2000)).toEqual([360, 720, 1080]);
  });

  it('SC-02a — les hauteurs d’une image de 2 000 × 1 500 sont 270, 540 et 810', () => {
    const hauteurs = largeursDeVariantes(2000).map((w) => hauteurDeVariante(2000, 1500, w));

    expect(hauteurs).toEqual([270, 540, 810]);
  });

  it('SC-02b — une image de 960 px est proposée en 360, 720 et 960 px', () => {
    expect(largeursDeVariantes(960)).toEqual([360, 720, 960]);
  });

  it('SC-02c — une image de 300 px n’a qu’une variante, de 300 px', () => {
    expect(largeursDeVariantes(300)).toEqual([300]);
  });

  it.each([
    [1, [1]],
    [300, [300]],
    [359, [359]],
    [360, [360]],
    [361, [360, 361]],
    [719, [360, 719]],
    [720, [360, 720]],
    [721, [360, 720, 721]],
    [1079, [360, 720, 1079]],
    [1080, [360, 720, 1080]],
    [1081, [360, 720, 1080]],
    [2000, [360, 720, 1080]],
  ])('SC-02a — aux bornes, une image de %i px donne %j, jamais plus de 3 variantes ni plus larges que l’original', (largeur, attendues) => {
    const largeurs = largeursDeVariantes(largeur);

    expect(largeurs).toEqual(attendues);
    expect(largeurs.length).toBeLessThanOrEqual(3);
    expect(Math.max(...largeurs)).toBeLessThanOrEqual(largeur);
  });
});

describe('hauteurDeVariante', () => {
  it('SC-02a — garde les proportions : 1 280 × 640 réduit à 360 donne 180', () => {
    expect(hauteurDeVariante(1280, 640, 360)).toBe(180);
  });

  it('SC-02a — arrondit : 1 000 × 333 réduit à 360 donne 120', () => {
    expect(hauteurDeVariante(1000, 333, 360)).toBe(120);
  });

  it('SC-02a — n’est jamais nulle, même pour une bande très plate', () => {
    expect(hauteurDeVariante(2000, 1, 360)).toBe(1);
  });
});

describe('nom d’une variante', () => {
  it('SC-02a — se forme avec l’identifiant et la largeur', () => {
    expect(nomDeVariante('media-fixture-hero', 720)).toBe('media-fixture-hero-720.webp');
  });

  it('SC-02a — se relit en identifiant (à tirets) et largeur', () => {
    expect(lireNomDeVariante('media-fixture-hero-720.webp')).toEqual({ id: 'media-fixture-hero', largeur: 720 });
  });

  it('SC-02a — se relit à l’identique de ce qui a été formé', () => {
    expect(lireNomDeVariante(nomDeVariante('photo-01', 360))).toEqual({ id: 'photo-01', largeur: 360 });
  });

  it.each(['media-fixture-hero.webp', 'hero-abc.webp', 'hero-7.5.webp', 'hero-720.png', '-720.webp', 'hero--.webp'])(
    'SC-02a — le nom %s, sans largeur entière lisible, est ignoré',
    (nom) => {
      expect(lireNomDeVariante(nom)).toBeNull();
    },
  );
});

describe('largeurParDefaut — la source par défaut', () => {
  it('SC-02a — de 360, 720 et 1 080 : 720', () => {
    expect(largeurParDefaut([360, 720, 1080])).toBe(720);
  });

  it('SC-02b — de 360, 720 et 960 : 720', () => {
    expect(largeurParDefaut([360, 720, 960])).toBe(720);
  });

  it('SC-02c — d’une seule variante de 300 : 300', () => {
    expect(largeurParDefaut([300])).toBe(300);
  });

  it('SC-02a — d’une seule variante de 360 : 360', () => {
    expect(largeurParDefaut([360])).toBe(360);
  });

  it('SC-02a — dont la plus petite dépasse 720 : la plus petite', () => {
    expect(largeurParDefaut([800, 1000])).toBe(800);
  });
});
