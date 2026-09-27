# Run bloqué — L'éditeur et ses emplacements de texte habillés

Portée : 005-mise-en-page-administration · ticket 08
Ouvert le 2026-09-27 · branche `impl/editeur-emplacements-texte-08` (séquentiel) · HEAD `f261db7`

## Objectif
Habiller l'éditeur d'une page et ses trois emplacements de texte (texte riche, lien de vidéo,
bouton d'action) : une colonne à 360 px, refus lisible dans chaque carte, jetons Colibri, 44 px de
zone de toucher, contraste 4,5:1. Lancé en `/scd-spec-dev:run` séquentiel (run `wf_a60cdac2-be9`,
vérif `observé`, `oldBase` = `impl/marque-de-brouillon-05`, déjà fusionnée).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/08-editeur-emplacements-texte.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/design.md` — le change
à situer    la branche `impl/editeur-emplacements-texte-08` — le travail, **non commité** (4 fichiers d'impl)

## Acquis
- Le run s'est arrêté en `blocked-verify`, après l'intégration et avant la quality gate et la
  review : ni gate, ni review 8 dimensions, ni triage n'ont joué. Aucune PR.
- Intégration rendue par l'implementer : typecheck 0 erreur, build « Complete! », `npm test` →
  `Test Files 36 passed (36)` / `Tests 224 passed (224)`, lint sans sortie.
- Le verifier a observé l'artefact bâti (wrangler dev, Chromium Playwright). SC-08a à SC-08d sont
  prouvés. Contrairement aux tickets 05 et 07, le blocage n'est **pas** spurious : deux mesures
  échouent. Voici ce qu'il a rendu, sans troncature :
  - SC-08e : « ÉCHEC mesuré. Les champs de saisie des emplacements de texte font 264 × 42 px :
    Lien de la vidéo, Libellé, Va vers et Adresse du lien. Calcul : ligne de 24 px + padding 8/8 +
    bordure 1/1 = 42 px, sous 44. Tout le reste est conforme : ‹ Mes pages 97×44, les 5 boutons de
    la barre 48 à 66 × 44, les 3 Enregistrer 264×44, Appliquer le lien 264×44. Hors ticket
    (ticket 09) : Remplacer l'image et Ajouter une image font 32 px de haut. Correctif probable :
    max-md:min-h-11 sur les <input> des trois îlots. Je n'ai rien corrigé. »
  - SC-08f : « Pour tous les nœuds texte (60 à 1280 px, 51 à 360 px), le minimum est 5,2:1. Marque
    Brouillon : 5,2. Refus : 5,55. ‹ Mes pages : 5,65. Enregistrer : 6,46. Libellés : 16,67. En
    revanche, le placeholder du champ « Adresse du lien » est à l'encre 50 % (≈ rgb(139,144,142))
    sur blanc, soit 3,26:1, sous 4,5:1. » — humanCheck : « Décider si le placeholder du champ
    « Adresse du lien » compte comme un texte de l'éditeur. […] S'il compte, le critère échoue : il
    faut un token de contraste suffisant, par exemple placeholder:text-ink-muted, à 5,65:1. »
  - SC-08d (facultatif) : titre long simulé par le DOM ; une preuve sur un vrai contenu demande une
    page déclarée au titre long, rebâtie, puis `scrollWidth` = 360 à 360 px.
  - Remarque hors critère du verifier : le h1 est calculé à 15 px, sans taille propre.
- Le cahier de test (`docs/cahier-de-test.md`, non versionné) dort dans `stash@{0}`
  (« cahier-de-test (hors run 08) ») pendant le run.

## Prochaine étape
Faire trancher le placeholder (SC-08f) par l'humain, puis corriger les deux écarts sur la branche
(hauteur des champs, encre du placeholder), rejouer la mesure à 360 px, lancer
`/scd-spec-dev:review` (la review n'a pas joué) et ouvrir la PR.

## Écarté
- Relancer le run tel quel : l'implementer rendrait le même code, le verifier rebloquerait.
- Ranger SC-08e dans la recette globale comme pour 05/07 : l'échec est mesuré, pas inobservable.
