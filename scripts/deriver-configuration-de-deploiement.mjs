#!/usr/bin/env node
/**
 * Postbuild (ADR-0034) : réécrit `dist/server/wrangler.json` en configuration
 * de déploiement effective — domaine de l'instance, ni adresse par défaut ni
 * aperçus, base désignée par son nom. Les fichiers wrangler versionnés ne sont
 * jamais touchés. Joué à la suite de `preparer-worker-de-test.mjs --apres`.
 * Échoue bruyamment si la configuration bâtie est absente ou sans liaison DB.
 * Le fichier d'instance est lu par le seul module de lecture (I19).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lireInstanceDuDepot } from '../src/platform/instance/lecture-d-instance.ts';
import { deriverConfigurationDeDeploiement } from '../src/platform/instance/configuration-de-deploiement.ts';

const CONFIG_BATIE = 'dist/server/wrangler.json';

if (!existsSync(CONFIG_BATIE)) {
  throw new Error(`${CONFIG_BATIE} absent après la construction : rien à dériver.`);
}
const racine = pathToFileURL(`${globalThis.process.cwd()}/`);
const valeurs = lireInstanceDuDepot(racine);
const produite = JSON.parse(readFileSync(CONFIG_BATIE, 'utf-8'));
const effective = deriverConfigurationDeDeploiement(produite, valeurs);
writeFileSync(CONFIG_BATIE, `${JSON.stringify(effective, null, 2)}\n`);
globalThis.console.log(`✔ ${CONFIG_BATIE} : sert ${valeurs.domain}`);
