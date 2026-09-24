# ColibriCMS — Système de design

Le cap durable de l'interface d'administration : d'où viennent les composants, sous quelles
contraintes ils se rendent, et où trouver le canvas maître. Le *pourquoi* du choix de base est figé
dans [ADR-0009](./adr/0009-base-de-composants-des-ilots-shadcn-svelte.md).

## Base de composants — shadcn-svelte

Les **îlots d'administration** (Svelte 5 dans Astro) portent toute l'interface que l'éditrice
manipule : édition des emplacements, bibliothèque de médias, réglages, formulaires, récapitulatif de
publication, liste des demandes. Leur base est le **registre shadcn-svelte**.

- **Code possédé, pas boîte noire.** La CLI de shadcn-svelte **copie le source des composants dans le
  dépôt** (zone `admin`), que le projet possède et versionne — pas une dépendance opaque. C'est ce
  qui aligne l'interface sur la réversibilité (`ARCH-1`, SC-011) et sur « zéro objet de
  l'intégrateur » (`SEC-3`).
- **Tokens et primitives.** Style par **Tailwind CSS** ; primitives d'accessibilité **bits-ui**
  (clavier, focus, ARIA — ce qu'on réinvente mal à la main) ; utilitaires `tailwind-variants`,
  `clsx`, `tailwind-merge` ; icônes lucide. Les tokens de design vivent dans
  **`src/admin/admin.css`**, et nulle part ailleurs : `:root` porte la palette et le rayon
  (`--background`, `--foreground`, `--primary`, `--radius`… — le thème « neutral » du registre
  shadcn-svelte), `@theme inline` les expose en utilitaires (`bg-primary`, `text-muted-foreground`,
  `--radius-md`…) que consomment les composants copiés. Tailwind v4 est **CSS-first** : la feuille
  fait `@import 'tailwindcss'` et le projet ne porte **aucun `tailwind.config.js`**. Un **seul jeu de
  valeurs, sans variante sombre** — l'administration reste en `color-scheme: light`.
- **Accessibilité non réinventée** : `UX-2` exige que l'éditrice agisse seule, sans notion technique,
  y compris après des mois sans usage.

## Contraintes de rendu

- **Aucun terme de développeur** dans un texte visible par l'éditrice (`FR-117`, `UX-1`) : la liste
  des termes proscrits est un plancher, jamais un plafond.
- **CSP stricte.** L'administration se monte comme une application par un point d'entrée externe
  (aucune directive `client:*` sous `src/admin/`, invariant `I4`) : `script-src` reste strict, sans
  hydratation en ligne. Les **attributs** de style en ligne que posent certaines primitives
  (sur-couches, animations, valeurs calculées au runtime) sont tolérés par `style-src-attr
  'unsafe-inline'` ([ADR-0010](./adr/0010-csp-admin-styles-inline-style-src-attr.md)) — et rien de
  plus. Voir [`docs/security.md`](./security.md).
- **Frontière de zones.** La base d'administration reste **hors des îlots publics** : le formulaire
  de devis public garde des îlots minimaux, sans apport de composants, parce que SC-005 (Lighthouse
  ≥ 95) mesure le poids envoyé à la visiteuse sur ces pages. La frontière est falsifiable dans le
  graphe d'imports entre zones (`I1`, `eslint.config.boundaries.js`), joué par
  `npm run lint:boundaries` — **à la main** : aucun workflow ne le joue.

## Canvas maître

Le canvas de référence est le projet **Colibri CMS Design System** sur claude.ai/design : tokens
des deux thèmes, 21 composants contractualisés, 21 cartes de fondations et un kit d'interface
d'administration. Il fait autorité sur la **marque** — couleur, typographie, espace, formes, voix.

Une copie datée en vit dans le dépôt, sous `.claude/skills/colibri-cms-design/`, invocable par
`/colibri-cms-design` : c'est elle que lisent les sessions de travail. Elle **ne se resynchronise
pas toute seule** — le projet en ligne reste la source. Ce qu'elle ne porte pas à l'identique est
consigné dans
[`.claude/skills/colibri-cms-design/RECUPERATION.md`](../.claude/skills/colibri-cms-design/RECUPERATION.md).

**Ce canvas n'est pas encore adopté par le produit.** L'administration se rend toujours sur le
thème « neutral » du registre shadcn-svelte (`src/admin/admin.css`, plus haut). Trois écarts
restent à trancher **par ADR** avant tout portage : le code des composants est en React quand le
produit est en Svelte ; les polices et les icônes y sont chargées depuis des origines tierces que
`default-src 'none'` interdit ; et le canvas porte deux thèmes là où l'administration n'en a qu'un.
Ce qui se transpose, ce sont les valeurs et les dispositions, jamais le code tel quel.

Les maquettes textuelles des changes livrés complètent le tableau, écran par écran :
[003 — remplir les emplacements](../openspec/changes/archive/2026-09-09-003-remplir-emplacements/ux.md)
(cadre de l'administration, liste des pages, éditeur d'emplacements) et
[004 — bibliothèque de médias](../openspec/changes/archive/2026-09-21-004-bibliotheque-de-medias/ux.md)
(écran Médias, fiche d'une image).
