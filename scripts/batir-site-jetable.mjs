#!/usr/bin/env node
/**
 * Bâtit le site public depuis un contenu JETABLE, sans toucher à `content/`
 * (ticket 04 de 011-apercu-et-publication ; outil repris par les tickets 05
 * et 06). Le contenu de démonstration ne porte ni `<`, `>`, `&`, guillemets,
 * ni réseau vide : les tests statiques les apportent par la fixture
 * versionnée `tests/static/fixtures/site-jetable/content/`.
 *
 * Le produit empaquette `content/` à chemin figé (`import.meta.glob`,
 * `src/platform/contenu/`) : on ne le paramètre pas. Ce script copie donc
 * l'arbre de travail COURANT — code non commité compris, à la différence du
 * site factice de recette qui part d'un `git worktree` au HEAD — vers
 * `.wrangler/site-jetable/arbre/`, y remplace `content/` par la fixture, y
 * lance `astro build`, puis copie la sortie statique vers
 * `.wrangler/site-jetable/client/`, que les tests lisent.
 *
 * Tous les chemins partent du répertoire courant : le script marche aussi
 * depuis le bac à sable de la mutation (`stryker.conf.json`, `buildCommand`).
 * `.wrangler/` est déjà ignoré par git, par eslint et par la collecte de
 * vitest. Ni `dist/` ni `.wrangler/test-worker/` de la racine ne sont
 * touchés : la construction se fait dans la copie, dont les `node_modules`
 * se résolvent par remontée de répertoires (aucun lien symbolique).
 *
 * Idempotent : `.wrangler/site-jetable/` est vidé à chaque passe. Une
 * construction échouée sort en code non nul.
 *
 * `globalThis.process` / `globalThis.console` plutôt que les identifiants
 * nus : `eslint.config.js` ne déclare les globales Node que pour `**\/*.ts`
 * (même raison que `scripts/preparer-worker-de-test.mjs`).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const RACINE = globalThis.process.cwd();
const FIXTURE = resolve(RACINE, 'tests/static/fixtures/site-jetable/content');
const JETABLE = resolve(RACINE, '.wrangler/site-jetable');
const ARBRE = resolve(JETABLE, 'arbre');
const CLIENT = resolve(JETABLE, 'client');

/**
 * Ce dont `astro build` a besoin, hors `content/` (remplacé par la fixture).
 * `migrations/` : des magasins de `src/platform/` en importent le DDL (`?raw`).
 */
const A_COPIER = [
  'src',
  'migrations',
  'astro.config.ts',
  'instance.json',
  'tsconfig.json',
  'wrangler.astro.jsonc',
  'wrangler.jsonc',
  'package.json',
];
const A_COPIER_SI_PRESENTS = ['public'];

function echouer(message) {
  globalThis.console.error(`✘ site jetable : ${message}`);
  globalThis.process.exit(1);
}

function preparerArbre() {
  // Vidé d'abord : une passe échouée ne laisse aucune sortie périmée aux tests.
  rmSync(JETABLE, { recursive: true, force: true });
  if (!existsSync(FIXTURE)) echouer(`fixture absente : ${FIXTURE}`);
  mkdirSync(ARBRE, { recursive: true });
  for (const chemin of A_COPIER) {
    if (!existsSync(resolve(RACINE, chemin))) echouer(`${chemin} absent du répertoire courant (${RACINE}).`);
    cpSync(resolve(RACINE, chemin), resolve(ARBRE, chemin), { recursive: true });
  }
  for (const chemin of A_COPIER_SI_PRESENTS) {
    if (existsSync(resolve(RACINE, chemin))) {
      cpSync(resolve(RACINE, chemin), resolve(ARBRE, chemin), { recursive: true });
    }
  }
  cpSync(FIXTURE, resolve(ARBRE, 'content'), { recursive: true });
}

/**
 * `astro` résolu depuis la copie, par remontée de répertoires — comme le fera
 * la construction elle-même. Pas de `RACINE/node_modules` en dur : la
 * mutation lance la construction dans son bac à sable (sous `.stryker-tmp/`)
 * AVANT d'y lier `node_modules` ; seuls ceux de la racine du dépôt, plus
 * haut, sont alors atteignables.
 */
function resoudreAstro() {
  try {
    const manifeste = createRequire(resolve(ARBRE, 'package.json')).resolve('astro/package.json');
    return resolve(dirname(manifeste), 'bin/astro.mjs');
  } catch (erreur) {
    return echouer(`astro introuvable depuis ${ARBRE} — lancer \`npm ci\` d'abord (${erreur.message}).`);
  }
}

function batir() {
  const astro = resoudreAstro();
  const resultat = spawnSync(globalThis.process.execPath, [astro, 'build'], { cwd: ARBRE, stdio: 'inherit' });
  if (resultat.error) echouer(`astro build n'a pas pu être lancé : ${resultat.error.message}`);
  if (resultat.status !== 0) echouer(`astro build a échoué (code ${resultat.status ?? resultat.signal}).`);
  const sortie = resolve(ARBRE, 'dist/client');
  if (!existsSync(sortie)) echouer(`astro build n'a produit aucun ${sortie}.`);
  cpSync(sortie, CLIENT, { recursive: true });
}

preparerArbre();
batir();
globalThis.console.log(`✔ site jetable bâti dans ${CLIENT}`);
