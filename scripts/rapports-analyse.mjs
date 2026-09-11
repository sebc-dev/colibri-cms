#!/usr/bin/env node
/**
 * `npm run check:agent` — la boucle COMPLÈTE d'analyse, rendue en JSON pour
 * qu'un agent la lise au lieu de se faire coller une sortie console dans son
 * contexte.
 *
 * Trois outils, trois rapports sous `reports/analyse/` (répertoire déjà ignoré
 * par `.gitignore`) :
 *   · `eslint.json` — la passe type-aware (`eslint.config.analyse.js`)
 *   · `jscpd/jscpd-report.json` — la duplication de `src/`
 *   · `knip.json` — le code et les dépendances que rien n'atteint
 *
 * Pourquoi un script plutôt qu'une chaîne de `&&` dans `package.json` : les
 * trois outils sortent en échec dès qu'ils ont quelque chose à dire, et une
 * chaîne s'arrêterait au premier — l'agent n'aurait qu'un tiers du tableau.
 * Ici, chacun est joué jusqu'au bout, et le script rend TOUJOURS 0 : il
 * produit un constat, il ne juge pas. Le verdict, c'est `npm run check`.
 *
 * Il imprime aussi un digest d'une vingtaine de lignes — règles les plus
 * remontées, fichiers les plus touchés — pour que la première décision (par
 * quoi commencer) se prenne sans ouvrir un seul JSON.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// `eslint.config.js` ne déclare aucune globale Node : un `console` nu y est
// `no-undef`. Même détour que `scripts/preparer-worker-de-test.mjs`, qui passe
// par `globalThis.process` — ici on les lie une fois pour toutes.
const { console, process } = globalThis;

const SORTIE = 'reports/analyse';
mkdirSync(join(SORTIE, 'jscpd'), { recursive: true });

/** Joue une commande sans jamais interrompre la série. */
function jouer(cmd, args, options = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: false, ...options });
}

function titre(texte) {
  console.log(`\n\x1b[1m${texte}\x1b[0m`);
}

// ── 1. ESLint type-aware ────────────────────────────────────────────────────
const cheminEslint = join(SORTIE, 'eslint.json');
jouer('npx', [
  'eslint',
  '.',
  '--config',
  'eslint.config.analyse.js',
  '--format',
  'json',
  '--output-file',
  cheminEslint,
]);

titre('analyse — eslint type-aware + sonarjs');
if (existsSync(cheminEslint)) {
  const rapport = JSON.parse(readFileSync(cheminEslint, 'utf8'));
  const parRegle = new Map();
  const parFichier = new Map();
  let total = 0;
  for (const fichier of rapport) {
    if (fichier.messages.length === 0) continue;
    const chemin = fichier.filePath.replace(`${process.cwd()}/`, '');
    parFichier.set(chemin, fichier.messages.length);
    total += fichier.messages.length;
    for (const message of fichier.messages) {
      const regle = message.ruleId ?? '(analyse)';
      parRegle.set(regle, (parRegle.get(regle) ?? 0) + 1);
    }
  }
  const top = (map, n) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  console.log(`${total} remontées — ${cheminEslint}`);
  for (const [regle, n] of top(parRegle, 8)) {
    console.log(`  ${String(n).padStart(4)}  ${regle}`);
  }
  if (parFichier.size > 0) {
    console.log('  fichiers les plus touchés :');
    for (const [chemin, n] of top(parFichier, 5)) {
      console.log(`  ${String(n).padStart(4)}  ${chemin}`);
    }
  }
} else {
  console.log('aucun rapport produit — la passe eslint n’a pas abouti');
}

// ── 2. jscpd (duplication) ──────────────────────────────────────────────────
jouer('npx', [
  'jscpd',
  'src',
  '--reporters',
  'json',
  '--output',
  join(SORTIE, 'jscpd'),
  '--silent',
]);

titre('duplication — jscpd');
const cheminJscpd = join(SORTIE, 'jscpd', 'jscpd-report.json');
if (existsSync(cheminJscpd)) {
  const rapport = JSON.parse(readFileSync(cheminJscpd, 'utf8'));
  const total = rapport.statistics?.total ?? {};
  const pourcentage =
    typeof total.percentage === 'number' ? total.percentage.toFixed(2) : '?';
  console.log(
    `${rapport.duplicates?.length ?? 0} clones — ${pourcentage} % des lignes (seuil 5, .jscpd.json) — ${cheminJscpd}`,
  );
  // `name` porte déjà « fichier:format », `start` est la ligne d'ouverture.
  for (const clone of (rapport.duplicates ?? []).slice(0, 5)) {
    console.log(
      `  ${clone.firstFile?.name} L${clone.firstFile?.start} ↔ ${clone.secondFile?.name} L${clone.secondFile?.start} (${clone.lines} lignes)`,
    );
  }
} else {
  console.log('aucun rapport produit — la passe jscpd n’a pas abouti');
}

// ── 3. knip (code mort) ─────────────────────────────────────────────────────
const knip = jouer('npx', ['knip', '--reporter', 'json', '--no-exit-code']);
const cheminKnip = join(SORTIE, 'knip.json');
writeFileSync(cheminKnip, knip.stdout ?? '');

titre('code mort — knip');
try {
  const rapport = JSON.parse(knip.stdout);
  const compte = new Map();
  for (const entree of rapport.issues ?? []) {
    for (const [categorie, valeurs] of Object.entries(entree)) {
      if (!Array.isArray(valeurs) || valeurs.length === 0) continue;
      compte.set(categorie, (compte.get(categorie) ?? 0) + valeurs.length);
    }
  }
  console.log(
    compte.size === 0
      ? `rien à signaler — ${cheminKnip}`
      : `${[...compte].map(([c, n]) => `${c}: ${n}`).join(', ')} — ${cheminKnip}`,
  );
} catch {
  console.log('aucun rapport produit — la passe knip n’a pas abouti');
}

console.log('');
