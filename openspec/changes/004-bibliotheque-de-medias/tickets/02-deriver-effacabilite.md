# 02 — Dériver l'effaçabilité d'une image

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/medias/references.ts` (nouveau — dérivation pure), `tests/unit/`

## Ce que ça livre
Le cœur du produit sait dire, pour une image, si elle est encore utilisée : une image est **effaçable** si et seulement si aucun emplacement — qu'il soit publié ou en brouillon — ne la référence. La fonction reçoit les deux ensembles de références, publié et brouillon, en paramètre : aujourd'hui l'ensemble publié est vide (l'état publié n'a pas encore de représentation), mais la règle est posée entière, prête pour le jour où la publication l'alimentera. C'est la brique sur laquelle s'appuieront le signalement des images orphelines et, plus tard, l'effacement définitif à la publication.

## Critères
- [ ] Une image qu'au moins un emplacement — publié ou brouillon — référence n'est pas effaçable.   (SC-02a)
- [ ] Une image qu'aucun emplacement, ni publié ni brouillon, ne référence est effaçable.   (SC-02b)
