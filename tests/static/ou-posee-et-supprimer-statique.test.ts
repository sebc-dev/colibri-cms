/**
 * Ticket 11 — Voir où une image est posée, et la supprimer partout
 * (openspec/changes/004-bibliotheque-de-medias/tickets/
 * 11-ou-posee-et-supprimer.md, SC-11c).
 *
 * `FicheMedia.svelte` est monté côté client sans directive `client:*`
 * (ADR-0006) : le worker ne rend jamais son balisage en réponse à une
 * requête HTTP (aucune infrastructure de test de composant Svelte n'existe
 * encore dans ce dépôt, docs/test.md). L'ordre « la liste d'abord, la
 * suppression ensuite » (SC-11c) se prouve donc, comme `SC-08c` le fait pour
 * `EmplacementImage.svelte` dans `tests/integration/
 * poser-remplacer-image.test.ts`, en inspectant la SOURCE (`?raw`, Vite) :
 * - le bouton qui ouvre la confirmation (`ouvrirConfirmation`) ne poste
 *   jamais vers la route de suppression lui-même — seule `confirmerSuppression`
 *   le fait, une fonction distincte ;
 * - dans le bloc de confirmation (`{#if confirmationOuverte}`), le rendu de
 *   la liste des emplacements (`{@render listeEmplacements()}`) précède,
 *   dans le gabarit, le bouton qui déclenche `confirmerSuppression` — la
 *   liste est donc déjà à l'écran avant que l'éditrice puisse appliquer quoi
 *   que ce soit.
 */
import { describe, it, expect } from 'vitest';

describe("SC-11c — la confirmation de suppression présente d'abord la liste des emplacements, avant toute application", () => {
  it("SC-11c — ouvrir la confirmation n'appelle aucune route, seule la confirmation explicite le fait, après l'affichage de la liste", async () => {
    // Arrange
    const source = (await import('../../src/admin/ilots-svelte-5/FicheMedia.svelte?raw')).default;

    // Act : la fonction qui OUVRE la confirmation (déclenchée par le bouton
    // « Supprimer… »)…
    const debutOuverture = source.indexOf('function ouvrirConfirmation(): void {');
    const finOuverture = source.indexOf('\n  }', debutOuverture);
    expect(debutOuverture, 'ouvrirConfirmation est introuvable dans la source').toBeGreaterThan(-1);
    const corpsOuverture = source.slice(debutOuverture, finOuverture);

    // Assert : … ne poste vers aucune route — elle ne fait que révéler la
    // confirmation, jamais appliquer la suppression.
    expect(corpsOuverture).not.toContain('fetch(');
    expect(corpsOuverture).not.toContain('/supprimer');

    // Act : la fonction qui CONFIRME, elle, poste bien vers la route de
    // suppression — c'est la SEULE à le faire.
    const debutConfirmation = source.indexOf('async function confirmerSuppression(): Promise<void> {');
    expect(debutConfirmation, 'confirmerSuppression est introuvable dans la source').toBeGreaterThan(-1);
    const corpsConfirmation = source.slice(debutConfirmation, source.indexOf('\n  }\n\n  async function enregistrerNom'));
    expect(corpsConfirmation).toContain('/supprimer');

    // Assert : dans le gabarit, le bloc de confirmation affiche la liste des
    // emplacements AVANT le bouton qui appelle `confirmerSuppression` —
    // jamais l'inverse.
    const zoneGabarit = source.slice(source.lastIndexOf('</script>'));
    const debutBlocConfirmation = zoneGabarit.indexOf('{#if confirmationOuverte}');
    expect(debutBlocConfirmation, 'le bloc de confirmation est introuvable dans le gabarit').toBeGreaterThan(-1);
    const blocConfirmation = zoneGabarit.slice(debutBlocConfirmation);
    const indexListe = blocConfirmation.indexOf('{@render listeEmplacements()}');
    const indexBoutonConfirmer = blocConfirmation.indexOf('onclick={confirmerSuppression}');
    expect(indexListe, 'la liste des emplacements est introuvable dans le bloc de confirmation').toBeGreaterThan(-1);
    expect(
      indexBoutonConfirmer,
      'le bouton de confirmation est introuvable dans le bloc de confirmation',
    ).toBeGreaterThan(-1);
    expect(indexListe).toBeLessThan(indexBoutonConfirmer);
  });
});
