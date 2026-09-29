# ADR-0013 : La profondeur des tests se mesure par la mutation, pas par la couverture
Statut : Accepté | Date : 2026-09-10

## Contexte
La Definition of Done (`docs/test.md`) exige une **preuve**, et la review du cycle porte une dimension
« couverture ». Le projet a donc besoin d'un **indicateur de profondeur** : les tests *assertent*-ils,
ou se contentent-ils d'*exécuter* ? `docs/test.md` pose déjà la moitié de la réponse — la couverture
mesure l'exécution, jamais l'assertion — mais il restait à nommer ce qui, dans ce dépôt, peut tenir
lieu d'indicateur.

Un fait d'architecture tranche la question, et il découle d'ADR-0003. L'oracle est `workerd` contre
les liaisons réelles ; l'artefact sous test est donc le **worker bâti** — `pretest` lance
`npm run build`, et `wrangler.jsonc` désigne `.wrangler/test-worker/` en `main`. L'étage d'intégration
(`tests/integration/**`) atteint le produit par `SELF.fetch`, c'est-à-dire **à travers le bundle**.

La couverture ne voit donc pas le produit, et ce n'est pas un défaut de réglage. Relevé du 2026-09-10
(`coverage/lcov.info`, fournisseur `istanbul`) : **33 entrées mesurées — 10 fichiers sous `src/`,
20 chunks bâtis aux noms hachés sous `.wrangler/test-worker/server/chunks/`, 3 `page.json` de
contenu**. Les 10 fichiers `src/` sont exactement ceux qu'un test statique ou unitaire **importe**
directement. Le dépôt porte 52 fichiers source sous `src/` : **42 sont invisibles en tant que
sources**. Tout ce que `SELF.fetch` exerce — routes, middleware, pages d'administration — n'est mesuré
que sous forme de chunk.

L'instrumentation porte sur ce qui est **chargé**, donc sur le bundle ; le remappage vers les sources
n'a jamais lieu (piste mesurée, voir Alternatives) ; et le fournisseur qui lirait la couverture depuis
le moteur a besoin de `node:inspector`, que `workerd` ne fournit pas de façon fonctionnelle — d'où le
fournisseur `istanbul` de `vitest.config.ts`. **L'angle mort suit l'oracle d'ADR-0003, pas un
réglage** : il ne se corrigera pas en changeant une option.

## Décision
Nous prendrons le **score de mutation** comme indicateur de profondeur des tests, et la **couverture
restera informative — produite, jamais décisionnelle**.

La mutation est la seule mesure qui **traverse le build** : elle s'applique à la **source avant la
construction**, si bien que le mutant est emporté par le build jusque dans le worker bâti et se trouve
exercé par l'étage d'intégration. Elle atteint donc ce que `SELF.fetch` exerce, là où la couverture ne
voit que des chunks. Et elle répond à la bonne question : un mutant ne meurt que si une **assertion**
le discrimine.

Le **périmètre muté est `core/` et `platform/`** (`stryker.conf.json`, 19 fichiers) — la logique qui
s'instancie sans plateforme (`C5` / `I2`), là où un oracle est bon marché.

**Aucun seuil de couverture ne sera posé sur une mesure visant le bundle.** Si un seuil vient un jour,
il ne pourra porter que sur le périmètre que la couverture mesure réellement comme des sources — les
fichiers qu'un test importe directement — et il n'attestera même là que l'exécution.

Un score de mutation n'a par ailleurs valeur d'indicateur qu'à **deux conditions**, faute de quoi il
flatte : que le rejeu soit assez rapide pour que les mutants ne périment pas, et que la politique de
péremption soit connue de qui lit le chiffre.

## Conséquences
**Positives.**
- **L'indicateur mesure l'assertion, pas l'exécution.** C'est la question à laquelle la couverture ne
  peut pas répondre, et la seule qui distingue un test d'un appel de fonction.
