# Recette complète de l'application sur le serveur de recette

Portée : hors-cycle
Ouvert le 2026-10-27 · Actualisé le 2026-10-27 · branche `recette/complete-2026-10` · HEAD `9af1e47`

## Objectif
Dérouler tout `docs/cahier-de-test.md` sur la version courante de `main`, sur le serveur de recette
(`https://colibri.sebc.dev`), dans un vrai navigateur piloté par `playwright-cli`, et reporter chaque
verdict (OK, KO, NA) au bilan du cahier.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — déployer, se connecter, piloter le navigateur, traduire le cahier (202 l.)
à lire      `.claude/skills/site-factice/SKILL.md` — variantes et jeu d'images exigés par certains cas (58 l.)
à extraire  `docs/cahier-de-test.md` › `## 0. Préparer le terrain` et `## Bilan` — 869 l., les sections se lisent une à une pendant la recette
à situer    `.claude/skills/playwright-cli/SKILL.md` — 484 l., chargé par le skill recette au besoin
à situer    `~/projets/colibri_recette` — le clone du dépôt de recette que Workers Builds rebâtit

## Acquis
- J'avais retenu le cahier entier, sections déjà jugées comprises : leurs verdicts dataient d'une
  version antérieure.
- Je jouais moi-même chaque cas ; l'utilisateur ne refait jamais la recette à la main. Je ne lui
  renvoyais que l'inobservable (vrai téléphone, geste dans un compte tiers), en le nommant.
- Un KO se consignait dans le cahier et la recette continuait : aucun correctif en cours de passage,
  pour que la version recettée reste la même du début à la fin.
- Les verdicts allaient sur la branche du chantier, avec une PR à la fin.
- L'en-tête du cahier (« État couvert », « Hors périmètre ») était resté au 2026-09-28 : il rangeait
  encore l'aperçu et la publication hors du périmètre. J'allais le refaire avant le § 1.
- Mettre le serveur à jour, c'était : migrations par un aperçu (`site.mjs deployer standard`, sans
  `--principal`), puis `recette.mjs depot ~/projets/colibri_recette`, contrôle que
  `git diff HEAD~1 -- content` est vide, puis envoi du clone. Après une migration, redéployer aussi
  les variantes `rang`, `titres-longs` et `vide`, qui partagent la base.
- L'archivage du change 013 attendait le passage des §§ 35 à 41.

## Prochaine étape
Mettre le serveur de recette sur `main` à jour (la version servie se lit dans
`git -C ~/projets/colibri_recette log -1`), redéployer les variantes, puis refaire l'en-tête du cahier.

## Écarté
- Jouer en local (`wrangler dev`, § 0.2 du cahier) : le serveur de recette donne la vraie D1, le vrai
  e-mail et la CSP servie en HTTPS.
- `recette.mjs deployer --principal` : il remplacerait le Worker bâti par Workers Builds, et toute
  publication échouerait.
- Le MCP Playwright : l'utilisateur avait choisi `playwright-cli`.
- Tout jouer en une session : le cahier est trop long ; la fiche s'actualise à chaque pause, lot de
  sections par lot.
