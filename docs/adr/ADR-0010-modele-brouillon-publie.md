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

> **Place dans la famille.** ADR-0010 fixe *où vit le contenu et quand il devient public*. C'est la décision mère de la revue du PRD du 1<sup>er</sup> août 2026 (décisions D1 à D3 de cette revue, reprises à l'amendement (b)) : elle commande le modèle de données d'ADR-0004, la sémantique de publication d'ADR-0007, les cibles de test d'ADR-0005, et une rupture éventuelle est une **majeure** SemVer au sens d'ADR-0008.

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

## Amendement 2026-08-01 (b) — ce que la revue avait écarté, et ce qu'elle a piégé

Cet ADR a été écrit pendant les suites de la revue contradictoire du PRD, en s'appuyant sur un
document de suivi qui a depuis été clos et supprimé. Quatre éléments qui n'y vivaient que là sont
repris ici, parce que chacun refermerait un débat déjà tranché ou éviterait une faute réelle.

### (1) Ce que le modèle à deux contenus a rendu nécessaire côté surface

`FR-078` seul laissait trois gestes manquants, et c'est leur absence — pas le modèle — qui aurait
été découverte à l'usage :

- **Rien ne disait quelles pages portaient des modifications non publiées.** L'éditrice ne pouvait
  pas répondre à « qu'est-ce qu'il me reste à mettre en ligne ? ». → `FR-079`, servi par les
  empreintes du § 3, qui existent pour cela et non par raffinement.
- **Aucun retour arrière n'existait.** L'historique des versions étant hors périmètre, un texte
  massacré puis enregistré était perdu — alors que le contenu publié est physiquement là, à côté,
  dans la même table. → `FR-080`, qui est la recopie `live → draft`, exactement l'inverse de la
  publication.
- **Les réglages transverses n'avaient aucun moyen d'arriver en ligne.** « Publier » n'était offert
  qu'à une page ; des liens de réseaux sociaux modifiés restaient bloqués en base. → `FR-081`.

**Objection considérée et écartée** : `FR-080` rouvre-t-il l'historique par la bande ? Non — **un
seul pas en arrière**, sans liste, sans dates, sans restauration sélective. C'est la même frontière
que celle qui fait rejeter la table de révisions dans les alternatives ci-dessous.

### (2) Un lien mort ne fait PAS échouer la mise en ligne — et c'est délibéré

Le § 7 pose qu'une référence dont la cible n'est pas en ligne n'est pas rendue. La symétrie avec
`FR-055` (image introuvable ⇒ la mise en ligne échoue) était tentante et a été **explicitement
refusée** :

> Une image manquante est une **anomalie** ; une page retirée du site est un **choix légitime** de
> l'éditrice. Faire échouer le build sur le second la mettrait en échec pour avoir fait exactement
> ce qu'on lui a offert de faire — et pourrait **geler toute publication** du site tant qu'elle n'a
> pas traqué chaque lien pointant vers la page retirée.

Écartée aussi, en amont : **reporter la dépublication en post-V1** pour éviter toute la cascade de
liens. Défendable et honnête, mais laisse la cliente dépendante de l'agence pour un jugement
qu'elle sait parfaitement porter seule (retirer une offre saisonnière terminée).

### (3) Piège à ne pas désamorcer trop tard : toute récupération de stockage doit lire les DEUX états

Le produit n'offre en v1 aucun geste capable de libérer un octet en R2 (ni médiathèque, ni
suppression de fichier) : l'accumulation est **assumée**, et une récupération automatique est
reportée en post-V1. Le jour où elle sera écrite, elle heurtera ce modèle de plein fouet :

> **Un média absent du contenu `draft` peut être servi par le contenu `live`.** Une récupération qui
> ne regarderait que le contenu en cours effacerait une image **actuellement en ligne**, et ferait
> échouer la mise à jour suivante par `FR-055`.

C'est le premier mécanisme du produit qui détruirait du contenu irrécupérable ; il n'a pas été
construit en v1 pour cette raison, et il ne devra jamais l'être sans balayer les deux états.

### (4) Le scénario qui motive le verrou du § 5, point 1

