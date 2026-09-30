# Recette en double : à la main et par Claude avec playwright-cli

Portée : 005-mise-en-page-administration
Ouvert le 2026-09-30 · branche `chore/chantier-recette-en-double` · HEAD `f3fa9c9`

## Objectif
Jouer la recette de fin de front deux fois sur le serveur de recette : une passe à la main par
l'humain, une passe automatisée par Claude avec `playwright-cli`. Puis comparer les verdicts, cas
par cas. J'allais d'abord observer comment cet outillage (serveur de recette, playwright-cli et
Claude) se comporte, avant de juger s'il peut remplacer tout ou partie de la passe à la main.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — déployer, ouvrir une session, piloter le navigateur (123 l.)
à extraire  `docs/cahier-de-test.md` › § 18 à 22 (L388-L501) — les cas visuels du change 005 ; § 0 pour la mise en route
à situer    `.claude/skills/playwright-cli/SKILL.md` — 484 l., se charge par le skill quand la passe automatisée démarre
à situer    artefact « Recette ColibriCMS » https://claude.ai/artifact/R8m337DBHqZiBeH85oMPSG — la base partagée des verdicts
à situer    `docs/chantiers/archive/2026-09-28-site-factice-recette.md` — le jeu de pages factices déjà monté

## Acquis
- Les critères visuels de 005 ne se voient pas dans les tests `workerd`, qui n'appliquent par exemple
  aucune CSP. D'où la décision du 27/09 de les jouer en une seule recette, à la fin du front.
- Sur le serveur de recette, le code de connexion n'arrive pas par e-mail. Il faut se connecter par
  une session ouverte avec `recette.mjs session`.
- Le navigateur de la passe automatisée est `playwright-cli`, par choix explicite de l'humain.

## Prochaine étape
Déployer `main` sur le serveur de recette. Lancer ensuite les deux passes sans que l'une voie les
verdicts de l'autre, pour que la comparaison vaille quelque chose. J'allais noter, pour chaque cas,
le verdict de la main et celui de Claude côte à côte. Reste à décider où ranger les verdicts de
Claude, en colonne dans l'artefact ou dans un fichier à part.

## Écarté
- Le MCP Playwright à la place de `playwright-cli` : l'humain a choisi `playwright-cli`.
