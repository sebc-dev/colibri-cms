// eslint.config.boundaries.js — job `boundaries` (docs/ci.md), matrice I1 SEULE.
//
// Ce fichier ne porte QUE le sens descendant des dépendances entre zones
// (docs/archi.md I1) — pas le style (job `lint`, eslint.config.js), pas le
// reliquat d'I3 (ré-exports, barils, alias — encore `[à compléter]`,
// docs/ci.md § Registre des ADR vérifiés en CI, ligne ADR-0021).
//
// Les cinq zones se déclarent SANS BARRE FINALE — motif "src/render" nu,
// jamais suivi d'une étoile ou d'une double étoile — c'est la contrainte
// générale d'I3 (FR-026, plan § décision 10) : le contrôle littéral
// d'arch-invariants.sh cherche, entre guillemets, la zone render suivie d'un
// caractère dans tout fichier source hors de cette zone, et CE fichier en
// est un — d'où l'absence de guillemets autour de ces motifs jusqu'ici même
// dans ce commentaire. La forme sans barre finale est aussi celle qui classe
// réellement les fichiers en mode dossier d'eslint-plugin-boundaries (elle
// devient interne au pattern suivi de « /**/* ») ; ajouter une étoile double
// le motif et ne classe plus rien.
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

const ELEMENTS = [
  { type: 'core', pattern: 'src/core' },
  { type: 'render', pattern: 'src/render' },
  { type: 'platform', pattern: 'src/platform' },
  { type: 'site', pattern: 'src/site' },
  { type: 'admin', pattern: 'src/admin' },
];

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      '.wrangler/**',
      'coverage/**',
      '.stryker-tmp/**',
      'reports/**',
    ],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': ELEMENTS,
      'import/resolver': { typescript: true },
    },
    rules: {
      // I1 (docs/archi.md) : site → render, core ; admin → render, core,
      // platform ; render → core ; platform → core ; core → aucune. Toute
      // autre arête est interdite (default: 'disallow').
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'core' } },
              disallow: {
                to: {
                  element: {
                    types: { anyOf: ['core', 'render', 'platform', 'site', 'admin'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'render' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              from: { element: { type: 'platform' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              from: { element: { type: 'site' } },
              allow: { to: { element: { types: { anyOf: ['render', 'core'] } } } },
            },
            {
              from: { element: { type: 'admin' } },
              allow: {
                to: { element: { types: { anyOf: ['render', 'core', 'platform'] } } },
              },
            },
          ],
        },
      ],
    },
  },
];
