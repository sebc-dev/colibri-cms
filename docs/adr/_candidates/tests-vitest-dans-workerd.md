# Candidat ADR : Tests — Vitest dans `workerd`, Playwright pour les parcours, épreuve de réversibilité scriptée
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0013-tests-vitest-dans-workerd.md` (ADR-0013 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

Le [Brief](../../1.x/brief.md) pose que « le code entrant n'est pas relu ligne à ligne » : la confiance
vient de vérifications mécaniques. La question n'est donc pas *quel outil de test*, mais **quel
oracle** — ce qui décide si un test dit vrai.

Le produit ne s'exécute pas dans Node : il s'exécute dans `workerd`, contre D1 et le stockage
d'un Durable Object. Un test qui ne rencontre jamais ces implémentations n'atteste de rien de ce
qui sera déployé.

`SC-011` (épreuve de réversibilité) demande en outre une **pièce datée**, donc un script
rejouable et non une manipulation. Exigences servies : toutes, et nommément `SC-003`, `SC-009`,
`SC-011`, `SC-016`.

Relevé versé :
[`docs/research/2026-08-12-vitest-pool-workers-liaisons.md`](../../research/2026-08-12-vitest-pool-workers-liaisons.md)
+ trace brute rejouable.

## Décision

Nous utiliserons **Vitest exécuté dans `workerd`** via **`@cloudflare/vitest-pool-workers`**
(famille `0.21.x`), **Playwright** pour les parcours, et une **épreuve de réversibilité
scriptée**.

## Conséquences

**Positives.**

- Les tests s'exécutent dans **`workerd` lui-même**, l'exécutable qui fait tourner les Workers
  en production, contre les **implémentations** de D1 et du stockage des Durable Objects, avec
  un **stockage isolé par test**. L'oracle est celui du produit.
- L'épreuve de réversibilité scriptée produit la pièce datée que `SC-011` réclame, au lieu d'un
  constat manuel.

**Négatives — ce à quoi le code s'engage.**

- **Ce qui est réel ici est le moteur, non la connexion.** Les liaisons sont **locales**,
  servies par Miniflare : rien ne part vers la base D1 d'un compte Cloudflare. L'outil expose
  bien une option `remoteBindings`, mais « réel » et « distant » y sont **deux réglages
  distincts**, à ne pas confondre en recette.
- **Une version majeure de l'outil de test est décidée par ce choix** : le pair
  **`vitest ^4.1.0`** est imposé, et le produit ne peut pas en changer indépendamment.
- **L'oracle repose sur une chaîne alpha.** La chaîne de moteur est épinglée au correctif près
  et `miniflare` y est en version **alpha** (`5.20260804.0-alpha`). C'est la façon dont
  Cloudflare publie — mais c'est bien la brique qui sert d'oracle au projet qui repose dessus.
- **La cadence de publication est rapide** : `0.21.0` a été publiée le 2026-08-10 et dépassée
  **deux fois en moins de 48 h** (`0.21.2` le 2026-08-12). C'est pourquoi cet ADR nomme une
  **famille** (`0.21.x`) et non un correctif : un numéro de correctif n'a pas sa place dans un
  document immuable.
- **Playwright ajoute une seconde chaîne d'outillage** à installer et à tenir à jour, avec ses
  navigateurs.

## Alternatives considérées

- **Vitest sous Node avec liaisons simulées** : écartée car l'**oracle devient faux** — les
  tests attesteraient du comportement des simulacres, et non de celui de D1, du stockage d'un
  Durable Object ou de `workerd`. C'est exactement la confiance que le Brief refuse.

## Vérifiable ?

Oui — job `test` (`vitest run`). ⚠️ Le dépôt ne porte **aucun fichier de test** à la date de la reprise : le vert n'atteste que l'existence du script.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, corrigée le
  2026-08-12 par le traitement de `S-10` sur mesure. Revue humaine : 2026-08-13.
