# 03 — Ouvrir une page et retrouver ses emplacements

**Bloqué par :** 02
**Vérif :** observé
**Fichiers :** `src/pages/admin/` (route de l'éditeur), `src/admin/` (l'écran et le rendu de présentation par nature), `src/core/` (lecture de la structure d'une page déclarée)

Motif du mode `observé` : ce que ce ticket livre est un **rendu** — chaque emplacement présenté selon
sa nature et montrant son contenu courant, et l'absence de tout geste de structure. Ni la présence de
ces affordances visuelles ni leur agencement sous CSP stricte ne se constatent en test unitaire. Le
moyen d'édition fonctionnel de chaque nature (barre de mise en forme, saisie validée, enregistrement)
naît avec sa correction, aux tickets 04–06 qui la livrent.

## Ce que ça livre
Depuis la liste, l'éditrice ouvre une page et retrouve ses emplacements dans l'ordre posé par
l'intégrateur, chacun présenté selon sa nature : une zone de texte riche, un champ de lien de vidéo,
deux champs (libellé, destination) pour un bouton d'action — chacun montrant le contenu courant de la
page. Un fil de retour ramène vers « Mes pages ». Aucun geste n'ajoute, ne retire, ne déplace ni ne
renomme un emplacement, et rien ne l'offre à l'écran. Cet écran porte la présentation par nature ; le
moyen d'édition fonctionnel de chaque nature — la barre de mise en forme du texte riche, la saisie
validée du lien de vidéo, l'enregistrement des champs du bouton — vient avec sa correction, aux
tickets 04–06.

## Critères
- [x] Cliquer une page de la liste ouvre son `Écran : Éditeur de page`.   (SC-03a)
- [x] L'éditeur présente les emplacements de la page dans l'ordre posé, chacun présenté selon sa nature (texte riche, lien de vidéo, bouton d'action) ; le moyen d'édition fonctionnel de chaque nature vient avec sa correction, non ici.   (SC-03b)
- [x] Chaque emplacement présente le contenu courant de la page.   (SC-03c)
- [x] Le fil de retour ramène à l'`Écran : Liste des pages`.   (SC-03d)
- [x] Aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement ; l'écran n'en offre aucun (FR-024/025).   (SC-03e)
- [x] Aucun terme de développeur ne paraît dans l'éditeur.   (SC-03f)
