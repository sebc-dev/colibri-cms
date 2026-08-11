# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `da0945c`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus » (ce qui est déjà
            tranché), puis le seul § `S-nn` du lot courant — 410 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Choix retenus » et § « Décisions structurantes → candidats ADR »
            — 484 l., cible de la plupart des retouches
à extraire  `docs/socle-de-livraison.md` › § « 7. La recette de livraison » et § « Annexe A »
            — 393 l., cibles de S-01 et S-14
à extraire  `docs/prd.md` › les seuls `FR` nommés par le constat en cours — S-05 `FR-001` à
            `FR-014`, S-13 et S-15 la couverture du tableau — 797 l., rien d'autre
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
- **Ce qui est arbitré ne se relit pas ici.** L1, L2 et **L3** sont clos ; leurs arbitrages — y
  compris les deux dettes reportées sur `S-14` et `S-17` — sont écrits en entier au
  § « Récapitulatif — arbitrages rendus ». Les recopier mettrait le même fait à deux endroits,
  dont un vieillirait.
- **Avant d'écarter par précédent, vérifier la portée du motif d'origine** : l'écarté « D1/KV/DO »
  ne valait que pour le magasin du **publié**, et c'est ce qui laissait le brouillon sans magasin.
- **`docs/research/` porte les quotas de la plateforme, jamais ses limites de forme** — les
  plafonds D1 de 2 Mo par ligne et 500 Mo par base viennent de la page *Limits*, lue le 11/08.
- **L'Annexe A du socle a été relevée depuis la seule page *Pricing*** — c'est ce qui lui a fait
  manquer les deux plafonds trouvés par S-09. J'avais proposé de repasser ses autres lignes
  contre leur page *Limits*, hors traitement ; ce n'est pas décidé.
- **Acquis pour `S-11`, du dépouillement des rapports du 11/08** : R2 marqué `[À VÉRIFIER]` sur
  l'exigence de carte ; Turnstile officiel ; les Cron Triggers tenus d'une **source unique
  tierce** ; et surtout, les rapports ne parlent que d'**Astro 6** et d'une PR de décembre 2025,
  quand `stack.md` retient Astro 7 et date le retrait du support Pages de la **v13, 10/03/2026**
  — un écart à trancher, pas à reporter.
- **S-01 ferme L4** : S-02 (clé HMAC) et S-06 y ajoutent chacun un secret à inventorier.
- Le traitement précède `archi` : trois candidats ADR au moins citeraient des faits invérifiables.

## Prochaine étape

**L4, premier constat : S-05** — l'auth « maison » couvre `FR-001` à `FR-014` en bloc, mais le
choix écrit ne décrit que la connexion nominale. Sans porteur : le **moyen de reprise non
e-mail** (`FR-009` à `FR-012`, rangé chez la cliente — quel objet ?), la nature des sessions
(signées sans état ? révocables ?), la **protection CSRF** des actions d'admin, la rotation de
la clé de signature. `S-06` y a renvoyé en plus les **attributs du cookie de session**. À savoir
avant d'instruire : `A-02` de l'audit Brief↔PRD a établi que la connexion dépend du même canal
e-mail que les demandes, et la stack retient ce canal sans un mot sur ce couplage. La piste de
l'audit offre deux issues — compléter la ligne Auth par mécanisme, ou déclarer explicitement
que ces points descendent en specs avec la liste des décisions attendues. Instruire, puis
présenter.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher S-04 par recherche** — la phase stack a déjà établi que ce plafond se mesure.
