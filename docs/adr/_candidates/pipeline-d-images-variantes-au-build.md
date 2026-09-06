# Candidat ADR : Pipeline d'images — les variantes sont produites au build
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0019-pipeline-d-images-variantes-au-build.md` (ADR-0019 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

`SC-005` mesure un score **Lighthouse Performance ≥ 95 en mobile** sur le HTML réellement servi
des pages publiques — le même critère qui a départagé le framework d'îlots
([ADR-0011](../../legacy/1.x/adr/0011-ilots-svelte-5.md)). Il faut donc plusieurs variantes par image, et le lieu
où on les produit n'est pas neutre.

Deux plafonds encadrent le choix :

- le garde-fou `C5` du [socle de livraison](../../legacy/socle-de-livraison.md) porte sur la **sortie du
  build** — alerte au seuil de l'Annexe A (15 000 fichiers), mur à 20 000 ;
- le budget de sous-requêtes d'une publication borne les médias à **42**
  ([ADR-0005](../../legacy/1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md)), et ce budget compte
  **un fichier par média**, non ses variantes.

Le chiffre de sortie est dérivé du code d'`astro@7.2.1` : `package/dist/assets/layout.js`
(`getWidths`) et `internal.js:121` (sélection de `LIMITED_RESOLUTIONS` dès que le service
d'images est local). [mesuré · rejouable en une commande] Les deux fichiers dont ce calcul
dépend sont **identiques octet pour octet** entre `astro@7.2.0` et `astro@7.2.1` —
`dist/assets/layout.js` `sha256:c1b9b456…76ebfd8b` et `dist/assets/internal.js`
`sha256:c4e3b538…37074c3b` des deux côtés ; `npm pack astro@7.2.0 astro@7.2.1` puis `sha256sum`.

## Décision

Nous produirons les **variantes d'images au build**, avec `image.layout: 'constrained'`,
`image.breakpoints: [640, 960, 1280]` et `<Image>` à un **seul format**.

## Conséquences

**Positives.**

- Produire au build laisse la **publication constante** : le budget de 42 médias reste vrai,
  puisqu'il compte un fichier par média et non ses variantes.
- La configuration sert directement `SC-005`, sur la page et l'appareil où il se mesure.

**Négatives — ce à quoi le code s'engage.**

- **Le plafond du produit est fixé ici.** Une photographie produit **5 fichiers** de sortie,
  soit un mur vers **4 000 photographies** et l'alerte `C5` (15 000 fichiers) vers **3 000**.
  Chaque breakpoint ou format ajouté plus tard rapproche ce mur — ce n'est donc jamais un
  réglage anodin.
- **Les minutes de build ne sont bornées par rien de mesuré.** À la limite de conception de
  `C5`, le build régénère toutes les variantes. Le mur des **20 minutes par build** est la
  limite dure, et les 3 000 minutes/mois sont précisément le quota dont le comportement au
  dépassement n'est documenté d'aucun côté (Annexe A du socle de livraison, réserve 1).
- **La valeur des 5 fichiers reste à confirmer sur pièce** : elle se mesure au premier
  déploiement réel et se reporte en Annexe A (réserve 3). Le calcul est dérivé du code, pas
  observé sur une sortie de build.
- **Une bifurcation reste ouverte, et elle n'est pas tranchée.** Si la durée du build croît avec
  la médiathèque, la parade connue est de **générer les variantes à la publication**, le build
  ne faisant plus que les servir — mais elle fait tomber le budget médias de **42 à environ
  8** par publication (5 fichiers par photographie au lieu d'un). Ce choix n'a pas pu être
  instruit : le dépôt n'a pas une ligne de code, et un chiffre obtenu en local ne dirait rien du
  matériel de Workers Builds. **C'est une révision de la Stack, à instruire au premier
  déploiement réel** — jamais un invariant de structure.

## Alternatives considérées

- **Générer les variantes à la publication** : écartée aujourd'hui, et **conservée comme
  parade** si la durée du build atteint les 20 minutes. Elle fait tomber le budget médias de 42
  à environ 8 par publication, dans la séquence mesurée le 2026-08-11
  ([relevé](../../legacy/research/2026-08-11-sous-requetes-publication.md)).

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, condition de
  révision posée par le traitement de `S-08`, alignement sur `astro@7.2.1` mesuré le 2026-08-13.
  Revue humaine : 2026-08-13.
