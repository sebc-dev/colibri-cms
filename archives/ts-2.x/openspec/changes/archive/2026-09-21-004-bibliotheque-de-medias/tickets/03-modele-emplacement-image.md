# 03 — Le modèle d'emplacement gagne l'image, la galerie et le carrousel

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/pages/declaration.ts` (étendu — trois natures d'image dans la lecture de la déclaration), `src/core/pages/brouillon.ts` (étendu — poser/remplacer une image, composer un ensemble ordonné, refuser une pose non déclarée ou d'une autre nature), `tests/unit/`

## Ce que ça livre
Le modèle d'une page reconnaît désormais trois nouvelles natures d'emplacement — **image**, **galerie**, **carrousel** — à côté des natures de texte riche, de lien de vidéo et de bouton d'action déjà en place. Un emplacement d'image porte une image ; une galerie ou un carrousel porte un ensemble ordonné d'images ; chacune est désignée par l'identité stable de l'image, jamais par une copie. Le cœur sait poser une image dans un tel emplacement, en remplacer une, composer et réordonner un ensemble — et **refuser** toute pose qui viserait un emplacement non déclaré ou d'une autre nature, sans jamais rien enregistrer. Une entrée mal formée dans la déclaration est écartée, comme pour les autres natures. C'est la logique pure que réutiliseront l'éditeur (pour présenter ces emplacements) et la pose depuis la bibliothèque (pour les remplir).

## Critères
- [x] Une déclaration de page portant des emplacements de nature image, galerie ou carrousel est lue : chacun est reconnu selon sa nature avec son contenu courant — les identités des images référencées —, une entrée mal formée étant écartée comme pour les autres natures.   (SC-03a)
- [x] Une pose qui viserait un emplacement non déclaré, ou un emplacement d'une nature autre qu'image, galerie ou carrousel, est refusée sans qu'aucun brouillon ne soit écrit.   (SC-03b)
