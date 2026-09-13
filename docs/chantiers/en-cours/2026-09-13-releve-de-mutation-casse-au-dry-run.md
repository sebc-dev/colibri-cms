# Le relevé de mutation nocturne plante au dry run depuis le 13/09

Portée : hors-cycle
Ouvert le 2026-09-13 · Actualisé le 2026-09-13 · branche `main` · HEAD `caa8d4a`

## Objectif
Rendre au timer `colibri-mutation` sa capacité à mesurer : le passage complet du 13/09 s'est arrêté
avant de muter quoi que ce soit, et aucun relevé ne sortira plus tant que ce n'est pas réglé.

## Contexte à charger
à lire      `~/.local/bin/colibri-mutation.sh` — le script du timer, non versionné : où et comment il
            lance le dry run (222 l.)
à extraire  `~/.local/state/colibri-mutation/rapports/2026-09-13-0114-complet.sortie.txt`
            › L505-540 (les six tests rouges) et › `FAIL  tests/integration` (les AssertionError) — 849 l.
à situer    `docs/chantiers/archive/2026-09-11-timer-mutation-sans-node.md` — la panne précédente du
            timer (PATH), réglée ; pas la même
à situer    `docs/chantiers/en-cours/2026-09-12-survivants-de-mutation.md` — le chantier qui a
            besoin d'un relevé frais pour prouver ses lots

## Acquis
- Le passage complet du 13/09 (01:14) s'est arrêté au dry run de Stryker — « One or more tests
  failed in the initial test run » : six tests rouges (`liste-des-pages` SC-02a,
  `corriger-bouton-action` SC-04e/f, `regler-lien-video` SC-05b et deux autres), tous vers 2,6 s,
  plus un avertissement « nettoyage D1 ignoré pour sessions (schéma absent) : no such table:
  sessions ». Aucun `.md` ni `.survivants.txt` produits ; `dernier.md` pointe toujours le 12/09.
- Le worktree de mesure est sur `caa8d4a` (main après la migration `cloudflare:workers`, #88), et la
  CI `test` de #88 est verte sur ce même commit : le rouge tient à l'environnement du timer
  (worktree ou harnais Stryker), pas au code de main.
- SC-02a rend `[]` au lieu des trois pages : l'écran répond, sans ses lignes — pas une erreur levée.
- Le dernier passage réussi (12/09 03:48) mesurait `9c02dab` ; entre les deux, les PR #85 à #88.

## Prochaine étape
J'allais rejouer `npm test` à la main dans `~/.local/state/colibri-mutation/worktree`, hors Stryker,
pour séparer « environnement du worktree » de « harnais Stryker » ; si vert, rejouer le seul dry run
(`npx stryker run --dryRunOnly`, option à confirmer dans la version installée) ; puis regarder ce que
`9c02dab..caa8d4a` a changé dans la mise en place D1 des tests (`assurerSchema`, nettoyage des sessions).

## Écarté
- Corriger les tests du dépôt avant d'avoir reproduit hors Stryker — la CI est verte sur le même
  commit, le code n'est pas le premier suspect.
- Relancer le timer tel quel « pour voir » — 2 h 47 et 19 Go par passage complet.
- Repartir de la panne du 11/09 (PATH) — là, node ne démarrait jamais ; ici Stryker démarre et les
  tests tournent.
