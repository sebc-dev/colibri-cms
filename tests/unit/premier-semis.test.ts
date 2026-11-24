/**
 * Ticket 08 (020-deploiement-instance-client) — verdict du semis de la première
 * adresse autorisée. Fonction pure : l'adresse demandée et le contenu de la table
 * `adresses_autorisees` en entrée, un verdict en sortie, aucune écriture.
 */
import { describe, it, expect } from 'vitest';
import { jugerLePremierSemis } from '../../src/platform/auth/premier-semis.ts';

const table = (...adresses: string[]): { adresse: string }[] => adresses.map((adresse) => ({ adresse }));

describe('premier semis — verdict', () => {
  it("SC-08a — table vide, adresse bien formée : l'adresse est à inscrire", () => {
    expect(jugerLePremierSemis('editrice@example.com', table())).toEqual({
      verdict: 'a-inscrire',
      adresse: 'editrice@example.com',
    });
  });

  it('SC-08a — les espaces de bord sont ignorés : l’adresse à inscrire est rognée', () => {
    expect(jugerLePremierSemis('  editrice@example.com  ', table())).toEqual({
      verdict: 'a-inscrire',
      adresse: 'editrice@example.com',
    });
  });

  it('SC-08b — une autre adresse est déjà en place : refusé, rien à inscrire', () => {
    const resultat = jugerLePremierSemis('autre@example.com', table('editrice@example.com'));

    expect(resultat.verdict).toBe('autre-adresse-en-place');
  });

  it('SC-08b — une adresse voisine (autre domaine) reste une autre adresse', () => {
    const resultat = jugerLePremierSemis('editrice@example.org', table('editrice@example.com'));

    expect(resultat.verdict).toBe('autre-adresse-en-place');
  });

  it.each([
    ['telle quelle', 'editrice@example.com'],
    ['sous une autre casse', 'EDITRICE@Example.COM'],
    ['avec des espaces de bord', ' editrice@example.com '],
  ])('SC-08c — la même adresse %s est déjà en place : rien à inscrire', (_cas, saisie) => {
    const resultat = jugerLePremierSemis(saisie, table('editrice@example.com'));

    expect(resultat.verdict).toBe('deja-en-place');
  });

  it.each([
    ['vide', ''],
    ['faite d’espaces', '   '],
    ['sans arobase', 'editrice.example.com'],
    ['sans domaine', 'editrice@'],
    ['sans nom', '@example.com'],
    ['avec un espace au milieu', 'edi trice@example.com'],
  ])('SC-08d — une adresse %s est refusée comme mal formée', (_cas, saisie) => {
    expect(jugerLePremierSemis(saisie, table()).verdict).toBe('adresse-mal-formee');
  });

  it('SC-08d — une adresse mal formée est refusée même si une adresse est déjà en place', () => {
    const resultat = jugerLePremierSemis('pas-une-adresse', table('editrice@example.com'));

    expect(resultat.verdict).toBe('adresse-mal-formee');
  });
});
