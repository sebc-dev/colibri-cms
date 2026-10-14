#!/usr/bin/env node
/**
 * Serveur de recette ColibriCMS sur Cloudflare — au plus près de la production :
 * l'artefact bâti (`npm run build`), une vraie D1 distante, la vraie liaison
 * `send_email`, servi en HTTPS sur un domaine du compte de l'opérateur.
 *
 * Rien de ceci n'entre dans le produit : la configuration de déploiement est
 * DÉRIVÉE, à chaque passe, de celle que l'adaptateur Astro écrit dans
 * `dist/server/wrangler.json` (mêmes liaisons, ADR-0020), puis surchargée par
 * les réglages locaux de `.env.recette` (hors dépôt). `wrangler.jsonc` et
 * `wrangler.astro.jsonc` ne sont jamais touchés.
 *
 *   node .claude/skills/recette/scripts/recette.mjs <commande> [options]
 *
 *   deployer [--principal] [--alias <nom>] [--racine <dossier>]
 *                           migre la base puis publie le build courant :
 *                           --principal, ou `main` sans --alias → le serveur
 *                           principal ; sinon → une adresse d'aperçu au nom de
 *                           --alias, à défaut de la branche. --racine : build
 *                           fait ailleurs.
 *   instance [--racine <d>] écrit dans le fichier d'instance du build (`instance.json`)
 *                           le domaine et l'adresse d'expéditeur de la recette
 *                           (`RECETTE_EXPEDITEUR`, sinon `code@<RECETTE_DOMAINE>`).
 *                           À jouer AVANT `npm run build` : le fichier est lu au build.
 *   semer                   inscrit l'adresse autorisée (idempotent).
 *   raz                     vide codes, sessions, brouillons et médias, puis resème.
 *   session [--hote <h>]    ouvre une session sans passer par l'e-mail ; écrit
 *                           l'état de stockage Playwright et imprime le cookie.
 *   sql "<requête>"         joue une requête sur la base de recette (JSON en sortie).
 *   journal                 suit les journaux du serveur (wrangler tail), jusqu'à Ctrl+C.
 *   secret-depot            pose JETON_DEPOT (clé du dépôt de recette, tapée par l'humain
 *                           à l'invite masquée de wrangler, dans un terminal ; jamais en
 *                           argument ni par un tube) comme secret du Worker de recette.
 *   chrono <url> <texte> [--bornes-min <n>]
 *                           interroge une page publique jusqu'à ce qu'elle contienne le
 *                           texte ; imprime la durée écoulée (SC-004 : < 5 min).
 *   depot <clone>           compose le dépôt de recette (`RECETTE_DEPOT`) dans un clone
 *                           local : le produit au HEAD, le site factice (premier remplissage
 *                           seulement, ensuite `content/` publié est gardé), l'instance et la
 *                           configuration wrangler du compte de recette, la branche `media`
 *                           si le dépôt n'en a pas. Commite localement ; n'envoie rien.
 *   adresses                imprime les adresses du serveur principal et de la branche.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FICHIER_REGLAGES = '.env.recette';
// `--racine <dossier>` : un build fait ailleurs que dans le dépôt (le skill
// `site-factice` bâtit dans un arbre de travail jetable). Défaut : le dépôt.
let RACINE = '.';
const configBatie = () => `${RACINE}/dist/server/wrangler.json`;
const configRecette = () => `${RACINE}/dist/server/wrangler.recette.json`;
const DOSSIER_ETAT = '.wrangler/recette';
const COOKIE_SESSION = '__Host-session';
// Un nom d'hôte d'aperçu est `<alias>-<worker>.<sous-domaine>.workers.dev` ;
// l'étiquette `<alias>-<worker>` ne dépasse pas 63 signes (DNS).
const ETIQUETTE_DNS_MAX = 63;

function echouer(message) {
  console.error(`✘ ${message}`);
  process.exit(1);
}

function lireReglages() {
  if (!existsSync(FICHIER_REGLAGES)) {
    echouer(`${FICHIER_REGLAGES} absent — voir .claude/skills/recette/SKILL.md § Première installation.`);
  }
  const reglages = {};
  for (const ligne of readFileSync(FICHIER_REGLAGES, 'utf-8').split('\n')) {
    const propre = ligne.trim();
    if (!propre || propre.startsWith('#')) continue;
    const egal = propre.indexOf('=');
    reglages[propre.slice(0, egal).trim()] = propre.slice(egal + 1).trim();
  }
  for (const cle of ['RECETTE_COMPTE', 'RECETTE_WORKER', 'RECETTE_BASE', 'RECETTE_BASE_ID', 'RECETTE_DOMAINE', 'RECETTE_ADRESSE']) {
    if (!reglages[cle]) echouer(`${FICHIER_REGLAGES} : ${cle} manquant.`);
  }
  return reglages;
}

function brancheCourante() {
  return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf-8' }).trim();
}

function aliasDeBranche(branche, worker) {
  const max = ETIQUETTE_DNS_MAX - worker.length - 1;
  return branche
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

function wrangler(reglages, args, { capturer = false } = {}) {
  const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: reglages.RECETTE_COMPTE };
  const resultat = spawnSync('npx', ['wrangler', ...args], {
    env,
    encoding: 'utf-8',
    stdio: capturer ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (resultat.status !== 0) {
    if (capturer) console.error(resultat.stdout, resultat.stderr);
    echouer(`wrangler ${args.slice(0, 2).join(' ')} a échoué (code ${resultat.status}).`);
  }
  return resultat.stdout ?? '';
}

/**
 * Dérive la configuration de recette de celle que l'adaptateur a écrite au
 * build : seuls le nom, la base, la destination d'e-mail et l'exposition
 * changent — les liaisons restent celles du produit.
 */
