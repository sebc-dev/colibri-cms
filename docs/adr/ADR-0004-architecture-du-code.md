---
id: ADR-0004
title: Architecture du code (cœur packagé + tranches par contenu)
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: packages/, apps/
supersedes: []
superseded-by: null
depends-on: [ADR-0003]
---

# ADR-0004 — Architecture du code (cœur packagé + tranches par contenu)

**Statut :** accepted — 2026-07-17 · *amende le draft du 2026-07-10 (ex-hybride A+B centré éditorial)*

> **Place dans la famille.** ADR-0004 fixe *comment le code est découpé et qui importe qui*. Les seams définis ici (contrat `@colibri/db`, `writeHandler`, `AssetResolver`, JWKS injectable, **contrat de gabarit**, seams e-mail/Turnstile) sont les cibles directes d'ADR-0005 (test), les points de contrôle d'ADR-0006 (génération IA), et la frontière que le versionnage de flotte d'ADR-0008 exploite.

---

> **Amendement 2026-07-17 — ce qui a changé depuis le draft du 10 juillet.** Le périmètre est passé d'un CMS éditorial (Article/Auteur/Tag) à un CMS **centré page + constructeur de formulaires** (cf. brief, PRD). Quatre conséquences structurelles :
> 1. **Fin des tranches `article/author/tag`** et de `baseEditorialDocument` (Article ∩ Page) : il ne reste qu'un seul type de document, la **Page**, décrite par des **gabarits** et des **zones typées**. Le seam `ContentTypeDescriptor` reste **dormant** pour le retour de l'éditorial en V2.
> 2. **Deux surfaces d'écriture nouvelles** : la gestion des **formulaires** (admin) et l'**endpoint public de soumission** — première route d'écriture **non protégée par Access**.
> 3. **Frontière cœur / site client** imposée par le mécanisme de versionnage (ADR-0008) : le cœur est un ensemble de **paquets versionnés** consommés par un **projet client privé**. Le **contrat de gabarit** devient un seam de premier plan.
> 4. **Nouveaux seams injectables** : envoi d'e-mail (~~Email Routing~~ **Cloudflare Email Service** — *corrigé le 2026-08-01, amendement (c) : Email Routing est le courrier entrant*) et vérification anti-spam (Turnstile), au même titre que le JWKS.

---

> **Amendement 2026-08-01 — suites de la revue du PRD.** [ADR-0010](./ADR-0010-modele-brouillon-publie.md) introduit le **modèle à deux contenus** ; quatre conséquences sur cet ADR :
> 1. **Le contrat de gabarit gagne quatre déclarations** : zone de type **formulaire** (FR-086), zone de type **date** (FR-012), **ordre et libellés du menu** (FR-084, filtré au build sur les pages en ligne), et **destination typée** d'un lien — page du site ou adresse externe (FR-015, FR-070). L'éditrice ne saisit jamais une adresse interne.
> 2. **Deux surfaces nouvelles** : l'**index de références** (FR-085) et l'**état de la mise en ligne** (FR-087). Voir §§ h et i.
> 3. **Le caveat « accès D1 au build » est levé.** Un build Workers Builds s'exécute dans un conteneur CI, pas dans workerd : aucun binding n'y existe. Le build lit D1 par l'**API REST** (`POST …/d1/database/:id/query`). L'architecture avait prévu le cas — le build fournit son adaptateur à `db` : cet adaptateur est **HTTP**.
> 4. **Les lectures de `@colibri/db` sont typées par état** : deux fonctions distinctes, jamais une fonction générique paramétrée par l'état (ADR-0010, *Constraints*).

---

