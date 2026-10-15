# Run bloqué — ticket 02, seuil de connexion par origine

Portée : 012-envoi-des-demandes-de-devis · ticket 02
Ouvert le 2026-10-15 · branche `impl/seuil-de-connexion-par-origine-02` · HEAD `98a13c0`

## Objectif
Livrer le ticket 02 (au-delà de vingt tentatives par heure depuis une même origine, l'écran de
connexion refuse sans rien retenir de lisible), empilé sur la branche du ticket 01.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/02-seuil-de-connexion-par-origine.md` — le ticket (SC-02a à SC-02i)
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (proposal, design, deltas, ADR-0028)
à extraire  `tests/integration/seuil-de-connexion.test.ts` l. 408-434 — SC-02d, le test qui ne se termine pas

## Acquis
- Le run `wf_224268e4-c99` s'est arrêté en `blocked-verify` (mode tdd). Il est parti de la tête
  `98a13c0` de la branche du 01, avant les corrections de relecture `0d61fd8` et `cca7ad7`.
- Le travail vit dans le worktree conservé
  `/home/negus/projets/colibri-cms/.git/scd-worktrees/seuil-de-connexion-par-origine-02`, NON COMMITÉ :
  code en modifié ou non suivi, tests neufs en non suivi (la ceinture a retiré leur intent-to-add).
  Ne pas les perdre : pas de `stash pop` aveugle, pas de `checkout --`.
- La ceinture a jugé les tests strictement additifs. Huit critères sur neuf sont prouvés par leur
  test joué seul ou filtré. Seul SC-02d reste non prouvé : il cale sur `await espion.premier` et ne
  rend jamais la main, ni à son délai de 60 s ni en suite complète. `npm test` ne se termine donc pas.
  Sans ce fichier, la suite passe.
- Deux lectures se sont opposées. L'implémenteur a jugé le banc en cause : avec une pause de 1500 ms à
  la place de `await espion.premier`, il a vu le test passer, et il dit avoir reproduit le blocage sur
  `code-vers-adresse-autorisee.test.ts` en lisant le corps après l'attente. Le vérificateur a envisagé
  que l'envoi depuis la seconde origine, sur le même appareil après vingt codes faux, n'ait pas lieu.
  Je n'ai tranché ni l'une ni l'autre.
- Le test existant `code-vers-adresse-autorisee.test.ts` attend l'envoi sans lire le corps, et il
  passe avec le code du ticket.

## Prochaine étape
Établir, preuve à l'appui, si SC-02d bute sur le banc (ordre attente / lecture du corps) ou sur le
code (aucun envoi depuis la seconde origine). Si c'est le test, faire trancher sa retouche par
l'humain. Ensuite, reprendre ou finir à la main, en rejouant aussi `npm run analyse` : ce run ne porte
pas `0d61fd8`, et `analyse` y restera rouge sur `src/core/pages/declaration.ts` tant que la branche
ne sera pas remise sur celle du 01 à jour.

## Écarté
- Remplacer `await espion.premier` par une pause fixe : cela masquerait un envoi qui n'a pas lieu.

## Issue
Le diagnostic a établi que le test calait, pas le code : attendre une promesse résolue par la route
faisait continuer le test dans le contexte de la requête. L'humain a validé la retouche de SC-02d
(attente par sondage borné) le 2026-10-15. J'ai commité le travail du workflow, remis la branche sur
la tête à jour du 01 (`cca7ad7`), aligné l'expression régulière de `texteVisibleDe` sur le dépôt pour
`analyse` (`c531843`), rejoué tous les contrôles, puis ouvert la PR #246, empilée en brouillon sur la
branche du 01. Restait à jouer `/scd-spec-dev:review` sur la PR.
