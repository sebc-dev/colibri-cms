import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// FR-012, FR-024 (plan § décision 4) : la route de sonde (`src/platform/d1/
// sonde-dev.ts`) ne doit exister qu'en développement — jamais dans
// l'artefact bâti. `injectRoute` conditionné à `command === 'dev'` est ce
// qui tient cette frontière : en `build`, l'intégration ne fait rien.
function sondeDev(): AstroIntegration {
  return {
    name: 'sonde-dev',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;
        injectRoute({
          pattern: '/_sonde',
          entrypoint: './src/platform/d1/sonde-dev.ts',
          prerender: false,
        });
      },
    },
  };
}

// ADR-0008 : les en-têtes de sécurité de l'administration sont posés par un
// middleware unique, jamais gabarit par gabarit — inscrit ici par le hook
// `addMiddleware`, seul endroit où « toute réponse d'administration » (page
// servie, renvoi de la garde de session, chemin inconnu) passe par un même
// porteur. L'entrypoint est donné sous la forme `new URL(...,
// import.meta.url)` : une chaîne relative y est résolue comme un module nu
// et échoue à l'exécution (mesuré, ADR-0008).
function entetesAdmin(): AstroIntegration {
  return {
    name: 'entetes-admin',
    hooks: {
      'astro:config:setup': ({ addMiddleware }) => {
        addMiddleware({
          entrypoint: new URL('./src/platform/entetes/middleware.ts', import.meta.url),
          order: 'post',
        });
      },
    },
  };
}

// I10 (docs/archi.md) : la configuration Astro lit instance.json au moment où
// elle s'évalue, sans outil intermédiaire — c'est le seul porteur de cet
// invariant depuis ADR-0032 (la configuration de déploiement en sort). Seul
// le domaine est consommé ici (ce lot ne pose aucun formulaire) — le second
// champ du fichier d'instance n'est donc pas nommé dans ce typage, pour ne
// pas en recopier le nom hors de son unique porteur (I8).
const instancePath = fileURLToPath(new URL('./instance.json', import.meta.url));
const instance = JSON.parse(readFileSync(instancePath, 'utf-8')) as {
  domain: string;
};

export default defineConfig({
  site: `https://${instance.domain}`,
  output: 'server',
  // ADR-0008 : la CSP de l'administration est `style-src 'self'` sans
  // `unsafe-inline` (ni nonce, ni empreinte calculée par réponse). Le défaut
  // d'Astro `inlineStylesheets: 'auto'` inline les petites feuilles AU BUILD :
  // la feuille liée par `src/admin/Gabarit.astro` (`admin.css`, ~120 octets)
  // ressortait alors en bloc `<style>` inline dans le HTML bâti — refusé par
  // cette CSP (admin rendu sans style, violation en console), en contradiction
  // directe avec le critère de
  // `specs/001-connexion-par-code/02-politique-de-securite.md` (« aucun gabarit
  // servi sous /admin/ ne porte de bloc <style> », que le source respecte mais
  // que le build défaisait). `'never'` force le service de toute CSS en `<link>`
  // externe même origine, autorisé par `'self'`.
  build: { inlineStylesheets: 'never' },
  // Le produit ne se sert pas de l'API de session d'Astro (la session
  // d'administration est opaque en D1, ADR-0006) ; sans cette ligne
  // l'adaptateur active son pilote KV par défaut et l'artefact bâti exige
  // une liaison KV `SESSION` qu'aucun ADR n'a arbitrée et que
  // wrangler.jsonc ne déclare pas.
  session: false,
  // ADR-0019 : le défaut de l'adaptateur est `imageService: 'cloudflare-binding'`
  // (transformation à l'exécution par la liaison IMAGES de Cloudflare Images) ;
  // `'compile'` est ce qui produit réellement les variantes au build, comme
  // ADR-0019 le décide (le calcul des 5 fichiers par photographie y suppose
  // un service d'images local).
  // `configPath` : Astro (dev et build) lit `wrangler.astro.jsonc`, jamais
  // `wrangler.jsonc` (racine) — ticket 01 (la porte close). La racine porte
  // en plus `main`/`assets`, lus par `@cloudflare/vitest-pool-workers` seul
  // (`vitest.config.ts`, protégé) ; si Astro les lisait aussi, il bâtirait
  // depuis ce champ au lieu de son propre graphe de pages (mesuré : voir
  // `scripts/preparer-worker-de-test.mjs`).
  adapter: cloudflare({ imageService: 'compile', configPath: './wrangler.astro.jsonc' }),
  // ADR-0019 : les variantes d'images sont produites au build, un seul
  // format, sur les trois largeurs mesurées contre le garde-fou C5.
  image: {
    layout: 'constrained',
    breakpoints: [640, 960, 1280],
  },
  // ADR-0009 : Svelte 5 entre dans la chaîne de build pour la seule
  // administration (ticket 01, specs/002-socle-ilots-admin). L'intégration
  // n'ouvre ici que la compilation des fichiers `.svelte` par Vite — aucun
  // îlot du produit ne se monte par une directive `client:*` (incompatible
  // avec la CSP stricte de l'administration, `script-src 'self'` sans
  // `unsafe-inline` : Astro écrirait le bootstrap d'hydratation en ligne
  // dans la page). Le montage se fait par un point d'entrée externe, un
  // `<script>` de module qu'Astro/Vite bundle lui-même en un fichier séparé
  // (jamais `is:inline`), et c'est ce fichier bundlé, jamais du script en
  // ligne, que `<script src>` charge dans la page.
  integrations: [sondeDev(), entetesAdmin(), svelte()],
  // ADR-0009 : Tailwind CSS (v4, CSS-first — aucun `tailwind.config.js`)
  // entre dans la chaîne de build pour la seule administration (ticket 02).
  // Le plugin Vite transforme le `@import 'tailwindcss'` posé par
  // `src/admin/admin.css` ; aucune page publique n'importe cette feuille
  // (ADR-0009 § Le site public n'est pas concerné, SC-005), donc rien du
  // site statique n'embarque de CSS Tailwind.
  vite: {
    plugins: [tailwindcss()],
  },
});
