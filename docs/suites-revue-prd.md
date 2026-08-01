# Suites de la revue du PRD — 2026-08-01

| | |
|---|---|
| **Statut** | traité |
| **Créé** | 2026-08-01 |
| **Origine** | revue contradictoire de [docs/prd.md](./prd.md) |
| **Porte sur** | [docs/stack.md](./stack.md), [docs/adr/](./adr/README.md) |

> **Ce document est autoportant.** Il contient le contexte, les décisions et leurs motifs, puis le reste-à-faire. Il est écrit pour être repris sans mémoire de la conversation qui l'a produit. Il s'éteint quand tout est traité.

---

# Suivi d'avancement

> **À lire en premier en rouvrant ce document.** Les cases à cocher des parties III font foi ; ce tableau les résume.

## Prochaine action

**Les 41 items sont traités. Ce document est éteint** — il ne reste qu'à le supprimer, conformément à sa clôture. Ses décisions vivent désormais dans les ADR, `docs/prd.md`, `docs/stack.md` et `CLAUDE.md` ; la partie II a fait son travail, qui était d'éviter qu'un débat tranché ne se rouvre entre deux sessions.

Le prochain geste n'est plus documentaire : **ouvrir le socle P1** (édition, médias, publication) par `/scd-sdd:kickoff-feature`, le constructeur de formulaires (P2) venant après, conformément au rappel de séquencement du PRD.

## Tableau de bord

| § | Chantier | Faits | Total | État | Bloqué par |
|---|---|---|---|---|---|
| **1** | Gouvernance — ADR | 5 | 5 | **fait** | — |
| **2a** | `stack.md` — modèle de données | 5 | 5 | **fait** | — |
| **2b** | `stack.md` — formes de `value_json` | 5 | 5 | **fait** | — |
| **2c** | `stack.md` — surfaces nouvelles | 11 | 11 | **fait** | — |
| **3** | Vérifications factuelles | 5 | 5 | **fait** | — |
| **4** | Décisions restant à prendre | 6 | 6 | **fait** | — |
| **6** | En suspens | 4 | 4 | **fait** | — *(dont un `sans objet` : migré dans `stack.md`)* |
| | **Total** | **41** | **41** | | |

*(Total passé de 33 à 41 : le § 2b gagne un item — déplacement du texte alternatif —, le § 4 en gagne trois, et le § 6 en ouvre quatre. La durée de session ne se coche qu'au § 4 ; le § 6 la rappelle sans case, pour qu'un item n'existe jamais à deux endroits. Aucun item d'origine n'a été supprimé.)*

**États possibles** : `à faire` · `en cours` · `fait` · `bloqué` (préciser par quoi) · `sans objet` (préciser pourquoi).

## Comment tenir ce suivi

1. Cocher la case dans la partie III — **c'est elle qui fait foi**.
2. Mettre à jour la ligne correspondante du tableau (compteur + état).
3. Ajouter une ligne à l'historique ci-dessous, **datée**, une phrase.
4. Rafraîchir « Prochaine action » si elle a changé.

Un item qui devient **sans objet** n'est pas supprimé : il est coché avec le motif en note. Un item qui se révèle plus gros que prévu est **scindé** sur place, et le total du tableau ajusté.

Ce suivi porte l'**état**. Les **événements** du cycle (verdicts de gate, lots implémentés, PR) relèvent de `docs/JOURNAL.md`, à créer au premier `/scd-sdd:` joué — ne pas les consigner ici.

## Historique

| Date | Fait |
|---|---|
| 2026-08-01 | Revue contradictoire du PRD ; `docs/prd.md` réécrit (19 exigences nouvelles, 28 amendées) ; ce document créé. Aucun item du reste-à-faire entamé. |
| 2026-08-01 | **ADR-0010 rédigé puis accepté** : discriminant `state`, recopie synchrone avant le Deploy Hook, référence ≠ copie, rien de public hors des deux contenus. Index et graphe d'ADR mis à jour. |
| 2026-08-01 | **§ 3 clos, 5/5.** L'issue de build et l'accès D1 au build sont tranchés et favorables ; le HEIC se résout par l'attribut `accept`. **L'envoi sortant ne tient pas** : pas de destinataire quelconque sur l'offre gratuite Cloudflare — `FR-095` contre `SC-001`. Décision portée au § 4. |
| 2026-08-01 | **Quatre décisions humaines prises** : ADR-0010 accepté ; acheminement basculé sur **Resend** ; PRD passé à `accepted` ; **maximum obligatoire** pour un champ nombre (renversement du défaut). |
| 2026-08-01 | **§ 1 clos, 5/5.** ADR-0004, 0007, 0005 et 0003 amendés. ADR-0007 porte un **renversement** (Resend remplace Cloudflare Email Routing) et une **nuance** (le calcul navigateur reste, seul le total acheminé est recalculé). |
| 2026-08-01 | **§ 2 clos, 21/21.** `stack.md` réécrit : modèle de données selon ADR-0010, formes de `value_json`, onze surfaces nouvelles. Trois tables non prévues sont apparues — `page_meta`, `publications`, `media_derivatives`. |
| 2026-08-01 | **§ 4 : 5/6.** PRD amendé (`FR-019` quatrième état, `FR-045` maximum obligatoire, `FR-046` adresse confirmée) et passé à `accepted`. `CLAUDE.md` porte les contraintes d'ADR-0010. **Reste la durée de session et la révocation d'accès.** |
| 2026-08-01 | **§ 6 « En suspens » ouvert** (4 items) : ADR-0008 à amender, statut de `stack.md`, minimum de `FR-045` à confirmer, signal de quota. Total 41, dont 36 faits. Le chantier documentaire est clos ; le prochain geste est `/scd-sdd:kickoff-feature` sur le socle P1. |
| 2026-08-01 | **§ 4 clos, 6/6.** Durée de session **7 jours** (niveau application), révocation en **deux gestes** (retrait de politique *puis* révocation), jeton Builds sur un **membre de compte non nominatif**. Une **brèche non vue par la revue** est apparue : Access protège un nom d'hôte, donc `*.workers.dev` et les *preview URLs* contournaient `FR-001` — `workers_dev: false` et `preview_urls: false` deviennent obligatoires. ADR-0003 amendé (b), `stack.md` et `CLAUDE.md` alignés. **Ne restent que les 4 items du § 6.** |
| 2026-08-01 | **Renversement du renversement — l'acheminement revient à Cloudflare Email Service.** Décision humaine : aucune dépendance hors écosystème. **`FR-095` retirée de la v1** (conséquence forcée : le visiteur n'est pas un destinataire vérifiable) et **`Reply-To` de `FR-061` abandonné** (choix distinct, non contraint). ADR-0007 amendement (b), PRD, `stack.md`, ADR-0005 et `CLAUDE.md` alignés. Effet secondaire : la question du domaine d'envoi **s'éteint**, ce qui débloque ADR-0008. |
| 2026-08-01 | **Le filet de D18 est reconstitué du côté de l'éditrice** — trois exigences nouvelles hors périmètre de la revue : `FR-097` (consulter une demande non acheminée), `FR-098` (la relancer), `FR-099` (l'effacer), plus `FR-094` amendée (motif) et `FR-064` amendée (rétention ouverte, expiration inconditionnelle). La table est renommée `undelivered_submissions` et gagne `failure_reason` ; `expires_at` passe à un défaut de 30 jours. **Ce n'est pas une base de prospects** : seuls les échecs y entrent, on n'en sort que pour disparaître, et aucune recherche n'est offerte — invariant porté en cible de test nommée (ADR-0005). Prix écrit : conservation de données personnelles allongée, à annoncer dans la mention d'information. ADR-0007 amendement (c). |
| 2026-08-01 | **§ 6 clos, 4/4 — les 41 items sont traités, le document s'éteint.** `stack.md` passe à **`accepted`** (plus rien de spéculatif ; une confrontation au code produira des amendements datés, pas un retour en `Draft`). Le **minimum de `FR-045` est confirmé à 0** sans modification — aucun cas légitime de quantité négative sur un devis. Le **signal de quota de build** est déclaré **sans objet ici et migré** dans les questions ouvertes de `stack.md`, son lieu durable : il ne se constate qu'en production, et aucun geste documentaire ne pouvait le fermer. Statut du document → `traité`. |
| 2026-08-01 | **§ 6 : 1/4.** **ADR-0008 amendé** — entrée et sortie d'une instance : jeu de pages provisionné (jamais migré) et sans incidence SemVer, liste de provisionnement explicitée, sortie d'une personne en deux gestes, jeton Builds non nominatif, question du domaine d'envoi consignée comme éteinte. Cinq contraintes ajoutées. **Ne restent que trois items, tous des confirmations ou des constats.** |

## Clôture

