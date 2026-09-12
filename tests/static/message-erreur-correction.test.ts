/**
 * Gestion d'erreur partagée des îlots de correction
 * (src/admin/ilots-svelte-5/message-erreur-correction.ts).
 *
 * Fonction pure, sans D1 ni Worker : ce fichier vérifie que chaque issue non
 * métier reçoit un message DISTINCT et actionnable, et qu'aucun message ne
 * porte de terme de développeur (FR-117).
 */
import { describe, it, expect } from 'vitest';
import {
  messageErreurCorrection,
  MESSAGE_ACCES_EXPIRE,
  MESSAGE_ECRAN_PERIME,
  MESSAGE_ECHEC,
  MESSAGE_RESEAU,
} from '../../src/admin/ilots-svelte-5/message-erreur-correction.ts';

describe("message d'erreur des îlots de correction", () => {
  it('distingue accès expiré (401) et écran périmé (404)', () => {
    expect(messageErreurCorrection(401)).toBe(MESSAGE_ACCES_EXPIRE);
    expect(messageErreurCorrection(404)).toBe(MESSAGE_ECRAN_PERIME);
    expect(MESSAGE_ACCES_EXPIRE).not.toBe(MESSAGE_ECRAN_PERIME);
  });

  it('retombe sur un échec générique pour un statut imprévu (500, 0)', () => {
    expect(messageErreurCorrection(500)).toBe(MESSAGE_ECHEC);
    expect(messageErreurCorrection(0)).toBe(MESSAGE_ECHEC);
  });

  // FR-117 — la liste est une DONNÉE, pas une alternance : chaque terme est
  // éprouvé séparément, si bien qu'un échec nomme celui qui a fuité au lieu
  // de signaler qu'« une » regex de vingt-deux branches a mordu.
  const TERMES_DEVELOPPEUR = [
    'commit',
    'branche',
    'build',
    'déploiement',
    'serveur',
    'http',
    'json',
    'api',
    'url',
    'hôte',
    'host',
    'endpoint',
    'token',
    'cookie',
    'session',
    'statut',
    'status',
    'fetch',
    'requête',
    '502',
    '401',
    '404',
  ];

  it("n'emploie aucun terme de développeur (FR-117)", () => {
    for (const message of [MESSAGE_ACCES_EXPIRE, MESSAGE_ECRAN_PERIME, MESSAGE_ECHEC, MESSAGE_RESEAU]) {
      for (const terme of TERMES_DEVELOPPEUR) {
        expect(message, `« ${terme} » est un terme de développeur (FR-117)`).not.toMatch(
          new RegExp(`\\b${terme}\\b`, 'i'),
        );
      }
    }
  });
});
