# 12 — Le contenu publié est déposé en fichiers lisibles sur la branche principale

**Bloqué par :** 01, 02
**Vérif :** tdd
**Fichiers :** `src/core/publication/prefixes.ts`, `src/core/publication/plan.ts`, `src/core/publication/forge.ts`, `src/core/publication/depot.ts`, `tests/unit/publication/forge-en-memoire.ts`, `tests/unit/publication/prefixes.test.ts`, `tests/unit/publication/plan.test.ts`, `tests/unit/publication/depot-contenu.test.ts`

## Ce que ça livre

La publication sait **déposer le contenu publié** dans le dépôt du client, sur sa branche principale.
Le contenu y est écrit en **fichiers lisibles**, au format de la déclaration (ADR-0012, ADR-0017,
ADR-0018, ADR-0022) :
- pour chaque page en brouillon, son `page.json` et un fichier Markdown par texte riche ;
- `reglages.json` et le texte de la mention quand un réglage est en brouillon ;
- la **fiche** de chaque image nouvellement publiée ou redécrite ;
- la **marque de publication** propre à ce dépôt.

Un objet sans brouillon n'est pas réécrit. Le dépôt se fait en **une seule écriture** qui ajoute à
l'historique sans jamais en effacer :
- bâtie sur un état périmé de la branche, elle est refusée puis rebâtie sur l'état courant ;
- dont la réponse s'est perdue, elle est reconnue au nouvel essai et comptée comme faite, sans
  doublon.

Tout chemin écrit appartient aux préfixes que la publication a le droit d'écrire, et aucun ne vise
`.github/` : une écriture là réécrirait la construction du site.

Ce ticket livre ce comportement **dans le noyau** (`src/core/`, la logique sans base ni réseau),
éprouvé contre un **dépôt simulé en mémoire**. La base, les routes et le vrai dépôt GitHub arrivent
aux tickets 15 et 16.

**Décisions à respecter :**
- **Préfixes** : `src/core/publication/prefixes.ts` porte `PREFIXES_AUTORISES` et en est le **seul
  porteur** (I9, ADR-0025). Valeurs :
  - pour la branche principale : `content/pages/`, `content/reglages/`, `content/formulaires/`,
    `content/medias/`, `content/publication.json` ;
  - pour la branche des images : `medias/`.

  Jamais `.github/`. `cheminAutorise(chemin)` refuse `..`, un segment vide et un chemin absolu. Chaque
  identifiant qui entre dans un chemin (page, emplacement, formulaire, image) est revérifié contre
  `^[a-z0-9][a-z0-9-]*$` avant composition. **Chaque** chemin du plan est revérifié juste avant
  l'appel au dépôt.
- **Plan** : `src/core/publication/plan.ts`, pur, rend le plan depuis un **instantané** (déclarations,
  état publié, brouillons, images) :
  - `page.json` : la structure de la déclaration, les valeurs publiées après superposition (ticket
    01), et un `.md` par texte riche, pour chaque page à brouillon ;
  - `reglages.json` et `mention.md` si un réglage a un brouillon ; le fichier commun reprend l'état
    publié des autres réglages (ADR-0017) ;
  - la fiche de chaque image nouvellement publiée ou redécrite, au format de `src/core/medias/fiche.ts`
    (ticket 02), et la **suppression** de la fiche de chaque image effacée ;
  - `content/publication.json` = `{ "publication": "<marque>" }`. La marque fait 128 bits aléatoires
    en hexadécimal ; la source d'aléa est fournie par l'appelant, et `core/` reste pur.

  Le `formulaire.json` est l'objet du ticket 14.
- JSON produit par `JSON.stringify(…, null, 2)` suivi d'un saut de ligne final, depuis des objets
  typés, jamais par concaténation. Le même contenu donne le même arbre.
- **Port du dépôt** : `src/core/publication/forge.ts` déclare le port `Forge` :
  - lire une référence, lire un commit ;
  - créer un blob en base64 ;
  - créer un arbre avec contenus inlinés et suppressions ;
  - créer un commit ;
  - déplacer une référence avec ou sans `force` ; créer une référence.

  Issues typées : `refusee-pas-avance-rapide`, `acces-refuse`, `injoignable`, `introuvable`.
- **Dépôt de la branche principale** : `src/core/publication/depot.ts` (ADR-0021).
  1. Lire `refs/heads/main`, puis son commit, puis son arbre.
  2. Créer un arbre avec `base_tree`, les fichiers texte **inlinés** et les suppressions (`sha: null`).
  3. Créer un commit à un parent.
  4. Déplacer la référence en `force: false`.

  Un refus « pas une avance rapide » relit la référence et rebâtit, au plus 2 nouveaux essais. Si
  l'arbre du commit relu **est** l'arbre bâti, le dépôt est reconnu fait.
- **Dépôt simulé** `tests/unit/publication/forge-en-memoire.ts` : c'est le seul double du change, et
  il implémente le port `Forge` seul. Il tient :
  - les références, les commits et les arbres (avec `base_tree`, contenus inlinés et suppressions) ;
  - les blobs adressés par leur identifiant git réel (SHA-1 de `blob <taille>\0…`, par
    `crypto.subtle`) ;
  - la vérification d'avance rapide et `force`.

  Il peut injecter un refus d'avance rapide, une réponse perdue ou une panne d'accès.
- `I2` : aucun import de plateforme ni de framework en `core/`.

**Hors périmètre :** les images sur leur branche (ticket 13) ; le `formulaire.json` et les options
(ticket 14) ; la base, les routes, le verrou et la finalisation (ticket 15) ; l'adaptateur GitHub et la
clé (ticket 16).

## Critères
- [x] Quand seule la page « Accueil » porte un brouillon de son texte de présentation et que la publication dépose, le dépôt réécrit le `page.json` et le fichier Markdown de la présentation d'« Accueil » avec le contenu du brouillon, et ne réécrit aucun fichier de « Tarifs » ni de « Contact »   (SC-12a)
- [x] Quand un texte riche publié porte un titre, du gras et une liste, le fichier déposé pour cet emplacement est un texte Markdown lisible dans n'importe quel éditeur, et non une chaîne échappée dans un JSON   (SC-12b)
- [x] Quand une image est publiée pour la première fois, sa fiche déposée porte son identité, son nom d'origine, son format, sa largeur, sa hauteur et sa description   (SC-12c)
- [x] Quand la publication compose son dépôt, chaque chemin écrit appartient aux préfixes autorisés, et aucun ne commence par `.github/`   (SC-12d)
- [x] Quand la branche principale a avancé entre la lecture de son état et l'écriture du dépôt, l'écriture bâtie sur l'état périmé est refusée par le dépôt, la publication la rebâtit sur l'état courant, et l'état plus récent est conservé   (SC-12e)
- [x] Quand l'écriture du dépôt a abouti mais que sa réponse s'est perdue, et que la publication réessaie, le nouvel essai reconnaît son propre dépôt, le compte comme fait, et n'en ajoute pas un second   (SC-12f)
