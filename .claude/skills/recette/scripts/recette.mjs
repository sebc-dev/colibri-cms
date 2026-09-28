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
 *                           sur `main` (ou --principal) → le serveur principal ;
 *                           sinon → une adresse d'aperçu au nom de la branche
 *                           (ou de --alias). --racine : build fait ailleurs.
 *   semer                   inscrit l'adresse autorisée (idempotent).
 *   raz                     vide codes, sessions, brouillons et médias, puis resème.
 *   session [--hote <h>]    ouvre une session sans passer par l'e-mail ; écrit
 *                           l'état de stockage Playwright et imprime le cookie.
 *   sql "<requête>"         joue une requête sur la base de recette (JSON en sortie).
 *   journal                 suit les journaux du serveur (wrangler tail), jusqu'à Ctrl+C.
 *   adresses                imprime les adresses du serveur principal et de la branche.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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
  writeFileSync(configRecette(), `${JSON.stringify(config, null, 2)}\n`);
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

function deployer(reglages, principal, aliasImpose) {
  ecrireConfigRecette(reglages);
  const branche = brancheCourante();
  const versPrincipal = principal || branche === 'main';

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

function raz(reglages) {
  ecrireConfigRecette(reglages);
  sql(
    reglages,
    'delete from codes_connexion; delete from sessions; delete from brouillons_emplacements; delete from medias_brouillon;',
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
  case 'adresses':
    adresses(reglages);
    break;
  default:
    echouer('commande attendue : deployer | semer | raz | session | sql | journal | adresses');
}
