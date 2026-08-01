---
id: ADR-0011
title: Frontières de contenu hostile
status: accepted
date: 2026-08-01
authors: [arborescence-digital]
scope: packages/, apps/
supersedes: []
superseded-by: null
depends-on: [ADR-0004]
---

# ADR-0011 — Frontières de contenu hostile

**Statut :** accepted — 2026-08-01

> **Place dans la famille.** ADR-0011 fixe *ce que devient un contenu que le produit n'a pas écrit*. C'est la racine « sécurité » qui manquait à la chaîne documentaire (audit du 1<sup>er</sup> août 2026, constat A-01) : elle tient les trois frontières — entrée, rendu, transport — et rien d'autre. Elle commande le schéma de valeur de zone et le contrat de gabarit d'ADR-0004, la validation d'un téléversement, et de nouvelles cibles de test d'ADR-0005. Elle ne tranche **aucune** question propre à une surface : la route publique de soumission reste à ADR-0007, la forme de sortie de `toBlocks()` et l'isolement de l'aperçu SSR restent à ADR-0004.

---

## Contexte

Au 1<sup>er</sup> août 2026, un `grep` sur l'intégralité du corpus `brief → PRD → stack → ADR` ne retournait **aucune occurrence** de : XSS, sanitisation, échappement, CSP, SVG, requête paramétrée. Le vocabulaire de la sécurité applicative était absent de la chaîne documentaire.

Ce n'est pas une lacune de rédaction, c'est une lacune **mécanique**. Trois faits propres à ce projet la transforment en absence de protection :

1. **Ce qui n'est pas dans un `## Constraints` n'est appliqué par rien.** ADR-0002 pose que les vérifications déterministes — hooks `PreToolUse`, checks CI — sont compilées depuis ces sections. Une bonne pratique énoncée dans une prose de `stack.md`, ou dans le commentaire d'un extrait de code, n'est vérifiée par aucun automate.
2. **Le code n'est pas relu ligne à ligne.** Le brief l'écrit : « la confiance ne peut pas reposer sur la relecture humaine ». Le dispositif de confiance est mécanique, donc borné aux risques qu'il a nommés.
3. **Le code est majoritairement généré** (ADR-0006). Un générateur produit ce qui est *plausible*, pas ce qui est *sûr* : `z.record(z.unknown())` sur les `attrs` d'un nœud ProseMirror est la forme naturelle de « valide du JSON ProseMirror », et elle laisse passer un arbre porteur d'attributs arbitraires.

Le projet a su fermer la fuite de brouillon (ADR-0010) par une contrainte de forme **et** une cible de test, en refusant explicitement de s'en remettre à la vigilance. **Cet ADR applique à l'injection le traitement que le projet a su appliquer à la fuite de brouillon.**

Trois entrées, et trois seulement, portent du contenu que le produit n'a pas écrit :

| Entrée | Origine | Où elle ressort |
|---|---|---|
| Valeur de zone, définition de formulaire, réglage transverse | éditrice — authentifiée, mais `FR-014` interdit de faire confiance à son navigateur | site public (build), aperçu SSR, admin |
| Fichier téléversé (`FR-020` → `FR-023`) | éditrice | R2, puis site public et admin |
| Soumission de formulaire (`FR-048`, `FR-090`) | visiteur **anonyme** | message acheminé, corbeille admin (`FR-097`) |

Contraintes d'entrée :

- **Aucun code produit n'existe** (ni `apps/`, ni `packages/`) : les frontières sont choisies librement, une fois, avant d'avoir quoi que ce soit à réécrire.
- **Sharp est *build-only*** (ADR-0003) : le Worker ne peut pas réencoder un fichier à l'entrée. Il n'existe donc **aucun filet de réencodage** derrière la validation — elle est la seule barrière.
- **`FR-089` interdit tout code tiers avant une action explicite du visiteur.** Le site public n'a, en régime nominal, aucun script d'origine externe : une politique de contenu quasi-nominale y est atteignable sans friction, ce qui est rare.
- **Le rendu est remis au projet client** par le contrat de gabarit (ADR-0004), donc **hors du portail qualité** du cœur (ADR-0006, ADR-0009). Toute règle de rendu doit être portée par le **contrat** lui-même — une convention de code du cœur ne l'atteindrait pas.
- **`FR-100`** pose au niveau produit que le contenu saisi n'est jamais interprété comme une instruction, sur **toutes** les surfaces où il réapparaît, y compris privées. Cet ADR en est la traduction en architecture.

