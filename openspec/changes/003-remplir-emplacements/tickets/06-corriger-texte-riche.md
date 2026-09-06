# 06 — Corriger un emplacement de texte riche

**Bloqué par :** 04
**Vérif :** test
**Fichiers :** `src/core/emplacements/texte-riche.ts` (sérialisation en Markdown restreint, liste des marques et des schémas d'URL), `src/admin/emplacements/TexteRiche.svelte` (éditeur TipTap en îlot, barre de mise en forme), `tests/integration/texte-riche.test.ts`

Motif du mode `test` : deux coutures — la couture haute `core/`, pure, pour l'aller-retour de
sérialisation, et la couture d'intégration HTTP contre la vraie base locale, qui ne s'exprime qu'une
fois la route de 04 branchée sur cette nature d'emplacement. Les critères SC-06d et SC-06f se vérifient
sur le HTML servi par la route (présence des commandes de mise en forme, aucune saisie de balise
offerte, absence des mots attendus), pas à l'écran.

La route d'écriture posée par le ticket 04 est réutilisée telle quelle : ce ticket ne la modifie pas, ce
qui le rend parallélisable avec le ticket 05.

## Ce que ça livre
L'éditrice met en forme un emplacement de texte riche — gras, italique, lien, liste, titre — sans
jamais écrire de balise, et enregistre : le contenu est sérialisé en Markdown restreint et va au
brouillon (la page bascule à « brouillon », l'état publié reste intact, via la colonne vertébrale du
ticket 04). Seules les marques dont l'aller-retour est testé survivent ; une marque hors liste est
écartée. Seuls les schémas d'URL `https`, `mailto`, `tel` et les chemins relatifs sont admis dans un
lien ; tout autre schéma est rejeté. L'éditeur est TipTap, monté en îlot sous CSP stricte. Le rendu
HTML du Markdown n'est pas ici — il naît avec l'aperçu (hors-périmètre, I5 / `render/markdown/`).

## Critères
- [ ] En `core/`, l'aller-retour de sérialisation d'une marque retenue (gras, italique, lien, liste, titre) préserve la marque.   (SC-06a)
- [ ] En `core/`, une marque hors de la liste retenue est écartée à la sérialisation.   (SC-06b)
- [ ] En `core/`, un lien vers un schéma d'URL non autorisé (hors `https`, `mailto`, `tel`, relatif) est rejeté.   (SC-06c)
- [ ] À l'`Écran : Éditeur de page`, la barre de mise en forme pose gras, italique, lien, liste et titre sans que l'éditrice écrive de balise.   (SC-06d)
- [ ] Par la couture HTTP, enregistrer une correction de texte riche persiste le brouillon en Markdown restreint et fait basculer la page à « brouillon », l'état publié restant intact.   (SC-06e)
- [ ] Aucun terme de développeur ne paraît dans l'éditeur de texte riche ni dans sa barre de mise en forme.   (SC-06f)
