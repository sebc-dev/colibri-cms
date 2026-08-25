# Candidat ADR : Générateur du site public et de l'aperçu — Astro 7
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0002-generateur-astro-7.md` (ADR-0002 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

Deux exigences tirent dans des directions que peu d'outils tiennent ensemble.

- `FR-095` et `FR-096` veulent des **pages publiques servies en statique** : le site publié
  doit être des fichiers, pour que les requêtes restent gratuites et hors quota et que
  `SC-005` (Lighthouse ≥ 95 en mobile) soit atteignable.
- `FR-081` veut un **aperçu avant publication rendu par le serveur, avec le même rendu que
  celui du site publié**. Un aperçu qui diverge du publié ne remplit pas l'exigence.

Servis par ailleurs : `SC-005`. Le choix est contraint par [ADR-0001](../../1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md),
qui a retenu un Worker Cloudflare unique : l'adaptateur `@astrojs/cloudflare` et la version
majeure d'Astro sont couplés, `@astrojs/cloudflare@13.0.0` et `astro@6.0.0` ayant été publiés
le 2026-03-10 à trois secondes d'intervalle
([`docs/research/2026-08-12-adaptateur-astro-pages.md`](../../research/2026-08-12-adaptateur-astro-pages.md)).

## Décision

Nous utiliserons **Astro 7** comme générateur du site public et moteur de rendu de l'aperçu.

## Conséquences

**Positives.**

- Un seul jeu de composants sert le publié et l'aperçu : `FR-081` est tenu sans second moteur
  à faire converger, et sans repasser par un build (attente pour l'éditrice, consommation du
  quota de minutes).
- Le site publié reste des fichiers statiques par défaut, donc `FR-095`, `FR-096` et le coût
  nul de `SC-001` tiennent sans configuration propre au projet.

**Négatives — ce à quoi le code s'engage.**

- **L'emplacement d'un gabarit de page n'est plus un choix.** Un fichier de `src/pages/` vaut
  une URL : c'est Astro qui possède cette surface, et le produit s'y plie. Il en découle que
  les pages publiques et les routes d'administration **cohabitent dans un seul arbre de
  routes**, sur une seule origine.
- **Le graphe d'imports est la frontière de confidentialité.** Ce qu'un composant hydraté
  importe part dans le navigateur. Une frontière qui serait tenue « par convention » ne tient
  pas : elle doit se lire dans les imports, ce que `docs/archi.md` pose en invariants.
- **La politique de sécurité qu'Astro sait poser ne convient pas à l'administration.** Depuis
  `astro@6.0.0`, Astro calcule les empreintes de ses scripts groupés et pose une politique —
  mais **dans un `<meta>`, jamais dans un en-tête, et sans nonce** ; l'absence de nonce est un
  refus de conception assumé par l'éditeur, un nonce exigeant une réécriture du HTML à chaque
  requête. Une politique en `<meta>` ne peut exprimer ni `frame-ancestors`, ni `report-uri`,
  ni `sandbox`. L'administration devra donc porter la sienne **dans le code**, et Astro ne
  l'en dispense pas.
- **Une montée de version majeure d'Astro se propage à toute la flotte.** `FR-105` et `SC-008`
  exigent qu'une nouvelle version se déploie sur chaque instance sans code spécifique au
  client : la version d'Astro est un engagement pris pour toutes les clientes à la fois, et
  l'adaptateur y est épinglé.
- La configuration d'images d'Astro décide, au-delà d'elle-même, du **plafond de médias du
  produit** — voir [ADR-0019](../../1.x/adr/0019-pipeline-d-images-variantes-au-build.md).

## Alternatives considérées

- **Eleventy ou Hugo** : écartée car un générateur purement statique n'a pas de moteur de
  rendu serveur. L'aperçu de `FR-081` y repasserait par un build — attente pour l'éditrice et
  consommation du quota de minutes — ou par un second moteur de rendu, dont la divergence
  casserait « le même rendu que celui du site publié ».

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, arbitrée par
  l'humain. Revue humaine : 2026-08-13.
