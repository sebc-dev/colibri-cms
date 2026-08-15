# ADR-0023 : Le rendu des emplacements éditables a un point d'entrée unique, atteint par le site publié comme par l'aperçu
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/archi.md](../archi.md) — invariant `I3`

## Contexte

`FR-081` exige que l'aperçu rende la page « avec le même rendu que celui du site publié ». La
seule façon de le tenir sans un second moteur qui divergerait est que les deux entrées
atteignent **les mêmes composants** — ce que la Stack avait déposé en ces termes.

Mais « les mêmes composants » **n'est pas falsifiable tel quel** : le vérifier demanderait de
comparer deux graphes d'imports entiers. Ce qui se lit dans les sources, c'est un **point
d'entrée unique** et **deux importateurs nommés**.

**Caractéristique architecturale servie** : `C3` — fidélité de l'aperçu.
**Exigences servies** : `FR-081`, `SC-016`.

**Trace observable** : le **chemin importé**, dans un fichier hors de `src/render/` ; et
l'**absence** de l'import de `src/site/page.astro` dans l'une des deux routes.

## Décision

**`src/render/index.ts` sera le seul chemin de `src/render/` importé depuis l'extérieur de la
zone**, et le gabarit de page publiée **`src/site/page.astro` en sera l'unique importateur**.

Ce gabarit sera lui-même importé par la **route publiée `src/pages/[...slug].astro`** **comme**
par la **route d'aperçu `src/pages/admin/apercu/[...slug].astro`**.

## Conséquences

**Positives.**

- **La divergence entre l'aperçu et le publié devient impossible par construction**, et non par
  discipline : il n'existe qu'un chemin, et les deux routes y passent.
- Le filtre de sécurité du Markdown — liste blanche de schémas d'URL, aucun HTML brut
  ([ADR-0008](./0008-texte-riche-markdown-restreint.md)) — vit dans ce rendu partagé, donc il
  couvre le site bâti et l'aperçu **d'un seul geste**.
- La zone `render/` a une surface publique explicite : ce qui n'est pas dans `index.ts` n'est
  pas atteignable de l'extérieur.

**Négatives — ce à quoi le code s'engage.**

- **La route d'aperçu vit sous `src/pages/admin/`.** Ce n'est pas un choix de rangement :
  l'ajouter ailleurs demanderait un **troisième préfixe servi par le code**, donc une révision
  de la liste `run_worker_first` que
  [ADR-0015](./0015-en-tetes-de-reponse-deux-porteurs.md) doit garder bornée.
- **L'invariant nomme des chemins en dur.** Renommer `src/render/index.ts`,
  `src/site/page.astro` ou l'une des deux routes **casse le contrôle** et demande un ADR de
  remplacement. C'est le prix de la falsifiabilité, assumé.
- **Un point d'entrée unique est un fichier qui grossit** : tout ce que l'extérieur doit
  atteindre y transite.
- **L'invariant ne tient que la moitié structurelle.** « L'aperçu rend exactement le publié » au
  sens de l'**égalité observée** reste une propriété holistique, hors périmètre des invariants
  d'architecture : elle se vérifie au niveau specs, pas ici.

## Alternatives considérées

- **Un second moteur de rendu pour l'aperçu** : écarté car sa divergence casserait « le même
  rendu que celui du site publié » — le motif qui a déjà écarté les générateurs purement
  statiques en [ADR-0002](./0002-generateur-astro-7.md).
- **Un aperçu produit par un build** : écarté car il impose une attente à l'éditrice et
  consomme le quota de minutes.
- **Formuler l'invariant comme « les deux entrées partagent les mêmes composants »** : écarté
  car non falsifiable — un point d'entrée unique et deux importateurs nommés se lisent, une
  identité de graphes ne se lit pas.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi, qui a resserré
  l'énoncé de la Stack en une forme vérifiable. Revue humaine : 2026-08-13.
