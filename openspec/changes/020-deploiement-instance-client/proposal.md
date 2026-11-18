## Why

Aucune instance ne tourne ailleurs que sur le compte d'Isometria. Le serveur de recette est monté
par un outillage écrit pour ce compte ; la première adresse autorisée s'y sème par une requête
manuelle ; rien ne dit dans quel ordre, ni au nom de qui, créer les objets d'une instance. Or la
promesse du produit tient à une topologie : tout appartient au client, et le retrait d'Isometria ne
casse rien. Tant que cette topologie n'est ni décrite, ni outillée, ni éprouvée, rien ne peut entrer
en production (SC-002).

Sert l'**Epic D — Flotte & réversibilité**, story « Déployer une instance au nom du client »
(`docs/roadmap.md`) ; couvre **FR-098 à FR-104** et se prouve par **SC-001**, **SC-012** et
**SC-013** (`docs/vision.md`). Solde aussi deux gestes que des ADR acceptés ont mis à la charge de
la livraison : le maintien en vie de la clé d'écriture (ADR-0021) et la création du moyen de reprise
par l'éditrice (ADR-0032, FR-009).

## What Changes

- **Une seule chose diffère d'une instance à l'autre : le fichier d'instance et le contenu**
  (FR-104). Le domaine servi est **dérivé** de `instance.json` à la construction ; la base se
  rattache par son nom, le même partout. Les fichiers de configuration versionnés restent identiques
  d'un client à l'autre et ne portent toujours aucun identifiant.
- **Le fichier d'instance est contrôlé.** Il n'admet que des champs connus : la construction s'arrête
  sur un champ inconnu, ce qui ferme la porte à un secret glissé là. Le champ mort
  `turnstilePublicKey` est retiré (ADR-0028). Un **contrôle d'instance**, à lancer avant la mise en
  service, refuse en plus une instance incomplète, une valeur d'exemple restée en place, et tout
  identifiant de l'intégrateur qu'on lui désigne (FR-098).
- **La mise en ligne est une commande unique, la même partout**, jouée dans le compte Cloudflare du
  client à chaque changement du dépôt du client : elle met la base au niveau de la version, puis
  déploie. Une base neuve et une base existante passent par le même chemin (FR-102, FR-104).
- **Un outil de livraison** remplace le savoir oral : préparer le dépôt du client depuis une version
  du produit, créer la base, semer la **première adresse autorisée** (une seule fois, jamais en
  remplacement), produire l'**inventaire de livraison**.
- **Une procédure de livraison** écrite (`docs/livraison.md`) donne l'ordre des gestes et, pour
  chacun, **dans la session de qui** il se fait. Sa règle centrale : tout objet attaché à une
  identité (clé du dépôt, clé des adresses, clé de construction, raccordement du dépôt à la
  construction) naît dans une session **du client**, jamais dans celle de
  l'intégrateur. Les faits de plateforme relevés le 2026-11-15 l'imposent : un objet créé par un
  membre cesse de fonctionner quand ce membre est retiré.
- **L'inventaire de livraison** liste chaque liaison et chaque identifiant de l'instance, avec son
  lieu et le nom au titre duquel il existe, **sans aucune valeur**, et rien sur le moyen de reprise
  (SC-013, FR-011). Il nomme aussi chaque personne qui a accès aux comptes, et désigne celles à
  retirer.
- **La clé d'écriture est maintenue en vie sans geste** : chaque semaine, l'instance fait un appel
  anodin au dépôt du client, et laisse une trace datée dans les journaux de la plateforme. C'est la
  décision de l'ADR-0021, jamais réalisée. Sans elle, une instance où l'on ne publie pas pendant un
  an perd sa clé, donc la publication (FR-101).
- **L'épreuve de révocation** entre au cahier de recette : sur une instance montée hors des comptes
  de l'opérateur, on retire tous les accès de l'intégrateur, puis on constate que le site est servi,
  que l'administration s'ouvre et qu'une publication aboutit jusqu'en ligne (SC-012). On constate au
  même endroit l'absence de moyen de paiement (SC-001).
- **Le geste de l'éditrice à la livraison** est inscrit dans la procédure : elle ouvre sa session par
  l'adresse autorisée, crée son code de secours et le note (ADR-0032). L'écran existe déjà ; aucun
  écran n'est ajouté.

## Points tranchés, à confirmer avant les tickets

Rédigé sans l'humain (nuit du 2026-11-15), puis relu par un agent en contexte frais, dont les six
objections bloquantes sont intégrées. Chaque point porte ma recommandation et son repli ; le détail
est dans `design.md` § Decisions.

1. **La base n'a d'identifiant nulle part ; seul le domaine est dérivé de `instance.json`** (D3).
   L'outil de déploiement retrouve la base par son nom (lu dans son code, version du verrou). Les
   fichiers `wrangler` restent ceux du produit et l'ADR-0005 n'est pas touché. *Constaté le
   2026-11-16 sur le compte de recette* (`constats/01-base-rattachee-par-son-nom.md`).
