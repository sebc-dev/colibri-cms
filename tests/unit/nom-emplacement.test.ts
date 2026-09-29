/**
 * Ticket 01 — Le nom d'un emplacement est lu avec sa déclaration
 * (openspec/changes/006-nom-des-emplacements/tickets/
 * 01-nom-lu-avec-la-declaration.md), ADR-0012.
 *
 * Couture retenue, entièrement `core/` — zéro D1, zéro HTTP, zéro Worker
 * (I1/I2, ARCH-5), même patron que `tests/unit/modele-emplacement-image.test.ts` :
 * - SC-01a/b/c exercent `trierEmplacementsDeclares` (`src/core/pages/
 *   declaration.ts`) sur des entrées brutes portant un `nom`, bien ou mal
 *   formé — un nom mal formé (D2) devient « pas de nom », jamais une entrée
 *   écartée, à la différence des autres champs de ce module.
 * - SC-01d exerce la survie du nom à travers une correction de brouillon
 *   (`src/core/pages/brouillon.ts`, `appliquerBrouillonSurEmplacement`) : le
 *   brouillon reste rattaché par identifiant stable, indépendamment d'un nom
 *   qui change entre deux déclarations successives.
 */
import { describe, it, expect } from 'vitest';
import { trierEmplacementsDeclares } from '../../src/core/pages/declaration.ts';
import {
  appliquerCorrectionBoutonAction,
  appliquerBrouillonSurEmplacement,
  BROUILLON_VIDE,
} from '../../src/core/pages/brouillon.ts';

// --- SC-01a — un nom déclaré entouré d'espaces est lu débarrassé de ses
// espaces de début et de fin ---

describe("SC-01a — un nom déclaré entouré d'espaces est lu débarrassé de ses espaces de bord", () => {
  it('SC-01a — un emplacement déclaré avec le nom "  Présentation  " est lu avec le nom "Présentation"', () => {
    // Arrange : un emplacement de texte riche dont le nom porte des espaces
    // de début et de fin dans le page.json.
    const brut: readonly unknown[] = [
      { id: 'presentation', nature: 'texte-riche', rang: 0, nom: '  Présentation  ' },
    ];

    // Act
    const emplacements = trierEmplacementsDeclares(brut);

    // Assert : le nom lu est débarrassé de ses espaces de bord, sans autre
    // transformation.
    expect(emplacements).toHaveLength(1);
    expect(emplacements[0]).toMatchObject({ id: 'presentation', nom: 'Présentation' });
  });
});

// --- SC-01b — un emplacement déclaré sans nom est lu sans nom, et rien ne
// lui en fabrique un à partir de son identifiant ---

describe("SC-01b — un emplacement déclaré sans nom est lu sans nom, sans fabrication depuis l'identifiant", () => {
  it("SC-01b — un emplacement dont le page.json ne porte pas de champ nom est lu sans nom, et son identifiant ne devient jamais un nom", () => {
    // Arrange : un emplacement bien formé, sans champ `nom` du tout — son
    // identifiant ressemble à un nom possible, pour prouver qu'aucune
    // fabrication n'a lieu (FR-117).
    const brut: readonly unknown[] = [
      { id: 'video-presentation', nature: 'lien-video', rang: 0, lien: 'https://exemple.test/video' },
    ];

    // Act
    const emplacements = trierEmplacementsDeclares(brut);

    // Assert : lu comme tous les autres, sans nom — et surtout pas un nom
    // dérivé de l'identifiant.
    expect(emplacements).toHaveLength(1);
    expect(emplacements[0]?.nom).toBeUndefined();
    expect('nom' in emplacements[0]).toBe(false);
  });
});

// --- SC-01c — un nom mal formé (pas du texte, ou vide après trim) devient
// « pas de nom », sans écarter l'emplacement de la page ---

describe("SC-01c — un nom mal formé devient « pas de nom », sans écarter l'emplacement", () => {
  it('SC-01c — un nom qui est un nombre, un objet, null ou une chaîne uniquement faite d’espaces est lu sans nom, et l’emplacement reste présent', () => {
    // Arrange : quatre emplacements valides par ailleurs, chacun avec un nom
    // mal formé d'une manière différente.
    const brut: readonly unknown[] = [
      { id: 'nom-nombre', nature: 'texte-riche', rang: 0, nom: 42 },
      { id: 'nom-objet', nature: 'texte-riche', rang: 1, nom: { texte: 'Présentation' } },
      { id: 'nom-null', nature: 'texte-riche', rang: 2, nom: null },
      { id: 'nom-espaces', nature: 'texte-riche', rang: 3, nom: '   ' },
    ];

    // Act
    const emplacements = trierEmplacementsDeclares(brut);

    // Assert : aucune entrée n'est écartée (contrairement à une nature ou un
    // id mal formés ailleurs dans ce module) — chacune est lue sans nom.
    expect(emplacements.map((emplacement) => emplacement.id)).toEqual([
      'nom-nombre',
      'nom-objet',
      'nom-null',
      'nom-espaces',
    ]);
    for (const emplacement of emplacements) {
      expect(emplacement.nom).toBeUndefined();
    }
  });
});

// --- SC-01d — deux déclarations successives qui changent le nom d'un
// emplacement, sans changer son identifiant, laissent le brouillon rattaché
// par identifiant : la correction s'applique à l'emplacement renommé ---

describe("SC-01d — le brouillon reste rattaché par identifiant à travers un renommage de la déclaration", () => {
  it("SC-01d — corriger un emplacement puis le redéclarer sous un nouveau nom conserve la correction, appliquée à l'emplacement renommé", () => {
    // Arrange : une première déclaration du bouton, nommé, déclarée
    // valide.
    const premiereDeclaration = trierEmplacementsDeclares([
      { id: 'bouton-devis', nature: 'bouton-action', rang: 0, nom: 'Ancien nom', libelle: 'Devis', destination: '/contact' },
    ]);

    // Act 1 : une correction de contenu est appliquée à cet emplacement,
    // via le circuit normal du brouillon (identifiant stable).
    const resultatCorrection = appliquerCorrectionBoutonAction(
      premiereDeclaration,
      BROUILLON_VIDE,
      'bouton-devis',
      { libelle: 'Demander un devis', destination: '/contact' },
    );
    if (!resultatCorrection.accepte) {
      throw new Error('la correction aurait dû être acceptée');
    }
    const brouillon = resultatCorrection.brouillon;

    // Act 2 : une seconde déclaration de la même page renomme l'emplacement
    // sans changer son identifiant.
    const secondeDeclaration = trierEmplacementsDeclares([
      { id: 'bouton-devis', nature: 'bouton-action', rang: 0, nom: 'Nouveau nom', libelle: 'Devis', destination: '/contact' },
    ]);
    const emplacementRenomme = secondeDeclaration[0];
    const resultat = appliquerBrouillonSurEmplacement(emplacementRenomme, brouillon);

    // Assert : le brouillon, rattaché par identifiant, s'applique à
    // l'emplacement tel que redéclaré — la correction persiste ET porte le
    // nouveau nom, jamais l'ancien.
    expect(resultat).toMatchObject({
      id: 'bouton-devis',
      nom: 'Nouveau nom',
      libelle: 'Demander un devis',
      destination: '/contact',
    });
  });
});
