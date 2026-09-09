# 07 — La fiche d'une image : renommer et décrire

**Bloqué par :** 04
**Vérif :** test
**Fichiers :** `src/pages/admin/medias/[id]/renommer.ts` + `src/pages/admin/medias/[id]/decrire.ts` (routes d'écriture, gardées), `src/platform/medias/magasin.ts` (persistance du nom d'affichage et de la description), `src/admin/ilots-svelte-5/` (la fiche : aperçu, champ nom, champ description), `tests/integration/`

Motif du mode `test` : renommer et décrire tiennent à une écriture dans la vraie base locale par la couture HTTP — un couplage d'entrées/sorties dont l'oracle se vérifie après coup, non par une fonction pure.

## Ce que ça livre
Depuis la grille, l'éditrice ouvre la fiche d'une image : son aperçu, son nom et sa description. Elle renomme l'image — le nouveau nom d'affichage est enregistré, le nom d'origine restant conservé à part. Elle saisit ou modifie la description, enregistrée elle aussi au magasin brouillon. La description est rangée telle quelle, comme une donnée : ce change ne la rend jamais en HTML (son affichage sur une page publiée viendra avec le site public). Aucun terme de développeur ne paraît sur la fiche.

## Critères
- [ ] Par la couture HTTP, renommer une image enregistre le nouveau nom d'affichage ; le nom d'origine reste inchangé.   (SC-07a)
- [ ] Par la couture HTTP, saisir ou modifier la description d'une image l'enregistre au magasin brouillon.   (SC-07b)
- [ ] Aucun terme de développeur ne paraît dans la fiche d'une image.   (SC-07c)
