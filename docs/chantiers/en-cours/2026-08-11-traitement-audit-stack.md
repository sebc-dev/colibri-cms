# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `7a743e2`

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
à extraire  `docs/prd.md` › les seuls `FR` nommés par le constat en cours — S-06 `FR-027` et
            `FR-040`, S-13 et S-15 la couverture du tableau — 797 l., rien d'autre
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — les pistes déjà mortes de la phase stack, dont S-09 a montré qu'il faut vérifier
            la portée avant de s'y fier
à lire      `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md` — S-02 y
            renvoie la période de rotation (48 l.)
à situer    `docs/research/` — les quatre sujets de S-11 ont été interrogés le 11/08, la réponse
            est dans Acquis ; ne pas relire
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
- **Ce qui est arbitré ne se relit pas ici.** L1, L2 et `S-09` sont clos ; leurs arbitrages — y
  compris les deux dettes reportées sur `S-14` et `S-17` — sont écrits en entier au
  § « Récapitulatif — arbitrages rendus ». Les recopier mettrait le même fait à deux endroits,
  dont un vieillirait.
- **Avant d'écarter par précédent, vérifier la portée du motif d'origine** : l'écarté « D1/KV/DO »
  ne valait que pour le magasin du **publié**, et c'est ce qui laissait le brouillon sans magasin.
- **`docs/research/` porte les quotas de la plateforme, jamais ses limites de forme** — les
  plafonds D1 de 2 Mo par ligne et 500 Mo par base viennent de la page *Limits*, lue le 11/08.
- **Acquis pour `S-11`, du dépouillement des rapports du 11/08** : R2 marqué `[À VÉRIFIER]` sur
  l'exigence de carte ; Turnstile officiel ; les Cron Triggers tenus d'une **source unique
  tierce** ; et surtout, les rapports ne parlent que d'**Astro 6** et d'une PR de décembre 2025,
  quand `stack.md` retient Astro 7 et date le retrait du support Pages de la **v13, 10/03/2026**
  — un écart à trancher, pas à reporter.
- **S-01 ferme L4** : S-02 (clé HMAC) et S-06 y ajoutent chacun un secret à inventorier.
- Le traitement précède `archi` : trois candidats ADR au moins citeraient des faits invérifiables.

## Prochaine étape

**L3, second constat : S-06** — origine commune admin/public, et rien ne borne ce qui remonte
vers elle. Trois portes, dont une seule est fermée (Markdown restreint) : les **formats** admis au
téléversement et le sort du **SVG** (`FR-040`, un SVG accepté comme image est un XSS stocké servi
par l'origine commune), les **URL de schéma non autorisé** dans le Markdown rendu, et l'absence
de tout **en-tête de réponse** (CSP, `X-Content-Type-Options`). S-09 a déjà fermé le volet
**poids** — 2 Mo, borne D1 — et lui seul ; S-06 hérite du reste. Instruire, puis présenter.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher S-04 par recherche** — la phase stack a déjà établi que ce plafond se mesure.
