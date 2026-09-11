# Le relevé de mutation nocturne n'avait jamais mesuré

Portée : hors-cycle
Ouvert le 2026-09-11 · branche `chore/chantier-timer-mutation` · HEAD `d14dd9a`

## Objectif
Comprendre pourquoi le passage de mutation attendu dans la nuit du 2026-09-11 n'avait produit aucun
rapport, alors que le timer s'était bien déclenché.

## Issue
Corrigé dans `~/.local/bin/colibri-mutation.sh` par un export de `PATH` juste après `set -u`, avec
son motif en commentaire. **Ce fichier n'est pas versionné : aucun commit de ce dépôt ne porte ce
correctif, et c'est la raison d'être de cette fiche.**

**La cause.** `node`, `npm`, `npx` et `claude` vivent tous sous `~/.local/bin`. Le gestionnaire
d'unités `systemd --user` ne porte pas ce répertoire — son `PATH` s'arrête à
`/usr/local/sbin:…:/snap/bin`. Ni l'unité (aucun `Environment=`) ni le script ne le complétaient :
`npx stryker` sortait en **127 « not found »** une seconde après le démarrage.

**Ce que le diagnostic a mis au jour, et qui valait plus que la panne.** Une seule ligne couvrait
trois appels : `npm ci` — sauté ce soir-là parce que l'empreinte du lockfile n'avait pas bougé, donc
prêt à échouer au prochain changement de dépendances —, `npx stryker`, et surtout le `claude -p` de
l'étape d'analyse. Celui-là aurait lâché **après** les ~2 h 45 de mesure.

**Et le fait le plus utile : aucune mesure n'avait jamais tourné par ce script.** Les deux rapports
du 10/09 portent le suffixe `-essai` du crochet `COLIBRI_MUTATION_FAUX_RAPPORT`, qui saute la mesure.
Le script le documente en tête, rien n'était masqué — la chaîne avait été vérifiée, la mesure non. Et
un essai lancé à la main ne pouvait pas révéler le défaut, puisqu'il héritait du `PATH` d'un shell
interactif : le seul témoin capable de le lever était le premier déclenchement réel du timer.

## Contexte à charger
à situer    `~/.local/bin/colibri-mutation.sh` — porte le correctif et son motif en commentaire
à situer    `~/.local/state/colibri-mutation/rapports/` — les sorties brutes datées, dont celle qui
            garde la trace du 127

## Écarté
- **Mettre le `PATH` dans `Environment=` de l'unité systemd** — j'ai préféré le script, que l'unité
  désigne elle-même en `Documentation=` : il redevient ainsi autonome quel que soit son lanceur. Dans
  l'unité, le défaut reviendrait au premier appel hors timer.
- **Déclencher la mesure tout de suite** — écarté après arbitrage : sans fichier incrémental, le
  premier passage est complet quel que soit le mode, et le worktree se détache sur `origin/main`. Le
  lancer avant la fusion de la montée d'outillage aurait dépensé ~2 h 45 sur un état qu'on venait de
  quitter.
- **Vérifier la chaîne par le crochet d'essai** — il saute précisément la mesure, donc il ne prouve
  rien sur le 127 de `npx`. J'ai retenu comme preuve la résolution des binaires dans l'environnement
  réel d'une unité `--user`.
