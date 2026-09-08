# 05 — Régler un emplacement de lien de vidéo

**Bloqué par :** 04
**Vérif :** test
**Fichiers :** `src/core/pages/lien-video.ts` (reconnaissance pure : liste blanche YouTube/Vimeo + motifs par hébergeur), `src/pages/admin/pages/[slug]/emplacements/[id].ts` (embranchement par nature, **modifié**), `src/platform/brouillons/magasin.ts` (persistance de la correction de lien de vidéo, réutilise la table `0004`), `src/admin/ilots-svelte-5/ReglageLienVideo.svelte` + `src/admin/ilots-svelte-5/monter.ts` (champ, message d'erreur, montage de l'îlot), `src/admin/textes.ts` (libellés sans terme de développeur), `tests/integration/regler-lien-video.test.ts`

Motif du mode `test` : deux coutures — la couture haute `core/`, pure, pour la reconnaissance d'un lien
par liste blanche d'hébergeurs, et la couture d'intégration HTTP contre la vraie base locale, qui ne
s'exprime qu'une fois la route de 04 branchée sur cette nature d'emplacement. Les critères SC-05d et
SC-05e se vérifient sur le HTML servi par la route (message de refus au niveau du champ, absence des
mots attendus), pas à l'écran.

La route d'écriture de 04 (`…/emplacements/[id].ts`) n'aiguille aujourd'hui que la nature
`bouton-action` (elle appelle `enregistrerCorrectionBoutonAction` sans embranchement, s'appuyant sur
`core/` pour refuser les autres natures). Ce ticket y **introduit l'embranchement par nature déclarée**
(ADR-0012) et y ajoute la branche `lien-video`, plus sa logique `core/`, son îlot et son test. Comme le
ticket 06 doit toucher cette même route et la même persistance, **05 et 06 ne sont pas
co-parallélisables** : les lancer l'un après l'autre — le premier introduit l'embranchement, le second
ajoute sa branche.

## Ce que ça livre
L'éditrice règle un emplacement de lien de vidéo en collant un lien externe : un lien dont l'hôte est
sur la liste blanche d'hébergeurs (YouTube, Vimeo) est enregistré au brouillon de la page (la page
bascule à « brouillon », l'état publié reste intact, via la colonne vertébrale d'écriture du ticket 04) ;
un lien hors liste blanche est refusé au niveau du champ, en disant ce qui est attendu, sans rien
enregistrer. La reconnaissance — liste blanche et motifs par hébergeur — est une logique pure de `core/`,
en un seul lieu de vérité, testable en aller-retour.

## Critères
- [ ] En `core/`, un lien de vidéo est accepté ssi son hôte est sur la liste blanche (YouTube, Vimeo) selon le motif de l'hébergeur (`youtube.com/watch?v=…`, `youtu.be/…`, `vimeo.com/…` acceptés) ; un hôte hors liste, un lien non `https` ou une chaîne qui n'est pas une URL sont rejetés.   (SC-05a)
- [ ] Par la couture HTTP, coller un lien reconnu persiste le brouillon et fait basculer la page à « brouillon », l'état publié restant intact.   (SC-05b)
- [ ] Par la couture HTTP, coller un lien non reconnu n'écrit aucun brouillon et ne fait pas basculer l'état de la page.   (SC-05c)
- [ ] À l'`Écran : Éditeur de page`, un lien non reconnu est refusé au niveau du champ (`États : erreur`) en disant ce qui est attendu.   (SC-05d)
- [ ] Aucun terme de développeur ne paraît dans le champ ni dans le message d'erreur.   (SC-05e)
