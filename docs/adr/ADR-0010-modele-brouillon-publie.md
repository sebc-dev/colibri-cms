---
id: ADR-0010
title: Modèle brouillon/publié à deux contenus
status: accepted
date: 2026-08-01
authors: [arborescence-digital]
scope: packages/db, packages/core, apps/
supersedes: []
superseded-by: null
depends-on: [ADR-0004]
---

# ADR-0010 — Modèle brouillon/publié à deux contenus

**Statut :** accepted — 2026-08-01

> **Place dans la famille.** ADR-0010 fixe *où vit le contenu et quand il devient public*. C'est la décision mère de la revue du PRD du 1<sup>er</sup> août 2026 (cf. [docs/suites-revue-prd.md](../suites-revue-prd.md), décisions D1 à D3) : elle commande le modèle de données d'ADR-0004, la sémantique de publication d'ADR-0007, les cibles de test d'ADR-0005, et une rupture éventuelle est une **majeure** SemVer au sens d'ADR-0008.

---

## Contexte

Le PRD posait un état **au niveau page** (brouillon / publiée) et une seule valeur par `(page_id, zone_key)`. Trois faits rendaient ce modèle intenable :

1. **Enregistrer écrase.** Une page publiée dont l'éditrice enregistre une modification perdait immédiatement sa version publique en base.
2. **Le build est global.** Le site est rebâti en entier ; publier *une* page mettait donc en ligne *toutes* les modifications enregistrées ailleurs. `US4-3`, `FR-035` et `FR-037` étaient faux dès la deuxième page publiée.
3. **Le geste naturel devenait une publication.** Enregistrer pour reprendre demain — le réflexe d'une non-technicienne — publiait. Incompatible avec `SC-003`.

La revue a tranché : **deux contenus par objet** (`FR-078`), étendus aux formulaires (`FR-047`) et aux réglages transverses (`FR-073`). Restent à décider ici les trois points que `FR-078` ne fixe pas : la **forme** des deux contenus en base, le **moment** exact de la recopie, et ce que « publier » recouvre pour un objet **référencé par plusieurs autres**.

Contraintes d'entrée :

- **Aucun code produit n'existe** (ni `apps/`, ni `packages/`). Aucune donnée en production, aucune rétrocompatibilité à tenir : le modèle est choisi librement, une fois.
- **ADR-0004 garantit l'anti-dérive par le partage** : preview SSR et build SSG appellent *la même* requête `@colibri/db` et *le même* `toBlocks`. Toute solution qui donne au site et à l'admin deux chemins de lecture différents rouvre le risque que cet ADR existe pour fermer.
- **`FR-085`** (index de références) et **`FR-055`** (image introuvable) doivent inspecter le contenu **en ligne**, pas le contenu en cours.
- **`FR-090`/`FR-091`** valident et recalculent une soumission contre la **définition publiée** d'un formulaire : cette définition doit être une référence stable et adressable.

---

## Décision

### 1. Un discriminant d'état sur la valeur, pas deux chemins de lecture

Toute table de **valeur de contenu** porte une colonne `state` dans sa clé primaire :

```sql
-- state : 'draft' = contenu en cours (édité) · 'live' = contenu en ligne (figé à la publication)

CREATE TABLE page_zone_values (
  page_id    TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  zone_key   TEXT NOT NULL,
  state      TEXT NOT NULL CHECK (state IN ('draft','live')),
  value_json TEXT NOT NULL,
  PRIMARY KEY (page_id, zone_key, state)
);

CREATE TABLE site_settings (
  key        TEXT NOT NULL,
  state      TEXT NOT NULL CHECK (state IN ('draft','live')),
  value_json TEXT NOT NULL,
  PRIMARY KEY (key, state)
);
```

**Mêmes colonnes, même schéma Zod, même repository, même renderer.** La seule différence entre le contenu que voit l'éditrice et celui que voit le visiteur est la valeur de `state`. La garantie d'ADR-0004 — preview et build ne peuvent pas diverger — survit intacte : c'est littéralement la même requête.

