# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `560ed1a`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus » (ce qui est déjà
            tranché), puis le seul § `S-nn` du lot courant — 409 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Choix retenus » et § « Décisions structurantes → candidats ADR »
            — 432 l., cible de la plupart des retouches
à extraire  `docs/socle-de-livraison.md` › § « 7. La recette de livraison » et § « Annexe A »
            — 385 l., cibles de S-01 et S-14
à extraire  `docs/prd.md` › les seuls `FR` nommés par le constat en cours — S-09 les images en
            brouillon, S-13 et S-15 la couverture du tableau — 797 l., rien d'autre
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — les pistes déjà mortes de la phase stack, à ne pas rouvrir
à lire      `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md` — S-02 y
            renvoie la période de rotation (48 l.)
à déléguer  `docs/research/` — « que disent exactement les rapports sur R2, Turnstile, les Cron
            Triggers et la version d'Astro, et avec quel niveau de preuve ? » (S-11)
à situer    `docs/audit-brief-prd.md` — le précédent de forme, déjà distillé dans Acquis

## Acquis

- **Méthode calquée sur le précédent `audit-brief-prd`** : chaque constat arbitré par l'humain ;
  les constats restent **figés** — ils sont datés, les réécrire les rendrait invérifiables ; un
  récapitulatif des arbitrages s'ajoute en fin de document, seul endroit à jour.
- **Découpage retenu par dépendance et lieu de réparation, et non dans l'ordre `S-01`→`S-20`** :
  L1 mesure (S-04) · L2 fin de publication (S-03, S-07, S-08) · L3 médias (S-09, S-06) ·
  L4 accès et secrets (S-05, S-02, S-01) · L5 niveau de preuve (S-10, S-11, S-18, S-19) ·
  L6 couverture du tableau (S-13, S-15, S-17) · L7 socle et hygiène (S-14, S-16, S-20 ; S-12
  arbitré ici, mais exécuté par `/scd-sdd:premortem socle`).
- **Ce qui est arbitré ne se relit pas ici.** L1 et L2 sont clos ; leurs arbitrages — y compris
  les deux dettes qu'ils reportent sur `S-14` et `S-17` — sont écrits en entier au
  § « Récapitulatif — arbitrages rendus ». Les recopier mettrait le même fait à deux endroits,
  dont un vieillirait.
- **S-01 ferme L4** : S-02 (clé HMAC) et S-06 y ajoutent chacun un secret à inventorier.
- Le traitement précède `archi` : trois candidats ADR au moins citeraient des faits invérifiables.

## Prochaine étape

**L3 — les médias** : instruire S-09 (aucun magasin pour les médias en **brouillon** — le trou le
plus net du tableau) et S-06 (origine commune admin/public, rien ne borne ce qui remonte), puis les
présenter un par un. L2 a resserré leur cadre : `media` ne reçoit que du **publié**, et le budget
de 42 médias par publication est chiffré — un magasin de brouillon ne peut donc pas être la même
branche, et sa borne de taille se lit face à ce budget.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher S-04 par recherche** — la phase stack a déjà établi que ce plafond se mesure.
