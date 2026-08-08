# Durcissement des contrôles CI

Portée : socle
Ouvert le 2026-08-07 · Actualisé le 2026-08-08 · branche `work/reprise-zero-2` · HEAD `20b8279`
Bloqué par : le geste humain (ruleset, clé de signature) et l'absence de code.

## Objectif

Faire monter en bloquant ce qui est sorti informatif, une fois le taux de faux positifs mesuré
sur ~30 jours. Bascule sous ~10-15 % de FP après réglage ; ce qui reste au-dessus reste
informatif, et on l'écrit.

## Contexte à charger

à lire   `docs/ci.md` § Contrôles · § L'ordre de pose · § Ce que ces contrôles ne couvrent pas
à lire   `docs/ci.md` § Le garde de suppression — recette de clé à phrase, 4 limites, amorçage
à situer PR #14 — la reprise ; sa CI du 2026-08-08 est la mesure citée ci-dessous
à situer `docs/research/ci/2026-08-07-*.md` — déjà dépouillée, ne pas la relire pour ce chantier

## Acquis

- « FP inconnu » ≠ « FP nul par construction ». Les trois ajouts du 2026-08-08 sont bloquants
  d'emblée parce que leur signal est un entier comparé, un `git log` ou une signature.
- **Les soupapes par scope et par label ne résistent pas à un agent** — un scope s'écrit, un
  label se pose avec une portée `repo`. Constaté sur ma propre session (`gist, read:org, repo,
  workflow`). Elles rendent visible, pas impossible. Seule la signature résiste ; c'est
  pourquoi `suppression-guard` et le régime B de `test-integrity` l'exigent.
- `test-integrity` se contredisait : il disait « la sortie est de retirer le test » et refusait
  qu'on retire un test. Corrigé le 2026-08-08 en deux régimes — endormir un test n'a aucune
  issue, retirer un test ou alléger un oracle passe **sous signature**. Défaut constaté en
  vrai, pas en théorie : il bloquait la PR #14 sans issue.
- Seuil de couverture du diff toujours **sans chiffre**, faute de code à mesurer.

## Prochaine étape

1. Ruleset **sans `required_status_checks`** → retire le fantôme `quality-gate`.
2. Label `deps` sur la PR #14, merger. `test-integrity` restera rouge et non requis : la
   reprise est la dernière chose qui passe sans portail, parce qu'elle *est* le portail.
3. Poser les 9 checks requis. Générer la clé de signature à phrase, pousser
   `.github/allowed_signers` **à la main** — ne jamais `ssh-add` cette clé.
4. Au premier commit de code : retirer les gardes de scaffold, poser `--fail-under` sur
   `diff-cover` après mesure, rattacher `mutation-survivors.baseline.json`.
5. Sur ~30 jours : mesurer les vrais positifs de `sast`, basculer sur `ERROR` si le taux tient.
   Puis formaliser les invariants ADR-0001 / ADR-0004 en contrôles maison — informatifs 2-4
   semaines, mesurés **par rejeu sur l'historique**, le volume de PR d'un solo ne suffisant pas.
6. Écrire l'ablation no-op et un budget de build (< 20 000 fichiers par version de Worker).

## Écarté

- **La clé matérielle (FIDO2)** — écartée le 2026-08-08, *pas différée*. Elle aurait rendu la
  garantie vérifiable par la CI ; sans elle, elle reste un **usage**. Éprouvé : hors
  `ssh-agent` la signature échoue, un `ssh-add` et elle passe. Arbitrage rendu, ne pas rouvrir.
- **Une soupape par label sur `test-integrity`** — même motif que le scope : je peux la poser.
- **`online-audits` de zizmor** — attraperait l'*impostor-commit*, au prix d'une dépendance à
  une limite de débit ; un contrôle intermittent finit désactivé.
- **Surveiller `package.json` pour les dépendances** — il bouge pour mille raisons légitimes.
  Seul le lockfile est surveillé : il ne change pas sans qu'une dépendance change.
- **`sast` bloquant d'emblée** et **un seuil de couverture globale** — les deux finissent
  désactivés ou poussent à écrire des tests sans valeur.

## Réserve

Réprimer un comportement peut le rendre plus subtil : un agent contraint par `suppression-guard`
peut éteindre un vérificateur par un chemin non greppable, et un agent contraint par le régime B
peut affaiblir un oracle sans que le compte d'assertions bascule. Ces contrôles réduisent une
surface, ils ne ferment pas le sujet.
