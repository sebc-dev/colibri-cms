# Recette complète de l'application sur le serveur de recette

Portée : hors-cycle
Ouvert le 2026-10-27 · Actualisé le 2026-10-27 · branche `recette/complete-2026-10` · HEAD `1fb07eb`

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
- Mettre le serveur à jour, c'était : migrations par un aperçu (`site.mjs deployer standard`, sans
  `--principal`), puis `recette.mjs depot ~/projets/colibri_recette`, contrôle que
  `git diff HEAD~1 -- content` est vide, puis envoi du clone. Après une migration, redéployer aussi
  les variantes `rang`, `titres-longs` et `vide`, qui partagent la base.
- L'archivage du change 013 attendait le passage des §§ 35 à 41.
- La variante `sans-formulaire` partage aussi la base : je la redéployais avec les trois autres.
- Un attendu vieilli (écran ou texte changé depuis l'écriture du cas), je le jugeais contre la spec
  vivante citée en tête de section, et je notais l'écart en commentaire d'un OK.
- Pour plusieurs appareils : un jeu de cookies `curl` par appareil (GET de `/admin/connexion`, puis
  POST avec l'en-tête `Origin`) ; le navigateur piloté gardait l'écran et la console.
- `recette.mjs raz` ne vidait pas `demandes`, `fenetre_seuil` ni `comptes_seuil` : je les vidais à
  la main par `$R sql`, à refaire avant le § 33. Corriger le script restait à décider.

## Prochaine étape
Jouer le lot des §§ 5 à 9 (liste des pages, éditeur, bouton d'action, lien de vidéo, texte riche)
sur `https://colibri.sebc.dev`, après `recette.mjs session --hote colibri.sebc.dev` ; puis reporter
verdicts et bilan, commiter, actualiser la fiche.

## Écarté
- Jouer en local (`wrangler dev`, § 0.2 du cahier) : le serveur de recette donne la vraie D1, le vrai
  e-mail et la CSP servie en HTTPS.
- `recette.mjs deployer --principal` : il remplacerait le Worker bâti par Workers Builds, et toute
  publication échouerait.
- Le MCP Playwright : l'utilisateur avait choisi `playwright-cli`.
- Tout jouer en une session : le cahier est trop long ; la fiche s'actualise à chaque pause, lot de
  sections par lot.
- La recherche Gmail (`search_threads`) pour lire le dernier code : son index retardait de plusieurs
  minutes. `get_thread` sur le fil « Votre code de connexion » (`1a17f0647280cab1`), où tous les
  codes se regroupent, la remplace.
