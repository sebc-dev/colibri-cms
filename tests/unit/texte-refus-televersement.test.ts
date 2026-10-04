/**
 * Le texte d'un téléversement refusé (archive 004-bibliotheque-de-medias,
 * ticket 05, SC-05e) : dire à l'éditrice si c'est le format ou le poids qui
 * a été refusé, sans aucun terme de développeur.
 *
 * `texteDuRefusTeleversement` (`src/admin/textes.ts`) n'est appelée que par
 * `BibliothequeMedias.svelte`, monté côté navigateur : aucun test n'exécutait
 * la fonction (relevé de couverture du 2026-10-03). Couture retenue, pure :
 * la fonction elle-même, sans requête ni liaison.
 */
import { describe, it, expect } from 'vitest';
import {
  texteDuRefusTeleversement,
  TEXTE_ECHEC_TELEVERSEMENT_INATTENDU,
} from '../../src/admin/textes.ts';

describe("le texte d'un téléversement refusé (SC-05e)", () => {
  it('SC-05e — un refus de format le dit, en nommant les formats acceptés', () => {
    const texte = texteDuRefusTeleversement('format');

    expect(texte).toMatch(/format/i);
    expect(texte).toContain('JPEG, PNG ou WebP');
    expect(texte).not.toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
  });

  it('SC-05e — un refus de poids le dit, distinct du refus de format', () => {
    const texte = texteDuRefusTeleversement('poids');

    expect(texte).toMatch(/trop lourde/i);
    expect(texte).not.toBe(texteDuRefusTeleversement('format'));
    expect(texte).not.toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
  });

  it("SC-05e — une requête sans image dit qu'aucune image n'a été reçue", () => {
    const texte = texteDuRefusTeleversement('forme-invalide');

    expect(texte).toMatch(/aucune image/i);
    expect(texte).not.toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
  });

  it('SC-05e — un motif absent retombe sur le message générique', () => {
    expect(texteDuRefusTeleversement(undefined)).toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
  });

  it('SC-05e — un motif inconnu retombe sur le message générique, jamais sur la clé', () => {
    expect(texteDuRefusTeleversement('quota')).toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
    expect(texteDuRefusTeleversement('')).toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
  });

  it("SC-05e — une clé héritée de l'objet n'est jamais prise pour un motif", () => {
    // `Object.hasOwn` et non `in` : « toString » ou « constructor » existent
    // sur tout objet et rendraient une fonction au lieu d'un texte.
    expect(texteDuRefusTeleversement('toString')).toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
    expect(texteDuRefusTeleversement('constructor')).toBe(TEXTE_ECHEC_TELEVERSEMENT_INATTENDU);
  });

  it('SC-05e — aucun texte de refus ne porte de terme de développeur', () => {
    const TERMES_DEVELOPPEUR = ['fichier', 'serveur', 'requête', 'http', 'json', 'mime', 'octets', 'erreur', 'undefined'];
    const textes = [
      texteDuRefusTeleversement('format'),
      texteDuRefusTeleversement('poids'),
      texteDuRefusTeleversement('forme-invalide'),
      texteDuRefusTeleversement(undefined),
    ];

    for (const texte of textes) {
      for (const terme of TERMES_DEVELOPPEUR) {
        expect(texte, `« ${terme} » est un terme de développeur (FR-117) dans « ${texte} »`).not.toMatch(
          new RegExp(`\\b${terme}\\b`, 'i'),
        );
      }
    }
  });
});
