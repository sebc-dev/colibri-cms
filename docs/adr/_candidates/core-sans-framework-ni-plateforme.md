# Candidat ADR : `src/core/` n'importe ni framework ni plateforme
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0022-core-sans-framework-ni-plateforme.md` (ADR-0022 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — le numéro 2.x est attribué à la promotion, un geste humain dans `docs/adr/`.


## Contexte

Le [Brief](../../legacy/1.x/brief.md) pose que « le code entrant n'est pas relu ligne à ligne » et que la
confiance vient de vérifications mécaniques. C'est ce que la caractéristique `C5` de
`docs/archi.md` — **testabilité sans plateforme** — traduit en exigence de structure : la
logique métier doit s'instancier **sans base, sans HTTP et sans Worker**.

Deux critères du PRD, et deux seulement, décrivent un **calcul exact** : `SC-016` — le
récapitulatif présenté avant une publication liste **exactement** les pages concernées — et
`SC-019` — les nombres de l'écran des demandes sur un jeu connu. Ce sont ceux qui gagnent le
plus à être testés sans plateforme.

La caractéristique `C1` — **reconstructibilité sans le produit** — en dépend aussi : si la
logique métier importait le framework web, le mode de build « depuis les fichiers plats » du
socle de livraison ne serait pas atteignable.

**Trace observable** : une **ligne d'import** dans un fichier de `src/core/`.

## Décision

**Aucun fichier de `src/core/` n'importera `astro`, `svelte`, `@astrojs/*` ni `cloudflare:*`.**

## Conséquences

**Positives.**

- Les deux calculs exacts du PRD se testent **sans base, sans HTTP et sans Worker** — donc vite,
  et sans simulacre qui dégraderait l'oracle
  ([ADR-0013](../../legacy/1.x/adr/0013-tests-vitest-dans-workerd.md)).
- `src/core/` survit à un changement de framework ou d'adaptateur : ce qui est vraiment le
  produit ne dépend d'aucun des deux.
- La règle est **falsifiable** dans les sources, sans exécuter quoi que ce soit.

**Négatives — ce à quoi le code s'engage.**

- **`src/core/` ne peut rien faire de lui-même** : ni requête, ni lecture de base, ni accès aux
  liaisons. Tout effet passe par ce que la route lui **donne**, de main en main. C'est le style
  micro retenu — ports et adaptateurs allégés — et il coûte du passage d'arguments à chaque
  niveau.
- **L'interdit est nominatif.** Il liste des paquets ; un paquet qui atteindrait le même effet
  sous un autre nom passerait le contrôle. La liste est donc à maintenir quand la stack évolue.
- **Écrire la logique métier sans les commodités du framework est plus verbeux**, et c'est payé
  partout dans `core/`.

## Alternatives considérées

- **Un conteneur d'injection de dépendances** : écarté car `workerd` n'atteint les liaisons —
  D1, `send_email`, Durable Object — que depuis le **contexte d'une requête** : aucun module
  n'ouvre la base au chargement. Un conteneur qui résout au chargement est hors jeu, et la
  plateforme impose déjà le passage de main en main depuis la route.
- **Laisser `src/core/` importer le framework et s'en remettre aux tests** : écarté car l'oracle
  deviendrait dépendant de la plateforme — tester `SC-016` demanderait un Worker —, et `C5`
  tomberait.
- **Interdire par convention plutôt que par liste** : écarté car non falsifiable, donc sans
  effet sous un régime où le code n'est pas relu ligne à ligne.

## Vérifiable ?

Oui — `arch-invariants`, invariant `I2` : aucun import d'`astro`, `svelte`, `@astrojs/*` ni `cloudflare:*` sous `src/core/`.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi depuis l'invariant que
  la Stack lui avait déposé. Revue humaine : 2026-08-13.