> **Amendement 2026-08-01 (b) — fidélité de l'aperçu et coût du build dans la durée.** Deux
> conséquences de l'architecture que la revue du PRD a mises au jour, et qui n'étaient portées que
> par son document de suivi, depuis clos et supprimé.
>
> **1. L'aperçu ne peut pas rendre *exactement* le site public, et le PRD ne doit pas le promettre.**
> `FR-031` disait « le même rendu que le site public ». Inatteignable au pied de la lettre : le site
> est bâti avec **Sharp**, réservé à `apps/site` et **build-only** (ADR-0003) ; l'aperçu est rendu
> par le Worker d'admin, où Sharp n'existe pas. Le pipeline d'images ne **peut** pas être le même.
> Laissé tel quel, ce FR aurait forcé l'implémentation à inventer seule le barème d'une vérification
> observable. Le barème est donc écrit : **mêmes gabarits et mêmes styles ⇒ mise en page, textes et
> cadrage des images identiques** ; encodage et poids des fichiers **libres**. C'est ce que
> l'anti-dérive de cet ADR garantit réellement — un renderer partagé, pas un pipeline d'images
> partagé.
>
> Corollaire côté produit, déjà porté par `FR-030` : l'aperçu affiche l'état **enregistré**, donc le
> bouton est « **Enregistrer et prévisualiser** ». Sans cela, elle modifie trois zones, clique
> « Aperçu », et voit la version d'avant — l'aperçu lui ment au moment précis où elle cherche à se
> rassurer. Écarté : rendre l'état non enregistré, c'est-à-dire un chemin de rendu parallèle, donc
> exactement la dérive que cet ADR existe pour fermer.
>
> **2. `SC-004` (publication en moins de 5 minutes) pouvait être validé à la recette puis devenir
> faux tout seul.** Le build reconstruit **tout le site** : son coût est proportionnel au **volume
> total de médias publiés**, pas à ce qui a changé. Au lancement, trente photos : une minute, tout
> le monde signe. Un an plus tard, six galeries et trois cents photos : corriger une **virgule**
> relance le réencodage des trois cents, le délai franchit les cinq minutes et le quota de build
> (`SC-001`) est mangé. C'était le seul critère de succès du PRD capable de pourrir par l'usage
> normal. → `FR-093` : le délai **ne croît pas** avec le volume déjà publié, ce qui impose des
> **dérivés d'image persistés en R2** entre deux mises en ligne (cf. `stack.md`) — délibérément
> plutôt que via le cache de build de la plateforme, qu'on ne contrôle pas. → `SC-004` se mesure
> **sur un site à volume réaliste**, jamais sur un site neuf. → La **première** mise en ligne, ou la
> première après un changement de gabarit invalidant tous les dérivés, peut légitimement dépasser
> cinq minutes : c'est un événement d'intégrateur, pas un geste d'éditrice.
>
> **3. Motif de la surface `FR-087` (§ i), pour qu'elle ne soit pas prise pour un confort.** La
> publication est asynchrone. `FR-055`, `FR-056` et `FR-057` promettaient de « signaler » et
> d'« expliquer » — à quelqu'un qui a fermé l'onglet depuis deux minutes. Elle publie, recharge son
> site, ne voit rien : lent, cassé, ou a-t-elle mal cliqué ? Aucun moyen de trancher, donc **elle
> appelle l'agence**, sur le geste le plus chargé du parcours et contre `SC-003`. L'état de mise en
> ligne consultable **au retour** est ce qui donne enfin un destinataire à ces trois exigences.
> Écarté pour la v1 : la **notification e-mail** de fin de publication — canal, gabarit et
> délivrabilité à construire pour un gain marginal, puisqu'elle regarde son site dans la minute.

---