Ce document **s'est éteint le 2026-08-01** : les 41 items sont traités, son statut est passé à `traité`, et la vérification prescrite est faite — `stack.md` et les ADR portent les décisions de la partie II *(voir la table de correspondance ci-dessous)*. **Il ne reste qu'à le supprimer** : la partie II a migré dans les ADR, qui sont le lieu durable des décisions d'architecture (ADR-0001), et un document de suivi qui survit à son objet redevient une source de vérité concurrente.

### Vérification de clôture — où vit chaque décision de la partie II

| Décisions | Lieu durable |
|---|---|
| D1, D2, D3 *(état)*, D7 *(les deux instantanés)* | [ADR-0010](./adr/ADR-0010-modele-brouillon-publie.md) + `FR-078`→`FR-081`, `FR-019` |
| D4, D5, D14, D16 | [ADR-0004](./adr/ADR-0004-architecture-du-code.md) §h/§i + `docs/stack.md` (index de références, zone formulaire, dérivés R2) |
| D10, D15, D18 | [ADR-0007](./adr/ADR-0007-constructeur-de-formulaires.md) amendements (a), (b), (c) |
| D6, D8, D9, D11 | [ADR-0003](./adr/ADR-0003-socle-technique.md) amendements (a) et (b) + `docs/stack.md` |
| D13 *(verrou)*, cibles de test de D1/D10 | [ADR-0005](./adr/ADR-0005-strategie-de-test.md) `Constraints` |
| Entrée et sortie d'une instance, provisionnement | [ADR-0008](./adr/ADR-0008-mise-a-jour-de-la-flotte.md) amendement 2026-08-01 |
| D12, D17, déplacements de périmètre | [docs/prd.md](./prd.md) (NON inclus, Pistes post-V1) |
| Le sous-ensemble impératif de tout ce qui précède | [CLAUDE.md](../CLAUDE.md) « Contraintes actives » |

*Ce qui ne migre pas, et qui disparaît avec ce fichier : les **motifs d'écarter** les options non retenues, quand l'ADR ne les a pas repris. Le coût est assumé — c'est précisément la fonction des sections « Alternatives » des ADR de retenir ce qui méritait de survivre.*

---

# Partie I — Reprendre à froid

## Ce qui s'est passé

Le 1<sup>er</sup> août 2026, [docs/prd.md](./prd.md) a subi une **revue contradictoire** : quinze passes cherchant les contradictions internes, les exigences sans destinataire, et les promesses produit qu'aucune exigence ne portait. Une trentaine de décisions ont été prises, puis le PRD a été **réécrit**.

Il en ressort **19 exigences nouvelles** (`FR-078` → `FR-096`) et **28 amendées**. Le PRD est passé de 77 à 96 exigences.

Trois décisions structurantes portent l'essentiel de l'aval :

- **`FR-078` — deux contenus par page** (en cours / en ligne), étendu aux formulaires et aux réglages. **Invalide le modèle de données de la stack.**
- **`FR-085` — index des références** entre pages, formulaires et liens. Surface entièrement nouvelle.
- **`FR-089` — aucun code tiers avant action explicite du visiteur.** Contraint l'anti-spam et la vidéo, et ferme la porte à toute mesure d'audience embarquée.

## État exact du dépôt

- **Aucun code produit n'existe.** Ni `apps/`, ni `packages/`. Le dépôt contient `tooling/quality-gate/` (le portail de vérification, seule feature implémentée) et `specs/001-ci-quality-gate/`. Tout ce qui suit est donc à **construire**, jamais à migrer — aucune donnée en production, aucune contrainte de rétrocompatibilité.
- **Tout est commité** sur la branche `work/reprise-zero` *(état au 2026-08-01, après la fermeture du § 4 et l'amendement d'ADR-0008)*. `docs/prd.md`, `docs/stack.md`, `CLAUDE.md` et les ADR 0003, 0005, 0007, 0008, 0010 portent les décisions de la partie II ; il n'y a **pas de travail en cours non enregistré**.
  *(Énoncé d'origine, conservé pour la lecture de l'historique : « Modifié, non commité : `docs/prd.md` (réécrit), `docs/suites-revue-prd.md` (ce fichier) » ; « Délibérément non touchés : `docs/stack.md` et `docs/adr/` — les mélanger à la réécriture du PRD aurait produit une PR illisible ». Les deux sont désormais faux : la partie III les a traités.)*
- **Le PRD et `stack.md` sont tous deux `accepted`** — l'écart, un temps délibéré, a été refermé le 2026-08-01 (§ 6). *(Énoncé d'origine : « Le PRD est `accepted`, `stack.md` reste `Draft` ».)*
- **La numérotation des exigences va jusqu'à `FR-099`.** Le PRD en compte 96 issues de la revue (`FR-078` → `FR-096`) plus trois postérieures (`FR-097` → `FR-099`, la corbeille de courrier non distribué). `FR-095` existe mais est **retirée de la v1** : son numéro n'est pas réattribué.

## Faits établis sur le dépôt (vérifiés, pour éviter de les re-chercher)

- **`specs/001-ci-quality-gate/` utilise sa propre numérotation `FR-001…FR-030`**, locale à la feature, **sans aucun rapport** avec les `FR-xxx` du PRD. Les deux jeux se recouvrent sur la plage 001–030 : le risque de confusion est réel et permanent.
- **Le numéro d'ADR 0009 est déjà réservé** par `docs/adr/_candidates/0009-portail-qualite-draft.md`. Le prochain libre est **0010**.
- **Le contrôle `lint-format` du portail qualité ne couvre que `.ts` / `.tsx`** (`listerFichiersSource` filtre sur `/\.tsx?$/`). Le Markdown est hors périmètre : `brief.md`, `stack.md` et `prd.md` ne sont pas conformes à Prettier, et n'ont pas à l'être. **Ne pas les reformater.**
- Le hook `golden-lock` refuse toute commande shell contenant `-u` ou `--update` — y compris un `sort -u` inoffensif. Contourner avec `sort | uniq`.
- **`pnpm gate` ne s'exécute pas tel quel dans un shell non interactif** (constaté le 2026-08-01) : `pnpm` veut purger `node_modules` et exige un TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Forcer avec `CI=true` **supprime le répertoire d'installation** — à ne pas faire à la légère. Sans objet pour une modification purement Markdown, qui est hors du périmètre du portail (voir le point précédent), mais bloquant dès qu'il y aura du `.ts` à vérifier.

---

# Partie II — Les décisions de la revue, et pourquoi

> Cette partie existe pour **ne pas rouvrir des débats tranchés**. Chaque entrée donne le défaut trouvé, la décision, et ce qui a été écarté. Les exigences citées sont dans le PRD ; les motifs, eux, ne vivent que là.

## D1 — Une page porte deux contenus *(la décision mère)*

**Le défaut.** `FR-019` posait un état **au niveau page** (brouillon / publiée). Or US4-3 exigeait qu'une page **publiée** dont l'éditrice enregistre une modification sans publier continue d'afficher la version précédente. Une page publiée portant des modifications enregistrées est simultanément dans les deux états — `FR-019` n'avait pas de case pour elle. Pire : le modèle de la stack (`page_zone_values`, une seule valeur par `(page_id, zone_key)`) fait qu'enregistrer **écrase**, et le build étant **global**, publier *n'importe quelle* page mettait en ligne *toutes* les modifications enregistrées ailleurs. US4-3, `FR-035` et `FR-037` étaient faux dès qu'une deuxième page était publiée. Et le geste le plus naturel d'une non-technicienne — enregistrer pour reprendre demain — devenait une publication accidentelle.

**Décidé.** Deux instantanés par page : le **contenu en cours** (édité) et le **contenu en ligne** (figé à la dernière publication). Le build ne lit que le second. Même mécanique pour formulaires et réglages. → `FR-078`, `FR-019` réécrit en trois états.

**Écarté.** *Un seul contenu, « publier » = mettre en ligne l'état enregistré du site entier* : modèle trivial, mais US4-3 devait disparaître et « Enregistrer » devenait une demi-publication — inacceptable pour SC-003. *Un seul contenu, filtré par comparaison de dates* : une page publiée puis modifiée aurait disparu du site au build suivant.

## D2 — Ce que D1 impose comme surface

**Le défaut.** Sous D1, trois gestes manquaient. *(1)* `FR-006` ne listait que les pages : rien ne disait lesquelles portaient des modifications non publiées — elle ne pouvait pas répondre à « qu'est-ce qu'il me reste à mettre en ligne ? ». *(2)* L'historique des versions étant **exclu**, elle n'avait **aucun** retour arrière : un texte massacré puis enregistré était perdu, alors que le contenu publié est physiquement là, à côté. *(3)* `FR-034` ne donnait « publier » qu'à une page : ses liens Instagram modifiés n'avaient littéralement aucun moyen d'arriver en ligne.

**Décidé.** → `FR-079` (signalement dans la liste), `FR-080` (abandon → retour au contenu en ligne), `FR-081` (publication explicite des formulaires et réglages).

**Objection considérée.** `FR-080` ouvrirait-il l'historique par la bande ? Non : un seul pas en arrière, sans liste, sans dates, sans restauration sélective.