`FR-092` (refus de l'écrasement silencieux) n'a **rien à voir avec le multi-éditeurs** — il n'y a
qu'une éditrice. Le scénario réel est : admin ouvert sur l'ordinateur le matin, repris sur le
téléphone le soir, onglet du matin réveillé le lendemain qui écrase tout d'un clic. Depuis
`FR-080` elle peut revenir au contenu **en ligne**, mais son brouillon du soir, lui, serait perdu
sans trace. Le PRD disait initialement « la dernière écriture gagne, sans avertissement », ce qui
contredisait frontalement la contrainte de verrou optimiste d'ADR-0004 : le code aurait porté le
verrou, le portail qualité l'aurait vérifié, et personne ne s'en serait servi.

### (5) Les deux amendements de PRD que cet ADR appelait sont faits

- Le **quatrième état** de `FR-019` (« retirée du site »), signalé au § 4 comme « à trancher », est
  **amendé au PRD** le 2026-08-01. La note du § 4 et la ligne correspondante des *Risques et
  vigilance* sont donc caduques.
- Le **déplacement du texte alternatif** vers la valeur de zone (§ 8) est porté par `stack.md`
  (`{ media_id, alt }`) et par les contraintes de `CLAUDE.md`.

---

## Amendement 2026-08-01 (c) — les clés, les octets, le cache et le jeton

Suites de l'[audit de sécurité du 1<sup>er</sup> août 2026](../audit-securite-2026-08-01.md)
(lot L4). La racine est [ADR-0011](./ADR-0011-frontieres-de-contenu-hostile.md), qui tient
l'entrée (schéma), le rendu (contexte déclaré) et le transport (en-têtes) ; ADR-0004 amendement
(c) en a tiré les conséquences dans le cœur. Restent quatre points dont **cet** ADR est le
document cible, parce qu'ils portent tous sur la même question : *ce qui, dans le modèle à deux
contenus, n'est écrit qu'à moitié*. Une contrainte sans son mécanisme (point 1), un invariant
énoncé sur les lignes et muet sur les octets (point 2), un geste d'éditrice sans délai (point 3),
un jeton dont la résolution dément la règle qu'il sert (point 4). Ils ferment `B-06`, `B-10`,
`C-13` et `D-03`.

### (1) D'où vient une clé naturelle, et pourquoi elle ne bouge plus *(B-06)*

Le § 2 pose que `field_key` est « stable entre les deux états et à travers les publications », et
le `## Constraints` en fait une obligation. Mais **rien ne dit d'où la clé vient**, quel jeu de
caractères elle admet, comment son unicité est tenue, ni ce qui arrive si elle change. La
contrainte est écrite, le mécanisme qui la tient ne l'est pas — et c'est le mécanisme qui décide.

**Charset fermé : `^[a-z][a-z0-9_]{0,63}$`.** Une clé naturelle traverse cinq contextes
d'échappement : l'attribut `name` du HTML bâti, le JSON de soumission, le corps du message
acheminé, la corbeille de l'admin et une clause `WHERE`. C'est une **entrée utilisateur
indirecte** — l'éditrice la fabrique en nommant un champ. Un charset fermé la rend inerte dans
les cinq d'un seul geste, ce qui est exactement la logique d'ADR-0011 § 2 : la neutralisation est
une propriété du **schéma**, pas de chacune des surfaces. Il exclut au passage `[`, `]` et `.`,
qui interagissent avec les conventions de désérialisation de formulaire (`champ[0]`,
`champ.sous`).

**Engendrée une seule fois, à la création du champ, puis immuable.** La clé est dérivée du
libellé par slugification **au moment où le champ naît**, et les deux se découplent aussitôt :
renommer « Prénom » en « Votre prénom » ne touche pas `prenom`. C'est ce qui rend `FR-090` et
`FR-091` vrais sur une soumission antérieure — sans quoi corriger une faute d'orthographe dans un
libellé publié rejetterait des soumissions légitimes et ferait calculer le total sur des champs
qui ne correspondent plus. Repli à nommer : une slugification qui produit la chaîne vide (libellé
entièrement hors alphabet latin) retombe sur une racine neutre — `champ`, `choix`, `zone` — sans
quoi l'ancre `^[a-z]` n'est pas tenable.

**Unicité par suffixe déterministe.** Deux libellés distincts produisent couramment la même
racine — « Prénom » et « prénom », « Taille (cm) » et « Taille (mm) ». La collision est résolue
par le premier suffixe libre (`_2`, `_3`, …), **jamais** par un tirage aléatoire ni par
l'horloge : le provisionnement doit rester rejouable à l'identique.

**La portée d'unicité est l'objet, les deux états réunis** — et non `(form_id, state)`, que la
clé primaire pourrait laisser croire. Le piège est propre au modèle à deux contenus : un champ
supprimé du `draft` puis recréé sous le même libellé reprendrait la clé d'un champ **encore vivant
en `live`**, et hériterait silencieusement de l'identité à laquelle les soumissions déjà reçues se
rapportent. L'unicité se vérifie donc sur l'union des clés des deux états.

**Rejet Zod strict à la lecture.** Les **deux** schémas exigés par ADR-0004 — `xxxRow` en sortie
D1, `xxxInput` en entrée — portent la même expression. Une ligne dont la clé ne la respecte pas
**rejette** ; elle n'est ni normalisée, ni tronquée, ni ignorée (ADR-0011 § 2). Une clé non
conforme en base signale une écriture qui n'est pas passée par le cœur : la refuser est la seule
réponse qui ne la propage pas dans les cinq contextes ci-dessus.

**Asymétrie de `zone_key`, à écrire pour qu'elle ne se devine pas.** Sa source n'est pas
l'éditrice mais le **descripteur de gabarit**, déclaré en code par l'intégrateur : ni
engendrement, ni suffixe de collision — le gabarit énumère ses zones et deux zones homonymes sont
une erreur de déclaration, pas une collision à résoudre. Mais **le même charset et le même rejet
à la lecture s'appliquent** : le contrat de gabarit n'est pas un chemin de confiance de plus, et
une `zone_key` arrive dans les mêmes attributs HTML que les autres. `option_key` suit `field_key`
en tout point, sa portée d'unicité étant `(form_id, field_key)`, les deux états réunis.

### (2) L'invariant du § 8 vaut pour les octets, pas seulement pour les lignes *(B-10)*

Le § 8 énonce « toute donnée rendue au visiteur provient d'un contenu `state='live'` », mais tout
ce qu'il en tire porte sur des **lignes D1** — sa conclusion est le déplacement de `media.alt`.
Lu ainsi, il laisse entière la question qui compte : une image est un **octet en R2**, persisté
**avant** tout enregistrement et toute publication (`FR-017`), et elle est rendue au visiteur
exactement au même titre qu'un texte.

**Extension de l'invariant.** Un octet servi au visiteur est un **dérivé produit au build à partir
d'un média référencé par un contenu `state='live'`**. La surface publique est donc *exactement*
l'image de l'ensemble des médias que le contenu en ligne référence — ni plus, ni moins. Un média
que seul un `draft` référence n'y a **aucun** dérivé : non pas comme effet de bord du build (qui
ne lit que `live`, et qui pourrait un jour lire autrement), mais comme **règle**.

