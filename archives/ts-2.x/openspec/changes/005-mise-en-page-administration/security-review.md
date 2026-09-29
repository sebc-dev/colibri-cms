## Surface

Ce change n'ajoute **aucune route, aucune entrée externe, aucun secret, aucune donnée**. Sa surface
tient en cinq points, tous sur l'origine commune qui porte le cookie de session :

1. **Trois dépendances nouvelles** — `@fontsource/fraunces`, `@fontsource/instrument-sans`,
  `@fontsource/jetbrains-mono` (ADR-0016) : des feuilles `@font-face` et des fichiers `.woff2`, aucun
  code exécuté, ni au build ni dans le navigateur.
2. **Un module de script nouveau** — `src/admin/cadre.ts` (repli et tiroir) : lit et écrit une seule
  clé de `localStorage`, ouvre et ferme un `<dialog>` ; aucune requête.
3. **Du balisage servi nouveau** — le cadre, le logo en SVG écrit dans la page, le modèle de la marque
  de brouillon dans un `<template>`, l'adresse de chaque page dans « Mes pages ».
4. **Le renvoi de l'accueil** — `/admin/` renvoie vers `/admin/mes-pages`.
5. **Deux écrans retirés** — `/admin/ilots` et `/admin/cadre`, et les îlots qu'eux seuls montaient.

## Menaces

- **XSS par le balisage du cadre ou des écrans** — le titre d'une page et son adresse viennent de la
  déclaration de l'intégrateur, le nom et la description d'une image viennent de l'éditrice. Un rendu
  brut (`set:html`, `{@html}`, `innerHTML`) les rendrait exécutables sur l'origine du cookie.
- **Chaîne d'approvisionnement** — une version compromise d'un paquet `@fontsource` pourrait livrer
  autre chose que des polices.
- **Contenu actif dans le logo** — un SVG écrit dans la page peut porter un `<script>`, un gestionnaire
  `on…` ou une référence externe.
- **Renvoi ouvert** — un renvoi dont la cible se lirait dans la requête enverrait l'éditrice ailleurs.
- **Clonage de la marque de brouillon** — un clonage qui assemblerait du texte en HTML reproduirait la
  menace XSS côté navigateur.
- **Affaiblissement de la politique de sécurité pour faire passer l'habillage** — `unsafe-inline` dans
  `style-src`, une origine de polices, `data:` dans `font-src` ou `img-src`.

## Mitigations

- **Rendu échappé partout** : titres, adresses, noms et descriptions passent par l'interpolation
  d'Astro ou de Svelte, qui échappe ; aucun `set:html` ni `{@html}` hors `src/render/markdown/` (`I5`).
  Le module `cadre.ts` ne manipule que des attributs et des états, jamais du HTML.
- **Clonage sans assemblage** : `afficherPastilleDeBrouillon` clone le contenu du `<template>`
  (`content.cloneNode(true)`) ; aucun `innerHTML`. Le modèle est un texte fixe rendu par le serveur.
- **Dépendances bornées** : versions figées dans le lockfile, installées par `npm ci` ;
  `min-release-age=7` écarte une version de moins de sept jours ; seuls sept fichiers `.css`
  ciblés sont importés, jamais un point d'entrée JavaScript. La revue du ticket qui les ajoute
  vérifie que rien d'autre qu'une feuille n'est importé.
- **Logo inerte** : le SVG entre réécrit à la main dans `Logo.astro` — tracés seuls, `fill` en
  `currentColor` ; la revue vérifie l'absence de `<script>`, d'attribut `on…`, de `href` et de
  `<foreignObject>`.
- **Renvoi fixe** : la cible du renvoi de l'accueil est une chaîne littérale ; le garde de session
  (`I6`) s'exécute avant.
- **Politique de sécurité intacte** : `src/platform/entetes/middleware.ts` n'est pas dans le
  périmètre ; `I11`, `I12`, `I14`, `I15` sont bloquants en review. Un habillage qui ne passe pas sous
  la CSP réelle se corrige dans l'habillage, jamais dans la politique.
- **Surface réduite** : le retrait des écrans de démonstration enlève deux routes gardées et deux
  îlots sans usage.

## Données

Aucune donnée personnelle nouvelle. La seule écriture est la préférence de repli, en `localStorage`
sur l'appareil (`'0'` ou `'1'`), déjà présente avant ce change et conservée sous la même clé ; elle ne
quitte jamais l'appareil.
