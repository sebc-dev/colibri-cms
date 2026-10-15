# ADR-0027 : La pose d'un formulaire de devis sur une page — un emplacement de nature « formulaire » qui le désigne
Statut : Accepté | Date : 2026-10-15

Né sous le cycle 2.x, sans antécédent 1.x : tranché le 2026-10-15 par l'arbitrage humain du change
`012-envoi-des-demandes-de-devis` (`design.md` § D1), le premier à rendre un formulaire au visiteur. Il
étend [ADR-0012](./0012-declaration-des-emplacements-editables.md) et
[ADR-0018](./0018-declaration-des-formulaires-de-devis.md).

## Contexte

FR-052 à FR-062 font composer et envoyer une demande depuis un formulaire présenté au visiteur, sur une
page publique. ADR-0018 a fixé où et comment un formulaire se **déclare** — `content/formulaires/<id>/
formulaire.json` —, mais pas comment une page le **présente**. Il a seulement écarté une forme : décrire
le formulaire **dans** `page.json`, parce qu'un même formulaire peut être posé sur plusieurs pages et
que FR-067 distingue le formulaire d'origine d'une demande de sa page d'origine.

Au 2026-10-15, aucun `page.json` ne désigne de formulaire, et la lecture de la déclaration des pages
(`src/core/pages/declaration.ts`) ne connaît que six natures d'emplacement : texte riche, lien de vidéo,
bouton d'action, image, galerie, carrousel. Le change `012` doit trancher avant son premier ticket, et la
décision engage au-delà de lui : la story « Réception et suivi des demandes » lira la page d'origine
d'une demande là où cette décision la place.

Cinq contraintes cadrent le choix :
- **UX-3, FR-024/025** — l'éditrice ne compose aucune page : poser un formulaire est un geste de
  l'intégrateur, hors administration, au même titre que poser un emplacement.
- **ARCH-1** — le site se rebâtit depuis les seuls fichiers déposés : la pose doit vivre dans le contenu
  déposé, pas dans le code.
- **ARCH-3** — le rendu n'existe qu'en un lieu, atteint par le publié et par l'aperçu (ADR-0024, `I3`).
- **ARCH-4** — aucune ligne de code propre à un client : ce qui diffère d'un site à l'autre est du contenu
  ou de la configuration.
- **La publication réécrit le `page.json` d'une page en brouillon** depuis sa déclaration
  (`src/core/publication/plan.ts`) : une pose qu'elle ne saurait pas recopier disparaîtrait à la première
  correction publiée.

## Décision

Nous poserons un formulaire sur une page par un **emplacement de nature `formulaire`**, déclaré dans
`page.json` parmi les autres :

```json
{ "id": "formulaire-devis", "nature": "formulaire", "rang": 3, "formulaire": "devis-gateau" }
```

- `formulaire` porte l'**identifiant du formulaire désigné** — le nom de son répertoire sous
  `content/formulaires/` (ADR-0018) ; `nom` reste facultatif, comme pour toute nature ;
- la lecture de la déclaration des pages, dans `core/`, admet cette septième nature ; une entrée sans
  `formulaire` textuel est écartée comme toute entrée mal formée, sans empêcher la lecture des autres ;
- l'emplacement ne porte **aucun contenu éditable** : aucun brouillon ne s'y rattache, et toute correction
  qui le viserait est refusée comme une correction de structure (FR-025). Ce que l'éditrice règle — options,
  libellés, prix — vit dans le brouillon **du formulaire** (ADR-0018, ADR-0026), une fois pour toutes les
  pages qui le posent ;
- l'éditeur d'une page le **présente** par sa nature suivie du **nom du formulaire** désigné, avec un
  renvoi vers l'écran de ce formulaire ; il n'offre aucun moyen de le modifier ;
- la publication le **recopie tel que déclaré** dans le `page.json` déposé ;
- un même formulaire **peut** être posé sur plusieurs pages ;
- la reconstruction du site **échoue**, en nommant la page et le formulaire, quand l'emplacement désigne
  un formulaire absent des formulaires publiés, ou un formulaire qui ne porte aucun champ `email` ni
  `telephone` obligatoire — l'éditrice ne pourrait pas répondre au visiteur. C'est le patron de l'image
  posée mais absente des images publiées : le site en service reste tel qu'il était (FR-091).

Le formulaire désigné se dessine dans le rendu partagé, par le baril de `src/render/` (ADR-0024, `I3`) ;
sa composition — publiée pour le site, brouillon pour l'aperçu — passe par la même fonction de `core/`
que les autres emplacements.

## Conséquences

**Positives.**
- **La position est celle de l'intégrateur.** Le formulaire prend son rang parmi les emplacements : il
  se place entre deux textes, après une image, où le gabarit le veut, sans code.
