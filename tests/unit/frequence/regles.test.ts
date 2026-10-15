/**
 * Ticket 02 — Le seuil par origine : les règles pures
 * (openspec/changes/012-envoi-des-demandes-de-devis/tickets/
 * 02-seuil-de-connexion-par-origine.md), ADR-0028.
 *
 * Couture : `src/core/frequence/regles.ts`, logique pure (I1/I2) — aucun
 * accès à une horloge ni à une base, l'instant est un paramètre. Contrat
 * posé par ces assertions, faute d'antériorité :
 * - `SEUIL_PAR_SURFACE` : { demande: 5, connexion: 20 } ;
 * - `DUREE_FENETRE_MS` : une heure ;
 * - `debutDeFenetre(instant)` : le début de l'heure d'horloge de l'instant ;
 * - `fenetreEstEchue(debut, instant)` : vrai dès que l'instant sort de la
 *   fenêtre commencée à `debut` ;
 * - `jugerSollicitation(surface, rang)` : `rang` est le rang de la
 *   sollicitation dans la fenêtre (1 pour la première) ; 'traitee' jusqu'au
 *   seuil inclus, 'refusee' au-delà.
 */
import { describe, it, expect } from 'vitest';
import {
  SEUIL_PAR_SURFACE,
  DUREE_FENETRE_MS,
  debutDeFenetre,
  fenetreEstEchue,
  jugerSollicitation,
} from '../../../src/core/frequence/regles.ts';

const UNE_HEURE_MS = 60 * 60 * 1000;
// 2026-10-15T10:00:00.000Z, début d'une heure d'horloge.
const DEBUT_D_HEURE = Date.UTC(2026, 9, 15, 10, 0, 0, 0);

describe('les seuils par surface', () => {
  it('SC-02a — la connexion tolère 20 tentatives par heure, la demande 5, chaque surface à part', () => {
    expect(SEUIL_PAR_SURFACE.connexion).toBe(20);
    expect(SEUIL_PAR_SURFACE.demande).toBe(5);
    expect(DUREE_FENETRE_MS).toBe(UNE_HEURE_MS);
  });

  it('SC-02a — la 20e tentative de connexion est traitée, la 21e refusée', () => {
    expect(jugerSollicitation('connexion', 1)).toBe('traitee');
    expect(jugerSollicitation('connexion', 20)).toBe('traitee');
    expect(jugerSollicitation('connexion', 21)).toBe('refusee');
    expect(jugerSollicitation('connexion', 500)).toBe('refusee');
  });

  it('SC-02a — le seuil des demandes (5) n’est pas celui de la connexion (20)', () => {
    expect(jugerSollicitation('demande', 5)).toBe('traitee');
    expect(jugerSollicitation('demande', 6)).toBe('refusee');
    expect(jugerSollicitation('connexion', 6)).toBe('traitee');
  });
});

describe('la fenêtre d’une heure d’horloge', () => {
  it('SC-02h — le début de fenêtre est le début de l’heure d’horloge de l’instant', () => {
    expect(debutDeFenetre(DEBUT_D_HEURE)).toBe(DEBUT_D_HEURE);
    expect(debutDeFenetre(DEBUT_D_HEURE + 1)).toBe(DEBUT_D_HEURE);
    expect(debutDeFenetre(DEBUT_D_HEURE + UNE_HEURE_MS - 1)).toBe(DEBUT_D_HEURE);
    expect(debutDeFenetre(DEBUT_D_HEURE + UNE_HEURE_MS)).toBe(DEBUT_D_HEURE + UNE_HEURE_MS);
  });

  it('SC-02g — la fenêtre est échue à la milliseconde où l’heure suivante commence, pas avant', () => {
    expect(fenetreEstEchue(DEBUT_D_HEURE, DEBUT_D_HEURE)).toBe(false);
    expect(fenetreEstEchue(DEBUT_D_HEURE, DEBUT_D_HEURE + UNE_HEURE_MS - 1)).toBe(false);
    expect(fenetreEstEchue(DEBUT_D_HEURE, DEBUT_D_HEURE + UNE_HEURE_MS)).toBe(true);
    expect(fenetreEstEchue(DEBUT_D_HEURE, DEBUT_D_HEURE + 5 * UNE_HEURE_MS)).toBe(true);
  });
});
