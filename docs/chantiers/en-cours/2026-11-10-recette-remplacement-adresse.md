# Recette du remplacement de l'adresse autorisée (changes 017 et 018)

Portée : hors-cycle
Ouvert le 2026-11-10 · Actualisé le 2026-11-12 · branche `docs/018-aligner-ux-design` · HEAD `3c0efd8`

## Objectif
Jouer sur `colibri.sebc.dev` les cas des changes 017 et 018 qu'aucun double ne montre, reporter chaque
verdict dans `docs/cahier-de-test.md`. Il ne restait que les deux relevés du 017.

## Contexte à charger
à extraire  `docs/cahier-de-test.md` › § 46 (L950-L956) — CT-46.2 et le relevé laissé par CT-46.3 (1053 l.)
à extraire  `openspec/changes/archive/2026-11-11-017-remplacement-adresse-autorisee/security-review.md` › M2 (L39-L42) — ce que CT-46.2 doit prouver (67 l.)

## Acquis
- J'avais décidé de jouer la recette moi-même, via `playwright-cli` ; seul le clic dans le message de
  Cloudflare restait à l'humain (la page de vérification refusait un navigateur piloté).
- L'envoi refusé du ticket 02 du 018 ne se provoquait pas sur la recette : je comptais sur les tests
  d'intégration pour lui.
- La clé limitée était le secret `JETON_ADRESSES_EMAIL` du Worker de recette : un secret ne se relit
  pas, seul l'humain en détenait la valeur. CT-46.2 demandait donc qu'il joue lui-même l'appel, dans
  son terminal, sans me donner la clé.
- Le compte de recette ne comptait que quatre adresses de destination : la pagination de la liste ne
  se voyait pas sans en inscrire davantage.

## Prochaine étape
Faire jouer à l'humain, avec la clé limitée, un appel à `/email/routing/rules` de la zone `sebc.dev` et
garder la sortie (refus attendu) ; puis relever `result_info` de la liste des adresses de destination
(taille de page par défaut), et reporter les deux au cahier.

## Écarté
- Jouer la recette ticket par ticket pendant le front : chaque run l'avait laissée « à jouer », un
  critère inobservable en `workerd` ne bloquait pas le ticket.
- Cocher les cas sur la foi des tests d'intégration : ils passaient par des doubles de l'API de
  Cloudflare et de l'envoi, la recette existait justement pour le vrai message et le vrai clic.
- Archiver le change 018 avant la recette : l'archive aurait figé des specs que le vrai parcours
  n'avait pas encore confirmées.
- Attendre CT-46.2 pour archiver le 018 : le cas relevait du 017 et ne touchait pas le 018.
- Noter comme défaut le retour à « Un message va arriver… » après un rechargement pendant l'étape du
  code (le champ Code disparaît, un nouvel essai renvoie un code) : déjà rencontré par CT-49.1, jugé
  sans gravité.
- Presser « J'ai cliqué sur le bouton » pour un code tout juste expiré : il envoie un code neuf ; le
  refus « Ce code ne peut plus servir » venait de l'expiration (15 min), pas d'un défaut.