- **Il atteint le produit tel qu'il est testé.** En mutant la source avant le build, il est la seule
  mesure qui rejoint l'étage d'intégration — celui qui porte l'essentiel du comportement.
- **L'angle mort est nommé, pas maquillé.** Rien ne prétend que les 42 fichiers invisibles à la
  couverture sont testés ; le rapport les montre pour ce qu'ils sont.
- **Le périmètre épouse une frontière déjà tenue.** `core/` et `platform/` sont exactement ce qui
  s'instancie sans base, sans HTTP, sans Worker.

**Négatives — ce à quoi le code s'engage.**
- **Un rejeu de mutation est cher, et c'est structurel ici.** Chaque mutant réclame la suite, et la
  suite rebâtit le worker. Rendre l'indicateur honnête, c'est rendre le rejeu assez bon marché pour
  qu'aucun mutant ne périme — un travail que cette décision engage, faute de quoi le chiffre ne vaut
  rien.
- **Un mutant périmé compte comme détecté.** Une péremption sous-dimensionnée gonfle donc le score :
  le nombre n'est pas lisible sans sa politique de péremption, et un score haut peut ne rien attester.
- **Outil manuel, aucun portail.** Aucun workflow ne le joue (`docs/ci.md`) : le score est un constat
  de session, pas un signal continu. Rien ne détecte une régression entre deux rejeux.
- **Deux artefacts de mesure cohabitent, dont un qui ne décide de rien.** Qui lira `coverage/lcov.info`
  sans cet ADR pourra conclure que le projet est peu testé — le rapport ne dit rien de tel.
- **Ce qui vit dans une route n'est atteint par aucune des deux mesures.** La mutation ne couvre le
  chemin exercé par `SELF.fetch` que dans la part de logique qui réside en `core/` ou `platform/` ; un
  comportement écrit dans le fichier de route lui-même n'a ni couverture lisible, ni mutant.

## Alternatives considérées
- **Poser un seuil de couverture** : écartée car sur l'étage qui porte l'essentiel du comportement, la
  mesure vise le bundle. Un chiffre calculé sur des chunks aux noms hachés ne dit rien de `src/` — le
  seuil serait un mensonge chiffré, et il se durcirait en obligation.
- **Ramener la couverture sur `src/` par les sourcemaps** : écartée, et **mesurée**. Les `.map` produits
  sont corrects (sources réelles, `sourcesContent`), mais le remappage n'a jamais lieu : activer les
  sourcemaps fait disparaître les chunks du rapport sans rien ajouter à `src/`, et la variante en ligne
  ne termine pas (tuée à 20 min contre ~50 s pour un rejeu normal). Effet de bord si la piste revenait :
  des `.map` atterrissent dans `dist/client/_astro`, donc servis au public. **Condition de réouverture** :
  qu'un remappage attribue démontrablement une ligne de chunk à sa source.
- **Le fournisseur de couverture V8** : écartée car close par le runtime — il a besoin de
  `node:inspector`, que `workerd` ne fournit pas de façon fonctionnelle. **Condition de réouverture** :
  que `workerd` l'implémente réellement ; c'est une décision du runtime, pas de l'outil de test.
- **Exclure les chunks bâtis du rapport de couverture** : écartée car le rapport paraîtrait plus propre en
  mesurant beaucoup moins. Ce serait cacher l'angle mort au lieu de le nommer.
- **Renoncer à tout indicateur de profondeur** : écartée car la DoD réclame une preuve et la review
  porte une dimension « couverture » ; sans indicateur falsifiable, la profondeur ne repose plus que
  sur le jugement de qui relit.

## Vérifiable ?
En partie. `npm run mutation` produit un score réel et rejouable — c'est la trace mécanique de la
décision. Mais **aucun portail ne l'exige** : c'est un outil manuel, aucun seuil n'y est attaché, et le
chiffre n'est lisible qu'avec sa politique de péremption. Le volet négatif — « aucun seuil de couverture
sur une mesure visant le bundle » — n'a **aucune trace mécanique** : il se tient en review.
