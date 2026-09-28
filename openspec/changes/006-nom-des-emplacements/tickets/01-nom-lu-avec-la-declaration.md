# 01 — Le nom d'un emplacement est lu avec sa déclaration

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/pages/declaration.ts`, `content/pages/accueil/page.json`, `content/pages/tarifs/page.json`, `content/pages/contact/page.json`, `tests/unit/nom-emplacement.test.ts`

## Ce que ça livre

L'intégrateur peut désormais donner à chaque emplacement d'une page un **nom** court, écrit pour
l'éditrice (« Présentation », « Nos réalisations »), dans la déclaration de la page (`page.json`,
ADR-0012). Le noyau lit ce nom avec le reste de la déclaration et le rend disponible, sur chaque
emplacement lu, aux écrans d'administration. Ce ticket ne change encore aucun affichage : l'éditeur et
la bibliothèque s'en serviront dans les tickets suivants. En revanche, les pages de démonstration
reçoivent leurs noms, pour que la recette montre des emplacements nommés à côté d'emplacements sans nom.

Le nom est **facultatif** : une page déclarée sans nom reste valide et se lit exactement comme
aujourd'hui. L'éditrice ne crée, ne change ni ne retire jamais un nom (FR-024/025) ; seul l'intégrateur
le pose, à la main, dans le `page.json`.

**Décisions à respecter :**
- **Le nom est un champ commun à toutes les natures** (design D1) : `nom?: string` s'ajoute à la base
  commune des six variantes d'`Emplacement` et à `EmplacementJson`, pas à une seule nature.
- **Un nom mal formé devient « pas de nom », jamais une entrée écartée** (design D2). La règle actuelle
  du module (une forme fausse écarte l'emplacement) protège la nature et le contenu ; elle ne s'applique
  **pas** au nom. La normalisation vit dans la lecture, en `core/` : une valeur qui n'est pas du texte →
  absent ; espaces de début et de fin retirés ; vide après ce retrait → absent. Aucune longueur maximale.
- **Aucun nom n'est jamais fabriqué** à partir de l'identifiant (`presentation`, `bouton-devis`), même
  mis en forme (FR-117).
- **Le nom ne vise rien** : seul l'identifiant stable sert de clé au brouillon et vise un emplacement
  (ADR-0012). La superposition du brouillon (`appliquerBrouillonSurEmplacement`,
  `src/core/pages/brouillon.ts`) procède par décomposition de l'emplacement déclaré : le nom y est
  conservé tel quel, sans code nouveau attendu dans ce fichier.
- **Pages de démonstration** (arbitrage humain du 2026-09-28) — les quatre emplacements d'image existants
  (`image-hero` et `galerie-realisations` sur l'accueil, `photo-equipe` et `carrousel-clients` sur la
  page Contact) **restent sans nom** : `tests/integration/ou-posee-et-supprimer.test.ts` attend leur
  désignation actuelle (`image`, `galerie`, `carrousel`) et ne doit pas changer. On nomme à la place :
  - accueil : `presentation` → « Présentation », `video-presentation` → « Vidéo d'accueil » ;
  - tarifs : `presentation` → « Présentation des tarifs », et **un nouvel emplacement de nature
    `image`**, nommé « Bandeau des tarifs », posé à la suite des emplacements existants, qui référence
    une image de démonstration déjà présente (`media-fixture-hero`) ;
  - contact : `video-acces` → « Plan d'accès ».
  Les deux `bouton-devis` restent sans nom. Chaque page qui a plusieurs emplacements en montre au moins
  un nommé et un sans nom. Retirer les noms rend la présentation actuelle (retour arrière).

**Hors périmètre :** tout affichage du nom (tickets 02 et 03), le site public (le nom n'y paraît
jamais), un outil de saisie de la déclaration, les données du brouillon en D1.

## Critères
- [ ] En `core/`, la déclaration d'une page porte un emplacement dont le nom est « Présentation » (entouré d'espaces) : l'emplacement lu porte le nom « Présentation », ses espaces de début et de fin retirés   (SC-01a)
- [ ] En `core/`, la déclaration d'une page porte un emplacement sans nom : l'emplacement est lu comme tous les autres, sans nom, et rien ne lui en fabrique un à partir de son identifiant   (SC-01b)
- [ ] En `core/`, le nom déclaré d'un emplacement n'est pas du texte (nombre, objet, `null`), ou n'est fait que d'espaces : l'emplacement est lu sans nom, et il n'est pas écarté de la page   (SC-01c)
- [ ] En `core/`, deux déclarations successives d'une même page changent le nom d'un emplacement sans changer son identifiant : le brouillon de cet emplacement lui reste rattaché, par son identifiant, et la correction s'applique à l'emplacement renommé   (SC-01d)