**Ce que ce point ajoute à ADR-0004 (c) point 4, et ce qu'il n'y rejoue pas.** Le **transport**
est tranché là-bas : originaux servis depuis l'hôte non fiable sous la même politique Access,
bucket **jamais public**, `Content-Type` du type détecté, `nosniff`, `Content-Disposition`
normalisé. Cet amendement-ci n'y revient pas — ADR-0004 (c) point 4 renvoie d'ailleurs ici
nommément l'extension aux assets. Ce qu'ADR-0010 ajoute est le **critère de contenu** : non pas
« les originaux sont privés », mais « ce qui est public est exactement ce que le contenu en ligne
référence ». Les deux règles sont indépendantes et ni l'une ni l'autre ne rattrape le défaut de
l'autre — c'est la même discipline de barrières qu'ADR-0011 § 1.

**Le critère est une donnée, pas une inspection.** `content_references` (`FR-085`) est reconstruit
à partir du `live` à chaque publication ; savoir si un média est référencé par du contenu en ligne
se lit dans une table, cela ne se re-dérive pas au build. L'invariant est donc vérifiable, et pas
seulement énonçable.

**Ce que la dépublication ne défait pas.** Un dérivé déjà produit reste en R2 par conception
(`FR-093`) : dépublier ne détruit aucun octet. C'est le point (3). Rappel sans le répéter :
l'amendement (b) point (3) impose que **toute** récupération de stockage lise les deux états — la
règle posée ici est ce qui la rend nécessaire, pas ce qui la remplace.

