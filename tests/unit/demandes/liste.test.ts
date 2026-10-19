/**
 * Ticket 04 du change 013 — la logique pure de la liste des demandes : bornage de la page, nombre
 * de pages, formulaire choisi (comparé à la liste lue en base). Couture : `src/core/demandes/liste.ts`.
 */
import { it, expect } from 'vitest';
import {
  bornerPage,
  nombreDePages,
  choisirFormulaire,
  nomDuFormulaire,
} from '../../../src/core/demandes/liste.ts';

const PRESENTS = [
  { id: 'devis-gateau', nom: 'Devis gâteau' },
  { id: 'devis-atelier', nom: 'Devis atelier' },
];

it('SC-04c — 120 demandes font 3 pages de 50, 50 en font 1, 51 en font 2, aucune en fait 1', () => {
  expect(nombreDePages(120)).toBe(3);
  expect(nombreDePages(50)).toBe(1);
  expect(nombreDePages(51)).toBe(2);
  expect(nombreDePages(0)).toBe(1);
});

it('SC-04c — cas limite : une page valide est gardée', () => {
  expect(bornerPage('2', 3)).toBe(2);
  expect(bornerPage('3', 3)).toBe(3);
});

it('SC-04c — cas limite : 0, -1, abc, vide ou absent mènent à la première page', () => {
  for (const brut of ['0', '-1', 'abc', '', null, undefined]) {
    expect(bornerPage(brut, 3), String(brut)).toBe(1);
  }
});

it('SC-04c — cas limite : une page au-delà de la dernière mène à la dernière', () => {
  expect(bornerPage('4', 3)).toBe(3);
  expect(bornerPage('999', 3)).toBe(3);
});

it('SC-04a — un formulaire de demande présente est choisi', () => {
  expect(choisirFormulaire('devis-atelier', PRESENTS)).toBe('devis-atelier');
});

it('SC-04b — cas limite : sans choix (absent ou vide), toutes les demandes sont rendues', () => {
  expect(choisirFormulaire(null, PRESENTS)).toBeNull();
  expect(choisirFormulaire('', PRESENTS)).toBeNull();
});

it('SC-04a — cas limite : un formulaire qui ne désigne aucune demande présente est ignoré', () => {
  expect(choisirFormulaire('inconnu', PRESENTS)).toBeNull();
  expect(choisirFormulaire("x' or 1=1 --", PRESENTS)).toBeNull();
});

it('SC-04d — un formulaire déclaré prend le nom de la déclaration, même si le nom gardé diffère', () => {
  const declares = [{ id: 'devis-atelier', nom: 'Devis atelier' }];
  const gardes = [{ nom: 'Atelier (ancien nom)', recueLe: 2000 }];

  expect(nomDuFormulaire('devis-atelier', declares, gardes)).toBe('Devis atelier');
});

it('SC-04d — un formulaire non déclaré prend le nom gardé sur la demande la plus récente', () => {
  const declares = [{ id: 'devis-atelier', nom: 'Devis atelier' }];
  const gardes = [
    { nom: 'Ancien devis v1', recueLe: 1000 },
    { nom: 'Ancien devis', recueLe: 3000 },
    { nom: 'Ancien devis v0', recueLe: 500 },
  ];

  expect(nomDuFormulaire('ancien-devis', declares, gardes)).toBe('Ancien devis');
});
