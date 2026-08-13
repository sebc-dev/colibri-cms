# Journal — socle

> Trace chronologique des phases jouées sur cette feature. Les fichiers restent la source de
> vérité de l'état courant ; ce journal enregistre les événements et les faits non dérivables
> (verdict analyze, premortem appliqué, issue d'un lot). Une ligne = un événement.

| Date | Phase | Résultat |
|---|---|---|
| 2026-08-09 | init-project | docs/ · adr/_candidates/ · journal/socle.md · chantiers/{en-cours,en-attente,archive}/ · research/ créés · socle vide (v1 archivé) · départ en brief |
| 2026-08-10 | brief | 4 personas · 15 SC · 17 exclusions · 6 invariants I1–I6 · repris de socle-v1 validé en 5 passes · 1 motif d'exclusion réécrit (historique des demandes) |
| 2026-08-10 | prd | 103 FR · 19 SC · 0 marqueur · 14 US (11 P1 / 2 P2 / 1 P3) · 7 arbitrages fermés · 6 exclusions ajoutées |
| 2026-08-10 | stack | Astro 7 + Worker unique (Workers Builds) + D1 + GitHub · 17 domaines dont 4 sans objet · **13 décisions → ADR** · 1 fait à sourcer avant `adr` (durée de vie du jeton d'écriture) · socle-de-livraison amendé (§3, C6, annexe A, réserve 1) |
| 2026-08-13 | archi | 9 invariants · 9 candidats ADR · 5 caractéristiques · monolithe modulaire à 5 zones + ports et adaptateurs allégés · CSP d'admin portée par le seul en-tête (aucun script en ligne, `client:*` interdit sous `admin/`) · 3 des 8 invariants déposés par `stack` resserrés en forme décidable, 2 refusés (runtime) · bifurcation du pipeline d'images non tranchée, faute de mesure |
| 2026-08-13 | audit | **À CORRIGER** — archi · 1 Critical (`I6` : « ouverte au visiteur anonyme » n'est pas observable, le garde de session reste sans trace) · 3 Major (`I1` zones sans chemin · `I3` second membre sans trace · fait CSP sans source) · 1 Major arbitré (décompte des candidats de la Stack) |
