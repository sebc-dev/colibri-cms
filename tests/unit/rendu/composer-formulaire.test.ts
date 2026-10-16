/**
 * Ticket 03 du change 012 — la composition d'une page qui pose un formulaire
 * (openspec/changes/012-envoi-des-demandes-de-devis/tickets/03-*.md ;
 * ADR-0024, ADR-0027). `composerPage` est pure : les formulaires déclarés
 * sont composés en mémoire, aucun `content/` n'est lu ni modifié.
 */
import { describe, it, expect } from 'vitest';
import { composerPage, type EntreeComposition, type PageComposee } from '../../../src/core/rendu/page.ts';
import type { PageDeclaree } from '../../../src/core/pages/declaration.ts';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import type { ReglagesDeclares } from '../../../src/core/reglages/declaration.ts';
import { analyserMarkdownRestreint } from '../../../src/core/pages/texte-riche.ts';

const MENTION = 'Les informations saisies servent uniquement à répondre à votre demande.';

const PAGES: readonly PageDeclaree[] = [
  { slug: 'accueil', titre: 'Accueil' },
  { slug: 'tarifs', titre: 'Tarifs' },
  { slug: 'contact', titre: 'Contact' },
];

const REGLAGES: ReglagesDeclares = { coordonnees: [], reseaux: [], mention: MENTION };

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
        { id: 'chocolat', libelle: 'Chocolat', prix: 900 },
        { id: 'fraise', libelle: 'Fraise', prix: 1050 },
      ],
    },
    {
      id: 'nombre-de-parts',
      nature: 'choix-unique',
      libelle: 'Nombre de parts',
      obligatoire: false,
      avecPrix: true,
      options: [
        { id: 'six', libelle: '6 parts', prix: 1800 },
        { id: 'dix', libelle: '10 parts', prix: 3000 },
      ],
    },
    {
      id: 'occasion',
      nature: 'choix-multiple',
      libelle: 'Occasion',
      obligatoire: false,
      avecPrix: false,
      options: [
        { id: 'anniversaire', libelle: 'Anniversaire' },
        { id: 'mariage', libelle: 'Mariage' },
      ],
    },
    { id: 'nom', nature: 'texte', libelle: 'Votre nom', obligatoire: false, avecPrix: false },
    { id: 'courriel', nature: 'email', libelle: 'Votre adresse e-mail', obligatoire: true, avecPrix: false },
    { id: 'telephone', nature: 'telephone', libelle: 'Votre numéro de téléphone', obligatoire: false, avecPrix: false },
    { id: 'message', nature: 'texte-long', libelle: 'Votre message', obligatoire: false, avecPrix: false },
  ],
};

interface OptionVue {
  readonly id: string;
  readonly libelle: string;
  readonly prix?: number;
  readonly prixAffiche?: string;
}
interface ChampVue {
  readonly id: string;
  readonly nature: string;
  readonly libelle: string;
  readonly obligatoire: boolean;
  readonly avecPrix: boolean;
  readonly options?: readonly OptionVue[];
}
interface FormulaireVue {
  readonly id: string;
  readonly nature: 'formulaire';
  readonly nom: string;
  readonly champs: readonly ChampVue[];
  readonly mention: unknown;
  readonly mode: string;
}

function entree(surcharge: Partial<EntreeComposition> = {}): EntreeComposition {
  return {
    slug: 'contact',
    pages: PAGES,
    page: {
      titre: 'Contact',
      emplacements: [{ id: 'formulaire-devis', nature: 'formulaire', rang: 0, formulaire: 'devis-gateau' }],
    },
    reglages: REGLAGES,
    formulaires: [DEVIS_GATEAU],
    ...surcharge,
  };
}

function formulaireDe(composee: PageComposee, id = 'formulaire-devis'): FormulaireVue {
  const trouve: unknown = composee.emplacements.find((e) => e.id === id);
  return trouve as FormulaireVue;
}

