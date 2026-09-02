# 03 — Le graphe d'imports interdit qu'un îlot public importe un composant d'administration

**Bloqué par :** 02
**Vérif :** observé — sortie de `npm run lint:boundaries` (contrôle ESLint, hors du `npm test`
vitest du projet) flageant un import public→admin délibéré, et constat sur l'artefact de build pour
le poids public : ni l'un ni l'autre n'est un test unitaire.
**Fichiers :** `eslint.config.boundaries.js`, fixture éventuelle sous `src/site` et `src/admin`

## Ce que ça livre
Le contrôle `boundaries` classe et scanne aussi les fichiers `.svelte` — il ne voit aujourd'hui que
`src/**/*.ts` — de sorte que la frontière « base d'administration hors des îlots publics »
(ADR-0009, invariant I1) **mord réellement** : un îlot de `src/site` qui importerait un composant de
la base `src/admin` est falsifié statiquement. Le poids envoyé sur les pages publiques n'augmente
pas du fait du socle d'administration, comme SC-005 le mesure.

## Critères
- [x] `eslint.config.boundaries.js` (contrôle `boundaries`) classe et scanne les fichiers `.svelte`,
      pas seulement `src/**/*.ts`.
- [x] Un import délibéré, depuis un îlot de `src/site`, d'un composant de `src/admin` est signalé en
      erreur par `npm run lint:boundaries` (preuve capturée) ; l'import légitime
      admin → (render | core | platform) reste accepté.
- [x] Les pages publiques bâties ne référencent aucun composant de la base d'administration ni
      Tailwind (constat sur l'artefact de build : le poids public n'augmente pas).
