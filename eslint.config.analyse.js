// eslint.config.analyse.js — `npm run analyse` : la boucle d'analyse locale
// (mode 3 de la grille). Ni le style (`npm run lint`, eslint.config.js) ni le
// sens des dépendances entre zones (`npm run lint:boundaries`) — trois fichiers
// distincts à dessein, un par intention, comme la décision 6 du plan l'a posé.
//
// Ce que cette passe apporte et que les deux autres n'ont pas : le lint
// TYPE-AWARE. typescript-eslint lit le graphe de types de `tsc`, donc il voit
// ce qu'aucune passe syntaxique ne peut voir — une promesse jamais attendue,
// une valeur `any` qui traverse une frontière, une condition toujours vraie.
// S'y ajoute eslint-plugin-sonarjs : complexité cognitive, branches dupliquées,
// retours invariants.
//
// Coût : cette passe type comme `tsc` (quelques secondes ici). Pendant qu'un
// agent code, ne la jouer QUE sur les fichiers touchés :
//   npx eslint --config eslint.config.analyse.js src/le/fichier.ts
//
// PORTÉE — fichiers `.ts` seulement. Le type-aware n'atteint ni `.astro` ni
// `.svelte` : leurs parsers tiers ne rendent pas le programme TypeScript que
// les règles à types exigent. Les îlots restent donc couverts par
// `lint:boundaries` (frontières) et par `tsc`, pas par cette passe.
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig } from 'eslint/config';

export default defineConfig(
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
    files: ['**/*.ts'],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      sonarjs.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        // Mode recommandé depuis typescript-eslint v8 : il retrouve le
        // tsconfig de chaque fichier sans qu'on les énumère.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Les tests d'intégration parlent à un worker par HTTP : `res.json()` rend
    // `any` par contrat, et `SELF`/`env` de `cloudflare:test` sont marqués
    // dépréciés en amont alors qu'ils sont la SEULE porte d'entrée du pool
    // workerd (docs/test.md). Laisser ces familles actives ici noie le signal :
    // 456 remontées sur les tests contre 29 sur `src/` au relevé du 2026-09-11.
    // Ce n'est pas un escape-hatch sur le code de production — `src/` garde la
    // grille entière.
    files: ['tests/**/*.ts'],
    rules: {
      // 77 remontées, toutes sur `SELF`/`env` de `cloudflare:test` — l'amont
      // les déclare dépréciés au profit de `cloudflare:workers`
      // (`exports.default.fetch()` / `env`). La migration est un travail à
      // part entière, pas un effet de bord de cette passe : elle est consignée
      // dans docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md.
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      'sonarjs/deprecation': 'off',
    },
  },
);
