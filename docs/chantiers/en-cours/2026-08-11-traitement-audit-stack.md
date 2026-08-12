# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `9d6d103`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul
            § `S-nn` en cours — 414 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Décisions structurantes → candidats ADR » et la seule ligne
            de tableau nommée par le constat en cours — 1053 l. ; jamais en entier
à extraire  `docs/socle-de-livraison.md` › Annexe A et ses réserves — 411 l. ; c'est là que les
            chiffres de plateforme sont relevés, datés et bornés
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat en cours — 838 l.
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — 231 l. ; il porte les sources déjà rejetées et le motif de chacune, que L5 recroise
à déléguer  `docs/research/` — 1677 l. sur 11 fichiers ; demander quel rapport, à quelle ligne
            et sur quelle source porte le fait que le constat en cours dit non sourcé
à situer    `docs/audit-brief-prd.md` et `docs/audit-auth.md` — clos tous les deux, leurs
            arbitrages consommés ; ne pas relire

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain ; les constats
  restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une ligne
  antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance, non dans l'ordre du document** : L1 (S-04) · L2 (S-03, S-07, S-08) ·
  L3 (S-09, S-06) · **L4 (S-05, S-02, S-01) fermé le 12/08** · L5 (S-10, S-11, S-18, S-19) ·
  L6 (S-13, S-15, S-17) · L7 (S-14, S-16, S-20 ; S-12 arbitré ici, exécuté par `premortem socle`).
- **Une annonce laissée par un lot antérieur peut être fausse — la vérifier avant de s'y appuyer.**
  Trois cas en deux jours, tous venus de `S-05` : il annonçait des secrets ajoutés par `S-02` et
  `S-06`, aucun des deux n'en a apporté ; et le retrait de clé de signature qu'il renvoyait au
  socle était sans objet, elle n'y avait jamais figuré. Un renvoi se ferme parfois sans rien écrire.
- **Un texte de vérification couvre parfois moins que la contrainte qu'il porte** : la ligne `C7`
  de la recette ne parlait que de secrets quand `C7` et `SC-013` disent « secrets **et liaisons** »
  — c'est ce qui laissait la connexion Workers Builds↔GitHub sans propriétaire écrit (`S-01`).
- **Doctrine de porteur, héritée d'`AU-10` et rejouée par `S-02`** : une promesse de
  **comportement** prend une exigence au PRD, une **propriété statique** lisible dans les sources
  prend un contrôle bloquant de `ci`. Elle évite d'inventer un `FR` pour tout.
- **Une piste écrite au constat n'oblige à rien** : `S-02` a été refermé contre la sienne, après
  mesure — elle ajoutait un secret et une rotation que personne n'aurait tenue.
- **Pour `S-11`** (dépouillement du 11/08) : R2 marqué `[À VÉRIFIER]` sur l'exigence de carte ;
  Turnstile officiel ; Cron Triggers tenus d'une **source unique tierce** ; les rapports ne parlent
  que d'**Astro 6** quand `stack.md` retient Astro 7 et date le retrait de Pages de la **v13,
  10/03/2026** — écart à trancher, et c'est le même que le quatrième fait de `S-10`. Et
  `docs/research/` porte les quotas de la plateforme, jamais ses limites de forme.

## Prochaine étape

**Ouvrir L5 par `S-10`** — les quatre faits que la méthode annoncée dit sourcés et qui ne le sont
nulle part : Better Auth, vitest, « GitHub retire un jeton resté un an sans usage », Astro v13.
J'allais instruire par délégation sur `docs/research/`, fait par fait, puis trancher pour chacun
entre le **sourcer**, le **marquer** non sourcé, ou le **renvoyer en recette**. Le quatrième est le
même écart que le dépouillement de `S-11` a relevé : les deux se rendent d'affilée, `S-10` d'abord.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher `S-04` par recherche** — la phase stack a déjà établi que ce plafond se mesure.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette (`S-09`,
  puis `S-02` sur le recyclage d'un objet, puis `S-01` sur le compte qui porte la connexion de
  build entre Cloudflare et GitHub).
