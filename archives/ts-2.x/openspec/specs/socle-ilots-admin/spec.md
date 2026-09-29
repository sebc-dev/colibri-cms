# Socle d'îlots d'administration Specification

## Purpose

Poser la fondation d'interface commune des îlots d'administration (base de composants shadcn-svelte,
ADR-0009) : intégrer Svelte 5 et Tailwind CSS à Astro pour la seule administration, posséder le
source des composants dans le dépôt, et garantir qu'ils se rendent sous la CSP stricte de
l'administration sans rouvrir `script-src`, le site public restant hors de cette base.

## Requirements

### Requirement: Fondation d'interface cantonnée à l'administration

La chaîne de build DOIT (SHALL) intégrer Svelte 5 et Tailwind CSS pour la seule administration ; les
pages du site public NE DOIVENT PAS voir leur poids augmenter du fait du socle (SC-005, FR-105/SC-008 :
aucun code propre à une cliente, la fondation se propage à toute la flotte).

#### Scenario: La chaîne build + typage strict monte le socle admin

- **WHEN** on exécute `npm run typecheck` puis `npm run build` avec Svelte 5, Tailwind CSS et les
  dépendances de fondation (bits-ui, `tailwind-variants`, `clsx`, `tailwind-merge`, icônes lucide)
  câblés pour la seule administration
- **THEN** le typage strict et le build passent sans erreur

#### Scenario: Le poids du site public n'augmente pas

- **WHEN** on inspecte l'artefact de build des pages publiques
- **THEN** aucune page publique ne référence un composant de la base d'administration ni Tailwind
- **AND** le poids public mesuré par SC-005 n'augmente pas du fait du socle d'administration

### Requirement: Montage de l'administration par un point d'entrée externe

L'administration DOIT (SHALL) se monter comme une application par un point d'entrée externe (script bundlé
chargé via `<script src>`), sans hydratation en ligne (aucune directive `client:*`), afin de rester
compatible avec la CSP stricte qui interdit le script en ligne (ADR-0004, ADR-0008).

#### Scenario: Un écran d'administration monte un îlot sans script en ligne

- **WHEN** un écran d'administration monte un îlot Svelte via son point d'entrée externe
- **THEN** l'îlot est chargé par un `<script src>` bundlé, sans aucune directive `client:*`
  d'hydratation en ligne

#### Scenario: L'îlot se rend et répond sans violation CSP

- **WHEN** l'écran d'administration est servi sous ses en-têtes réels et l'éditrice interagit avec
  l'îlot
- **THEN** l'îlot répond à l'interaction
- **AND** la console ne rapporte aucune violation de la CSP

### Requirement: Base de composants shadcn-svelte possédée dans la zone admin

La CLI shadcn-svelte DOIT (SHALL) copier le source de ses composants dans la zone `src/admin` du dépôt —
possédés et versionnés, pas dans un `src/lib` générique ni comme dépendance de composants opaque —
au service de FR-117/UX-1 (aucun terme de développeur), UX-2 et SEC-1 (aucun script tiers au
runtime : du source compilé avec l'îlot).

#### Scenario: Le source d'un composant est versionné sous src/admin

- **WHEN** la CLI shadcn-svelte est initialisée et un composant est ajouté
- **THEN** le source d'au moins un composant est copié dans `src/admin`, versionné dans le dépôt
- **AND** il n'est pas placé dans un `src/lib` générique

### Requirement: Réconciliation CSP des primitives de l'administration

La CSP de l'administration DOIT (SHALL) porter `style-src-attr 'unsafe-inline'` (ADR-0010) pour tolérer les
attributs `style="…"` en ligne des primitives bits-ui, tout en maintenant `script-src` strict (sans
`unsafe-inline`, SEC-1 préservé) ; elle est portée par le seul `src/platform/entetes/middleware.ts`.

#### Scenario: La CSP tolère les styles en ligne sans rouvrir script-src

- **WHEN** on inspecte les en-têtes servis à un écran d'administration
- **THEN** la CSP porte `style-src-attr 'unsafe-inline'`
- **AND** `script-src` reste strict, sans `unsafe-inline`
- **AND** la directive est émise par le seul `src/platform/entetes/middleware.ts`

#### Scenario: Un composant shadcn-svelte se rend sous la CSP sans style bloqué

- **WHEN** un écran d'administration monte un îlot bâti sur un composant shadcn-svelte, servi sous la
  CSP de l'administration
- **THEN** la console ne rapporte aucune violation CSP
- **AND** aucun style de primitive n'est bloqué

### Requirement: Frontière base d'administration / îlots publics falsifiable

Le graphe d'imports entre zones (contrôle `boundaries`, invariant I1, ADR-0009) DOIT classer et
scanner aussi les fichiers `.svelte` — et non les seuls `src/**/*.ts` — de sorte qu'un îlot du site
public important un composant de la base d'administration soit falsifié statiquement (DOIT — SHALL).

#### Scenario: Le contrôle boundaries scanne les fichiers Svelte

- **WHEN** le contrôle `boundaries` classe les fichiers du dépôt
- **THEN** il classe et scanne les fichiers `.svelte`, pas seulement `src/**/*.ts`

#### Scenario: Un import public vers admin est signalé, l'import admin légitime reste accepté

- **WHEN** un îlot de `src/site` importe délibérément un composant de la base `src/admin` et que l'on
  exécute `npm run lint:boundaries`
- **THEN** l'import public → admin est signalé en erreur
- **AND** l'import légitime admin → (render | core | platform) reste accepté
