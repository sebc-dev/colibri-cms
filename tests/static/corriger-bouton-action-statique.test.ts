/**
 * Ticket 04 — Corriger un emplacement de bouton d'action
 * (openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md).
 *
 * Couture retenue pour les quatre critères purs du ticket (SC-04a/b/c/h) :
 * `src/core/pages/brouillon.ts` s'instancie sans D1 ni Worker (I2, ARCH-5) —
 * ce fichier n'exerce que ces fonctions pures, sans requête ni migration.
 * La couture HTTP contre la vraie D1 locale (SC-04d/e/f/g) vit dans
 * `tests/integration/corriger-bouton-action.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import {
  appliquerCorrectionBoutonAction,
  destinationBoutonAutorisee,
  pagePorteUnBrouillon,
  BROUILLON_VIDE,
  type Brouillon,
  type ContenuBoutonAction,
} from '../../src/core/pages/brouillon.ts';
import type { Emplacement } from '../../src/core/pages/declaration.ts';

const EMPLACEMENT_BOUTON: Emplacement = {
  id: 'bouton-devis',
  nature: 'bouton-action',
  rang: 2,
  libelle: 'Demander un devis',
  destination: '/contact',
};

const EMPLACEMENT_TEXTE_RICHE: Emplacement = {
  id: 'presentation',
  nature: 'texte-riche',
  rang: 0,
  contenu: 'Bienvenue',
};

const EMPLACEMENTS_DECLARES: readonly Emplacement[] = [EMPLACEMENT_TEXTE_RICHE, EMPLACEMENT_BOUTON];

describe('SC-04a — appliquer une correction produit le brouillon corrigé, sans toucher l’état publié', () => {
  it('SC-04a — appliquer une correction de bouton produit un nouveau brouillon corrigé, sans muter le brouillon de départ', () => {
    // Arrange : un brouillon de départ déjà connu (constante partagée, pour
    // détecter toute mutation en place) et une correction valide.
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionBoutonAction(EMPLACEMENTS_DECLARES, brouillonDepart, 'bouton-devis', {
      libelle: 'Obtenir un devis gratuit',
      destination: 'https://exemple.test/devis',
    });

    // Assert : le brouillon corrigé porte la nouvelle valeur…
    expect(resultat.accepte).toBe(true);
    if (!resultat.accepte) return;
    const contenu = resultat.brouillon.get('bouton-devis') as ContenuBoutonAction;
    expect(contenu).toEqual({
      nature: 'bouton-action',
      libelle: 'Obtenir un devis gratuit',
      destination: 'https://exemple.test/devis',
    });
    // …et le brouillon de départ, lui, n'a jamais été touché (pas de mutation
    // en place) — ce qui n'a aucune représentation de l'état publié dans ce
    // module (voir son en-tête) est exactement ce que cette immutabilité prouve.
    expect(brouillonDepart.size).toBe(0);
    expect(resultat.brouillon).not.toBe(brouillonDepart);
  });

  it('SC-04a — une correction sur un brouillon déjà porteur d’une autre correction conserve celle-ci intacte', () => {
    // Arrange : un brouillon qui porte déjà une correction pour un AUTRE emplacement.
    const autreCorrection: ContenuBoutonAction = {
      nature: 'bouton-action',
      libelle: 'Ancien libellé',
      destination: '/ancienne-destination',
    };
    const brouillonAvecAutreCorrection: Brouillon = new Map([['autre-bouton', autreCorrection]]);

    // Act
    const resultat = appliquerCorrectionBoutonAction(
      EMPLACEMENTS_DECLARES,
      brouillonAvecAutreCorrection,
      'bouton-devis',
      { libelle: 'Nouveau libellé', destination: '/contact' },
    );

    // Assert : les deux corrections coexistent, celle déjà présente n'a pas
    // été altérée par l'ajout de la nouvelle.
    expect(resultat.accepte).toBe(true);
    if (!resultat.accepte) return;
    expect(resultat.brouillon.get('autre-bouton')).toEqual(autreCorrection);
    expect(resultat.brouillon.get('bouton-devis')).toEqual({
      nature: 'bouton-action',
      libelle: 'Nouveau libellé',
      destination: '/contact',
    });
  });
});

describe('SC-04b — « porte un brouillon » se dérive de la seule présence d’une correction', () => {
  it('SC-04b — pagePorteUnBrouillon rend faux pour un brouillon vide et vrai dès qu’une correction existe', () => {
    // Arrange / Act / Assert — partition « vide » (borne basse).
    expect(pagePorteUnBrouillon(BROUILLON_VIDE)).toBe(false);

    // Arrange : un brouillon qui porte une seule correction — Act / Assert.
    const brouillonAvecUneCorrection: Brouillon = new Map([
      ['bouton-devis', { nature: 'bouton-action', libelle: 'X', destination: '/x' }],
    ]);
    expect(pagePorteUnBrouillon(brouillonAvecUneCorrection)).toBe(true);
  });
});

describe('SC-04c — une correction visant la structure est refusée', () => {
  it('SC-04c — une correction visant un emplacement non déclaré est refusée sans rien produire', () => {
    // Arrange / Act : l'identifiant ne correspond à aucun emplacement déclaré.
    const resultat = appliquerCorrectionBoutonAction(EMPLACEMENTS_DECLARES, BROUILLON_VIDE, 'emplacement-fantome', {
      libelle: 'X',
      destination: '/x',
    });

    // Assert
    expect(resultat).toEqual({ accepte: false, raison: 'emplacement-non-declare' });
  });

  it('SC-04c — une correction visant un emplacement déclaré d’une autre nature est refusée sans rien produire', () => {
    // Arrange / Act : l'emplacement existe, mais sa nature déclarée n'est pas « bouton-action ».
    const resultat = appliquerCorrectionBoutonAction(EMPLACEMENTS_DECLARES, BROUILLON_VIDE, 'presentation', {
      libelle: 'X',
      destination: '/x',
    });

    // Assert : aucun geste de structure (ici, changer la nature d'un
    // emplacement déjà posé) n'est jamais offert par cette route.
    expect(resultat).toEqual({ accepte: false, raison: 'nature-non-corrigible' });
  });
});

describe('SC-04h — une destination hors liste blanche est refusée, sans rien enregistrer', () => {
  it('SC-04h — destinationBoutonAutorisee accepte https, mailto, tel et un chemin relatif', () => {
    expect(destinationBoutonAutorisee('https://exemple.test/devis')).toBe(true);
    expect(destinationBoutonAutorisee('mailto:contact@exemple.test')).toBe(true);
    expect(destinationBoutonAutorisee('tel:+33100000000')).toBe(true);
    expect(destinationBoutonAutorisee('/contact')).toBe(true);
  });

  it('SC-04h — destinationBoutonAutorisee refuse un schéma hors liste blanche et une chaîne qui n’est pas une URL', () => {
    expect(destinationBoutonAutorisee('javascript:alert(1)')).toBe(false);
    expect(destinationBoutonAutorisee('ftp://exemple.test/fichier')).toBe(false);
    expect(destinationBoutonAutorisee('pas une url')).toBe(false);
  });

  it('SC-04h — une correction dont la destination est hors liste blanche est refusée, et rien n’est enregistré', () => {
    // Arrange : un brouillon de départ, pour prouver qu'il reste inchangé.
    const brouillonDepart: Brouillon = BROUILLON_VIDE;

    // Act
    const resultat = appliquerCorrectionBoutonAction(EMPLACEMENTS_DECLARES, brouillonDepart, 'bouton-devis', {
      libelle: 'X',
      destination: 'javascript:alert(1)',
    });

    // Assert : refusée, et le brouillon de départ n'a reçu aucune écriture.
    expect(resultat).toEqual({ accepte: false, raison: 'destination-invalide' });
    expect(brouillonDepart.size).toBe(0);
  });
});