- **Un formulaire, plusieurs pages, un seul brouillon.** L'éditrice règle « Devis gâteau » une fois ;
  « Tarifs » et « Contact » le présentent pareil. La liste de FR-045 reste une liste d'objets, jamais
  déduite des pages.
- **La page d'origine d'une demande est un fait de la déclaration** : c'est la page qui porte
  l'emplacement. La story « Réception et suivi » la lira là (FR-067).
- **La reconstruction depuis le dépôt tient** (ARCH-1) : le `page.json` déposé porte la pose, la
  publication la recopie, aucune information ne vit hors des fichiers.
- **Aucun code par site** (ARCH-4) : poser, déplacer ou retirer un formulaire est une édition de contenu.
- **Une faute de l'intégrateur se voit tout de suite** : un identifiant mal écrit fait échouer la
  reconstruction en nommant la page et le formulaire, au lieu de laisser une page sans son formulaire.

**Négatives — ce à quoi le code s'engage.**
- **Un emplacement que l'éditrice ne remplit pas.** Le glossaire définit l'emplacement comme une zone
  qu'elle remplit ; celui-ci ne se règle pas depuis la page. L'éditeur doit donc le présenter
  clairement comme un renvoi, sinon elle cherchera en vain où le modifier.
- **Deux références à tenir en phase, à la main.** Renommer le répertoire d'un formulaire (ADR-0018 en
  fait un autre formulaire) ou le retirer casse chaque page qui le pose : la reconstruction échoue
  jusqu'à ce que l'intégrateur corrige les `page.json` concernés.
- **La règle « au moins un champ e-mail ou téléphone obligatoire » ne vaut qu'à la pose.** Un formulaire
  qui ne la tient pas reste déclaré, listé et réglable dans l'administration (change 010) ; il ne peut
  simplement pas être posé sur une page. La vérification vit à la composition de la page, pas à la lecture
  de la déclaration du formulaire.
- **Aucun geste de l'éditrice ne peut faire échouer cette vérification** — elle ne retire ni champ ni
  formulaire (FR-050) — mais un changement de déclaration par l'intégrateur le peut, et l'échec se
  constate à la reconstruction, pas à l'écriture du fichier.
- **La lecture des pages connaît désormais les formulaires par leur identifiant** : la composition d'une
  page reçoit les formulaires déclarés en plus des réglages et des images.

## Alternatives considérées

- **Un champ `formulaires` à la racine de `page.json`** : écartée car il perd le rang — le gabarit
  placerait le formulaire toujours au même endroit, et l'intégrateur ne pourrait plus le poser entre deux
  emplacements.
- **Le formulaire décrit dans la page, ses champs dans `page.json`** : écartée par ADR-0018 — un même
  formulaire peut être posé sur plusieurs pages, et la liste de FR-045 se déduirait des pages au lieu
  d'être une liste d'objets.
- **La pose dans le gabarit** (`src/site/page.astro`, ou un gabarit par page) : écartée car c'est du code
  propre à chaque site (ARCH-4, FR-105), dans un gabarit que l'aperçu partage, et que l'intégrateur
  devrait modifier pour chaque client.
- **La référence inverse, `formulaire.json` listant ses pages** : écartée car elle perd elle aussi le
  rang dans la page, et mêle la structure des pages au fichier que la publication réécrit à chaque
  brouillon du formulaire.
- **Un emplacement « formulaire » où l'éditrice choisit le formulaire** : écartée car choisir ce qu'une
  page présente est un geste de composition, interdit à l'éditrice (UX-3, FR-025).

## Vérifiable ?

Pour l'essentiel par les specs du change `012` — la lecture de la nature, le refus d'une correction,
la présentation dans l'éditeur, la recopie à la publication et l'échec nommé de la reconstruction sont
des scénarios testés — et par la revue. Le placement de la lecture et de la composition dans `core/`
est déjà tenu par `I1` et `I2` (`boundaries`), le rendu par le baril par `I3` : **aucun invariant n'est
ajouté** à la table de `docs/architecture.md`. Une règle « aucun gabarit ne nomme un formulaire en dur »
a été écartée : elle n'a pas de trace statique sûre — un identifiant de formulaire n'a pas de forme qui
le distingue d'une autre chaîne.

**Modèle** : aucun delta. La déclaration relève de `colibri-cms.contenu` (`sourceDir content`), sa
lecture et sa composition empruntent des relations déjà modélisées (`colibri-cms.worker.platform →
colibri-cms.contenu`, `colibri-cms.worker.site → colibri-cms.worker.render`, `colibri-cms.worker.render
→ colibri-cms.worker.core`) ; pas de vue `adr-0027`.
