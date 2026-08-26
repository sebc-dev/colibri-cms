/**
 * Ticket 01 — La porte close (specs/001-connexion-par-code/01-porte-close.md).
 *
 * Complément statique à `tests/integration/porte-close.test.ts` : ce dernier
 * porte la couture retenue par la spec (requête HTTP réelle via `SELF`,
 * SPEC.md § Décisions de test, ADR-0003), mais `SELF.fetch` échoue
 * aujourd'hui *avant* toute assertion — `poolOptions.workers.main` n'est pas
 * câblé (`wrangler.jsonc` ne porte pas de champ `main`, aucun `astro build`
 * ne précède `vitest run`) — c'est un gap d'infrastructure hors du périmètre
 * de ce lot (config protégée / production, pas un fichier de test).
 *
 * Deux volets de C2 et C7 ne dépendent pas de l'exécution du routeur : la
 * *présence* du champ d'adresse et l'*absence* de terme de développeur sont
 * des propriétés du gabarit lui-même, lisibles dans sa source, exactement
 * comme `tests/static/gabarits-admin.test.ts` le fait déjà pour l'accueil.
 * Ce fichier leur donne donc une couverture rouge légitime, indépendante du
 * blocage `SELF`, en complément — jamais en remplacement — des tests HTTP
 * qui restent la preuve de référence une fois l'infrastructure câblée.
 *
 * Ce que ce fichier NE peut PAS couvrir : le comportement observable
 * (le rendu effectif selon la présence ou non d'un cookie, le renvoi vers
 * /admin/connexion, le refus 404 sur un chemin inconnu) — ces propriétés
 * n'existent que si le routeur s'exécute réellement ; aucune lecture de
 * source ne peut les prouver sans se coupler à l'implémentation. Elles
 * restent donc portées, et bloquées, par `porte-close.test.ts`.
 */
import { it, expect } from 'vitest';

const TERMES_DEVELOPPEUR = [
  'commit',
  'branche',
  'build',
  'déploiement',
  'déployer',
  'repository',
  'dépôt git',
  'endpoint',
  'webhook',
  'backend',
  'front-end',
  'framework',
];

function contientLeChampAdresse(source: string): boolean {
  return /<input[^>]*type=["']email["']/i.test(source) || /<input[^>]*name=["'][^"']*(adresse|email)[^"']*["']/i.test(source);
}

it('la source de l’écran de connexion porte un champ d’adresse', async () => {
  const source = (await import('../../src/pages/admin/connexion.astro?raw')).default;

  expect(contientLeChampAdresse(source)).toBe(true);
});

it('la source de l’écran de connexion ne porte aucun terme de développeur', async () => {
  const source = (await import('../../src/pages/admin/connexion.astro?raw')).default.toLowerCase();

  for (const terme of TERMES_DEVELOPPEUR) {
    expect(source, `la source de l’écran de connexion ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});
