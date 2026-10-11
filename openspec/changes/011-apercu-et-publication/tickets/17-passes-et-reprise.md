# 17 — Beaucoup d'images partent en plusieurs passes, et une publication interrompue reprend

**Bloqué par :** 15
**Vérif :** test
**Fichiers :** `src/core/publication/passes.ts`, `src/platform/publication/publier.ts`, `src/platform/publication/magasin.ts`, `src/pages/admin/publication/suite.ts`, `src/admin/ilots-svelte-5/EcranPublier.svelte`, `src/admin/ilots-svelte-5/libelle-avancement.ts`, `src/admin/textes.ts`, `tests/unit/publication/passes.test.ts`, `tests/unit/libelle-avancement.test.ts`, `tests/integration/passes-et-reprise.test.ts`

## Ce que ça livre

Une publication qui doit déposer beaucoup d'images les envoie en **plusieurs passes**, qui
s'enchaînent sans autre geste de l'éditrice. L'écran montre combien d'images sont parties sur combien
(« Envoi des images : 3 sur 12 »), et toutes les images finissent déposées. L'éditrice peut quitter
l'écran sans rien casser.

Une publication interrompue en cours de route — fenêtre fermée, serveur arrêté — ne bloque les
suivantes que **pendant au plus 5 minutes** après son dernier signe de vie. Avant cette borne, une
nouvelle publication est refusée avec un message qui le dit. Après, une nouvelle publication la
**reprend** et aboutit à un dépôt correct : toutes les images et tout le contenu attendus, sans image
en double ni contenu manquant.

**Décisions à respecter (ADR-0023) :**
- **Passes de blobs** bornées à **40 images et 10 Mo d'octets**, base64 compris. Ces bornes viennent
  du palier gratuit : 50 sous-requêtes et 128 Mo de mémoire par requête. Vient ensuite la passe
  finale :
  - branche des images : 3 appels ;
  - branche principale : 5 appels, plus au plus 10 en nouveaux essais.

  Les bornes sont des constantes nommées en `core/` (`src/core/publication/passes.ts`, pur).
- Chaque passe **renouvelle** le bail de `BAIL` (5 minutes, ticket 15).
- **Reprise** : un bail expiré est repris par la publication suivante, qui rejoue l'instantané gardé
  dans la ligne `publication`. Les blobs déjà déposés portent leur `empreinte_depot` et ne repartent
  pas.
- **Îlot** : il enchaîne `POST /admin/publication/suite` passe après passe et affiche l'avancement.
  Le libellé est une fonction pure testée à part, sur le patron de `libelle-compte-images.ts`.
- **Cas limites** à couvrir :
  - 0, 1, 40 et 41 images ;
  - 10 Mo pile, et 10 Mo plus 1 octet, dans une passe ;
  - une image de 2 Mo (la borne d'une ligne D1) ;
  - un bail à 4 min 59 s (refus) et à 5 min (reprise) ;
  - une reprise après des blobs déjà déposés (aucun doublon).
- **Tests** : la reprise et les bornes du bail se testent au niveau de `platform/`, avec la vraie D1
  locale et le dépôt simulé en mémoire. L'horloge est passée en paramètre, jamais lue en dur.

**Hors périmètre :** la mesure réelle du bail et de la durée d'une publication à 1 et à 40 images
(ticket 19) ; l'issue de la mise en ligne (ticket 18).

## Critères
- [ ] Quand la publication doit déposer plus d'images qu'une seule passe n'en porte, les passes s'enchaînent sans autre geste de l'éditrice, l'écran montre combien d'images sont parties sur combien, et toutes les images sont déposées   (SC-17a)
- [ ] Quand une publication s'est interrompue après avoir déposé une partie de ses images et que 5 minutes ont passé sans signe de vie, une nouvelle publication est acceptée, et son dépôt porte toutes les images et tout le contenu attendus, sans doublon   (SC-17b)
- [ ] Quand une publication s'est interrompue et que moins de 5 minutes ont passé depuis son dernier signe de vie, une nouvelle publication est refusée, avec un message disant qu'une publication est déjà en cours   (SC-17c)