> **Amendement 2026-08-01 (c) — le cœur face au contenu hostile.** Suites de l'[audit de
> sécurité du 1<sup>er</sup> août 2026](../audit-securite-2026-08-01.md) (lot L3). La racine
> est [ADR-0011](./ADR-0011-frontieres-de-contenu-hostile.md), qui tient l'entrée (schéma), le
> rendu (contexte déclaré) et le transport (en-têtes) ; son § 6 nomme ce qu'elle **laisse** à
> cet ADR, parce que ce sont des décisions d'**architecture du cœur** et non de frontière :
> la forme que prend un bloc rendu, la façon dont le SQL est écrit, l'endroit d'où une surface
> répond. Les six points ci-dessous les tranchent. Ils ferment `A-03`ᵖ, `B-02`, `B-05`, `B-07`,
> `B-10`ᵖ, `C-01`, `C-15`, `C-17b`, `D-02` et `D-04`.
>
> **1. `toBlocks()` retourne un arbre structuré, jamais une chaîne de balisage** *(A-03)*.
> Le cœur produit des `RenderBlock[]` et les remet à des composants Astro qu'il ne contrôle
> pas. Astro échappe `{expression}` par défaut — mais **pas** `set:html`, et un renderer qui
> remettrait du texte riche sous forme de HTML sérialisé serait très naturellement consommé par
> un `set:html`. Toute la protection du cœur serait alors annulée dans un fichier du **projet
> client**, hors du dépôt open source donc hors du portail qualité (ADR-0006, ADR-0009) — la
> faille la plus difficile à rattraper *a posteriori*, puisqu'elle se répète à chaque nouveau
> client. La forme de sortie est donc **partie du contrat de gabarit** : un **arbre de blocs
> typés**, chaque nœud portant son type, ses attributs déjà validés par le schéma d'entrée et
> son **contexte de rendu** (ADR-0011 § 3) ; le gabarit client le rend **nœud par nœud**, avec
> l'échappement natif du moteur. C'est le seul choix qui rende `set:html` **inutile** — donc
> interdisable sans rien retirer à l'intégrateur. L'application hors du cœur (règle ESLint
> livrée avec le paquet, activée par le projet client, et checklist de provisionnement) revient
> à ADR-0008 : le `## Constraints` d'ici ne mord que sur le cœur.
>
> **2. Toute requête D1 est paramétrée** *(B-05)*. L'architecture **localise** parfaitement le
> SQL — tout dans `@colibri/db`, jamais dans `apps/*` — mais n'a jamais imposé qu'il soit
> paramétré : `createRepository` (§ d) en donne un exemple, et un exemple n'est pas une règle.
> L'écart est frappant, ADR-0006 nommant « SQL confiant mais erroné » comme mode d'échec
> attendu de la génération sans qu'aucun de ses contrôles ne regarde le SQL. Donc : `.bind()`
> sous workerd, champ `params` de l'API REST pour l'**adaptateur HTTP du build**. Aucune clause
> construite par interpolation, **y compris** un nom de colonne — qui vient d'une allowlist
> d'identifiants écrite en code, jamais d'une donnée — et **y compris** une clause `IN` de
> longueur variable, dont seule la liste de **placeholders** se dérive du *nombre* de valeurs,
> les valeurs passant par les paramètres. La règle vaut pour le build autant que pour le
> runtime : ce chemin-là lit le contenu **qui devient le site public**.
>
> **3. L'aperçu SSR est du contenu non fiable dans une origine privilégiée** *(B-02)*.
> `GET /preview/:slug` rend du `state='draft'` — le contenu le moins validé du système, celui
> qui n'a pas franchi les vérifications de publication d'ADR-0010 § 5 — dans l'origine où vivent
> les endpoints `writeHandler({auth:'access'})` et la session Access de 7 jours. Un contenu
> piégé qui s'y exécute peut publier, changer l'adresse de destination d'un formulaire,
> déclencher un Deploy Hook. **Le CSRF `checkOrigin` n'y protège de rien** : la requête *vient*
> de la bonne origine — c'est le point à ne pas manquer. Décision, en deux barrières
> indépendantes, comme l'exige ADR-0011 § 1 :
> - l'aperçu est servi sur un **nom d'hôte distinct** de celui des endpoints d'écriture, sous
>   la **même politique Access** — ADR-0003 (b) a déjà établi qu'Access protège un *nom d'hôte*
>   et non un Worker ; un second hôte coûte une application Access et rien d'autre ;
> - cette surface porte sa **propre politique de contenu** : aucun script inline,
>   `frame-ancestors 'none'`, aucune origine tierce.
>
> Deux conséquences à écrire ici plutôt qu'à découvrir à l'implémentation. L'hôte distinct est
> un **sous-domaine du même apex** que l'admin : sinon les requêtes d'images de la page
> d'aperçu deviennent *cross-site*, le cookie Access ne les accompagne plus, et l'aperçu perd
> ses images. Et `frame-ancestors 'none'` tranche que l'aperçu s'ouvre dans **son propre
> onglet**, jamais dans une iframe de l'admin — cohérent avec le bouton « Enregistrer et
> prévisualiser » de l'amendement (b). ADR-0011 § 5 (« un point de pose unique **par surface** »)
> reste tenu : cet hôte *est* une surface, avec son point de pose ; aucun en-tête n'est posé
> route par route.
>
> **4. Le service d'un média hors build** *(B-07, B-10)*. Le seam `AssetResolver` (§ b) existait ;
> ce vers quoi il résout **hors build** n'était écrit nulle part, alors que ce détail décide
> entièrement de la sévérité. Un média est persisté en R2 **avant** publication (FR-017) et
> l'aperçu le sert brut. Donc, pour tout média servi hors du build :
> - `Content-Type` issu du **type détecté à l'entrée** (celui qu'ADR-0011 § 4 fait déterminer
>   par signature d'octets, conservé sur la ligne `media`), jamais du fichier ni des métadonnées
>   R2 héritées du téléversement ;
> - `X-Content-Type-Options: nosniff` et `Content-Disposition: inline; filename=` **normalisé**,
>   le nom dérivant de l'identifiant du média et de l'extension détectée — aucun fragment du nom
>   fourni, même règle que pour la clé R2 ;
> - servi depuis la **surface non fiable du point 3**, jamais depuis l'origine de l'admin ; le
>   bucket n'est **jamais public**, faute de quoi une image de brouillon jamais publiée serait
>   lisible par qui obtient son URL — les clés en UUID sont une atténuation, pas un contrôle
>   d'accès.
>
> **La conséquence structurelle est à nommer** : Sharp étant *build-only* (ADR-0003), le Worker
> **ne peut pas réencoder** un fichier à l'entrée. Le seul réencodage du produit — qui est aussi
> la seule neutralisation mécanique d'un fichier polyglotte — n'a lieu que sur le chemin du site
> public. La validation par signature est donc la **seule barrière d'entrée**, et ces en-têtes
> sont ce qui empêche ce qui l'a franchie de s'exécuter. L'extension aux **assets** de
> l'invariant « rien de rendu au visiteur ne vit hors des deux contenus » (ADR-0010 § 8) relève
> d'ADR-0010, pas d'ici.
>
> **5. `verifyAccessJwt` est fail-closed, et `users` n'est pas une liste d'autorisation**
> *(C-01, D-02)*. La validation du JWT était **exigée dans son principe** (§ e, § f) sans que
> « valider » ait jamais été défini. Or ADR-0006 pose que le mode d'échec attendu de la
> génération est « un contrôle d'accès qui *semble* présent » : une validation qui vérifie la
> signature mais pas l'audience — donc acceptant un JWT émis pour une autre application Access
> du même compte — est exactement le bug que rien n'attraperait. Donc `verifyAccessJwt` vérifie
> la **signature** contre le JWKS du *team domain*, l'**audience** (`aud` = tag de l'application
> Access), l'**émetteur** (`iss`) et l'**expiration** (`exp`, `iat`). Tout échec refuse —
> **y compris l'impossibilité d'obtenir le JWKS** : un JWKS injoignable **ferme** l'admin, il ne
> l'ouvre pas, et il n'existe aucun chemin « dégradé » qui accepterait le jeton sur la foi d'un
> cache. Corollaire d'identité : **Access est l'unique source d'autorisation** ; `users`
> enregistre l'identité (résolution `email→users`, § e) et n'est **jamais** consulté comme liste
> d'accès — deux listes divergeraient, et c'est celle qui n'est pas Access qui gagnerait au
> mauvais moment. Le cache KV porte la résolution d'identité, à TTL borné ; jamais la décision
> d'autorisation.
>
> **6. `FR-090` et `FR-091` remontent dans la tête du pipeline** *(C-15)*. Le § e élimine par la
> forme le risque « endpoint sans contrôle », mais la **validation contre la définition
> `state='live'`** et le **recalcul du total** — les deux mécanismes qu'ADR-0007 amendement (a)
> décrit comme sa raison d'être (« le total venait du visiteur — 5 € annoncés pour une pièce à
> 500 € ») — vivaient dans `run`, du code applicatif généré, sans garantie de forme.
> L'argument « éliminé par la forme » ne couvrait donc pas les deux règles les plus importantes
> de la seule route publique. Une **troisième forme** est introduite :
> `writeHandler({ auth: 'public', against: 'live-form-definition' })`, dont la tête se déroule
> `vérif Turnstile → relecture de la définition state='live' → Zod dérivé de cette définition →
> recalcul du total → run`. À ne pas confondre avec « une troisième voie » : `auth` garde ses
> **deux** valeurs et l'affirmation du § e tient inchangée — `against` **module la tête
> `public`**, il n'ouvre pas une famille d'autorisation supplémentaire.
>
> **Au passage — deux corrections que cet amendement porte parce qu'aucun autre lot ne les prend.**
>
> - **Les signatures `getBySlug(…, { includeDrafts:true })` du § Les flux sont renversées.**
>   Elles sont antérieures à [ADR-0010](./ADR-0010-modele-brouillon-publie.md) et contredisent
>   frontalement son interdiction d'une **fonction générique paramétrée par l'état** : un
>   drapeau booléen est précisément la forme qui rend « le pire bug possible du produit » — une
>   lecture de brouillon depuis le build — accessible par une faute d'appel. Le § Les flux est
>   raturé et corrigé en deux fonctions distinctes et typées.
> - **« Email Routing » se lit « Cloudflare Email Service »** *(D-04)*. Email Routing est le
>   service de courrier **entrant** ; ce n'est pas le service d'envoi. La confusion est
>   contagieuse dans un projet où un agent lit cet ADR en Plan Mode avant d'implémenter : elle
>   produirait le mauvais service. Les occurrences du corps sont raturées sur place. Celle du
>   § Topologie vit **dans un bloc de code**, où le barré Markdown ne rend pas : elle est
>   corrigée **en place**, et le fait est déclaré ici pour que le diff ne se lise pas comme une
>   suppression silencieuse.

