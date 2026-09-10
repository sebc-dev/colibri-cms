/**
 * Le modèle pur de l'`Écran : Éditeur de page` — `construirePageAvecEmplacements`
 * (`src/core/pages/declaration.ts`, ADR-0012 : un `page.json` par page, posé
 * par l'intégrateur hors administration).
 *
 * **Pourquoi ces tests n'ont pas d'identifiant de critère.** Le comportement
 * assemblé ici sert l'écran du ticket 03
 * (`openspec/changes/archive/2026-09-09-003-remplir-emplacements/tickets/`
 * `03-editeur-emplacements.md`), dont la ligne `**Vérif :**` porte `observé` :
 * ses critères SC-03a…f ont été prouvés par observation, et c'est le contrat
 * du ticket. Nommer un test `SC-03b` laisserait croire l'inverse. Le lien avec
 * l'exigence tient donc ici, en prose : ces tests épinglent le **modèle pur**
 * derrière SC-03b (chaque emplacement présenté selon sa nature, dans l'ordre
 * posé) et SC-03c (chaque emplacement porte son contenu courant), jamais
 * l'écran lui-même.
 *
 * **Pourquoi ils existent.** Le rejeu de mutation d'ADR-0013 a montré que
 * cette fonction n'était retenue par aucune assertion : son garde de validation
 * pouvait être neutralisé (`if (false) return null`) et sa projection entière
 * vidée (`return {}`) sans qu'un seul test bronche. Elle vit pourtant en zone
 * `core` (I1/I2), « là où un oracle est bon marché » (ADR-0013 § Décision).
 *
 * Aucun `content/pages/<slug>/page.json` réel n'est semé ni retiré : les
 * fixtures sont composées en mémoire, comme dans `liste-des-pages-statique`.
 */
import { describe, it, expect } from 'vitest';
import { construirePageAvecEmplacements } from '../../src/core/pages/declaration.ts';

describe('construirePageAvecEmplacements — le garde de forme', () => {
  it('rend null quand le contenu n’a pas la forme d’une page déclarée', () => {
    const formesInvalides: readonly unknown[] = [
      undefined,
      null,
      'une chaîne',
      42,
      [],
      {},
      { rang: 1 }, // titre manquant
      { titre: 'Accueil' }, // rang manquant
      { titre: 'Accueil', rang: '1' }, // rang de mauvais type
      { titre: 42, rang: 1 }, // titre de mauvais type
    ];

    const resultats = formesInvalides.map((forme) => construirePageAvecEmplacements(forme));

    expect(resultats).toEqual(formesInvalides.map(() => null));
  });

  it('rend une page dès que le titre et le rang sont là, même sans aucun emplacement', () => {
    const pageSansEmplacement = { titre: 'Accueil', rang: 1 };

    const page = construirePageAvecEmplacements(pageSansEmplacement);

    expect(page).toEqual({ titre: 'Accueil', emplacements: [] });
  });
});

describe('construirePageAvecEmplacements — ce que la page rend', () => {
  it('rend le titre déclaré et les emplacements, pas un objet vide', () => {
    const contenuBrut = {
      titre: 'Nos prestations',
      rang: 2,
      emplacements: [{ id: 'accroche', nature: 'texte-riche', rang: 1 }],
    };

    const page = construirePageAvecEmplacements(contenuBrut, new Map([['accroche', 'Bonjour.']]));

    expect(page).toEqual({
      titre: 'Nos prestations',
      emplacements: [{ id: 'accroche', nature: 'texte-riche', rang: 1, contenu: 'Bonjour.' }],
    });
  });

  it('présente les emplacements dans l’ordre du rang posé, jamais celui du fichier', () => {
    const contenuBrut = {
      titre: 'Accueil',
      rang: 1,
      emplacements: [
        { id: 'pied', nature: 'texte-riche', rang: 3 },
        { id: 'entete', nature: 'texte-riche', rang: 1 },
        { id: 'corps', nature: 'texte-riche', rang: 2 },
      ],
    };

    const page = construirePageAvecEmplacements(contenuBrut);

    expect(page?.emplacements.map((emplacement) => emplacement.id)).toEqual([
      'entete',
      'corps',
      'pied',
    ]);
  });

  it('présente chaque emplacement selon sa nature, avec son contenu courant', () => {
    const contenuBrut = {
      titre: 'Accueil',
      rang: 1,
      emplacements: [
        { id: 'accroche', nature: 'texte-riche', rang: 1 },
        { id: 'demo', nature: 'lien-video', rang: 2, lien: 'https://exemple.test/v' },
        {
          id: 'devis',
          nature: 'bouton-action',
          rang: 3,
          libelle: 'Demander un devis',
          destination: '/devis',
        },
      ],
    };

    const page = construirePageAvecEmplacements(
      contenuBrut,
      new Map([['accroche', 'Texte courant.']]),
    );

    expect(page?.emplacements).toEqual([
      { id: 'accroche', nature: 'texte-riche', rang: 1, contenu: 'Texte courant.' },
      { id: 'demo', nature: 'lien-video', rang: 2, lien: 'https://exemple.test/v' },
      {
        id: 'devis',
        nature: 'bouton-action',
        rang: 3,
        libelle: 'Demander un devis',
        destination: '/devis',
      },
    ]);
  });

  it('rend un texte riche vide plutôt qu’absent quand aucun contenu n’a été lu pour lui', () => {
    const contenuBrut = {
      titre: 'Accueil',
      rang: 1,
      emplacements: [{ id: 'jamais-rempli', nature: 'texte-riche', rang: 1 }],
    };

    const page = construirePageAvecEmplacements(contenuBrut, new Map());

    expect(page?.emplacements).toEqual([
      { id: 'jamais-rempli', nature: 'texte-riche', rang: 1, contenu: '' },
    ]);
  });

  it('écarte l’emplacement mal formé sans faire échouer le reste de la page', () => {
    // Une faute de forme de l'intégrateur se constate à la lecture de l'écran,
    // jamais en panne pour l'éditrice (ADR-0012 § Négatives).
    const contenuBrut = {
      titre: 'Accueil',
      rang: 1,
      emplacements: [
        { id: 'bon', nature: 'texte-riche', rang: 1 },
        { id: 'nature-inconnue', nature: 'carrousel', rang: 2 },
        { id: 'video-sans-lien', nature: 'lien-video', rang: 3 },
        { id: 'bouton-sans-destination', nature: 'bouton-action', rang: 4, libelle: 'Devis' },
        { nature: 'texte-riche', rang: 5 }, // identifiant manquant
      ],
    };

    const page = construirePageAvecEmplacements(contenuBrut);

    expect(page?.titre).toBe('Accueil');
    expect(page?.emplacements).toEqual([
      { id: 'bon', nature: 'texte-riche', rang: 1, contenu: '' },
    ]);
  });
});
