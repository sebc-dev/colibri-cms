## Context

Voir `proposal.md` — Why. État constaté dans le code au 2026-09-25 :

- **`src/admin/Gabarit.astro`** est un document nu (`<html>`, `<head>`, `<body><slot/></body>`) qui
  importe `admin.css`. `admin.css` porte le thème « neutral » du registre et un `body { padding: 2rem }`.
- **Le cadre est un îlot Svelte** (`src/admin/ilots-svelte-5/Cadre.svelte`) monté côté navigateur, de
  trois façons : `monterCadreAvecContenu` capture le contenu déjà rendu de `#ilot-cadre` et l'enveloppe
  (« Mes pages », éditeur d'une page) ; `EcranMedias` et `EcranFicheMedia` l'importent eux-mêmes
  autour de leur contenu ; `/admin/cadre` le monte seul. La réponse HTTP ne contient donc **jamais**
  le menu.
- **L'accueil** (`src/pages/admin/index.astro`) rend « Vous êtes connectée. » ; la connexion y renvoie.
- **La connexion** (`src/pages/admin/connexion.astro`) : deux `<form method="post">` en balisage nu.
- **La marque de brouillon** : `<span data-pastille-brouillon> • brouillon</span>`, écrit à deux
  endroits (rendu serveur de `mes-pages.astro` et `pages/[slug].astro`, et `afficherPastilleDeBrouillon`
  de `src/admin/pastille-brouillon.ts` après un enregistrement).
- **Composants shadcn-svelte présents** : `button`, `tooltip`. Icônes : `@lucide/svelte`.
- **Politique de sécurité** : `default-src 'none'; script-src 'self'; connect-src 'self'; style-src
  'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; …` — `I12`, `I14`, `I15`.
- **Build** : `inlineStylesheets: 'never'` ; Tailwind v4 CSS-first via `@tailwindcss/vite` ; aucun
  `public/`.

Contraintes : ADR-0006 / `I4` (aucune directive `client:*` sous `src/admin/`), ADR-0008 / `I11` (les
en-têtes par le seul middleware), ADR-0009 (shadcn-svelte, code possédé), ADR-0010 / `I12` (seule
tolérance *inline* : les attributs `style`), ADR-0015 / `I14` (tokens dans le seul `admin.css`),
ADR-0016 / `I15` (polices en même origine), `I1` (sens des dépendances), `I6` (garde de session sur
toute route admin).

## Goals / Non-Goals

**Goals :**
- Un **thème unique** posé une fois dans `admin.css`, que tous les écrans et tous les composants
  consomment sans connaître une valeur.
- Un **cadre rendu par le serveur**, commun aux écrans servis, avec le minimum de script pour le repli
  et le tiroir.
- Une **marque de brouillon à source unique**, identique au rendu serveur et après un enregistrement.
- Un habillage **par écran**, en fichiers disjoints, pour que les tickets d'écran se jouent en
  parallèle une fois le socle posé.

**Non-Goals :**
- Aucun changement de comportement des gestes d'édition, des routes d'écriture, du modèle de données
  ou de la politique de sécurité.
- Pas de thème sombre, pas de réglage d'apparence.
- Pas de bandeau d'état de publication (né avec « Aperçu et publication »).
- Pas de portage du code React du canvas : on en prend les valeurs et les dispositions.

## Decisions

### D1 — Les tokens : noms Colibri en source, noms shadcn en alias (ADR-0015)

`admin.css` déclare dans `:root` les tokens du canvas sous leurs noms (`--surface`, `--surface-raised`,
`--surface-sunken`, `--line`, `--line-strong`, `--ink`, `--ink-muted`, `--plumage`, `--plumage-soft`,
`--on-plumage`, `--gorge`, `--gorge-soft`, `--ambre`, `--ambre-soft`, `--danger`, `--danger-soft`,
`--on-danger`, `--info`, `--info-soft`, `--focus-ring`, `--overlay`, ombres, familles, échelle
typographique), puis chaque variable shadcn **pointe** un token : `--background: var(--surface)`,
`--foreground: var(--ink)`, `--card: var(--surface-raised)`, `--primary: var(--plumage)`,
`--primary-foreground: var(--on-plumage)`, `--muted: var(--surface-sunken)`, `--muted-foreground:
var(--ink-muted)`, `--destructive: var(--danger)`, `--border: var(--line)`, `--input:
var(--line-strong)`, `--ring: var(--focus-ring)`.

`@theme inline` expose les deux familles : les utilitaires shadcn existants continuent de marcher, et
les écrans gagnent `bg-surface`, `text-gorge`, `bg-gorge-soft`, `font-display`, `text-title`… Les
rayons `--radius-sm/md/lg` prennent les valeurs du canvas (4/6/10 px) au lieu d'être calculés depuis
`--radius`. La grille de Tailwind v4 (`--spacing: 0.25rem`) **est déjà** la grille de 4 px du canvas :
on ne la redéfinit pas.

Seul le bloc clair entre ; `color-scheme: light` reste. `body` perd son `padding: 2rem` (le cadre porte
ses propres marges) et prend fond, encre et police de base.

- *Écarté* : redéfinir les seuls noms shadcn (gorge/ambre/info n'y ont pas de nom) ; renommer les
  classes des composants copiés (chaque ajout par la CLI serait à retoucher). Tranché par ADR-0015.

### D2 — Les polices par `@fontsource`, importées dans `admin.css` (ADR-0016)

Sept imports ciblés en tête de `admin.css` (`@fontsource/fraunces/latin-400.css`, `…/latin-600.css`,
`@fontsource/instrument-sans/latin-{400,500,600}.css`, `@fontsource/jetbrains-mono/latin-{400,500}.css`),
jamais l'`index.css` d'un paquet. Vite réécrit les `url(./files/…)` des `@font-face` vers `/_astro/`,
sous un nom haché. Les familles déclarées dans `@theme` (`--font-display`, `--font-sans`, `--font-mono`)
gardent les piles de repli du canvas.

Le ticket qui pose les polices **vérifie sur l'artefact bâti** que les sept `.woff2` sont émis comme
fichiers (jamais en `data:`, que `font-src 'self'` bloquerait — tous dépassent le seuil de 4 Ko).

### D3 — Le cadre devient un gabarit Astro, rendu par le serveur

Nouveau gabarit **`src/admin/GabaritCadre.astro`**, qui enveloppe `Gabarit.astro` et prend deux
propriétés : `titre` et `rubrique` (`'mes-pages' | 'medias'`). Il rend :

- la **barre latérale** (écran large, `md:` et au-delà — 768 px, le point de rupture `md` de
  Tailwind, qui fixe « écran étroit » dans la spec) : logo, menu, bouton de repli ;
- la **barre du haut** (écran étroit seulement) : bouton de menu, logo ;
- le **tiroir** : un élément `<dialog>` natif portant une seconde instance du menu ;
- `<main>` et son `<slot/>`.

Le menu est un composant Astro **`src/admin/MenuRubriques.astro`**, rendu deux fois (barre et tiroir) :
une seule liste de rubriques, un seul marquage de la rubrique courante (`aria-current="page"`). Les
icônes sont les composants `@lucide/svelte` **rendus par le serveur** — un composant Svelte placé dans
un `.astro` sans directive `client:*` est rendu en HTML statique, sans script, ce qui respecte `I4`.

Le comportement tient dans **un module externe**, `src/admin/cadre.ts`, chargé par un `<script>` de
module d'Astro (bundlé, jamais `is:inline` — `I12`) :

- **repli** : bascule un attribut `data-replie` sur la barre, persisté dans `localStorage` sous la
  même clé qu'aujourd'hui (`admin.cadre.replie`) — la préférence déjà retenue sur les appareils
  survit à la migration ;
- **tiroir** : `showModal()` / `close()` — le `<dialog>` modal fournit nativement le piège de focus,
  la fermeture par Échap et le retour du focus au bouton ; le script ajoute la fermeture au toucher du
  fond et au choix d'une rubrique.

Les écrans servis remplacent `Gabarit` par `GabaritCadre`. Les montages qui enveloppaient le cadre
disparaissent : `monterCadreAvecContenu` et `monterCadre` sont retirés de `monter.ts` ; `EcranMedias`
et `EcranFicheMedia` ne rendent plus que leur contenu ; `Cadre.svelte` est supprimé.

- *Écarté* : garder l'îlot `Cadre.svelte` et ne changer que son habillage — l'écran s'affiche d'abord
  sans menu, et le cadre ne se vérifie qu'à l'œil (arbitré en cadrage).
- *Écarté* : le tiroir par le composant `Sheet` de shadcn-svelte — il exigerait un îlot Svelte pour
  un cadre désormais rendu par le serveur, là où `<dialog>` couvre focus, Échap et fond sans
  dépendance.
- *Écarté* : porter la préférence de repli dans un cookie pour la rendre côté serveur — la spec
  exige « sans requête serveur pour la porter ».

### D4 — Le logo, en `currentColor`, dans un composant Astro

Le SVG du canvas (`assets/logo-colibri.svg`) porte une couleur écrite en dur (`fill="#39362f"`) :
versé tel quel sous `src/admin/`, il violerait `I14`. Il entre donc sous
**`src/admin/Logo.astro`**, balisage SVG rendu dans la page, `fill="currentColor"`, et sa couleur
vient d'un token `--logo` déclaré dans `admin.css` (valeur du canvas, `#39362F`). Le SVG ne contient
ni script ni référence externe (vérifié : zéro occurrence de `script`) ; il porte `role="img"` et un
`aria-label`.

- *Écarté* : un fichier `.svg` importé comme ressource — il garderait sa couleur en dur, et
  l'importer depuis un dossier hors zone (`src/assets/`) créerait une arête que `I1` ne prévoit pas.

### D5 — L'accueil renvoie vers « Mes pages »

`src/pages/admin/index.astro` garde son garde de session (`I6`) puis renvoie (`Astro.redirect`, 302)
vers `/admin/mes-pages`. La connexion continue de renvoyer vers `/admin` : le parcours passe par deux
renvois, sans écran intermédiaire. Le test statique de l'accueil (aucun lien, aucun terme) reste vrai
tel quel. Deux tests de `tests/integration/code-ouvre-la-session.test.ts` attendaient l'accueil
affiché (« Vous êtes connectée. », statut 200 ; aucun formulaire, bouton ni lien) : ils sont
**remplacés** par ceux des scénarios « L'accueil mène à « Mes pages » » et « L'ouverture de session
conduit à « Mes pages » ». De même, SC-02a de `tests/integration/liste-des-pages.test.ts` exige qu'une
ligne de « Mes pages » contienne exactement le titre : l'adresse ajoutée sous le titre le casse, et il
est remplacé par « « Mes pages » montre l'adresse de chaque page ». Les tests périmés sont retirés par
une PR directe avant les tickets (voir `test-plan.md`).

### D6 — Une seule source pour la marque de brouillon

La marque devient un badge : libellé écrit « Brouillon », texte `gorge` sur fond `gorge-soft`, forme
pastille (`radius-pill`), et un point devant le libellé, comme le badge d'état du canvas. Sa source
unique est le composant **`src/admin/MarqueBrouillon.astro`** : les écrans le rendent là où une page
porte un brouillon, et `GabaritCadre.astro` le rend aussi, une fois, dans un
`<template id="modele-marque-brouillon">` que `afficherPastilleDeBrouillon` clone côté navigateur
au lieu de construire un `<span>` à la main. L'attribut `data-pastille-brouillon` est conservé : les tests
existants le cherchent.

### D7 — Les composants shadcn-svelte ajoutés au besoin

Ajoutés par la CLI sous `src/admin/composants/ui/`, seulement quand un écran en a l'usage : `input`,
`label`, `textarea`, `card`, `badge`, `dialog`, `alert`. Chaque ajout passe sous la CSP réelle
(recette du ticket) — ADR-0010 ne tolère que les attributs `style`.

### D8 — Téléphone : ce que « parcours complet » veut dire dans le code

- **Point de rupture unique** `md` (768 px) : en dessous, barre du haut + tiroir, une colonne ; au-delà,
  barre latérale.
- **Cibles de 44 px** : sur écran étroit, boutons, liens du menu, vignettes et contrôles des
  emplacements prennent `min-h-11 min-w-11` (44 px) ; sur écran large, les hauteurs du canvas
  (38 px, 30 px) s'appliquent.
- **Champs à 16 px sur écran étroit** : le canvas fixe le texte courant à 15 px ; un champ de moins de
  16 px fait agrandir la page par Safari sur iPhone à la saisie. Les champs passent à 16 px sous `md`,
  15 px au-delà. Seul écart assumé au canvas.
- **Claviers** : adresse `type="email"` `autocomplete="email"` ; code `inputmode="text"`
  `autocomplete="one-time-code"` (le code n'est pas seulement numérique — la saisie se normalise,
  spec `connexion-par-code`).
- **Sur-couches** : pleine largeur moins 16 px de marge sous `md`, hauteur bornée à l'écran, contenu
  défilant, bouton de fermeture en tête.
- **Animations** : toutes les transitions sous `motion-safe:`.

### D9 — Les écrans de démonstration sont retirés

`src/pages/admin/ilots.astro` et `src/pages/admin/cadre.astro` sont supprimés, avec les îlots qu'ils
seuls montaient (`Compteur.svelte`, `ActionRapide.svelte`) et leurs fonctions de montage. Aucun test
ne les cite (vérifié : aucune occurrence de `/admin/ilots` ni `/admin/cadre` sous `tests/`). Les
exigences de `socle-ilots-admin` (un îlot monté par un script externe, un composant shadcn sous la
CSP) restent prouvées par les écrans réels.

### Conformité aux invariants

| Invariant | Tenu par |
|---|---|
| `I1` | les nouveaux fichiers restent dans `src/admin/` ; aucun import neuf hors `render/`, `core/`, `platform/` |
| `I4` | aucune directive `client:*` : icônes rendues sans hydratation, comportement par module externe |
| `I6` | l'accueil garde son import du garde avant de renvoyer |
| `I11`, `I12`, `I15` | la politique de sécurité n'est pas touchée |
| `I14` | toutes les valeurs dans `admin.css`, logo en `currentColor`, imports `@fontsource` locaux |

Aucune décision structurante nouvelle : ce design applique ADR-0015 et ADR-0016 et ne propose pas
d'ADR.

### Ordre de construction pressenti (pour `/scd-spec-dev:tickets`)

1. **Thème et polices** — `admin.css`, dépendances, `Logo.astro` ; socle, bloque tout le reste.
2. **Cadre** — `GabaritCadre.astro`, `MenuRubriques.astro`, `cadre.ts`, marque de brouillon, retrait
   de `Cadre.svelte` et des écrans de démonstration, accueil renvoyé.
3. Puis, en parallèle (fichiers disjoints) : **connexion**, **Mes pages**, **éditeur d'une page**
   (le plus lourd : cinq natures d'emplacement), **Médias**, **fiche d'une image**.

## Risks / Trade-offs

- [La barre déployée apparaît un instant avant de se replier, chez qui l'a repliée — le module
  s'exécute après le premier affichage, et aucun script en ligne n'est permis] → la barre repliée
  est une préférence rare sur écran large ; la transition est coupée tant que le module n'a pas
  appliqué l'état (`data-pret`), de sorte que le saut est instantané, pas animé.
- [Tailwind v4 résout-il `@import '@fontsource/…'` depuis `admin.css` ?] → vérifié au premier ticket
  sur `npm run build` ; à défaut, les imports passent par le module d'entrée du gabarit (import CSS
  depuis `Gabarit.astro`), même résultat servi.
- [Les tests `workerd` n'appliquent ni feuille ni politique de sécurité : l'aspect ne s'y voit pas]
  → chaque écran se scinde en **structure** (vérifiable par la réponse HTTP : cadre présent, rubrique
  marquée, attributs des champs) et **aspect** (observé sur l'artefact bâti, `npm run build` puis
  `wrangler dev`, jamais `npm run dev` — Vite y injecte le CSS par un script que la CSP bloque).
- [Deux instances du menu dans le document (barre et tiroir)] → la barre est masquée sous `md` et le
  `<dialog>` fermé est inerte : une seule est atteignable à la fois, au clavier comme au lecteur
  d'écran.
- [Retirer `monterCadreAvecContenu` casse le test SC-02e de `liste-des-pages.test.ts`, qui cherche le
  point de montage `#ilot-cadre`] → le test est **remplacé** par le scénario « Le cadre est présent
  dès l'affichage », plus fort : il vérifie le menu lui-même dans la réponse.
- [Le kit du canvas nomme « Médiathèque » et « Pages » ce que les specs nomment « Médias » et « Mes
  pages »] → les specs font foi ; les libellés ne changent pas.
- [Le canvas fixe 15 px pour le texte courant ; les champs passent à 16 px sur téléphone] → écart
  borné aux champs sous `md`, consigné en D8.

## Migration Plan

Aucune donnée ne migre. La clé `localStorage` du repli est conservée (D3). Un retour arrière se fait
écran par écran, chaque ticket étant une PR : revenir sur le ticket du cadre ramène `Cadre.svelte`,
revenir sur celui du thème ramène le thème « neutral ».

À l'archivage : mettre à jour `docs/design-system.md` (thème adopté, trois écarts tranchés, cadre
rendu par le serveur) et inscrire la story 005 dans `docs/roadmap.md`.