---

## Décision

### 1. Trois frontières, tenues chacune en un seul endroit

Le contenu hostile est arrêté à trois moments, et chacun est tenu à un seul endroit :

| Frontière | Où elle est tenue | Ce qu'elle garantit |
|---|---|---|
| **Entrée** | le schéma Zod d'entrée (`xxxInput`, ADR-0004 §a) | la donnée stockée ne peut pas porter de forme non prévue |
| **Rendu** | le **contexte de rendu déclaré** par le contrat de gabarit | la donnée est échappée selon l'endroit où elle atterrit |
| **Transport** | les en-têtes de réponse, posés une fois par surface | ce qui a fui malgré tout ne s'exécute pas |

**Aucune des trois ne rattrape le défaut d'une autre**, et c'est délibéré : chacune est écrite comme si les deux autres n'existaient pas. En particulier, **la neutralisation est une propriété du schéma d'entrée, jamais du rendu**. Un assainissement au rendu (nettoyer un arbre avant de l'afficher) serait la faute inverse : il laisserait la donnée hostile *en base*, où la surface suivante — un aperçu, un export, un message — la relirait sans le même filtre.

Ce que cette décision refuse explicitement : la « défense en profondeur » comme argument pour affaiblir une frontière. Trois barrières indépendantes, oui ; trois demi-barrières qui se supposent l'une l'autre, non.

### 2. Le schéma du texte riche est une allowlist fermée

Le texte riche est stocké en JSON ProseMirror (`stack.md`, `FR-015`). Ce choix est **structurellement plus favorable** que du HTML brut, et c'est probablement ce qui a fait passer le sujet sous le radar : un arbre typé n'est pas une chaîne à assainir. Mais cette sûreté n'est réelle **que si le schéma qui valide l'arbre est une allowlist fermée**.

Le schéma Zod d'une valeur de zone de texte riche énumère donc, exhaustivement :

- les `type` de **nœuds** autorisés (`doc`, `paragraph`, `heading`, `bulletList`, `listItem`, `text`… — la liste exacte est celle qu'expose l'îlot d'édition, et elle est **écrite**, pas dérivée) ;
- les **marques** autorisées (`bold`, `italic`, `link`…) ;
- pour chaque nœud et chaque marque, ses **attributs** autorisés, chacun avec son propre schéma — `level` d'un `heading` est un entier borné, l'attribut de la marque `link` est le `LinkTarget` typé de `stack.md`, jamais une chaîne libre.

**Tout ce qui n'est pas énuméré est rejeté** — pas ignoré, pas nettoyé, pas remonté en avertissement. Un attribut inconnu fait échouer la validation de la valeur entière, et l'écriture est refusée. La différence est décisive : une allowlist qui *ignore* l'inconnu accepte une donnée que le schéma dit ne pas comprendre, et fait dépendre la sûreté de la fidélité du renderer à ce même schéma.

Le piège à nommer, parce qu'il est le mode d'échec probable : `z.record(z.unknown())` sur les `attrs`. C'est ce qu'un générateur écrit naturellement pour « valider du JSON ProseMirror », c'est syntaxiquement correct, ça passe tous les tests fonctionnels — et ça annule toute la décision. **Il est donc interdit par la forme** (voir *Constraints*), à un endroit où un check peut le voir.

Conséquence assumée : ajouter une marque ou un attribut à l'éditeur devient un **geste de schéma**, pas un geste d'îlot. L'îlot React d'édition, qui produit ce JSON, est lui-même du code généré (ADR-0006 §5) que `FR-014` interdit de croire ; c'est le schéma serveur qui fait foi, et lui seul.

### 3. Le contexte de rendu est déclaré, jamais deviné

Les textes libres du produit n'atterrissent pas tous au même endroit. Un échappement uniforme « corps HTML » est **faux** pour la moitié d'entre eux :

| Contexte de rendu | Exemples (`FR`) | Règle |
|---|---|---|
| `html` — corps du document | texte riche (`FR-015`), libellés de champ (`FR-043`) | échappement natif du moteur de rendu ; jamais d'insertion de balisage |
| `attribute` — valeur d'attribut | `alt` d'une image (`FR-025`), attributs `name`/`for`/`id` d'un champ | échappement d'attribut, valeur toujours entre guillemets ; jamais de valeur qui compose un nom d'attribut |
| `url` — cible d'un lien | CTA (`FR-070`), liens de réseaux sociaux (`FR-071`, `FR-072`), marque `link` | schémas autorisés énumérés ; une adresse dont le schéma n'est pas énuméré n'est **pas rendue** |
| `meta` — `<title>`, `content` d'une `<meta>` | titre et description SEO (`FR-027`, `FR-028`) | échappement d'attribut, **plus** rejet des caractères de contrôle et des sauts de ligne |
| `text` — sortie non-HTML | corps du message acheminé, motif d'échec affiché (`FR-094`) | aucune interprétation ; la valeur est du texte, point |

Le **descripteur de gabarit** (ADR-0004) porte ce contexte pour chaque zone et chaque sous-champ. Le cœur en dérive ce qu'il dérive déjà du type : la validation, l'UI d'édition, et désormais la façon dont la valeur est remise au rendu.

**Il n'existe pas de contexte implicite.** Une zone dont le contexte n'est pas déclaré n'est pas rendue — pas rendue « au mieux ». C'est ce qui rend la règle opposable au **projet client**, qui écrit le rendu hors du portail qualité du cœur : le contrat porte l'information, l'intégrateur n'a pas à la déduire.

### 4. Le type réel d'un fichier est déterminé par sa signature d'octets

`FR-022` exige que le système vérifie le **type réel** d'un fichier, et écarte explicitement son nom et son extension. L'exigence est bien formulée ; elle n'était opérationnalisée nulle part.

- Le type réel est déterminé **côté Worker, par lecture des octets de signature** du fichier reçu. **Il est interdit de se fier au `Content-Type` de la requête multipart** — c'est une valeur fournie par le client, donc une violation directe de `FR-014` et de `FR-022` elle-même, et c'est l'implémentation la plus probable d'un générateur.
- La liste des types acceptés est **fermée** : `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Tout autre type est refusé.
- **`image/svg+xml` est interdit**, et son ajout exige un nouvel ADR. Un SVG est un document actif servi depuis l'origine du site : l'accepter, c'est un XSS stocké permanent. C'est aussi le format dont l'ajout est le plus tentant — logo, pictogramme — d'où l'interdiction nommée plutôt qu'une absence de la liste.
- L'**extension de la clé R2** dérive du type **détecté**, jamais du nom fourni. Aucun fragment d'un nom de fichier fourni n'entre dans une clé R2 : la clé est `media/{yyyy}/{mm}/{uuid}.{ext}` où `{ext}` est fonction du type détecté et de rien d'autre.

**Conséquence structurelle à ne pas manquer** : Sharp étant *build-only* (ADR-0003), le Worker **ne peut pas réencoder** le fichier à l'entrée — le réencodage, qui neutraliserait mécaniquement un fichier piégé, n'aura jamais lieu sur ce chemin. La réduction d'image de `FR-088` se fait dans le navigateur, donc du côté qu'on ne croit pas. **La validation par signature est la seule barrière**, et c'est pourquoi elle est écrite ici plutôt que laissée à l'implémentation.

### 5. En-têtes de réponse : deux surfaces, deux mécanismes, un point de pose chacune

Aucun document ne parlait d'en-têtes de réponse. Or une politique de contenu sur l'admin est la mesure d'atténuation la moins chère de toute la classe de risques traitée ici, et le site public s'y prête particulièrement bien.

| En-tête | Site public (statique) | Worker d'admin |
|---|---|---|
| `Content-Security-Policy` | quasi-nominale : `default-src 'self'`, aucune origine tierce en régime nominal (`FR-089`) ; les origines d'un lecteur vidéo ou de l'anti-robot ne sont ouvertes qu'aux directives qui les concernent | `default-src 'self'` ; `frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `same-origin` |
| `Permissions-Policy` | fonctionnalités non utilisées refusées | idem |

Deux règles de forme, plus importantes que les valeurs elles-mêmes :

1. **Un point de pose unique par surface.** Le site statique les déclare dans sa configuration de déploiement ; le Worker les pose dans son **middleware**, au même endroit que la vérification Access (ADR-0004 §e). Poser un en-tête route par route garantit qu'une route l'oubliera — et ce sera la nouvelle.
2. **`unsafe-inline` et `unsafe-eval` sont interdits**, sur les deux surfaces. C'est ce qui donne sa valeur à la politique ; l'admettre « le temps de faire marcher les îlots » revient à ne pas en avoir. Les îlots React d'édition (ADR-0004) sont contraints en conséquence : aucun style ni script inline, ce qui est une contrainte réelle et acceptée ici en connaissance de cause.

La politique exacte de l'aperçu SSR (`/preview/*`), qui rend du contenu `state='draft'` dans l'origine authentifiée, relève d'ADR-0004 : c'est une décision d'**isolement de surface**, pas d'en-têtes. Elle s'appuiera sur la présente section sans la répéter.

### 6. Ce que cet ADR ne ferme pas

Écrit ici pour que la racine dise où vivent ses suites, et pour qu'aucune ne soit rejouée deux fois :

- **La forme de sortie de `toBlocks()` et l'interdiction de `set:html`** → ADR-0004, puis la règle ESLint livrée avec le cœur et activée par le projet client → ADR-0008. Le § 3 donne le contexte de rendu ; il ne dit pas de quelle **forme** le renderer remet ses blocs.
- **La restriction `http(s)` du `LinkTarget` et `rel="noopener noreferrer"`** → ADR-0004. Le § 3 pose qu'un contexte `url` énumère ses schémas ; l'énumération concrète du `LinkTarget` vit avec le type.
- **L'isolement de l'aperçu SSR** (`/preview/*`) → ADR-0004.
- **Les bornes de taille et le plafond de volume d'une soumission** (`FR-101`, `FR-102`) → ADR-0007, avec le reste du chemin de soumission. Cet ADR trace vers ces exigences ; il n'en porte pas les contraintes.
- **Le bornage des journaux techniques** (`FR-104`) → ADR-0007, avec le motif d'échec conservé en base.

---

## Alternatives considérées (et pourquoi rejetées)

| Option | Idée | Rejet |
|---|---|---|
| **Assainir au rendu** (DOMPurify ou équivalent côté serveur) | Le contenu est stocké tel quel, nettoyé au moment de l'afficher | **La plus tentante**, et la plus fausse ici. Elle laisse la donnée hostile *en base* : la surface suivante — aperçu, message acheminé, corbeille, export — la relit sans le même filtre, et il y en a cinq. Elle fait aussi dépendre la sûreté d'une bibliothèque tierce chargée dans le Worker, alors que le produit tient à zéro dépendance hors écosystème. Enfin, elle ne s'applique pas au rendu du **projet client**, qui est hors du cœur. |
| **Stocker du HTML assaini** plutôt que du JSON ProseMirror | Une chaîne, nettoyée une fois à l'entrée | Perd le seul avantage structurel qu'on a : un arbre typé se valide par énumération, une chaîne HTML se valide par analyse. Rendrait aussi impossible la marque `link` typée (`stack.md`), donc `FR-085` — un lien vers une page dépubliée ne pourrait plus être retiré au rendu. |
| **Allowlist « ouverte »** : les nœuds inconnus sont ignorés au rendu | Tolérance aux évolutions de l'éditeur | Accepte en base une donnée que le schéma dit ne pas comprendre, et reporte la sûreté sur la fidélité du renderer au schéma. Le jour où un renderer client rend un nœud que le cœur ignorait, la barrière n'existe plus — et ce renderer est hors du portail. |
| **Type déterminé par le `Content-Type` multipart** | Le navigateur l'annonce déjà | Valeur fournie par le client : `FR-014` et `FR-022` l'écartent nommément. Sans réencodage possible (Sharp *build-only*), ce serait la seule barrière, et elle serait sous le contrôle de l'attaquant. |
| **CSP par `<meta http-equiv>`** | Pas de configuration de déploiement à toucher | Ne couvre pas `frame-ancestors`, arrive après le début de l'analyse du document, et n'existe pas pour les réponses non-HTML. Un en-tête réel coûte le même geste. |
| **Un ADR par frontière** (schéma / rendu / en-têtes) | Grain plus fin | Les trois frontières se justifient l'une par rapport aux autres — « aucune ne rattrape le défaut d'une autre » n'est écrivable qu'une fois qu'elles sont ensemble. Les scinder produirait trois ADR dont chacun renvoie aux deux autres pour son motif. |

---

## Conséquences

### Bénéfices

- **La classe entière a une racine.** `A-01` est refermé : il existe un ADR dont le `scope` est la sécurité applicative, et dont le `## Constraints` est compilable en hooks et en checks CI. Les lots suivants s'y raccrochent au lieu de disperser la règle.
- **Le mode d'échec probable est interdit par la forme**, pas par la vigilance : `z.record`, `z.any`, `.passthrough()` sur un schéma de valeur de zone sont détectables par un check, exactement comme l'absence de filtre `state` l'est pour ADR-0010.
- **Le contrat de gabarit devient opposable au projet client** sur l'échappement : le contexte est une **donnée** du descripteur, pas une convention que l'intégrateur devrait connaître.
- **La CSP du site public est quasi gratuite** — `FR-089` avait déjà payé son prix en interdisant tout code tiers avant action du visiteur.
- **De nouvelles cibles de test nommées** pour ADR-0005, au même rang que « aucune fuite de brouillon » : attribut non énuméré rejeté, fichier dont la signature contredit l'extension refusé, en-têtes présents sur le HTML bâti.

### Risques et vigilance

- **L'allowlist fermée a un coût récurrent.** Chaque évolution de l'éditeur de texte riche est un geste de schéma. C'est le prix de la décision, et il est payé volontairement : une allowlist qu'on élargit par confort redevient ouverte en trois itérations.
- **Aucun filet de réencodage** sur les téléversements. La validation par signature est seule ; si elle est mal implémentée, rien derrière ne rattrape. D'où la cible de test dédiée plutôt que la confiance.
- **`unsafe-inline` interdit contraint les îlots React.** Un composant ou une bibliothèque qui exige du style inline devra être écarté ou adapté ; le constater tard coûterait un remaniement d'îlot.
- **La contrainte de rendu s'applique à du code hors du portail.** Le projet client n'est pas vérifié par la CI du cœur : la règle est portée par le contrat et par la checklist de provisionnement (ADR-0008), pas par un automate du dépôt. C'est la faiblesse structurelle assumée de la frontière cœur/client.
- **Les règles écrites ici ne mordent pas encore.** Tant que `packages/` et `apps/` n'existent pas, aucun check ne peut s'exécuter : les constats mécanisables restent `En cours` au suivi de l'audit jusqu'à ce que la mécanisation soit livrée.

---

## Seuils qui feraient reconsidérer

- Si l'incorporation de **SVG** entrait au périmètre (logo vectoriel, pictogramme éditable), le § 4 serait à rouvrir par un ADR dédié — assainissement, service sur une origine distincte, ou rendu en image matricielle au build : trois décisions différentes, aucune triviale.
- Si un type de zone devait accepter du **HTML fourni par l'éditrice** (incorporation d'un tiers, extrait de code), le § 2 ne s'appliquerait plus tel quel et cet ADR serait à amender, pas à contourner.
- Si un **tiers côté visiteur** devenait nécessaire sur le site public, la politique de contenu quasi-nominale du § 5 tomberait, et `FR-089` avec elle : ce serait une décision de produit avant d'être une décision de sécurité.
- Si le rendu revenait dans le cœur (fin du contrat de gabarit), le § 3 pourrait être tenu par le type plutôt que par une déclaration — mais ce serait une rupture d'ADR-0004 et d'ADR-0008.

---

## Constraints

> Règles impératives et vérifiables — compilées en hooks `PreToolUse` / checks CI et en cibles de test (cf. ADR-0002, ADR-0005, ADR-0006).

- **OBLIGATOIRE** : le schéma Zod d'entrée d'une valeur de zone de texte riche énumère exhaustivement les `type` de nœuds, les marques, et pour chacun ses attributs autorisés avec leur propre schéma.
- **INTERDIT** : qu'un schéma de valeur de zone accepte un nœud, une marque ou un attribut non énuméré. Un élément inconnu **rejette** la valeur ; **INTERDIT** de l'ignorer, de le nettoyer ou de le remonter en avertissement.
- **INTERDIT** : `z.any()`, `z.unknown()`, `z.record(...)` et `.passthrough()` dans un schéma de valeur de zone ou de définition de formulaire.
- **OBLIGATOIRE** : la neutralisation du contenu hostile est une propriété du **schéma d'entrée** ; **INTERDIT** de la déléguer au rendu — aucune fonction d'assainissement à l'étage de rendu.
- **OBLIGATOIRE** : le descripteur de gabarit déclare le **contexte de rendu** (`html`, `attribute`, `url`, `meta`, `text`) de chaque zone et de chaque sous-champ ; **INTERDIT** de rendre une valeur dont le contexte n'est pas déclaré.
- **OBLIGATOIRE** : un contexte `url` énumère les schémas d'adresse autorisés ; une adresse dont le schéma n'est pas énuméré n'est pas rendue.
- **OBLIGATOIRE** : le type réel d'un fichier téléversé est déterminé par lecture de sa **signature d'octets** côté Worker ; **INTERDIT** de se fier au `Content-Type` de la requête ou à l'extension du nom fourni.
- **OBLIGATOIRE** : la liste des types acceptés est fermée à `image/jpeg`, `image/png`, `image/webp`, `image/avif` ; **INTERDIT** d'accepter `image/svg+xml` sans un nouvel ADR.
- **OBLIGATOIRE** : l'extension d'une clé R2 dérive du type **détecté** ; **INTERDIT** qu'un fragment d'un nom de fichier fourni entre dans une clé R2.
- **OBLIGATOIRE** : toute réponse HTML porte `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` et `Permissions-Policy`, posés en **un point unique par surface** (configuration de déploiement pour le site, middleware pour le Worker) ; **INTERDIT** de les poser route par route.
- **INTERDIT** : `unsafe-inline` et `unsafe-eval` dans la politique de contenu, sur le site public comme sur l'admin.

## Related

- Impose : `FR-100` (contenu saisi jamais interprété comme instruction), `FR-013`, `FR-014`, `FR-015`, `FR-021`, `FR-022`, `FR-025`, `FR-027`, `FR-028`, `FR-070`, `FR-071`, `FR-072`.
- Trace vers : `FR-101` (bornes de taille), `FR-102` (plafond de volume), `FR-103` (bornage des médias), `FR-104` (PII hors journaux) — exigences transverses du PRD dont les contraintes vivent dans les ADR de surface (ADR-0007).
- Sert : `SC-005` (site public sans runtime ni tiers), `SC-007` (une demande de devis parvient à la cliente sans que la route publique devienne une surface d'injection).
- Complète : ADR-0004 — le schéma d'entrée (§a), le contrat de gabarit et le seam `AssetResolver` sont les endroits où ces frontières se tiennent.
- Appelle : ADR-0004 (forme de sortie de `toBlocks()`, interdiction de `set:html`, restriction `http(s)` du `LinkTarget`, isolement de `/preview/*`), ADR-0007 (bornes et journaux du chemin de soumission), ADR-0008 (règle ESLint livrée avec le cœur, checklist de provisionnement), ADR-0005 (cibles de test correspondantes).
- Origine : [audit de sécurité du 2026-08-01](../audit-securite-2026-08-01.md), constats `A-01` (racine), `A-02` (allowlist du texte riche), `C-07` (type réel et SVG), `C-12` (en-têtes et CSP), `C-17a` (contextes d'échappement).
