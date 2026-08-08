# Durcissement des contrôles CI

Portée : socle
Ouvert le 2026-08-07 · Actualisé le 2026-08-08 · branche `work/reprise-zero-2` · HEAD `6b1d358`
Bloqué par : le geste humain (ruleset, clé de signature) et l'absence de code.

## Objectif

Faire monter en bloquant ce qui est sorti informatif, une fois le taux de faux positifs mesuré
sur ~30 jours d'exécution réelle. Bascule sous ~10-15 % de FP après réglage ; ce qui reste
au-dessus reste informatif, et on l'écrit.

## Contexte à charger

à lire   `docs/ci.md` § Contrôles + § Ce que ces contrôles ne couvrent pas — statut et motif
         de non-blocage de chaque job
à lire   `docs/ci.md` § Le garde de suppression — la recette de clé à phrase, ses quatre
         limites, le trou d'amorçage
à situer `docs/research/ci/2026-08-07-controles-ci-code-genere-ia.md` — source des ajouts du
         2026-08-08, déjà dépouillée ; ne pas la relire pour ce chantier

## Acquis

- J'avais tranché : aucun contrôle au FP **inconnu** ne devient bloquant. `lint`, `coverage`
  et `sast` sont donc un choix, pas un reste.
- Le 2026-08-08 j'ai distingué « FP inconnu » de « FP nul par construction ». Les trois ajouts
  sont bloquants d'emblée parce que leur signal est un entier comparé, un `git log` ou une
  signature — pas une heuristique. Les deux nouveaux gardes ont été rejoués avant écriture.
- Le seuil de couverture du diff reste **sans chiffre**, plutôt qu'un chiffre posé au jugé sur
  zéro ligne de code.
- Les jobs qui dépendent du scaffold passent au vert sans rien vérifier. Garde à retirer.

## Prochaine étape

1. Poser le ruleset (`docs/ci.md` § Protection) — sans lui, tout le reste est informatif.
2. Générer la clé de signature à phrase, pousser `.github/allowed_signers` **à la main** —
   seul moment où ce fichier entre sans preuve. Ne jamais `ssh-add` cette clé.
3. Au premier commit de code : retirer les gardes de scaffold, poser `--fail-under` sur
   `diff-cover` après une première mesure, rattacher `mutation-survivors.baseline.json`.
4. Sur ~30 jours : mesurer les vrais positifs de `sast`, basculer sur `ERROR` si le taux tient.
   Puis formaliser les invariants ADR-0001 / ADR-0004 en contrôles maison — informatifs 2-4
   semaines, mesurés **par rejeu sur l'historique** (le volume de PR d'un solo ne suffit pas).
5. Écrire l'ablation no-op et un budget de build (< 20 000 fichiers par version de Worker).

## Écarté

- **La clé matérielle (FIDO2)** — écartée le 2026-08-08, *pas différée*. Elle aurait rendu la
  garantie vérifiable par la CI (le type `sk-*` prouve le contact) ; sans elle la garantie
  reste un **usage**. Éprouvé : hors `ssh-agent` la signature échoue, un `ssh-add` et elle
  passe. Ne pas rouvrir en croyant combler un manque — c'est un arbitrage rendu.
- **Une soupape par scope de commit sur `suppression-guard`** — un agent écrit un scope.
- **`online-audits` de zizmor** — attraperait l'*impostor-commit*, au prix d'une dépendance à
  une limite de débit ; un contrôle intermittent finit désactivé.
- **Surveiller `package.json` pour les dépendances** — il bouge pour mille raisons légitimes.
  Seul le lockfile est surveillé : il ne change pas sans qu'une dépendance change.
- **`sast` bloquant d'emblée** et **un seuil de couverture globale** — les deux finissent
  désactivés ou poussent à écrire des tests sans valeur.

## Réserve

Réprimer un comportement peut le rendre plus subtil plutôt que l'éliminer : un agent contraint
par `test-integrity` peut affaiblir un oracle sans toucher au compte d'assertions, et un agent
contraint par `suppression-guard` peut éteindre un vérificateur par un chemin non greppable.
Ces contrôles réduisent une surface, ils ne ferment pas le sujet.