Le vocabulaire du PRD se traduit une fois pour toutes : **contenu en cours = `draft`**, **contenu en ligne = `live`**. On n'emploie pas `published` pour une valeur de zone, réservé à l'état d'un objet.

### 2. La définition d'un formulaire est un contenu comme un autre

Un formulaire pose un problème que les pages n'ont pas : sa définition est un **arbre** (formulaire → champs → choix). Dupliquer cet arbre par état ferait collisionner des identifiants de substitution. La résolution est celle qui vaut déjà pour les pages : **une clé naturelle stable à l'intérieur de l'objet**.

`field_key` est à un formulaire ce que `zone_key` est à une page.

```sql
CREATE TABLE form_fields (
  form_id    TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  state      TEXT NOT NULL CHECK (state IN ('draft','live')),
  field_key  TEXT NOT NULL,          -- stable entre les deux états et à travers les publications
  type       TEXT NOT NULL CHECK (type IN ('text','email','phone','textarea',
                     'select_single','select_multi','number','date','consent')),
  label      TEXT NOT NULL,
  required   INTEGER NOT NULL DEFAULT 0,
  min_value  INTEGER, max_value INTEGER,   -- bornes du champ nombre (FR-045)
                                           -- max_value obligatoire pour type='number' : la règle
                                           -- est portée par le schéma Zod d'entrée, pas par un
                                           -- CHECK — elle ne vaut que pour un seul type de champ
  unit_price INTEGER,                      -- centimes (FR-045)
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_id, state, field_key)
);

CREATE TABLE form_field_options (
  form_id     TEXT NOT NULL,
  state       TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  option_key  TEXT NOT NULL,
  label       TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,  -- centimes entiers
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_id, state, field_key, option_key),
  FOREIGN KEY (form_id, state, field_key)
    REFERENCES form_fields(form_id, state, field_key) ON DELETE CASCADE
);
```

Cette clé naturelle n'est pas un confort de modélisation : **`FR-091` en dépend**. Le total est recalculé côté serveur à partir des réponses reçues et de la définition publiée ; la soumission désigne donc ses réponses par `field_key`/`option_key`. Un identifiant de substitution dupliqué par état rendrait ce rapprochement impossible.

### 3. La métadonnée de publication est commune aux trois genres d'objet

`FR-078` dit « la même règle s'applique aux formulaires et aux réglages ». On l'écrit une fois :

```sql
CREATE TABLE publications (
  kind                TEXT NOT NULL CHECK (kind IN ('page','form','settings')),
  ref                 TEXT NOT NULL,   -- pages.id, forms.id, ou 'site' pour les réglages
  en_ligne            INTEGER NOT NULL DEFAULT 0,   -- exposé au visiteur ? (FR-083)
  first_published_at  TEXT,            -- FR-038 : première publication
  last_published_at   TEXT,            -- FR-038 : dernière mise en ligne
  draft_fingerprint   TEXT NOT NULL,   -- empreinte du contenu en cours
  live_fingerprint    TEXT,            -- empreinte du contenu en ligne
  PRIMARY KEY (kind, ref)
);
```

Trois genres d'objet suivent exactement le même cycle : la règle de trois est satisfaite, l'algorithme de publication est écrit **une fois** et testé une fois.

Les **empreintes** (`fingerprint`) ne sont pas un raffinement : `FR-079` demande à la liste des pages de signaler celles qui portent des modifications non publiées. Sans empreinte, c'est une comparaison ligne à ligne par page à chaque affichage de la liste ; avec, c'est une colonne.

### 4. Les états de `FR-019` sont dérivés, jamais stockés

Aucune colonne `status`. L'état affiché à l'éditrice est fonction de trois faits :

| État | Dérivation |
|---|---|
| **jamais publiée** | `first_published_at IS NULL` |
| **publiée** | `en_ligne = 1` et `draft_fingerprint = live_fingerprint` |
| **publiée avec modifications en attente** | `en_ligne = 1` et `draft_fingerprint ≠ live_fingerprint` |
| **retirée du site** | `en_ligne = 0` et `first_published_at IS NOT NULL` |

