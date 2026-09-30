# Recette en double : à la main et par Claude avec playwright-cli

Portée : 005-mise-en-page-administration
Ouvert le 2026-09-30 · Actualisé le 2026-09-30 · branche `chore/chantier-recette-en-double` · HEAD `76caaf5`

## Objectif
Jouer la recette de fin de front deux fois, à la main et par Claude avec `playwright-cli`, puis
comparer. J'ai joué ma passe (§ 1 à 22) ; l'humain a renoncé à la sienne. J'allais donc traiter
les KO et remarques de ma passe, puis les rejouer sur le serveur de recette.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — déployer, ouvrir une session, rejouer un cas corrigé (123 l.)
à situer    `docs/cahier-de-test.md` — l'attendu exact d'un cas se relit par son id (CT-x.y)
à situer    `.claude/skills/site-factice/SKILL.md` — seulement si un correctif touche les pages factices
à situer    `.claude/skills/playwright-cli/SKILL.md` — 484 l., se charge par le skill au moment de rejouer
à situer    artefact « Recette ColibriCMS » https://claude.ai/artifact/R8m337DBHqZiBeH85oMPSG — mes verdicts et leurs mesures dans `resultats-claude`

## Acquis
- Les critères visuels de 005 ne se voient pas dans les tests `workerd` (pas de CSP, pas de rendu).
- Sur le serveur de recette, le code de connexion n'arrive pas par e-mail : on se connecte par
  `recette.mjs session`, une session par adresse. La base a été remise à zéro après ma passe.
- KO de ma passe, par importance :
  1. La bibliothèque ignore nom d'affichage et description (CT-10.13, 11.2, 13.1) : grille, recherche
     et sélecteurs ne reçoivent que `nomOrigine` (`BibliothequeMedias.svelte:97,184`,
     `EmplacementImage.svelte:82`, `EmplacementComposition.svelte:107`) ; la fiche, elle, a le bon nom.
  2. Texte riche (CT-9.3) : `h2` et `ul` sans style dans l'éditeur (15 px, ni puces ni retrait) ;
     les liens y sont invisibles aussi (remarque 9.4) — `TexteRiche.svelte`, `admin.css`.
  3. La marque « Brouillon » hérite la police Fraunces du `<h1>` dans l'éditeur (CT-19.5).
  4. Image de démonstration cassée (CT-6.3, 22.1) : `media-fixture-*` absente → icône cassée.
  5. CT-2.1 : e-mail non envoyé (défaut connu du skill recette) et aucun retour visible après
     « Recevoir un code ».
- Remarques non bloquantes : refus muet d'un lien `javascript:` (9.5) ; titre de la fiche vidé après
  un nom vide refusé (11.3) ; « bibliothèque » vs « réserve » (13.7) ; « Déplier » vs « Déployer »
  dans le cahier (4.5) ; page 404 sans style, `<style>` bloqué par la CSP (1.3) ; barre de texte sans
  état actif (9.1) ; message de destination sous le bouton, sans `aria-invalid` (7.6) ; sur-couche
  d'image sans animation (`data-open:` sans règle, bits-ui pose `data-state`) ; titres d'écran à 15 px.
- Pièges : zsh ne lance pas une commande rangée dans une variable (passer par une fonction) ;
  `eval` perdu à chaque navigation ; `run-code` sans `setTimeout` ; un `cd` dans
  `.wrangler/recette/arbre` fait dériver le cwd de la session.

## Prochaine étape
J'allais d'abord trier avec l'humain ce qui est défaut et ce qui est cahier périmé (2.1, 4.5), puis
commencer par le KO 1 (nom d'affichage), dans une branche partie de `origin/main`.

## Écarté
- Le MCP Playwright à la place de `playwright-cli` : l'humain a choisi `playwright-cli`.
- Un fichier à part pour mes verdicts : l'humain a préféré une colonne dans l'artefact.
- Jouer les deux passes en même temps : la base partagée et la remise à zéro les feraient se marcher dessus.
- Le profil « 3G lente » pour CT-21.4 : remplacé par un délai de 3 s sur l'envoi (`page.route`).
- La passe à la main de l'humain : abandonnée le 30/09, faute de temps — pas de comparaison des verdicts.
- Fabriquer un code en base pour jouer le § 3 : hors du plan de la fiche, non fait (CT-3.2 à 3.12 restent non jouables).
