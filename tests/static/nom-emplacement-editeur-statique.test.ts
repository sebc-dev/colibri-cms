/**
 * Ticket 03 — L'éditeur présente chaque emplacement par sa nature et son nom
 * (openspec/changes/006-nom-des-emplacements/tickets/
 * 03-editeur-presente-nature-et-nom.md, SC-03c).
 *
 * SC-03c exige qu'un nom contenant des caractères de balisage (`<`, `>`,
 * `&`, guillemets) s'affiche comme du texte, sans qu'aucune balise ne soit
 * interprétée. Aucune page de démonstration ne porte un tel nom
 * (`content/pages/*\/page.json`, tous des noms « propres ») : le ticket
 * lui-même énonce que cette garantie « se prouve donc par la lecture de la
 * source (patron `tests/static/*`, `?raw`) : le titre de chaque carte
 * interpole le nom sans directive qui injecte du HTML » — même geste que
 * `tests/static/marque-de-brouillon-statique.test.ts` (SC-05c) et
 * `tests/static/ou-posee-et-supprimer-statique.test.ts` (SC-11c), qui
 * inspectent déjà une source Astro/Svelte sans l'exécuter.
 *
 * Le fichier est chargé tel quel (`?raw`, Vite) : aucune exécution de
 * gabarit, aucune requête HTTP — la preuve porte sur le CODE qui rendra le
 * titre, pas sur une réponse.
 */
import { describe, it, expect } from 'vitest';

describe('SC-03c — un nom affiché avec des caractères de balisage n’est jamais interprété comme balise', () => {
  it('SC-03c — le titre de chaque carte interpole le nom par l’échappement d’Astro, jamais par set:html, {@html} ou innerHTML', async () => {
    // Arrange
    const source = (await import('../../src/pages/admin/pages/[slug].astro?raw')).default;

    // Assert : aucune des trois directives qui injecteraient du HTML brut
    // (I5, openspec/changes/006-nom-des-emplacements/security-review.md,
    // § Mitigations) n'apparaît dans ce fichier — le nom ne peut donc jamais
    // atteindre l'écran autrement que comme texte échappé.
    expect(source).not.toContain('set:html');
    expect(source).not.toContain('{@html');
    expect(source).not.toMatch(/\.innerHTML/);

    // Assert : le titre de chacune des six cartes (texte-riche, lien-video,
    // bouton-action, image, galerie, carrousel) se compose désormais d'une
    // expression Astro (accolades), jamais d'un texte figé — condition
    // nécessaire pour que le nom, quand l'intégrateur en a déclaré un, s'y
    // interpole (et soit donc échappé par Astro), plutôt que de rester une
    // chaîne littérale qui ne pourrait jamais varier avec la déclaration.
    const titres = [...source.matchAll(/<CardTitle>([\s\S]*?)<\/CardTitle>/g)].map((correspondance) =>
      correspondance[1].trim(),
    );
    expect(titres, 'six occurrences de CardTitle sont attendues (une par nature)').toHaveLength(6);
    for (const titre of titres) {
      expect(
        titre.startsWith('{') && titre.endsWith('}'),
        `le titre "${titre}" devrait être une expression Astro ({...}), jamais un texte figé`,
      ).toBe(true);
    }

    // Assert : le champ `nom` de l'emplacement (lu par le noyau depuis le
    // ticket 01) est bien ce que ces expressions lisent — sans cette
    // vérification, un refactor sans rapport (par exemple un compteur)
    // ferait passer l'assertion ci-dessus par accident.
    expect(source).toMatch(/emplacement\.nom/);
  });
});
