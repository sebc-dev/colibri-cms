# 02 — Un composant shadcn-svelte se rend sous la CSP de l'administration

**Bloqué par :** 01
**Vérif :** observé — intégration de build (`npm run typecheck` + `npm run build`) et rendu du
composant sous la CSP réelle (console sans violation, aucun style bloqué) : ni la copie du source
par la CLI, ni le rendu d'une primitive sous en-têtes ne se constatent par un test unitaire.
**Fichiers :** `package.json`, `astro.config.ts`, config Tailwind (`tailwind.config.*`,
`components.json`), `src/admin/` (composants copiés + îlot), `src/platform/entetes/middleware.ts`

## Ce que ça livre
Tailwind CSS entre dans la chaîne de build (administration seule), la CLI shadcn-svelte est
initialisée et **copie le source de ses composants dans la zone `admin`** — possédés et versionnés
dans le dépôt, pas dans un `src/lib` générique et pas une dépendance de composants opaque. Les
dépendances de fondation neuves entrent (bits-ui, `tailwind-variants`, `clsx`, `tailwind-merge`,
icônes lucide). Un premier îlot d'administration bâti sur un composant shadcn-svelte se rend sous la
CSP de l'administration, augmentée du **seul** `style-src-attr 'unsafe-inline'` (ADR-0010) pour les
attributs `style="…"` des primitives, `script-src` maintenu strict, sans violation console ni style
bloqué.

## Critères
- [x] `npm run typecheck` puis `npm run build` passent avec Tailwind CSS et bits-ui (plus
      `tailwind-variants`, `clsx`, `tailwind-merge`, icônes lucide) ajoutés, cantonnés à
      l'administration.
- [x] La CLI shadcn-svelte est initialisée et le source d'au moins un composant est copié dans la
      zone `src/admin` (versionné dans le dépôt), pas dans un `src/lib` générique.
- [x] Un écran d'administration monte un îlot bâti sur ce composant shadcn-svelte.
- [x] La CSP de l'administration porte `style-src-attr 'unsafe-inline'` (ADR-0010) et conserve
      `script-src` strict (sans `unsafe-inline`), par le seul porteur
      `src/platform/entetes/middleware.ts`.
- [x] Au rendu de cet écran, la console ne rapporte aucune violation CSP et aucun style de primitive
      n'est bloqué (preuve capturée).
