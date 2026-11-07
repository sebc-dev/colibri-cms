# 03 — Un réglage revient à sa version publiée

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/pages/admin/reglages/[reglage]/revenir.ts`, `src/platform/reglages/magasin.ts`, `src/pages/admin/reglages.astro`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/textes.ts`, `tests/integration/revenir-reglage.test.ts`

## Ce que ça livre

Sur l'`Écran : Réglages`, chaque carte — Coordonnées, Réseaux sociaux, Mention d'information — offre
« Revenir à la version publiée » quand elle porte un brouillon (FR-092). Chaque réglage revient **seul** :
les deux autres gardent leur brouillon (FR-093). La carte présente ensuite sa dernière version publiée,
ou son contenu de départ si elle n'a jamais été publiée, sans marque de brouillon.

**Le geste** réutilise l'îlot `RevenirVersionPubliee.svelte` du ticket 01, monté une fois par carte dans
son en-tête, à côté de sa marque. Le bouton paraît dès le premier enregistrement de la carte, par le même
événement `brouillon-enregistre` que `afficherPastilleDansLaZone` émet sur la zone propre à chaque carte.
La confirmation nomme le réglage : « Les modifications des coordonnées seront perdues. », « …des réseaux
sociaux… », « …de la mention d'information… ». Textes dans `src/admin/textes.ts`, sans terme de
développeur (FR-117).

**La route.** `POST /admin/reglages/[reglage]/revenir`, sans corps, même patron que la route des pages :
- `verifierSession`, sinon `401` ; anti-forgerie par le cookie `SameSite=Strict` (ADR-0011) ;
- `404` pour un `reglage` hors de la liste fermée `coordonnees` | `reseaux` | `mention` ;
- suppression de la ligne de `brouillons_reglages` dans `src/platform/reglages/magasin.ts`, sous la
  condition atomique de refus pendant une publication exportée par `src/platform/publication/magasin.ts`
  (ticket 02) : `409` avec la raison `publication-en-cours` ;
- succès si le réglage ne portait aucun brouillon.

La route ne doit pas entrer en conflit avec les routes d'écriture existantes
`src/pages/admin/reglages/{coordonnees,mention,reseaux}.ts`.

## Critères
- [ ] les coordonnées publiées, puis le téléphone modifié, la carte Coordonnées revenue : elle présente le téléphone publié, sans marque de brouillon   (SC-03a)
- [ ] les trois réglages portent un brouillon ; après le retour des réseaux sociaux, les coordonnées et la mention d'information portent toujours leur brouillon, inchangé   (SC-03b)
- [ ] le geste de retour d'un réglage forgé depuis une autre origine n'aboutit pas, et le brouillon du réglage est intact   (SC-03c)
