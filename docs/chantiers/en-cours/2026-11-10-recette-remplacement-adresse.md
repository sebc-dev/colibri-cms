# Recette du remplacement de l'adresse autorisée (changes 017 et 018)

Portée : 018-envoi-du-code-de-remplacement-fiable · recette de fin de front
Ouvert le 2026-11-10 · Actualisé le 2026-11-11 · branche `docs/018-aligner-ux-design` · HEAD `bdccc6c`

## Objectif
Jouer sur `colibri.sebc.dev` les cas des changes 017 et 018 qu'aucun double ne montre, reporter chaque
verdict dans `docs/cahier-de-test.md`, puis archiver le change 018.

## Contexte à charger
à extraire  `docs/cahier-de-test.md` › § 46 à § 49 (L950-L978) — les cas à jouer et leurs verdicts (1051 l.)
à extraire  `.claude/skills/recette/SKILL.md` › « Publication réelle » (L163-L237) — remettre la recette sur `main` (243 l.)
à lire      `openspec/changes/018-envoi-du-code-de-remplacement-fiable/test-plan.md` — ce que la recette du 018 devait prouver (43 l.)

## Acquis
- J'avais décidé de jouer la recette moi-même, via `playwright-cli`, sans la confier à l'humain ;
  seul le clic dans le message de Cloudflare restait à l'humain (la page de vérification refusait un
  navigateur piloté).
- Le change 018 avait été écrit pour le KO de CT-47.2 : un code demandé moins d'une minute après le
  clic se perdait. J'allais rejouer CT-47.2 et CT-48.1/48.2 sur la recette pour le prouver en vrai.
- CT-49.1 avait été joué en local le 2026-11-11 (écrans rendus, Chromium à 360 px) ; je n'avais pas
  prévu de le rejouer sur la recette.
- CT-46.2 (clé limitée refusée par l'API des règles de routage) et CT-46.3 (adresse déjà inscrite,
  pagination de la liste) restaient à jouer, à part du parcours.
- L'envoi refusé du ticket 02 ne se provoquait pas sur la recette : je comptais sur les tests
  d'intégration pour lui.

## Prochaine étape
Remettre la recette sur `main` par le dépôt de recette (`depot` puis push, Workers Builds rebâtit),
puis jouer CT-48.1, CT-48.2 et CT-47.2 en un seul parcours, avec une seconde boîte lisible pendant la
session.

## Écarté
- Jouer la recette ticket par ticket pendant le front : chaque run l'avait laissée « à jouer », un
  critère inobservable en `workerd` ne bloquait pas le ticket.
- Cocher les cas sur la foi des tests d'intégration : ils passaient par des doubles de l'API de
  Cloudflare et de l'envoi, la recette existait justement pour le vrai message et le vrai clic.
- Archiver le change 018 avant la recette : l'archive aurait figé des specs que le vrai parcours
  n'avait pas encore confirmées.

## À surveiller pendant la recette
- Le plafond : cinq messages par heure glissante pour le remplacement. Un parcours en consommait au
  moins quatre ; une reprise après un essai raté pouvait buter dessus.
- La bascule fermait les autres sessions : une seconde session ouverte pour observer était renvoyée
  vers la connexion, ce qui était attendu.
- Après la recette, l'adresse autorisée du serveur devait être redevenue celle d'origine.
