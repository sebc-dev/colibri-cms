#!/usr/bin/env node
/**
 * Outil de livraison — enveloppe mince (ADR-0034). La logique décidable vit
 * sous src/platform/instance/ ; ici, seuls les accès fichiers, reçus en
 * paramètre. Le geste `controler <dépôt>` ne fait aucune écriture.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync as lireSync, rmSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMAIL_FORME } from '../src/core/reglages/coordonnees.ts';
import { controlerLeDepot, controlerLesFichiersVersionnes } from '../src/platform/instance/controle.ts';
import { choisirLesImages, decider, identiteDeLaFiche, specificationsDExclusion } from '../src/platform/instance/depot-du-client.ts';
import { ENTREES_DECLAREES, composerLInventaire } from '../src/platform/instance/inventaire.ts';
import { lireLeFichierDInstance } from '../src/platform/instance/fichier-d-instance.ts';
import { creerLaBase, semerLaPremiereAdresse } from '../src/platform/instance/plateforme-de-livraison.ts';

/**
 * @param {string} depot chemin du dépôt contrôlé
 * @param {Record<string, (...args: string[]) => unknown>} acces accès fichiers reçus en paramètre (seul « lire » est utilisé)
 * @param {{ log: (m: string) => void, error: (m: string) => void }} [sortie]
 */
export async function controler(depot, acces, sortie, proscrits = []) {
  const lire = acces.lire;
  if (typeof lire !== 'function') throw new TypeError('accès fichiers : « lire » manquant');
  const refus = await controlerLeDepot(depot, lire);
  // Fichiers versionnés : listés par l'accès « lister » (git ls-files), lus un à un ; aucune écriture.
  if (typeof acces.lister === 'function') {
    const fichiers = [];
    for (const chemin of await acces.lister(depot)) {
      try {
        fichiers.push({ chemin, texte: String(await lire(`${depot}/${chemin}`, 'utf8')) });
      } catch (e) {
        // Seuls ENOENT (suivi mais supprimé) et EISDIR (sous-module, répertoire) n'ont rien à contrôler ;
        // tout autre échec est un refus : un fichier non lu ne doit pas passer pour propre.
        if (e?.code === 'ENOENT' || e?.code === 'EISDIR') continue;
        refus.push({ champ: chemin, motif: `illisible : le fichier n’a pas pu être contrôlé (${e?.code ?? 'erreur inconnue'})` });
      }
    }
    refus.push(...controlerLesFichiersVersionnes(fichiers, proscrits));
  }
  for (const r of refus) sortie?.error(`${r.champ} : ${r.motif}`);
  if (refus.length === 0) sortie?.log('Le fichier d’instance est prêt.');
  return { code: refus.length === 0 ? 0 : 1, refus };
}

/**
 * Geste `base <dépôt>` : crée la base `colibri` dans le compte du fichier d'instance.
 * @param {string} depot
 * @param {{ lire: import('../src/platform/instance/plateforme-de-livraison.ts').Lecteur, executer?: import('../src/platform/instance/plateforme-de-livraison.ts').Executeur }} acces « lire » et « executer » (commande, args, env)
 * @param {{ log: (m: string) => void, error: (m: string) => void }} [sortie]
 */
export async function base(depot, acces, sortie) {
  const { lire, executer } = acces;
  if (typeof lire !== 'function' || typeof executer !== 'function') {
    throw new TypeError('accès : « lire » et « executer » requis');
  }
  const r = await creerLaBase(depot, lire, executer);
  (r.code === 0 ? sortie?.log : sortie?.error)?.(r.message);
  return r;
}

/**
 * Geste `semer <dépôt> <adresse>` : inscrit la première adresse autorisée, une seule fois.
 * @param {string} depot
 * @param {string} adresse
 * @param {{ lire: import('../src/platform/instance/plateforme-de-livraison.ts').Lecteur, executer?: import('../src/platform/instance/plateforme-de-livraison.ts').Executeur }} acces
 * @param {{ log: (m: string) => void, error: (m: string) => void }} [sortie]
 */
