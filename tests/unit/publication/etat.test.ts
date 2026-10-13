/**
 * Change 011, ticket 18 — l'état de la dernière publication, dérivé et jamais stocké (ADR-0023).
 * Pur : l'horloge est un paramètre, aucune entrée-sortie.
 */
import { describe, it, expect } from 'vitest';
import { BORNE_MISE_EN_LIGNE, deriverEtat } from '../../../src/core/publication/etat.ts';

const MINUTE = 60 * 1000;
const SECONDE = 1000;
const T0 = 1_800_000_000_000;

describe('état de la dernière publication', () => {
  it('SC-18a — contenu tout juste déposé, site pas encore né de cette publication : en cours de mise en ligne', () => {
    // Arrange / Act
    const etat = deriverEtat({
      marqueDuSite: 'ancienne',
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: false,
      maintenant: T0,
    });

    // Assert
    expect(etat).toBe('en-cours');
  });

  it('SC-18a — un site né d’aucune publication (aucune marque empaquetée) attend la publication déposée : en cours', () => {
    const etat = deriverEtat({
      marqueDuSite: null,
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: false,
      maintenant: T0 + 5 * SECONDE,
    });

    expect(etat).toBe('en-cours');
  });

  it('SC-18b — le site en service est né de la dernière publication déposée : en ligne', () => {
    const etat = deriverEtat({
      marqueDuSite: 'neuve',
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: false,
      maintenant: T0 + MINUTE,
    });

    expect(etat).toBe('en-ligne');
  });

  it('SC-18c — la borne est une constante nommée de 30 minutes', () => {
    expect(BORNE_MISE_EN_LIGNE).toBe(30 * MINUTE);
  });

  it('SC-18c — 29 min 59 s après le dépôt, site non né de la publication : toujours en cours', () => {
    const etat = deriverEtat({
      marqueDuSite: 'ancienne',
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: false,
      maintenant: T0 + 29 * MINUTE + 59 * SECONDE,
    });

    expect(etat).toBe('en-cours');
  });

  it('SC-18c — 30 min après le dépôt, site non né de la publication : n’a pas abouti', () => {
    const etat = deriverEtat({
      marqueDuSite: 'ancienne',
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: false,
      maintenant: T0 + 30 * MINUTE,
    });

    expect(etat).toBe('pas-abouti');
  });

  it('SC-18c — un site né d’aucune publication passe lui aussi à « n’a pas abouti » à 30 min', () => {
    const etat = deriverEtat({
      marqueDuSite: null,
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: false,
      maintenant: T0 + 30 * MINUTE,
    });

    expect(etat).toBe('pas-abouti');
  });

  it('SC-18d — après « n’a pas abouti », le site en service naît de cette publication : en ligne', () => {
    // Arrange : la même publication, lue avant puis après la mise en ligne tardive
    const lecture = (marqueDuSite: string): string =>
      deriverEtat({
        marqueDuSite,
        derniereMarque: 'neuve',
        deposeLe: T0,
        verrouPris: false,
        maintenant: T0 + 45 * MINUTE,
      });

    // Act / Assert
    expect(lecture('ancienne')).toBe('pas-abouti');
    expect(lecture('neuve')).toBe('en-ligne');
  });

  it('SC-18a — cas limite : aucune publication déposée, aucun état', () => {
    const etat = deriverEtat({
      marqueDuSite: null,
      derniereMarque: null,
      deposeLe: null,
      verrouPris: false,
      maintenant: T0,
    });

    expect(etat).toBe('aucun');
  });

  it('SC-18a — cas limite : verrou pris, la publication est en train de partir', () => {
    const etat = deriverEtat({
      marqueDuSite: 'ancienne',
      derniereMarque: 'neuve',
      deposeLe: T0,
      verrouPris: true,
      maintenant: T0 + MINUTE,
    });

    expect(etat).toBe('en-train-de-partir');
  });

  it('ticket 18 — dès la toute première publication, aucune encore déposée : le verrou pris dit la publication en train de partir', () => {
    const etat = deriverEtat({
      marqueDuSite: null,
      derniereMarque: null,
      deposeLe: null,
      verrouPris: true,
      maintenant: T0,
    });

    expect(etat).toBe('en-train-de-partir');
  });
});