### (3) Ce que « retirer du site » garantit, et dans quel délai *(C-13)*

`FR-035` décrit l'état du **build** ; le visiteur, lui, reçoit ce que le CDN sert. Entre les deux,
aucun document ne disait rien — ni invalidation, ni durée de fraîcheur. L'éditrice qui « retire du
site » (`FR-083`) croit retirer du public ; l'écart n'était pas borné.

**Décision : le retrait est soumis au même délai que la publication** — moins de 5 minutes,
`FR-036` et `SC-004`, porté par le nouveau **`FR-111`**. La symétrie n'est pas une élégance : la
dépublication emprunte déjà le même pipeline (bascule `en_ligne`, Deploy Hook, `site_build_state`),
donc la même mesure s'y applique sans rien construire. Un geste que le produit offre est un geste
dont le produit répond.

**Conséquence sur le cache.** La durée de fraîcheur du **HTML** est bornée par ce délai, ou une
purge explicite l'accompagne. Servir le HTML d'une page avec un cache plus long que le délai, sans
purge, rendrait `FR-111` faux quel que soit le comportement du build. Les assets **hachés** ne sont
pas concernés : leur nom change avec leur contenu, un cache long y est sûr par construction. Le
délai est normatif ; le moyen de le tenir — TTL court ou purge — ne l'est pas.

**Le sort des dérivés est un renoncement, borné et écrit.** Un dérivé d'image n'est **pas**
supprimé à la dépublication. Le supprimer contredirait `FR-093` (le retraitement incrémental vit
de leur persistance) et exigerait un comptage de références sur les deux états — précisément le
mécanisme que l'amendement (b) point (3) reporte en post-V1, parce que c'est le premier du produit
qui détruirait du contenu irrécupérable. La frontière est donc à nommer sans détour :

> **Ce que la dépublication garantit est la disparition de la surface publique navigable, pas
> l'irrésolvabilité d'une adresse déjà connue.** Un dérivé dont quelqu'un détient l'URL reste
> résolvable ; plus aucune page servie ne le désigne. La clé en UUID est une atténuation, pas un
> contrôle d'accès.

C'est tenable pour ce que `FR-083` sert réellement — retirer une offre saisonnière terminée — et
ça ne l'est pas pour un retrait exigé par un tiers. Voir *Seuils qui feraient reconsidérer*.

### (4) Le jeton de verrou doit être exact, pas approximativement frais *(D-03)*

Le § 5 point 1 fait vérifier le jeton de verrou (`FR-092`) avant toute écriture, et le DDL de
`stack.md` en faisait `updated_at TEXT DEFAULT (datetime('now'))`. Or `datetime('now')` a une
résolution d'**une seconde** : deux écritures dans la même seconde produisent le même jeton, et
l'`UPDATE … WHERE updated_at = ?` **réussit** là où la décision exige qu'il refuse.

