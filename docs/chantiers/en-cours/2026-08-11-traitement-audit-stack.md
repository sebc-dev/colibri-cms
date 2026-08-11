# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `12b1897`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif pour le traitement », puis le seul § `S-nn`
            du lot courant — 394 l., un constat traité est un constat qu'on ne relit plus
à extraire  `docs/stack.md` › § « Choix retenus » et § « Décisions structurantes → candidats ADR »
            — 321 l., cible de la plupart des retouches
à extraire  `docs/socle-de-livraison.md` › § « 7. La recette de livraison » et § « Annexe A »
            — 380 l., cibles de S-01, S-08 et S-14
à extraire  `docs/prd.md` › les seuls `FR` nommés par S-13 et S-15 — 797 l., rien d'autre
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
- **L1 passe en premier parce que sa mesure peut changer L2 et L3** : si la chaîne
  blob→arbre→commit dépasse les 50 sous-requêtes, le mode de dépôt change, et avec lui la
  séquence de publication et la borne de taille des médias.
- **S-01 ferme L4** : S-02 (clé HMAC) et S-06 y ajoutent chacun un secret à inventorier.
- Le traitement précède `archi` : trois candidats ADR au moins citeraient des faits invérifiables.

## Prochaine étape

**L1** — instruire S-04 : compter les appels que consomme la chaîne blob → arbre → commit face au
plafond de 50 sous-requêtes, **par mesure sur un dépôt jetable et non par lecture**, avec témoin,
et verser le transcript dans `docs/research/` (c'est aussi ce que S-10 exige des mesures du 11/08).

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher S-04 par recherche** — la phase stack a déjà établi que ce plafond se mesure.
