# 05 — Régler un emplacement de lien de vidéo

**Bloqué par :** 04
**Vérif :** test
**Fichiers :** `src/core/emplacements/lien-video.ts` (reconnaissance d'un lien de vidéo), `src/admin/emplacements/LienVideo.svelte` (champ et message d'erreur), `tests/integration/lien-video.test.ts`

Motif du mode `test` : deux coutures — la couture haute `core/`, pure, pour la reconnaissance d'un lien,
et la couture d'intégration HTTP contre la vraie base locale, qui ne s'exprime qu'une fois la route de
04 branchée sur cette nature d'emplacement. Les critères SC-05d et SC-05e se vérifient sur le HTML servi
par la route (message de refus au niveau du champ, absence des mots attendus), pas à l'écran.

La route d'écriture posée par le ticket 04 est réutilisée telle quelle : ce ticket ne la modifie pas, ce
qui le rend parallélisable avec le ticket 06.

## Ce que ça livre
L'éditrice règle un emplacement de lien de vidéo en collant un lien externe : un lien reconnu est
enregistré au brouillon de la page (la page bascule à « brouillon », l'état publié reste intact,
via la colonne vertébrale d'écriture du ticket 04) ; un lien non reconnu est refusé au niveau du
champ, en disant ce qui est attendu, sans rien enregistrer. La reconnaissance est une logique pure de
`core/`, testable en aller-retour.

## Critères
- [ ] En `core/`, un lien de vidéo externe reconnu est accepté ; un lien non reconnu est rejeté.   (SC-05a)
- [ ] Par la couture HTTP, coller un lien reconnu persiste le brouillon et fait basculer la page à « brouillon », l'état publié restant intact.   (SC-05b)
- [ ] Par la couture HTTP, coller un lien non reconnu n'écrit aucun brouillon et ne fait pas basculer l'état de la page.   (SC-05c)
- [ ] À l'`Écran : Éditeur de page`, un lien non reconnu est refusé au niveau du champ (`États : erreur`) en disant ce qui est attendu.   (SC-05d)
- [ ] Aucun terme de développeur ne paraît dans le champ ni dans le message d'erreur.   (SC-05e)