export async function semer(depot, adresse, acces, sortie) {
  const { lire, executer } = acces;
  if (typeof lire !== 'function' || typeof executer !== 'function') {
    throw new TypeError('accès : « lire » et « executer » requis');
  }
  const r = await semerLaPremiereAdresse(depot, adresse, lire, executer);
  (r.code === 0 ? sortie?.log : sortie?.error)?.(r.message);
  return r;
}

/** Lit une sortie JSON de commande : liste de noms, ou `null` si la lecture est illisible. */
function nomsDe(stdout, cles) {
  let brut;
  try {
    brut = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (brut && typeof brut === 'object' && !Array.isArray(brut) && brut.success === false) return null;
  const liste = Array.isArray(brut) ? brut : Array.isArray(brut?.result) ? brut.result : null;
  if (liste === null) return null;
  const noms = [];
  for (const item of liste) {
    if (typeof item === 'string') noms.push(item);
    else if (item && typeof item === 'object') {
      let trouve = false;
      for (const cle of cles) {
        const v = cle.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), item);
        if (typeof v === 'string') {
          noms.push(v);
          trouve = true;
          break;
        }
      }
      if (!trouve) return null;
    }
  }
  return noms;
}

/**
 * Geste `inventaire <dépôt> <adresse du client>` : relève les noms (jamais les valeurs) et écrit
 * un fichier daté. L'adresse est celle du client sur le compte de la plateforme : elle seule
 * permet de le reconnaître parmi les membres, que la plateforme rend par leur adresse.
 * @param {string} depot
 * @param {string} adresseDuClient
 * @param {{ lire?: import('../src/platform/instance/plateforme-de-livraison.ts').Lecteur, executer?: import('../src/platform/instance/plateforme-de-livraison.ts').Executeur, ecrire?: (chemin: string, contenu: string) => Promise<void>, maintenant?: () => Date }} acces
 * @param {{ log: (m: string) => void, error: (m: string) => void }} [sortie]
 */
export async function inventaire(depot, adresseDuClient, acces, sortie) {
  const { lire, executer, ecrire } = acces;
  if (typeof lire !== 'function' || typeof executer !== 'function' || typeof ecrire !== 'function') {
    throw new TypeError('accès : « lire », « executer » et « ecrire » requis');
  }
  const clientDuCompte = String(adresseDuClient ?? '').trim();
  if (!EMAIL_FORME.test(clientDuCompte)) {
    sortie?.error("L'adresse du client n'est pas bien formée ; l'inventaire n'a pas été écrit.");
    return { code: 1 };
  }
  const jour = (acces.maintenant?.() ?? new Date()).toISOString().slice(0, 10);
  let valeurs;
  try {
    valeurs = lireLeFichierDInstance(String(await lire(`${depot}/instance.json`, 'utf8')));
  } catch (erreur) {
    sortie?.error(erreur instanceof Error ? erreur.message : String(erreur));
    return { code: 1 };
  }
  const { compteCloudflare, depotDePublication } = valeurs;
  if (!depotDePublication) {
    sortie?.error('instance.json : le champ depotDePublication est manquant.');
    return { code: 1 };
  }
  if (!compteCloudflare) {
    sortie?.error('instance.json : le champ compteCloudflare est manquant.');
    return { code: 1 };
  }
  const env = { CLOUDFLARE_ACCOUNT_ID: compteCloudflare };
  const secrets = await executer('wrangler', ['secret', 'list', '--format', 'json'], env);
  const bases = await executer('wrangler', ['d1', 'list', '--json'], env);
  const membres = await executer(
    'sh',
    [
      '-c',
      'curl -sS -f -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/members"',
    ],
    env,
  );
  const collaborateurs = await executer('gh', ['api', `repos/${depotDePublication}/collaborators`], {});
  const lectures = [
    ['secrets posés', secrets, ['name']],
    ['bases', bases, ['name']],
    ['membres du compte', membres, ['user.email', 'login']],
    ['collaborateurs du dépôt', collaborateurs, ['login']],
  ];
  const listes = [];
  for (const [nom, resultat, cles] of lectures) {
    const liste = resultat.code !== 0 ? null : nomsDe(resultat.stdout, cles);
    if (liste === null) {
      sortie?.error(
        `La lecture « ${nom} » a échoué ou est illisible ; vérifier la connexion ou la clé d'accès. L'inventaire n'a pas été écrit.`,
      );
      return { code: 1 };
    }
    listes.push(liste);
  }
  const [nomsSecrets, nomsBases, nomsMembres, nomsCollaborateurs] = listes;
  const client = String(depotDePublication).split('/')[0];
  const texte = composerLInventaire(
    ENTREES_DECLAREES,
    {
      secretsPoses: nomsSecrets,
      base: nomsBases.includes('colibri') ? 'colibri' : null,
      declencheur: null,
      domaine: valeurs.domain,
      client,
      clientDuCompte,
      membresDuCompte: nomsMembres,
      collaborateursDuDepot: nomsCollaborateurs,
      liaisons: ENTREES_DECLAREES.filter((e) => e.lieu.startsWith('liaison')).map((e) => e.nom),
    },
    jour,
  );
  const chemin = `${depot}/inventaire-${jour}.md`;
  await ecrire(chemin, texte);
  sortie?.log(`Inventaire écrit : ${chemin}`);
  return { code: 0, chemin };
}