Un état stocké qu'on peut dériver finit par se désynchroniser de ce qu'il décrit ; c'est le défaut qui a rendu `pages.status` intenable.

> **Conséquence sur le PRD — à trancher.** La quatrième ligne n'existe pas dans `FR-019`, qui n'énumère que trois états. `FR-083` (retirer une page du site) en crée pourtant nécessairement un quatrième : une page retirée n'est ni « jamais publiée » (elle l'a été) ni « publiée » (elle ne l'est plus). **`FR-019` doit être amendé** pour porter cet état. Signalé plutôt qu'appliqué : le PRD n'est pas modifié par un ADR *proposed*.

**Dépublier ne touche pas au contenu en ligne.** `FR-083` bascule `en_ligne` à 0 et rien d'autre : le contenu `live` reste figé, ce qui permet de republier la page telle quelle sans repasser par l'éditrice.

### 5. Le moment de la recopie

Au clic « Publier », **synchronement**, dans **un seul `batch()` D1** :

1. vérification du jeton de verrou (`FR-092`) — si le contenu en cours a changé depuis l'ouverture, on refuse avant toute écriture ;
2. vérification des zones obligatoires non vides (`FR-053`) — refus explicite et nommé (`FR-054`) ;
3. `DELETE` des lignes `state='live'` de l'objet, puis `INSERT … SELECT` depuis ses lignes `state='draft'` ;
4. `publications` : `en_ligne = 1`, `first_published_at` si nul, `last_published_at = now`, `live_fingerprint = draft_fingerprint` ;
5. reconstruction de l'index de références de l'objet (`FR-085`).

Puis, **hors transaction**, le déclenchement du Deploy Hook et l'enregistrement de l'identifiant de build qu'il retourne (`FR-087`).

> **Piège à nommer, parce qu'il est contre-intuitif.** Entre l'étape 5 et la fin du build, le **contenu en ligne en base** et le **site réellement servi** divergent. « Contenu en ligne » signifie *le contenu à partir duquel le site est bâti*, pas *le HTML que le visiteur reçoit à cet instant*. C'est exactement l'écart que `FR-087` a pour rôle d'exposer. **Ne jamais présenter « en ligne » comme « visible »** sans consulter l'état de mise en ligne — sans quoi une publication dont le build a échoué (`FR-055`) serait annoncée comme réussie.

L'ordre est contraint : la recopie ne peut pas attendre le succès du build, car le build lit le contenu **en ligne**. Faire l'inverse obligerait le build à lire le contenu en cours, ce qui détruirait toute la décision.

### 6. Publier porte sur un objet ; le build porte sur le site

La publication est **granulaire par objet** (une page, un formulaire, les réglages). Le build, lui, rebâtit tout à partir de *tous* les contenus en ligne. Deux publications rapprochées sont donc absorbées par un seul build (`FR-058`) — comportement natif du Deploy Hook, qui déduplique les déclenchements reçus avant qu'un build ne démarre.

### 7. Une référence est un identifiant, jamais une copie

Une zone qui désigne un formulaire (`FR-086`), une page (`FR-015`, `FR-070`) ou un média stocke un **identifiant**. Elle n'en copie jamais le contenu.

Conséquence, et **c'est la réponse à « que recouvre publier pour un formulaire désigné par plusieurs pages »** : publier un formulaire met à jour son affichage **partout** où il est désigné, sans republier aucune des pages qui le désignent. C'est le comportement attendu — « j'ai corrigé un prix » le corrige sur tout le site — et c'est aussi le seul qui soit tenable : republier les pages porteuses ferait passer en ligne leurs propres modifications en cours, ce que `FR-078` interdit.

Ce qui est figé à la publication d'une page, c'est donc **la valeur de ses zones**, pas **l'état des objets qu'elle référence**.

Corollaire `FR-085` : au build, une référence dont la cible n'est pas en ligne **n'est pas rendue** (bouton absent, lien redevenu texte, zone formulaire vide) — jamais de lien mort, jamais d'échec de build pour ce motif.

### 8. Invariant de frontière : rien de public ne vit hors des deux contenus

Toute donnée rendue au visiteur provient d'un contenu `state='live'`. Sinon, elle passe en ligne sans publication et contredit `FR-017` et `FR-078`.

Cet invariant a une conséquence immédiate et non évidente : **le texte alternatif d'une image (`FR-025`) ne peut pas vivre sur `media.alt`**. Une correction d'alt sur une image déjà publiée partirait en ligne au prochain build de n'importe quelle autre page, sans que l'éditrice ait publié quoi que ce soit. L'alt rejoint donc la valeur de zone — `{ media_id, alt }` — au même titre que la légende de galerie, qui y était déjà.

`media` ne porte plus que des faits **techniques et immuables** : `r2_key`, `mime`, `width`, `height`, `size`. Rien d'éditorial.

### 9. Provisionnement (`FR-082`)

Une page provisionnée par l'intégrateur naît avec **zéro ligne** dans les deux états, `en_ligne = 0`, `first_published_at IS NULL`. Elle apparaît donc « jamais publiée », zones vides, et `FR-053` bloque sa publication tant que ses zones obligatoires sont vides — ce qui guide l'éditrice vers ce qu'il faut remplir. Le *mécanisme* de provisionnement (migration, graine, contrat de gabarit) relève d'ADR-0004 et d'ADR-0008, pas d'ici.

---

## Alternatives considérées (et pourquoi rejetées)

| Option | Idée | Rejet |
|---|---|---|
| **Instantané JSON figé** (`pages.live_json`) | Le contenu en ligne est un document opaque, écrit d'un bloc à la publication | Le build lirait un document là où la preview lit des lignes : **deux chemins de lecture**, exactement la dérive qu'ADR-0004 existe pour fermer. Et tout invariant SQL (médias de `FR-055`, références de `FR-085`) devrait être re-dérivé d'un blob. Séduisant sur le « figé », perdant sur le partage. |
| **Tables séparées** (`page_zone_values_live`) | Le contenu en ligne vit dans ses propres tables | **La plus sérieuse.** Un filtre `state` ne peut pas être oublié si la table ne contient que du publié. Rejetée pour son coût : toute évolution d'une valeur de zone se migre deux fois, la publication devient une copie inter-tables, et `FR-055`/`FR-085` passent par des `UNION`. La sûreté visée est obtenue autrement — voir *Constraints* : **seam typé** dans `@colibri/db` (deux fonctions de lecture distinctes, aucune fonction générique paramétrée par l'état) plus une cible de test dédiée. |
| **Table de révisions** (N versions horodatées) | Le publié est une révision parmi d'autres | L'historique des versions est **NON inclus** au PRD, et `FR-080` ne demande qu'un pas en arrière. Construire N versions pour n'en exposer qu'une est de l'abstraction spéculative. |
| **Un seul contenu, publier = mettre en ligne l'état enregistré du site** | Modèle trivial | `US4-3` devrait disparaître et « Enregistrer » deviendrait une demi-publication. Écarté par la revue (D1). |
| **Un seul contenu, filtré par comparaison de dates** | `updated_at > published_at` ⇒ non publié | Une page publiée puis modifiée disparaîtrait du site au build suivant. Écarté par la revue (D1). |
| **`pages.status` à trois valeurs stockées** | L'état de `FR-019` est une colonne | Un état stocké dérivable se désynchronise ; et `FR-083` en impose un quatrième, qu'une colonne figée aurait fait manquer. |

