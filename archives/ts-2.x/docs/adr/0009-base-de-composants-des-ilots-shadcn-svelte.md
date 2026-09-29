# ADR-0009 : Base de composants des îlots d'administration — shadcn-svelte
Statut : Accepté | Date : 2026-09-01

## Contexte

Les îlots d'administration (Svelte 5 dans Astro — décision reprise du 1.x, candidat
`ilots-svelte-5`) portent toute l'interface que l'éditrice manipule : édition des emplacements
(`FR-017`), bibliothèque de médias, réglages, formulaires, récapitulatif de publication, liste des
demandes. Cette interface doit être cohérente, accessible et sans terme de développeur (`FR-117`,
préoccupation `UX-1`), utilisable seule par une non-technicienne y compris après des mois sans usage
(`UX-2`, `SC-003`, `SC-015`). L'écosystème de composants de Svelte est plus étroit que celui de
React : une part de ce dont l'administration a besoin serait à écrire de zéro — coûteux, et
l'accessibilité est précisément ce qu'on réinvente mal.

Deux contraintes de fondation encadrent tout choix ici, et rendaient la décision nécessaire avant
que les features d'administration ne soient découpées :

- **CSP stricte de l'administration** (ADR-0004 (en-têtes de réponse — deux porteurs), ADR-0008
  (en-têtes d'administration posés par un middleware)) : aucun `unsafe-inline` sans nonce ni
  empreinte. Le candidat `ilots-svelte-5` en tire déjà que l'administration se monte comme une
  application par un point d'entrée externe, non comme des îlots dans des pages.
- **Réversibilité** (préoccupation `ARCH-1`, `SC-011`, `SC-014`) et **zéro objet appartenant à
  l'intégrateur** (préoccupation `SEC-3`) : tout ce qui fait le site doit vivre dans le dépôt et les
  comptes du client.

## Décision

Nous utiliserons le **registre shadcn-svelte** comme base de composants des **îlots
d'administration**, gestion du contenu comprise. La CLI de shadcn-svelte **copie le code source des
composants dans le dépôt** (`src/lib/…`), que le projet possède et versionne — ce n'est pas une
dépendance de composants opaque. Il s'appuie sur **Tailwind CSS** pour le style et sur les
primitives **bits-ui**, avec les utilitaires `tailwind-variants`, `clsx`, `tailwind-merge` et un jeu
d'icônes (lucide).

Le **site public** n'est pas concerné : le formulaire de devis (`FR-054`) garde des îlots minimaux,
hors de tout apport de composants, parce que `SC-005` (Lighthouse ≥ 95) mesure le poids envoyé à la
visiteuse sur ces pages-là.

## Conséquences

**Positives.**

- **Code possédé, pas boîte noire** : les composants copiés dans le dépôt alignent ce choix sur la
  réversibilité (`ARCH-1`, `SC-011`) et sur `SEC-3` — le clone du client porte tout le code de
  l'interface, rien d'opaque appartenant à l'intégrateur.
- **Accessibilité non réinventée** : les primitives bits-ui portent le clavier, le focus et l'ARIA,
  ce que `UX-2` exige et qu'on écrirait mal à la main.
- **Aucun script tiers chargé au runtime** (préoccupation `SEC-1`) : c'est du source compilé avec
  l'îlot, pas un script distant sur l'origine commune.

**Négatives — ce à quoi le code s'engage.**

- **Deux dépendances de fondation neuves** : Tailwind CSS (build) et bits-ui (runtime), plus les
  utilitaires. Elles se propagent à toute la flotte (`FR-105`, `SC-008` interdisent tout code propre
  à une cliente) et tombent sous `min-release-age=7` de `.npmrc` — une version publiée depuis moins
  de sept jours est inutilisable à la résolution.
- **Surface de style en ligne, contre la CSP stricte** : des primitives (positionnement de
  sur-couches, animations) peuvent poser des `style="…"` en ligne, ce que la CSP de l'administration
  interdit sans nonce ni empreinte — le pendant, côté *style*, de ce que `ilots-svelte-5` a constaté
  côté *script* d'hydratation. La réconciliation (nonce/empreinte, ou `style-src` maîtrisé) est à
  instruire dans `docs/archi.md` / `docs/ci.md` ; elle ne rouvre pas le présent choix de base de
  composants.
- **Poids de Tailwind et des primitives**, assumé dans l'administration seule — non mesurée par
  `SC-005`. La frontière « pas dans les îlots publics » doit rester tenue, sinon le poids retombe sur
  la page où le critère mord.
- **Écart d'idiome** : Tailwind introduit une convention de style qui n'existait pas dans la stack, à
  consigner dans les conventions du projet.

## Alternatives considérées

- **Écrire les composants de zéro** : écartée — coût élevé et accessibilité réinventée à la main,
  pour un profil (l'éditrice) où `UX-2` ne pardonne pas les ratés.
- **Une bibliothèque de composants installée en dépendance npm opaque** : écartée — poids et code non
  possédés, moins bien alignée sur la réversibilité (`ARCH-1`, `SC-011`) que du source copié dans le
  dépôt.
- **bits-ui / Melt UI seuls, sans registre** : écartée — recevable, mais laisse tout le style et la
  cohérence à écrire ; shadcn-svelte les fournit précisément par-dessus ces primitives.

## Vérifiable ?

Partiellement. La frontière « composants d'administration hors des îlots publics » laisse une trace
observable dans les **imports** : elle est potentiellement dérivable en contrôle `boundaries`
(aujourd'hui informatif) — un îlot public qui importerait un composant de la base shadcn-svelte est
falsifiable. La réconciliation avec la CSP relève de la recette et de `docs/ci.md`. Le choix de la
base lui-même est de **fondation** : il se constate à la livraison, pas dans l'arborescence.
