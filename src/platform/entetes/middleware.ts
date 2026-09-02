/**
 * Le middleware des en-têtes de sécurité de l'administration (ADR-0008,
 * ADR-0004) — ticket 02 (specs/001-connexion-par-code/
 * 02-politique-de-securite.md).
 *
 * Porteur unique des quatre en-têtes que toute réponse d'administration
 * doit porter, quelle que soit sa forme (page servie 200, renvoi 302 du
 * garde de session, chemin inconnu 404) : rien ne les rassemble ailleurs
 * (ADR-0008 § Contexte), donc les poser gabarit par gabarit rouvrirait la
 * parade en silence au premier oubli. Inscrit depuis `astro.config.ts` par
 * le hook d'intégration `addMiddleware` (ADR-0008), jamais comme
 * `src/middleware.ts` (la convention d'Astro place ce fichier hors des cinq
 * zones que juge `eslint.config.boundaries.js`, I1).
 *
 * Zone `platform/` (docs/archi.md, I1) : adaptateur entre le produit et la
 * plateforme (ici, le pipeline de requête d'Astro) — n'importe aucun autre
 * fichier de `platform/`, aucun fichier de `core/` non plus : ce middleware
 * ne dépend que de la forme de la requête (son chemin), jamais du domaine.
 *
 * Portée : seules les réponses sous `/admin/` (et `/admin` sans barre
 * finale) reçoivent la politique — le site public reste hors du périmètre
 * de ce ticket (FR-095/096, le site public reste statique, servi par
 * `_headers`, ADR-0004).
 *
 * c4 — la CSP n'ouvre aucune source tierce, pas même
 * `challenges.cloudflare.com` réservée à Turnstile (ADR-0004) : le
 * mécanisme Turnstile est hors du périmètre de cette feature (`outOfScope`
 * du ticket 02) ; ouvrir la source dès ce ticket câblerait un arbitrage
 * pour un mécanisme qui n'existe pas encore. Le jour où une feature
 * Turnstile l'ouvrira, ce sera un changement délibéré de cette politique,
 * jamais un relâchement silencieux.
 *
 * ADR-0008 § Conséquences négatives : cette politique est identique en
 * développement et en production, et Astro sert les blocs `<style>` d'un
 * fichier `.astro` en ligne en développement — `style-src 'self'` (sans
 * `unsafe-inline`) impose donc qu'aucun gabarit d'administration n'en porte
 * (couvert par `tests/static/gabarits-admin.test.ts` et
 * `tests/static/politique-de-securite-statique.test.ts`).
 *
 * ADR-0010 (ticket 02, specs/002-socle-ilots-admin/
 * 02-composant-shadcn-sous-csp.md) : `style-src-attr 'unsafe-inline'`
 * réconcilie les attributs `style="…"` en ligne, calculés à l'exécution, que
 * posent certaines primitives bits-ui (positionnement de sur-couches,
 * animations) — un nonce ne blanchit pas un attribut, et les valeurs étant
 * dynamiques, un jeu d'empreintes n'est pas borné (ADR-0010 § Alternatives
 * considérées). Cette tolérance est bornée à cette seule directive :
 * `script-src` reste strict, sans `unsafe-inline`, et `style-src` (les
 * éléments `<style>`/`<link>`) reste inchangé.
 */
import { defineMiddleware } from 'astro/middleware';

const POLITIQUE_DE_SECURITE = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  // ADR-0010 : seuls les attributs `style="…"` en ligne des primitives
  // bits-ui sont tolérés — `style-src` (ci-dessus) reste sans
  // `unsafe-inline`, et `script-src` (ci-dessus) n'est jamais rouvert.
  "style-src-attr 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

function estUneReponseDadministration(chemin: string): boolean {
  return chemin === '/admin' || chemin.startsWith('/admin/');
}

export const onRequest = defineMiddleware(async (contexte, next) => {
  const reponse = await next();

  const { pathname } = new URL(contexte.request.url);
  if (!estUneReponseDadministration(pathname)) return reponse;

  reponse.headers.set('Content-Security-Policy', POLITIQUE_DE_SECURITE);
  reponse.headers.set('X-Content-Type-Options', 'nosniff');
  reponse.headers.set('Referrer-Policy', 'same-origin');
  reponse.headers.set('X-Frame-Options', 'DENY');

  return reponse;
});
