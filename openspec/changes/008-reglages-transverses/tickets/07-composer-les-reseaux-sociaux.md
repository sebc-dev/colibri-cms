# 07 — L'éditrice compose la liste de ses réseaux sociaux

**Bloqué par :** 06
**Vérif :** test
**Fichiers :** `src/core/reglages/reseaux.ts`, `src/platform/reglages/magasin.ts`, `src/pages/admin/reglages/reseaux.ts`, `src/admin/ilots-svelte-5/CarteReseaux.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/pages/admin/reglages.astro`, `tests/unit/reglages/reseaux.test.ts`, `tests/integration/composer-reseaux.test.ts`, `tests/static/carte-reseaux-statique.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

La carte Réseaux sociaux devient la seule liste du produit que l'éditrice compose elle-même. Chaque lien
porte un **nom affiché** et une **adresse de la page**. Elle ajoute un lien, corrige un nom ou une
adresse, retire un lien, le monte ou le descend d'un rang, puis enregistre la liste entière en un
geste : le réglage Réseaux sociaux porte alors un brouillon, dans l'ordre soumis. Une liste vide est
admise. Seules les adresses web sécurisées (`https`) sont acceptées ; si un seul lien est refusé, rien
n'est enregistré et le champ fautif dit ce qui est attendu (« Une adresse qui commence par https:// »,
« Un nom de 40 caractères au plus. »). À 12 liens, le bouton « Ajouter un lien » disparaît, remplacé
par « La liste est complète (12 liens au plus). ».

**Règles, en `core/` (`src/core/reglages/reseaux.ts`, logique pure, `I2`) :**
- au plus **12** liens ; une liste vide est admise ;
- nom, espaces de début et de fin retirés : non vide, sans saut de ligne, au plus **40** caractères ;
- adresse : `https` avec un nom d'hôte, analysée par l'analyseur d'URL standard, au plus **2048**
  caractères ; tout autre schéma (`http`, `mailto`, `javascript`…) ou une chaîne qui n'est pas une
  adresse web est refusé.
Bornes en constantes nommées ; refus en **codes** par lien et par champ.

**Décisions à respecter :**
- Route `POST /admin/reglages/reseaux` sur le patron exact de la route des coordonnées (ticket 05) :
  `verifierSession` → `401`, lecture bornée du corps par `src/platform/reglages/corps.ts`,
  `400 { ok: false, refus: [{ champ, raison }] }`, `200 { ok: true }`. Le brouillon `reseaux` remplace
  sa ligne entière ; il ne touche jamais les deux autres réglages.
- Îlot `CarteReseaux.svelte`, monté depuis `monter.ts`. Une ligne par lien : champs « Nom affiché » et
  « Adresse de la page », boutons « Monter », « Descendre » (absents ou inactifs en bout de liste) et
  « Retirer », chacun avec un libellé accessible qui nomme le lien visé (« Monter Instagram ») ; liste
  vide : « Aucun lien pour l'instant. » et « Ajouter un lien ». Marque de brouillon dans la zone de la
  carte, comme au ticket 06.
- Nom et adresse rendus par interpolation échappée seulement (`I5`).
- Les gestes de composition au navigateur sont **ajoutés au cahier de recette** (§ du ticket).

**Hors périmètre :** les icônes des réseaux et la reconnaissance des réseaux connus ; l'affichage sur
le site public.

## Critères
- [ ] À l'`Écran : Réglages`, ajouter un lien, corriger le nom d'un autre, en retirer un troisième et monter le dernier d'un rang, puis enregistrer, fait montrer à la carte la liste résultante dans le nouvel ordre et lui fait porter la marque de brouillon   (SC-07a)
- [ ] Par la couture HTTP, enregistrer trois liens « Instagram », « Facebook », « Mon blog » dans cet ordre, aux adresses `https`, écrit ces trois liens dans cet ordre au brouillon des réseaux sociaux   (SC-07b)
- [ ] Par la couture HTTP, enregistrer une liste sans aucun lien écrit une liste vide au brouillon des réseaux sociaux   (SC-07c)
- [ ] En `core/`, une liste de 12 liens valides est acceptée ; une liste de 13 liens, un lien au nom vide, un nom de 41 caractères, une adresse `http://exemple.fr`, une adresse `javascript:alert(1)`, une adresse `mailto:a@exemple.fr` et une chaîne qui n'est pas une adresse web sont refusés   (SC-07d)
- [ ] Par la couture HTTP, enregistrer deux liens valides et un lien dont l'adresse est en `http` n'écrit aucun brouillon, et la réponse désigne l'adresse de ce lien comme refusée   (SC-07e)
- [ ] Quand la carte Réseaux sociaux compte 12 liens, aucun geste d'ajout n'est offert, et un message dit que la liste est complète   (SC-07f)
