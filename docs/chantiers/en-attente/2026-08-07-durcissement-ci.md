# Durcissement des contrôles CI

Portée : socle
Ouvert le 2026-08-07 · Actualisé le 2026-08-07 · branche `work/reprise-zero-2` · HEAD `7d683ce`
Bloqué par : l'absence de code — rien à mesurer tant que le scaffold n'existe pas.

## Objectif

Faire monter en bloquant ce qui est sorti informatif de la phase `ci`, une fois le taux de
faux positifs mesuré sur ~30 jours d'exécution réelle. Seuil de bascule : sous ~10-15 % de
FP après réglage. Ce qui reste au-dessus reste informatif — et on l'écrit.

## Contexte à charger

à lire  `docs/ci.md` § Contrôles + § Ce que ces contrôles ne couvrent pas — le statut de
        chaque job et le motif de chaque non-blocage
à lire  `.github/workflows/ci.yml` — les jobs `coverage`, `sast`, et les gardes de scaffold

## Acquis

- J'avais tranché le 2026-08-07 : aucun contrôle au FP inconnu ne devient bloquant. Les
  trois informatifs (`lint`, `coverage`, `sast`) sont donc un choix, pas un reste.
- J'avais laissé le seuil de couverture du diff **sans chiffre** (`diff-cover` sans
  `--fail-under`) plutôt que d'en poser un au jugé sur zéro ligne de code.
- Les jobs qui dépendent du scaffold passent au vert sans rien vérifier tant qu'il n'y a pas
  de `package.json`. Cette garde est à retirer, pas à oublier.

## Prochaine étape

Au premier commit de code : retirer les gardes de scaffold de `.github/workflows/ci.yml` et
poser `--fail-under` sur `diff-cover` après une première mesure.

Puis, sur ~30 jours : relever le nombre de findings `sast` et la part de vrais positifs, et
basculer `sast` en bloquant sur `ERROR` si le taux tient. Ouvrir alors le régime nocturne
(ablation no-op, test de mutation, parcours e2e, épreuves d'invariant de l'ADR-0012 §étage 3)
qu'aucune commande réelle ne permettait d'écrire aujourd'hui.

## Écarté

- **Rendre `sast` bloquant d'emblée** — un contrôle bruyant est désactivé, et son efficacité
  théorique tombe alors à zéro : c'est pire que de l'assumer informatif.
- **Un seuil de couverture globale** — anti-pattern : il échoue indéfiniment sur l'existant
  et pousse à écrire des tests sans valeur, ce qui aggrave le problème d'oracles faux du code
  généré. Le régime reste *clean-as-you-code* (ADR-0012).
- **Un workflow nocturne écrit tout de suite** — il aurait fallu inventer les commandes.

## Réserve

Réprimer un comportement peut le rendre plus subtil plutôt que l'éliminer : un agent contraint
par `test-integrity` peut affaiblir un oracle sans toucher au compte d'assertions. Ces
contrôles réduisent une surface, ils ne ferment pas le sujet.
