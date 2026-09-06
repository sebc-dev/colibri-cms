# ADR-0012 : La déclaration des pages et emplacements éditables — un répertoire de contenu au format déposé, lu par `core/`
Statut : Accepté | Date : 2026-09-05

## Contexte
FR-015 fait lister les pages du site, FR-017 fait éditer chaque emplacement d'une page, et FR-024/025
interdisent à l'éditrice de créer une page ou d'en modifier la structure — nombre, nature ou ordre de
ses emplacements. Il existe donc une **source de vérité de la structure** — quelles pages, quels
emplacements, de quelle nature, dans quel ordre — que le produit **lit** mais n'**écrit** jamais depuis
l'administration, et que l'intégrateur pose hors administration.

La feature 003 (remplir et corriger les emplacements d'une page) rend la décision nécessaire
**maintenant** : ses tickets 02 (la liste des pages), 03 (l'éditeur), et 04→06 (les corrections)
lisent tous cette déclaration, et le brouillon porté par D1 doit s'y rattacher par une **identité
stable** — un identifiant d'emplacement qui ne bouge pas quand le contenu change.

Trois contraintes du dépôt cadrent le choix :
- **La matrice I1 (`docs/archi.md`, candidat `sens-descendant-des-dependances-entre-zones`, job `boundaries`)** interdit à `admin/`
  d'importer `site/`. Or la déclaration doit être lue par l'administration **et** par le rendu public.
  Le seul terrain que les deux atteignent et qui s'instancie sans plateforme est `core/` — ce qui
  tranche `ARCH-5` (testabilité sans plateforme : la logique métier se vérifie sans base, sans HTTP,
  sans Worker).
- **`ARCH-1` (reconstructibilité)** : le site public se rebâtit depuis les seuls fichiers déposés chez
  le client, sans le produit ni l'intégrateur.
- **`ARCH-3` (fidélité de l'aperçu)** : le rendu d'un emplacement n'existe qu'en un lieu, atteint
  identiquement par le publié et par l'aperçu — le rendu partagé de `render/`.

Le **format déposé** à la publication est par ailleurs déjà fixé (candidat
`format-du-contenu-un-repertoire-par-objet` : un `page.json` pour la structure, un `.md` par emplacement
de texte riche).

## Décision
Nous déclarerons les pages et leurs emplacements dans un **répertoire de contenu versionné du dépôt**,
au **même format que le contenu déposé à la publication** : un `page.json` par page, portant pour chaque
emplacement un **identifiant stable**, sa **nature** (texte riche, lien de vidéo, bouton d'action) et
son **rang** (l'ordre y est celui de la déclaration), et un `.md` par emplacement de texte riche pour
son contenu initial.

Le **modèle d'emplacement et la lecture de cette déclaration vivent dans `core/`** — sans base, sans
HTTP, sans framework (ADR-0022 hérité / `core-sans-framework-ni-plateforme`). Le produit **lit** cette
déclaration ; il ne l'**écrit jamais** depuis l'administration. Le **brouillon porté par D1 se rattache
à un emplacement par l'identifiant stable du `page.json`** — la clé est `(page, identifiant
d'emplacement)`.

## Conséquences
**Positives.**
- **Source et format déposé sont une seule forme.** `ARCH-1` est tenu sans conversion : les fichiers
  déposés sont la structure, lisibles et rejouables tels quels.
- **L'identité stable est native.** L'identifiant d'emplacement du `page.json` est le point d'ancrage
  du brouillon D1, du rendu et de la copie déposée — un seul nom pour un seul emplacement.
- **La logique se teste sans plateforme.** Le modèle et sa lecture, dans `core/`, s'instancient
  directement (`ARCH-5`, ADR-0013 / Vitest dans `workerd`) : lire la structure, dériver l'état,
  refuser une correction de structure sont des fonctions pures.
- **Un seul lieu de rendu.** `render/` lit la même structure pour le publié et l'aperçu (`ARCH-3`),
  sans représentation intermédiaire propre à l'administration.

**Négatives — ce à quoi le code s'engage.**
- **La cohérence `page.json` ↔ ses `.md` est une convention du produit, pas une propriété du format.**
  Un emplacement retiré ou renommé touche deux fichiers, et rien dans les fichiers eux-mêmes ne
  rattraperait une divergence.
- **L'intégrateur écrit du JSON à la main.** La déclaration n'a pas d'outil de saisie (hors-périmètre
  de 003) ; une faute de forme se constate à la lecture par le produit, pas à l'écriture.
- **Deux emplacements physiques partagent une même forme sans être le même fichier.** La déclaration
  source vit dans le dépôt produit ; la copie déposée vit dans l'espace du client, écrite à la
  publication. Confondre les deux ferait croire que corriger l'un corrige l'autre — ce n'est pas le
  cas : seule la publication reporte le brouillon vers la copie déposée.

## Alternatives considérées
- **La déclaration dans les gabarits `src/site/`, dérivée au build en un artefact que `core/` lit** :
  écartée car la matrice I1 interdit à `admin/` d'importer `site/` — l'administration ne lirait qu'un
  **artefact dérivé**, pas la déclaration elle-même — et l'extraction au build ajoute un mécanisme et
  une **seconde représentation** à tenir en phase avec le format déposé, là où `ARCH-1` veut que les
  fichiers déposés fassent foi.
- **Un manifeste unique versionné**, un seul fichier listant toutes les pages et leurs emplacements,
  séparé du format déposé : écartée car c'est une **troisième représentation** distincte des fichiers
  déposés — divergence possible avec le `page.json` que la reconstruction (`ARCH-1`) rend faisant foi.

## Vérifiable ?
Pour l'essentiel non — décision de fondation qui se constate à la recette de livraison (`ARCH-1`,
épreuve de réversibilité `SC-011`) et à la revue. Le seul volet à trace mécanique est le **placement du
modèle dans `core/` sans dépendance de plateforme**, déjà tenu par I1 (`boundaries`) : aucun contrôle
neuf à dériver. L'interdiction d'écrire la déclaration depuis l'administration et la forme exacte
(`page.json` + `.md`) relèvent de la revue, sans trace mécanique dédiée.
