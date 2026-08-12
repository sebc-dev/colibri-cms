# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `b37e3ae`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul
            § `S-nn` en cours — 413 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Secrets à ouvrir au nom de la cliente » et § « Choix retenus »
            — 1031 l. et croissant à chaque arbitrage ; jamais en entier
à extraire  `docs/socle-de-livraison.md` › § « 7. La recette de livraison » — 397 l., la cible
            de `S-01` ; l'Annexe A ne servira qu'à `S-14`
à extraire  `docs/audit-auth.md` › § « Récapitulatif — arbitrages rendus » — 433 l., l'audit est
            clos ; ce sont ces douze arbitrages que `S-01` doit consommer
à extraire  `docs/prd.md` › les seuls `FR` nommés par le constat en cours — 838 l., rien d'autre
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — 231 l. ; `S-09` a montré qu'il faut vérifier la portée d'un motif avant de s'y fier
à lire      `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md` — ce que
            `S-02` lui a versé, et le blocage juridique qui l'immobilise (48 l.)
à situer    `docs/research/` et `docs/audit-brief-prd.md` — interrogés le 11/08, distillés
            dans Acquis ; ne pas relire

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain ; les constats
  restent **figés** — datés, les réécrire les rendrait invérifiables ; seul le récapitulatif est
  à jour, et un arbitrage **complète** une ligne antérieure par un ajout daté, sans la défaire.
- **Découpage par dépendance, non dans l'ordre du document** : L1 (S-04) · L2 (S-03, S-07, S-08) ·
  L3 (S-09, S-06) · L4 (S-05, S-02, S-01) · L5 (S-10, S-11, S-18, S-19) · L6 (S-13, S-15, S-17) ·
  L7 (S-14, S-16, S-20 ; S-12 arbitré ici, exécuté par `/scd-sdd:premortem socle`). Ce qui est
  arbitré **ne se relit pas** : tout le détail vit au récapitulatif.
- **Une annonce laissée par un lot antérieur peut être fausse — la vérifier avant de s'y appuyer.**
  `S-05` annonçait des secrets « ajoutés par `S-02` et `S-06` » ; aucun des deux n'en a apporté.
  Corrigé le 12/08 aux trois endroits qui le portaient.
- **Doctrine de porteur, héritée d'`AU-10` et rejouée par `S-02`** : une promesse de
  **comportement** prend une exigence au PRD, une **propriété statique** lisible dans les sources
  prend un contrôle bloquant de `ci`. Elle évite d'inventer un `FR` pour tout.
- **Une piste écrite au constat n'oblige à rien** : `S-02` a été refermé contre la sienne, après
  mesure — elle ajoutait un secret et une rotation que personne n'aurait tenue.
- **Pour `S-11`** (dépouillement du 11/08) : R2 marqué `[À VÉRIFIER]` sur l'exigence de carte ;
  Turnstile officiel ; Cron Triggers tenus d'une **source unique tierce** ; les rapports ne parlent
  que d'**Astro 6** quand `stack.md` retient Astro 7 et date le retrait de Pages de la **v13,
  10/03/2026** — écart à trancher. Et `docs/research/` porte les quotas de la plateforme, jamais
  ses limites de forme : l'Annexe A, relevée sur la seule page *Pricing*, en a manqué deux.

## Prochaine étape

**`S-01`, qui ferme L4** — l'inventaire des secrets. J'ai vérifié le 12/08 l'état dont il hérite :
clé de signature **retirée** (`S-05`), **aucun** ajout par `S-02` ni `S-06`, et un seul secret à
porter — la **clé de vérification Turnstile**, que son propre constat nomme et qui manque au
tableau de la Stack comme au §7 du socle. À y intégrer aussi : le **moyen de reprise** remis sur
papier, et le **réamorçage** de l'état d'authentification (`FR-119`, arbitrage `AU-08`). Ne pas
confondre les deux inventaires — celui de la phase Stack, et celui de la livraison, que `S-01`
établit. Instruire, puis présenter.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher `S-04` par recherche** — la phase stack a déjà établi que ce plafond se mesure.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette (`S-09`,
  puis `S-02` sur le recyclage d'un objet).
