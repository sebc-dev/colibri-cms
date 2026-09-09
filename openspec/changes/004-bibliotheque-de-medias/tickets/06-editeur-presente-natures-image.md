# 06 — L'éditeur présente les emplacements d'image, de galerie et de carrousel

**Bloqué par :** 03
**Vérif :** observé
**Fichiers :** `src/pages/admin/pages/[slug].astro` (l'écran éditeur, étendu), `src/admin/ilots-svelte-5/` (présentation des trois natures d'image dans l'éditeur), `src/core/pages/declaration.ts` (lecture des trois natures, livrée au ticket 03 et consommée ici)

Motif du mode `observé` : ce ticket livre un rendu — les nouveaux emplacements présentés selon leur nature dans l'éditeur, sous CSP stricte. Ni la présence de ces zones ni leur agencement ne se constatent en couture `workerd`. Le moyen d'édition fonctionnel — le sélecteur d'image, la composition d'une galerie — vient avec sa pose, aux tickets 08 et 09.

## Ce que ça livre
Quand l'éditrice ouvre une page, ses emplacements d'image, de galerie et de carrousel paraissent désormais dans l'éditeur, chacun présenté selon sa nature et montrant son contenu courant — l'image posée, ou l'ensemble d'images d'une galerie — aux côtés des emplacements de texte, de lien et de bouton déjà présents. Ils paraissent dans l'ordre posé par l'intégrateur. Comme pour les autres natures, aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement, et aucun terme de développeur ne paraît. L'ouverture d'une page depuis la liste et le fil de retour vers « Mes pages » sont déjà en place et continuent de fonctionner avec les emplacements d'image présents. Le moyen de poser ou de composer une image vient ensuite ; cet écran ne porte que la présentation.

## Critères
- [ ] Les emplacements paraissent dans l'ordre posé, chacun présenté selon sa nature — texte riche, lien de vidéo, bouton d'action, image, galerie, carrousel — le moyen d'édition de chaque nature d'image venant avec sa pose.   (SC-06a)
- [ ] Chaque emplacement d'image, de galerie ou de carrousel montre son contenu courant.   (SC-06b)
- [ ] Aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement, et rien ne l'offre à l'écran.   (SC-06c)
- [ ] Aucun terme de développeur ne paraît dans l'éditeur.   (SC-06d)
