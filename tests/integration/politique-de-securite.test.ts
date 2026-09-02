/**
 * Ticket 02 — La politique de sécurité sur les trois formes de réponse
 * (specs/001-connexion-par-code/02-politique-de-securite.md).
 *
 * Couture héritée du ticket 01 (SPEC.md § Décisions de test, ADR-0003) :
 * requête HTTP réelle via `SELF.fetch` contre le worker compilé, dans
 * workerd — jamais de double interne, jamais de lecture du middleware par
 * import direct (« The Inspector » : on ne teste que ce qu'une vraie
 * réponse HTTP porte).
 *
 * **Rien n'implémente encore ce ticket** (`blockedBy: ["01"]` seul est
 * livré à ce point de l'arbre) : `src/platform/entetes/middleware.ts`
 * n'existe pas et `astro.config.ts` n'inscrit aucun `addMiddleware`
 * (ADR-0008). Aucune réponse d'administration ne porte donc aujourd'hui de
 * `Content-Security-Policy`, de `X-Content-Type-Options`, de
 * `Referrer-Policy` ni de refus d'être mis en cadre — chaque test ci-dessous
 * est censé échouer, et c'est le rouge attendu du mode `test`.
 *
 * **c4 — décision explicite sur la source Turnstile (ADR-0004).** Le texte
 * du ticket 02 ne tranche pas lui-même la question qu'il pose : « le ticket
 * dit explicitement s'il ouvre dès maintenant » `challenges.cloudflare.com`
 * en source CSP. Mais son critère c4, pris à la lettre, répond déjà :
 * « ne porte … aucune source tierce » — sans exception nommée. Le mécanisme
 * Turnstile est hors du périmètre de cette feature (`outOfScope`) ; ouvrir
 * la source dès ce ticket reviendrait à câbler un arbitrage pour un
 * mécanisme qui n'existe pas encore. Ce fichier prend donc la lecture
 * stricte : la CSP admin n'ouvre **aucune** source tierce à ce ticket, pas
 * même celle réservée à Turnstile — un test dédié (c4) le vérifie
 * explicitement pour que le jour où une feature Turnstile l'ouvrira, ce
 * soit un changement délibéré de ce test, jamais un relâchement silencieux.
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF } from 'cloudflare:test';
import { it, expect } from 'vitest';

// Les quatre en-têtes que la politique doit poser, identiquement, sur les
// trois formes de réponse (ADR-0004, ADR-0008). Comparés par nom de champ
// uniquement : les en-têtes hors de cette liste (Content-Type,
// Content-Length…) varient légitimement selon la forme de réponse (200,
// 302, 404) et ne font pas partie de la politique de sécurité.
const CHAMPS_DE_SECURITE = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options'] as const;

function enTetesDeSecurite(reponse: Response): Record<string, string> {
  const releve: Record<string, string> = {};
  for (const champ of CHAMPS_DE_SECURITE) {
    const valeur = reponse.headers.get(champ);
    if (valeur !== null) releve[champ] = valeur;
  }
  return releve;
}

// Le refus d'être mis en cadre peut se poser par `X-Frame-Options` ou par la
// directive `frame-ancestors` de la CSP (les deux portent le même refus) :
// ne pas figer laquelle des deux formes l'implémentation choisit.
function refuseDetreMisEnCadre(reponse: Response): boolean {
  const xfo = reponse.headers.get('x-frame-options');
  if (xfo && /^(deny|sameorigin)$/i.test(xfo.trim())) return true;

  const csp = reponse.headers.get('content-security-policy');
  return !!csp && /frame-ancestors\s+('none'|'self')/i.test(csp);
}

it('l’écran de connexion servi porte une Content-Security-Policy', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');

  expect(reponse.headers.get('content-security-policy')).not.toBeNull();
});

it('l’écran de connexion servi porte le refus de reniflage de type (X-Content-Type-Options: nosniff)', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');

  expect(reponse.headers.get('x-content-type-options')).toBe('nosniff');
});

it('l’écran de connexion servi porte une politique de référent', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');

  expect(reponse.headers.get('referrer-policy')).toBeTruthy();
});

it('l’écran de connexion servi refuse d’être mis en cadre', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');

  expect(refuseDetreMisEnCadre(reponse)).toBe(true);
});

it('le renvoi rendu par le garde de session porte exactement les mêmes en-têtes de sécurité, aux mêmes valeurs, que l’écran de connexion', async () => {
  const ecranDeConnexion = await SELF.fetch('https://example.com/admin/connexion');
  const enTetesReference = enTetesDeSecurite(ecranDeConnexion);

  // Sanity : sans cette précondition, deux ensembles vides seraient jugés
  // « identiques » sans qu'aucune politique n'ait été posée nulle part —
  // ce ne serait pas une preuve, mais un test qui ment (« The Liar »).
  expect(Object.keys(enTetesReference).length, 'l’écran de connexion devrait déjà porter les en-têtes de sécurité').toBe(CHAMPS_DE_SECURITE.length);

  const renvoi = await SELF.fetch('https://example.com/admin/', { redirect: 'manual' });

  expect([301, 302, 303, 307, 308]).toContain(renvoi.status);
  expect(enTetesDeSecurite(renvoi)).toEqual(enTetesReference);
});

it('un chemin inconnu sous /admin/ porte exactement les mêmes en-têtes de sécurité, aux mêmes valeurs, que l’écran de connexion', async () => {
  const ecranDeConnexion = await SELF.fetch('https://example.com/admin/connexion');
  const enTetesReference = enTetesDeSecurite(ecranDeConnexion);

  expect(Object.keys(enTetesReference).length, 'l’écran de connexion devrait déjà porter les en-têtes de sécurité').toBe(CHAMPS_DE_SECURITE.length);

  const cheminInconnu = await SELF.fetch('https://example.com/admin/ceci-nexiste-pas');

  expect(cheminInconnu.status).toBe(404);
  expect(enTetesDeSecurite(cheminInconnu)).toEqual(enTetesReference);
});

it('la Content-Security-Policy ne porte pas unsafe-inline dans script-src', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');
  const csp = reponse.headers.get('content-security-policy');

  expect(csp, 'une Content-Security-Policy devrait être posée').toBeTruthy();
  // ADR-0010 : style-src-attr 'unsafe-inline' pour les primitives
  expect(csp).toMatch(/style-src-attr 'unsafe-inline'/);
  // Mais script-src reste strict
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
});

it('la Content-Security-Policy ne porte pas unsafe-eval', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');
  const csp = reponse.headers.get('content-security-policy');

  expect(csp, 'une Content-Security-Policy devrait être posée').toBeTruthy();
  expect(csp).not.toMatch(/unsafe-eval/);
});

it('la Content-Security-Policy n’ouvre aucune source tierce, pas même challenges.cloudflare.com réservée à Turnstile (ADR-0004, hors périmètre de cette feature)', async () => {
  const reponse = await SELF.fetch('https://example.com/admin/connexion');
  const csp = reponse.headers.get('content-security-policy');

  expect(csp, 'une Content-Security-Policy devrait être posée').toBeTruthy();
  expect(csp).not.toMatch(/challenges\.cloudflare\.com/);
  expect(csp).not.toMatch(/https?:\/\//);
});
