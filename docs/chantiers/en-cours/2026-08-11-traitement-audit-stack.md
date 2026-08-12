# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `8a4d277`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul § `S-nn`
            en cours — 414 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Décisions structurantes → candidats ADR » et la seule ligne de
            tableau nommée par le constat en cours — 1107 l. ; jamais en entier
à extraire  `docs/socle-de-livraison.md` › Annexe A et ses réserves — 411 l. ; là que les chiffres
            de plateforme sont relevés, datés et bornés
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat, **ou par le passage de
            `stack.md` que le fait en cours soutient** — 838 l.
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté » —
            231 l. ; les sources déjà rejetées et le motif de chacune, que L5 recroise
à situer    les trois relevés du 12/08 dans `docs/research/` — conclusions déjà dans `stack.md`
à situer    `docs/audit-brief-prd.md` et `docs/audit-auth.md` — clos, arbitrages consommés

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain ; les constats
  restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une ligne
  antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance** : L1 (S-04) · L2 (S-03, S-07, S-08) · L3 (S-09, S-06) ·
  L4 (S-05, S-02, S-01) fermé · **L5 (S-10, S-11, S-18, S-19) ouvert le 12/08** ·
  L6 (S-13, S-15, S-17) · L7 (S-14, S-16, S-20 ; S-12 arbitré ici, exécuté par `premortem socle`).
- **Ce qu'un lot antérieur a annoncé peut être faux — vérifier avant de s'y appuyer**, et **retirer
  un argument faux ne suffit pas : il faut écrire ce qui le remplace**, sans quoi l'audit repose la
  question au même endroit. Trois cas venus de `S-05`, plus le fait 1 où « 3,2 Mo dépaquetés »
  invoqué sous un plafond **gzip** s'inversait une fois remis dans la bonne unité.
- **Un fait « non sourcé » se referme en le mesurant ou en le citant, rarement en le cherchant.**
  Faits 1 et 2 de `S-10` par relevé npm et paquet bâti sur cette machine, fait 3 par trois pages
  officielles ; dans les deux cas c'est le **transcript rejouable** qui satisfait « la vérification
  doit laisser une trace citable », que la fiche du 10/08 opposait au sourçage maison.
- **Un fait mal sourcé est parfois mal *porté*** : la phrase du fait 3 vivait sous le titre des
  jetons **classiques** quand le nôtre est à portée fine. J'ai donc trouvé un défaut de type
  `S-11` **dans** `S-10` — les deux constats se recoupent plus que leurs libellés ne le disent.
- **Le constat `S-10` porte cinq griefs, pas quatre.** Le cinquième — les mesures du 11/08 vivent
  sur un dépôt jetable externe, **sans transcript versionné** — vaut encore pour quatre lignes du
  tableau du jeton d'écriture. Aucune citation ne le comble, et la ligne de `S-10` au récapitulatif
  se refermerait dessus si personne ne l'arbitre.
- **Deux constats peuvent se partager un fait sans le dédoubler.** Le fait 4 s'est rendu en deux
  moitiés — la mesure et son transcript pour `S-10`, la phrase qui déclare la substitution de date
  pour `S-11` —, dans le **même** paragraphe de `stack.md`. Deux griefs réels, deux remèdes.
- **Une contradiction apparente peut n'être qu'un désaccord d'unité.** « v13 » et « Astro 6 »
  nommaient le même jour ; ce n'était pas une correction tue mais une date de sortie mise à la
  place d'une date d'annonce. **Troisième fois que mesurer un fait juste invalide les preuves
  écrites à son appui** — vérifier avant de citer, même ce qu'on a soi-même mesuré la veille.
- **Pour `S-11`** : restent R2 marqué `[À VÉRIFIER]`, Turnstile officiel mais `[INCERTAIN]` sur la
  ventilation par mode, Cron Triggers tenus d'une source unique tierce. Son quatrième écart est
  rendu.

## Prochaine étape

**Arbitrer le cinquième grief de `S-10`** — les mesures du 11/08 vivent sur un dépôt jetable
externe, sans transcript versionné, et ça vaut encore pour quatre lignes du tableau du jeton
d'écriture. J'allais le poser en sachant qu'aucune citation ne le comble : soit on rejoue les
mesures pour verser la trace, soit on rétrograde ces quatre lignes. Puis la ligne de `S-10` au
récapitulatif, les cinq griefs d'un coup, puis `S-11`.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher `S-04` par recherche** — la phase stack a déjà établi que ce plafond se mesure.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette. *Borné le
  12/08 par le fait 3 : ne vise que ce que la documentation **ne porte pas** — « ni documenté ni
  infirmé », comme le point 3 de la recette. Citer une page officielle datée est au contraire ce
  que `S-06` et `S-09` ont déjà fait.*
- **Rouvrir le choix Better Auth** — arbitré le 12/08 : la mesure retire l'argument de poids, pas
  la décision ; rouvrir ferait relire les quatre mécanismes de `S-05` et le candidat ADR n° 16.
- **Épingler un numéro de correctif dans un candidat ADR** — c'est fabriquer le défaut de `S-10`.
- **Renvoyer un fait de désuétude en recette** — aucun appel réel ne le lève, il faudrait laisser
  le jeton intouché pendant un an ; les six points de la recette se lèvent, eux, d'un appel.
- **Marquer non sourcé un fait dont la source vient d'être lue** — le candidat ADR n° 5 perdrait le
  motif du Cron de maintien en vie, et `FR-101` sa seule parade écrite.
- **Corriger la fiche archivée du 10/08** dont le `peerDeps` v13 est celui de la 13.7.0 — une fiche
  archivée ne se récrit pas ; c'est le relevé du 12/08 qui porte la valeur exacte.
- **Garder trois preuves faibles en les rendant exactes** (README « à partir de la 13.1.3 », « pas
  d'occurrence de *Cloudflare Pages* ») — allonge la ligne sans mieux établir l'écartement.