## D3 — Existence et présence en ligne d'une page

**Le défaut.** *(1)* `FR-009` et `FR-010` **interdisaient** à l'éditrice de créer et supprimer, mais **aucune exigence ne décrivait le geste positif** : un agent d'implémentation se serait retrouvé face à un site sans page, et SC-002 était inatteignable par construction. *(2)* Elle pouvait publier, **jamais dépublier** : ne pouvant pas non plus supprimer, elle n'avait aucun moyen de retirer une offre saisonnière terminée — pour un jugement qu'elle est parfaitement capable de porter seule.

**Décidé.** → `FR-082` (jeu de pages défini par l'intégrateur hors espace d'édition ; la page apparaît « jamais publiée », zones vides — ce qui s'articule avec `FR-053` : vide donc bloquée, donc elle est guidée vers ce qu'il faut remplir). → `FR-083` (dépublication ; contenu conservé). → `FR-035` précisé : une page non publiée **n'est pas bâtie**, son adresse ne répond pas, aucune redirection n'est fabriquée.

**Déplacement de périmètre.** La **création de page par l'éditrice** quitte « NON inclus » (frontière ferme) pour les **Pistes post-V1**. Motif : c'est la première chose qu'un client réel réclamera (« Collection Noël », « Ateliers »), et le brief dit lui-même que chaque exclusion est réversible quand un client la demande. Le motif d'exclusion (adresses, menu, pages orphelines) reste valable pour la v1 — mais ce n'est pas une frontière de principe. La **suppression** reste exclue.

## D4 — La cascade des liens *(le vrai coût de D3)*

**Le défaut.** Une page dépubliée ne disparaît pas seule : le **menu** la référence, un **CTA** peut pointer dessus, un **lien en texte riche** aussi. Et le problème **préexistait à la dépublication** : une page provisionnée mais **jamais publiée** est déjà référencée par le menu figé de l'intégrateur — `FR-035` était donc déjà violé par le menu.

**Décidé — « niveau 2 ».** → `FR-084` : le menu reste **figé par l'intégrateur** (il ne devient pas éditable), il devient **filtré** sur les pages publiées ; quasi gratuit, le build connaît déjà l'état. → `FR-015` et `FR-070` : la destination d'un lien est **choisie** entre « une page du site » et « une adresse externe ». *Ce changement se justifie seul, indépendamment de la dépublication* : taper `/collection-noel` est du vocabulaire de développeur, que le brief interdit. → `FR-085` : index de références ; à la dépublication le système dit **où** c'est utilisé et demande confirmation ; à la mise en ligne un lien vers une page non publiée **n'est pas rendu** (bouton absent, lien en texte riche redevenu texte).

**Écarté.** *Niveau 1 — reporter la dépublication en post-V1* : défendable et honnête, mais laisse la cliente dépendante pour un geste qu'elle sait juger. *Niveau 3 — le lien mort fait échouer la mise en ligne, par symétrie avec `FR-055`* : refusé. Une image manquante est une **anomalie** ; une page dépubliée est un **choix légitime** de l'éditrice. Faire échouer le build la mettrait en échec pour avoir fait ce qu'on lui a offert de faire, et pourrait geler *toute* publication tant qu'elle n'a pas traqué chaque lien.

## D5 — Où vit un formulaire

**Le défaut.** `FR-049` disait que le site présente chaque formulaire publié — **sans jamais dire où**. `FR-012` n'avait pas de type formulaire ; `FR-009` interdisait de créer une page ; la gestion des adresses était exclue. L'éditrice pouvait donc composer son devis, le publier, et il n'existait **aucun endroit du site où il puisse apparaître**. SC-007 était inatteignable — le pendant exact du défaut D3, sur l'autre moitié du produit.

**Décidé.** Un **type de zone « formulaire »** : le gabarit possède l'emplacement, l'éditrice désigne lequel de ses formulaires y va — exactement le partage qui porte tout le produit. → `FR-012` amendé, `FR-086`. Un même formulaire peut être désigné par **plusieurs** pages (le formulaire de contact réutilisé est le cas le plus banal). La suppression d'un formulaire référencé passe par `FR-085`.

**Écarté.** *Une page auto-générée par formulaire* : contredit `FR-009` et rouvre la gestion des adresses. *L'intégrateur câble en dur quel formulaire va où* : `FR-040` perdrait son sens et on restaurerait la dépendance que SC-007 existe pour supprimer.

## D6 — L'éditrice a le droit de savoir si sa publication a marché

**Le défaut.** La publication est **asynchrone**. `FR-055` promettait de « signaler », `FR-056`/`FR-057` d'« expliquer » — à une personne qui a fermé l'onglet depuis deux minutes. Elle publie, recharge son site, ne voit rien : est-ce lent, cassé, ou a-t-elle mal cliqué ? Aucun moyen de trancher → **elle appelle l'agence**, sur le geste le plus chargé du parcours.

**Décidé.** → `FR-087` : état de la mise en ligne (en cours / en ligne / échouée avec motif), **consultable au retour**. Donne enfin un destinataire à `FR-055`, `FR-056`, `FR-057` et `FR-094`. → **Passif** : pas de notification e-mail en v1 (canal, gabarit, délivrabilité, pour un gain marginal — elle regarde son site dans la minute) ; reportée en post-V1. → **Report automatique conservé** (`FR-056`) : lui demander de « repasser demain appuyer sur Publier » est exactement la charge mentale technique que le brief bannit ; le cas fréquent (deux publications rapprochées) est déjà couvert par `FR-058`, `FR-056` ne vise que le quota mensuel. → `FR-036` **qualifié** « en conditions nominales » : sans quoi il contredit frontalement `FR-056`.

## D7 — Le téléversement, et les fichiers que rien ne libère

**Le défaut.** `FR-059` (réessayer sans perdre les autres modifications) ne tient que si le téléversement est **indépendant** de l'enregistrement — le fichier part donc immédiatement. Mais `FR-017` lu au pied de la lettre l'interdisait, et aurait conduit à retenir 8 Mo dans le navigateur jusqu'au clic « Enregistrer ». **Conséquence non écrite** : la médiathèque et la suppression de fichiers étant exclues, il n'existait dans tout le produit **aucun geste capable de libérer un octet** — le stockage ne fait que croître, et SC-001 en dépend.

**Décidé.** → `FR-017` amendé (la règle porte sur le **contenu** ; le téléversement est un geste distinct, conservé immédiatement). → **Accumulation assumée et écrite** en cas limite, récupération automatique en **post-V1**, nettoyage éventuel par l'intégrateur.

**Écarté.** *Récupération automatique en v1* : ce serait introduire le **seul mécanisme du produit capable de détruire du contenu irrécupérable**, pour économiser un quota qu'on ne touchera pas avant des années. **Piège consigné** : toute récupération future doit regarder **les deux** instantanés de D1 — une image absente du contenu en cours peut être servie par le contenu en ligne ; la supprimer effacerait une image **actuellement en ligne** et ferait échouer la mise à jour suivante (`FR-055`).

## D8 — Réduire l'image, plutôt que la refuser

**Le défaut.** L'utilisatrice est une **pâtissière-cake designer** : son site *est* un portfolio photo. Ses deux sources sont son téléphone (HEIC sur iPhone, absent de `FR-021`) et son photographe (JPEG de 10 à 25 Mo, systématiquement au-dessus des 8 Mo de `FR-023`). Le PRD traitait donc comme une erreur à expliquer **le fichier qu'elle a le plus de chances de déposer en premier**, sur la photo héros. Son recours après le joli message de `FR-024` : redimensionner une image. Elle ne sait pas. **Elle appelle l'agence, et SC-003 tombe au premier essai.** Le bon réflexe existait déjà à la sortie (`FR-026` : « sans que l'éditrice ait à s'en préoccuper ») — il n'avait pas été appliqué à l'entrée.

**Décidé.** → `FR-088` : l'image trop lourde est **réduite**, pas refusée ; le refus est réservé au non-image. `FR-023` devient la **butée serveur** (`FR-014` : on ne fait jamais confiance au navigateur), jamais atteinte dans le parcours nominal. US2-2 réécrit. → **HEIC refusé**, mais `FR-024` doit donner le **geste concret** (« Réglages → Appareil photo → Formats → Le plus compatible ») : un message sans jargon qui ne dit pas quoi faire ne sauve pas l'autonomie. Support HEIC en post-V1.

**Effet de bord voulu.** Réduire à l'entrée divise le stockage par cinq ou dix : le problème d'accumulation de D7 passe d'« acceptable » à « non-sujet ». Les deux décisions se renforcent.

## D9 — Vidéo intégrée, chargée au clic

**Le défaut.** `FR-069` disait « désigner », verbe choisi pour ne pas trancher. L'hébergement était en réalité **déjà interdit** sans que ce soit dit (`FR-020`–`FR-023` ne parlent que d'images, plafond 8 Mo ; trente secondes de vidéo pèsent 50 à 200 Mo). L'intégration naïve, elle, charge des centaines de kilooctets de code tiers au chargement — le moyen le plus sûr de faire tomber SC-005 — et dépose des traceurs **avant toute action du visiteur**, dans un produit sans bandeau de consentement.

