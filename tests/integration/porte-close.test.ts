/**
 * Ticket 01 — La porte close (specs/001-connexion-par-code/01-porte-close.md).
 *
 * Couture de test retenue par la spec (SPEC.md § Décisions de test) : une
 * requête HTTP réelle contre le produit, dans son vrai moteur — `SELF`,
 * exposé par `cloudflare:test`, appelle le worker de production tel qu'il
 * tournerait déployé (ADR-0003). Aucune session ne peut exister à ce
 * ticket : le garde de `src/platform/session/index.ts` refuse tout, sans
 * exception, et ce n'est pas provisoire.
 *
 * `SELF.fetch` exige que le worker principal soit résolu par
 * `@cloudflare/vitest-pool-workers` (`poolOptions.workers.main`) : tant
 * qu'aucune route n'existe sous `src/pages/`, il n'y a rien à résoudre, et
 * c'est précisément ce que ce fichier constate.
 *
 * `tsconfig.json` est un fichier de configuration : ne pas y déroger pour
 * faire passer un test (hors de portée de ce lot) — il ne porte pas
 * `"types": ["@cloudflare/vitest-pool-workers"]` : la
 * référence ci-dessous apporte les déclarations ambiantes du module
 * `cloudflare:test` sans y toucher.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF } from 'cloudflare:test';
import { it, expect } from 'vitest';

const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

// Aucune session ne peut exister à ce ticket (le garde refuse tout) : le nom
// et la forme réels du cookie de session naissent au ticket 06. N'importe
// quelle valeur suffit ici à prouver que sa seule présence ne débloque rien.
const COOKIE_QUELCONQUE = 'session=valeur-quelconque-a-ce-stade';

function contientLeChampAdresse(corps: string): boolean {
  return /<input[^>]*type=["']email["']/i.test(corps) || /<input[^>]*name=["'][^"']*(adresse|email)[^"']*["']/i.test(corps);
}

it('admin racine sans cookie renvoie vers l’écran de connexion', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/', { redirect: 'manual' });

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(reponse.headers.get('location')).toMatch(/\/admin\/connexion\/?$/);
});

it('admin racine sans cookie ne rend jamais le contenu de l’accueil, on atterrit sur la connexion', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/');
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(contientLeChampAdresse(corps)).toBe(true);
});

it('admin racine avec un cookie quelconque renvoie aussi vers la connexion, car aucune session n’est possible', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/', {
    redirect: 'manual',
    headers: { Cookie: COOKIE_QUELCONQUE },
  });

  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(reponse.headers.get('location')).toMatch(/\/admin\/connexion\/?$/);
});

it('l’écran de connexion se rend sans cookie et porte le champ d’adresse', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(contientLeChampAdresse(corps)).toBe(true);
});

it('l’écran de connexion se rend aussi avec un cookie de session présent, car ce n’est pas une route gardée', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion', {
    headers: { Cookie: COOKIE_QUELCONQUE },
  });
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(contientLeChampAdresse(corps)).toBe(true);
});

it('un chemin inconnu sous admin rend un refus', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/ceci-nexiste-pas');

  expect(reponse.status).toBe(404);
});

it('un chemin inconnu sous admin ne laisse rien voir de l’administration', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/ceci-nexiste-pas');
  const corps = await reponse.text();

  expect(contientLeChampAdresse(corps)).toBe(false);
});

it('le corps rendu de l’écran de connexion ne porte aucun terme de développeur', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');
  const corps = (await reponse.text()).toLowerCase();

  const termesDeveloppeur = [
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

  for (const terme of termesDeveloppeur) {
    expect(corps, `le corps rendu ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});
