#!/usr/bin/env node
/**
 * Site factice de recette — le contenu versionné sous `recette/site-factice/`,
 * bâti et servi par le serveur de recette (skill `recette`).
 *
 * Le produit empaquette `content/pages/` à chemin figé (`import.meta.glob`,
 * `src/platform/contenu/pages.ts`) : on ne le paramètre pas. Chaque variante
 * se bâtit dans un arbre de travail JETABLE (`git worktree`, au HEAD courant)
 * dont `content/pages/` est remplacé — le dépôt de travail n'est jamais touché.
 *
 *   node .claude/skills/site-factice/scripts/site.mjs <commande> [options]
 *
 *   variantes                       liste les variantes et les cas qu'elles servent.
 *   images [--sortie <dossier>]     génère le jeu d'images (défaut .wrangler/recette/images).
 *   batir <variante>                compose la variante et la bâtit dans l'arbre jetable.
 *   deployer <variante> [--principal]
 *                                   bâtit puis publie : adresse d'aperçu `site-<variante>`,
 *                                   ou le serveur principal (variante `standard` seule).
 *   semer-bibliotheque --hote <h>   téléverse les images « bibliotheque » par la vraie
 *                                   route d'administration, avec une session de recette.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const SITE = 'recette/site-factice';
const ARBRE = resolve('.wrangler/recette/arbre');
const IMAGES = '.wrangler/recette/images';
const RECETTE = '.claude/skills/recette/scripts/recette.mjs';
const VARIANTE_PRINCIPALE = 'standard';

function echouer(message) {
  console.error(`✘ ${message}`);
  process.exit(1);
}

function lancer(commande, args, options = {}) {
  const resultat = spawnSync(commande, args, { stdio: 'inherit', ...options });
  if (resultat.status !== 0) echouer(`${commande} ${args.join(' ')} a échoué (code ${resultat.status}).`);
}

/** `standard` est la base elle-même ; les autres ne portent que ce qui change. */
function lireVariante(nom) {
  if (nom === VARIANTE_PRINCIPALE) {
    return { description: 'Les trois pages attendues par le cahier (§ 0.7) — la base.', cas: ['par défaut'] };
  }
  const chemin = `${SITE}/variantes/${nom}/variante.json`;
  if (!existsSync(chemin)) echouer(`variante inconnue : ${nom} (voir \`variantes\`).`);
  return JSON.parse(readFileSync(chemin, 'utf-8'));
}

function nomsDeVariantes() {
  return [VARIANTE_PRINCIPALE, ...readdirSync(`${SITE}/variantes`).sort()];
}

function variantes() {
  for (const nom of nomsDeVariantes()) {
    const v = lireVariante(nom);
    console.log(`${nom.padEnd(14)} ${v.cas.join(', ')}\n${''.padEnd(15)}${v.description}`);
  }
}

// --- Images ---------------------------------------------------------------

function echapperXml(texte) {
  return texte.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * Un aplat de couleur portant son nom en grand : l'ordre A, B, C se lit à l'œil.
 * Le libellé tient dans le carré central — les vignettes sont rognées au carré.
 */
async function genererImage({ format, largeur, hauteur, fond, texte, bruit, qualite }) {
  const image = bruit
    ? sharp({
        create: {
          width: largeur,
          height: hauteur,
          channels: 3,
          background: '#808080',
          noise: { type: 'gaussian', mean: 128, sigma: 90 },
        },
      })
    : sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">` +
            `<rect width="100%" height="100%" fill="${fond}"/>` +
            `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ` +
            `font-family="sans-serif" font-weight="bold" fill="#ffffff" ` +
            `font-size="${Math.round(Math.min(hauteur / 4, (Math.min(largeur, hauteur) * 1.4) / texte.length))}">${echapperXml(texte)}</text></svg>`,
        ),
      );
  const options = qualite ? { quality: qualite } : {};
  return image[format](options).toBuffer();
}

async function images(sortie) {
  const jeu = JSON.parse(readFileSync(`${SITE}/medias/jeu.json`, 'utf-8'));
  for (const groupe of ['cahier', 'bibliotheque']) {
    const dossier = `${sortie}/${groupe}`;
    mkdirSync(dossier, { recursive: true });
    const produits = new Map();
    for (const entree of jeu[groupe]) {
      let octets;
      if (entree.texte !== undefined) octets = Buffer.from(entree.texte);
      else if (entree.copieDe) octets = produits.get(entree.copieDe);
      else octets = await genererImage(entree.genere);
      if (!octets) echouer(`${entree.fichier} : ${entree.copieDe} doit le précéder dans jeu.json.`);
      if (entree.tronquerA) octets = octets.subarray(0, entree.tronquerA);
      if (entree.poidsMin && octets.length < entree.poidsMin) {
        echouer(`${entree.fichier} : ${octets.length} octets, il en faut au moins ${entree.poidsMin}.`);
      }
      produits.set(entree.fichier, octets);
      writeFileSync(`${dossier}/${entree.fichier}`, octets);
    }
    console.log(`✔ ${produits.size} fichiers dans ${dossier}/`);
  }
}

