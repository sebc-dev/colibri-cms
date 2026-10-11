# 01 — Hors brouillon, les écrans montrent la dernière version publiée

**Bloqué par :** —
**Vérif :** test
**Fichiers :** `migrations/00NN_etat_publie.sql`, `src/platform/publication/magasin-publie.ts`, `src/core/pages/brouillon.ts`, `src/core/reglages/coordonnees.ts`, `src/core/formulaires/brouillon.ts`, `src/pages/admin/pages/[slug].astro`, `src/pages/admin/reglages.astro`, `src/pages/admin/formulaires/[id].astro`, `docs/architecture/model.c4`, `tests/unit/publication/superposition.test.ts`, `tests/integration/ecrans-montrent-le-publie.test.ts`

## Ce que ça livre

Aujourd'hui, un objet sans brouillon montre toujours son **contenu de départ** : la déclaration posée par
l'intégrateur dans `content/`. Une fois la publication en place, ce n'est plus vrai. Ce que l'éditrice
a publié doit tenir lieu de contenu de départ, sur tous les écrans, sans attendre la reconstruction du
site.

Ce ticket donne à la base une **dernière version publiée** de chaque emplacement de page, de chaque
réglage et de chaque formulaire, et les écrans s'en servent. La valeur courante d'un objet devient :
la déclaration, recouverte par sa version publiée, recouverte par son brouillon. L'éditeur d'une
page, l'écran des réglages et l'écran d'un formulaire montrent donc, pour tout ce qui ne porte pas de
brouillon, la dernière version publiée — et le contenu de départ tant que l'objet n'a jamais été
publié. La **structure** reste celle de la déclaration : pages, emplacements (leur nature, leur ordre,
leur nom), champs de formulaire, coordonnées déclarées. Une version publiée qui ne correspond plus à la
déclaration est ignorée.

Aucun geste ne publie encore : les tests sèment l'état publié en base, sous la forme que la
publication écrira (ticket 15).

**Décisions à respecter :**
- Migration **additive**, au prochain numéro libre (`ls migrations/` ; la PR directe du renommage de
  la table des images en prend un). Trois tables qui recopient la forme des tables de brouillons
  (ADR-0019) :
  - `publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le)`, clé
    `(page_slug, id_emplacement)` ;
  - `publies_reglages (reglage, contenu, publie_le)`, avec la même contrainte `CHECK` que
    `brouillons_reglages` (`coordonnees`, `reseaux`, `mention`) ;
  - `publies_formulaires (formulaire, contenu, publie_le)`.

  `contenu` a exactement la forme du brouillon correspondant : `ContenuCorrige` pour un emplacement, le
  JSON du réglage, `{ champs, derniersNumeros }` pour un formulaire. Aucune table existante n'est
  touchée. La ligne de verrou de la publication n'est **pas** créée ici (ticket 15).
- Lecture par un magasin `src/platform/publication/magasin-publie.ts`, sur le patron des magasins
  existants : table recréée défensivement au premier accès, requêtes D1 **préparées** seulement. Une
  ligne publiée de forme inattendue est tenue pour absente, comme un brouillon.
- Superposition **sans seconde règle** : on applique deux fois les fonctions existantes de `core/`.
  - Emplacements : `appliquerBrouillonSurEmplacement(appliquerBrouillonSurEmplacement(declare,
    publie), brouillon)`.
  - Coordonnées : `coordonneesCourantes`, deux fois de même.
  - Réseaux et mention : le brouillon s'il existe, sinon la version publiée, sinon la déclaration.
  - Formulaires : `optionsCourantes` reçoit la liste publiée comme repli avant la déclaration. La règle
    d'accord à la marque avec prix / sans prix vaut pour la liste publiée comme pour le brouillon (un
    brouillon désaccordé retombe sur la liste publiée si elle s'accorde, sur la déclaration sinon ;
    ADR-0026). Le nouveau paramètre est **facultatif** : les appels et les tests existants restent
    inchangés.
- « Porte un brouillon » reste dérivé de la seule présence d'une ligne de brouillon. La marque de
  brouillon n'est jamais posée par une version publiée.
- `I2` : aucune lecture de base en `core/` ; les lignes publiées entrent en données.
- Modèle d'architecture : la description de `colibri-cms.d1` reçoit « l'état publié ». Aucun élément
  ni relation nouvelle ; `likec4 validate --no-layout --json --project colibri-cms docs/architecture`
  reste vert.

**Hors périmètre :** l'écriture de l'état publié par la publication (ticket 15) ; l'aperçu (tickets 08
et 09) ; la bibliothèque et l'effacement des images (ticket 03) ; la numérotation des options après
une publication (ticket 14).

## Critères
- [ ] L'éditeur d'une page présente, pour chaque emplacement, son brouillon s'il en porte un, sa dernière version publiée sinon   (SC-01a)
- [ ] Après la publication d'une correction du bouton d'action d'une page — état publié semé en base —, la page ne portant plus de brouillon, l'éditeur présente le libellé et la destination publiés, et non ceux du contenu de départ   (SC-01b)
- [ ] L'`Écran : Réglages` affiché alors que seul le réglage Réseaux sociaux porte un brouillon, et qu'aucun réglage n'a jamais été publié, montre la liste du brouillon dans la carte Réseaux sociaux, et leur contenu de départ dans les cartes Coordonnées et Mention d'information   (SC-01c)
- [ ] L'`Écran : Réglages` affiché après la publication d'une nouvelle mention d'information — état publié semé en base —, la mention ne portant plus de brouillon, montre la mention publiée dans sa carte, sans marque de brouillon, et non la mention de départ   (SC-01d)
- [ ] L'écran de « Devis gâteau » affiché après la publication d'un brouillon qui ajoutait « Pistache » à 12 € — état publié semé en base —, le formulaire ne portant plus de brouillon, présente « Pistache » à 12 € dans « Parfum », sans marque de brouillon   (SC-01e)
- [ ] En `core/`, quand un champ à choix a une liste publiée et un brouillon, puis que l'intégrateur change sa marque avec prix / sans prix de sorte que le brouillon ne s'y accorde plus mais que la liste publiée s'y accorde, la lecture montre la liste publiée de ce champ, et n'échoue pas   (SC-01f)
- [ ] Après une publication, quand l'intégrateur retire un emplacement de la déclaration d'une page et en ajoute un autre, la version publiée de l'emplacement retiré n'est plus montrée, et l'emplacement ajouté présente son contenu de départ   (SC-01g)