---

## Conséquences

### Bénéfices

- **`US4-3` devient vraie** : publier une page n'emporte plus les modifications enregistrées ailleurs.
- **Enregistrer redevient sans conséquence publique** — la condition de `SC-003`.
- L'anti-dérive d'ADR-0004 est **préservée** : un seul chemin de lecture, un seul renderer, un seul jeu de schémas Zod.
- L'algorithme de publication est **écrit et testé une fois** pour les trois genres d'objet.
- `FR-080` (abandonner le brouillon) devient une opération triviale et sûre : recopie `live → draft`, exactement l'inverse de la publication.
- `FR-090`/`FR-091` disposent d'une définition publiée **adressable et stable** (`form_id`, `state='live'`, `field_key`).

### Risques et vigilance

- **La fuite de brouillon est le pire bug possible du produit** : une requête de build sans filtre `state` publierait du contenu non publié. C'est le prix du discriminant, et il est payé par une contrainte de forme (seam typé) *et* une cible de test explicite d'ADR-0005 — pas par la vigilance.
- **Volume doublé** des tables de valeurs. Non-sujet à l'échelle d'un site vitrine (quelques dizaines de pages), à surveiller si un client atteint plusieurs centaines de pages.
- **Divergence base / site pendant le build**, nommée au § 5. Toute surface qui dit « en ligne » à l'éditrice doit consulter l'état de mise en ligne.
- **`FR-019` est incomplet** (quatrième état) et **`FR-025` déplace le texte alternatif**. Deux amendements de PRD/stack que cet ADR rend nécessaires.
- **Rupture = majeure SemVer** (ADR-0008) : le modèle à deux contenus est une migration D1 structurante ; le modifier après la première mise en production d'un client est une majeure, appliquée par étape outillée après sauvegarde.

