# 01 — Le cadre de l'administration

**Bloqué par :** rien — démarrable
**Vérif :** observé (mise en page — `Écran : Cadre de l'administration`)
**Fichiers :** `src/admin/` (nouvel îlot du cadre), `src/pages/admin/` (l'écran qui le monte), `src/admin/admin.css`

## Ce que ça livre
L'administration présente enfin de quoi naviguer : une barre latérale qui porte le menu des rubriques
— « Mes pages », Médias, Réglages, Formulaires, Demandes —, « Mes pages » étant la rubrique active.
Un bouton replie la barre en un rail d'icônes seules et la redéploie ; la zone de contenu s'élargit
d'autant, et l'état replié/déployé est retenu sur l'appareil (une préférence locale, sans aucun effet
serveur). Les autres rubriques ne mènent à aucun écran servi ici : elles situent la navigation. C'est
le substrat commun où la liste des pages et l'éditeur s'afficheront (tickets 02, 03). Un unique îlot
monté en application, sous CSP stricte, sur le patron posé par 002.

## Critères
- [ ] L'`Écran : Cadre de l'administration` affiche la barre latérale avec les cinq rubriques, « Mes pages » marquée active.
- [ ] Le bouton de repli réduit la barre à un rail d'icônes seules ; la rubrique active y reste marquée, et la zone de contenu s'élargit.
- [ ] Redéployer la barre restaure les libellés à côté des icônes.
- [ ] L'état replié/déployé est retenu sur l'appareil : recharger l'écran conserve le dernier état choisi, sans requête serveur pour le porter.
- [ ] Aucune rubrique autre que « Mes pages » ne mène à un écran servi ; le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page.
- [ ] Aucun terme de développeur ne paraît dans le menu ni dans les libellés du cadre.
- [ ] L'écran est servi sous les en-têtes réels (CSP stricte, ADR-0010) sans script en ligne ni directive `client:*` (ADR-0006).
