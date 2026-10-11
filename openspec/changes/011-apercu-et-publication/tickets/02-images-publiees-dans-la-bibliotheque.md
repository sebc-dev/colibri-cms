# 02 — La bibliothèque montre les images publiées et celles posées au départ

**Bloqué par :** —
**Vérif :** test
**Fichiers :** `scripts/recuperer-images-publiees.mjs`, `package.json`, `.gitignore`, `.github/workflows/ci.yml`, `content/medias/media-fixture-hero.json`, `content/medias/media-fixture-equipe.json`, `src/core/medias/fiche.ts`, `src/platform/contenu/medias.ts`, `src/platform/medias/magasin.ts`, `src/pages/admin/medias.astro`, `src/pages/admin/medias/[id].astro`, `tests/unit/medias/fiche.test.ts`, `tests/integration/images-publiees-bibliotheque.test.ts`

## Ce que ça livre

Le contenu de démonstration pose deux images — `media-fixture-hero` (Accueil, Tarifs) et
`media-fixture-equipe` (Contact) — qu'aucun fichier ne porte : elles n'existent nulle part, et la
bibliothèque les ignore. Ce ticket leur donne une existence d'**images publiées**. Leurs octets vivent
sur la **branche des images** du dépôt (`media`), leur fiche dans le contenu (`content/medias/`). La
construction du site les récupère et les empaquette.

La rubrique Médias présente alors toutes les images du site : celles en brouillon, comme aujourd'hui,
et les images publiées — celles que l'intégrateur a posées au départ et, plus tard, celles que
l'éditrice aura publiées. Chacune paraît avec sa vignette, même quand le produit ne garde plus ses
octets en base et que le site les sert lui-même.

**Prérequis hors ticket (posés avant le run) :**
- la table des images s'appelle `medias` et porte les colonnes `publiee_le`, `description_publiee` et
  `empreinte_depot` (PR directe du renommage, fusionnée avant ce ticket) ;
- la branche `media` du dépôt produit existe sur GitHub. Elle porte `medias/media-fixture-hero.png` et
  `medias/media-fixture-equipe.png`, deux images générées de quelques Ko. Elle est poussée hors PR,
  parce que la construction et la CI la récupèrent.

**Décisions à respecter :**
- **Fiche d'une image** `content/medias/<id>.json` : `{ id, nomOrigine, format, largeur, hauteur,
  description }` (ADR-0022, FR-108). Elle est lue et validée en `core/` (`src/core/medias/fiche.ts`),
  module que la publication réutilisera pour l'écrire (ticket 12). Les deux fiches de démonstration
  sont créées ici.
- **Récupération à la construction** : `scripts/recuperer-images-publiees.mjs`, appelé par `prebuild`
  avant le script existant, extrait `medias/` de `origin/media` dans un dossier `medias/` à la racine,
  ignoré par git.
  - Une référence locale `media` déjà présente suffit hors réseau.
  - Si la branche n'existe pas sur le dépôt, le dossier est vide (une instance qui n'a jamais publié).
  - Si le dépôt est injoignable et qu'aucune référence locale n'existe, la construction échoue en le
    disant clairement.
  - Le script accepte une clé de lecture **facultative** en variable d'environnement, jamais requise.
- **Empaquetage** : `src/platform/contenu/medias.ts` empaquette les fiches et les octets par
  `import.meta.glob` (motifs littéraux, soustraits au test de mutation comme dans
  `src/platform/contenu/pages.ts`).
- **Inscription des images de départ** : à leur première rencontre par la bibliothèque, les images que
  le contenu pose et que les fiches empaquetées décrivent sont inscrites dans `medias`. Elles y entrent
  **sans octets** (BLOB de longueur nulle, la colonne reste `NOT NULL`), marquées publiées
  (`publiee_le`, `description_publiee` reprise de la fiche). L'inscription est idempotente.
- **Vignette** (ADR-0020) : une image dont la base garde les octets est servie par la route gardée
  existante (`/admin/medias/<id>/octets`). Une image dont la base ne garde plus les octets est servie
  depuis l'adresse statique de sa variante originale empaquetée.
- **CI** : chaque job qui bâtit récupère la branche `media` après le `checkout` (dépôt public, lecture
  anonyme). Aucun contrôle n'est retiré ni affaibli.
- Aucun terme de développeur à l'écran (FR-117).

**Hors périmètre :** le dessin des images sur les pages publiques et l'échec de la construction quand
une image manque (ticket 06) ; le dépôt des images par la publication (tickets 13 et 15) ; le vidage des
octets d'une image publiée que le site porte (tickets 15 et 18) ; l'effacement selon le contenu courant
(ticket 03).

## Critères
- [x] Quand le contenu de départ pose une image que l'éditrice n'a jamais téléversée, l'`Écran : Médias` présente cette image dans la grille avec sa vignette, son nom et sa description   (SC-02a)
- [x] Une image publiée que le site en service porte — ses octets n'étant plus gardés en base — paraît dans la grille avec sa vignette, comme avant sa publication   (SC-02b)
