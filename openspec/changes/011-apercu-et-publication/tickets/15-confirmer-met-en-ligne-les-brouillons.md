# 15 — Confirmer met en ligne tous les brouillons ensemble

**Bloqué par :** 11, 13, 14
**Vérif :** test
**Fichiers :** `migrations/00NN_publication.sql`, `src/core/publication/recapitulatif.ts`, `src/core/publication/depot.ts`, `src/platform/publication/magasin.ts`, `src/platform/publication/publier.ts`, `src/platform/medias/magasin.ts`, `src/platform/d1/cloudflare-workers.d.ts`, `src/pages/admin/publication.ts`, `src/pages/admin/publication/suite.ts`, `src/pages/admin/publier.astro`, `src/admin/MontageEcranPublier.astro`, `src/admin/ilots-svelte-5/EcranPublier.svelte`, `src/admin/textes.ts`, `docs/architecture/model.c4`, `tests/integration/publier-en-un-geste.test.ts`, `tests/integration/finalisation-de-la-publication.test.ts`

## Ce que ça livre

Depuis le récapitulatif, « **Publier maintenant** » met en ligne **ensemble** tout ce qu'il présente :
pages, réglages, formulaires, images redécrites et images effacées (FR-086). L'éditrice ne fait aucun
autre geste.

La publication porte **exactement** ce que le récapitulatif confirmé a présenté. Si les brouillons
ont changé entre l'affichage et la confirmation, rien ne part, et l'écran présente le récapitulatif
à jour (SC-016). Deux publications ne se chevauchent jamais : une seconde confirmation pendant un dépôt
est refusée avec un message qui le dit.

Une fois le dépôt fait :
- chaque brouillon publié devient la dernière version publiée de son objet, et l'objet perd sa marque
  de brouillon ;
- tous les écrans montrent aussitôt la version publiée, sans attendre la reconstruction du site ;
- une correction enregistrée **après** la confirmation reste en brouillon, sans être perdue ;
- une image effacée quitte la bibliothèque et perd sa fiche dans le contenu déposé ;
- les octets de cette image quittent la branche des images à la publication suivante.

**Décisions à respecter :**
- **Migration** additive, au prochain numéro libre (`ls migrations/`) : une ligne unique
  `publication` (`jeton`, `bail_jusqu_a`, `instantane` JSON, `marque_en_cours`, `derniere_marque`,
  `depose_le`), recréée défensivement au premier accès (ADR-0023).
- **Instantané et empreinte** : l'écran Publier calcule le récapitulatif et son **empreinte**
  (`src/core/publication/recapitulatif.ts`, pur). L'empreinte est un condensat SHA-256 de la liste
  triée des objets à brouillon avec leur `maj_le`, des images redécrites et des images effacées.
  - La confirmation renvoie l'empreinte.
  - Si l'empreinte recalculée diffère : statut 409, aucun dépôt, récapitulatif à jour sous le message
    « Vos modifications ont changé depuis l'affichage de cette liste. Vérifiez-la à nouveau avant de
    publier. »
- **Verrou** : la prise se fait par `UPDATE … WHERE bail_jusqu_a IS NULL OR bail_jusqu_a <
  ?maintenant`, avec un bail `BAIL` de 5 minutes, constante nommée en `core/`. Un refus affiche « Une
  publication est déjà en cours. Attendez qu'elle se termine, puis réessayez. » L'expiration, le
  renouvellement par passe et la reprise sont l'objet du ticket 17.
- **Routes** :
  - `POST /admin/publication` vérifie l'empreinte, prend le verrou et garde l'instantané ;
  - `POST /admin/publication/suite` dépose la branche des images (ticket 13), puis la branche
    principale (ticket 12), en une seule passe ici ; les passes bornées arrivent au ticket 17.

  Les deux sont gardées (I6). Leurs écritures sont protégées par `SameSite=Strict` (ADR-0011, I13).
  Aucune écriture en `GET`.
