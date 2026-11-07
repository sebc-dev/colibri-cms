# 01 — Une page revient à sa version publiée

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/pages/admin/pages/[slug]/revenir.ts`, `src/platform/brouillons/magasin.ts`, `src/admin/ilots-svelte-5/RevenirVersionPubliee.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/pastille-brouillon.ts`, `src/admin/textes.ts`, `src/pages/admin/pages/[slug].astro`, `tests/integration/revenir-page.test.ts`, `tests/parcours/revenir-page.parcours.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Dans l'éditeur d'une page qui porte un brouillon, l'éditrice actionne **« Revenir à la version
publiée »**. Une confirmation s'ouvre ; elle confirme ; l'écran présente la dernière version publiée de la
page, ou son contenu de départ si la page n'a jamais été publiée, sans marque de brouillon (FR-092). Une
page se restaure **en entier** : le brouillon de tous ses emplacements corrigés est abandonné ensemble.
Aucun autre brouillon n'est touché (FR-093), et rien ne permet de retrouver le brouillon abandonné
(FR-094).

**Le geste.** Le bouton se place dans le fil de retour, à côté de la marque de brouillon. Il est absent
d'une page sans brouillon. Il paraît, sans changement d'écran, dès que l'éditrice enregistre la première
correction d'une page : `afficherPastilleDansLaZone` (`src/admin/pastille-brouillon.ts`) émet un
événement `brouillon-enregistre` sur sa zone quand elle révèle la marque, et l'îlot de la zone l'écoute.

**La confirmation.** Un îlot `RevenirVersionPubliee.svelte`, réutilisé ensuite par les réglages et les
formulaires (tickets 03 et 04), porte le bouton et un `Dialog` de `bits-ui`, habillé comme la
confirmation de suppression d'un média (`src/admin/ilots-svelte-5/FicheMedia.svelte`). Il reçoit le nom de
l'objet et la nature de l'objet en propriétés, et affiche le nom **en texte**, jamais par `{@html}` :
- titre « Revenir à la version publiée ? » ;
- corps « Les modifications de « <titre> » seront perdues. La page reprend sa version publiée. » ;
- boutons « Garder mes modifications » (premier, reçoit le focus) et « Revenir à la version publiée »
  (couleur de danger) ;
- Échap et la croix ferment sans rien changer ;
- pendant l'envoi, les deux boutons sont désactivés et la confirmation dit « Retour en cours… » ;
- au succès, l'îlot recharge l'écran (`location.reload()`) : le serveur rend la version publiée et
  l'absence de marque par son chemin habituel ;
- en échec réseau, la confirmation reste ouverte avec le message réseau existant.
Tous ces textes vivent dans `src/admin/textes.ts`, sans terme de développeur (FR-117).

**La route.** `POST /admin/pages/[slug]/revenir`, sans corps, sur le patron de
`src/pages/admin/formulaires/[id]/options.ts` :
- `verifierSession`, sinon `401` (ADR-0007) ; anti-forgerie par le cookie `SameSite=Strict`
  (ADR-0011) ;
- `404` pour un `slug` que la déclaration ne porte pas, sans erreur du serveur ;
- suppression, dans `src/platform/brouillons/magasin.ts`, de **toutes** les lignes de
  `brouillons_emplacements` de la page, y compris celles d'emplacements que la déclaration ne porte plus ;
  `slug` passe en paramètre lié, jamais concaténé ;
- succès même si la page ne portait aucun brouillon.

Rien n'est recopié depuis l'état publié : la superposition déjà en place (brouillon, sinon publié, sinon
départ) fait reparaître la version publiée sur l'éditeur, la liste des pages et l'aperçu.

**Hors de ce ticket.** Le refus pendant une publication et les effets sur l'écran Publier sont le ticket
02. Les réglages et les formulaires sont les tickets 03 et 04.

**Recette.** Ajouter au cahier de recette (`docs/cahier-de-test.md`) l'habillage de la confirmation sur un
écran de 360 px : une colonne, boutons de 44 px de haut au moins.

## Critères
- [x] la page « Tarifs » publiée, puis corrigée dans son texte de présentation et son bouton d'action, revient à sa version publiée : l'éditeur présente le texte et le bouton publiés, sans marque de brouillon ni dans l'éditeur ni dans la liste des pages, et l'aperçu présente la version publiée   (SC-01a)
- [x] la page « Contact », jamais publiée, dont le texte de présentation est corrigé puis revenu, présente le texte de départ posé par l'intégrateur, sans marque de brouillon   (SC-01b)
- [x] dès que l'éditrice enregistre la première correction d'une page sans brouillon, l'éditeur offre « Revenir à la version publiée », sans changement d'écran   (SC-01c)
- [x] l'éditrice actionne « Revenir à la version publiée » sur « Tarifs », puis choisit de garder ses modifications : la confirmation se ferme, le brouillon est intact et porte toujours sa marque   (SC-01d)
- [x] sur une page dont le titre contient `<`, `>`, `&` ou des guillemets, la confirmation présente ce titre comme du texte, sans balisage interprété, et dit que les modifications de cette page seront perdues   (SC-01e)
- [x] le retour d'une même page confirmé depuis deux onglets, l'un après l'autre : les deux gestes aboutissent, et la page présente sa version publiée sans marque de brouillon   (SC-01f)
- [x] « Accueil », « Tarifs », la mention d'information et « Devis gâteau » portent un brouillon ; après le retour de « Tarifs », les trois autres portent toujours leur brouillon, inchangé, et seul « Tarifs » n'en porte plus   (SC-01g)
- [x] après un retour confirmé sur une page, aucun geste de l'administration ne rend le brouillon abandonné   (SC-01h)
- [x] le geste de retour d'une page soumis sans session ouverte est refusé, et le brouillon de la page est intact   (SC-01i)
