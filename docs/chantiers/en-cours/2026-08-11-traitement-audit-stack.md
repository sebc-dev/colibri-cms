# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `2e29ed0`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul § `S-nn`
            en cours — 414 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Décisions structurantes → candidats ADR » et la seule ligne de
            tableau nommée par le constat en cours — 1156 l. ; jamais en entier
à extraire  `docs/socle-de-livraison.md` › Annexe A et ses réserves — 411 l. ; là que les chiffres
            de plateforme sont relevés, datés et bornés
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat, **ou par le passage de
            `stack.md` que le fait en cours soutient** — 838 l.
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté » —
            231 l. ; les sources déjà rejetées et le motif de chacune
à situer    les cinq relevés du 12/08 de `docs/research/`, chacun avec son transcript —
            conclusions déjà portées par `stack.md`
à situer    `docs/audit-brief-prd.md` et `docs/audit-auth.md` — clos, arbitrages consommés

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain, sur feu vert ;
  les constats restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une
  ligne antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance, décidé le 11/08** : L1 (S-04) · L2 (S-03, S-07, S-08) ·
  L3 (S-09, S-06) · L4 (S-05, S-02, S-01) · L5 (S-10, S-11, S-18, S-19) · L6 (S-13, S-15, S-17) ·
  L7 (S-14, S-16, S-20 ; S-12 arbitré ici, exécuté par `premortem socle`).
- **Un fait « non sourcé » se referme de trois façons, toutes employées sur `S-10`** : le
  **mesurer** (relevé npm, paquet bâti), le **citer** (page officielle datée, ou donnée source de
  la doc), ou l'**assumer marqué** quand rien ne le comble. Dans les deux premiers cas c'est le
  **transcript versionné** qui satisfait « la vérification doit laisser une trace citable ».
- **Quatre fois de suite, mesurer un fait juste a invalidé les preuves écrites à son appui.**
  Corollaires : retirer un argument faux ne suffit pas, il faut écrire ce qui le remplace ; une
  mesure ne voit que ce que son témoin peut lever, si bien que le fait à écrire est parfois la
  **condition** et non l'argument ; et quand une page rendue se contredit, descendre à la **donnée
  qui la génère**.
- **`S-10` et `S-11` se recoupent plus que leurs libellés ne le disent.** Un même fait peut se
  rendre en deux moitiés — la trace pour l'un, la qualification pour l'autre — dans le **même**
  paragraphe de `stack.md`, sans être écrit deux fois.
- **Pour `S-11`** : restent R2 marqué `[À VÉRIFIER]`, Turnstile officiel mais `[INCERTAIN]` sur la
  ventilation par mode, Cron Triggers tenus d'une source unique tierce.

## Prochaine étape

**Écrire la ligne de `S-10` au récapitulatif**, ses cinq griefs d'un coup. J'allais y porter les
trois formes qu'a prises la fermeture — mesurer (faits 1 et 2), citer (fait 3, et deux lignes du
cinquième grief), assumer marqué (la ligne GraphQL) — puis enchaîner sur `S-11`.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher `S-04` par recherche** — la phase stack a établi que ce plafond se mesure.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette. *Borné le
  12/08 : ne vise que ce que la documentation **ne porte pas** — « ni documenté ni infirmé ».
  Citer une page officielle datée est au contraire ce que `S-06` et `S-09` ont déjà fait.*
- **Rouvrir le choix Better Auth** — la mesure retire l'argument de poids, pas la décision ;
  rouvrir ferait relire les quatre mécanismes de `S-05` et le candidat ADR n° 16.
- **Épingler un numéro de correctif dans un candidat ADR** — c'est fabriquer le défaut de `S-10`.
- **Renvoyer un fait de désuétude en recette** — aucun appel réel ne le lève, il faudrait laisser
  le jeton intouché pendant un an.
- **Marquer non sourcé un fait dont la source vient d'être lue** — le candidat ADR n° 5 perdrait le
  motif du Cron de maintien en vie, et `FR-101` sa seule parade écrite.
- **Corriger la fiche archivée du 10/08** dont le `peerDeps` v13 est celui de la 13.7.0 — une fiche
  archivée ne se récrit pas ; c'est le relevé du 12/08 qui porte la valeur exacte.
- **Garder trois preuves faibles en les rendant exactes** — allonge la ligne sans mieux établir
  l'écartement de Pages.
- **Rejouer les mesures du jeton d'écriture** — il faudrait créer à la main des jetons à portée
  fine ; le jeton `gh` de la machine est un OAuth `repo`+`workflow`, la mauvaise forme.
- **Rétrograder la ligne GraphQL** — elle est le seul motif écrit de l'écartement, et les motifs
  de repli (« les deux manques ne coûtent rien ») n'écartent rien.
