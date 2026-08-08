# Durcissement des contrôles CI

Portée : socle
Ouvert le 2026-08-07 · Actualisé le 2026-08-08 · branche `work/reprise-zero-2` · HEAD `46c0d41`
Bloqué par : deux tiers distincts — le geste humain (ruleset, jeton FIDO2) et l'absence de code.

## Objectif

Faire monter en bloquant ce qui est sorti informatif, une fois le taux de faux positifs mesuré
sur ~30 jours d'exécution réelle. Seuil de bascule : sous ~10-15 % de FP après réglage. Ce qui
reste au-dessus reste informatif — et on l'écrit.

## Contexte à charger

à lire  `docs/ci.md` § Contrôles + § Ce que ces contrôles ne couvrent pas — le statut de
        chaque job et le motif de chaque non-blocage
à lire  `docs/ci.md` § Le garde de suppression — la recette FIDO2 et le trou d'amorçage
à lire  `.github/workflows/ci.yml` › `coverage`, `sast` et les gardes de scaffold
à situer `docs/research/ci/2026-08-07-controles-ci-code-genere-ia.md` — la source des
        ajouts du 2026-08-08, déjà dépouillée ; ne pas la relire pour ce chantier

## Acquis

- J'avais tranché : aucun contrôle au FP **inconnu** ne devient bloquant. `lint`, `coverage`
  et `sast` sont donc un choix, pas un reste.
- Le 2026-08-08 j'ai distingué « FP inconnu » de « FP nul par construction ». Les trois
  ajouts (`deps-policy`, `workflow-audit`, `suppression-guard`) sont bloquants d'emblée
  parce que leur signal est un entier comparé, un `git log` ou une signature — pas une
  heuristique. J'ai rejoué les deux nouveaux gardes en dépôt jetable avant de les écrire.
- Le seuil de couverture du diff reste **sans chiffre** (`diff-cover` sans `--fail-under`)
  plutôt qu'un chiffre posé au jugé sur zéro ligne de code.
- Les jobs qui dépendent du scaffold passent au vert sans rien vérifier tant qu'il n'y a pas
  de `package.json`. Cette garde est à retirer, pas à oublier.

## Prochaine étape

Dans cet ordre, et les deux premiers ne dépendent d'aucun code :

1. Poser le ruleset (`docs/ci.md` § Protection) — sans lui tout le reste est informatif.
2. Générer la clé FIDO2, pousser `.github/allowed_signers` **à la main** — c'est le seul
   moment où ce fichier entre sans preuve.
3. Au premier commit de code : retirer les gardes de scaffold, poser `--fail-under` sur
   `diff-cover` après une première mesure, et rattacher `mutation-survivors.baseline.json`
   au job `mutation` pour n'alerter que sur un survivant *nouveau*.
4. Sur ~30 jours : relever les findings `sast` et leur part de vrais positifs ; basculer sur
   `ERROR` si le taux tient. Puis formaliser les invariants de l'ADR-0001 et de l'ADR-0004
   en contrôles maison, informatifs 2-4 semaines, mesurés **par rejeu sur l'historique** (le
   volume de PR d'un solo ne suffit pas à estimer un FP en temps réel).
5. Écrire l'ablation no-op et un budget de build (< 20 000 fichiers par version de Worker).

## Écarté

- **`required_signatures` au niveau du ruleset** — exigerait la signature de *tous* les
  commits ; avec une clé à contact physique, l'agent ne pourrait plus commiter du tout.
- **Une soupape par scope de commit sur `suppression-guard`** — un agent écrit un scope.
- **`online-audits` de zizmor** — attraperait l'*impostor-commit*, au prix d'une dépendance
  à une limite de débit ; un contrôle intermittent finit désactivé.
- **Surveiller `package.json` pour les dépendances** — il bouge pour mille raisons
  légitimes. Le lockfile ne change pas sans qu'une dépendance change : lui seul est surveillé.
- **Rendre `sast` bloquant d'emblée** — un contrôle bruyant est désactivé, et son efficacité
  théorique tombe alors à zéro.
- **Un seuil de couverture globale** — il échoue indéfiniment sur l'existant et pousse à
  écrire des tests sans valeur, ce qui aggrave le problème d'oracles faux du code généré.

## Réserve

Réprimer un comportement peut le rendre plus subtil plutôt que l'éliminer : un agent contraint
par `test-integrity` peut affaiblir un oracle sans toucher au compte d'assertions, et un agent
contraint par `suppression-guard` peut éteindre un vérificateur par un chemin non greppable.
Ces contrôles réduisent une surface, ils ne ferment pas le sujet.
