# ADR-0016 : Les polices de l'administration sont servies en même origine, par les paquets `@fontsource`
Statut : Accepté | Date : 2026-09-25

## Contexte

ADR-0015 a fait des tokens Colibri le thème de l'administration, et a laissé une chose de côté :
le chargement des trois familles du canvas — **Fraunces** (titres), **Instrument Sans**
(interface), **JetBrains Mono** (adresses de pages). Le canvas les charge depuis Google Fonts
(`tokens/fonts.css`, un `@import` vers `fonts.googleapis.com`). En attendant, l'administration
s'affiche dans les polices de secours : les tailles sont justes, le caractère ne l'est pas.

La politique de sécurité de l'administration ferme déjà cette voie : `default-src 'none'`,
`style-src 'self'`, `font-src 'self'` (`POLITIQUE_DE_SECURITE`, `src/platform/entetes/middleware.ts`).
Une feuille ou un fichier de police d'une autre origine est bloqué par le navigateur. Et le rouvrir
irait contre trois choses que le projet tient :

- **même origine pour tout** : le site public et l'administration partagent un Worker ; chaque
  origine tierce ajoutée à la politique est une confiance donnée à un service qui n'appartient pas
  à la cliente (`SEC-1`, `SEC-3`) ;
- **réversibilité** : un site qui dépend d'un service tiers pour s'afficher correctement ne survit
  pas tout entier dans le dépôt de la cliente (`ARCH-1`, `SC-011`) ;
- **aucun échange avec Google à l'ouverture de l'administration** : l'adresse IP de l'éditrice
  n'a pas à partir chez un tiers pour afficher un titre.

Les trois familles sont sous licence **SIL Open Font License 1.1**, qui autorise la
redistribution. Elles existent en paquets npm `@fontsource/*` (5.3.0 au 2026-09-25), qui livrent
les fichiers `.woff2` découpés par alphabet et par graisse, avec leurs `@font-face`.

## Décision

1. **Les polices de l'administration sont servies par le Worker lui-même**, depuis les paquets
   `@fontsource/fraunces`, `@fontsource/instrument-sans` et `@fontsource/jetbrains-mono`, ajoutés
   aux dépendances du projet. `src/admin/admin.css` importe leurs feuilles ; au build, Vite copie
   les fichiers `.woff2` dans `/_astro/` sous un nom haché, et ils partent avec le reste des
   ressources statiques.
2. **Seules les graisses du canvas, dans l'alphabet latin** : Fraunces 400 et 600, Instrument Sans
   400, 500 et 600, JetBrains Mono 400 et 500 — sept fichiers. Le sous-ensemble « latin » couvre
   le français, `œ` compris. On importe la feuille par graisse et par alphabet, jamais la feuille
   d'index du paquet, qui tire toutes les graisses et tous les alphabets.
3. **Des fichiers statiques, pas des polices variables.** Une graisse de plus devient une décision
   visible dans `admin.css`, pas une valeur possible par accident.
4. **La politique de sécurité ne change pas** : `font-src 'self'` reste tel quel, aucune origine
   n'est ajoutée.
5. **Le site public n'est pas concerné.** Sa typographie appartient aux gabarits de l'intégrateur ;
   `admin.css` n'est jamais importé par une page publique (ADR-0009).

## Conséquences

**Positives.**

- **Le caractère du canvas arrive dans l'administration** sans rouvrir la politique de sécurité :
  la solution tient dans les règles déjà posées.
- **Tout ce qui affiche l'administration vit dans le dépôt de la cliente** et dans son Worker —
  aucun service tiers à l'ouverture d'un écran.
- **Le cache suit le reste** : les fichiers hachés de `/_astro/` sont immuables, un changement de
  version change leur nom.
- **Les piles de repli d'ADR-0015 restent** derrière chaque famille : si un fichier manque, l'écran
  reste lisible.

**Négatives — ce à quoi le code s'engage.**

- **Trois dépendances de plus**, qui ne portent que des fichiers de police et des feuilles, sans
  code exécuté. Elles tombent sous `min-release-age=7` : une version publiée depuis moins de sept
  jours ne s'installe pas.
- **Environ 130 Ko de polices** au premier chargement de l'administration — sept fichiers de 17 à
  22 Ko, mesurés sur les paquets 5.3.0 —, une seule fois par version. L'administration n'est pas mesurée par `SC-005` ; ce poids ne doit jamais
  atteindre une page publique.
- **Fraunces perd son axe de taille optique** (`opsz`), que la version variable portait et que le
  canvas demandait (`9..144`) : les deux tailles du canvas où elle sert (40 px et 28 px) se rendent
  à la taille optique par défaut. Écart visuel faible, assumé.
- **Un fichier de police ne doit jamais être intégré en `data:`** : Vite intègre en ligne les
  ressources de moins de 4 Ko, et `font-src 'self'` bloquerait une police intégrée ainsi. Les
  sept fichiers retenus dépassent ce seuil (le plus petit fait 16,9 Ko) ; un sous-ensemble plus
  petit à l'avenir obligerait à régler `build.assetsInlineLimit`.
- **Les tests `workerd` ne voient pas les polices** : ils n'appliquent ni feuille ni politique de
  sécurité. Que la police s'affiche se constate dans un navigateur, sur l'artefact bâti.
- **Le troisième écart de `docs/design-system.md`** (polices et icônes chargées depuis d'autres
  origines) est tranché pour les polices. Les icônes l'étaient déjà : `@lucide/svelte` est une
  dépendance compilée avec les îlots (ADR-0009). `docs/design-system.md` se met à jour avec le
  change qui applique cette décision.

## Alternatives considérées

- **Ajouter `fonts.googleapis.com` et `fonts.gstatic.com` à la politique de sécurité** : écartée
  — une origine tierce de confiance sur l'origine qui porte le cookie de session, une dépendance
  à Google pour afficher l'administration, et l'adresse de l'éditrice transmise à chaque ouverture.
- **Versionner les `.woff2` et la licence dans le dépôt, `@font-face` écrits à la main** : écartée
  — aucune dépendance nouvelle, mais une mise à jour de police devient un geste manuel sans outil,
  et l'écriture des `@font-face` une source d'erreur que les paquets évitent.
- **Renoncer aux familles et garder les polices du système** : écartée — le canvas fait autorité
  sur la marque (`docs/design-system.md`), et la chaleur de Fraunces est ce qu'il cherche pour les
  titres.
- **Ne pas servir JetBrains Mono** : écartée — deux fichiers de moins, contre un écart visible sur
  les adresses de pages.
- **Polices variables** (`@fontsource-variable/*`) : écartée — moins de fichiers mais chacun plus
  lourd, et toutes les graisses deviennent utilisables sans décision.

## Vérifiable ?

En partie. Que `admin.css` n'importe aucune URL d'une autre origine est déjà tenu par `I14`
(ADR-0015). Que `font-src` n'admette que `'self'` se lit dans la valeur de `POLITIQUE_DE_SECURITE`.
Que les imports `@fontsource` visent une graisse et un alphabet — jamais la feuille d'index —
se lit dans `admin.css`. Que la police s'affiche relève de la recette sur l'artefact bâti.
