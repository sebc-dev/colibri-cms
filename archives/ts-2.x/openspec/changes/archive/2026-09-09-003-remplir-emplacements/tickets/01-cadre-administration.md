# 01 — Le cadre de l'administration

**Bloqué par :** —
**Vérif :** observé
**Fichiers :** `src/admin/` (nouvel îlot du cadre), `src/pages/admin/` (l'écran qui le monte), `src/admin/admin.css`

Motif du mode `observé` : ce que ce ticket livre est une **mise en page** — l'`Écran : Cadre de
l'administration`, le repli de la barre en un rail d'icônes seules et l'élargissement de la zone de
contenu. Ni la présence de ces affordances ni leur agencement ne se constatent en test unitaire ; la
preuve est capturée à l'écran.

## Ce que ça livre
L'administration présente enfin de quoi naviguer : une barre latérale qui porte le menu des rubriques
— « Mes pages », Médias, Réglages, Formulaires, Demandes —, « Mes pages » étant la rubrique active.
Un bouton replie la barre en un rail d'icônes seules et la redéploie ; la zone de contenu s'élargit
d'autant, et l'état replié/déployé est retenu sur l'appareil (une préférence locale, sans aucun effet
serveur). Les autres rubriques ne mènent à aucun écran servi ici : elles situent la navigation. C'est
le substrat commun où la liste des pages et l'éditeur s'afficheront (tickets 02, 03). Un unique îlot
monté en application, sous CSP stricte, sur le patron posé par 002.

## Critères
- [x] L'`Écran : Cadre de l'administration` affiche la barre latérale avec les cinq rubriques, « Mes pages » marquée active.   (SC-01a)
- [x] Le bouton de repli réduit la barre à un rail d'icônes seules ; la rubrique active y reste marquée, et la zone de contenu s'élargit.   (SC-01b)
- [x] Redéployer la barre restaure les libellés à côté des icônes.   (SC-01c)
- [x] L'état replié/déployé est retenu sur l'appareil : recharger l'écran conserve le dernier état choisi, sans requête serveur pour le porter.   (SC-01d)
- [x] Aucune rubrique autre que « Mes pages » ne mène à un écran servi ; le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page.   (SC-01e)
- [x] Aucun terme de développeur ne paraît dans le menu ni dans les libellés du cadre.   (SC-01f)
- [x] L'écran est servi sous les en-têtes réels (CSP stricte de l'administration, ADR-0004 + ADR-0008 ; tolérance des attributs `style="…"`, ADR-0010) sans script en ligne ni directive `client:*` (ADR-0006).   (SC-01g)
