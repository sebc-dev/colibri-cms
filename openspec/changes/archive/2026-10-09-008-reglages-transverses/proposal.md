## Why

Les coordonnées de contact, les liens vers les réseaux sociaux et la mention d'information qui
accompagne les formulaires sont communs à tout le site : l'éditrice doit pouvoir les corriger seule, sans
passer par l'intégrateur. Aujourd'hui, la rubrique « Réglages » du menu de l'administration est posée mais
ne mène à aucun écran, et aucun de ces trois contenus n'a de lieu où vivre. Les stories suivantes
(formulaires de devis, aperçu et publication) supposent que ces réglages existent et portent un brouillon.

Sert **Epic A — Entrer et éditer** (`docs/roadmap.md`), story **Réglages transverses** ; couvre
**FR-041** (coordonnées de contact), **FR-042** (liens vers les réseaux sociaux), **FR-043** (mention
d'information) et **FR-044** (tout réglage modifié l'est en brouillon, sans effet sur le site public),
sous **FR-117** (aucun terme de développeur). Prépare **SC-017** : l'éditrice modifie seule le texte de la
mention d'information — le critère se juge en entier quand la publication et les formulaires seront là.

## What Changes

- **La rubrique « Réglages » mène à un écran.** Il présente trois réglages, chacun dans sa carte, avec son
  propre bouton « Enregistrer » et sa propre marque de brouillon : **Coordonnées**, **Réseaux sociaux**,
  **Mention d'information**.
- **Coordonnées — des champs posés par l'intégrateur.** L'intégrateur déclare, hors administration, la
  liste des coordonnées du site : pour chacune un identifiant stable, une nature (texte d'une ligne,
  téléphone, adresse e-mail, adresse postale), un nom écrit pour l'éditrice (« Téléphone de l'atelier »)
  et sa valeur de départ. L'éditrice corrige la valeur de chaque champ, ou la vide ; elle n'ajoute, ne
  retire ni ne renomme aucun champ. Chaque nature a sa vérification : un téléphone qui n'en est pas un, une
  adresse e-mail mal formée sont refusés au champ, sans rien enregistrer.
- **Réseaux sociaux — une liste que l'éditrice compose.** L'éditrice ajoute un lien (un nom affiché et
  une adresse web), corrige un lien, en retire un, et change leur ordre. Seules les adresses web
  sécurisées (`https`) sont admises ; la liste est bornée en nombre. C'est la seule liste du produit que
  l'éditrice compose elle-même : elle ne touche à la structure d'aucune page.
- **Mention d'information — un texte mis en forme.** L'éditrice corrige la mention avec le même éditeur de
  texte que les pages (gras, italique, lien, liste, titre), sous les mêmes règles de liens.
- **Chaque réglage a son brouillon.** Enregistrer un réglage écrit son brouillon, sans toucher l'état
  publié ni le site public ; la carte du réglage indique alors qu'il porte un brouillon non publié. Les
  trois réglages ont des brouillons indépendants : corriger l'un ne marque pas les autres.

Hors-périmètre :
- L'affichage des réglages sur le site public et dans les formulaires (stories « Site public rapide et
  complet » et « Composer et envoyer une demande de devis ») ; l'aperçu, le récapitulatif avant
  publication et la publication (story « Aperçu et publication ») ; l'abandon d'un brouillon de réglage
  (story « Restauration »).
- Les icônes des réseaux sociaux sur le site public : la liste est libre, le site affichera le nom donné
  par l'éditrice ; une reconnaissance des réseaux connus reste une évolution possible.
- Tout outil de saisie de la déclaration des coordonnées pour l'intégrateur (elle s'écrit à la main,
  comme celle des pages).
- Le réglage des formulaires de devis (story suivante).

## Capabilities

### New Capabilities
- `reglages-transverses` : la déclaration des coordonnées par l'intégrateur et sa lecture, l'écran
  « Réglages » et ses trois cartes, la correction de chaque réglage (coordonnées, réseaux sociaux, mention
  d'information) vers son brouillon, les vérifications propres à chaque nature, et la marque de brouillon
  de chaque réglage.

### Modified Capabilities
- `pages-et-emplacements` : le cadre de navigation sert désormais la rubrique « Réglages » (trois
  rubriques actives au lieu de deux) ; seules Formulaires et Demandes restent sans écran.

## Impact

- **Contenu** : un répertoire de réglages à côté de `content/pages/` (déclaration des coordonnées et
  valeurs de départ, liste de départ des réseaux, texte de départ de la mention), garni pour la
  démonstration.
- **Code** : un module `core/` des réglages (lecture de la déclaration, correction de chaque réglage,
  vérification des natures) ; réutilisation de la sérialisation du texte riche de `core/pages/` ; un
  magasin D1 des brouillons de réglages et sa migration additive ; un écran d'administration et ses îlots ;
  des routes d'écriture sous `/admin/reglages/…` gardées par la session ; le menu des rubriques.
- **Données** : une nouvelle table D1 de brouillons de réglages (migration additive) ; aucune donnée
  existante touchée.
- **Décisions** : une décision structurante nouvelle — le lieu et le format de la déclaration des
  réglages — appelle un ADR (voir design.md) ; ADR-0011 (anti-forgerie par la session `SameSite=Strict`)
  et ADR-0012 (structure lue, jamais écrite) tenus.
- **Site public, politique de sécurité, dépendances** : inchangés.
