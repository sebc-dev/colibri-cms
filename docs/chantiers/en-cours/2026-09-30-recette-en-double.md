# Recette en double : à la main et par Claude avec playwright-cli

Portée : 005-mise-en-page-administration
Ouvert le 2026-09-30 · Actualisé le 2026-09-30 · branche `chore/chantier-recette-en-double` · HEAD `f2a6b1f`

## Objectif
Jouer la recette de fin de front deux fois sur le serveur de recette : une passe à la main par
l'humain, une passe automatisée par Claude avec `playwright-cli`. Puis comparer les verdicts, cas
par cas. J'allais d'abord observer comment cet outillage (serveur de recette, playwright-cli et
Claude) se comporte, avant de juger s'il peut remplacer tout ou partie de la passe à la main.
J'ai ensuite élargi ma passe aux § 1 à 17 du cahier, pour tout ce qui se joue sur ce serveur.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — déployer, ouvrir une session, piloter le navigateur (123 l.)
à lire      `.claude/skills/site-factice/SKILL.md` — variantes titres-longs et vide, semer la bibliothèque (58 l.)
à extraire  `docs/cahier-de-test.md` › § 1 à 17 (L128-L386) — la suite de ma passe ; § 0 (L21-L109) pour la mise en route
à situer    `.claude/skills/playwright-cli/SKILL.md` — 484 l., se charge par le skill quand la passe automatisée démarre
à situer    artefact « Recette ColibriCMS » https://claude.ai/artifact/R8m337DBHqZiBeH85oMPSG — verdicts de l'humain dans `resultats`, les miens dans `resultats-claude`, que la page n'affiche pas
à situer    `docs/chantiers/archive/2026-09-28-site-factice-recette.md` — le jeu de pages factices déjà monté

## Acquis
- Les critères visuels de 005 ne se voient pas dans les tests `workerd`, qui n'appliquent par exemple
  aucune CSP. D'où la décision du 27/09 de les jouer en une seule recette, à la fin du front.
- Sur le serveur de recette, le code de connexion n'arrive pas par e-mail. Il faut se connecter par
  une session ouverte avec `recette.mjs session`, une par adresse (base et chaque variante).
- Le navigateur de la passe automatisée est `playwright-cli`, par choix explicite de l'humain.
- La base de recette est unique : les deux passes se jouent l'une après l'autre, avec une remise à
  zéro entre les deux. L'humain a voulu que je passe en premier.
- J'ai rangé mes verdicts à part (`resultats-claude`) pour que la passe à la main ne les voie pas ; la
  colonne « Claude » ne devait apparaître dans l'artefact qu'après les deux passes.
- J'ai ajouté le § 22 à l'artefact, qui s'arrêtait au § 21.
- Constats de ma passe § 18 à 22 (le détail, mesures comprises, est dans l'artefact) :
  la marque « Brouillon » prend la police du titre dans l'éditeur (Fraunces) et pas dans « Mes pages » ;
  CT-22.1 n'est pas jouable sur le site factice (images de démonstration absentes → icône cassée, cf. CT-6.3) ;
  la sur-couche d'image n'a aucune animation (classes `data-open:` sans règle CSS, bits-ui pose `data-state`) ;
  les titres d'écran font 15 px.
- Pièges de mesure : dans zsh, une commande rangée dans une variable ne se lance pas ;
  les fonctions injectées par `eval` disparaissent à chaque navigation ;
  `run-code` n'a pas `setTimeout` (`page.waitForTimeout`).

## Prochaine étape
Jouer les § 1 à 17 avec la même méthode, verdicts dans `resultats-claude`, puis remettre la base à zéro.
J'allais y noter comme non jouables ou KO les cas qui lisent le code reçu par e-mail (§ 2 et 3). J'allais
jouer CT-16 depuis `localhost:8080`, CT-17.1 sur le build déployé, CT-5.4 sur la variante vide et les cas
à deux appareils avec deux sessions. Ensuite : la passe de l'humain, puis la colonne « Claude » dans l'artefact.

## Écarté
- Le MCP Playwright à la place de `playwright-cli` : l'humain a choisi `playwright-cli`.
- Un fichier à part pour mes verdicts : l'humain a préféré une colonne dans l'artefact.
- Jouer les deux passes en même temps : la base partagée et la remise à zéro les feraient se marcher dessus.
- Le profil « 3G lente » pour CT-21.4 : remplacé par un délai de 3 s sur l'envoi (`page.route`).
