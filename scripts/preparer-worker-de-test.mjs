#!/usr/bin/env node
/**
 * Synchronise `.wrangler/test-worker/` — une copie du worker bâti, à un
 * emplacement STABLE hors de `dist/` (vidé au début de chaque `astro
 * build`) — avec le contenu réel du dernier build. Sous `.wrangler/` : déjà
 * ignoré par `.gitignore` et par `eslint.config.js` (protégé, hors de
 * portée de ce lot) — nul besoin d'y ajouter une entrée pour ce détour de
 * test, et le lint n'analyse pas du code de sortie de build.
 *
 * Pourquoi ce détour existe (ticket 01 — la porte close, ADR-0003) :
 * `@cloudflare/vitest-pool-workers` (`SELF.fetch`) exige que
 * `poolOptions.workers.main` résolve un point d'entrée réel.
 * `vitest.config.ts` (protégé, hors de portée de ce lot) donne un
 * `configPath` explicite à `wrangler.jsonc` — ce qui empêche `wrangler` de
 * suivre lui-même la redirection qu'il pose vers `dist/server/wrangler.json`
 * après le build (`.wrangler/deploy/config.json`), redirection qui n'agit
 * que sur une résolution de configuration IMPLICITE.
 *
 * `wrangler.jsonc` doit donc porter `main`/`assets` lui-même. Les pointer
 * directement dans `dist/` créerait un cycle : `astro build` lit aussi ce
 * même `wrangler.jsonc` pour ses propres liaisons de développement, et
 * validerait un `main` pointant sur un fichier que `dist/` — qu'il vide au
 * début de sa propre exécution — ne porte pas encore. `--avant` pose une
 * amorce stable hors de `dist/` pour casser ce cycle ; `--apres` la remplace
 * par le vrai worker dès que le build a produit `dist/`.
 *
 * Constat annexe, non traité ici (hors périmètre du ticket 01) : le chunk
 * `dist/server/chunks/entrypoints_*.mjs` que produit `astro build` porte, au
 * niveau module (donc exécuté à chaque démarrage à froid, quelle que soit la
 * route), un `WebAssembly.compile(...).then(...)` sans `.catch` — un artefact
 * mort d'outillage de build (`astro/dist/core/build/plugins/plugin-chunk-
 * imports.js`, via `es-module-lexer`) qui fuit dans le bundle serveur. Le
 * bac à sable `workerd` refuse cette compilation dynamique et la promesse
 * rejetée devient une exception non gérée — c'est pourquoi `package.json`
 * lance `vitest` avec `--dangerouslyIgnoreUnhandledErrors` : aucune assertion
 * de test n'est concernée, seule cette fuite d'outillage l'est. Signalé, pas
 * corrigé — la correction relève d'`astro`/`@astrojs/cloudflare`, pas de ce
 * lot.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const SERVER_DIR = '.wrangler/test-worker/server';
const CLIENT_DIR = '.wrangler/test-worker/client';

function avant() {
  if (!existsSync(`${SERVER_DIR}/entry.mjs`)) {
    mkdirSync(SERVER_DIR, { recursive: true });
    writeFileSync(
      `${SERVER_DIR}/entry.mjs`,
      'export default { fetch: () => new Response("amorce — le premier build n’a pas encore tourné", { status: 503 }) };\n',
    );
  }
  mkdirSync(CLIENT_DIR, { recursive: true });
}

function apres() {
  if (!existsSync('dist/server') || !existsSync('dist/client')) {
    throw new Error('dist/server ou dist/client absent après astro build — rien à synchroniser vers .wrangler/test-worker/.');
  }
  rmSync(SERVER_DIR, { recursive: true, force: true });
  rmSync(CLIENT_DIR, { recursive: true, force: true });
  cpSync('dist/server', SERVER_DIR, { recursive: true });
  cpSync('dist/client', CLIENT_DIR, { recursive: true });
}

// `globalThis.process` plutôt que `process` nu : ce fichier n'est pas sous
// `**/*.ts` (seule extension pour laquelle `eslint.config.js`, protégé,
// déclare les globales Node) — l'identifiant nu déclencherait `no-undef`.
const mode = globalThis.process.argv[2];
if (mode === '--avant') avant();
else if (mode === '--apres') apres();
else throw new Error(`mode inconnu : "${mode}" — attendu "--avant" ou "--apres".`);
