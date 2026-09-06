#!/usr/bin/env node
/**
 * Joue Stryker sur les SEULS fichiers de `src/` modifiés dans l'arbre de
 * travail — le check `mutation` de la quality gate (`.claude/quality.json`).
 *
 * Pourquoi ce détour existe : Stryker 9 n'a pas de `--since`, et le périmètre
 * configuré dans `stryker.conf.json` porte 310 mutants, soit ~37 minutes ici.
 * Un mutant coûte un `npm test` complet — donc un `astro build` complet, parce
 * que `wrangler.jsonc` fait porter les tests sur le worker BÂTI
 * (`.wrangler/test-worker/`) et non sur `src/` : sans ce rebuild dans le
 * sandbox, aucune mutation de la source n'atteindrait le code exercé.
 * C'est aussi ce qui interdit `coverageAnalysis` autre que `off`.
 *
 * L'oracle du diff est `git status --porcelain`, le même que
 * `crap-typescript --changed`, et pour la même raison : la gate est jouée en
 * phase 7½ de `/scd-spec-dev:run`, AVANT les commits du ticket.
 *
 * `--force` est délibéré. Le rapport incrémental de Stryker s'appuie sur le
 * hachage des tests pour invalider un résultat ; avec `testRunner: "command"`
 * il ne voit qu'un seul pseudo-test, donc un renforcement d'assertion ne
 * l'invaliderait pas. Rejouer les mutants du diff est le seul moyen que ce
 * check ne rende pas un vert périmé.
 */
import { spawnSync } from 'node:child_process';

// Le périmètre de `mutate` dans `stryker.conf.json` : la logique métier et la
// couche plateforme, jamais `src/admin/` (des îlots de vue) ni les `.d.ts`.
const PERIMETRE = /^src\/(core|platform)\/.*(?<!\.d)\.ts$/;

function fichiersModifies() {
  const git = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  if (git.status !== 0) {
    throw new Error(`git status a échoué : ${git.stderr?.trim() ?? 'raison inconnue'}`);
  }
  const chemins = [];
  for (const ligne of git.stdout.split('\n')) {
    if (ligne.length < 4) continue;
    const etat = ligne.slice(0, 2);
    // Un fichier supprimé n'a plus de source à muter.
    if (etat === ' D' || etat === 'D ') continue;
    // Un renommage s'écrit « R  ancien -> nouveau » : seul le nouveau existe.
    const chemin = ligne.slice(3).split(' -> ').at(-1).replace(/^"|"$/g, '');
    if (PERIMETRE.test(chemin)) chemins.push(chemin);
  }
  return [...new Set(chemins)];
}

// `globalThis.console` / `globalThis.process` plutôt que les identifiants nus :
// ce fichier n'est pas sous `**/*.ts`, la seule extension pour laquelle
// `eslint.config.js` déclare les globales Node — sinon `no-undef` (même raison
// que dans `preparer-worker-de-test.mjs`).
const cibles = fichiersModifies();

if (cibles.length === 0) {
  globalThis.console.log('Aucun fichier muté : rien de modifié sous src/core/ ni src/platform/.');
  globalThis.process.exit(0);
}

globalThis.console.log(`Mutation de ${cibles.length} fichier(s) modifié(s) :\n  ${cibles.join('\n  ')}`);

const stryker = spawnSync(
  'npx',
  ['stryker', 'run', '--force', '--mutate', cibles.join(',')],
  { stdio: 'inherit' },
);

globalThis.process.exit(stryker.status ?? 1);
