#!/usr/bin/env node
/**
 * Outil de livraison — enveloppe mince (ADR-0034). La logique décidable vit
 * sous src/platform/instance/ ; ici, seuls les accès fichiers, reçus en
 * paramètre. Le geste `controler <dépôt>` ne fait aucune écriture.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { EMAIL_FORME } from '../src/core/reglages/coordonnees.ts';
import { controlerLeDepot } from '../src/platform/instance/controle.ts';
import { ENTREES_DECLAREES, composerLInventaire } from '../src/platform/instance/inventaire.ts';
import { lireLeFichierDInstance } from '../src/platform/instance/fichier-d-instance.ts';
import { creerLaBase, semerLaPremiereAdresse } from '../src/platform/instance/plateforme-de-livraison.ts';

/**
 * @param {string} depot chemin du dépôt contrôlé
 * @param {Record<string, (...args: string[]) => unknown>} acces accès fichiers reçus en paramètre (seul « lire » est utilisé)
 * @param {{ log: (m: string) => void, error: (m: string) => void }} [sortie]
 */
export async function controler(depot, acces, sortie) {
  const lire = acces.lire;
  if (typeof lire !== 'function') throw new TypeError('accès fichiers : « lire » manquant');
  const refus = await controlerLeDepot(depot, lire);
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
  if ((geste !== 'controler' && geste !== 'base') || !depot) {
    sortie.error('usage : livraison.mjs controler|base|semer|inventaire <dépôt> [adresse]');
    return 2;
  }
  if (geste === 'base') return (await base(depot, acces, sortie)).code;
  return (await controler(depot, acces, sortie)).code;
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
    { lire: (chemin, enc) => readFile(chemin, enc), executer: lancerCommande, ecrire: (c, t) => writeFile(c, t, 'utf8') },
    globalThis.console,
  );
}
