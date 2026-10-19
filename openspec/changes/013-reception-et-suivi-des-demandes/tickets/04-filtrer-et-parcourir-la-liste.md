# 04 — Filtrer la liste par formulaire d'origine, et la parcourir par pages de 50

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/pages/admin/demandes.astro`, `src/platform/demandes/magasin.ts`, `src/core/demandes/liste.ts`, `src/admin/textes.ts`, `docs/cahier-de-test.md`, `tests/unit/demandes/liste.test.ts`, `tests/integration/filtre-et-pages-des-demandes.test.ts`

## Ce que ça livre

Sur l'`Écran : Demandes`, l'éditrice filtre la liste par formulaire d'origine (FR-070) et atteint les
demandes les plus anciennes, par pages de 50.

**Le filtre.** Sous le titre, « Formulaire : » est suivi d'une rangée de liens :
- « Tous », qui rend les demandes de tous les formulaires ;
- puis un lien par formulaire dont au moins une demande est présente, y compris un formulaire que le site
  ne porte plus.

Le lien courant est marqué (`aria-current`). Choisir un formulaire ne montre que ses demandes, toujours de
la plus récente à la plus ancienne. Le nom affiché est celui que porte le formulaire tant qu'il est
déclaré ; sinon, c'est le nom gardé sur sa demande la plus récente. Sans aucune demande présente, le filtre
ne paraît pas.

**La pagination.** Quand plus de 50 demandes sont à présenter, sous la liste paraissent « Demandes plus
récentes » et « Demandes plus anciennes », avec « Page 2 sur 3 ». Ces liens gardent le filtre en cours.
Avec 120 demandes, la première page présente les 50 plus récentes, et la troisième les 20 plus anciennes.

**Décisions à respecter (D4 de l'approche ; I2, I5) :**
- **Les paramètres d'adresse.**
  - `?formulaire=<id>` est ignoré s'il ne désigne aucun formulaire de demande présente ; il est comparé à
    la liste lue en base, jamais concaténé dans une requête.
  - `?page=<n>` est converti en entier, borné entre 1 et la dernière page : `0`, `-1` et `abc` mènent à la
    première ; un numéro au-delà mène à la dernière.
- **La logique pure.** Le bornage de la page et la résolution du nom d'un formulaire (déclaration d'abord,
  nom gardé ensuite) vivent dans `src/core/demandes/liste.ts`, sans framework ni plateforme (I2).
- **Les lectures.** Dans `src/platform/demandes/magasin.ts` : la page de 50 demandes, filtrée ou non, avec
  `order by recue_le desc, rowid desc limit 50 offset ?` ; le nombre de demandes présentes, filtrées ou
  non ; les formulaires de demande présente avec leur nom gardé le plus récent. Requêtes préparées seules.
- **Navigation serveur.** Filtre et pagination sont des liens : aucun script.
- **Les textes** vivent dans `src/admin/textes.ts` : « Formulaire : », « Tous », les deux liens de
  pagination, « Page 2 sur 3 ». Aucun terme de développeur (FR-117).
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : le filtre et la
  pagination lus au téléphone.
- **Cas limites à couvrir :** 50 et 51 demandes (pagination absente, puis présente) ; `?page=0`,
  `?page=-1`, `?page=abc`, page au-delà de la dernière ; `?formulaire=` inconnu (ignoré) ; filtre et page
  ensemble ; un formulaire qui n'a plus que des demandes retirées n'est pas proposé.

**Hors périmètre :**
- les nombres du site et des formulaires (ticket 05) ;
- un filtre par date, une recherche, un export : écartés par le cahier des charges.

## Critères
- [x] Quand la liste porte des demandes de « Devis gâteau » et de « Devis atelier », et que l'éditrice choisit « Devis atelier » dans le filtre, seules les demandes de « Devis atelier » paraissent, de la plus récente à la plus ancienne   (SC-04a)
- [x] Quand la liste est filtrée sur « Devis atelier », et que l'éditrice choisit de revoir toutes les demandes, les demandes de tous les formulaires paraissent de nouveau   (SC-04b)
- [x] Quand 120 demandes sont présentes, l'écran présente les 50 plus récentes et un moyen d'atteindre les suivantes, et la troisième page présente les 20 plus anciennes   (SC-04c)
- [x] Quand l'intégrateur a retiré du site un formulaire dont des demandes sont présentes, ces demandes restent dans la liste sous le nom de ce formulaire, et le filtre le propose toujours   (SC-04d)
