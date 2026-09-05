# 03 — Ouvrir une page et retrouver ses emplacements

**Bloqué par :** 02
**Vérif :** observé (mise en page — `Écran : Éditeur de page`)

Motif du mode `observé` : ce que ce ticket livre est un **rendu** — chaque emplacement présenté avec
le moyen d'édition de sa nature (barre de mise en forme du texte riche, champ de lien de vidéo, champs
d'un bouton), et l'absence de tout geste de structure. Ni la présence de ces affordances visuelles ni
leur agencement sous CSP stricte ne se constatent en test unitaire ; l'enregistrement, lui, est testé
dans les tickets 04–06 qui le livrent.

**Fichiers :** `src/pages/admin/` (route de l'éditeur), `src/admin/` (l'écran d'édition et le rendu par nature), `src/core/` (lecture de la structure d'une page déclarée)

## Ce que ça livre
Depuis la liste, l'éditrice ouvre une page et retrouve ses emplacements dans l'ordre posé par
l'intégrateur, chacun présenté avec le moyen d'édition de sa nature : une zone de texte riche avec sa
barre de mise en forme, un champ pour un lien de vidéo, deux champs (libellé, destination) pour un
bouton d'action. Un fil de retour ramène vers « Mes pages ». Aucun geste n'ajoute, ne retire, ne
déplace ni ne renomme un emplacement, et rien ne l'offre à l'écran. L'éditeur montre ici le contenu
courant de chaque emplacement ; l'enregistrement d'une correction, par nature, vient aux tickets 04–06.

## Critères
- [ ] Cliquer une page de la liste ouvre son `Écran : Éditeur de page`.
- [ ] L'éditeur présente les emplacements de la page dans l'ordre posé, chacun avec le moyen d'édition de sa nature (texte riche, lien de vidéo, bouton d'action).
- [ ] Chaque emplacement présente le contenu courant de la page.
- [ ] Le fil de retour ramène à l'`Écran : Liste des pages`.
- [ ] Aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement ; l'écran n'en offre aucun (FR-024/025).
- [ ] Aucun terme de développeur ne paraît dans l'éditeur.
