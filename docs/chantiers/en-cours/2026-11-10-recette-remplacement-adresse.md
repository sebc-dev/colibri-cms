# Recette du remplacement de l'adresse autorisée (change 017)

Portée : 017-remplacement-adresse-autorisee · recette de fin de front
Ouvert le 2026-11-10 · Actualisé le 2026-11-10 · branche `chantier/recette-017` · HEAD `5fac6bb`

## Objectif
Jouer sur `colibri.sebc.dev` les cas du change 017 qu'aucun double ne montre, et reporter chaque
verdict dans `docs/cahier-de-test.md`.

## Contexte à charger
à lire      `docs/cahier-de-test.md` § 46, § 47 et, dans le § Bilan, le paragraphe « L'ancienne adresse est prévenue du remplacement » — les cas à jouer
à lire      `openspec/changes/017-remplacement-adresse-autorisee/test-plan.md` — ce que la recette devait prouver (48 l.)
à lire      `openspec/changes/017-remplacement-adresse-autorisee/ux.md` — les textes attendus à l'écran, UX3 et UX4 (106 l.)
à lire      `.claude/skills/recette/SKILL.md` — monter et piloter le serveur de recette

## Acquis
- Les huit tickets du change avaient été implémentés et fusionnés le 2026-11-10 ; la recette était
  la seule preuve repoussée en fin de front.
- J'avais décidé de jouer la recette moi-même, via `playwright-cli`, sans la confier à l'humain.
- Les cas à jouer formaient un seul parcours, dans cet ordre : proposer une seconde boîte (CT-46.1),
  presser « J'ai cliqué sur le bouton » trop tôt (CT-47.1), cliquer puis presser (CT-47.2), demander
  un nouveau code (CT-47.3), recopier le code, lire l'avis reçu dans la première boîte (ticket 07),
  puis remettre l'adresse d'origine.
- CT-46.2 (clé limitée refusée par l'API des règles de routage) et CT-46.3 (adresse déjà inscrite,
  forme réelle de la liste) se jouaient à part du parcours.
- Le parcours à 360 px devait tenir en moins de cinq minutes (UX4).

## Prochaine étape
Charger le skill `recette`, mettre le serveur de recette à jour sur `main`, puis jouer CT-46.1 avec
une seconde boîte dont le courrier est lisible pendant la session.

## Écarté
- Jouer la recette ticket par ticket pendant le front : chaque run l'avait laissée « à jouer », un
  critère inobservable en `workerd` ne bloquait pas le ticket.
- Cocher les cas sur la foi des tests d'intégration : ils passaient par des doubles de l'API de
  Cloudflare et de l'envoi, la recette existait justement pour le vrai message et le vrai clic.

## À surveiller pendant la recette
- Le plafond du ticket 08 : cinq messages par heure glissante, toutes adresses confondues. Le
  parcours complet en consommait au moins quatre (inscription, deux codes, puis l'inscription du
  retour à l'adresse d'origine) : une reprise après un essai raté pouvait buter dessus.
- La bascule fermait les autres sessions (ticket 06) : une seconde session ouverte pour observer
  était renvoyée vers la connexion, ce qui était le résultat attendu.
- Après la recette, l'adresse autorisée du serveur devait être redevenue celle d'origine.
