# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `936e804`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul
            § `S-nn` en cours — 414 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Décisions structurantes → candidats ADR » et la seule ligne
            de tableau nommée par le constat en cours — 1089 l. ; jamais en entier
à extraire  `docs/socle-de-livraison.md` › Annexe A et ses réserves — 411 l. ; c'est là que les
            chiffres de plateforme sont relevés, datés et bornés
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat en cours — 838 l.
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — 231 l. ; les sources déjà rejetées et le motif de chacune, que L5 recroise
à situer    les deux relevés versés le 12/08 dans `docs/research/` — leurs conclusions sont
            déjà portées dans `stack.md` ; ne pas les relire pour arbitrer
à situer    `docs/audit-brief-prd.md` et `docs/audit-auth.md` — clos, arbitrages consommés

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain ; les constats
  restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une ligne
  antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance** : L1 (S-04) · L2 (S-03, S-07, S-08) · L3 (S-09, S-06) ·
  L4 (S-05, S-02, S-01) fermé · **L5 (S-10, S-11, S-18, S-19) ouvert le 12/08** ·
  L6 (S-13, S-15, S-17) · L7 (S-14, S-16, S-20 ; S-12 arbitré ici, exécuté par `premortem socle`).
- **Une annonce laissée par un lot antérieur peut être fausse — la vérifier avant de s'y
  appuyer.** Trois cas venus de `S-05`, tous refermés sans avoir rien à écrire.
- **Un fait « non sourcé » se referme souvent en le mesurant, pas en le cherchant.** Les deux
  premiers faits de `S-10` ont été rendus par relevé npm et paquet réellement bâti sur cette
  machine, versés avec transcript rejouable — c'est la forme qui satisfait « la vérification doit
  laisser une trace citable », que la fiche du 10/08 opposait au sourçage maison.
- **Un chiffre est parfois faux d'unité avant d'être faux de valeur** : « 3,2 Mo dépaquetés »
  invoqué sous un plafond **gzip**. Remis dans la bonne unité, il s'inversait. J'ai donc retiré
  l'argument **et écrit ce qui le remplace** — sans quoi l'audit repose la question au même
  endroit, ce que l'humain a d'ailleurs fait à voix haute avant que ce soit écrit.
- **Un numéro de correctif n'a pas sa place dans un document immuable** : `0.21.0` → `0.21.2` en
  moins de 48 h, la version courante ayant changé pendant la mesure elle-même.
- **Les faits 3 et 4 de `S-10` ont déjà leur porteur dans `docs/research/`, trouvé par
  délégation** : le jeton GitHub n'en a qu'un, `2026-08-10-api-github-commit-atomique.md:149-151`,
  où l'auteur du rapport l'a lui-même marqué « Lookup à jouer » ; l'écart Astro est
  `2026-08-10-pages-ou-workers-static-assets.md:27`, qui date le retrait de Pages de **déc. 2025
  avec Astro 6** quand la stack dit v13 au 10/03/2026.
- **Pour `S-11`** : R2 marqué `[À VÉRIFIER]`, Turnstile officiel, Cron Triggers tenus d'une source
  unique tierce ; son quatrième écart **est** le fait 4 de `S-10` — les deux se rendent d'affilée.

## Prochaine étape

**Rendre le fait 3 de `S-10`** — la phrase GitHub « removes personal access tokens… », étiquetée
« [officiel · rapporté] » sans emplacement citable. J'allais le traiter en sachant qu'il est d'une
autre nature que les deux premiers : rien ne se mesure sur cette machine, c'est une politique de
plateforme, et la fiche du 10/08 a écarté de sourcer soi-même un fait de plateforme pour trancher.
Les trois issues — sourcer, marquer non sourcé, renvoyer en recette — s'y affrontent vraiment.
Puis le fait 4, puis la ligne de `S-10` au récapitulatif, puis `S-11`.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher `S-04` par recherche** — la phase stack a déjà établi que ce plafond se mesure.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette.
- **Rouvrir le choix Better Auth** — arbitré le 12/08, la question ayant été posée : la mesure
  retire l'argument de poids, pas la décision ; rouvrir ferait relire les quatre mécanismes de
  `S-05` et le candidat ADR n° 16, pour un gain qui restait à démontrer.
- **Épingler un numéro de correctif dans un candidat ADR** — c'est fabriquer le défaut que
  `S-10` relève.
