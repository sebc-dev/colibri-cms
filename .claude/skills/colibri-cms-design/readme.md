# Colibri CMS — Design System

Colibri CMS est le système de gestion de contenu d'un site vitrine statique : un
site Astro servi par Cloudflare, dont le contenu vit dans D1, reconstruit à chaque
publication. Tout tient dans le plan gratuit du compte Cloudflare de la cliente.

**Ce design system couvre une seule surface : l'interface d'administration.**
Celle qu'utilise une personne non technicienne — une pâtissière, un artisan —
quelques fois par mois pour changer un texte ou ajouter trente photos à une
galerie. Le site public, lui, porte l'identité de chaque client et n'utilise pas
ces tokens.

Le colibri donne la direction : léger, rapide, précis, et une seule touche de
couleur vive. L'interface s'efface derrière les photos de la cliente.

## Principes

**Léger.** Le plan gratuit n'est pas une limite honteuse mais le cadre du produit.
On le montre calmement : une jauge, un chiffre, jamais une alarme tant qu'il reste
de la marge. Pas d'animation décorative, pas d'ombre sur les cartes, des polices
chargées avec parcimonie.

**Rassurant.** La cliente doit toujours savoir si ce qu'elle voit est en ligne.
Chaque contenu porte un état explicite, et chaque action irréversible le dit avant
d'agir.

**Honnête sur la mécanique, muet sur la technique.** On explique le délai
(« visible dans une minute environ ») sans jamais parler de build, de worker ou de
D1 dans le parcours de la cliente. Le vocabulaire Cloudflare reste dans l'écran
« Technique », réservé au studio.

## Sources

Ce système est dérivé d'un dossier de marque fourni en pièce jointe, monté en
lecture seule sous `colibri-cms-design-system/` :

- `README.md` — guide de marque en prose (principes, voix, fondations, logo,
  états de publication, quota, iconographie). Copié ici dans `source/brief-original.md`.
- `tokens.json` — jeu de tokens documenté (couleurs par thème avec notes d'usage,
  échelle typographique, espaces, rayons, ombre). Copié dans `source/tokens.json`.
- `tokens.css` — les mêmes valeurs en custom properties CSS, deux thèmes.
- `couverture.html` — une page de couverture illustrant le motif « plumes ».
  Copiée dans `source/couverture.html`.
- `logos/logo-colibri.svg`, `logos/logo-colibri-clair.svg` — copiés dans `assets/`.

Aucun dépôt GitHub, aucun fichier Figma, aucun code produit n'a été fourni : il
n'existe pas d'implémentation de référence de l'administration. Les écrans de
l'UI kit sont donc construits à partir de la prose du dossier de marque (états de
publication, jauge de quota, formulaire de devis, écran Technique), et non
recopiés d'un produit existant.

---

# Fondations du contenu

**On vouvoie.** Toujours. « Vos photos », « votre site », « réessayez ». Jamais de
« je », jamais de tutoiement, jamais de « nous » sauf pour désigner le studio dans
l'écran Technique.

**Phrases courtes, verbes d'action.** Un bouton est un verbe à l'infinitif :
« Publier les modifications », « Enregistrer », « Supprimer définitivement ». Pas
de « OK », pas de « Valider » seul.

**Casse de phrase partout.** Majuscule initiale, pas de Title Case, pas de
capitales dans les libellés de boutons ni d'onglets. Les badges d'état gardent la
casse de phrase : « Modifié, non publié ».

**Chiffres écrits en français.** « 2,4 Mo » (virgule décimale, espace avant
l'unité), « 14 h 32 », « 18 septembre », « 1 200 photos » (espace fine comme
séparateur de milliers).

**Pas de point d'exclamation, pas d'emoji, pas de « Oups ».** Une erreur est une
phrase calme qui dit ce qui s'est passé et ce qui est conservé.

**On traduit la mécanique, on ne la décrit pas.**

| À écrire | À éviter |
| --- | --- |
| Publier les modifications | Déclencher un build |
| Vos photos seront en ligne dans une minute environ. | Déploiement en cours sur Workers… |
| La publication n'a pas abouti. Votre travail est conservé ; réessayez ou prévenez le studio. | Erreur 500 : build failed |
| Il reste de la place pour environ 1 200 photos. | R2 : 3,2 Go / 10 Go |
| Supprimer définitivement cette photo ? Elle disparaîtra aussi du site. | Êtes-vous sûr ? |

