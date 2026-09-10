// eslint.config.js — `npm run lint` : style et correction (mode 2 de
// la grille), jamais le sens des dépendances entre zones (`npm run
// lint:boundaries`, eslint.config.boundaries.js — deux fichiers distincts à
// dessein, voir la décision 6 du plan).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// `defineConfig` vient d'ESLint lui-même : `tseslint.config()` porte un
// @deprecated qui renvoie ici (SonarLint S1874). Même rôle, même traitement
// des configs imbriquées — et une dépendance de moins à faire suivre.
export default defineConfig(
  {
    // .stryker-tmp/ et reports/ sont les artefacts du job de mutation, déjà
    // ignorés par .gitignore ; le bac à sable de Stryker porte une copie de
    // tsconfig.json, ce qui fait échouer le parsing de tout le dépôt et
    // masque les diagnostics des sources réelles.
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
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
);