function ecrireConfigRecette(reglages) {
  if (!existsSync(configBatie())) {
    echouer(`${configBatie()} absent : lancer \`npm run typecheck && npm run build\` d'abord.`);
  }
  const config = JSON.parse(readFileSync(configBatie(), 'utf-8'));
  delete config.configPath;
  delete config.userConfigPath;
  delete config.topLevelName;
  appliquerCompteDeRecette(config, reglages);
  writeFileSync(configRecette(), `${JSON.stringify(config, null, 2)}\n`);
}

/** Le Worker, la base, la destination d'e-mail et l'exposition du compte de recette. */
function appliquerCompteDeRecette(config, reglages) {
  config.name = reglages.RECETTE_WORKER;
  config.workers_dev = true;
  config.preview_urls = true;
  config.routes = [{ pattern: reglages.RECETTE_DOMAINE, custom_domain: true }];
  config.d1_databases = config.d1_databases.map((base) => ({
    ...base,
    database_name: reglages.RECETTE_BASE,
    database_id: reglages.RECETTE_BASE_ID,
  }));
  config.send_email = config.send_email.map((liaison) => ({
    ...liaison,
    destination_address: reglages.RECETTE_ADRESSE,
  }));
}

function sql(reglages, requete) {
  const sortie = wrangler(
    reglages,
    ['d1', 'execute', 'DB', '--remote', '--json', '--config', configRecette(), '--command', requete],
    { capturer: true },
  );
  return JSON.parse(sortie.slice(sortie.indexOf('[')));
}

function semer(reglages) {
  const adresse = reglages.RECETTE_ADRESSE.replaceAll("'", "''");
  sql(
    reglages,
    `insert into adresses_autorisees (adresse) select '${adresse}' where not exists (select 1 from adresses_autorisees where adresse = '${adresse}');`,
  );
  console.log(`✔ adresse autorisée : ${reglages.RECETTE_ADRESSE}`);
}

/**
 * Le fichier d'instance est lu au build (I10) : l'expéditeur du serveur de
 * recette y est posé avant de bâtir, jamais dans wrangler.jsonc ni
 * wrangler.astro.jsonc. L'acheminement d'e-mail doit être activé sur le
 * domaine de cette adresse, dans le compte de recette (geste humain).
 */
