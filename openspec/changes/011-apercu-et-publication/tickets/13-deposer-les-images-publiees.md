# 13 — Les images publiées sont déposées sur leur branche, réécrite depuis l'inventaire

**Bloqué par :** 12
**Vérif :** tdd
**Fichiers :** `src/core/publication/plan.ts`, `src/core/publication/depot.ts`, `tests/unit/publication/forge-en-memoire.ts`, `tests/unit/publication/depot-images.test.ts`

## Ce que ça livre

La publication dépose, sur la **branche des images** du dépôt du client (`media`), les octets de
chaque image que le contenu publié pose pour la première fois, **inchangés** (FR-088). Ce dépôt
précède celui du contenu.

La liste des images que porte la branche est calculée depuis **l'inventaire des images publiées**
que tient le produit, jamais depuis ce qui est lu sur la branche. Une image que le dernier contenu
déposé pose encore y reste ; une image effacée en disparaît. L'historique de la branche n'a jamais
qu'un commit : un octet effacé n'y survit pas (FR-084).

C'est le **seul geste destructeur** du produit : la branche est réécrite de force. Il est isolé ici
pour une revue à part. Comme le ticket 12, il se livre dans le noyau, éprouvé contre le dépôt simulé
en mémoire.

**Décisions à respecter :**
- **Images à déposer** : celles que le nouveau contenu pose et qui n'ont pas encore d'empreinte de
  dépôt (`empreinte_depot`, l'identifiant git du blob déposé).
- **Blobs** : un appel par image, en base64. Jamais inlinés dans un arbre : l'UTF-8 corrompt un
  binaire (mesure du 2026-08-11).
- **Branche des images** (ADR-0020, ADR-0021) :
  - un arbre **complet**, calculé depuis l'inventaire seul (chemin `medias/<id>.<ext>` → empreinte),
    sans `base_tree` ;
  - un commit **sans parent** ;
  - puis le déplacement de la référence en `force: true`, ou sa création si elle manque.

  Le dépôt et l'élagage ne font qu'un geste. On ne lit jamais l'état de la branche pour décider quoi
  garder : avec un retard de réplication, une image fraîchement déposée disparaîtrait.
- **Inventaire après dépôt** : les images publiées encore présentes dans le produit, plus les
  nouvelles.
- **Ordre** : la branche des images est déposée avant la branche principale (ticket 12).
- Chemins revérifiés par `cheminAutorise` (préfixe `medias/`, I9).
- Risque accepté (SEC-8) : une session volée peut détruire des images publiées par cette réécriture.
  Le contenu textuel reste indestructible dans l'historique de la branche principale.

**Hors périmètre :** le découpage en passes (40 images, 10 Mo) et la reprise (ticket 17) ; la lecture
des octets en base et la finalisation (ticket 15) ; le constat, en recette, que seule la branche
principale déclenche la reconstruction (ticket 19).

## Critères
- [ ] Quand une image JPEG, une PNG et une WebP sont publiées pour la première fois, les octets déposés sur la branche des images sont identiques, octet pour octet, à ceux téléversés   (SC-13a)
- [ ] Quand la publication réécrit la branche des images alors que le dernier contenu déposé pose encore une image, les octets de cette image restent sur la branche   (SC-13b)