**Ce qui rend le défaut piégeux n'est pas son risque métier, c'est son effet sur la preuve.** Le
scénario réel du point (4) de l'amendement (b) — l'onglet du matin réveillé le lendemain — se joue
à quelques heures d'écart et n'est **jamais** affecté. Seul le test l'est : la cible « refus
d'écrasement concurrent » d'ADR-0005 écrit deux fois de suite, donc dans la même seconde, et
échoue par intermittence. Un test qui échoue une fois sur N est désactivé ou marqué instable, et
la protection perd sa preuve tout en restant réputée tenue. C'est **pire qu'absente** : une
contrainte qu'aucune vérification ne mord finit par n'être appliquée par rien, ce que le corpus
sait déjà (ADR-0002, et le constat racine de l'audit).

**Décision : le jeton est un compteur entier.** Les tables d'identité qui portent le verrou —
`pages`, `forms` — reçoivent `version INTEGER NOT NULL DEFAULT 1`, incrémentée à chaque écriture ;
le verrou compare `version`, jamais un horodatage. Le jeton devient **exact par construction** :
aucune collision n'est concevable, quelle que soit la résolution de l'horloge. `updated_at` cesse
de porter deux rôles et redevient ce que son nom dit — un horodatage d'affichage.

**Alternative écartée**, parce qu'elle était la réponse la plus courte :
`strftime('%Y-%m-%dT%H:%M:%fZ','now')` porte la résolution à la milliseconde, ne change qu'une
ligne de DDL et conserve le double usage de la colonne. Mais c'est une **réduction de
probabilité**, pas une élimination — et pour une règle dont l'unique preuve est un test
déterministe, l'exactitude vaut mieux que l'économie d'une colonne.

La forme du geste ne change pas : `createRepository` (ADR-0004 § d) reste l'unique porteur du
verrou, et la publication le vérifie **avant** toute écriture. Seul le jeton change.

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
- *(2026-08-01, amendement (c) point 3)* Si un **retrait exigé par un tiers** entrait au périmètre — droit à l'effacement, retrait d'une photo sur demande —, la frontière « surface publique navigable, pas irrésolvabilité d'une adresse connue » ne suffirait plus. Il faudrait alors la récupération de stockage reportée en post-V1 (amendement (b) point 3), avec son balayage des deux états, et ce serait le premier mécanisme du produit à détruire du contenu irrécupérable.

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
- **OBLIGATOIRE** *(2026-08-01)* : `zone_key`, `field_key` et `option_key` respectent `^[a-z][a-z0-9_]{0,63}$` ; une clé de formulaire est **engendrée une seule fois** à la création du champ ou du choix, puis **immuable** — **INTERDIT** de la re-dériver d'un libellé modifié.
- **OBLIGATOIRE** *(2026-08-01)* : l'unicité d'une clé naturelle est vérifiée sur l'objet, **les deux états réunis**, et une collision est résolue par un **suffixe déterministe** ; **INTERDIT** un suffixe aléatoire ou dérivé de l'horloge.
- **OBLIGATOIRE** *(2026-08-01)* : les deux schémas Zod (entrée et sortie D1) valident la clé contre cette expression ; une ligne dont la clé ne la respecte pas **rejette** — **INTERDIT** de la normaliser, de la tronquer ou de l'ignorer à la lecture.
- **OBLIGATOIRE** *(2026-08-01)* : tout octet servi au visiteur est un dérivé d'un média référencé par un contenu `state='live'` ; **INTERDIT** d'exposer sur une surface publique un média original, ou le dérivé d'un média que seul un contenu `state='draft'` référence.
- **OBLIGATOIRE** *(2026-08-01)* : le retrait d'une page (`FR-083`) est reflété par le site servi au visiteur dans le délai de `FR-036` ; **INTERDIT** de servir le HTML d'une page avec une durée de fraîcheur supérieure à ce délai sans purge explicite.
- **OBLIGATOIRE** *(2026-08-01)* : le jeton de verrou optimiste est un **compteur entier** (`version`) incrémenté à chaque écriture ; **INTERDIT** d'employer comme jeton un horodatage de résolution à la seconde — `datetime('now')` n'en est pas un.

## Related

- Impose : `FR-078`, `FR-079`, `FR-080`, `FR-081`, `FR-082`, `FR-083`, `FR-047`, `FR-073`, `FR-019`, `FR-038`, `FR-111` *(2026-08-01)*.
- Sert : `SC-003` (enregistrer sans conséquence publique), `SC-004` (publication granulaire, et **retrait** depuis l'amendement (c)), `SC-007` (définition publiée stable).
- Amende, par ricochet : ADR-0004 (modèle de données, contrat de gabarit, index de références), ADR-0007 (définition publiée, bornes de champ nombre), ADR-0005 (nouvelles cibles de test).
- Complète, sans les rejouer *(2026-08-01)* : **ADR-0011** (la neutralisation est une propriété du schéma d'entrée — le charset fermé d'une clé naturelle en est une application) et **ADR-0004** amendement (c) point 4 (le transport d'un média hors build ; l'amendement (c) d'ici en porte le **critère de contenu**).
- Exploité par : ADR-0008 — une rupture de ce modèle est une **majeure** SemVer.
- Origine : revue contradictoire du PRD du 2026-08-01 (décisions D1, D2, D3, D5, D13, reprises à l'amendement (b)) ; [docs/prd.md](../prd.md).
