import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

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
  adapter: cloudflare({ imageService: 'compile' }),
  // ADR-0019 : les variantes d'images sont produites au build, un seul
  // format, sur les trois largeurs mesurées contre le garde-fou C5.
  image: {
    layout: 'constrained',
    breakpoints: [640, 960, 1280],
  },
});
