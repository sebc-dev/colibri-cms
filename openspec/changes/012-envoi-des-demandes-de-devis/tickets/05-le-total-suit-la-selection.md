# 05 — Le total suit la sélection sur l'appareil du visiteur

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/core/formulaires/total.ts`, `src/render/Formulaire.astro`, `src/render/formulaire/module.ts`, `public/_headers`, `tests/unit/formulaires/total.test.ts`, `tests/static/formulaire-script-statique.test.ts`, `tests/parcours/formulaire-total.parcours.ts`

## Ce que ça livre

Le visiteur voit le total de sa sélection (FR-052) : la somme des prix des options choisies dans les
champs avec prix (FR-053), en euros, exacte au centime. Le total se recalcule à **chaque changement de
sélection, sur son appareil**, sans aucun échange avec le serveur et sans rechargement (FR-054) :
- une option d'un champ sans prix ne change pas le total ;
- sans aucune option choisie, le total vaut 0 € ;
- 10,50 € + 0,20 € font 10,70 €.

C'est le **premier script du site public**. C'est un module servi par le site lui-même, présent sur les
seules pages qui portent un formulaire :
- une page sans formulaire ne porte toujours aucun script ;
- une page avec formulaire ne porte que ce module, chargé depuis le site, et aucun script écrit dans la
  page.

La politique de sécurité du site public n'admet de script que du site lui-même.

**Préalable.** La retouche des tests du site public est faite à la main dans une PR distincte, fusionnée
**avant** ce ticket. Elle réécrit `SC-07a` et `SC-07b` de `tests/static/site-public-statique.test.ts`,
`SC-07a` de `tests/parcours/site-public.parcours.ts` et `SC-08b` de
`tests/integration/apercu-d-une-page.test.ts`, dans la forme que la nouvelle règle garde :
- pas de script sur une page sans formulaire ;
- `script-src` et `connect-src` limités à `'self'` ;
- comparaison de l'aperçu qui ignore les scripts.

Ce ticket ne modifie **aucun** test existant.

**Décisions à respecter (ADR-0029, D3–D5 de l'approche) :**
- **`src/core/formulaires/total.ts`**, pur : `totalDeLaSelection(formulaire, selection)` rend des
  **centimes entiers**. C'est la somme des prix des options choisies dans les champs avec prix, sans
  aucun nombre à virgule flottante (ADR-0018). Le module du navigateur l'appelle, et la route d'envoi la
  réemploiera (ticket 07). L'affichage passe par `formaterPrix` (`src/core/formulaires/prix.ts`) suivi de
  « € » (« 10,50 € », « 39 € »).
- **Le module.** `src/render/formulaire/module.ts` est déclaré par un `<script>` de
  `src/render/Formulaire.astro`. Astro l'empaquette en **fichier externe** :
  `build.assetsInlineLimit` exclut déjà tout `.js` de la mise en ligne. Astro ne rend le script d'un
  composant que sur les pages qui rendent ce composant.
- **Ce que fait le module.** Il lit les prix en centimes et les natures dans les attributs `data-*` posés
  par le ticket 03. Il n'écrit qu'en texte (`textContent`), jamais par `innerHTML`, et n'emploie aucun
  `eval`. Il rend visible le bloc du total, « Total estimé : 39 € », annoncé poliment aux lecteurs
  d'écran (`aria-live="polite"`). Le bouton d'envoi reste inactif : il s'active avec l'envoi (ticket 07).
- **Sans script, le total est masqué** (état « sans script » de `ux.md`). Le ticket 03 dessine le
  bloc du total visible, à « 0 € ». Ce ticket le pose masqué dans le document (`hidden`) : un
  visiteur sans JavaScript ne voit que les champs, les options, les prix et le message sans script.
  Le module le rend visible au chargement.
- **Aucun framework.** Pas d'îlot Svelte, pas de directive `client:*` (I16).
- **`public/_headers`.** La politique gagne `script-src 'self'` et garde `default-src 'none'`,
  `form-action 'none'` et `frame-ancestors 'none'`. Elle n'admet ni `'unsafe-inline'`, ni hôte tiers.
  `connect-src 'self'` arrive avec l'envoi (ticket 07).
- **Aperçu.** Il est servi sous la politique de l'administration, qui admet déjà `script-src 'self'`
  (I12). Le total y fonctionne donc aussi.
- **Garde des parcours.** `tests/parcours/garde-politique.ts` fait échouer tout parcours qui heurte la
  politique : c'est elle qui prouve que `script-src 'self'` suffit.
- **Cas limites à couvrir :**
  - une option à 0 ;
  - le prix maximal 9 999 999 centimes ;
  - les centimes ;
  - un choix multiple avec prix, toutes options cochées ;
  - aucune option choisie.

**Hors périmètre :**
- l'envoi et l'activation du bouton (ticket 07) ;
- `connect-src` (ticket 07) ;
- le brouillon dans l'aperçu (ticket 06).

## Critères
- [ ] Quand le visiteur choisit « Chocolat » (9 €) dans « Parfum » et « 10 parts » (30 €) dans « Nombre de parts », le total affiché est 39 €   (SC-05a)
- [ ] Quand le visiteur, après avoir obtenu un total de 39 €, remplace « Chocolat » par « Fraise » (10 €), le total affiché devient 40 €, sans action de sa part ni rechargement de la page   (SC-05b)
- [ ] Quand le visiteur change sa sélection plusieurs fois, aucune requête ne part de son appareil vers le serveur   (SC-05c)
- [ ] Quand le visiteur coche « Mariage » dans « Occasion », champ sans prix, le total affiché est inchangé   (SC-05d)
- [ ] Quand le visiteur ouvre la page sans avoir rien choisi, le total affiché est 0 €   (SC-05e)
- [ ] Quand le visiteur choisit une option à 10,50 € et une option à 0,20 €, le total affiché est 10,70 €   (SC-05f)
- [ ] Quand une page publique qui ne pose aucun formulaire est servie, elle ne porte aucun script, et chacune de ses ressources — feuille de style, images — est servie par le site lui-même   (SC-05g)
- [ ] Quand une page publique qui pose un formulaire est servie, son seul script est le module du formulaire, chargé depuis le site lui-même, aucun script n'est écrit dans la page, et aucune de ses ressources ne vient d'une autre origine   (SC-05h)
- [ ] Quand une page publique est servie, sa politique de sécurité de contenu n'admet de script, de ressource et d'échange que du site lui-même, et n'admet aucun script écrit dans la page   (SC-05i)
