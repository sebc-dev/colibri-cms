# 06 — La carte Coordonnées s'enregistre depuis l'écran et porte sa marque de brouillon

**Bloqué par :** 05
**Vérif :** test
**Fichiers :** `src/admin/ilots-svelte-5/CarteCoordonnees.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/pastille-brouillon.ts`, `src/pages/admin/reglages.astro`, `src/admin/GabaritCadre.astro`, `src/admin/MontageCarteCoordonnees.astro`, `src/admin/ilots-svelte-5/coordonnees-carte.ts`, `src/admin/textes.ts`, `tests/integration/carte-coordonnees.test.ts`, `tests/static/carte-coordonnees-statique.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

À l'`Écran : Réglages`, l'éditrice corrige les valeurs de la carte Coordonnées puis appuie sur
« Enregistrer » : au succès, la carte porte **aussitôt** la marque « Brouillon », sans changer d'écran,
et les autres cartes gardent leur état. Un champ refusé est marqué en erreur et dit ce qui est attendu
(« Un numéro de téléphone, de 6 à 15 chiffres. », « Une adresse e-mail, par exemple nom@exemple.fr. ») ;
rien n'est enregistré et la saisie n'est jamais perdue. La carte n'offre **aucun** geste d'ajout, de
retrait, de renommage ni de déplacement d'une coordonnée. L'écran montre désormais, pour chaque carte, le
**contenu courant** de son réglage — son brouillon s'il en porte un, son contenu de départ sinon — et
la marque de brouillon des réglages qui en portent un ; sur une instance où rien n'a été enregistré,
aucune carte ne la porte.

**Décisions à respecter :**
- les scripts de montage d'un écran du cadre sont posés dans `<slot name="scripts"/>` de GabaritCadre.astro, hors de `<main>`, par un composant Astro dédié dont le `<script>` reste bundlé, sans script en ligne (CSP).
- `reglages.astro` lit les trois brouillons par le magasin du ticket 05 et reconstitue les coordonnées
  courantes par la fonction de rattachement du ticket 03 ; la liste des liens et la mention courantes
  viennent de leur brouillon s'il existe. La marque de brouillon de chaque carte est rendue par le
  serveur dans **la zone propre à la carte** (posée au ticket 04), avec `MarqueBrouillon.astro`.
- Îlot `CarteCoordonnees.svelte`, monté depuis `monter.ts` (aucune directive `client:*`, `I4`), données
  transmises par attributs `data-*` / JSON échappés par Astro. Il soumet toutes les valeurs à
  `POST /admin/reglages/coordonnees` (par `soumettreCorrection`, qui reçoit l'adresse depuis le
  ticket 01, ou par un équivalent qui lit `refus: [{ champ, raison }]`), traduit chaque code de raison en
  français (jamais affiché brut) et marque le champ concerné.
- Au succès, la marque paraît **dans la zone de cette carte seulement** : `pastille-brouillon.ts`
  accepte une zone cible (la zone unique de l'éditeur de page reste le cas par défaut, inchangé), en
  clonant le même `<template id="modele-marque-brouillon">`.
- Envoi : pendant l'enregistrement, le bouton est inactif et dit « Enregistrement… » ; sur un échec de
  connexion, la carte garde la saisie et dit que l'enregistrement n'a pas abouti.
- Interpolation échappée de Svelte seulement (pas de `{@html}`, `I5`) ; tokens d'`admin.css` (`I14`).
- Vérification : la moitié serveur (contenu courant, marque rendue ou absente, absence de geste de
  structure) se teste par requête HTTP réelle ; la moitié navigateur (marque révélée sans recharger,
  champ marqué en erreur) se teste sur l'îlot et ses textes, et ses cas visuels sont **ajoutés au cahier
  de recette** (`docs/cahier-de-test.md`, § du ticket) — un critère visuel inobservable en `workerd` ne
  bloque pas le ticket.

**Hors périmètre :** les gestes des cartes Réseaux sociaux et Mention (tickets 07, 08) ; l'abandon d'un
brouillon ; la publication.

## Critères
- [x] En parcourant la carte Coordonnées, aucun geste d'ajout, de retrait, de renommage ni de déplacement d'une coordonnée n'est offert   (SC-06a)
- [ ] À l'`Écran : Réglages`, enregistrer un téléphone mal formé marque le champ du téléphone en erreur avec un message qui dit ce qui est attendu, sans terme de développeur, et la carte ne porte pas de nouvelle marque de brouillon   (SC-06b)
- [ ] À l'`Écran : Réglages`, enregistrer une carte avec succès lui fait porter aussitôt la marque de brouillon, sans changement d'écran, et les autres cartes gardent leur état   (SC-06c)
- [x] L'`Écran : Réglages` affiché sur une instance où aucun réglage n'a été enregistré ne montre la marque de brouillon sur aucune des trois cartes   (SC-06d)
- [x] L'`Écran : Réglages` affiché alors que seul le réglage Réseaux sociaux porte un brouillon montre la liste du brouillon dans la carte Réseaux sociaux, et le contenu de départ dans les cartes Coordonnées et Mention d'information   (SC-06e)
