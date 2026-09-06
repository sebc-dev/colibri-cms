# 02 — La liste des pages

**Bloqué par :** 01
**Vérif :** test
**Fichiers :** `src/pages/admin/` (route « Mes pages »), `src/admin/` (l'écran de liste), `src/core/` (lecture de la structure déclarée), `content/pages/` (déclaration versionnée lue par la liste, ADR-0012), `tests/integration/`

Motif du mode `test` : l'oracle est la couture HTTP réelle contre la vraie base locale, comme 001 — il
s'écrit juste après la route qui sert la liste, la forme exacte de la réponse n'étant pas exprimable
avant elle. Les critères SC-02c et SC-02d se vérifient sur le HTML servi par la route (absence des
gestes et des mots attendus), pas à l'écran. L'instance de ce dépôt porte trois pages déclarées sous
`content/pages/` : l'état vide de SC-02b n'est donc pas observable par la couture HTTP tant qu'elles y
restent ; il est vérifié sans requête, au niveau du modèle pur, dans
`tests/static/liste-des-pages-statique.test.ts`.

## Ce que ça livre
La rubrique « Mes pages » devient un vrai point d'entrée : elle affiche toutes les pages du site
déclarées par l'intégrateur, dans l'ordre posé, une ligne par page. Une instance où aucune page n'est
déclarée montre un message disant qu'il n'y a rien à éditer — et aucun geste de création n'est offert,
puisque l'éditrice ne crée aucune page. La liste lit la déclaration ; elle ne l'écrit jamais. La
pastille de brouillon n'apparaît pas encore : elle naît avec la première correction (ticket 04).

Ce ticket sert « Mes pages » sur une route dédiée (`src/pages/admin/mes-pages.astro`), plutôt que sur
la route d'accueil existante (`src/pages/admin/index.astro`) : cette dernière reste sous le contrat
figé de `tests/integration/code-ouvre-la-session.test.ts` et `tests/static/gabarits-admin.test.ts`
(ticket 06 et ticket 01 de 001-connexion-par-code), qui verrouillent sa réponse et sa source à n'offrir
aucun lien, aucun bouton, aucun formulaire — incompatible avec une vraie liste de pages. Ce ticket porte
aussi l'assemblage de cet écran dans le cadre posé par le ticket 01 (barre latérale, menu, « Mes pages »
marquée active et menant à cet écran) : aucun autre ticket ne le fait.

## Critères
- [x] L'`Écran : Liste des pages` affiche les pages déclarées dans l'ordre posé, une ligne par page.   (SC-02a)
- [x] Une instance sans aucune page déclarée affiche le message d'état vide et n'offre aucun geste de création de page.   (SC-02b)
- [x] La liste ne présente aucun geste d'ajout, de retrait, de déplacement ni de renommage de page (FR-024/025).   (SC-02c)
- [x] Aucun terme de développeur ne paraît dans la liste ni dans le message d'état vide.   (SC-02d)
- [ ] L'`Écran : Liste des pages` est servi dans l'`Écran : Cadre de l'administration` (barre latérale et menu présents, « Mes pages » marquée active et menant à cet écran) — ce ticket porte l'assemblage entre les deux écrans, aucun autre ticket ne le fait.
