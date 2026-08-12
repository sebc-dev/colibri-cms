# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `aeb0ffc`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul § `S-nn` en cours — 418 l.
à extraire  `docs/stack.md` › le tableau des choix + § « Décisions structurantes → candidats ADR » — 1208 l. ; les deux surfaces que vise `L6`
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat, ou par la ligne de `stack.md` qu'il soutient — 838 l.
à situer    `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté » — a servi à `S-10`/`S-11`, sans emploi connu en `L6`
à situer    `docs/research/2026-08-10-gating-paiement-r2-email-cloudflare.md` — servira à `S-20` (`L7`), pas avant
à situer    `docs/socle-de-livraison.md` › §7 et Annexe A — à remonter pour `S-14` ; ni `S-18` ni `S-19` n'en ont eu besoin, contrairement à ce que j'avais prévu
à situer    les cinq relevés du 12/08 de `docs/research/` — conclusions déjà portées par `stack.md`
à situer    `docs/audit-brief-prd.md`, `docs/audit-auth.md` — clos, arbitrages consommés

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain, sur feu vert ;
  les constats restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une
  ligne antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance, décidé le 11/08** : `L5` (`S-11`, `S-18`, `S-19`), puis `L6` (`S-13`,
  `S-15`, `S-17`), puis `L7` (`S-14`, `S-16`, `S-20`) ; `S-12` arbitré ici, exécuté par
  `premortem socle`.
- **Ce que chaque constat a appris est écrit dans sa ligne du récapitulatif**, jamais reporté ici —
  les trois façons de refermer un fait non sourcé (`S-10`) et le premier emploi de la troisième
  (`S-11`).
- **J'avais pris pour règle d'instruire la piste autant que le constat**, et `L5` m'a donné raison :
  elle s'y est révélée tour à tour fausse, molle et déjà écartée alors que le constat, lui, tenait —
  d'où des arbitrages qui confirment le grief et réfutent le remède.

## Prochaine étape

**Instruire `L6`** — `S-13` (exigences techniques sans porteur), `S-15` (cinq attributions `FR`/`SC`
inexactes), `S-17` (quatre lignes sans candidat ADR nommé) —, un constat à la fois sur feu vert,
puis écrire leurs lignes au récapitulatif. J'allais commencer par `S-15`, le plus mécanique, dont
le résultat sert de base à `S-17`.

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
- **Les écartés propres à chaque constat** — `S-10`, `S-11`, `S-18`, `S-19` — sont **écrits dans
  leur ligne du récapitulatif**, avec leur motif. Ils n'ont plus à vivre ici.
