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
  `clsx`, `tailwind-merge` ; icônes lucide. Les tokens de design (couleurs, espacements, rayons,
  typographie) sont ceux exposés par la configuration Tailwind et les composants copiés — ils vivent
  dans le dépôt, sous la zone `admin`.
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
  graphe d'imports entre zones (`I1`, `eslint.config.boundaries.js`).

## Canvas maître

Le canvas de design de référence (artboards, écrans, flux) : **[à compléter]** — lien à poser par
l'humain.

Les maquettes textuelles existantes servent de référence en attendant :
[`openspec/changes/003-remplir-emplacements/ux.md`](../openspec/changes/003-remplir-emplacements/ux.md)
(cadre de l'administration, liste des pages, éditeur d'emplacements).
