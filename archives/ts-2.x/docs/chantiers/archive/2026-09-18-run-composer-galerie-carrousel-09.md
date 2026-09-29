# Run bloqué — composer une galerie, un carrousel (ticket 09)

Portée : 004-bibliotheque-de-medias · ticket 09
Ouvert le 2026-09-18 · Clos le 2026-09-20 · branche `impl/composer-galerie-carrousel-09`

## Objectif
Faire passer la quality gate du ticket 09 puis reprendre le run là où il s'est arrêté (review, PR) —
le comportement, lui, était vérifié.

## Contexte à charger
à lire      `openspec/changes/004-bibliotheque-de-medias/tickets/09-composer-galerie-carrousel.md` — les 2 critères et le mode `test`
à lire      `openspec/changes/004-bibliotheque-de-medias/proposal.md` — le change que le ticket honore

## Acquis
- Run `run-parallel` (wf_b24c2ca7-26d, chaîne 09→10→11) arrêté en `blocked-quality` sur 09 ; 10 et
  11 interrompus en amont sans rien écrire. Les 2 critères de 09 avaient été vérifiés par le
  `verifier` (ceinture propre, test neuf additif, suite complète verte).
- Le seul échec **bloquant** était `analyse`, dans un fichier de test **hors du diff du ticket**,
  déjà rouge sur `main` (venu de 07, #96) — second cas du genre après #94. Sortie réelle :
  ```
  tests/integration/fiche-renommer-decrire.test.ts
    227:5  error  Prefer "expect(ligne.nom_affichage).toBeNull()" over this generic assertion  sonarjs/prefer-specific-assertions
    247:5  error  Prefer "expect(ligne.description).toBeNull()" over this generic assertion    sonarjs/prefer-specific-assertions
    272:5  error  Prefer "expect(ligne.nom_affichage).toBeNull()" over this generic assertion  sonarjs/prefer-specific-assertions
    273:5  error  Prefer "expect(ligne.description).toBeNull()" over this generic assertion    sonarjs/prefer-specific-assertions
  ✖ 4 problems (4 errors, 0 warnings)
  ```
- La gate a résorbé la duplication `EmplacementGalerie` ↔ `EmplacementCarrousel` (identiques à deux
  libellés près) en un seul `EmplacementComposition.svelte` à prop `nature` ; les deux anciens
  fichiers sont supprimés. Après ce refactor : build vert, test du ticket 2/2, suite complète
  `27 fichiers / 195 tests` verte au second rejeu — le premier avait 4 échecs épars (CSP, lien
  vidéo, réserve, SC-09a), disparus au rejeu : flake d'exécution, pas régression.
- Le test pose deux emplacements réels dans `content/pages/accueil` (`galerie-realisations`) et
  `content/pages/contact` (`carrousel-clients`) — hors de la ligne `**Fichiers :**` du ticket, à
  relire en review comme pose d'intégrateur.

## Issue
La dette `analyse` a été corrigée sur `main` par #98 (`449e94c`), qui a aussi mis `analyse` en
annotation dans la CI. La chaîne relancée a rejoint ce worktree, rebasé sur `main`, et a abouti pour
09 — critères validés, corrections de review appliquées — mais la session s'est éteinte pendant la
publication de la PR : branche poussée, PR ouverte à la main ensuite, avec deux fichiers de review
oubliés du commit (`VignetteMedia.svelte`, `soumettre-correction.ts`) rattrapés avant.

## Écarté
- Corriger le test de 07 depuis la PR de 09 — hors périmètre, et fichier de test interdit aux
  agents du run.
- Déroger `analyse` — le rouge est réel et rattraperait 10 puis 11.
- Un flag booléen `estCarrousel` sur le composant fusionné — la prop `nature` ne pilote que des
  libellés, comme `libelle-compte-images.ts`.
