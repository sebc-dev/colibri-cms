#!/usr/bin/env node
/**
 * Outil de livraison — enveloppe mince (ADR-0034). La logique décidable vit
 * sous src/platform/instance/ ; ici, seuls les accès fichiers, reçus en
 * paramètre. Le geste `controler <dépôt>` ne fait aucune écriture.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { controlerLeDepot } from '../src/platform/instance/controle.ts';
import { creerLaBase } from '../src/platform/instance/plateforme-de-livraison.ts';

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
 * Point d'entrée en ligne de commande : `controler <dépôt>` ou `base <dépôt>`.
 * @param {string[]} argv
 * @param {Record<string, (...args: string[]) => unknown>} acces accès fichiers reçus en paramètre (seul « lire » est utilisé)
 * @param {{ log: (m: string) => void, error: (m: string) => void }} sortie
 */
export async function principal(argv, acces, sortie) {
  const [geste, depot] = argv;
  if ((geste !== 'controler' && geste !== 'base') || !depot) {
    sortie.error('usage : livraison.mjs controler|base <dépôt>');
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
    { lire: (chemin, enc) => readFile(chemin, enc), executer: lancerCommande },
    globalThis.console,
  );
}
