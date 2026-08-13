# Audit archi — 2 Critical · 1 Major

Portée : socle · audit
Ouvert le 2026-08-13 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `bcbdb72`

## Objectif

Aligner ce que `docs/archi.md` dit des cinq valeurs d'instance sur les **quatre lieux** que la
Stack avait tranchés — un seul des quatre est le fichier d'instance.

## Contexte à charger

à lire  `docs/archi.md` — le document jugé (203 l.), lignes 65, 103 et 105
à lire  `docs/stack.md:51` — la ligne « Configuration d'instance » du tableau : les quatre lieux
        en une phrase, avec le motif de chacun
à lire  `docs/stack.md` candidat n° 20 (l. 1315-1342) — le même arbitrage développé, et la
        réserve déjà refermée par `I10`
à lire  `docs/stack.md:604` — la clé de vérification Turnstile est un secret ; sa clé publique
        « vit dans la page »

## À corriger

### Lot A — éditions dans `docs/archi.md`

- **[I8] Critical** — l'énumération « les cinq valeurs propres à une instance… ne figurent que
  dans le fichier d'instance » (l. 103) contredit `docs/stack.md:51` sur quatre valeurs sur
  cinq : le rattachement D1 et la destination `send_email` sont des liaisons de plateforme, que
  la Stack loge dans la configuration du déploiement — « seul endroit possible » ; l'adresse
  autorisée vit en D1 pour changer sans redéploiement ; la clé Turnstile que la Stack compte est
  la clé **de vérification**, un secret, et sa clé publique vit dans la page. Le second membre —
  « aucun autre fichier versionné hors contenu ne les porte » — interdit donc ce que la Stack
  impose, et `ci` en dériverait un contrôle bloquant rouge sur un dépôt conforme → arbitré le
  13/08, la Stack a raison : restreindre `I8` aux valeurs que la Stack loge effectivement dans le
  fichier — le domaine et « tout le reste » —, et laisser les trois autres à leur lieu.
- **[I10] Critical** — même racine, conséquence propre : « aucune des cinq valeurs n'y est écrite
  en dur » (l. 105) interdit au fichier de déploiement de porter le rattachement D1 et la
  destination d'acheminement → aligner l'énumération sur la correction d'`I8`. Tant que la ligne
  est rouverte, ancrer aussi la trace sur les deux chemins plutôt que sur « chacun des deux
  fichiers de configuration ».
- **[C4] Major** — « Uniformité de la flotte : toute valeur propre à une instance en un seul
  fichier » (l. 65) porte la même affirmation fausse, et c'est la caractéristique que la phase
  `adr` lira pour écrire le pourquoi d'`I8` et d'`I10` → arbitré le 13/08, corriger :
  « toute valeur propre à une instance **qui peut vivre dans les fichiers**, en un seul fichier ».

## Prochaine étape

`/scd-sdd:resume audit-archi` pour traiter le lot A, puis relancer `/scd-sdd:audit archi` —
l'appariement fera le reste.

## Écarté

- **[candidats ADR] signalement amont** — `docs/stack.md` porte 20 items numérotés sous « Une ligne
  = un futur ADR », là où le journal et la fiche du 10/08 en disent 13 ; `archi.md` cite un
  « candidat n° 19 » qui n'existe pas dans le décompte de 13. Assumé le 13/08 : la phase `adr` lira
  `docs/stack.md` directement et le décompte s'y refermera, sans passer par `/scd-sdd:audit stack`.
  Ré-importé le 13/08 — les 20 items sont vérifiés sur disque, et les n° 4, 7, 10, 19 et 20 cités
  par `archi.md` résolvent tous ; l'objet tient toujours.