2. **La mise à niveau de la base est jouée par la construction, dans le compte du client** (D4), et
   non depuis le poste de l'intégrateur. *Constaté le 2026-11-18 sur la recette* : la clé que la
   construction crée par défaut suffit, et une mise à niveau en échec ne déploie rien
   (`constats/02-construction-dans-le-compte.md`).
3. **Dépôt du client privé, et une seule clé du dépôt, posée au seul Worker** (D1). *Constaté le
   2026-11-18* : la construction atteint les images sans aucune clé. C'est un écart avec le candidat
   `cible-de-deploiement-worker-unique-workers-builds`, qui prévoyait une clé de lecture.
4. **La première épreuve de révocation se joue en répétition, avant le premier client** (D10) —
   *arbitré le 2026-11-16*. L'envoi d'e-mails exige un nom de domaine géré par le DNS Cloudflare du
   compte ; l'humain dispose d'un nom de domaine qui servira à deux comptes témoins, distincts de
   ceux de l'opérateur.
5. **Le nom de domaine est un prérequis du client, hors de SC-001** — *arbitré le 2026-11-16*. Il
   est acheté par le client hors du compte Cloudflare, pour qu'aucun moyen de paiement n'y soit
   enregistré.
6. **La clé d'écriture se crée sans expiration** (ADR-0021) — *arbitré le 2026-11-16*.
   `docs/security.md` disait qu'elle expire ; sa consigne est corrigée le même jour, hors du change.

## Capabilities

### New Capabilities

- `configuration-d-instance` : le fichier d'instance comme seule différence entre deux instances ;
  ses champs connus, obligatoires pour une mise en service ; l'arrêt de la construction sur un champ
  inconnu ou mal formé ; la configuration de déploiement dérivée ; le contrôle d'instance (complétude,
  valeurs d'exemple, identifiants désignés de l'intégrateur, aucun secret).
- `livraison-d-instance` : la préparation du dépôt du client ; la mise en ligne par une commande
  unique qui met la base à niveau ; le premier semis de l'adresse autorisée ; l'inventaire de
  livraison ; la gratuité ; la survie de l'instance au retrait des accès de l'intégrateur.

### Modified Capabilities

- `publication` : une exigence ajoutée, « La clé d'écriture est maintenue en vie » — l'appel
  hebdomadaire au dépôt et sa trace.

## Impact

- **Code** : un module de lecture et de contrôle du fichier d'instance dans `src/platform/instance/`,
  employé par `astro.config.ts` ; un script de dérivation joué après la construction ; un script
  `scripts/livraison.mjs` (dépôt, base, semis, contrôle, inventaire) ; un point d'entrée programmé du
  Worker et son appel au dépôt dans `src/platform/publication/` ; une commande `mise-en-ligne` dans
  `package.json`.
- **Configuration** : `instance.json` perd `turnstilePublicKey` et ne gagne rien ;
  `wrangler.astro.jsonc` et `wrangler.jsonc` gagnent un déclencheur hebdomadaire, identique partout.
  Aucun secret nouveau côté Worker, et aucun secret de construction.
- **Recette** : l'outillage de recette (`.claude/skills/recette/`) reprend le mécanisme du produit au
  lieu de réécrire les fichiers `wrangler` ; une section « Livraison » au `docs/cahier-de-test.md`.
- **Documentation** : `docs/livraison.md` (procédure) ; correction des passages périmés du cahier
  relevés pendant l'inventaire (nombre de migrations, `destination_address`).
- **Architecture** : un environnement de déploiement « comptes du client » dans
  `docs/architecture/deployment.c4` ; dans `context.c4`, la construction qui met la base à niveau,
  les accès révocables de l'intégrateur, et le point d'entrée programmé.
- **ADR** : **ADR-0034** (valeurs d'instance, domaine dérivé, base rattachée par son nom ; promeut
  `I8`, retire `I10`, crée `I19`, sans toucher à l'ADR-0005) et **ADR-0035** (cible de déploiement et
  règle des identités ; promeut le candidat `cible-de-deploiement-worker-unique-workers-builds`,
  amendé), posés le 2026-11-18.
- **Hors périmètre** : faire passer une instance existante à une nouvelle version et en prouver
  l'absence de perte (FR-105, FR-106, SC-008) ; la reconstruction sans le CMS (FR-107→109, SC-011) ;
  le dossier d'instance et son dépôt chez le client (FR-110→116, FR-119, SC-014), qui recevra
  l'inventaire produit ici ; le réamorçage de l'adresse autorisée sur une instance en service
  (FR-119) ; la détection d'une panne d'acheminement (DAT-2) ; tout écran nouveau.