- **Finalisation en un seul lot D1** (`batch`), **seulement** après le dépôt réussi de la branche
  principale :
  - les brouillons de l'instantané passent dans les tables `publies_*` ;
  - ces brouillons sont supprimés **à `maj_le` égal à celui de l'instantané** : une correction
    postérieure reste en brouillon ;
  - les images publiées reçoivent `publiee_le`, `description_publiee` et `empreinte_depot` ;
  - les images effacées sont supprimées ;
  - `derniere_marque` et `depose_le` sont écrits, et le verrou est libéré.

  Un échec avant le dépôt de la branche principale libère le verrou sans rien écrire d'autre.
  `batch` s'ajoute à la déclaration ambiante de `env.DB`.
- **Vidage des octets** (ADR-0020) : au début de chaque publication, les images publiées que le
  Worker empaquette (`src/platform/contenu/medias.ts`) voient leurs octets vidés en base (BLOB de
  longueur nulle).
- **Dépôt** : la route obtient un `Forge` d'une fabrique de `platform/`. Tant que l'adaptateur GitHub
  n'existe pas (ticket 16), aucun dépôt n'est raccordé, et la publication échoue avant tout appel, sans
  rien changer.
- **Îlot** `EcranPublier.svelte`, monté sans `client:*` (ADR-0006, patron `monter.ts`) :
  - « Publier maintenant » (bouton principal) devient inactif et dit « Publication… » ;
  - l'îlot enchaîne `suite` jusqu'à la fin ;
  - à la fin : « C'est publié. Votre site sera à jour dans quelques minutes. Vous pouvez continuer à
    travailler. » ;
  - « Annuler » reste le geste du ticket 10.
- **Tests** : `@cloudflare/vitest-plugin` n'intercepte pas les `fetch` sortants. Les routes se testent
  donc par `exports.default.fetch` sur les chemins qui n'atteignent pas le dépôt (garde, 409, verrou
  pris). L'enchaînement complet se teste au niveau de `platform/` avec la vraie D1 locale et le dépôt
  simulé en mémoire du ticket 12.
- **Modèle d'architecture** : la description de `colibri-cms.d1` reçoit « l'état de la
  publication » ; `likec4 validate` vert.

**Hors périmètre :** l'adaptateur GitHub, la clé et les messages d'échec (ticket 16) ; les passes
bornées, l'avancement « n sur m » et la reprise d'une publication interrompue (ticket 17) ; l'issue de
la mise en ligne et la relance (ticket 18).

## Critères
- [x] Quand la page « Tarifs », le réglage des coordonnées et le formulaire « Devis gâteau » portent un brouillon et que l'éditrice confirme la publication, une fois le dépôt fait, ni « Tarifs », ni les coordonnées, ni « Devis gâteau » ne portent plus de marque de brouillon, et chacun présente le contenu de son ancien brouillon comme dernière version publiée   (SC-15a)
- [x] Quand, après l'affichage du récapitulatif, une correction de la page « Accueil » est enregistrée depuis un autre onglet puis que l'éditrice confirme, rien n'est déposé, et l'écran présente le récapitulatif à jour, « Accueil » compris   (SC-15b)
- [x] Quand une correction de la page « Contact » est enregistrée après la confirmation, pendant que la publication dépose, une fois le dépôt fait, « Contact » porte toujours un brouillon qui contient cette correction   (SC-15c)
- [x] Quand la page « Tarifs » vient d'être publiée et que le site n'est pas encore reconstruit, l'éditeur de « Tarifs » présente le contenu publié, sans marque de brouillon, et non l'ancien contenu de départ   (SC-15d)
- [x] Quand une publication efface une image puis qu'une publication suivante dépose, après la première l'image a quitté la bibliothèque et sa fiche le contenu déposé, et après la seconde ses octets ne sont plus sur la branche des images   (SC-15e)
- [x] Quand une publication dépose et qu'une seconde publication est confirmée depuis un autre onglet, la seconde est refusée, avec un message disant qu'une publication est déjà en cours   (SC-15f)
