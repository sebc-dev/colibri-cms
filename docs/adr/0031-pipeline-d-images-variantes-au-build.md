# ADR-0031 : Pipeline d'images — les variantes sont produites au build
Statut : Accepté | Date : 2026-11-01

Promu depuis `docs/legacy/1.x/adr/0019-pipeline-d-images-variantes-au-build.md` — ADR-0019, accepté
sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que l'amendement de la
> promotion change** : le titre, la Décision, et les points marqués *(amendé)* ou *(ajouté)* — le
> § « Amendée à la promotion » dit quoi et pourquoi ; la forme d'origine reste dans l'archive. Les
> renvois `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers
> `docs/legacy/1.x/` : ce ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à une
> autre décision porte la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte amendé, un
> numéro sans mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

## Contexte

`SC-005` mesure un score **Lighthouse Performance ≥ 95 en mobile** sur le HTML réellement servi
des pages publiques — le même critère qui a départagé le framework d'îlots
([ADR-0011 (1.x)](../legacy/1.x/adr/0011-ilots-svelte-5.md)). Il faut donc plusieurs variantes par image, et le lieu
où on les produit n'est pas neutre.

Deux plafonds encadrent le choix :

- le garde-fou `C5` du [socle de livraison](../legacy/socle-de-livraison.md) porte sur la **sortie du
  build** — alerte au seuil de l'Annexe A (15 000 fichiers), mur à 20 000 ;
- le budget de sous-requêtes d'une publication borne les médias à **42**
  ([ADR-0005 (1.x)](../legacy/1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md)), et ce budget compte
  **un fichier par média**, non ses variantes.

Le chiffre de sortie est dérivé du code d'`astro@7.2.1` : `package/dist/assets/layout.js`
(`getWidths`) et `internal.js:121` (sélection de `LIMITED_RESOLUTIONS` dès que le service
d'images est local). [mesuré · rejouable en une commande] Les deux fichiers dont ce calcul
dépend sont **identiques octet pour octet** entre `astro@7.2.0` et `astro@7.2.1` —
`dist/assets/layout.js` `sha256:c1b9b456…76ebfd8b` et `dist/assets/internal.js`
`sha256:c4e3b538…37074c3b` des deux côtés ; `npm pack astro@7.2.0 astro@7.2.1` puis `sha256sum`.

*(ajouté)* Ce calcul portait sur le service d'images d'Astro, que la Décision n'utilise plus. Le
nombre de variantes suit désormais `largeursDeVariantes` (`src/core/medias/variantes.ts`).

## Décision

*(amendé)* Nous produirons les **variantes d'images au build**, à **un seul format** (WebP), sur les largeurs
**360, 720 et 1 080 px** (jamais plus large que l'original, au plus trois variantes par image), par
une intégration de `astro.config.ts` qui lit `./medias` et écrit `./medias/variantes`. Le service
d'images d'Astro (`image.layout`, `image.breakpoints`) n'est plus sollicité ; chaque page publique ne
cite que les variantes, jamais l'original.

## Conséquences

**Positives.**

- Produire au build laisse la **publication constante** : le budget de 42 médias reste vrai,
  puisqu'il compte un fichier par média et non ses variantes.
- La configuration sert directement `SC-005`, sur la page et l'appareil où il se mesure.

**Négatives — ce à quoi le code s'engage.**

- *(amendé)* **Le plafond du produit est fixé ici.** Une photographie produit au plus **4 fichiers** de
  sortie (3 variantes WebP et l'original), soit un mur vers **5 000 photographies** et l'alerte `C5`
  (15 000 fichiers) vers **3 750**. Chaque breakpoint ou format ajouté plus tard rapproche ce mur —
  ce n'est donc jamais un réglage anodin.
- *(amendé)* **Les minutes de build** sont mesurées en local : 0,32 s par photo pour les trois
  largeurs (322 ms), soit 14,8 s pour 46 JPEG de 2 000 × 1 500 d'environ 1 085 Kio (sharp 0.35.4,
  12 cœurs, en séquentiel, le 2026-11-01). À la limite de conception de `C5`, le build régénère
  toutes les variantes. Le mur des **20 minutes par build** est la limite dure, et les 3 000
  minutes/mois sont précisément le quota dont le comportement au dépassement n'est documenté d'aucun
  côté (Annexe A du socle de livraison, réserve 1). Le coût sur Workers Builds est consigné au cahier
  de recette ; s'il dépasse 0,5 s par photo, un nouvel ADR remplace celui-ci (proposal du change 014,
  § Préalable).
- *(amendé)* **Le nombre de fichiers se constate** : au plus 4 fichiers (1 original + 3 variantes),
  observables dans `dist/client/_astro`.
- *(ajouté)* **L'original reste dans le site**, servi à une adresse qu'aucune page ne cite. La
  publication et l'administration le relisent (design D1). Il garde ses métadonnées EXIF, résidu
  signalé par `openspec/changes/014-site-public-rapide/security-review.md` § Données.
- **Une bifurcation reste ouverte, et elle n'est pas tranchée.** Si la durée du build croît avec
  la médiathèque, la parade connue est de **générer les variantes à la publication**, le build
  ne faisant plus que les servir — mais elle fait tomber le budget médias de **42 à *(amendé)* environ
  14** par publication (3 fichiers de variantes par image, design D1, en plus de l'original). Ce choix n'a pas pu être
  instruit : le dépôt n'a pas une ligne de code, et un chiffre obtenu en local ne dirait rien du
  matériel de Workers Builds. **C'est une révision de la Stack, à instruire au premier
  déploiement réel** — jamais un invariant de structure.

## Alternatives considérées

- **Générer les variantes à la publication** : écartée aujourd'hui, et **conservée comme
  parade** si la durée du build atteint les 20 minutes. Elle fait tomber le budget médias de 42
  à *(amendé)* environ 14 par publication, dans la séquence mesurée le 2026-08-11
  ([relevé](../legacy/research/2026-08-11-sous-requetes-publication.md)).
- *(ajouté)* **Le pipeline `astro:assets` / `image.layout`**, la voie du candidat : écarté parce que
  l'aperçu passe en `passthrough` (contraire à l'exigence apercu « Même rendu que la page publique »),
  qu'il produit 4 à 5 fichiers par photo et que `core` ne peut pas porter `ImageMetadata` (`I2`).
- *(ajouté)* **Retirer l'original du site** : écarté car il changerait la publication (design D1).

## Amendée à la promotion

Promue le 2026-11-01 par le change `014-site-public-rapide` (ticket 02). **Quoi** : les largeurs
passent à 360, 720 et 1 080 px ; les variantes sont du WebP produit par une intégration `sharp` de
`astro.config.ts` ; l'original reste dans le site mais aucune page ne le cite ; une photographie
produit au plus 4 fichiers ; le coût de build est mesuré. **Pourquoi** : proposal § Préalable et
design D1/D2 du change 014 (l'aperçu doit rendre comme la page publique, et `core` ne porte pas le
type d'images d'Astro).

Retouchés en conséquence, marqués *(amendé)* ou *(ajouté)* : le titre, la Décision, un paragraphe de
contexte ajouté, trois conséquences négatives amendées, une ajoutée, la bifurcation (14 au lieu de 8),
et deux alternatives ajoutées.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, condition de
  révision posée par le traitement de `S-08`, alignement sur `astro@7.2.1` mesuré le 2026-08-13.
  Revue humaine : 2026-08-13.
- *(ajouté)* Promotion amendée instruite par l'agent pour le change 014 (design.md § D1, ticket 02).