function ecrireInstance(reglages, depotDePublication) {
  const chemin = `${RACINE}/instance.json`;
  const instance = JSON.parse(readFileSync(chemin, 'utf-8'));
  instance.domain = reglages.RECETTE_DOMAINE;
  instance.senderAddress = reglages.RECETTE_EXPEDITEUR || `code@${reglages.RECETTE_DOMAINE}`;
  if (depotDePublication) instance.depotDePublication = depotDePublication;
  writeFileSync(chemin, `${JSON.stringify(instance, null, 2)}\n`);
  console.log(`✔ ${chemin} : domain ${instance.domain}, senderAddress ${instance.senderAddress}${depotDePublication ? `, depotDePublication ${depotDePublication}` : ''}`);
  if (RACINE === '.') {
    console.log('⚠ instance.json du dépôt modifié : le restaurer par « git checkout instance.json » avant tout commit, même si une étape échoue.');
  }
}

function deployer(reglages, principal, aliasImpose) {
  ecrireConfigRecette(reglages);
  const branche = brancheCourante();
  // Un alias imposé (les variantes du site factice) vise toujours un aperçu,
  // même depuis `main` : sans cela, chaque variante écraserait le principal.
  const versPrincipal = principal || (branche === 'main' && !aliasImpose);

  console.log('→ migrations de la base de recette');
  wrangler(reglages, ['d1', 'migrations', 'apply', 'DB', '--remote', '--config', configRecette()]);
  semer(reglages);

  if (versPrincipal) {
    console.log(`→ publication du serveur principal (branche ${branche})`);
    wrangler(reglages, ['deploy', '--config', configRecette()]);
    console.log(`✔ https://${reglages.RECETTE_DOMAINE}/admin/`);
    return;
  }
  const alias = aliasDeBranche(aliasImpose ?? branche, reglages.RECETTE_WORKER);
  console.log(`→ aperçu de la branche ${branche} (alias ${alias})`);
  const sortie = wrangler(
    reglages,
    ['versions', 'upload', '--config', configRecette(), '--preview-alias', alias, '--message', `recette ${branche}`],
    { capturer: true },
  );
  process.stdout.write(sortie);
  const url = sortie.match(/https:\/\/\S*workers\.dev/g)?.find((u) => u.includes(alias));
  if (url) console.log(`✔ ${url}/admin/`);
}

/**
 * Même liste que le § 0.6 du cahier de test : une migration qui ajoute une
 * table de brouillon l'ajoute aux deux, sinon une recette part d'un état
 * déjà marqué « Brouillon ».
 */
function raz(reglages) {
  ecrireConfigRecette(reglages);
  sql(
    reglages,
    'delete from codes_connexion; delete from sessions; delete from brouillons_emplacements; delete from medias; delete from brouillons_reglages; delete from brouillons_formulaires;',
  );
  console.log('✔ codes, sessions, brouillons et médias vidés');
  semer(reglages);
}

/**
 * Une session est opaque en base (migration 0003) : sa ligne SUFFIT à ouvrir
 * l'administration. Le cookie est posé sans Domain (préfixe `__Host-`), donc
 * propre à UN nom d'hôte — d'où `--hote` pour une adresse d'aperçu.
 */
function session(reglages, hote) {
  ecrireConfigRecette(reglages);
  const jeton = randomBytes(32).toString('base64url');
  sql(
    reglages,
    `insert into sessions (id, identifiant_appareil, creee_le) values ('${jeton}', 'recette-${randomUUID()}', ${Date.now()});`,
  );
  const cookie = {
    name: COOKIE_SESSION,
    value: jeton,
    domain: hote,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  };
  mkdirSync(DOSSIER_ETAT, { recursive: true });
  const chemin = `${DOSSIER_ETAT}/etat-${hote}.json`;
  writeFileSync(chemin, `${JSON.stringify({ cookies: [cookie], origins: [] }, null, 2)}\n`);
  console.log(`✔ session ouverte pour https://${hote}/admin/`);
  console.log(`  état de stockage Playwright : ${chemin}`);
  console.log(`  cookie : ${JSON.stringify(cookie)}`);
}

