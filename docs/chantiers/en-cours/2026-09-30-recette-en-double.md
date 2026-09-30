# Recette en double : à la main et par Claude avec playwright-cli

Portée : 005-mise-en-page-administration
Ouvert le 2026-09-30 · Actualisé le 2026-09-30 · branche `chore/chantier-recette-en-double` · HEAD `b4a406a`

## Objectif
Jouer la recette de fin de front deux fois, à la main et par Claude avec `playwright-cli`, puis
comparer. J'ai joué ma passe (§ 1 à 22) ; l'humain a renoncé à la sienne. J'allais donc traiter
les KO et remarques de ma passe, un correctif par branche partie de `origin/main`, et rejouer
chacun sur une adresse d'aperçu du serveur de recette.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — déployer, ouvrir une session, rejouer un cas corrigé (123 l.)
à situer    `docs/cahier-de-test.md` — l'attendu exact d'un cas se relit par son id (CT-x.y)
à situer    `.claude/skills/site-factice/SKILL.md` — seulement si un correctif touche les pages factices
à situer    `.claude/skills/playwright-cli/SKILL.md` — 484 l., se charge par le skill au moment de rejouer
à situer    artefact « Recette ColibriCMS » https://claude.ai/artifact/R8m337DBHqZiBeH85oMPSG — mes verdicts et leurs mesures dans `resultats-claude`

## Acquis
- Les critères visuels de 005 ne se voient pas dans les tests `workerd` (pas de CSP, pas de rendu).
- Sur le serveur de recette, on se connecte par `recette.mjs session --hote <aperçu>`, une session
  par adresse. J'y ai laissé `photo.jpg` (renommée, décrite) et des brouillons sur Accueil.
- Tri fait avec l'humain : CT-2.1 est un vrai défaut, rattaché au change 007 (pas à ce chantier) ;
  CT-4.5 était le cahier périmé.
- KO restants, par importance :
  2. Texte riche (CT-9.3) : `h2` et `ul` sans style dans l'éditeur (15 px, ni puces ni retrait) ;
     les liens y sont invisibles aussi (remarque 9.4) — `TexteRiche.svelte`, `admin.css`.
  3. La marque « Brouillon » hérite la police Fraunces du `<h1>` dans l'éditeur (CT-19.5).
  4. Image de démonstration cassée (CT-6.3, 22.1) : `media-fixture-*` absente → icône cassée.
- En suspens pour l'humain : une image renommée ne se trouve plus par son nom de fichier d'origine
  (« photo ») — conforme à la spec, à ajouter seulement s'il le veut.
- Remarques non bloquantes : refus muet d'un lien `javascript:` (9.5) ; titre de la fiche vidé après
  un nom vide refusé (11.3) ; « bibliothèque » vs « réserve » (13.7) ; page 404 sans style,
  `<style>` bloqué par la CSP (1.3) ; barre de texte sans état actif (9.1) ; message de destination
  sous le bouton, sans `aria-invalid` (7.6) ; sur-couche d'image sans animation (`data-open:` sans
  règle, bits-ui pose `data-state`) ; titres d'écran à 15 px.
- Pièges : zsh ne lance pas une commande rangée dans une variable (passer par une fonction) ;
  les refs `playwright-cli` changent à chaque navigation (`e55` → `f2e55`), relire le snapshot ;
  `run-code` sans `setTimeout` ; un `cd` dans `.wrangler/recette/arbre` fait dériver le cwd.

## Prochaine étape
J'allais attaquer le KO 2 (texte riche dans l'éditeur), dans une branche partie de `origin/main`.

## Écarté
- Le MCP Playwright à la place de `playwright-cli` : l'humain a choisi `playwright-cli`.
- Un fichier à part pour mes verdicts : l'humain a préféré une colonne dans l'artefact.
- Jouer les deux passes en même temps : la base partagée et la remise à zéro les feraient se marcher dessus.
- Le profil « 3G lente » pour CT-21.4 : remplacé par un délai de 3 s sur l'envoi (`page.route`).
- La passe à la main de l'humain : abandonnée le 30/09, faute de temps — pas de comparaison des verdicts.
- Fabriquer un code en base pour jouer le § 3 : hors du plan de la fiche, non fait (CT-3.2 à 3.12 restent non jouables).
- Réparer CT-2.1 dans ce chantier : c'est le change 007 qui porte l'expéditeur du code.
- Un change OpenSpec pour le KO 1 : la spec vivante demandait déjà nom et description, correctif direct.