---

## Résumé exécutif

Deux règles porteuses inchangées : un **noyau pur** (`@colibri/core`, zéro dépendance Cloudflare) et un **contrat de lecture unique** (`@colibri/db`) partagé par le site (build SSG) et l'admin (SSR), qui empêche toute dérive entre les deux surfaces lisant les mêmes données. À cela s'ajoute la contrainte neuve du versionnage de flotte : le code se sépare en un **cœur packagé** (moteur réutilisable, open source, versionné SemVer) et un **projet client privé** qui l'épingle et fournit ses **gabarits, thème et configuration**. Le **contrat de gabarit** est l'interface entre les deux : le projet client déclare la *structure* de ses pages (zones typées) et fournit leur *rendu*, sans jamais éditer le cœur. Les frontières sont rendues **mécaniques** dès l'Étape 0 (ESLint `no-restricted-paths` / dependency-cruiser en CI).

---

## Contexte

Contraintes héritées d'ADR-0003, du PRD et du mécanisme de versionnage (ADR-0008) :

- **Pas d'API REST publique** : accès direct aux bindings D1/R2/KV (« Local API pattern »). Aucun contrat réseau n'empêche site et admin de diverger — c'est l'architecture qui doit le fournir.
- **Deux surfaces lisent les mêmes données** : le build SSG (`apps/site`) et la preview SSR (`apps/admin`). Duplication = dérive.
- **Renderer partagé** entre SSG et preview SSR (contenu de page → HTML) : un bug s'y propage partout.
- **Contrôle d'accès réappliqué explicitement** dans chaque endpoint d'écriture admin (FR-003).
- **Une nouvelle route d'écriture publique** : la soumission de formulaire (FR-061), non authentifiée, protégée par Turnstile (FR-063) et non par un JWT Access.
- **Zones typées déclarées par le gabarit** (FR-007, FR-012, FR-074) ; l'éditrice remplit, ne restructure pas (FR-011, FR-016, FR-077). Exception : elle **compose** les formulaires (FR-041).
- **Cœur versionné, client épinglé, zéro code divergent par client** (SC-008, ADR-0008) : le sur-mesure vit dans le projet client, pas dans le cœur.
- **Middleware Astro classique** imposé pour l'auth (ADR-0003 §risque 2, bug OOM #17181).

---

## Décision

### Les deux règles porteuses

