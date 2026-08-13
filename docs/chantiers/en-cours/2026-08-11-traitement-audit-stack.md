# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `0731b6b`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul § `S-nn` en cours — 420 l.
à extraire  `docs/stack.md` › le tableau des choix, « Domaines sans objet », « Le seul choix qui ne sert aujourd'hui aucune exigence », « Décisions structurantes → candidats ADR » — 1280 l. ; les quatre surfaces que vise `S-13`
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat — 838 l. ; `S-13` en nomme neuf groupes, dont `FR-099`-`FR-104` et `FR-110`-`FR-116`
à extraire  `docs/socle-de-livraison.md` › §7 et Annexe A — 411 l. ; le dossier d'instance de `FR-110`-`FR-116` y touche, et `S-14` en aura besoin ensuite
à situer    `docs/research/2026-08-10-gating-paiement-r2-email-cloudflare.md` — servira à `S-20` (`L7`), pas avant
à situer    `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté » — a servi à `S-10`/`S-11`, sans emploi depuis
à situer    les cinq relevés du 12/08 de `docs/research/`, `docs/audit-brief-prd.md`, `docs/audit-auth.md` — conclusions déjà portées, ou arbitrages consommés

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain, sur feu vert ;
  les constats restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une
  ligne antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance, décidé le 11/08** : `L5` (`S-11`, `S-18`, `S-19`), puis `L6` (`S-13`,
  `S-15`, `S-17`), puis `L7` (`S-14`, `S-16`, `S-20`) ; `S-12` arbitré ici, exécuté par
  `premortem socle`.
- **Ce que chaque constat a appris est écrit dans sa ligne du récapitulatif**, jamais reporté ici.
- **J'avais pris pour règle d'instruire la piste autant que le constat**, et elle a payé dans les
  deux sens : en `L5` la piste s'est révélée tour à tour fausse, molle et déjà écartée alors que le
  constat, lui, tenait ; en `S-15` elle avait raison, mais pour un motif qu'elle n'avançait pas —
  et suivre le constat à la lettre aurait abîmé le document.
- **Un grief arrive parfois déjà refermé par un arbitrage antérieur** — quatre fois (`S-11`,
  `S-18`, `S-15`, `S-17`) : je vérifiais l'état réel de la ligne visée avant d'instruire le grief.
- **Et je la vérifiais dans le corps du document, pas seulement dans la section que le constat
  nomme** — sur `S-17`, c'est un § situé ailleurs qui a retourné une proposition déjà approuvée en
  séance. J'en avais tiré une règle pour la suite : **toute ligne neuve au tableau doit naître avec
  son candidat ADR**, faute de quoi elle devient le trou que `S-17` a dû combler.

## Prochaine étape

**Clore `L6` avec `S-13`** — les exigences à forte teneur technique sans porteur au tableau, le
plus lourd des trois. Il nomme neuf groupes de `FR`/`SC`, et sa piste demande de trancher pour
chacun entre une ligne de tableau (vrai domaine, donc candidat ADR) et une mention « descend en
specs avec la décision X attendue ». Puis écrire sa ligne au récapitulatif.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette. *Borné le
  12/08 : ne vise que ce que la documentation **ne porte pas**. Citer une page officielle datée est
  au contraire ce que `S-06` et `S-09` ont déjà fait.*
- **Renvoyer en recette ce qu'aucun appel réel ne tranche** — écarté deux fois le 12/08 (`S-10`,
  `S-18`) : la section n'admet pas ce qui se lèverait par une attente d'un an, ni par un
  ramasse-miettes non daté (`S-19`).
- **Les écartés propres à chaque constat** — `S-10`, `S-11`, `S-15`, `S-17`, `S-18`, `S-19` — sont
  **écrits dans leur ligne du récapitulatif**, avec leur motif. Ils n'ont plus à vivre ici.
