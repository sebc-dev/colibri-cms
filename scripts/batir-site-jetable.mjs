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
 * Cinq autres constructions suivent, chacune dans son répertoire
 * `.wrangler/` vidé à chaque passe :
 * - `site-jetable-images/` (fixture `site-jetable-images/`, avec ses octets
 *   copiés en `medias/`, ticket 06) : attendue en SUCCÈS, sortie copiée vers
 *   `client/` ;
 * - `site-jetable-image-irreductible/` (change 014, ticket 03, SC-03a) : images
 *   que `sharp` ne sait pas réduire (PNG tronqué, WebP animé, en-tête au-delà
 *   de la limite de pixels). Attendue en SUCCÈS, mais consignée dans
 *   `resultat.json` (code, sortie, pages produites) et sortie copiée vers
 *   `client/` : c'est le test qui juge ;
 * - `site-jetable-image-manquante/` (ticket 06) : attendue en ÉCHEC (image
 *   posée sans octets, SC-06f) ;
 * - `site-jetable-formulaire-inconnu/` et
 *   `site-jetable-formulaire-sans-coordonnee/` (change 012, ticket 04) :
 *   attendues en ÉCHEC (formulaire introuvable, SC-04a ; formulaire sans
 *   e-mail ni téléphone obligatoire, SC-04b).
 * Enfin, `depot-du-client/` (change 020, ticket 06) : le geste `depot` de
 * `scripts/livraison.mjs` est joué pour de vrai, avec git, depuis un produit
 * jetable (copie commitée et étiquetée de l'arbre courant) vers des clones
 * vides ou déjà préparés ; une construction réelle suit chaque dépôt préparé.
 * Tout est consigné dans `depot-du-client/resultat.json`, que le test juge.
 *
 * Une construction attendue en échec ne fait jamais échouer le script : le
 * code, la sortie et les pages produites vont dans `resultat.json`, que le
 * test juge.
 *
 * `globalThis.process` / `globalThis.console` plutôt que les identifiants
 * nus : `eslint.config.js` ne déclare les globales Node que pour `**\/*.ts`
 * (même raison que `scripts/preparer-worker-de-test.mjs`).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

/** Construction dont le test juge l'issue : comme `batirEnEchec`, et la sortie statique, si elle existe, est copiée vers `<dossier>/client/`. */
function batirEtConsigner(arbre, dossier) {
  batirEnEchec(arbre, dossier);
  const sortie = resolve(arbre, 'dist/client');
  if (existsSync(sortie)) cpSync(sortie, resolve(dossier, 'client'), { recursive: true });
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

const IRREDUCTIBLE = resolve(RACINE, '.wrangler/site-jetable-image-irreductible');
batirEtConsigner(
  preparerArbre(resolve(RACINE, 'tests/static/fixtures/site-jetable-image-irreductible'), IRREDUCTIBLE, true),
  IRREDUCTIBLE,
);
globalThis.console.log(`✔ construction à images irréductibles consignée dans ${resolve(IRREDUCTIBLE, 'resultat.json')}`);

const IMAGE_MANQUANTE = resolve(RACINE, '.wrangler/site-jetable-image-manquante');
batirEnEchec(
  preparerArbre(resolve(RACINE, 'tests/static/fixtures/site-jetable-image-manquante'), IMAGE_MANQUANTE),
  IMAGE_MANQUANTE,
);
globalThis.console.log(`✔ construction à image manquante consignée dans ${resolve(IMAGE_MANQUANTE, 'resultat.json')}`);

for (const cas of ['formulaire-inconnu', 'formulaire-sans-coordonnee']) {
  const dossier = resolve(RACINE, `.wrangler/site-jetable-${cas}`);
  batirEnEchec(preparerArbre(resolve(RACINE, `tests/static/fixtures/site-jetable-${cas}`), dossier), dossier);
  globalThis.console.log(`✔ construction « ${cas} » consignée dans ${resolve(dossier, 'resultat.json')}`);
}

// --- Change 020, ticket 06 : le geste `depot` de l'outil de livraison, joué pour de vrai. ---

const DEPOT_DU_CLIENT = resolve(RACINE, '.wrangler/depot-du-client');
const ETIQUETTE = 'v-jetable';

function git(dossier, args, options = {}) {
  const r = spawnSync('git', ['-C', dossier, ...args], { encoding: 'utf8', stdio: 'pipe', ...options });
  if (options.tolerer !== true && r.status !== 0) echouer(`git ${args.join(' ')} a échoué dans ${dossier} : ${r.stderr}`);
  return r;
}

const IDENTITE = ['-c', 'user.name=Jetable', '-c', 'user.email=jetable@colibri.invalid'];

/** Le produit jetable : l'arbre courant (suivi ou non, hors ignoré), commité, étiqueté, avec sa branche `media`. */
function composerLeProduitJetable(produit) {
  mkdirSync(produit, { recursive: true });
  git(produit, ['init', '--quiet', '--initial-branch=main']);
  const listes = spawnSync('git', ['-C', RACINE, 'ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' });
  if (listes.status !== 0) echouer(`git ls-files a échoué : ${listes.stderr}`);
  for (const chemin of listes.stdout.split('\0').filter(Boolean)) {
    const source = resolve(RACINE, chemin);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    mkdirSync(dirname(resolve(produit, chemin)), { recursive: true });
    cpSync(source, resolve(produit, chemin));
  }
  git(produit, ['add', '--all']);
  git(produit, [...IDENTITE, 'commit', '--quiet', '-m', 'produit jetable']);
  git(produit, ['tag', ETIQUETTE]);
  // La branche `media` du produit : les octets des images publiées (`./medias`), hors variantes.
  const octets = resolve(RACINE, 'medias');
  const arbreMedia = resolve(produit, '..', 'produit-media');
  git(produit, ['worktree', 'add', '--quiet', '--orphan', '-b', 'media', arbreMedia]);
  if (existsSync(octets)) {
    mkdirSync(resolve(arbreMedia, 'medias'));
    for (const nom of readdirSync(octets)) {
      if (statSync(resolve(octets, nom)).isFile()) cpSync(resolve(octets, nom), resolve(arbreMedia, 'medias', nom));
    }
  }
  git(arbreMedia, ['add', '--all']);
  git(arbreMedia, [...IDENTITE, 'commit', '--quiet', '--allow-empty', '-m', 'images du produit jetable']);
  git(produit, ['worktree', 'remove', '--force', arbreMedia]);
}

function ecrireUneInstance(chemin, domaine, supplement = {}) {
  const base = JSON.parse(readFileSync(resolve(RACINE, 'instance.json'), 'utf8'));
  writeFileSync(
    chemin,
    JSON.stringify({ ...base, domain: domaine, senderAddress: `code@${domaine}`, ...supplement }, null, 2),
  );
}

/** Joue `depot` depuis le produit jetable ; consigne code et sorties. */
function jouerLeGeste(produit, cible, instance) {
  const r = spawnSync(
    globalThis.process.execPath,
    [resolve(RACINE, 'scripts/livraison.mjs'), 'depot', cible, '--version', ETIQUETTE, '--instance', instance],
    { cwd: produit, encoding: 'utf8', stdio: 'pipe' },
  );
  return { code: r.status, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** L'identité de chaque fichier d'une référence (`chemin -> blob`), ou `null` si la référence n'existe pas. */
function empreintes(depot, reference) {
  const r = git(depot, ['ls-tree', '-r', reference], { tolerer: true });
  if (r.status !== 0) return null;
  return Object.fromEntries(
    r.stdout
      .split('\n')
      .filter(Boolean)
      .map((ligne) => {
        const [meta, chemin] = ligne.split('\t');
        return [chemin, meta.split(' ')[2]];
      }),
  );
}

function etatDuDepot(depot) {
  const sha = (reference) => {
    const r = git(depot, ['rev-parse', '--verify', '--quiet', reference], { tolerer: true });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  return {
    fichiers: empreintes(depot, 'HEAD'),
    images: empreintes(depot, 'media'),
    commitImages: sha('refs/heads/media'),
    contenu: sha('HEAD:content'),
    entreesALaRacine: readdirSync(depot).filter((nom) => nom !== '.git').sort(),
  };
}

/** Construit une copie du dépôt préparé, avec les octets de sa branche `media` ; consigne l'issue. */
function batirLeDepotPrepare(depot, dossier) {
  const arbre = resolve(dossier, 'arbre');
  rmSync(arbre, { recursive: true, force: true });
  mkdirSync(arbre, { recursive: true });
  for (const nom of readdirSync(depot)) {
    if (nom !== '.git') cpSync(resolve(depot, nom), resolve(arbre, nom), { recursive: true });
  }
  const images = empreintes(depot, 'media') ?? {};
  for (const chemin of Object.keys(images)) {
    const octets = spawnSync('git', ['-C', depot, 'show', `media:${chemin}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
    mkdirSync(dirname(resolve(arbre, chemin)), { recursive: true });
    writeFileSync(resolve(arbre, chemin), octets.stdout);
  }
  batirEnEchec(arbre, dossier);
  return JSON.parse(readFileSync(resolve(dossier, 'resultat.json'), 'utf8'));
}

function cloneVide(chemin) {
  mkdirSync(chemin, { recursive: true });
  git(chemin, ['init', '--quiet', '--initial-branch=main']);
}

rmSync(DEPOT_DU_CLIENT, { recursive: true, force: true });
const PRODUIT_JETABLE = resolve(DEPOT_DU_CLIENT, 'produit');
composerLeProduitJetable(PRODUIT_JETABLE);
const INSTANCES = resolve(DEPOT_DU_CLIENT, 'instances');
mkdirSync(INSTANCES, { recursive: true });
ecrireUneInstance(resolve(INSTANCES, 'a.json'), 'client-a.colibri.test');
ecrireUneInstance(resolve(INSTANCES, 'b.json'), 'client-b.colibri.test', { depotDePublication: 'client-b/site' });
ecrireUneInstance(resolve(INSTANCES, 'refusee.json'), 'client-c.colibri.test', { champInconnu: 'x' });

const consigne = { etiquette: ETIQUETTE, depots: {} };
for (const [nom, instance] of [['a', 'a.json'], ['b', 'b.json']]) {
  const dossier = resolve(DEPOT_DU_CLIENT, nom);
  const clone = resolve(dossier, 'depot');
  cloneVide(clone);
  const geste = jouerLeGeste(PRODUIT_JETABLE, clone, resolve(INSTANCES, instance));
  const etat = etatDuDepot(clone);
  consigne.depots[nom] = { geste, ...etat, construction: batirLeDepotPrepare(clone, dossier) };
}

// Rejeu : le dépôt `a` a changé de contenu et de branche des images ; même version rejouée.
{
  const clone = resolve(DEPOT_DU_CLIENT, 'a/depot');
  const page = resolve(clone, 'content/pages/accueil/page.json');
  writeFileSync(page, readFileSync(page, 'utf8').replace('"Accueil"', '"Accueil modifié par la publication"'));
  writeFileSync(resolve(clone, 'content/publication.json'), '{"marque":"publie"}\n');
  git(clone, ['add', '--all']);
  git(clone, [...IDENTITE, 'commit', '--quiet', '-m', 'publication']);
  git(clone, ['worktree', 'add', '--quiet', resolve(DEPOT_DU_CLIENT, 'a/images'), 'media']);
  mkdirSync(resolve(DEPOT_DU_CLIENT, 'a/images/medias'), { recursive: true });
  writeFileSync(resolve(DEPOT_DU_CLIENT, 'a/images/medias/publiee.png'), 'octets');
  git(resolve(DEPOT_DU_CLIENT, 'a/images'), ['add', '--all']);
  git(resolve(DEPOT_DU_CLIENT, 'a/images'), [...IDENTITE, 'commit', '--quiet', '-m', 'publication des images']);
  git(clone, ['worktree', 'remove', '--force', resolve(DEPOT_DU_CLIENT, 'a/images')]);
  const avant = etatDuDepot(clone);
  const geste = jouerLeGeste(PRODUIT_JETABLE, clone, resolve(INSTANCES, 'a.json'));
  const apres = etatDuDepot(clone);
  const propre = git(clone, ['status', '--porcelain']).stdout.trim() === '';
  consigne.rejeu = { avant, geste, apres, propre };
}

// Refus : un fichier d'instance que la construction refuserait, sur un dépôt vide.
{
  const clone = resolve(DEPOT_DU_CLIENT, 'refuse/depot');
  cloneVide(clone);
  const geste = jouerLeGeste(PRODUIT_JETABLE, clone, resolve(INSTANCES, 'refusee.json'));
  const aUnCommit = git(clone, ['rev-parse', '--verify', '--quiet', 'HEAD'], { tolerer: true }).status === 0;
  const aUneBrancheMedia = git(clone, ['rev-parse', '--verify', '--quiet', 'refs/heads/media'], { tolerer: true }).status === 0;
  consigne.refus = { geste, aUnCommit, aUneBrancheMedia, entreesALaRacine: readdirSync(clone).filter((n) => n !== '.git') };
}

writeFileSync(resolve(DEPOT_DU_CLIENT, 'resultat.json'), JSON.stringify(consigne));
globalThis.console.log(`✔ dépôts du client préparés et consignés dans ${resolve(DEPOT_DU_CLIENT, 'resultat.json')}`);