// --- Bâtir et déployer ----------------------------------------------------

function avertirSiCodeNonCommite() {
  const sale = execFileSync('git', ['status', '--porcelain', '--', 'src', 'migrations', 'astro.config.ts', 'package.json'], {
    encoding: 'utf-8',
  }).trim();
  if (sale) {
    console.warn('⚠ du code non commité ne sera PAS dans le build (l\'arbre jetable part du HEAD) :');
    console.warn(sale.replace(/^/gm, '    '));
  }
}

/** L'arbre jetable : recréé à chaque passe, au HEAD, `node_modules` partagé par lien. */
function preparerArbre() {
  if (existsSync(ARBRE)) {
    spawnSync('git', ['worktree', 'remove', '--force', ARBRE], { stdio: 'ignore' });
    rmSync(ARBRE, { recursive: true, force: true });
    spawnSync('git', ['worktree', 'prune'], { stdio: 'ignore' });
  }
  mkdirSync(resolve(ARBRE, '..'), { recursive: true });
  lancer('git', ['worktree', 'add', '--detach', '--quiet', ARBRE, 'HEAD']);
  symlinkSync(resolve('node_modules'), `${ARBRE}/node_modules`, 'dir');
}

/** La base, puis les fichiers de la variante par-dessus, puis ses retraits. */
function composer(nom) {
  const variante = lireVariante(nom);
  const cible = `${ARBRE}/content/pages`;
  rmSync(cible, { recursive: true, force: true });
  mkdirSync(cible, { recursive: true });
  cpSync(`${SITE}/pages`, cible, { recursive: true });
  const surcouche = `${SITE}/variantes/${nom}/pages`;
  if (existsSync(surcouche)) cpSync(surcouche, cible, { recursive: true });
  for (const slug of variante.retirer ?? []) rmSync(`${cible}/${slug}`, { recursive: true, force: true });
  for (const id of variante.retirerFormulaires ?? []) {
    rmSync(`${ARBRE}/content/formulaires/${id}`, { recursive: true, force: true });
  }
  const pages = readdirSync(cible);
  console.log(`→ variante ${nom} : ${pages.length ? pages.join(', ') : 'aucune page'}`);
}

function batir(nom) {
  lireVariante(nom);
  avertirSiCodeNonCommite();
  preparerArbre();
  composer(nom);
  lancer('node', [RECETTE, 'instance', '--racine', ARBRE]);
  lancer('npm', ['run', 'build'], { cwd: ARBRE });
}

function deployer(nom, principal) {
  if (principal && nom !== VARIANTE_PRINCIPALE) {
    echouer(`seule la variante ${VARIANTE_PRINCIPALE} va sur le serveur principal ; ${nom} passe par une adresse d'aperçu.`);
  }
  batir(nom);
  const args = [RECETTE, 'deployer', '--racine', ARBRE];
  lancer('node', principal ? [...args, '--principal'] : [...args, '--alias', `site-${nom}`]);
}

// --- Semer la bibliothèque ------------------------------------------------

async function semerBibliotheque(hote) {
  if (!hote) echouer('--hote attendu (le nom d\'hôte du serveur à semer).');
  await images(IMAGES);
  lancer('node', [RECETTE, 'session', '--hote', hote], { stdio: ['ignore', 'ignore', 'inherit'] });
  const etat = JSON.parse(readFileSync(`.wrangler/recette/etat-${hote}.json`, 'utf-8'));
  const cookie = `${etat.cookies[0].name}=${etat.cookies[0].value}`;
  const jeu = JSON.parse(readFileSync(`${SITE}/medias/jeu.json`, 'utf-8'));
  for (const { fichier } of jeu.bibliotheque) {
    const corps = new FormData();
    corps.set('fichier', new Blob([readFileSync(`${IMAGES}/bibliotheque/${fichier}`)]), fichier);
    const reponse = await fetch(`https://${hote}/admin/medias/televerser`, {
      method: 'POST',
      headers: { cookie, origin: `https://${hote}` },
      body: corps,
    });
    const texte = await reponse.text();
    if (reponse.status !== 201) echouer(`${fichier} : ${reponse.status} ${texte}`);
    console.log(`✔ ${fichier} → ${JSON.parse(texte).id}`);
  }
}

// --------------------------------------------------------------------------

const [commande, ...args] = process.argv.slice(2);
const variante = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? VARIANTE_PRINCIPALE;
const option = (nom) => {
  const i = args.indexOf(nom);
  return i === -1 ? undefined : args[i + 1];
};

switch (commande) {
  case 'variantes':
    variantes();
    break;
  case 'images':
    await images(option('--sortie') ?? IMAGES);
    break;
  case 'batir':
    batir(variante);
    break;
  case 'deployer':
    deployer(variante, args.includes('--principal'));
    break;
  case 'semer-bibliotheque':
    await semerBibliotheque(option('--hote'));
    break;
  default:
    echouer('commande attendue : variantes | images | batir | deployer | semer-bibliotheque');
}