function champ(formulaire: FormulaireVue, id: string): ChampVue {
  const trouve = formulaire.champs.find((c) => c.id === id);
  if (trouve === undefined) throw new Error(`champ « ${id} » absent du formulaire rendu`);
  return trouve;
}

describe('composerPage — un emplacement de formulaire', () => {
  it('SC-03a — rend le formulaire désigné : son nom, ses champs dans l’ordre déclaré, Parfum et e-mail obligatoires', () => {
    const formulaire = formulaireDe(composerPage(entree()));

    expect(formulaire).toMatchObject({ id: 'formulaire-devis', nature: 'formulaire', nom: 'Devis gâteau' });
    expect(formulaire.champs.map((c) => c.libelle)).toEqual([
      'Parfum',
      'Nombre de parts',
      'Occasion',
      'Votre nom',
      'Votre adresse e-mail',
      'Votre numéro de téléphone',
      'Votre message',
    ]);
    expect(formulaire.champs.filter((c) => c.obligatoire).map((c) => c.libelle)).toEqual([
      'Parfum',
      'Votre adresse e-mail',
    ]);
    expect(formulaire.champs.map((c) => c.nature)).toEqual([
      'choix-unique',
      'choix-unique',
      'choix-multiple',
      'texte',
      'email',
      'telephone',
      'texte-long',
    ]);
  });

  it('SC-03a — le mode d’envoi est actif pour un formulaire publié', () => {
    expect(formulaireDe(composerPage(entree())).mode).toBe('actif');
  });

  it('SC-03b — les options de Parfum portent leur prix en centimes entiers (8 €, 9 €, 10,50 €)', () => {
    const parfum = champ(formulaireDe(composerPage(entree())), 'parfum');

    expect(parfum.avecPrix).toBe(true);
    expect(parfum.options).toMatchObject([
      { id: 'vanille', libelle: 'Vanille', prix: 800 },
      { id: 'chocolat', libelle: 'Chocolat', prix: 900 },
      { id: 'fraise', libelle: 'Fraise', prix: 1050 },
    ]);
  });

  it('SC-03b — le prix mis en forme est « 8 € », « 9 € », « 10,50 € » (centimes entiers, ADR-0018)', () => {
    const parfum = champ(formulaireDe(composerPage(entree())), 'parfum');

    expect(parfum.options?.map((o) => o.prixAffiche)).toEqual(['8 €', '9 €', '10,50 €']);
  });

  it('SC-03b — les options d’Occasion, champ sans prix, ne portent aucun prix', () => {
    const occasion = champ(formulaireDe(composerPage(entree())), 'occasion');

    expect(occasion.avecPrix).toBe(false);
    expect(occasion.options?.map((o) => o.libelle)).toEqual(['Anniversaire', 'Mariage']);
    for (const option of occasion.options ?? []) {
      expect(option).not.toHaveProperty('prix');
      expect(option).not.toHaveProperty('prixAffiche');
    }
  });

  it('SC-03c — un champ à choix unique est un seul groupe, ses options étant les trois parfums', () => {
    const parfum = champ(formulaireDe(composerPage(entree())), 'parfum');

    expect(parfum.nature).toBe('choix-unique');
    expect(parfum.options?.map((o) => o.id)).toEqual(['vanille', 'chocolat', 'fraise']);
  });

  it('SC-03d — un champ à choix multiple est un seul groupe, ses options étant cochables ensemble', () => {
    const occasion = champ(formulaireDe(composerPage(entree())), 'occasion');

    expect(occasion.nature).toBe('choix-multiple');
    expect(occasion.options?.map((o) => o.id)).toEqual(['anniversaire', 'mariage']);
  });

  it('SC-03e — porte la mention d’information courante des réglages, analysée en texte riche', () => {
    const formulaire = formulaireDe(composerPage(entree()));

    expect(formulaire.mention).toEqual(analyserMarkdownRestreint(MENTION));
  });

  it('SC-03g — aucun champ rendu n’est d’une nature qui permette de joindre un fichier', () => {
    const formulaire = formulaireDe(composerPage(entree()));
    const permises = ['choix-unique', 'choix-multiple', 'texte', 'texte-long', 'email', 'telephone'];

    for (const c of formulaire.champs) expect(permises).toContain(c.nature);
  });

  it('SC-03h — un libellé de champ ou d’option contenant <, >, & et guillemets reste du texte brut', () => {
    const piege = `<b>Parfum</b> & "x" 'y'`;
    const declare: FormulaireDeclare = {
      id: 'devis-gateau',
      nom: `<i>Devis</i> & "gâteau"`,
      champs: [
        {
          id: 'parfum',
          nature: 'choix-unique',
          libelle: piege,
          obligatoire: false,
          avecPrix: false,
          options: [{ id: 'o', libelle: `<script>alert(1)</script> & "o"` }],
        },
        { id: 'courriel', nature: 'email', libelle: 'Votre adresse e-mail', obligatoire: true, avecPrix: false },
      ],
    };

    const formulaire = formulaireDe(composerPage(entree({ formulaires: [declare] })));

    expect(formulaire.nom).toBe(`<i>Devis</i> & "gâteau"`);
    expect(champ(formulaire, 'parfum').libelle).toBe(piege);
    expect(champ(formulaire, 'parfum').options?.[0]?.libelle).toBe(`<script>alert(1)</script> & "o"`);
  });

  it('SC-03i — sur Tarifs, le formulaire vient juste après l’image de bandeau, sans autre emplacement entre les deux', () => {
    const composee = composerPage(
      entree({
        slug: 'tarifs',
        page: {
          titre: 'Tarifs',
          emplacements: [
            { id: 'presentation', nature: 'texte-riche', rang: 0, contenu: 'Bienvenue' },
            { id: 'bouton-devis', nature: 'bouton-action', rang: 1, libelle: 'Demander un devis', destination: '/contact' },
            { id: 'bandeau-tarifs', nature: 'image', rang: 2, mediaId: '' },
            { id: 'formulaire-devis', nature: 'formulaire', rang: 3, formulaire: 'devis-gateau' },
          ],
        },
      }),
    );

    const ids = composee.emplacements.map((e) => e.id);
    expect(ids.indexOf('formulaire-devis')).toBe(ids.indexOf('bandeau-tarifs') + 1);
    expect(ids).toEqual(['presentation', 'bouton-devis', 'bandeau-tarifs', 'formulaire-devis']);
  });

  it('SC-03j — Tarifs et Contact posant le même formulaire rendent les mêmes champs, options et prix', () => {
    const pose = { id: 'formulaire-devis', nature: 'formulaire', rang: 0, formulaire: 'devis-gateau' } as const;
    const tarifs = formulaireDe(
      composerPage(entree({ slug: 'tarifs', page: { titre: 'Tarifs', emplacements: [pose] } })),
    );
    const contact = formulaireDe(
      composerPage(entree({ slug: 'contact', page: { titre: 'Contact', emplacements: [pose] } })),
    );

    expect(tarifs.champs).toEqual(contact.champs);
    expect(tarifs.nom).toBe(contact.nom);
    expect(tarifs.mention).toEqual(contact.mention);
  });

  it('le formulaire rendu porte l’identifiant du formulaire désigné et celui de sa page, que l’envoi reprend (ticket 07)', () => {
    const pose = { id: 'formulaire-devis', nature: 'formulaire', rang: 0, formulaire: 'devis-gateau' } as const;
    const tarifs = composerPage(entree({ slug: 'tarifs', page: { titre: 'Tarifs', emplacements: [pose] } }));
    const contact = composerPage(entree({ slug: 'contact', page: { titre: 'Contact', emplacements: [pose] } }));

    expect(tarifs.emplacements[0]).toMatchObject({ id: 'formulaire-devis', formulaire: 'devis-gateau', page: 'tarifs' });
    expect(contact.emplacements[0]).toMatchObject({ id: 'formulaire-devis', formulaire: 'devis-gateau', page: 'contact' });
  });
});