function adresses(reglages) {
  const branche = brancheCourante();
  console.log(`serveur principal : https://${reglages.RECETTE_DOMAINE}/admin/`);
  if (branche !== 'main') {
    console.log(`alias de la branche ${branche} : ${aliasDeBranche(branche, reglages.RECETTE_WORKER)}`);
    console.log('  (l\'adresse complète est imprimée par `deployer`)');
  }
}

function secretDepot(reglages) {
  if (!process.stdin.isTTY) echouer('secret-depot se joue dans un terminal interactif, par l\'humain : la clé se tape à l\'invite masquée de wrangler, jamais par un tube ni dans une conversation.');
  ecrireConfigRecette(reglages);
  const resultat = spawnSync('npx', ['wrangler', 'secret', 'put', 'JETON_DEPOT', '--config', configRecette()], {
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: reglages.RECETTE_COMPTE },
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  if (resultat.status !== 0) echouer(`wrangler secret put a échoué (code ${resultat.status}).`);
  console.log('✔ JETON_DEPOT posé sur le Worker de recette (clé du compte de recette, jamais dans le dépôt produit).');
}

function decoderEntites(html) {
  return html.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    const m = e.toLowerCase();
    if (m.startsWith('#x')) return String.fromCodePoint(parseInt(m.slice(2), 16));
    if (m.startsWith('#')) return String.fromCodePoint(parseInt(m.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[m];
  });
}

async function chrono(url, texte, minutesMax) {
  if (!url || !texte) echouer('usage : chrono <url> <texte> [--bornes-min <n>]');
  let adresse;
  try {
    adresse = new URL(url);
  } catch {
    adresse = null;
  }
  if (!adresse || (adresse.protocol !== 'https:' && adresse.protocol !== 'http:')) {
    echouer(`URL invalide « ${url} » ; usage : chrono <url> <texte> [--bornes-min <n>]`);
  }
  const releve = () =>
    fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  try {
    const premier = await releve();
    if (premier.ok && decoderEntites(await premier.text()).includes(texte)) {
      echouer(`« ${texte} » est déjà sur ${url} : choisir un texte neuf.`);
    }
  } catch {
    // premier relevé impossible : on passe à la boucle
  }
  const debut = Date.now();
  const limite = debut + minutesMax * 60_000;
  let derniereCause = 'aucun relevé';
  while (Date.now() < limite) {
    try {
      const reponse = await releve();
      if (!reponse.ok) {
        derniereCause = `HTTP ${reponse.status}`;
      } else if (decoderEntites(await reponse.text()).includes(texte)) {
        const secondes = Math.round((Date.now() - debut) / 1000);
        console.log(`✔ « ${texte} » en ligne sur ${url} après ${secondes} s (${secondes < 300 ? 'sous' : 'AU-DELÀ DE'} 5 min).`);
        return;
      } else {
        derniereCause = 'page servie sans le texte';
      }
    } catch (erreur) {
      derniereCause = `${erreur.message}${erreur.cause?.code ? ` (${erreur.cause.code})` : ''}`;
    }
    await new Promise((fin) => setTimeout(fin, 5_000));
  }
  echouer(`« ${texte} » absent de ${url} après ${minutesMax} min — dernière cause : ${derniereCause}.`);
}

function git(args, { capturer = false } = {}) {
  const resultat = spawnSync('git', args, { encoding: 'utf-8', stdio: capturer ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  if (resultat.status !== 0) echouer(`git ${args.join(' ')} a échoué (code ${resultat.status}).${capturer ? `\n${resultat.stderr}` : ''}`);
  return resultat.stdout ?? '';
}

const reussit = (args) => spawnSync('git', args, { stdio: 'ignore' }).status === 0;

/**
 * Geste 1 du § Publication réelle : le dépôt de recette porte les sources du
 * produit, le site factice et, seul de tous les dépôts, les identifiants du
 * compte de recette (configuration wrangler, `depotDePublication`). Les
 * fichiers wrangler n'ont que des commentaires en ligne entière : ils se
 * relisent en JSON une fois ces lignes retirées.
 */
function depot(reglages, dossier) {
  const nomDepot = reglages.RECETTE_DEPOT;
  if (!/^[\w.-]+\/[\w.-]+$/.test(nomDepot ?? '')) {
    echouer(`${FICHIER_REGLAGES} : RECETTE_DEPOT=<propriétaire>/<dépôt> manquant ou mal formé.`);
  }
  if (!dossier) echouer('usage : depot <clone du dépôt de recette>');
  const cible = resolve(dossier);
  const produit = resolve('.');
  if (cible === produit || cible.startsWith(`${produit}/`)) echouer('le clone du dépôt de recette vit hors du dépôt produit.');
  const origine = spawnSync('git', ['-C', cible, 'remote', 'get-url', 'origin'], { encoding: 'utf-8' });
  const url = origine.status === 0 ? origine.stdout.trim().replace(/\.git$/, '') : '';
  if (!url.endsWith(`/${nomDepot}`) && !url.endsWith(`:${nomDepot}`)) {
    echouer(`${dossier} n'est pas un clone de ${nomDepot} : git clone git@github.com:${nomDepot}.git ${dossier}`);
  }
  const sale = git(['status', '--porcelain', '--', 'src', 'migrations', 'content', 'astro.config.ts', 'package.json'], { capturer: true }).trim();
  if (sale) console.warn(`⚠ du code non commité ne sera PAS dans le dépôt de recette (il part du HEAD) :\n${sale.replace(/^/gm, '    ')}`);

  for (const entree of readdirSync(cible)) if (entree !== '.git') rmSync(`${cible}/${entree}`, { recursive: true, force: true });
  const extraction = spawnSync('sh', ['-c', 'git archive --format=tar HEAD | tar -x -C "$1"', 'sh', cible], { stdio: 'inherit' });
  if (extraction.status !== 0) echouer(`extraction du HEAD vers ${dossier} échouée (code ${extraction.status}).`);
  // Aucune action GitHub ne tourne dans le dépôt de recette.
  rmSync(`${cible}/.github`, { recursive: true, force: true });
  // Le site factice n'est posé qu'au premier remplissage : ensuite, `content/` appartient à la
  // publication (dont `content/publication.json`, sa marque) et revient tel que le dépôt le porte.
  const dejaRempli = reussit(['-C', cible, 'rev-parse', '--verify', '--quiet', 'HEAD']);
  if (dejaRempli) {
    rmSync(`${cible}/content`, { recursive: true, force: true });
    git(['-C', cible, 'restore', '--source=HEAD', '--staged', '--worktree', '--', 'content']);
  } else {
    rmSync(`${cible}/content/pages`, { recursive: true, force: true });
    cpSync('recette/site-factice/pages', `${cible}/content/pages`, { recursive: true });
  }
  const contenu = dejaRempli ? 'contenu publié gardé' : 'site factice';

  RACINE = cible;
  ecrireInstance(reglages, nomDepot);
  for (const fichier of ['wrangler.jsonc', 'wrangler.astro.jsonc']) {
    const chemin = `${cible}/${fichier}`;
    const sansCommentaires = readFileSync(chemin, 'utf-8').split('\n').filter((ligne) => !/^\s*\/\//.test(ligne)).join('\n');
    let config;
    try {
      config = JSON.parse(sansCommentaires);
    } catch (erreur) {
      echouer(`${fichier} ne se relit pas en JSON une fois ses lignes de commentaire retirées : ${erreur.message}`);
    }
    appliquerCompteDeRecette(config, reglages);
    writeFileSync(chemin, `// Compte de recette, écrit par recette.mjs depot : jamais dans le dépôt produit.\n${JSON.stringify(config, null, 2)}\n`);
  }

  const sha = git(['rev-parse', '--short', 'HEAD'], { capturer: true }).trim();
  git(['-C', cible, 'add', '--all']);
  if (reussit(['-C', cible, 'diff', '--cached', '--quiet'])) {
    console.log(`✔ ${dossier} déjà composé depuis ${sha} : rien à commiter.`);
  } else {
    git(['-C', cible, 'commit', '--quiet', '-m', `recette : ColibriCMS ${sha}, ${contenu}`]);
    console.log(`✔ ${dossier} : ColibriCMS ${sha}, ${contenu}, instance et configuration du compte de recette commités.`);
  }

  // La branche des images n'est posée qu'une fois : ensuite, c'est la publication qui l'écrit.
  const mediaPosee = reussit(['-C', cible, 'ls-remote', '--exit-code', '--heads', 'origin', 'media'])
    || reussit(['-C', cible, 'rev-parse', '--verify', '--quiet', 'refs/heads/media']);
  if (!mediaPosee) {
    const source = ['refs/remotes/origin/media', 'refs/heads/media'].find((ref) => reussit(['rev-parse', '--verify', '--quiet', ref]));
    if (!source) echouer('aucune branche media dans le dépôt produit : « git fetch origin media » d\'abord.');
    // La copie locale de `media` est superficielle (`--depth=1`, scripts/recuperer-images-publiees.mjs) :
    // git refuse d'en recopier l'historique, un commit neuf porte donc les mêmes images.
    const arbreMedia = `${cible}.media`;
    rmSync(arbreMedia, { recursive: true, force: true });
    git(['-C', cible, 'worktree', 'add', '--quiet', '--orphan', '-b', 'media', arbreMedia]);
    const images = spawnSync('sh', ['-c', 'git archive --format=tar "$2" medias | tar -x -C "$1"', 'sh', arbreMedia, source], { stdio: 'inherit' });
    if (images.status !== 0) echouer(`extraction des images de ${source} échouée (code ${images.status}).`);
    git(['-C', arbreMedia, 'add', '--all']);
    git(['-C', arbreMedia, 'commit', '--quiet', '-m', 'recette : images de démonstration publiées']);
    git(['-C', cible, 'worktree', 'remove', arbreMedia]);
    console.log(`✔ branche media posée depuis ${source}.`);
  }
  console.log(`  envoyer : git -C ${dossier} push -u origin HEAD:main`);
  if (!mediaPosee) console.log(`  puis    : git -C ${dossier} push origin media`);
}

const [commande, ...args] = process.argv.slice(2);
const reglages = lireReglages();

const option = (nom) => {
  const i = args.indexOf(nom);
  return i === -1 ? undefined : args[i + 1];
};
RACINE = option('--racine') ?? RACINE;

switch (commande) {
  case 'deployer':
    deployer(reglages, args.includes('--principal'), option('--alias'));
    break;
  case 'instance':
    ecrireInstance(reglages);
    break;
  case 'semer':
    ecrireConfigRecette(reglages);
    semer(reglages);
    break;
  case 'raz':
    raz(reglages);
    break;
  case 'session':
    session(reglages, option('--hote') ?? reglages.RECETTE_DOMAINE);
    break;
  case 'sql':
    ecrireConfigRecette(reglages);
    console.log(JSON.stringify(sql(reglages, args[0]), null, 2));
    break;
  case 'journal':
    ecrireConfigRecette(reglages);
    wrangler(reglages, ['tail', '--config', configRecette(), '--format', 'pretty']);
    break;
  case 'secret-depot':
    secretDepot(reglages);
    break;
  case 'chrono':
    await chrono(args[0], args[1], Number(option('--bornes-min') ?? 30));
    break;
  case 'depot':
    depot(reglages, args[0]);
    break;
  case 'adresses':
    adresses(reglages);
    break;
  default:
    echouer('commande attendue : deployer | instance | semer | raz | session | sql | journal | secret-depot | chrono | depot | adresses');
}
