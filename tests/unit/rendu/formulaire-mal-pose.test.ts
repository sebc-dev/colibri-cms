/**
 * Ticket 04 du change 012 — la composition refuse un formulaire introuvable
 * ou sans moyen de répondre (openspec/changes/012-envoi-des-demandes-de-devis/
 * tickets/04-*.md ; ADR-0027). `composerPage` est pure : l'erreur nomme la
 * page et le formulaire.
 */
import { describe, it, expect } from 'vitest';
import { composerPage, FormulaireMalPoseError, type EntreeComposition } from '../../../src/core/rendu/page.ts';
import type { FormulaireDeclare, ChampDeclare } from '../../../src/core/formulaires/declaration.ts';

const REGLAGES = { coordonnees: [], reseaux: [], mention: 'Mention.' };

function champ(id: string, nature: ChampDeclare['nature'], obligatoire: boolean): ChampDeclare {
  return { id, nature, libelle: id, obligatoire, avecPrix: false };
}

function formulaire(id: string, champs: readonly ChampDeclare[]): FormulaireDeclare {
  return { id, nom: `Nom de ${id}`, champs };
}

/** L'erreur levée par la composition, qui doit être un formulaire mal posé. */
function erreurDe(composer: () => unknown): FormulaireMalPoseError {
  try {
    composer();
  } catch (erreur) {
    if (erreur instanceof FormulaireMalPoseError) return erreur;
    throw erreur;
  }
  throw new Error('la composition n’a levé aucune erreur');
}

function entree(designe: string, formulaires: readonly FormulaireDeclare[]): EntreeComposition {
  return {
    slug: 'contact',
    pages: [{ slug: 'contact', titre: 'Contact' }],
    page: {
      titre: 'Contact',
      emplacements: [{ id: 'formulaire-devis', nature: 'formulaire', rang: 0, formulaire: designe }],
    },
    reglages: REGLAGES,
    formulaires,
  };
}

describe('composerPage — un formulaire mal posé', () => {
  it('SC-04a — un emplacement qui désigne un formulaire non publié fait échouer la composition en nommant la page et le formulaire', () => {
    const composer = () =>
      composerPage(entree('devis-fantome', [formulaire('autre', [champ('courriel', 'email', true)])]));

    expect(composer).toThrow(/« contact »/);
    expect(composer).toThrow(/« devis-fantome »/);
    expect(composer).toThrow(/n'est pas parmi les formulaires publiés/);
    expect(erreurDe(composer)).toMatchObject({ page: 'contact', formulaire: 'devis-fantome' });
  });

  it('SC-04b — un formulaire sans e-mail ni téléphone obligatoire fait échouer la composition en nommant la page et le formulaire', () => {
    const muet = formulaire('devis-muet', [
      champ('nom', 'texte', true),
      champ('courriel', 'email', false),
      champ('telephone', 'telephone', false),
    ]);
    const composer = () => composerPage(entree('devis-muet', [muet]));

    expect(composer).toThrow(/« contact »/);
    expect(composer).toThrow(/« devis-muet »/);
    expect(composer).toThrow(/n'a aucun champ d'e-mail ou de téléphone obligatoire/);
    expect(erreurDe(composer)).toMatchObject({ page: 'contact', formulaire: 'devis-muet' });
  });

  it('SC-04c — un formulaire publié avec un e-mail obligatoire, ou un téléphone obligatoire, est présenté', () => {
    const parMail = formulaire('par-mail', [champ('courriel', 'email', true)]);
    const parTel = formulaire('par-tel', [champ('telephone', 'telephone', true)]);

    const avecMail = composerPage(entree('par-mail', [parMail, parTel]));
    const avecTel = composerPage(entree('par-tel', [parMail, parTel]));

    expect(avecMail.emplacements.map((e) => e.nature)).toEqual(['formulaire']);
    expect(avecTel.emplacements.map((e) => e.nature)).toEqual(['formulaire']);
  });
});
