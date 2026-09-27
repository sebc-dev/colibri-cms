# Run bloqué — « Mes pages » habillé

Portée : 005-mise-en-page-administration · ticket 07
Ouvert le 2026-09-27 · Clos le 2026-09-27 · branche `impl/mes-pages-habille-07` (séquentiel) · HEAD `f1b63e0`

## Objectif
Habiller l'écran « Mes pages » : une carte, une ligne par page avec son adresse sur le site en
JetBrains Mono sous le titre, la marque de brouillon, 44 px par ligne sur téléphone.
Lancé en `/scd-spec-dev:run` séquentiel (run `wf_4bf47516-9a5`, vérif `test`).

## Contexte à charger
à lire      `openspec/changes/005-mise-en-page-administration/tickets/07-mes-pages-habille.md` — le ticket
à lire      `openspec/changes/005-mise-en-page-administration/design.md` — le change
à situer    la branche `impl/mes-pages-habille-07` — le travail (2 fichiers d'impl modifiés, 1 test neuf)

## Acquis
- Le run s'est arrêté en `blocked-verify`, après le vert et avant la quality gate et la review :
  ni gate, ni review 8 dimensions, ni triage n'ont joué. Aucune PR.
- La ceinture était propre : diff de tests strictement additif (un fichier neuf, 249 lignes),
  aucun neutraliseur, `npm test` → `Test Files 36 passed (36)` / `Tests 224 passed (224)`.
- SC-07a est prouvé par test. SC-07b et SC-07c ont un test vert, mais qui ne lit que le balisage
  (classes, tokens) : `workerd` n'applique aucun CSS et ne charge aucune police. SC-07d, SC-07e et
  SC-07f n'ont aucun test possible en `workerd`. C'est le blocage spurious déjà vu sur un
  `humanCheckRequired` posé par le verifier lui-même.
- Le verifier a rendu, sans troncature, ces points à constater :
  - SC-07b : « Sur l'artefact bâti (npm run build puis wrangler dev), ouvrir /admin/mes-pages après
    connexion. Dans DevTools > Computed/Rendered Fonts, vérifier : titre h1 en Fraunces, texte des
    lignes en Instrument Sans, adresse (/ , /tarifs, /contact) en JetBrains Mono. document.fonts
    doit montrer les trois polices à l'état loaded. »
  - SC-07c : « Sur wrangler dev, à 1280 px, comparer /admin/mes-pages au canvas Colibri : fond
    neutre chaud (ni blanc pur ni gris froid), carte de liste sur fond card, titre en Fraunces,
    texte en Instrument Sans. »
  - SC-07d : « Sur wrangler dev, avec une largeur d'affichage de 360 px (DevTools, mode appareil),
    ouvrir /admin/mes-pages avec un titre de page long. Vérifier que
    document.documentElement.scrollWidth <= 360 (pas de défilement horizontal) et qu'aucun titre,
    adresse ou marque de brouillon n'est coupé. »
  - SC-07e : « À 360 px, mesurer dans DevTools (getBoundingClientRect) chaque <li> de la liste et
    chaque élément actionnable. Chacun doit faire au moins 44 x 44 px. Vérifier aussi que la marque
    de brouillon passe sous le titre. »
  - SC-07f : « Avec l'outil de contraste de DevTools ou axe, vérifier au moins 4,5:1 pour : le
    titre, le texte des lignes, les adresses, la marque de brouillon (text-gorge sur bg-gorge-soft)
    et le message d'état vide en ink-muted. Pour voir ce message, il faut un état sans page
    déclarée. »
- Le cahier de test (`docs/cahier-de-test.md`, non versionné) a été mis de côté pendant le run,
  puis remis en place.

## Prochaine étape
Suivre la voie de la recette globale de fin de front (précédents : tickets 06 #116 et 05 #120).
Ajouter SC-07b à SC-07f au cahier et à l'artefact de recette dans un § dédié au ticket 07, cocher
SC-07a, rejouer `/scd-spec-dev:review` sur la branche (la review n'a pas joué), puis ouvrir la PR
à la main.

## Issue
Suivi de la décision humaine déjà prise pour 005 : SC-07b à SC-07f ne bloquent pas le ticket, leur
part navigateur part à la recette globale de fin de mise en page (cahier de recette § 20, CT-20.1 à
CT-20.8). J'ai rejoué la review à la main (8 dimensions, triage) : 13 findings, tous écartés au
triage, aucun bloquant. `analyse` relevait une interpolation non typée dans le test neuf, corrigée.
J'ai coché SC-07a, laissé SC-07b à SC-07f ouverts. Reste à l'humain : confirmer la règle d'adresse
(`accueil` → `/`, sinon `/<identifiant>`), que le change ne fixe nulle part.

## Écarté
- Relancer le run tel quel : le verifier rebloquerait sur les mêmes critères.