**Décidé.** → `FR-069` : intégration seule, **YouTube et Vimeo** (liste fermée pour que le système puisse valider l'adresse et fabriquer la vignette), adresse collée, vignette récupérée et **remplaçable par une image à elle** (ce qui compte pour une cake designer). → Chargement du lecteur **au clic uniquement** — repris et généralisé en `FR-089` (voir D11).

## D10 — La soumission est validée par le serveur, pas par le navigateur

**Le défaut.** Le PRD était rigoureux partout (`FR-014`, `FR-048`) **sauf sur la seule route d'écriture publique du produit**. `FR-052` et `FR-060` étaient rédigés comme un blocage côté visiteur, sans exigence serveur symétrique. Trois conséquences : *(1)* le **consentement devenait déclaratif** — artefact juridique vérifié uniquement dans le navigateur, donc une soumission pouvait parvenir à la cliente sans base légale ; *(2)* **le contenu de l'e-mail était dicté par l'expéditeur** — n'importe qui pouvait poster n'importe quels libellés, et la cliente recevait **depuis son propre site** un message dont un tiers a écrit chaque mot ; l'anti-spam (`FR-063`) arrête les robots, pas une requête bien formée ; *(3)* **le total venait du visiteur** — 5 € annoncés pour une pièce à 500 €, alors que SC-007 prévoit qu'elle devise à partir de ce chiffre.

**Décidé.** → `FR-090` (validation contre la définition publiée : champs, types, obligatoires, bornes, consentement) et `FR-091` (total **recalculé** côté serveur, prix utilisés mentionnés dans le message). `FR-050` devient un pur confort d'affichage. **Bord tranché** : si la définition a changé entre le chargement de la page (site statique, potentiellement en cache) et l'envoi, on **achemine avec le total recalculé** sans rien signaler au visiteur — rejeter la demande d'un prospect parce que la cliente a retouché un prix trois minutes plus tôt serait absurde.

## D11 — Trois formulations qui se contredisaient

**(a)** `FR-039` — « sans exécution de code applicatif au moment de la visite » — interdisait littéralement `FR-050`, `FR-052` et la vignette vidéo. L'intention était « aucune exécution **serveur** », mais rien ne permettait de le savoir. → réécrit en « sans aucun **traitement serveur** ».

**(b)** SC-005 ⨯ `FR-063` — depuis D5, un formulaire vit dans une page ordinaire, qui porte donc l'anti-spam **tiers**. Fallait-il exempter ces pages de SC-005 ? Ce serait exempter **les pages de conversion**, celles dont la lenteur coûte le plus cher. → **généralisation de la règle vidéo** : `FR-089`, aucun code tiers avant action explicite. SC-005 s'applique alors à **toutes** les pages, sans frontière floue à négocier. Le FR vidéo de D9 en devient un cas particulier.

**(c)** `FR-063` ⨯ `FR-065` — résister aux envois automatisés suppose d'observer des signaux non saisis, et l'acheminement voit l'IP : pris au pied de la lettre, `FR-065` **interdisait** `FR-063`. → `FR-065` réécrit : « ni collecte **ni conservation** » de donnée personnelle au-delà de ce que le formulaire demande ; les données techniques d'anti-spam et d'acheminement ne sont pas conservées. Garde la promesse sans mentir sur le fonctionnement, et donne enfin prise à la question RGPD ouverte.

## D12 — La mesure d'audience était un trou de périmètre

**Le défaut.** L'audience n'était **nulle part** : ni incluse, ni exclue, ni reportée. Or une commerçante demande « combien de gens ont vu mon site ? » dans les trois mois. Ce silence aurait été comblé un jour par un beacon collé dans un gabarit, cassant `FR-039`, `FR-089` et SC-005 d'un seul geste.

**Décidé.** → **NON inclus** : aucun code de mesure sur les pages publiques ; le trafic se lit dans les **statistiques serveur** de la plateforme (aucun code sur la page, rien sur le terminal, aucun coût Lighthouse). → **post-V1** : restituer à l'éditrice un chiffre de fréquentation simple issu de ces statistiques.

**Recherche faite (à ne pas refaire).** La **liste publique CNIL** des solutions de mesure d'audience exemptées de consentement **a disparu au 1<sup>er</sup> janvier 2026**, remplacée par une auto-évaluation face aux critères publiés : il n'existe plus de label à obtenir, c'est à l'éditeur du site de démontrer sa conformité. Un outil *cookieless* (type Cloudflare Web Analytics) n'écrit ni ne lit rien sur le terminal, donc **échappe au consentement ePrivacy** ; le RGPD continue de s'appliquer au traitement transitoire de l'IP, ce qui impose une mention d'information, pas un bandeau. **Mais tout ceci est sans objet ici** : `FR-089` exclut le beacon en amont, quelle que soit la réponse juridique.
Sources : [CNIL — programme d'évaluation](https://www.cnil.fr/fr/solutions-de-mesure-daudience-exemptees-de-consentement-la-cnil-lance-un-programme-devaluation), [Cloudflare Web Analytics & ePrivacy](https://ethicaldatahub.com/cloudflare-analytics-cookie-banner/).

## D13 — Le PRD contredisait un ADR accepté

**Le défaut.** Le PRD : « la dernière écriture enregistrée gagne, **sans avertissement** ». `CLAUDE.md` / ADR-0004 (**accepté**) : « Verrou optimiste via `createRepository` uniquement ». Le code **aura** donc le verrou, et le portail qualité le vérifiera. Trois positions possibles, dont une seule cohérente : l'utiliser, ou amender l'ADR — mais pas le construire et l'ignorer (code mort exigé par le portail, risque conservé). Le scénario n'a rien à voir avec le multi-éditeurs : admin ouvert sur l'ordinateur le matin, repris sur le téléphone le soir, onglet réveillé le lendemain qui écrase tout d'un clic. Depuis D2 elle peut revenir au contenu **en ligne**, mais son brouillon du soir est perdu sans trace.

**Décidé.** → `FR-092` : refus de l'écrasement silencieux, information sans jargon, proposition de recharger. Aucune fusion automatique. Coût nul : le jeton `updated_at` et le refus sont déjà prévus.

## D14 — L'aperçu

**Le défaut.** *(a)* `FR-031` (« le même rendu que le site public ») est **inatteignable au pied de la lettre** : le site public est bâti avec Sharp, réservé à `apps/site`, **build-only** ; l'aperçu est rendu par le Worker d'admin, où Sharp n'existe pas. Le pipeline d'images ne peut pas être le même. Laissé tel quel, ce FR aurait forcé l'aval à inventer seul le barème d'une vérification observable. *(b)* `FR-030` montrait la page « dans l'état **enregistré** » : elle modifie trois zones, clique « Aperçu » sans enregistrer, et voit la version d'avant. **L'aperçu lui ment** au moment précis où elle cherche à se rassurer, et `FR-018` ne la sauve pas (il ne se déclenche qu'au départ de la page).

**Décidé.** → `FR-031` : mêmes gabarits et mêmes styles ⇒ mise en page, textes et **cadrage** des images identiques ; encodage et taille des fichiers libres. → `FR-030` : « **Enregistrer et prévisualiser** » — l'enregistrement reste explicite (`FR-017` préservé, elle a cliqué un bouton qui l'annonce), et la classe entière du « pourquoi mon aperçu ne change pas » disparaît.

**Écarté.** *Rendre l'état non enregistré* : un chemin de rendu parallèle pour rien.

## D15 — Le devis, exploitable jusqu'au bout

**Le défaut.** *(a)* Le message part **du site**, pas du visiteur : en appuyant sur « Répondre » — le geste qu'elle fera cent fois sur cent — elle répond à son propre site, et doit recopier l'adresse du prospect à la main. C'est le dernier mètre de SC-007. *(b)* Le champ **nombre** n'avait **aucune borne**, alors que c'est le seul type dont la valeur **entre dans un calcul** : 10 000 parts → 45 000 € affichés par le site de la cliente à un prospect ; ou `-5` qui fait baisser le total ; ou `0,5`. Rien ne les refusait, ni côté navigateur ni côté serveur.

