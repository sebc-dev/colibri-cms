/**
 * Change 010, ticket 02 — La liste des formulaires, preuves sans requête.
 *
 * Même approche que `liste-des-pages-statique.test.ts` : la source de la
 * route est lue en texte (`?raw`). Le site réel déclare deux formulaires ; la
 * branche « aucun formulaire » se prouve donc sur la source.
 */
import { describe, it, expect } from 'vitest';
import source from '../../src/pages/admin/formulaires.astro?raw';
import textes from '../../src/admin/textes.ts?raw';
import { TEXTE_AUCUN_FORMULAIRE } from '../../src/admin/textes.ts';

const gabarit = source.slice(
  source.indexOf('---', source.indexOf('---') + 3) + 3,
);

describe('SC-02b — un site sans formulaire déclaré', () => {
  it('SC-02b — la route a une branche vide qui dit qu’aucun formulaire n’est prévu, sans geste de création', () => {
    expect(source).toMatch(/formulaires\.length\s*===\s*0/);
    expect(TEXTE_AUCUN_FORMULAIRE).toBe(
      'Aucun formulaire n’est prévu pour votre site.',
    );
    expect(gabarit).toContain('TEXTE_AUCUN_FORMULAIRE');

    expect(gabarit).not.toMatch(/<form[\s>]/i);
    expect(gabarit).not.toMatch(/<button[\s>]/i);
    expect(gabarit).not.toMatch(/<input[\s>]/i);
    expect(textes).not.toMatch(/(ajouter|créer) un formulaire/i);
  });
});

describe('SC-02f — noms affichés tels quels', () => {
  it('SC-02f — la source n’emploie ni set:html, ni innerHTML, ni directive client:*', () => {
    expect(source).not.toContain('set:html');
    expect(source).not.toContain('innerHTML');
    expect(source).not.toMatch(/\bclient:[a-z]+/);
    expect(source).not.toMatch(/<script[\s>]/i);
  });

  it('SC-02f — le nom est interpolé par l’échappement d’Astro', () => {
    expect(gabarit).toContain('{formulaire.nom}');
  });
});

describe('SC-02g — aucun terme de développeur dans les textes', () => {
  it('SC-02g — le message d’état vide ne contient aucun terme de développeur', () => {
    const message = TEXTE_AUCUN_FORMULAIRE.toLowerCase();
    for (const terme of [
      'commit',
      'branche',
      'build',
      'déploi',
      'repository',
      'endpoint',
      'json',
      'slug',
    ]) {
      expect(message).not.toContain(terme);
    }
  });
});
