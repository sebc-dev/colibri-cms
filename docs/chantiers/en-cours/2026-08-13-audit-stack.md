# Audit stack — 2 Critical · 3 Major

Portée : socle · audit
Ouvert le 2026-08-13 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `fbb7924`

## Objectif

Rendre `docs/stack.md` conforme : zéro Critical.

## Contexte à charger

à lire  `docs/stack.md` — le document jugé (1433 l.)
à lire  `docs/prd.md` — l'amont contre lequel la traçabilité se vérifie (838 l.)

## À corriger

### Lot A — éditions dans `docs/stack.md`

- **[Clé publique Turnstile] Critical** — le widget est créé dans le compte de chaque cliente
  (l. 604), donc sa clé **publique** est une valeur d'instance ; aucun des quatre lieux de la
  l. 51 ne l'accueille et les « cinq valeurs » du candidat n° 20 (l. 1315-1317) ne comptent que
  la clé **de vérification** → la ranger dans un lieu nommé et la porter à cette énumération.
  « Sa clé publique vit dans la page » dit où elle est *rendue*, jamais d'où elle est *lue* —
  c'est ce trou qui a fait dériver `I8` dans `docs/archi.md`.
- **[`prd.md:640`] Critical** — l. 102, le renvoi désigne aujourd'hui « Des demandes
  indésirables passent sous le seuil de fréquence » ; le cas limite visé est à `docs/prd.md:656`
  (« Une publication est déclenchée alors qu'une précédente n'est pas terminée ») → nommer le
  cas limite au lieu de sa ligne : les numéros du PRD ont glissé avec `FR-118`–`FR-122`.
- **[Vue d'ensemble] Major** — l. 22-23, « `docs/archi.md`, qui n'est pas encore écrit », alors
  qu'il existe depuis le 2026-08-13 → texte proposé, celui du gabarit de la phase : « La forme
  de la solution — style macro et micro, invariants — est dans `docs/archi.md` (phase 4). »
- **[Astro] Major** — `astro@7.2.0` (l. 550, d'où est dérivé le calcul du garde-fou `C5`) contre
  `astro@7.2.1` (l. 819) → aligner sur 7.2.1, arbitré le 13/08 ; suppose de rejouer la mesure de
  `getWidths` sur 7.2.1, et si les 5 fichiers par photographie bougent, le mur de 4 000 et
  l'alerte `C5` à 3 000 bougent avec.
- **[Candidat n° 18] Major** — « Accès aux données » est le seul des 20 candidats sans
  « Alternative écartée » (l. 1288-1295) → peser Drizzle et Kysely contre l'API D1 native **ici**,
  arbitré le 13/08 : la Stack est le lieu de l'arbitrage, l'ADR ne fait que le consigner. Retirer
  du même geste la consigne « `/scd-sdd:adr` ne doit pas fabriquer un “écarté” », qui deviendra
  fausse.

## Prochaine étape

`/scd-sdd:resume audit-stack` pour traiter le Lot A, puis relancer `/scd-sdd:audit stack` —
l'appariement fera le reste.
