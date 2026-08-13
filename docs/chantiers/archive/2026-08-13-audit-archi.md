# Audit archi — 1 Critical · 1 Major

Portée : socle · audit
Ouvert le 2026-08-13 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `634588a`

## Objectif

Retirer d'`I8` la clé **publique** Turnstile, que la Stack ne loge nulle part dans le fichier
d'instance — et faire trancher, en amont, où cette clé est réellement stockée.

## Contexte à charger

à lire      `docs/archi.md` — le document jugé (205 l.), invariant `I8` l. 103 : son énoncé et sa
            colonne « Trace observable »
à extraire  `docs/stack.md:604` › ligne « Clé de vérification Turnstile » — « sa clé **publique**
            vit dans la page, seule la clé de vérification est un secret »
à extraire  `docs/stack.md:51` › ligne « Configuration d'instance » — les quatre lieux, un par
            nature de valeur, et ce que le fichier d'instance reçoit
à extraire  `docs/stack.md` › candidat n° 20 (l. 1315-1342) — les **cinq** valeurs qu'il énumère,
            dont la clé **de vérification** et non la publique

## À corriger

### Lot A — éditions dans `docs/archi.md`

- **[I8] Critical** — l'énoncé range « la clé **publique** Turnstile » dans `instance.json` (l. 103)
  et sa trace en fait un contrôle — « l'occurrence du domaine ou de la clé publique Turnstile, hors
  d'`instance.json` ». La Stack ne l'y range jamais : `docs/stack.md:604` dit qu'elle « vit dans la
  page », et le candidat n° 20 ne compte parmi les cinq valeurs que la clé **de vérification**
  (`docs/stack.md:1317`), qu'il envoie au compte Cloudflare (`docs/stack.md:51`). `ci` en dériverait
  un contrôle rouge sur un gabarit qui affiche légitimement le widget → retirer la clé publique de
  l'énumération **et** de la trace, qui se réduit alors à « l'occurrence du domaine, hors
  d'`instance.json` ». Défaut introduit le 13/08 en corrigeant le Critical de la passe 4.

### Lot C — renvois et signalements

- **[Turnstile] Major** — signalement **amont** : `docs/stack.md` ne dit nulle part où la clé
  **publique** est *stockée*. « Vit dans la page » (l. 604) décrit son exposition au visiteur, pas
  un lieu de configuration, et les quatre lieux de la l. 51 ne la mentionnent pas. C'est ce trou qui
  a fait déborder `I8` → `/scd-sdd:audit stack`.

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
- **[I8] périmètre délégué à `docs/stack.md:51`** — l'énoncé dit « tout ce que `docs/stack.md:51`
  n'affecte pas à l'un des trois autres lieux » plutôt que d'énumérer les valeurs couvertes, si bien
  qu'un contrôle ne peut pas en tirer seul la liste des tokens à chercher. Assumé le 13/08 : la
  partition en quatre lieux appartient à `docs/stack.md:51`, qui en est la source unique ; la
  recopier ici créerait deux vérités à maintenir en phase — le défaut même que les passes 4 et 5 ont
  corrigé deux fois. Le renvoi est délibéré.

## Issue

**Fermée le 2026-08-13 sans que le lot A soit appliqué** — `docs/archi.md:103` range toujours la
clé **publique** Turnstile dans `instance.json`. Le Critical n'est pas résolu : il **change de
porteur**.

Le Major du lot C a été instruit le jour même par `/scd-sdd:audit stack`, qui en a fait un
**Critical de la Stack** (fiche `2026-08-13-audit-stack.md`) : le widget naît dans le compte de
chaque cliente, donc la clé publique **est** une valeur d'instance — aucun des quatre lieux de
`docs/stack.md:51` ne l'accueille, et les cinq valeurs du candidat n° 20 ne la comptent pas.
L'amont dit désormais l'inverse de ce que le lot A prescrivait : retirer la clé d'`I8` serait
corriger d'après une source qu'on sait fausse, et la remettre dès que la Stack lui aura donné son
lieu — une sixième passe consécutive sur `I8`.

`I8` se corrigera donc **après** la Stack, en une passe, dans le sillage de
`/scd-sdd:resume audit-stack`, puis d'un `/scd-sdd:audit archi` de contrôle. Rien d'autre n'est en
attente ici : les deux Major arbitrés ci-dessus restent assumés tels quels.