/**
 * Geste `depot <dépôt> --version <étiquette> --instance <fichier>` : prépare, en local seulement
 * (rien n'est poussé), le clone du dépôt du client depuis une version du produit. Lancé depuis un
 * clone du produit (`produit`). Tout est composé dans des dossiers temporaires et vérifié AVANT
 * la première écriture dans le dépôt : un refus le laisse intact. Sur un dépôt déjà préparé,
 * le contenu du site et la branche des images ne sont pas touchés.
 * @param {string} cible clone local du dépôt du client
 * @param {{ version: string, instance: string, pagesDeDepart?: string, produit?: string }} options
 *   `pagesDeDepart` : dossier de pages qui remplace `content/pages/` au premier remplissage (recette)
 * @param {{ executer: import('../src/platform/instance/plateforme-de-livraison.ts').Executeur }} acces
 * @param {{ log: (m: string) => void, error: (m: string) => void }} [sortie]
 */
export async function preparerLeDepot(cible, options, acces, sortie) {
  const { executer } = acces;
  if (typeof executer !== 'function') throw new TypeError('accès : « executer » requis');
  const produit = resolve(options.produit ?? '.');
  const refuser = (message) => {
    sortie?.error(message);
    return { code: 1 };
  };
  const git = (dossier, args) => executer('git', ['-C', dossier, ...args], {});
  const succes = async (dossier, args) => (await git(dossier, args)).code === 0;

  // 1. Le fichier d'instance, par la lecture de la construction, avant toute autre chose.
  let texteInstance;
  try {
    texteInstance = lireSync(options.instance, 'utf8');
  } catch {
    return refuser(`${options.instance} : le fichier d'instance est illisible ; le dépôt n'a pas été modifié.`);
  }
  try {
    lireLeFichierDInstance(texteInstance);
  } catch (erreur) {
    return refuser(`${erreur instanceof Error ? erreur.message : String(erreur)} Le dépôt n'a pas été modifié.`);
  }

  // 2. La version et le dépôt.
  if (!(await succes(produit, ['rev-parse', '--verify', '--quiet', `${options.version}^{commit}`]))) {
    return refuser(`La version « ${options.version} » est introuvable dans le produit ; le dépôt n'a pas été modifié.`);
  }
  if (!existsSync(join(cible, '.git')) || !(await succes(cible, ['rev-parse', '--git-dir']))) {
    return refuser(`${cible} n'est pas un clone git ; le dépôt n'a pas été modifié.`);
  }
  const etat = await git(cible, ['status', '--porcelain', '--ignored=no']);
  if (etat.code !== 0 || etat.stdout.trim() !== '') {
    const chemins = etat.stdout.split('\n').filter(Boolean).map((l) => l.slice(3)).join(', ');
    return refuser(`${cible} porte des modifications non enregistrées : ${chemins} ; le dépôt n'a pas été modifié.`);
  }
  const aDejaUnCommit = await succes(cible, ['rev-parse', '--verify', '--quiet', 'HEAD']);
  let brancheDesImagesPosee =
    (await succes(cible, ['rev-parse', '--verify', '--quiet', 'refs/heads/media'])) ||
    (await succes(cible, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/media']));
  if (!brancheDesImagesPosee && (await succes(cible, ['remote', 'get-url', 'origin']))) {
    const distante = await git(cible, ['ls-remote', '--exit-code', '--heads', 'origin', 'media']);
    if (distante.code === 0) brancheDesImagesPosee = true;
    else if (distante.code !== 2) {
      return refuser(`La branche des images n'a pas pu être cherchée sur l'origine : ${distante.stderr.trim()} ; le dépôt n'a pas été modifié.`);
    }
  }
  const decision = decider({ aDejaUnCommit, brancheDesImagesPosee });

  // « node:os » n'existe pas dans workerd, où les tests chargent ce module : il n'est chargé qu'ici.
  const { tmpdir } = await import('node:os');
  const temporaire = mkdtempSync(join(tmpdir(), 'depot-du-client-'));
  try {
    // 3. La version, extraite à l'écart, sans les exclusions.
    const arbre = join(temporaire, 'arbre');
    mkdirSync(arbre);
    const extraction = await executer(
      'sh',
      ['-c', 'p="$1"; v="$2"; d="$3"; shift 3; git -C "$p" archive --format=tar -o "$d.tar" "$v" -- . "$@" && tar -x -f "$d.tar" -C "$d"', 'sh', produit, options.version, arbre, ...specificationsDExclusion()],
      {},
    );
    if (extraction.code !== 0) return refuser(`L'extraction de la version « ${options.version} » a échoué ; le dépôt n'a pas été modifié.`);

    // 4. Le contenu : de départ sur un dépôt vide, sinon celui du dépôt, tel quel.
    if (decision.contenu === 'garder') {
      rmSync(join(arbre, 'content'), { recursive: true, force: true });
      const reprise = await executer(
        'sh',
        ['-c', 'git -C "$1" archive --format=tar -o "$2.reprise.tar" HEAD content && tar -x -f "$2.reprise.tar" -C "$2"', 'sh', cible, arbre],
        {},
      );
      if (reprise.code !== 0) return refuser('Le contenu du dépôt n’a pas pu être repris ; le dépôt n’a pas été modifié.');
    } else if (options.pagesDeDepart) {
      rmSync(join(arbre, 'content/pages'), { recursive: true, force: true });
      cpSync(options.pagesDeDepart, join(arbre, 'content/pages'), { recursive: true });
    }
    writeFileSync(join(arbre, 'instance.json'), texteInstance);

    // 5. Les images que le contenu de départ désigne, vérifiées avant d'écrire.
    let images = null;
    if (decision.images === 'amorcer') {
      const dossierDesFiches = join(arbre, 'content/medias');
      const identites = existsSync(dossierDesFiches)
        ? readdirSync(dossierDesFiches)
            .filter((nom) => nom.endsWith('.json'))
            .map((nom) => identiteDeLaFiche(lireSync(join(dossierDesFiches, nom), 'utf8')))
            .filter((id) => id !== null)
        : [];
      const source = [];
      for (const reference of ['refs/remotes/origin/media', 'refs/heads/media']) {
        if (await succes(produit, ['rev-parse', '--verify', '--quiet', reference])) {
          source.push(reference);
          break;
        }
      }
      if (source.length === 0 && identites.length > 0) {
        return refuser('Aucune branche media dans le produit pour reprendre les images de départ ; le dépôt n’a pas été modifié.');
      }
      let retenues = [];
      if (source.length > 0) {
        const liste = await git(produit, ['ls-tree', '-r', '--name-only', source[0], '--', 'medias/']);
        const choix = choisirLesImages(identites, liste.stdout.split('\n').filter(Boolean));
        if (choix.manquantes.length > 0) {
          return refuser(`Images de départ introuvables dans le produit : ${choix.manquantes.join(', ')} ; le dépôt n'a pas été modifié.`);
        }
        retenues = choix.retenues;
      }
      const octets = join(temporaire, 'octets');
      mkdirSync(octets);
      if (retenues.length > 0) {
        const tire = await executer(
          'sh',
          ['-c', 'p="$1"; r="$2"; d="$3"; shift 3; git -C "$p" archive --format=tar -o "$d.tar" "$r" -- "$@" && tar -x -f "$d.tar" -C "$d"', 'sh', produit, source[0], octets, ...retenues],
          {},
        );
        if (tire.code !== 0) return refuser('Les images de départ n’ont pas pu être reprises ; le dépôt n’a pas été modifié.');
      }
      images = octets;
    }

    // 6. Écriture : tout est prêt, le dépôt reçoit l'arbre composé.
    const identite = (await git(cible, ['config', 'user.name'])).stdout.trim() === ''
      ? ['-c', 'user.name=Livraison ColibriCMS', '-c', 'user.email=livraison@colibri.invalid']
      : [];
    for (const entree of readdirSync(cible)) if (entree !== '.git') rmSync(join(cible, entree), { recursive: true, force: true });
    for (const entree of readdirSync(arbre)) cpSync(join(arbre, entree), join(cible, entree), { recursive: true });
    const ajout = await git(cible, ['add', '--all']);
    if (ajout.code !== 0) return refuser(`git add a échoué dans ${cible}.`);
    const commit = (dossier, message, ...en) => git(dossier, [...identite, 'commit', '--quiet', ...en, '-m', message]);
    if (await succes(cible, ['diff', '--cached', '--quiet'])) {
      sortie?.log(`${cible} est déjà préparé depuis ${options.version} : rien à enregistrer.`);
    } else {
      const fait = await commit(cible, `livraison : ColibriCMS ${options.version}, ${decision.contenu === 'depart' ? 'contenu de départ' : 'contenu du site gardé'}`);
      if (fait.code !== 0) return refuser(`git commit a échoué dans ${cible} : ${fait.stderr.trim()}`);
      sortie?.log(`${cible} : ColibriCMS ${options.version}, fichier d'instance posé.`);
    }

    // 7. La branche des images, amorcée une seule fois.
    if (images !== null) {
      const arbreDesImages = join(temporaire, 'branche-media');
      const ajoutee = await git(cible, ['worktree', 'add', '--quiet', '--orphan', '-b', 'media', arbreDesImages]);
      if (ajoutee.code !== 0) return refuser(`La branche des images n'a pas pu être créée : ${ajoutee.stderr.trim()}`);
      const avecImages = existsSync(join(images, 'medias'));
      if (avecImages) cpSync(join(images, 'medias'), join(arbreDesImages, 'medias'), { recursive: true });
      const ajoutImages = await git(arbreDesImages, ['add', '--all']);
      if (ajoutImages.code !== 0) {
        await git(cible, ['worktree', 'remove', '--force', arbreDesImages]);
        await git(cible, ['branch', '-D', 'media']);
        return refuser(`Les images de départ n'ont pas pu être ajoutées à la branche des images : ${ajoutImages.stderr.trim()}. Le commit principal est fait ; rejouer la même commande amorcera la branche des images.`);
      }
      const posee = await commit(arbreDesImages, 'livraison : images de départ', ...(avecImages ? [] : ['--allow-empty']));
      await git(cible, ['worktree', 'remove', '--force', arbreDesImages]);
      if (posee.code !== 0) return refuser(`git commit a échoué sur la branche des images : ${posee.stderr.trim()}`);
      sortie?.log('Branche des images posée avec les images du contenu de départ.');
    }
    sortie?.log(`À envoyer : git -C ${cible} push -u origin HEAD:main${images !== null ? ' puis git push origin media' : ''}`);
    return { code: 0 };
  } finally {
    rmSync(temporaire, { recursive: true, force: true });
  }
}

/** Lit `--version` et `--instance` du geste `depot` ; null (message écrit) si les arguments sont invalides. */
function lireLesOptionsDuDepot(argv, sortie) {
  const [, cible, ...reste] = argv;
  const valeur = (nom) => {
    const i = reste.indexOf(nom);
    const v = i === -1 ? undefined : reste[i + 1];
    return v === undefined || v.startsWith('--') ? undefined : v;
  };
  const version = valeur('--version');
  const instance = valeur('--instance');
  if (!cible || cible.startsWith('--') || !version || !instance) {
    sortie.error('usage : livraison.mjs depot <dépôt> --version <étiquette> --instance <fichier>');
    return null;
  }
  return { cible, version, instance };
}

/**
 * Lit `--proscrire a,b,…` du geste `controler` ; rend null (message écrit) si les arguments sont invalides.
 * @param {string[]} argv
 * @param {{ error: (m: string) => void }} sortie
 * @returns {string[] | null}
 */
function lireLesProscrits(argv, sortie) {
  const usage = 'usage : livraison.mjs controler <dépôt> [--proscrire a,b,…]';
  const [, depot, ...reste] = argv;
  if (depot.startsWith('--') || reste.some((j) => j.startsWith('--') && j !== '--proscrire')) {
    sortie.error(usage);
    return null;
  }
  const position = reste.indexOf('--proscrire');
  if (position === -1) return [];
  const valeur = reste[position + 1];
  const liste = valeur === undefined || valeur.startsWith('--') ? [] : valeur.split(',').map((p) => p.trim()).filter((p) => p !== '');
  if (liste.length === 0) {
    sortie.error('--proscrire attend une liste non vide : --proscrire a,b,…');
    return null;
  }
  return liste;
}

/**
 * Point d'entrée en ligne de commande : `controler <dépôt>`, `base <dépôt>`, `semer <dépôt> <adresse>`
 * ou `inventaire <dépôt> <adresse du client>`.
 * @param {string[]} argv
 * @param {Record<string, (...args: string[]) => unknown>} acces accès fichiers reçus en paramètre (seul « lire » est utilisé)
 * @param {{ log: (m: string) => void, error: (m: string) => void }} sortie
 */
export async function principal(argv, acces, sortie) {
  const [geste, depot, adresse] = argv;
  if (geste === 'semer') {
    if (!depot || adresse === undefined) {
      sortie.error('usage : livraison.mjs semer <dépôt> <adresse>');
      return 2;
    }
    return (await semer(depot, adresse, acces, sortie)).code;
  }
  if (geste === 'inventaire') {
    if (!depot || adresse === undefined) {
      sortie.error('usage : livraison.mjs inventaire <dépôt> <adresse du client>');
      return 2;
    }
    return (await inventaire(depot, adresse, acces, sortie)).code;
  }
  if (geste === 'depot') {
    const options = lireLesOptionsDuDepot(argv, sortie);
    if (options === null) return 2;
    return (await preparerLeDepot(options.cible, options, acces, sortie)).code;
  }
  if ((geste !== 'controler' && geste !== 'base') || !depot) {
    sortie.error('usage : livraison.mjs controler|base|semer|inventaire|depot <dépôt> [adresse | --proscrire a,b,…]');
    return 2;
  }
  if (geste === 'base') return (await base(depot, acces, sortie)).code;
  const proscrits = lireLesProscrits(argv, sortie);
  if (proscrits === null) return 2;
  return (await controler(depot, acces, sortie, proscrits)).code;
}

/** Fichiers versionnés du dépôt contrôlé (`git ls-files`), sans rien modifier. */
async function listerLesVersionnes(depot) {
  const r = await lancerCommande('git', ['-C', depot, 'ls-files', '-z'], {});
  if (r.code !== 0) throw new Error('git ls-files a échoué dans le dépôt contrôlé');
  return r.stdout.split('\0').filter((c) => c !== '');
}

/** Exécute une commande avec l'environnement courant surchargé par `env`. */
async function lancerCommande(commande, args, env) {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const enfant = spawn(commande, args, { env: { ...globalThis.process.env, ...env } });
    let stdout = '';
    let stderr = '';
    enfant.stdout.on('data', (d) => (stdout += d));
    enfant.stderr.on('data', (d) => (stderr += d));
    enfant.on('error', (e) => resolve({ code: 1, stdout, stderr: String(e.message) }));
    enfant.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

// `globalThis.*` : eslint.config.js ne déclare les globales Node que pour les `.ts`.
const lancement = globalThis.process.argv[1];
if (lancement && import.meta.url === pathToFileURL(lancement).href) {
  globalThis.process.exitCode = await principal(
    globalThis.process.argv.slice(2),
    { lire: (chemin, enc) => readFile(chemin, enc), lister: listerLesVersionnes, executer: lancerCommande, ecrire: (c, t) => writeFile(c, t, 'utf8') },
    globalThis.console,
  );
}