**Les confirmations posent la question entière.** Le titre est la question
complète (« Supprimer définitivement cette photo ? »), la description dit la
conséquence (« Elle disparaîtra aussi du site. »). Le bouton répète le verbe.

**Le caractère obligatoire s'écrit en toutes lettres** (« — obligatoire »,
« — facultatif »), jamais avec un astérisque.

**Anglicismes bannis du parcours de la cliente** : build, deploy, worker, bucket,
slug, upload. Ils sont autorisés dans l'écran Technique et dans le journal, où ils
sont le vocabulaire juste.

---

# Fondations visuelles

## Couleur

Des neutres **chauds** portent 90 % de l'écran. Le fond de page n'est jamais blanc
pur (`surface` #F7F6F1) : les photos de la cliente doivent rester la seule chose
éclatante à l'écran. Les cartes remontent en blanc (`surface-raised`), les zones
creuses descendent en `surface-sunken`.

- **`plumage`** (#0E6B55, vert émeraude du colibri) est la **seule couleur
  d'action** : bouton Publier, élément actif de la navigation, état « Publié ».
- **`gorge`** (#B4235A, le rubis de sa gorge) est **rare** et ne sert qu'à une
  chose : signaler ce qui a été modifié mais n'est pas encore en ligne. Jamais une
  action.
- Les signaux **`ambre`**, **`danger`**, **`info`** ont chacun leur fond `-soft`.
- **`nuage`** (#F38020) est l'orange Cloudflare, en aplat seulement, jamais en
  texte sur surface claire, jamais un avertissement.

Texte sur aplat plumage : toujours `on-plumage`, jamais un blanc codé en dur.
Chaque paire texte/fond atteint 4,5:1 dans les deux thèmes ; `line-strong` et
l'anneau de focus atteignent 3:1. Le thème sombre déplace les valeurs sans changer
la sémantique : plumage s'éclaircit en #4FD1A5, gorge devient rose #FF7AA8.

## Typographie

**Fraunces** (Google Fonts) pour les titres uniquement — `display` 40/44 et
`title` 28/34, poids 600 — pour la chaleur artisanale que partagent les clientes.
**Instrument Sans** pour toute l'interface (`heading` 20/28, `body` 15/22,
`label` 13/18, `caption` 12/16). **JetBrains Mono** seulement pour les adresses de
pages et le journal technique (`code` 13/20). Les piles de repli (Georgia,
system-ui, Menlo) sont prévues pour un fonctionnement hors ligne. Une seule
`display` par écran.

## Espace et formes

Grille de 4 px, sept crans (`space-1` 4 px → `space-12` 48 px), rien entre les
crans. **Coins tenus, à peine adoucis**, dans l'esprit des coupes franches du
logo : `radius-sm` 4 px (champs, vignettes), `radius-md` 6 px (boutons, cartes,
menus), `radius-lg` 10 px (panneaux, modales, zone de dépôt), `radius-pill`
réservé aux badges et à la jauge.

## Cartes, bordures, ombres

Une carte, c'est un fond `surface-raised`, un filet 1 px `line`, un rayon
`radius-md` — **et aucune ombre**. La séparation se fait par le filet, y compris
entre les lignes d'une liste (filet horizontal, pas de carte par ligne).
`shadow-raised` (`0 1px 2px` + `0 4px 12px`, 6 % d'opacité) est réservé à ce qui
**flotte** : menus déroulants, modales. Pas de bordure colorée à gauche, pas de
carte-avec-accent.

## Fonds et imagerie

Pas d'image de fond, pas de dégradé, pas de texture, pas de motif répété dans
l'administration : le fond est un aplat `surface`. **Le système ne fournit aucune
photographie** — la seule imagerie de l'interface est celle de la cliente, et elle
est toujours présentée nue, dans un cadre `radius-sm` filet `line`, sans
recadrage artistique, sans filtre, sans voile ni dégradé de protection. Les
vignettes de l'UI kit sont des cadres `surface-sunken` portant la mention
« photo de la cliente » : rien n'a été inventé à leur place.

Le seul motif graphique de la marque est celui de la couverture
(`source/couverture.html`) : cinq lames de plumes en éventail, coupes droites,
sans rayon, dans les couleurs de la marque. Il est réservé aux surfaces de marque
(couverture, page de connexion), jamais à l'administration.

## Transparence et flou

Aucun flou (`backdrop-filter`), nulle part. La seule transparence du système est
le voile de modale (`--overlay`, `rgba(23,32,28,.45)` en clair). Le texte n'est
jamais en opacité réduite : un texte secondaire prend `ink-muted`, pas
`opacity: .6`.

## Animation

Pas d'animation décorative. Deux durées seulement : `--transition-fast` 120 ms
(couleurs de survol) et `--transition-base` 160 ms (largeur de la jauge de
quota). Courbe unique `ease-out`. Pas de rebond, pas de ressort, pas d'entrée en
fondu, pas de squelette animé. Une publication en cours s'annonce par un bandeau
`info` et un libellé, pas par une barre qui défile.

## Survol, appui, focus, désactivé

- **Survol** — aplats (primaire, danger) : `filter: brightness(.92)`, un
  assombrissement léger. Surfaces (secondaire, fantôme, ligne de liste, entrée de
  navigation) : fond `surface-sunken`. Jamais d'agrandissement, jamais d'ombre
  qui apparaît.
- **Appui** — `opacity: .8` sur les liens ; pas de `scale`, pas d'enfoncement.
- **Focus** — 2 px de `surface` puis 2 px de `focus-ring` (alias de `plumage`),
  sur tout élément interactif, **au clavier uniquement** (`:focus-visible`).
- **Désactivé** — `opacity: .45` et `cursor: not-allowed`, sans changement de
  couleur : un bouton désactivé reste reconnaissable.

## Mise en page

Administration en deux colonnes : navigation latérale fixe de 248 px sur
`surface-raised` avec un filet à droite, contenu à `space-12` de marge. Le bandeau
d'état global est le premier élément du contenu, avant le titre de page — il ne
flotte pas et ne se ferme pas tant que l'état dure. Les écrans d'édition se
divisent en une colonne principale et une colonne de 280–320 px pour les réglages.
Aucun élément collant en bas d'écran.

---

# Iconographie

**La source ne fixe aucune bibliothèque d'icônes.** Le dossier de marque propose,
à valider : icônes au trait, 1,5 px, 20 px dans l'interface, en `currentColor`,
**toujours accompagnées d'un libellé** — une cliente ne devine pas une icône
seule. Les pointes vives et coupes franches du logo sont un bon critère de choix.

**Substitution retenue : [Lucide](https://lucide.dev), chargé depuis CDN**
(`https://unpkg.com/lucide@0.454.0/dist/umd/lucide.js`). C'est le jeu au trait le
plus proche de la proposition : géométrie sobre, trait paramétrable réglé à 1,5,
extrémités nettes. **À confirmer par le studio** — si une autre bibliothèque est
retenue, seul `components/core/Icon.jsx` change.

- Aucun jeu d'icônes n'était fourni dans la source : aucun SVG, aucune police
  d'icônes, aucun sprite à copier. `assets/` ne contient donc que les deux logos.
- **Pas d'emoji**, nulle part — c'est une règle de voix autant que de visuel.
- **Pas de caractère Unicode en guise d'icône**, à deux exceptions assumées et
  purement décoratives : la coche ✓ de la case cochée et le chevron ▼ de la liste
  déroulante, tous deux `aria-hidden`.
- Icônes employées dans l'UI kit : `layout-dashboard`, `file-text`, `images`,
  `inbox`, `terminal`, `upload-cloud`, `image-plus`, `pencil`, `trash-2`, `eye`,
  `plus`, `check`, `arrow-right`, `rotate-cw`, `grip-vertical`, `circle-alert`,
  `triangle-alert`, `circle-dot`, `refresh-cw`, `loader`, `settings`.
- Un `Icon` unique enveloppe Lucide : c'est la seule **addition volontaire** au
  périmètre de la source (voir plus bas).

# Logo

Un colibri en vol qui butine un nuage : le produit (le colibri, léger et précis)
puise dans l'infrastructure (le nuage). Aplat monochrome, sans dégradé.

- `assets/logo-colibri.svg` — version sombre (#39362F), sur `surface` et
  `surface-raised` en thème clair.
- `assets/logo-colibri-clair.svg` — même dessin en #EEF1EC, pour le thème sombre.
- Il ne se recolore pas en `plumage` ni en `gorge`, ne s'étire pas, ne reçoit ni
  ombre ni contour. Zone de protection proposée : la hauteur du bec autour du
  dessin. Taille minimale proposée : 24 px de haut. **Zone de protection et
  taille minimale restent à valider.**
- À côté du nom : logo à gauche, hauteur = hauteur de capitale × 1,6, nom en
  Fraunces 600, « Colibri CMS ».

Le nuage porte déjà la référence à Cloudflare : il n'a pas besoin d'être orange
pour la faire. **Le logo officiel Cloudflare n'est pas inclus dans ce système** ;
s'il doit figurer, il s'ajoute tel que fourni par Cloudflare dans son kit presse,
dans un groupe d'assets « Partenaires ».

---

# Index

## Racine

| Fichier | Rôle |
| --- | --- |
| `styles.css` | Point d'entrée CSS unique — uniquement des `@import` |
| `readme.md` | Ce document |
| `SKILL.md` | Enveloppe Agent Skill pour Claude Code |
| `thumbnail.html` | Vignette du système sur la page d'accueil |

## `tokens/`

`fonts.css` (import Google Fonts + familles) · `colors.css` (deux thèmes + alias
sémantiques) · `typography.css` (échelle + classes `.cb-*`) · `spacing.css`
(grille de 4 px + alias) · `shape.css` (rayons, ombre, focus, durées) ·
`base.css` (réglages de base, liens, sélection).

## `components/` — 21 composants

**core/** — `Button`, `IconButton`, `Icon`, `Card`
**forms/** — `Field`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `Switch`, `DropZone`
**feedback/** — `StatusBadge`, `Banner`, `QuotaGauge`, `Modal`, `LogView`
**navigation/** — `NavItem`, `Tabs`
**brand/** — `Logo`, `CloudflareNote`

Chaque composant a son `.d.ts` (contrat de props) et son `.prompt.md` (quand
l'employer, exemple, variantes). Chaque dossier porte une carte
`*.card.html` visible dans l'onglet Design System.

### Additions volontaires

La source est un dossier de marque en prose : elle décrit des éléments
d'interface (boutons, champs, badges d'état, jauge, bandeaux, modales, onglets,
navigation, zone de dépôt, journal) sans fournir d'implémentation. Ces composants
suivent donc la prose au mot près. Deux ajouts n'y figurent pas explicitement :

- **`Icon`** — enveloppe du jeu Lucide, nécessaire dès qu'une icône est posée ;
  la source décrit l'usage des icônes sans nommer de bibliothèque.
- **`Field`** — l'enveloppe étiquette + aide + erreur, impliquée par les styles
  `label` et `caption` mais jamais nommée.

Aucun composant « habituel » absent de la source n'a été ajouté (pas de Toast,
pas d'Avatar, pas de Tooltip, pas de Breadcrumb).

## `ui_kits/administration/`

Recréation cliquable de l'administration : tableau de bord, liste des pages,
édition d'une page (Contenu / Photos / Réglages), médiathèque, demandes de devis,
écran Technique. Voir `ui_kits/administration/README.md`. Une seule surface
existe dans ce périmètre — le site public appartient à chaque cliente.

## `guidelines/` — 21 cartes de fondations

Couleurs (surfaces, encre, plumage, gorge, signaux, nuage, thème sombre) · Type
(Fraunces, Instrument Sans, JetBrains Mono, piles de repli) · Espace (échelle,
mise en situation, rayons, filet ou ombre, focus) · Marque (logo, interdits,
états de publication, voix, iconographie).

## `assets/`

`logo-colibri.svg`, `logo-colibri-clair.svg`. Rien d'autre : la source ne
contenait ni icônes, ni photographies, ni illustrations. **Aucun visuel n'a été
dessiné ni généré pour compléter.**

## `source/`

Copie fidèle du dossier de marque reçu, pour référence.

---

# Points à valider

1. **Iconographie** — Lucide est une substitution ; le studio doit trancher.
2. **Logo** — zone de protection et taille minimale sont des propositions.
3. **Photographies** — aucune n'a été fournie ; les vignettes sont des cadres vides.
4. **Fichiers de polices** — les trois familles viennent de Google Fonts ; aucun
   binaire n'est distribué avec ce système.
