# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `209c85f`
Bloqué par : le chantier `audit-authentification`, dont L4 doit consommer les arbitrages

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
à extraire  `docs/prd.md` › les seuls `FR` nommés par le constat en cours — S-02 `FR-007` et
            `FR-062`, S-13 et S-15 la couverture du tableau — 797 l., rien d'autre
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — les pistes déjà mortes de la phase stack, dont S-09 a montré qu'il faut vérifier
            la portée avant de s'y fier
à lire      `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md` — S-02 y
            renvoie la période de rotation (48 l.)
à situer    `docs/research/` — les quatre sujets de S-11 ont été interrogés le 11/08, la réponse
            est dans Acquis ; ne pas relire
à situer    `docs/audit-brief-prd.md` — le précédent de forme, déjà distillé dans Acquis
à lire      `docs/chantiers/en-attente/2026-08-11-audit-authentification.md` — le chantier qui
            bloque celui-ci ; son `Acquis` porte le modèle de menace du 11/08 (56 l.)
à extraire  `docs/audit-auth.md` › § « Récapitulatif — arbitrages rendus » — **n'existera qu'à
            la clôture du chantier ci-dessus** ; c'est ce que L4 doit consommer. Absent au
            moment de la reprise = l'audit n'est pas fini, et ce chantier n'est pas repartable

## Acquis

- **Méthode calquée sur le précédent `audit-brief-prd`** : chaque constat arbitré par l'humain ;
  les constats restent **figés** — ils sont datés, les réécrire les rendrait invérifiables ; un
  récapitulatif des arbitrages s'ajoute en fin de document, seul endroit à jour.
- **Découpage retenu par dépendance et lieu de réparation, et non dans l'ordre `S-01`→`S-20`** :
  L1 mesure (S-04) · L2 fin de publication (S-03, S-07, S-08) · L3 médias (S-09, S-06) ·
  L4 accès et secrets (S-05, S-02, S-01) · L5 niveau de preuve (S-10, S-11, S-18, S-19) ·
  L6 couverture du tableau (S-13, S-15, S-17) · L7 socle et hygiène (S-14, S-16, S-20 ; S-12
  arbitré ici, mais exécuté par `/scd-sdd:premortem socle`).
- **Ce qui est arbitré ne se relit pas ici.** L1, L2 et **L3** sont clos, et **L4 est entamé :
  `S-05` est rendu**. Tous les arbitrages — y compris les dettes reportées sur `S-14`, `S-17`
  et, depuis `S-05`, sur `S-01` — sont écrits en entier au § « Récapitulatif — arbitrages
  rendus ». Les recopier mettrait le même fait à deux endroits, dont un vieillirait.
- **Un arbitrage peut compléter un arbitrage antérieur sans le défaire.** `S-05` a montré que
  le compte de trois portes de `S-06` était incomplet ; la ligne `S-06` du récapitulatif a reçu
  un **complément daté**, et le constat lui-même n'a pas bougé. C'est la forme à réutiliser.
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

**À ne pas jouer avant que `docs/audit-auth.md` soit clos** — c'est le motif de la mise en
attente : L4 touche à l'auth et aux secrets, et refaire ces arbitrages après l'audit coûterait
deux fois. Ensuite seulement :

**L4, deuxième constat : S-02** — l'« empreinte » d'origine du compteur de fréquence est un
hachage non clété d'IP, donc réversible en secondes sur 2³² valeurs : l'empreinte **est** la
donnée personnelle. La piste est courte — écrire « empreinte HMAC sous clé secrète, à
rotation » au tableau des choix, ajouter la clé à l'inventaire, renvoyer la **période** de
rotation au chantier `cadrage-donnees-personnelles`, qui est en attente et que j'ai relu le
11/08. Deux points à savoir avant d'instruire : `S-05` vient de **retirer** la clé de signature
de l'inventaire, donc S-02 y ajoute la première clé depuis, et c'est `S-01` qui arbitrera
l'inventaire complet ; et le compteur vit dans un Durable Object, pas en D1 — la rotation n'y a
pas le même coût. Troisième point, depuis l'arbitrage d'`AU-03` (11/08) : l'empreinte ne porte
**plus** la protection du moyen de reprise — il a été chiffré à 128 bits précisément pour ne pas
pendre à ce mécanisme ; `FR-007` n'est qu'un frein anti-bruit, l'arbitrage de S-02 n'a pas cette
charge-là. Instruire, puis présenter.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher S-04 par recherche** — la phase stack a déjà établi que ce plafond se mesure.
