## Niveaux

Ce change est **transverse** et **visuel** : la moitié de ses scénarios porte sur ce que la réponse
HTTP contient, l'autre moitié sur ce qu'un navigateur affiche. Les tests `workerd` n'appliquent ni
feuille de style ni politique de sécurité (constat de 002 et de la PR #72) : ils ne peuvent rien dire
de l'aspect. D'où trois niveaux :

- **Intégration `workerd`** (`SELF.fetch`, comme `tests/integration/liste-des-pages.test.ts`) — la
  **structure** : le cadre dans la réponse, la rubrique marquée, le renvoi de l'accueil, les attributs
  des champs, la marque de brouillon et son modèle, l'absence d'origine tierce dans le balisage.
- **Statique** (lecture de source, comme `tests/static/gabarits-admin.test.ts`) — ce qui se lit dans
  le code : `admin.css` sans `@import` d'URL absolue ni feuille d'index `@fontsource`, aucune couleur
  littérale sous `src/admin/` hors `admin.css` (`I14`), aucune directive `client:*` (`I4`),
  `Cadre.svelte` et les écrans de démonstration absents.
- **Observé sur l'artefact bâti** (`npm run build`, puis `wrangler dev` sur le résultat — jamais
  `npm run dev`, dont le CSS injecté par script est bloqué par la CSP) — l'**aspect** : thème, polices
  effectivement appliquées, contraste, focus, 360 px, cibles tactiles, tiroir, console sans violation.

Chaque ticket d'écran se scinde donc en critères de **structure** (mode `test`) et d'**aspect** (mode
`observé`) ; `strategie-verif` tranche à la décomposition.

## Oracle

| Scénario | Oracle |
|---|---|
| L'accueil mène à « Mes pages » ; l'ouverture de session y conduit | statut 302 et `location` = `/admin/mes-pages` ; suivre la chaîne depuis la connexion |
| Le cadre est présent dès l'affichage | le corps de la réponse contient le logo, les cinq libellés, `aria-current="page"` sur la bonne rubrique (liste, éditeur → Mes pages ; médias, fiche → Médias), et le contenu de l'écran dans `<main>` |
| Aucune autre rubrique n'est servie | Réglages, Formulaires, Demandes : aucun `href` dans la réponse |
| Le clavier suit le champ | `type="email"`, `autocomplete="email"` sur l'adresse ; `autocomplete="one-time-code"` sur le code |
| La marque de brouillon, même présentation | la réponse porte le `<template id="modele-marque-brouillon">`, et la marque rendue par le serveur est identique à son contenu |
| Aucun appel à une autre origine | balisage : aucun `src`/`href` absolu hors origine ; navigateur : onglet réseau, toutes les requêtes sur l'origine de l'écran |
| Les trois familles appliquées | navigateur : `document.fonts` rapporte Fraunces, Instrument Sans, JetBrains Mono chargées ; police calculée des trois éléments témoins |
| Contraste | mesure par l'outil d'accessibilité du navigateur (ou axe-core lancé à la main) sur chaque écran : aucun texte sous 4,5:1 |
| Aucun défilement horizontal à 360 px | navigateur à 360 px : `document.documentElement.scrollWidth` ≤ 360 sur chaque écran |
| Cibles tactiles | navigateur à 360 px : boîte de chaque élément actionnable ≥ 44 × 44 px |
| Tiroir, repli, focus, animations réduites | parcours au clavier et au toucher, émulation `prefers-reduced-motion` |

## Cas limites

- **Rubrique courante** : les quatre écrans cadrés — deux par rubrique, dont deux écrans « enfants »
  (éditeur, fiche) qui doivent marquer leur rubrique parente.
- **Accueil** : avec session valide (renvoi vers « Mes pages ») ; sans session (renvoi vers la
  connexion, inchangé) ; session expirée.
- **Marque de brouillon** : page sans brouillon (absente), avec brouillon au rendu (présente),
  brouillon né d'un enregistrement sans recharger (apparaît une fois, pas deux).
- **Largeurs** : 360 px (plancher), 767 px (dernier écran étroit : tiroir), 768 px (premier écran
  large : barre latérale), 1280 px.
- **Contenu long** : titre de page long, nom d'image long, adresse de destination longue — aucun
  débordement horizontal à 360 px.
- **Listes vides** : « Mes pages » vide, « Médias » vide — le message d'état vide reste lisible dans
  le nouveau cadre.
- **Préférence de repli** : absente, `'1'`, `'0'`, stockage indisponible (navigation privée).
- **Police absente** : un `.woff2` bloqué dans l'onglet réseau — texte visible en police de repli.

## Doubles

Aucun double nouveau. Les tests d'intégration réutilisent la base D1 locale de Miniflare et les
fixtures de pages déclarées existantes, comme 003 et 004. La session s'ouvre par les aides déjà
présentes dans `tests/integration/`.

## Zones sans test automatisé

- **Aspect** (thème, polices appliquées, contraste, focus, 360 px, cibles tactiles, tiroir,
  animations) : mode `observé`, preuve par captures et relevés sur l'artefact bâti. Aucun navigateur
  sans tête n'est câblé au projet ; en introduire un sortirait du périmètre.
- **Clavier du téléphone et absence d'agrandissement à la saisie** : se constatent sur un vrai
  téléphone — `humanCheckRequired`.
- **UX2 (un brouillon se voit d'un coup d'œil)** et **UX3 (tout au pouce)** : relèvent du test d'usage
  de SC-003, joué par un humain.

## Tests existants remplacés

Remplacés par les tests des nouveaux scénarios, **jamais affaiblis** :

- `tests/integration/code-ouvre-la-session.test.ts` — « le cookie rendu donne ensuite accès à
  l'accueil » (attend 200 et « Vous êtes connectée. ») et « l'accueil affiché ne porte aucun
  formulaire, bouton ni lien » → le renvoi vers « Mes pages ».
- `tests/integration/liste-des-pages.test.ts` — SC-02e « le point de montage du cadre est présent » →
  « Le cadre est présent dès l'affichage », qui vérifie le menu lui-même.
- `tests/integration/liste-des-pages.test.ts` — SC-02a « une ligne par page déclarée, dans l'ordre
  posé » (exige qu'un `<li>` contienne exactement le titre, ce qu'empêche l'adresse de la page ajoutée
  sous le titre) → « « Mes pages » montre l'adresse de chaque page », qui reprend la garantie d'ordre.

Les quatre tests périmés sont retirés par une **PR directe, avant les tickets** : la ceinture du run
(aucun test existant retiré ni affaibli) traiterait leur retrait comme une neutralisation. Chaque
ticket n'**ajoute** donc que des tests ; son remplaçant se lit dans le ticket qui change le
comportement, la PR directe citant, pour chaque test retiré, le ticket qui le remplace.
