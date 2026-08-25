# Candidat ADR : Cible de déploiement et système de build — un Worker Cloudflare unique bâti par Workers Builds
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md` (ADR-0001 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

ColibriCMS sert un site public **et** son administration depuis une même instance, dans le
compte de chaque cliente. Deux exigences décident de la cible :

- `FR-081` (aperçu avant publication) demande un aperçu **rendu serveur avec les mêmes
  composants que le site publié** — donc un adaptateur de rendu serveur, pas un simple
  hébergement de fichiers ;
- `FR-095` et `FR-096` (pages publiques servies en statique) veulent que le site publié reste
  des fichiers, et `SC-001` (coût d'hébergement nul) que rien n'exige de moyen de paiement.

Servis par ailleurs : `FR-087`, `FR-089`, `FR-097`, `SC-004`.

Le système de build n'est pas un choix indépendant de la cible : la CI hébergée de Cloudflare
est **couplée** à elle. Et le déclenchement l'est à `FR-089`, qui réserve le déclenchement au
dépôt du **contenu publié** — la branche de médias n'est donc pas un déclencheur.

Le fait qui écarte l'alternative Pages est daté et mesuré :
[`docs/research/2026-08-12-adaptateur-astro-pages.md`](../../research/2026-08-12-adaptateur-astro-pages.md)
— `@astrojs/cloudflare` a retiré le support de Pages à la **v13.0.0, publiée le 2026-03-10**
(le plan de routage `_routes.json`, propre à Pages, est écrit par la v12.6.13 et n'apparaît
plus une seule fois dans le `dist` de la v13.0.0, dont `generate-routes-json.js` tombe de 225
à 22 lignes et perd son `createRoutesFile`).

## Décision

Nous déploierons **un Worker Cloudflare unique** — assets statiques et routes serveur dans le
même artefact — et nous le bâtirons par **Workers Builds**.

Workers Builds surveillera la branche **`main` seule** ; le build récupérera la branche
orpheline `media` pendant son exécution.

## Conséquences

**Positives.**

- L'aperçu de `FR-081` est rendu par le même moteur et les mêmes composants que le site
  publié : il n'y a pas de second moteur à faire converger.
- La branche courante d'Astro reste accessible (`astro@7.2.1`), au lieu des deux majors de
  retard qu'imposerait Pages.
- Une publication produit **un seul** build : `media` ne déclenche rien, et l'élagage des
  orphelins a quitté l'après-build. `C4` du socle de livraison en découle par construction —
  dix enregistrements vont en D1 et produisent **zéro** déploiement, seule une publication
  commite.
- Les requêtes aux assets statiques sont gratuites et hors quota.

**Négatives — ce à quoi le code s'engage.**

- **Aucune frontière ne peut être tenue par le déploiement.** Un artefact unique signifie que
  toute séparation entre le site, l'administration et la logique métier est **interne au
  dépôt** : elle se tient par le placement des fichiers et le sens des imports, et par rien
  d'autre. C'est ce qui oblige `docs/archi.md` à poser des invariants de structure.
- Le Worker est soumis au **plafond de 3 Mo gzip** du palier gratuit : aucune couche
  d'abstraction n'est gratuite, et chaque dépendance se pèse.
- **Dix publications en deux minutes font dix builds.** Le verrou de publication sérialise, il
  ne débounce pas ; la concurrence de build de 1 les met en file, sans erreur ni coût, mais la
  consommation de minutes est réelle.
- **Le produit est couplé à Workers Builds** : changer de système de build, c'est changer de
  cible de déploiement.
- **Une dépendance n'est pas acquise, et elle est bloquante** : que le *checkout* de Cloudflare
  atteigne la branche `media` sans jeton fourni n'est ni documenté ni infirmé. Si la réponse
  est non, le jeton de lecture `Contents: Read-only` du §7 du socle de livraison devient
  **obligatoire**, faute de quoi le site bâti n'a aucun média. C'est le point 3 de « À
  constater en recette » de `docs/stack.md`, promu bloquant.

## Alternatives considérées

- **Projet Pages + Pages Build** : écartée car l'aperçu rendu serveur y imposerait
  `astro@5.18.2` — dernier de la branche que la v12.6.13 de l'adaptateur épingle — contre
  `astro@7.2.1`. Deux majors en arrière, sur une branche que l'adaptateur a quittée, et
  `FR-105`/`SC-008` (montée de version sans code spécifique au client) font porter cette dette
  par **toute la flotte**. Les plafonds du palier gratuit sont égaux des deux côtés et n'ont
  rien départagé.
- **Surveiller les deux branches (`main` et `media`)** : écartée car le dépôt sur `media`
  rebâtirait le site sur un contenu inchangé et doublerait une consommation de minutes que
  l'Annexe A du socle de livraison ne sait pas encore chiffrer.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack sur faits sourcés et
  datés, arbitrée par l'humain. Revue humaine : 2026-08-13.