**Décidé.** → `FR-061` : une réponse au message parvient **directement au visiteur**. **⚠ Renversé en fin de journée le 2026-08-01 : le `Reply-To` est retiré** (§ 4). Le défaut *(a)* est donc **rouvert sciemment** — la cliente recopie l'adresse du prospect à la main, exactement le dernier mètre que D15 avait fermé. À noter : contrairement au retrait de `FR-095`, celui-ci n'était **pas** imposé par le changement de fournisseur. → `FR-045` : bornes min/max, **facultatives mais avec un maximum proposé par défaut** (l'éditrice ne pensera pas spontanément à borner ; un défaut la protège sans la contraindre) ; soumission hors bornes refusée.

## D16 — SC-004 serait passé à la recette, puis aurait pourri

**Le défaut.** Publier reconstruit **tout le site** : le coût est proportionnel au **volume total de médias publiés**, pas à ce qui a changé. Au lancement, trente photos : une minute, SC-004 vert, tout le monde signe. Un an plus tard, six galeries et trois cents photos : corriger une **virgule** relance le réencodage des trois cents, le délai franchit les cinq minutes, et le quota de build (SC-001) est mangé. **C'était le seul endroit du PRD où un critère de succès pouvait être validé puis devenir faux tout seul**, par l'usage normal. D8 allège les fichiers mais ne change pas le nombre de réencodages.

**Décidé.** → `FR-093` : le délai **ne doit pas croître** avec le volume déjà publié ; seul ce qui a changé est retraité. → SC-004 mesuré **sur un site à volume réaliste**. → La **première** mise en ligne (ou la première après un changement de gabarit invalidant tout) peut dépasser 5 minutes : événement d'intégrateur, pas geste d'éditrice.

## D17 — Passe de cohérence

- **`FR-012` / `FR-076`** — « date » existait comme sous-champ de répéteur mais pas comme type de zone : un type à mi-étage force à écrire deux fois la même validation. → ajouté à `FR-012`.
- **`FR-004`** — « associer chaque écriture à une identité » n'a **aucun consommateur** (une éditrice, pas de rôles, pas d'historique, pas d'écran d'audit). Ce n'est pas une erreur — deux colonnes déjà au modèle, qui préparent le multi-éditeur — mais écrit sans motif, quelqu'un aurait fini par construire un écran pour la « servir ». → conservé avec la mention explicite **« aucune surface en v1 »**.
- **`FR-038`** — retenait la date de **première** publication ; c'est la **dernière mise à jour** qui compte pour le référencement. → les deux sont enregistrées, le gabarit choisit laquelle exposer.
- **Monnaie** — implicitement l'euro, nulle part écrit, multi-devise ni inclus ni exclu. → euros ; multi-devise en NON inclus.
- **Numérotation** — règle posée dans le PRD : **jamais de renumérotation**, nouvelles à partir du numéro libre suivant, amendements sous l'identifiant d'origine.

## D18 — Une demande perdue ne laissait aucune trace

**Le défaut.** `FR-062` supposait l'échec connu **pendant** que le visiteur attend. Or un e-mail échoue rarement ainsi : le service accepte, répond « c'est pris », et le rejet arrive trente secondes plus tard (boîte pleine, adresse changée, indésirable, domaine mal configuré). À cet instant : le visiteur a lu « bien envoyée », la cliente **ignore qu'il y avait quelque chose à recevoir**, et le produit — obéissant à `FR-064` — a **déjà tout effacé**. La demande n'existe plus nulle part. **Un client perdu en silence, sur le geste que SC-007 désigne comme la promesse de conversion.**

**Décidé.** → `FR-064` restreint à l'acheminement **réussi** : en cas d'échec la soumission est retenue le temps de réessayer, puis effacée. La promesse « pas de base de prospects » tient intégralement — ni écran, ni liste, ni recherche, et rien ne survit à la livraison. → `FR-094` : échec définitif signalé dans l'espace d'édition (réutilise la surface de D6). → `FR-095` : **copie au visiteur** — le filet est ainsi chez la seule personne qui *sait* avoir envoyé quelque chose. **⚠ Renversé en fin de journée le 2026-08-01 : `FR-095` est retirée de la v1** (retour à Cloudflare Email Service, aucune dépendance hors écosystème — § 4). **Puis le filet a été reconstitué ailleurs, le même jour** : plutôt que chez le visiteur, il est placé chez l'éditrice. La rétention de `FR-064` — qui existait déjà, pour le seul réessai — devient une **corbeille de courrier non distribué** : `FR-094` gagne son motif, et `FR-097`/`FR-098`/`FR-099` permettent de consulter, relancer et effacer. Sur le mode d'échec de loin le plus probable — une adresse de destination erronée — la demande est donc **récupérée**, ce que `FR-095` ne faisait pas. Le raisonnement de D18 reste exact de bout en bout ; seule sa mise en œuvre a changé de côté. **Le trou résiduel, lui, est irréductible** : le visiteur ne saura jamais que rien n'est arrivé. → `FR-096` : **message de test** déclenché par l'éditrice, parce qu'une faute de frappe dans son propre domaine produit une adresse **bien formée** que `FR-048` ne peut pas détecter, et que ce mode d'échec est le plus probable **et** le plus permanent.

**Écarté.** *Vérification automatique de délivrabilité* : chantier disproportionné en v1 → post-V1.

---

# Partie III — Reste-à-faire

## 1. Préalable de gouvernance — un ADR avant tout code

`CLAUDE.md` : *« Nouveau patron structurant → rédiger un ADR *proposed* soumis à approbation **avant** d'écrire du code, dans la **même PR**. »* Le modèle à deux instantanés en est un.

- [x] **ADR-0010 (nouveau, *proposed*) — Modèle brouillon/publié à deux contenus.** → [`docs/adr/ADR-0010-modele-brouillon-publie.md`](./adr/ADR-0010-modele-brouillon-publie.md), rédigé le 2026-08-01, **en attente d'approbation humaine** (`CLAUDE.md` : un patron structurant s'approuve avant le code).
      Les trois points à trancher le sont : **forme** → discriminant `state ∈ ('draft','live')` dans la clé primaire des tables de valeur, plutôt qu'un instantané figé à part — motif : préserver le chemin de lecture unique d'ADR-0004, qu'un blob publié aurait dédoublé ; **moment** → recopie synchrone en un seul `batch()` D1 au clic « Publier », *avant* le Deploy Hook, verrou et zones obligatoires vérifiés d'abord ; **formulaire multi-pages** → une référence est un identifiant, jamais une copie, donc publier un formulaire le met à jour partout sans republier les pages porteuses.
      Trois conséquences non prévues, à répercuter : *(1)* `FR-019` gagne un **quatrième état** (§ 4) ; *(2)* le **texte alternatif** quitte `media.alt` pour la valeur de zone, sinon il passerait en ligne sans publication (§ 2b) ; *(3)* la métadonnée de publication est **commune aux trois genres d'objet** (table `publications`), l'algorithme n'étant écrit qu'une fois.

- [x] **ADR-0004 — amendé** (bloc « Amendement 2026-08-01 »). Les quatre déclarations du contrat de gabarit sont portées ; s'y ajoutent **§ h** (index de références : fonction pure `extractReferences` dans `@colibri/core`, matérialisée en base — stockée car la question se pose *avant* une dépublication, donc hors build) et **§ i** (état de mise en ligne : une seule ligne, le build étant global). Le caveat `[À VÉRIFIER]` sur l'accès D1 au build est **levé** : adaptateur HTTP sur l'API REST.

- [x] **ADR-0007 — amendé deux fois** (blocs « Amendement 2026-08-01 » puis « (b) »). **Le second annule le renversement du premier** : retour à Cloudflare Email Service, `FR-095` retirée de la v1, `Reply-To` abandonné (§ 4). Contenu du premier : les dix exigences sont portées, **et un choix est renversé** : l'alternative « Resend » — rejetée à l'origine pour « dépendance tierce, gratuité moins sûre » — devient le choix retenu, l'envoi Cloudflare n'atteignant aucun destinataire quelconque sur l'offre gratuite. L'alternative « calcul du total côté serveur », rejetée à l'origine, est **nuancée** plutôt que renversée : le calcul navigateur reste pour l'affichage, seul le total *acheminé* est recalculé.

- [x] **ADR-0005 — amendé.** Cibles ajoutées aux `Constraints`, dont la première nommée comme telle : **aucune fuite de brouillon** — qu'aucune lecture du build ne serve une ligne `state='draft'`, testée sur le chemin réel jusqu'au HTML bâti. Puis soumission forgée, recalcul du total, verrou, index de références, atomicité de la publication.

- [x] **ADR-0003 — amendé.** Les deux mécanismes manquants sont ajoutés : **Cron Trigger** (disponible sur l'offre gratuite ; **aucun réessai plateforme**, d'où l'exigence d'idempotence) et **réduction d'image dans le navigateur**. `FR-093` est traité ailleurs qu'au socle : dérivés persistés en R2 (§ 2c), délibérément plutôt que par le cache de build de la plateforme.

## 2. `docs/stack.md` — à reprendre

### Modèle de données (invalidé par `FR-078`)

