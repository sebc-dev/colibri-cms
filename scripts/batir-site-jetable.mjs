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
 * Deux autres constructions suivent (ticket 06), chacune dans son répertoire
 * `.wrangler/` vidé à chaque passe :
 * - `site-jetable-images/` (fixture `site-jetable-images/`, avec ses octets
 *   copiés en `medias/`) : attendue en SUCCÈS, sortie copiée vers `client/` ;
 * - `site-jetable-image-manquante/` : attendue en ÉCHEC (image posée sans
 *   octets, SC-06f). Elle ne fait jamais échouer le script : le code et la
 *   sortie de la construction vont dans `resultat.json`, que le test juge.
 *
 * `globalThis.process` / `globalThis.console` plutôt que les identifiants
 * nus : `eslint.config.js` ne déclare les globales Node que pour `**\/*.ts`
 * (même raison que `scripts/preparer-worker-de-test.mjs`).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const RACINE = globalThis.process.cwd();

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

/**
 * Prépare `<dossier>/arbre/` : copie de l'arbre courant dont `content/` est
 * remplacé par `<fixture>/content` et, si la fixture en porte, `medias/` par
 * `<fixture>/medias`. Le dossier est vidé d'abord : une passe échouée ne
 * laisse aucune sortie périmée aux tests.
 */
function preparerArbre(fixture, dossier, avecMedias = false) {
  const contenu = resolve(fixture, 'content');
  const arbre = resolve(dossier, 'arbre');
  rmSync(dossier, { recursive: true, force: true });
  if (!existsSync(contenu)) echouer(`fixture absente : ${contenu}`);
  mkdirSync(arbre, { recursive: true });
  for (const chemin of A_COPIER) {
    if (!existsSync(resolve(RACINE, chemin))) echouer(`${chemin} absent du répertoire courant (${RACINE}).`);
    cpSync(resolve(RACINE, chemin), resolve(arbre, chemin), { recursive: true });
  }
  for (const chemin of A_COPIER_SI_PRESENTS) {
    if (existsSync(resolve(RACINE, chemin))) {
      cpSync(resolve(RACINE, chemin), resolve(arbre, chemin), { recursive: true });
    }
  }
  cpSync(contenu, resolve(arbre, 'content'), { recursive: true });
  if (avecMedias) {
    const medias = resolve(fixture, 'medias');
    if (!existsSync(medias)) echouer(`octets de la fixture absents : ${medias}`);
    cpSync(medias, resolve(arbre, 'medias'), { recursive: true });
  }
  return arbre;
}

/**
 * `astro` résolu depuis la copie, par remontée de répertoires — comme le fera
 * la construction elle-même. Pas de `RACINE/node_modules` en dur : la
 * mutation lance la construction dans son bac à sable (sous `.stryker-tmp/`)
 * AVANT d'y lier `node_modules` ; seuls ceux de la racine du dépôt, plus
 * haut, sont alors atteignables.
 */
function resoudreAstro(arbre) {
  try {
    const manifeste = createRequire(resolve(arbre, 'package.json')).resolve('astro/package.json');
    return resolve(dirname(manifeste), 'bin/astro.mjs');
  } catch (erreur) {
    return echouer(`astro introuvable depuis ${arbre} — lancer \`npm ci\` d'abord (${erreur.message}).`);
  }
}

/** Construction attendue en succès : sort en code non nul si elle échoue. */
function batir(arbre, client) {
  const astro = resoudreAstro(arbre);
  const resultat = spawnSync(globalThis.process.execPath, [astro, 'build'], { cwd: arbre, stdio: 'inherit' });
  if (resultat.error) echouer(`astro build n'a pas pu être lancé : ${resultat.error.message}`);
  if (resultat.status !== 0) echouer(`astro build a échoué (code ${resultat.status ?? resultat.signal}).`);
  const sortie = resolve(arbre, 'dist/client');
  if (!existsSync(sortie)) echouer(`astro build n'a produit aucun ${sortie}.`);
  cpSync(sortie, client, { recursive: true });
}

/**
 * Les pages HTML qu'une construction a laissées dans `dist/client/`, hors la
 * page 404 du gabarit, qu'Astro produit avant d'atteindre les pages du site.
 */
function pagesProduites(arbre) {
  const client = resolve(arbre, 'dist/client');
  if (!existsSync(client)) return [];
  return readdirSync(client, { recursive: true })
    .map(String)
    .filter((chemin) => chemin.endsWith('.html') && chemin !== '404.html');
}

/** Construction attendue en échec : consigne le code, la sortie et les pages produites, sans jamais échouer. */
function batirEnEchec(arbre, dossier) {
  const astro = resoudreAstro(arbre);
  const resultat = spawnSync(globalThis.process.execPath, [astro, 'build'], {
    cwd: arbre,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const sortie = `${resultat.stdout ?? ''}${resultat.stderr ?? ''}${resultat.error ? String(resultat.error.message) : ''}`;
  writeFileSync(
    resolve(dossier, 'resultat.json'),
    JSON.stringify({ code: resultat.status, sortie, pagesProduites: pagesProduites(arbre) }),
  );
}

const JETABLE = resolve(RACINE, '.wrangler/site-jetable');
batir(
  preparerArbre(resolve(RACINE, 'tests/static/fixtures/site-jetable'), JETABLE),
  resolve(JETABLE, 'client'),
);
globalThis.console.log(`✔ site jetable bâti dans ${resolve(JETABLE, 'client')}`);

const AVEC_IMAGES = resolve(RACINE, '.wrangler/site-jetable-images');
batir(
  preparerArbre(resolve(RACINE, 'tests/static/fixtures/site-jetable-images'), AVEC_IMAGES, true),
  resolve(AVEC_IMAGES, 'client'),
);
globalThis.console.log(`✔ site jetable à images bâti dans ${resolve(AVEC_IMAGES, 'client')}`);

const IMAGE_MANQUANTE = resolve(RACINE, '.wrangler/site-jetable-image-manquante');
batirEnEchec(
  preparerArbre(resolve(RACINE, 'tests/static/fixtures/site-jetable-image-manquante'), IMAGE_MANQUANTE),
  IMAGE_MANQUANTE,
);
globalThis.console.log(`✔ construction à image manquante consignée dans ${resolve(IMAGE_MANQUANTE, 'resultat.json')}`);
