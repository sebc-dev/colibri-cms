# Candidat ADR : Le sens des dépendances entre zones est unique et descendant
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0021-sens-descendant-des-dependances-entre-zones.md` (ADR-0021 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

[ADR-0001](../../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md) a retenu **un artefact
unique** : toutes les routes serveur vivent dans un seul Worker. Il en découle qu'**aucune
frontière ne peut être tenue par le déploiement** — celle du produit doit donc l'être par le
placement des fichiers et le **sens des imports**, et par rien d'autre.

`docs/archi.md` découpe le code en **cinq zones** — `src/site/`, `src/admin/`, `src/render/`,
`src/core/`, `src/platform/` — plus `src/pages/`, qui n'est pas une zone mais la surface de
routage imposée par Astro ([ADR-0002](../../legacy/1.x/adr/0002-generateur-astro-7.md)).

**Caractéristiques architecturales servies** (`docs/archi.md`) : `C1` — reconstructibilité sans
le produit ; `C2` — confinement de l'origine commune ; `C5` — testabilité sans plateforme.
**Exigences servies** : `FR-107`, `SC-011`.

**Trace observable** : une **ligne d'import** dont la source et la cible violent la matrice.

## Décision

Nous tiendrons un sens de dépendance **unique et descendant** entre zones :

- `src/pages/` → toutes ;
- `src/site/` → `src/render/`, `src/core/` ;
- `src/admin/` → `src/render/`, `src/core/`, `src/platform/` ;
- `src/render/` → `src/core/` ;
- `src/platform/` → `src/core/` ;
- `src/core/` → **aucune**.

**Toute autre arête est interdite.**

## Conséquences

**Positives.**

- **Le graphe d'imports du site publié n'atteint jamais la base.** Un build depuis les seuls
  fichiers plats produit donc le site — ce que `C6` du
  [socle de livraison](../../legacy/socle-de-livraison.md) exige, et que `FR-107` et `SC-011` mesurent.
- **`src/core/` s'instancie sans base, sans HTTP et sans Worker** : la logique métier est
  testable sans plateforme.
- La frontière est **falsifiable** : un manquement est une ligne d'import, pas une impression de
  relecture.

**Négatives — ce à quoi le code s'engage.**

- **Une page publique ne peut pas lire la base.** `src/site/` n'atteint pas `src/platform/` :
  tout raccourci qui voudrait, depuis une page publique, compter une vue ou lire un réglage en
  base est fermé. C'est voulu — c'est ce qui tient `C1` — mais le refus se paiera le jour où le
  raccourci se présentera.
- **Aucune mutualisation « pratique » entre `site/` et `admin/`.** Ce qui doit être partagé
  descend dans `render/` ou `core/`, ou bien il est dupliqué. Il n'y a pas de troisième voie.
- **La matrice est à tenir à chaque fichier ajouté**, et son coût réel est le refus d'un import
  qui « marcherait ».
- **Une règle voisine reste hors invariant, faute de trace** : « une route de `src/pages/` reste
  mince et délègue à sa zone ». Aucun seuil ne rend « mince » falsifiable sans arbitraire ; elle
  se tient à la main, et c'est le prix assumé du découpage en cinq zones.

## Alternatives considérées

- **Tenir la frontière par le déploiement** (deux artefacts, l'un public l'autre
  d'administration) : écartée par [ADR-0001](../../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md)
  — Cloudflare Workers déploie **un** artefact, toutes les routes serveur comprises.
- **Ne poser aucune règle de sens et s'en remettre à la convention à la relecture** : écartée car
  le [Brief](../../legacy/1.x/brief.md) pose que « le code entrant n'est pas relu ligne à ligne ». Une
  convention non falsifiable ne tient pas.
- **Des zones sans matrice, avec pour seul interdit l'isolement de `core/`** : écartée car moins
  chère mais insuffisante — elle laisserait `src/site/` importer `src/admin/`, et le graphe
  d'imports **étant** la frontière de confidentialité
  ([ADR-0002](../../legacy/1.x/adr/0002-generateur-astro-7.md)), du code d'administration partirait dans le
  navigateur d'une visiteuse.

## Vérifiable ?

Oui — job `boundaries` (`npm run lint:boundaries`, `eslint.config.boundaries.js`), sur le **graphe d'imports résolu** : alias, ré-exports et barils, qu'une expression régulière ne voit pas.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi depuis les contraintes
  de la Stack. Revue humaine : 2026-08-13.