- [x] **`page_zone_values`, `site_settings`, définition de formulaire** — tous porteurs de `state` dans leur clé primaire. La définition de formulaire est éclatée en `forms` (identité) + `form_defs` + `form_fields` + `form_field_options`, ces trois derniers versionnés. `page_meta` **est apparu en cours de route** : titre SEO, description et image de partage (`FR-027`→`FR-029`) sont rendus au visiteur, donc soumis au cycle — ils ne pouvaient pas rester sur `pages`.
- [x] **`pages.status`** — supprimé. Les états de `FR-019` sont **dérivés** de `publications` ; un état stocké dérivable se désynchronise.
- [x] **`pages`** — `first_published_at` et `last_published_at` vivent dans `publications`, table **commune aux trois genres d'objet** (`FR-038`).
- [x] **Note « Pas de table de soumissions »** — corrigée : une table bornée par `expires_at`, stockant le *message composé* et non la soumission brute. *(Amendée en fin de journée : renommée `undelivered_submissions` et rendue **consultable** — « ni écran, ni liste, ni recherche » devient « ni recherche, ni filtre, ni statut traité, et jamais une demande livrée ». Voir l'entrée d'historique du filet de D18.)*
- [x] **`form_fields`** — `min_value` / `max_value` ajoutés ; le maximum est **obligatoire** pour `type='number'` (décision du 2026-08-01, portée par le schéma Zod et non par un `CHECK`, la règle ne valant que pour un type de champ).

### Formes de `value_json`

- [x] **Zone formulaire** (`FR-086`) → `{ form_id }`, une référence. **Zone date** (`FR-012`) → chaîne ISO `YYYY-MM-DD`.
- [x] **CTA** → `{ label, target }`, `target` étant le type `LinkTarget` partagé avec le texte riche.
- [x] **Lien en texte riche** (`FR-015`) — **tranché.** La marque `link` de TipTap est étendue en `{ kind, page_id?, href? }` ; `href` n'est **jamais** stocké pour une cible interne. La résolution `page_id → slug` a lieu au rendu dans `toBlocks`, ce qui est précisément ce qui permet à `FR-085` de retirer la marque (le texte reste) quand la cible n'est pas en ligne. Extension du cœur, consommée par l'îlot d'édition. Reste le changement le plus coûteux de la revue, et il est assumé.
- [x] **Vidéo** → `{ provider, ref, poster_media_id? }`. Le `[À VÉRIFIER]` est levé : **intégrée**, liste fermée YouTube/Vimeo.
- [x] **Image — le texte alternatif change de place.** *(ouvert par ADR-0010 § 8.)* `{ media_id }` devient `{ media_id, alt }` : porté par `media.alt`, l'alt d'une image déjà publiée partirait en ligne au prochain build **sans publication**, en violation de `FR-017` et `FR-078`. `media` ne garde que des faits techniques immuables (`r2_key`, `mime`, dimensions, taille). Même raisonnement que la légende de galerie, qui vivait déjà dans la valeur de zone.

### Surfaces nouvelles

