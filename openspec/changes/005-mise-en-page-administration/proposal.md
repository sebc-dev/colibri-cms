## Why

L'administration fonctionne mais n'a ni mise en page ni identité : des écrans en balisage nu sur la
palette grise du registre, une barre latérale qui n'apparaît qu'une fois le script exécuté, et un
accueil en impasse — après la connexion, l'éditrice lit « Vous êtes connectée. » et ne trouve aucun
lien pour continuer. Or SC-003 et SC-015 se jugent sur une éditrice qui agit **seule, du premier
coup**, y compris après trois mois sans usage (UX-2) : un écran qui ne dit pas où agir, ni ce qui est
en ligne et ce qui ne l'est pas, les met en échec. Le canvas Colibri, qui fait autorité sur la marque,
est désormais adopté en principe (ADR-0015 pour le thème, ADR-0016 pour les polices) : ce change
l'applique.

Sert **Epic A — Entrer et éditer** (`docs/roadmap.md`), sur le modèle de 002 : **aucun FR propre**,
substrat des features d'édition — SC-003, SC-015, UX-1, UX-2, sous FR-117. La story **005 — Mise en
page de l'administration** reste à inscrire dans `docs/roadmap.md` (Epic A) au moment de son archivage.

## What Changes

- **Le thème Colibri remplace le thème « neutral »** : neutres chauds, une seule couleur d'action
  (`plumage`), une couleur réservée à « modifié, non publié » (`gorge`), signaux `ambre` / `danger` /
  `info`, grille de 4 px, coins tenus, échelle typographique du canvas — un seul thème, clair
  (ADR-0015).
- **Les polices Fraunces, Instrument Sans et JetBrains Mono** sont servies par le site lui-même, sans
  aucun appel à un service tiers (ADR-0016).
- **Le cadre de l'administration arrive avec l'écran** : logo, menu des rubriques et zone de contenu
  sont présents dès l'affichage, au lieu d'apparaître après coup. La rubrique de l'écran courant reste
  marquée, et le repli en rail d'icônes reste une préférence retenue sur l'appareil.
- **Un parcours téléphone complet** : en dessous d'une largeur d'écran de tablette, le menu devient un
  tiroir qui s'ouvre par un bouton et se ferme de lui-même après le choix d'une rubrique ; chaque
  élément qu'on touche offre une cible d'au moins 44 px ; chaque écran — la liste des pages,
  l'éditeur d'une page, les médias, la fiche d'une image, la connexion — se lit et s'utilise sur une
  seule colonne, sans défilement horizontal.
- **L'accueil n'est plus une impasse** — **BREAKING** au regard de la spec `connexion-par-code` :
  `/admin/` mène à « Mes pages », y compris juste après l'ouverture de session.
- **Chaque écran servi est habillé** selon le canvas : connexion, liste des pages, éditeur d'une page
  et de ses emplacements, médias, fiche d'une image. L'état d'une page qui porte un **brouillon** se
  lit en `gorge`, partout pareil ; l'action principale d'un écran se lit en `plumage`.
- **Les deux écrans de démonstration du socle** (`/admin/ilots`, `/admin/cadre`) sont **retirés** :
  ils n'ont servi qu'à prouver le socle (002, 003), et le cadre qu'ils montrent n'est plus celui du
  produit. Les écrans réels portent désormais ces preuves.
- **La lisibilité se garantit par construction** : chaque texte atteint un contraste de 4,5:1 sur son
  fond, chaque élément qu'on atteint au clavier montre où se trouve le focus.

Hors-périmètre :
- Les écrans que le canvas dessine et que le produit n'a pas encore — tableau de bord, demandes,
  « Technique », création de page — ainsi que le **bandeau d'état de publication** : il naît avec
  « Aperçu et publication ».
- Le thème sombre (écarté par ADR-0015) et tout réglage d'apparence offert à l'éditrice.
- Le site public : sa présentation appartient aux gabarits de l'intégrateur.
- Toute règle nouvelle de contenu ou de publication : aucun geste de l'éditrice n'est ajouté ni
  retiré, seulement la manière dont il se présente.

## Capabilities

### New Capabilities
- `mise-en-page-administration` : l'identité visuelle commune de l'administration (thème Colibri,
  polices servies en même origine, couleurs d'état), la lisibilité garantie (contraste, focus
  visible), et l'usage sur écran étroit (menu en tiroir, cibles tactiles, une colonne sans
  défilement horizontal) pour chaque écran servi, connexion comprise.

### Modified Capabilities
- `pages-et-emplacements` : le **cadre de navigation** est présent dès l'affichage de l'écran et
  porte le logo ; sur écran étroit, il devient un tiroir au lieu d'une barre repliable.
- `connexion-par-code` : l'**accueil** ne reste plus vide de fonction — il mène à « Mes pages », et
  l'ouverture de session y conduit.

## Impact

- **Code** : `src/admin/admin.css` (thème), `src/admin/Gabarit.astro` (cadre commun), les écrans de
  `src/pages/admin/` (connexion, accueil, mes-pages, éditeur, médias, fiche), les îlots de
  `src/admin/ilots-svelte-5/` qui enveloppaient eux-mêmes le cadre (`Cadre.svelte`, `EcranMedias`,
  `EcranFicheMedia`) et le point de montage `monter.ts` ; composants shadcn-svelte ajoutés sous
  `src/admin/composants/ui/` au fil des besoins.
- **Dépendances** : `@fontsource/fraunces`, `@fontsource/instrument-sans`,
  `@fontsource/jetbrains-mono` (ADR-0016).
- **Tests existants** : les tests qui figent l'accueil affiché, le point de montage du cadre et une
  ligne de « Mes pages » réduite à son titre (`tests/integration/code-ouvre-la-session.test.ts`,
  `tests/integration/liste-des-pages.test.ts` SC-02e et SC-02a) sont **remplacés** par ceux des
  nouveaux scénarios — jamais affaiblis ; ils sont retirés par une PR directe avant les tickets. Le
  test statique de l'accueil (`tests/static/gabarits-admin.test.ts`) reste vrai tel quel.
- **Politique de sécurité** : inchangée ; `I12`, `I14`, `I15` tiennent.
- **Documentation durable** : `docs/design-system.md` (thème adopté, trois écarts tranchés) se met à
  jour à l'archivage du change, pas au fil des tickets.