1. **Règle du noyau.** Ce qui doit être *identique partout* et *agnostique au gabarit* (renderer, calcul de total de formulaire, verrou, slug, pipeline d'auth) vit dans un noyau mince. Le reste **compose** le noyau, ne le ré-implémente jamais.
2. **Règle du contrat.** Toute lecture consommée par le site **et** l'admin vit dans `@colibri/db`. Une app n'écrit jamais son propre SQL de lecture.

Rendues exécutables : un import de Cloudflare dans `core`, ou d'`apps` dans `db`, casse la CI.

### Frontière cœur / site client (nouveau — ADR-0008)

```
  [ CŒUR — paquets versionnés, open source ]
  @colibri/core  ←  @colibri/db  ←  apps/{site,admin}   (le « moteur »)
                                          ▲
                                          │  contrat de gabarit (épinglé, SemVer)
                                          │
  [ SITE CLIENT — projet privé, non forké ]
  gabarits/ (structure + rendu)  theme/  config d'instance (bindings, e-mails)
```

Le **cœur** ne contient aucun gabarit client. Le **projet client** ne contient aucune logique de moteur : il déclare ses gabarits et fournit leur rendu via le **contrat de gabarit**, épingle une version du cœur, et porte sa configuration d'instance. Mettre à jour un client = bumper la version épinglée (ADR-0008).

### Le contrat de gabarit (seam de premier plan)

Un gabarit a **deux faces**, et le contrat les sépare :

- **Descripteur de structure** (consommé par le **cœur**) : `template key → liste ordonnée de zones { key, type, required, … }`. Pour une zone **répéteur**, le descripteur porte la **forme d'un élément** (sous-champs typés, FR-074). Le cœur en dérive **trois choses** : l'UI d'édition admin (quelles zones afficher), la **validation Zod** des valeurs de zone (FR-013), et la forme attendue de `page_zone_values`.
- **Rendu** (fourni par le **projet client**) : les composants Astro qui rendent chaque gabarit et chaque zone (dont le mode d'affichage d'une galerie — grille/carrousel, FR-068). Consommé par le build SSG et la preview SSR.

Le descripteur est **données** (typé, versionné, possédé par l'intégrateur dans le projet client) ; le rendu est **code du projet client**. Le cœur ne connaît que le descripteur ; il ignore à quoi ressemble une page.

### Topologie des packages

```
packages/                          # CŒUR (versionné, open source)
  core/                            # PUR — zéro dépendance Cloudflare/Astro/React
    zone/                          # schémas Zod par type de zone (Row/Input)
    renderer/                      # toBlocks() PUR + interface AssetResolver
    form/                          # calcul du total PUR (somme des contributions)
    slug.ts  lock.ts
    gabarit.ts                     # types du contrat de gabarit (descripteur)
    content-type.ts                # ContentTypeDescriptor V2 — présent mais DORMANT
  db/                              # bindings en paramètre — contrat de lecture unique
    repository.ts                  # createRepository() : verrou hérité
    page/  media/  form/  settings/  user/     # tranches par contenu
apps/                              # CŒUR — le « moteur » consommé par le client
  site/                            # build SSG → db + renderer (résolveur BUILD, Sharp)
  admin/
    lib/env.ts                     # parseEnv(env) via Zod
    lib/auth.ts                    # verifyAccessJwt, JWKS injectable
    lib/handler.ts                 # writeHandler — pipeline non-contournable
    lib/mailer.ts                  # seam d'envoi (Email Service — corr. amdt (c)), injectable
    lib/turnstile.ts              # seam de vérification anti-spam, injectable
    middleware.ts                  # Access JWT global (admin) + CSRF checkOrigin
    pages/api/…                    # endpoints minces (admin + soumission publique)
    pages/preview/…                # SSR → db + renderer (résolveur PREVIEW)
    islands/…                      # React : éditeur de zones, constructeur de formulaires
```

### Décisions de conception fines

**a. Deux schémas Zod par surface de donnée, jamais un.**
- `xxxRow` valide ce qui **sort** de D1 (id, timestamps, verrou) — parse défensif, aucun `any` qui fuit du binding.
- `xxxInput` valide ce que l'éditrice (ou le visiteur) **soumet**. C'est **lui** la frontière Zod côté endpoint (FR-014, FR-042, FR-048). Pour une **valeur de zone**, le schéma d'entrée est **dérivé du descripteur de gabarit** (le type de la zone détermine le Zod ; répéteur → liste d'items conformes à la forme déclarée, FR-076).
- Confondre les deux casse soit le verrou, soit la sécurité.

**b. Renderer en deux temps + seam `AssetResolver`.**
- `toBlocks(...)` est **pur, déterministe, synchrone** — cœur de test n°1, partagé site+preview.
- Une image ne connaît qu'un `media_id` ; sa résolution est **injectée** via `AssetResolver` : site (build) → `<Image>` Astro + Sharp ; admin (preview) → URL R2 brute. Preview et build appellent le **même** `toBlocks` et la **même** requête `db` → le rendu ne peut pas diverger.

**c. Calcul du total de formulaire, pur.**
Le total est une **somme des contributions** (montants des choix sélectionnés + valeur×prix unitaire), calculée par une fonction **pure** de `@colibri/core` (FR-050), partagée entre le calcul côté navigateur et la vérification éventuelle côté serveur. Aucune règle conditionnelle (hors périmètre). Cible de test unitaire pur (ADR-0005).

**d. Repository primitif à verrou atomique.**
`createRepository()` implémente `UPDATE … WHERE id=? AND updated_at=?` : le verrou (jeton `updated_at`) est **atomique dans le SQL**. `changes === 0` ⇒ `OptimisticLockError` → 409. Chaque tranche en hérite. *(En V1, l'édition concurrente est hors périmètre — une éditrice — mais le primitif existe : il ne coûte rien et évite un écrasement accidentel deux-onglets.)*

**e. `writeHandler` — deux familles de routes, un seul pipeline.**
Un endpoint d'écriture **est** un `writeHandler({ auth, schema, authorize?, run })`. Le pipeline se déroule toujours avant `run` ; sa **tête varie selon `auth`** :
- `auth: 'access'` (admin, défaut) : `JWT Cf-Access-Jwt-Assertion → CSRF checkOrigin → résolution user (email→users, cache KV) → Zod → authorize → run`.
- `auth: 'public'` (soumission de formulaire) : `vérif Turnstile → Zod → run` (pas de JWT, pas de user — le visiteur est anonyme). CSRF et anti-abus assurés par Turnstile.

On **ne peut pas** livrer une route d'écriture qui saute sa tête de pipeline : le risque « endpoint sans contrôle » est éliminé par la forme, et une route publique **doit** déclarer `auth: 'public'` (donc passer Turnstile) — il n'existe pas de troisième voie « ni Access ni Turnstile ».

**f. Config env + seams injectables (JWKS, mailer, Turnstile).**
`parseEnv(env)` via Zod, **une fois** en bordure d'app. Trois points d'injection existent **dès le code de prod** (exigence d'ADR-0005) :
- `verifyAccessJwt(token, { jwks })` — `createRemoteJWKSet` par défaut, `createLocalJWKSet` en test.
- `sendMail(msg, { mailer })` — ~~Email Routing~~ **Cloudflare Email Service** *(corrigé le 2026-08-01, amendement (c))* par défaut, **mock** en test (jamais d'envoi réel — garde-fou free tier).
- `verifyTurnstile(token, { verifier })` — appel siteverify par défaut, **stub** en test.

**h. Index de références — dérivé par une fonction pure, stocké pour être interrogeable** *(2026-08-01, FR-085)*.
`extractReferences(descripteur, valeur) → Ref[]` est **pure** et vit dans `@colibri/core` : elle sait, pour un type de zone donné, quelles cibles une valeur désigne (page, formulaire, média). `@colibri/db` l'applique au contenu `draft` à chaque enregistrement et au contenu `live` à chaque publication, et matérialise le résultat dans `content_references`. Stocké et non calculé au build, parce que la question « où est-ce utilisé ? » se pose **avant** une dépublication (FR-083), donc hors build. Le build s'en sert pour ne pas rendre une référence dont la cible n'est pas en ligne ; FR-055 s'en sert pour vérifier que tout média référencé par le `live` existe encore.

**i. État de la mise en ligne — une seule ligne, un Cron, une boucle de réconciliation** *(2026-08-01, FR-087)*.
Le build étant **global**, l'état de mise en ligne l'est aussi. La publication pose la demande et l'identifiant de build retourné par le Deploy Hook ; un **Cron Trigger** interroge l'API Workers Builds, met à jour l'issue, et **redéclenche** tant que le dernier succès est antérieur à la dernière demande. Un seul mécanisme couvre le quota épuisé (FR-056), l'échec transitoire et la déduplication (FR-058) — sans dépendre d'un signal de quota, qui n'est pas documenté. Ce que lit l'éditrice pour une page se **dérive** de la comparaison entre sa date de dernière mise en ligne et celle du dernier build réussi.

**g. Descripteur V2 dormant.**
`ContentTypeDescriptor<T>` définit *la forme* à laquelle une future tranche de contenu éditorial (article…) se conformera. En V1 il n'est **pas** consommé par du code générique (règle de trois). Quand l'éditorial revient en V2, l'abstraction est déjà là.

### Les flux (preuve du partage)

- **Écriture admin** : formulaire d'édition → `PUT /api/pages/:id` → `writeHandler({auth:'access'})` → `pageRepo.update` (verrou) → sur « Publier », `status/published_at` + Deploy Hook (mocké en test).
- **Soumission publique** : ~~`POST /api/forms/:slug/submit` → `writeHandler({auth:'public'})` → vérif Turnstile → Zod → `sendMail` (Email Routing) → confirmation (FR-061, FR-062).~~ **→ Nuancé le 2026-08-01 *(amendement (c), points 5 et 6)*** : `POST /api/forms/:slug/submit` → `writeHandler({auth:'public', against:'live-form-definition'})` → vérif Turnstile → relecture de la définition `state='live'` → Zod dérivé de cette définition → recalcul du total → `sendMail` (**Cloudflare Email Service**) → confirmation (FR-061, FR-062). Rien n'est persisté (FR-064).
- **Preview (SSR)** : ~~`GET /preview/:slug` (derrière Access) → `db.page.getBySlug(env.DB, slug, { includeDrafts:true })` → `toBlocks` → rendu via composants du gabarit client (résolveur PREVIEW).~~ **→ Renversé le 2026-08-01 *(amendement (c))*** : la signature à drapeau est **antérieure à ADR-0010** et contredit son interdiction d'une fonction générique paramétrée par l'état. La forme juste est `GET /preview/:slug` (sur l'**hôte non fiable**, sous la même politique Access) → `db.page.getDraftBySlug(env.DB, slug)` → `toBlocks` → rendu via composants du gabarit client (résolveur PREVIEW) — deux fonctions de lecture distinctes et typées, `getDraftBySlug` pour l'aperçu et `getPublished` pour le build, jamais une seule paramétrée.
- **Build site (SSG)** : `getStaticPaths` → `db.page.getPublished(buildD1)` → `toBlocks` → composants du gabarit client avec `<Image>` (Sharp).

---

## Alternatives considérées (et pourquoi rejetées)

| Option | Idée | Rejet |
|---|---|---|
| Monorepo unique de toute la flotte | Cœur + tous les sites clients dans un dépôt | Sites clients (commerciaux) hors du dépôt open source ; MAJ tout-ou-rien ; cf. ADR-0008 |
| Template forké par client | Chaque client = fork de ColibriCMS | Divergence des forks = « code divergent » interdit par SC-008 |
| Gabarits en config-données seule (sans code de rendu client) | Tout piloté par un descripteur générique | Un site vitrine sur-mesure a besoin de composants de rendu réels ; le générique pur bride le design |
| Apps épaisses, noyau mince | Défaut littéral du socle | Dérive site/admin quasi garantie ; réveille le risque « endpoint sans contrôle » |
| Moteur générique piloté par descripteurs (tout contenu) | `ContentTypeDescriptor` consommé dès V1 | Sur-ingénierie pour un seul type (Page) ; règle de trois violée — gardé dormant |

---

## Conséquences

### Bénéfices
- Anti-dérive (contrat `db`) **et** frontière cœur/client qui rend la flotte maintenable (SC-008).
- Risque « endpoint sans contrôle d'accès » éliminé par construction, **y compris** pour la route publique (Turnstile obligatoire).
- Renderer et calcul de total partagés → preview, prod et navigateur ne peuvent pas diverger.
- Le contrat de gabarit permet le sur-mesure client **sans** forcer de code dans le cœur.
- Porte V2 (descripteur éditorial) posée sans construire le moteur.

### Risques / vigilance
- Le contrat de gabarit est le seam le plus délicat : trop rigide, il bride le design client ; trop lâche, il laisse fuir de la logique dans le projet client. À stabiliser tôt et à versionner avec soin (une rupture = majeure SemVer, ADR-0008).
- Plus de packages que l'option « apps épaisses » → plus de câblage `catalog:`/`package.json`.
- La discipline noyau/tranche **exige les frontières ESLint dès l'Étape 0**.

---

## Seuils qui feraient reconsidérer
- Si `ContentTypeDescriptor` commence à être *consommé* par du code générique en V1 → dérive vers la sur-ingénierie : le garder dormant.
- Si le retour de l'éditorial (article/auteur/tag) arrive en V2 → activer le chemin générique (le descripteur est déjà là).
- Si le contrat de gabarit se révèle trop contraint pour un design client → l'assouplir par une majeure, jamais par du code spécifique dans le cœur.

---

## Caveats
- ~~**Accès D1 au build** SSG sur Workers Static Assets **[À VÉRIFIER]**~~ → **levé le 2026-08-01** : aucun binding n'existe dans le conteneur de build ; l'adaptateur de build est **HTTP**, sur l'API REST D1 (`POST /accounts/:id/d1/database/:id/query`). L'architecture l'avait prévu (le build fournit son adaptateur à `db`).
- **Optimisation d'images distantes R2 au build** via `getImage()` + `image.remotePatterns` **[À VÉRIFIER]** : config Astro 7 exacte à confirmer.
- **Auth via middleware Astro** (pas `src/fetch.ts`) tant que l'OOM #17181 n'est pas corrigé (ADR-0003).

---

## Constraints
> Règles impératives et vérifiables — compilées en frontières ESLint/dependency-cruiser + revue (cf. ADR-0002, ADR-0006).
- **INTERDIT** : tout import de `cloudflare*` / `@cloudflare/*` (hors types) dans `@colibri/core`.
- **INTERDIT** : tout import de `apps/*` dans `@colibri/db` ou `@colibri/core`.
- **INTERDIT** : tout gabarit, thème ou code spécifique à un client dans les paquets du **cœur** (il vit dans le projet client).
- **OBLIGATOIRE** : un projet client déclare ses gabarits via le **contrat de gabarit** (descripteur + rendu) ; **INTERDIT** d'éditer le cœur pour ajouter un gabarit.
- **OBLIGATOIRE** : toute lecture consommée par le site **et** l'admin vit dans `@colibri/db` ; **INTERDIT** d'écrire du SQL de lecture dans `apps/*`.
- **OBLIGATOIRE** : tout endpoint d'écriture est déclaré via `writeHandler({...})` avec un `auth` explicite (`'access'` ou `'public'`) ; **INTERDIT** un handler d'écriture ad hoc, ou une route publique sans vérification Turnstile.
- **OBLIGATOIRE** : deux schémas Zod par surface (`xxxRow` en sortie D1, `xxxInput` en entrée) ; la validation d'une valeur de zone dérive du descripteur de gabarit.
- **OBLIGATOIRE** : le verrou optimiste passe par `createRepository`, jamais réimplémenté.
- **OBLIGATOIRE** : les seams JWKS, mailer et Turnstile sont injectables dès le code de prod.
- **INTERDIT** : consommer `ContentTypeDescriptor` par du code générique en V1 (le garder dormant).
- **OBLIGATOIRE** *(2026-08-01)* : le contrat de gabarit déclare les zones de type **formulaire** et **date**, l'**ordre et les libellés du menu**, et la **destination typée** d'un lien ; **INTERDIT** de laisser l'éditrice saisir l'adresse interne d'une page.
- **OBLIGATOIRE** *(2026-08-01)* : l'extraction des références est une fonction **pure** de `@colibri/core` ; **INTERDIT** de la réimplémenter par du SQL ad hoc dans `apps/*`.
- **OBLIGATOIRE** *(2026-08-01)* : `toBlocks()` retourne un **arbre de blocs typés**, rendu nœud par nœud avec l'échappement natif du moteur ; **INTERDIT** qu'une sortie du renderer porte une chaîne de balisage, et **INTERDIT** au contrat de gabarit d'exiger `set:html` pour rendre une valeur de zone.
- **OBLIGATOIRE** *(2026-08-01)* : toute requête D1 est **paramétrée** — `.bind()` sous workerd, champ `params` de l'API REST pour l'adaptateur HTTP du build ; **INTERDIT** de construire une clause SQL par interpolation, **y compris** pour un nom de colonne (allowlist d'identifiants en code) ou pour une clause `IN` de longueur variable (seuls les placeholders se dérivent du nombre de valeurs).
- **OBLIGATOIRE** *(2026-08-01)* : l'aperçu (`/preview/*`) et les médias bruts sont servis sur un **nom d'hôte distinct** de celui des endpoints d'écriture — sous-domaine du même apex, sous la **même politique Access** ; **INTERDIT** de tenir le CSRF `checkOrigin` pour une protection de cette surface, la requête venant de la bonne origine.
- **OBLIGATOIRE** *(2026-08-01)* : cette surface porte sa propre politique de contenu — aucun script inline, `frame-ancestors 'none'`, aucune origine tierce — posée en un point unique pour la surface (ADR-0011).
- **OBLIGATOIRE** *(2026-08-01)* : tout média servi hors du build l'est avec un `Content-Type` issu du **type détecté à l'entrée**, `X-Content-Type-Options: nosniff` et `Content-Disposition: inline; filename=` normalisé (dérivé de l'identifiant et de l'extension détectée) ; **INTERDIT** de dériver le `Content-Type` du fichier, des métadonnées R2 du téléversement ou du nom fourni, et **INTERDIT** d'exposer publiquement le bucket des originaux.
- **OBLIGATOIRE** *(2026-08-01)* : `verifyAccessJwt` vérifie la **signature** contre le JWKS du *team domain*, l'**audience** (`aud`), l'**émetteur** (`iss`) et l'**expiration** ; tout échec, **y compris l'impossibilité d'obtenir le JWKS**, refuse (*fail-closed*) ; **INTERDIT** un chemin dégradé qui accepterait un jeton sans l'une de ces vérifications.
- **OBLIGATOIRE** *(2026-08-01)* : Access est l'**unique source d'autorisation** ; `users` enregistre l'identité et **INTERDIT** de le consulter comme liste d'accès. Le cache KV porte la résolution d'identité à TTL borné, jamais la décision d'autorisation.
- **OBLIGATOIRE** *(2026-08-01)* : la route publique de soumission est déclarée `writeHandler({ auth:'public', against:'live-form-definition' })` — relecture de la définition `state='live'` et **recalcul du total** dans la tête du pipeline ; **INTERDIT** de laisser ces deux règles à `run`.
- **OBLIGATOIRE** *(2026-08-01)* : le `href` d'un `LinkTarget { kind:'external' }` est restreint par le schéma d'entrée aux schémas d'adresse `http` et `https`, et tout lien externe rendu porte `rel="noopener noreferrer"` ; **INTERDIT** de s'en remettre à `z.string().url()`, qui accepte `javascript:`.

## Related
- Complété par : **ADR-0010** (modèle brouillon/publié à deux contenus — lectures typées par état, opération de publication, index de références).
- Complété par : **ADR-0011** *(2026-08-01)* (frontières de contenu hostile — le schéma d'entrée § a, le contrat de gabarit et le seam `AssetResolver` sont les endroits où ses trois frontières se tiennent ; son § 6 renvoie ici la forme de sortie de `toBlocks()`, la restriction du `LinkTarget` et l'isolement de l'aperçu, tranchés par l'amendement (c)).
- Contraint par : ADR-0003 (socle — middleware vs `src/fetch.ts`, bindings, versions).
- Testé par : ADR-0005 (les seams `db`/`writeHandler`/`toBlocks`/total/JWKS/mailer/Turnstile sont les cibles de test).
- Gouverné par : ADR-0006 (les frontières sont le portail anti-dérive de la génération IA).
- Exploité par : ADR-0007 (constructeur de formulaires), ADR-0008 (le contrat de gabarit est la frontière cœur/client du versionnage).
- Cadre : brief, PRD, stack ColibriCMS.