- [x] **Index de références** (`FR-085`) — **stocké** (`content_references`), pas dérivé au build : Doit répondre à « qui pointe vers cette page / ce formulaire ? » avant dépublication, et permettre de ne pas rendre un lien mort.
- [x] **État de publication** (`FR-087`) — persistant, alimenté par l'issue réelle du build ; sert aussi `FR-055`, `FR-057`, `FR-094`.
- [x] **Menu** (`FR-084`) — déclaré par l'intégrateur, filtré sur les pages publiées.
- [x] **Provisioning des pages** (`FR-082`) — **déclaration du projet client + étape outillée**, ni migration ni graine ad hoc (une migration appartient au cœur et serait la même pour tous ; le jeu de pages est du sur-mesure client). Détermine aussi la mise à jour de la flotte (ADR-0008).
- [x] **Retraitement incrémental** (`FR-093`) — dérivés persistés en **R2**, délibérément plutôt que via le cache de build de la plateforme : dérivés d'image conservés entre deux mises en ligne.
- [x] **Réduction d'image à l'entrée** (`FR-088`) — **dans le navigateur** avant l'envoi : Sharp est *build-only* et n'existe pas dans le Worker. `FR-023` reste la butée serveur.
- [x] **Vignette vidéo** (`FR-069` × `FR-089`) — **conséquence non évidente** : la récupérer chez le fournisseur *au moment de la visite* serait déjà une requête tierce. Elle doit être récupérée **au build** et servie depuis le site.
- [x] **Anti-spam** (`FR-063` × `FR-089`) — **Turnstile conservé**, script injecté au premier geste dans le formulaire, rendu explicite : aucun code chargé avant action du visiteur : restreint les modes d'intégration disponibles. À valider **avant** de figer le choix.
- [x] **Acheminement** (`FR-061`) — **Cloudflare Email Service**, vers adresse de destination vérifiée *(re-tranché en fin de journée le 2026-08-01 ; l'entrée d'origine disait « Resend, deux destinataires par soumission, adresse de réponse distincte de l'expéditeur »)*. Le seam mailer n'a plus qu'**un** destinataire par soumission et pas de `Reply-To` : c'est la forme la plus simple qu'il pouvait prendre, et elle est hors quota.
- [x] **Message de test** (`FR-096`) — endpoint d'écriture authentifié via `writeHandler({ auth: 'access' })`, envoi mocké en test (ADR-0005).
- [x] **Verrou optimiste** (`FR-092`) — la note « la protection n'est pas une priorité v1 » est **caduque** : le refus d'écrasement est exigé.

## 3. Vérifications factuelles

> **Faites le 2026-08-01.** Résultats consignés ici ; ils migreront dans `stack.md` et les ADR au § 2 et § 1. Sources en fin de section.

- [x] **Issue réelle d'un build** (`FR-087`) — **VÉRIFIÉ, favorable.** Les Deploy Hooks existent pour Workers Builds depuis le 2026-04-01. Le `POST` retourne `{ result: { build_uuid, branch, worker } }`, et le `build_uuid` **interroge** ensuite l'API Builds : `GET /builds/workers/:worker_tag/builds` (champs `build_uuid`, `status`, `branch`, `created_at`) et `GET /builds/builds/:build_uuid/logs`. `FR-055`, `FR-057`, `FR-087` et `FR-094` ont donc une source d'information réelle. **Trois conséquences** : *(1)* l'apprentissage se fait par **interrogation périodique**, donc par **Cron Trigger** — disponible sur l'offre gratuite (5 déclencheurs, intervalle minimal 1 min, chaque invocation compte dans les 100 000 requêtes/jour, **aucun réessai automatique** en cas d'échec d'une invocation) ; *(2)* l'API Builds exige un jeton **user-scoped** (`Workers Builds Configuration: Edit` + `Workers Scripts: Read`) — les jetons *account-scoped* ne sont pas acceptés : un secret de plus par instance, **attaché à une personne**, ce qui rejoint la question ouverte du § 4 sur la révocation d'accès ; *(3)* le Deploy Hook **déduplique** nativement les déclenchements reçus avant qu'un build ne démarre — `FR-058` est servi sans code.

- [x] **Détection du quota épuisé** (`FR-056`) — **PARTIEL, et rendu sans objet par conception.** Le quota de l'offre gratuite est de **3 000 minutes de build par mois**, avec **1 build concurrent** (ce n'est pas un nombre de builds : la métrique héritée des Pages, 500 builds/mois, ne s'applique pas). Le **signal exact** d'épuisement n'est pas documenté. Décision : **ne pas en dépendre**. Le report de `FR-056` s'obtient par une **boucle de réconciliation** (le même Cron Trigger que ci-dessus) qui compare le dernier contenu publié au dernier build réussi et redéclenche tant qu'ils divergent — ce qui couvre d'un seul mécanisme le quota, l'échec transitoire et la déduplication. `FR-057` (« expliquer sans terme technique ») se contente alors du motif retourné par l'API Builds quand il est exploitable, et du repli « la mise en ligne n'a pas encore pu se faire, elle se fera toute seule » sinon.

- [x] **Envoi sortant depuis un Worker** — **VÉRIFIÉ, DÉFAVORABLE. Le choix de stack ne tient pas en l'état.** Cloudflare Email Service (ex-Email Routing) : l'envoi sortant est **indisponible sur l'offre Workers gratuite**, à une exception près — l'envoi vers une **adresse de destination vérifiée du compte**, gratuit sur toutes les offres et hors quota. L'envoi vers un **destinataire quelconque** exige l'offre **Workers Paid** (3 000 messages inclus/mois, puis 0,35 $/1 000) **et** un domaine d'envoi préalablement rattaché. Limites annexes : 50 destinataires par message, 5 Mio par message (25 Mio vers une destination vérifiée). **Trois conséquences, dont une bloquante** :
      - `FR-061` (acheminement vers l'adresse du formulaire) : **tient** gratuitement — l'adresse de la cliente est une destination vérifiée. Mais cela **contraint `FR-046`** : l'éditrice ne peut pas saisir librement n'importe quelle adresse de destination ; une adresse nouvelle déclenche une vérification qu'elle doit confirmer par courriel. Le PRD ne porte pas cette contrainte.
      - `FR-096` (message de test) : **tient** gratuitement, même adresse.
      - `FR-095` (copie au visiteur) : **ne tient pas.** Le visiteur est un destinataire quelconque. En l'état, `FR-095` coûte l'offre payante et **contredit `SC-001`** (0 €/mois).
      → **Décision requise, portée au § 4.** Repli vérifié : **Resend**, offre gratuite = 3 000 messages/mois **et 100/jour**, 1 domaine vérifié, destinataires quelconques. Le seam `sendMail` d'ADR-0004 étant déjà injectable, il s'agit d'un changement d'implémentation par défaut, pas d'architecture.

- [x] **HEIC sur l'iPhone de la cliente** (`FR-024`) — **LEVIER DE CONCEPTION TROUVÉ ; confirmation terrain encore utile.** Le comportement d'iOS ne dépend pas du sélecteur mais de l'attribut **`accept`** : si `image/heic` y figure, Safari livre le HEIC brut ; s'il n'y figure pas, Safari **transcode en JPEG**. Seul Safari 17+ décode le HEIC ; Chrome, Firefox et Edge ne le décodent pas du tout — donc une réduction navigateur (`FR-088`) ne pourrait de toute façon pas s'appuyer dessus. **Décision** : ne **jamais** déclarer `image/heic` dans `accept` (`FR-021` ne le liste pas). Dans le parcours nominal de la cliente, `FR-024` n'aura donc pas à jouer sur ce motif. Reste à constater une fois sur son iPhone réel — dégradé de « vérification » à « confirmation », non bloquant.

- [x] **Accès D1 au build** — **VÉRIFIÉ, tranché.** Un build Workers Builds s'exécute dans un conteneur CI, **pas dans workerd** : aucun binding n'y est disponible (les bindings supposent `prerender = false`, c'est-à-dire le runtime). Le build SSG lit donc D1 par l'**API REST** : `POST /accounts/{account_id}/d1/database/{database_id}/query`, corps `{ sql, params }` ou `{ batch: [...] }`. C'est exactement le cas prévu par ADR-0004 (« l'architecture est agnostique : le build fournit son adaptateur à `db` ») : l'adaptateur de build est un adaptateur **HTTP**. Le caveat `[À VÉRIFIER]` d'ADR-0004 et de `stack.md` peut être levé et remplacé par cette décision.

**Sources** — [Deploy Hooks pour Workers Builds](https://developers.cloudflare.com/changelog/2026-04-01-deploy-hooks), [Workers Builds — API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/), [Email Service — tarifs](https://developers.cloudflare.com/email-service/platform/pricing/), [Email Service — limites](https://developers.cloudflare.com/email-service/platform/limits/), [Email Service — bindings d'envoi](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [D1 — API REST `query`](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [Workers — tarifs et limites](https://developers.cloudflare.com/workers/platform/pricing/).

## 4. Décisions restant à prendre

- [x] **Statut du PRD** — **passé à `accepted`** le 2026-08-01, en même temps que les trois amendements (`FR-019`, `FR-045`, `FR-046`).
- [x] **Durée de session et révocation d'accès** — **tranché le 2026-08-01.** Énoncé d'origine : `FR-001` refuse les personnes non autorisées, mais rien ne dit combien de temps une session vit, ni par quel geste l'intégrateur coupe l'accès le jour où une cliente quitte l'agence — seule question ouverte que la revue a créée sans la résoudre, avec une deuxième occurrence apportée par le § 3 (le jeton *user-scoped* de l'API Builds est lui aussi attaché à une personne). Trois réponses, portées par l'**amendement (b) d'ADR-0003** et par `stack.md` :
      **(1) Session : 7 jours**, au niveau **application** Access (pas organisation, pour ne pas dépendre d'un réglage global). Access ne fait pas de session glissante. Motif : l'édition réelle est une salve étalée sur quelques jours ; le défaut de 24 h imposerait le code e-mail à presque chaque venue — la charge technique que le brief bannit — et un mois ferait dépendre la sécurité d'une révocation manuelle dont personne ne garantit qu'on y pense.
      **(2) Révocation : deux gestes, dans cet ordre** — retirer l'adresse de la **politique** Access, **puis** révoquer la personne. L'un sans l'autre ne coupe rien durablement : la révocation seule invalide les jetons émis en 20–30 s mais autorise une **reconnexion au bout d'une minute** ; le retrait de politique seul laisse vivre la session en cours. Procédure de sortie d'une cliente → à porter dans ADR-0008 (§ 6).
      **(3) Jeton Builds : membre de compte dédié et non nominatif** (identité d'agence), jamais le compte personnel d'un intégrateur — sinon la publication de **tous** les sites clients dépend du maintien d'une personne dans l'organisation.
      **Brèche trouvée en chemin, non vue par la revue.** Une application Access protège un **nom d'hôte**, pas un Worker : l'admin restait joignable sur son `*.workers.dev` et sur ses *preview URLs*, hors de toute politique — `FR-001` contourné intégralement, et avec lui le point (2), la révocation n'étant effective que parce que chaque requête traverse Access à la périphérie (la vérification JWT du Worker, elle, ne voit qu'un `exp` : c'est une défense en profondeur au service de `FR-003`, pas un mécanisme de révocation). → `workers_dev: false` **et** `preview_urls: false` déclarés **explicitement** dans `apps/admin/wrangler.jsonc` ; contrainte ajoutée à ADR-0003 et à `CLAUDE.md`. Explicitement, parce que la valeur par défaut de `preview_urls` a changé trois fois en un an — un hook doit pouvoir la constater, pas la supposer.
- [x] **Bornes d'un champ nombre** (`FR-045`) — **le défaut est renversé** : le **maximum devient obligatoire** (aucun champ nombre publiable sans lui), le minimum reste facultatif mais vaut **0** par défaut — un champ à prix ne peut jamais faire *baisser* le total. `FR-045` amendé.

### Ouvertes par l'application (2026-08-01)

- [x] **Acheminement des soumissions — re-tranché le 2026-08-01 : option (b), retour à Cloudflare Email Service.** La bascule sur Resend (option (a)) avait été retenue quelques heures plus tôt ; elle est **annulée** sur décision de **n'ajouter aucune dépendance hors écosystème**. Conséquences, portées par ADR-0007 amendement (b) : `FR-095` (copie au visiteur) est **retirée de la v1** — c'est le prix de l'option (b), et il rend un échec définitif d'acheminement **silencieux pour le visiteur** ; `FR-061` perd en outre son `Reply-To` vers le visiteur, ce qui relève d'un **choix distinct** et non de la contrainte de plateforme (l'en-tête est gratuit chez les deux fournisseurs). En échange : plus de plafond de volume (l'envoi vers destination vérifiée est hors quota), une clé d'API de moins, et la sous-question de flotte — un compte par client ou un domaine d'agence unique — **s'éteint sans avoir été tranchée**, ce qui débloque ADR-0008. *L'aller-retour n'a coûté aucune architecture : le seam `sendMail` d'ADR-0004 est exactement ce qui achetait ce droit de se raviser.* Énoncé d'origine : *(ouvert par le § 3.)* L'envoi sortant Cloudflare ne couvre pas les destinataires quelconques sur l'offre gratuite. Trois issues : **(a)** basculer le seam `sendMail` sur **Resend** (gratuit, 3 000/mois et 100/jour, destinataires quelconques) — préserve `SC-001` et `FR-095`, au prix de la dépendance tierce qu'ADR-0007 avait écartée ; **(b)** rester sur Cloudflare et **retirer `FR-095`** (post-V1) — préserve l'écosystème, mais D18 perd le filet qu'il avait posé chez la seule personne qui *sait* avoir envoyé quelque chose ; **(c)** offre payante — contredit `SC-001`. *Sous-question si (a) : l'offre gratuite Resend n'admet **qu'un domaine vérifié**, ce qui interroge la flotte (ADR-0008) — un compte par client, ou un domaine d'agence unique avec `Reply-To` vers la cliente.*
- [x] **`FR-019` — quatrième état** « retirée du site », **amendé au PRD** le 2026-08-01. *(ouvert par ADR-0010, § 4.)* `FR-083` (retirer une page du site) crée nécessairement un état **« retirée du site »** : une page retirée n'est ni « jamais publiée » ni « publiée ». `FR-019` n'en énumère que trois. Amendement de PRD à valider en même temps qu'ADR-0010.
- [x] **`FR-046` — amendé** le 2026-08-01 : l'adresse doit être **confirmée** avant que le formulaire puisse être publié. Effet de bord favorable — une faute de frappe dans son propre domaine ne se confirme jamais, donc l'échec devient visible *avant* la première demande perdue (le cas limite du PRD est mis à jour). *(ouvert par le § 3.)* Quelle que soit l'issue ci-dessus, une adresse de destination nouvelle exige une **vérification par courriel** (Cloudflare) ou un **domaine vérifié** (Resend). Le PRD laisse croire que l'éditrice saisit l'adresse qu'elle veut et que ça marche. À amender.

## 5. Ordre recommandé

1. ~~**Le nouvel ADR** (*proposed*)~~ — **fait** (ADR-0010, accepté le 2026-08-01).
2. ~~**Vérifications factuelles du § 3**~~ — **fait**, 5/5. Bien joué de les avoir placées tôt : l'une d'elles a renversé un choix de fournisseur qui aurait été découvert à l'implémentation.
3. ~~**`docs/stack.md`**~~ — **fait** : modèle de données, formes de `value_json`, surfaces nouvelles.
4. ~~**Amendements ADR-0004 / 0007 / 0005 / 0003**~~ — **fait**, ainsi qu'**ADR-0008** et un **second amendement d'ADR-0007** qui annule le premier sur l'acheminement, tous deux ajoutés en cours de route.
5. **Specs de feature** — socle P1 (édition, médias, publication) **avant** le constructeur de formulaires (P2), conformément au rappel de séquencement du PRD. **C'est le prochain geste**, et il n'est plus documentaire : `/scd-sdd:kickoff-feature`.

---

## 6. En suspens

> Ce qui n'est pas tranché à la clôture des § 1 à § 4. Rien ici n'empêche d'ouvrir le socle P1 : ce sont des sujets de flotte et de confirmation, dont aucun n'est sur le chemin de l'édition, des médias ou de la publication.

- [x] **ADR-0008 — amendé** le 2026-08-01 (bloc « Amendement 2026-08-01 — l'entrée et la sortie d'une instance »). L'ADR ne décrivait que la **montée de version** d'une flotte existante : ni comment une instance y **entre**, ni comment un accès en **sort**. Quatre sections écrites. **(a)** Le **jeu de pages** (`FR-082`) est une déclaration du projet client + une étape outillée, ni migration ni graine — une migration est livrée avec le cœur et serait la même pour tous, alors que le jeu de pages est précisément ce qui distingue les clients ; corollaire SemVer : **ajouter une page chez un client n'incrémente aucune version du cœur**. **(b)** La **liste de provisionnement d'une instance**, jusqu'ici implicite et éparpillée entre ADR — bindings, application Access, `workers_dev`/`preview_urls`, adresse de destination vérifiée, secrets, jeu de pages ; rien de tout cela n'est du code, ce sont des **valeurs**, et c'est ce qui permet à « aucun code spécifique client dans le cœur » de tenir. **(c)** La **sortie d'une personne** : retrait de politique **puis** révocation, et jeton Builds sur un membre de compte non nominatif. **(d)** La question du **domaine d'envoi** est consignée comme **éteinte** (et non tranchée) par le retour à Cloudflare — sans quoi elle se rouvrirait d'elle-même à la prochaine relecture. Cinq contraintes ajoutées.
      *Une seule des étapes de (b) demande la participation de la cliente : la confirmation de son adresse de destination. C'est donc la seule qui puisse rester en attente sans que personne ne s'en aperçoive — d'où sa contrainte dédiée.*

- [x] **Statut de `docs/stack.md`** — **passé à `accepted`** le 2026-08-01. Énoncé d'origine : le document reste `Draft` ; question jamais posée par la revue, mais il vient d'être largement réécrit et le PRD, lui, est passé à `accepted`. Motif de la décision : la stack ne porte plus rien de spéculatif — chaque choix est adossé à un ADR accepté (0003, 0004, 0007, 0008, 0010), et les quatre questions que la revue avait rouvertes sont refermées. Laisser `Draft` aurait signalé « ça bouge encore » alors que ça ne bouge plus. **Écarté** : attendre que le socle P1 confronte la stack au code réel — défendable, mais cette confrontation produira des **amendements datés**, pas un retour en `Draft` ; la mention est portée dans l'en-tête du document.

- [x] **`FR-045` — le minimum borné à 0, confirmé** le 2026-08-01. La décision demandée portait sur le **maximum** (rendu obligatoire) ; le **minimum** avait été complété dans la foulée — facultatif, mais valant **0** par défaut, pour fermer l'autre moitié du défaut relevé en D15 (un `-5` qui fait *baisser* le total). **Confirmé tel quel** : aucun cas légitime de quantité négative sur un devis de pâtisserie, le prix unitaire étant un montant positif et la valeur saisie une quantité. Aucune modification : `FR-045`, ADR-0007 (§ 3 et `Constraints`) et `stack.md` (`form_fields.min_value`) portaient déjà la règle. **Écarté** : autoriser un minimum négatif pour offrir une remise saisie par le visiteur — ce serait rouvrir à moitié le défaut de D15, et une remise n'a pas à être saisie par celui qui en bénéficie.

- [x] **Signal de quota de build épuisé** — **sans objet ici : migré dans `docs/stack.md`** le 2026-08-01, où il figurait déjà en question ouverte technique et où il est désormais marqué comme son lieu durable. Motif : non documenté par la plateforme, **rendu non bloquant par conception** (boucle de réconciliation), et **ne se constatant qu'en production** — aucun geste documentaire ne pouvait le fermer, et le garder ici aurait maintenu ce document ouvert à 40/41 pendant des semaines pour lui seul. Le fond reste vrai : si un motif exploitable existe, `FR-057` gagnerait à le traduire sans jargon plutôt qu'à se replier sur un message générique.

## Hors de ce document

Les **Pistes post-V1** du PRD ne sont pas des restes-à-faire : elles sont reportées, et n'entrent ici que le jour où un besoin réel les rappelle. Ne pas les instruire par anticipation — c'est exactement ce que le brief appelle de l'abstraction spéculative.

---

# Annexe — Index des exigences touchées

## Les 19 nouvelles (`FR-078` → `FR-096`)

| FR | Objet | Vient de |
|---|---|---|
| `FR-078` | Deux contenus par page (en cours / en ligne) | D1 |
| `FR-079` | Signaler les pages à modifications non publiées | D2 |
| `FR-080` | Abandonner le brouillon, revenir au contenu en ligne | D2 |
| `FR-081` | Publier formulaires et réglages par action explicite | D2 |
| `FR-082` | Jeu de pages défini par l'intégrateur | D3 |
| `FR-083` | Retirer du site une page publiée | D3 |
| `FR-084` | Navigation filtrée sur les pages publiées | D4 |
| `FR-085` | Index de références ; lien vers page non publiée non rendu | D4 |
| `FR-086` | Désigner un formulaire dans une zone de type formulaire | D5 |
| `FR-087` | État de la mise en ligne, consultable au retour | D6 |
| `FR-088` | Réduire l'image trop lourde au lieu de la refuser | D8 |
| `FR-089` | Aucun code tiers avant action explicite du visiteur | D11 |
| `FR-090` | Validation serveur de la soumission | D10 |
| `FR-091` | Total recalculé côté serveur | D10 |
| `FR-092` | Pas d'écrasement silencieux | D13 |
| `FR-093` | Délai de mise en ligne indépendant du volume publié | D16 |
| `FR-094` | Échec définitif d'acheminement signalé | D18 |
| ~~`FR-095`~~ | ~~Copie de la soumission au visiteur~~ — **retirée de la v1** le 2026-08-01, reportée en post-V1 | D18 |
| `FR-097` → `FR-099` | *Postérieures à la revue* — consulter, relancer et effacer une demande non acheminée : le filet de D18 reconstitué du côté de l'éditrice après le retrait de `FR-095` | *(hors revue)* |
| `FR-096` | Message de test déclenché par l'éditrice | D18 |

## Les 28 amendées

`FR-004` (aucune surface en v1) · `FR-012` (+ formulaire, + date) · `FR-015` (destination typée) · `FR-017` (portée : contenu vs téléversement) · `FR-019` (trois états) · `FR-023` (butée serveur) · `FR-024` (geste concret) · `FR-030` (enregistrer et prévisualiser) · `FR-031` (barème de fidélité) · `FR-035` (non bâtie, pas de redirection) · `FR-036` (conditions nominales) · `FR-038` (deux dates) · `FR-039` (traitement **serveur**) · `FR-040` (soumis à `FR-085`) · `FR-045` (bornes) · `FR-047` (ancré à `FR-078`) · `FR-048` (+ bornes incohérentes) · `FR-049` (à l'emplacement désigné) · `FR-055` (+ `FR-087`) · `FR-056` (sans intervention) · `FR-061` (réponse au visiteur) · `FR-063` (dans le respect de `FR-089`) · `FR-064` (acheminement **réussi**) · `FR-065` (ni collecte ni conservation) · `FR-069` (fournisseurs, vignette) · `FR-070` (destination typée) · `FR-073` (ancré à `FR-078`) · `FR-076` (+ formulaire dans la liste sans imbrication).

## Déplacements de périmètre

- **NON inclus → Pistes post-V1** : création de page par l'éditrice *(D3)*.
- **Entrées en NON inclus** : mesure d'audience embarquée *(D12)*, multi-devise *(D17)*, hébergement de fichiers vidéo *(D9)*, et l'absence de récupération automatique du stockage *(D7)*.
- **Entrées en Pistes post-V1** : HEIC *(D8)*, notification e-mail de publication *(D6)*, récupération automatique des médias *(D7)*, chiffre de fréquentation *(D12)*, vérification de délivrabilité *(D18)*.