---

## Seuils qui feraient reconsidérer

- Si l'historique des versions entrait au périmètre, la table de révisions redeviendrait la bonne forme et cet ADR serait **superseded**, pas amendé.
- Si un client dépassait plusieurs centaines de pages avec de gros contenus, l'instantané figé redeviendrait discutable sur le coût de lecture au build.
- Si un troisième état de contenu apparaissait (par exemple une planification « publier le 12 »), le discriminant s'y prêterait, mais le tableau de dérivation de `FR-019` serait à reprendre entièrement.

---

## Constraints

> Règles impératives et vérifiables — compilées en revue et en cibles de test (cf. ADR-0002, ADR-0005, ADR-0006).

- **OBLIGATOIRE** : toute table de valeur de contenu porte `state` dans sa clé primaire, avec `CHECK (state IN ('draft','live'))`.
- **INTERDIT** : lire une ligne `state='draft'` depuis le build du site public, à quelque profondeur que ce soit.
- **INTERDIT** : exposer dans `@colibri/db` une fonction de lecture générique paramétrée par l'état. Deux fonctions distinctes et typées, dont les noms disent l'état lu.
- **INTERDIT** : écrire dans `state='live'` ailleurs que dans l'opération de publication de `@colibri/db`.
- **OBLIGATOIRE** : la recopie `draft → live` est atomique (un seul `batch()` D1) et **précède** le déclenchement du Deploy Hook.
- **OBLIGATOIRE** : la publication vérifie le jeton de verrou (`FR-092`) et les zones obligatoires (`FR-053`) **avant** toute écriture.
- **OBLIGATOIRE** : une référence à une page, un formulaire ou un média est un identifiant ; **INTERDIT** d'en copier le contenu dans une valeur de zone.
- **INTERDIT** : rendre au visiteur une donnée qui ne provient pas d'un contenu `state='live'` — en particulier, **INTERDIT** de porter le texte alternatif d'une image sur `media`.
- **OBLIGATOIRE** : les états de `FR-019` sont dérivés de `publications` ; **INTERDIT** de stocker une colonne d'état de publication sur `pages` ou `forms`.
- **OBLIGATOIRE** : un champ de formulaire est désigné par une clé naturelle stable (`field_key`), jamais par un identifiant de substitution.

## Related

- Impose : `FR-078`, `FR-079`, `FR-080`, `FR-081`, `FR-082`, `FR-083`, `FR-047`, `FR-073`, `FR-019`, `FR-038`.
- Sert : `SC-003` (enregistrer sans conséquence publique), `SC-004` (publication granulaire), `SC-007` (définition publiée stable).
- Amende, par ricochet : ADR-0004 (modèle de données, contrat de gabarit, index de références), ADR-0007 (définition publiée, bornes de champ nombre), ADR-0005 (nouvelles cibles de test).
- Exploité par : ADR-0008 — une rupture de ce modèle est une **majeure** SemVer.
- Origine : [docs/suites-revue-prd.md](../suites-revue-prd.md), décisions D1, D2, D3, D5, D13 ; [docs/prd.md](../prd.md).
