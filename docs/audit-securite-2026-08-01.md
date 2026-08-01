# Audit de sécurité documentaire — ColibriCMS

**Date** : 1ᵉʳ août 2026
**Périmètre** : `docs/brief.md`, `docs/prd.md`, `docs/stack.md`, `docs/adr/` (ADR-0001 à 0008, 0010, candidat 0009), `docs/agents/`. **Hors périmètre** : `docs/researchs/`, le code (inexistant à ce jour).
**Nature** : audit de conception. Aucun constat ne porte sur une implémentation ; tous se corrigent par amendement documentaire, à coût quasi nul tant qu'aucune ligne de code n'est écrite.
**Méthode** : quatre auditeurs indépendants en contexte frais (auth & surfaces, entrées & injection, données & vie privée, chaîne d'approvisionnement & opérations), 62 constats bruts fusionnés et dédoublonnés ci-dessous.

---

## Contexte — à lire avant tout le reste

Cette section rend le document autonome : elle suffit à reprendre l'audit dans une session neuve, sans avoir relu le corpus.

### Ce qu'est ColibriCMS

CMS sur-mesure open source pour sites vitrine, hébergé sur le **free tier Cloudflare**. L'architecture combine un **site public statique** (Astro SSG, bâti puis servi par le CDN) et un **admin SSR sur Cloudflare Workers** (`@astrojs/cloudflare` + îlots React). Les données vivent en **bindings directs** D1 (SQL), R2 (objets) et KV (cache) — il n'y a **pas d'API REST** entre les couches.

Le modèle est **centré page** : une page est une instance de **gabarit**, faite de **zones typées** (texte, texte riche, image, galerie, vidéo, CTA, répéteur). L'éditrice remplit les zones, elle ne restructure pas les pages. Un **constructeur de formulaires** générique et borné lui permet de composer des formulaires — dont un devis à total indicatif — dont les soumissions sont **acheminées par e-mail**, jamais stockées sur le chemin nominal.

**Frontière cœur / client** : le **cœur** est packagé et versionné (SemVer, open source, publié sur npm) ; chaque **site client** est un projet privé qui l'épingle et fournit ses gabarits via le **contrat de gabarit**. Une instance = un client. Le sur-mesure vit dans le projet client, jamais dans le cœur.

### Les acteurs, pour lire les scénarios d'attaque

| Acteur | Ce qu'il peut faire | Ce qui le contient |
|---|---|---|
| **Visiteur anonyme** | Lire le site public, soumettre un formulaire | Turnstile, validation Zod, recalcul serveur du total |
| **Éditrice** (la cliente) | Tout modifier et publier dans l'admin | Cloudflare Access (code e-mail à usage unique, session 7 jours) |
| **Intégrateur** (l'agence) | Provisionner l'instance, migrer, déployer, accès D1 direct | Rien de documenté au-delà d'Access |
| **Agent générateur (IA)** | Écrire le code de production du cœur | Portail de vérification ADR-0006 (+ candidat 0009) |
| **Contributeur externe** | À venir avec l'ouverture du dépôt | Non défini |

### Les trois faits de gouvernance qui donnent leur poids aux constats

Ces trois faits, propres à ce projet, transforment une lacune de rédaction en lacune de sécurité réelle. Ils sont la raison pour laquelle « ce n'est pas écrit » équivaut ici à « ce n'est protégé par rien ».

1. **Ce qui n'est pas dans un `## Constraints` n'est appliqué par rien.** ADR-0002 pose que les vérifications déterministes — hooks `PreToolUse`, checks CI — sont **compilées depuis les sections `## Constraints` des ADR**. Une bonne pratique mentionnée dans une prose de `stack.md`, ou dans un commentaire d'un extrait de code, n'est vérifiée par aucun automate (voir C-17, restriction http(s)).
2. **Le code n'est pas relu ligne à ligne.** Le brief l'écrit : « la confiance ne peut pas reposer sur la relecture humaine ». Le projet a donc bâti un dispositif de confiance mécanique — remarquable — mais qui ne couvre que les risques qu'il a nommés.
3. **Les ADR sont immuables.** On ne réécrit pas un ADR accepté : on l'**amende** par un bloc daté, ou on le remplace par un ADR qui le `supersedes`. Toutes les remédiations ci-dessous sont formulées dans ce cadre.

### Comment lire un constat

Chaque constat porte un identifiant stable (`A-01`, `B-07`, `C-14`…) utilisé par la section Suivi. L'identifiant ne change jamais, même si la sévérité est révisée : c'est la clé de traçabilité entre cet audit, les ADR amendés et les entrées de `docs/JOURNAL.md`.

- **Documents** : les sources exactes, citées par FR-xxx ou par titre de section.
- **Le corps** : le risque concret, sous forme de scénario quand il y en a un.
- **Remédiation** : quel document amender et quoi y écrire — jamais « il faudrait faire attention à ».

Une mention « non trouvé dans les documents audités » signale une **absence dans le corpus**. Ce n'est pas une affirmation sur le code à venir : le sujet peut très bien être traité correctement à l'implémentation. Le défaut relevé est que rien ne l'exige, dans un projet où l'exigence écrite est le seul mécanisme d'application.

### Rappel sur les deux jeux de `FR-xxx`

Ce document utilise **exclusivement** la numérotation du PRD (`FR-001` → `FR-099`). Le répertoire `specs/001-ci-quality-gate/` porte sa propre numérotation locale `FR-001…FR-030`, **sans aucun rapport**, qui recouvre la même plage. Toute reprise de cet audit doit qualifier de quel jeu elle parle.

---

## Verdict

Le corpus est **remarquable sur les risques qu'il a identifiés** et **muet sur une classe entière qu'il n'a pas identifiée**.

Là où le projet a nommé un risque, il le ferme avec une rigueur peu commune : la fuite de brouillon (ADR-0010) est traitée par une contrainte de forme *et* une cible de test, en refusant explicitement de s'en remettre à la vigilance ; le `writeHandler` à deux têtes (ADR-0004 §e) rend structurellement impossible un endpoint d'écriture sans contrôle ; la fermeture de `workers.dev` et des URLs de prévisualisation (ADR-0003 amendement (b)) montre une compréhension fine de ce qu'Access protège réellement.

Mais un `grep` sur l'intégralité du corpus ne retourne **aucune occurrence** de : XSS, sanitisation, échappement, CSP, limite de débit, SVG, EXIF, requête paramétrée. Le vocabulaire de la sécurité applicative est absent de la chaîne `brief → PRD → stack → ADR`. Ce n'est pas une lacune de rédaction, c'est une lacune **mécanique** : ADR-0002 pose que les vérifications déterministes (hooks `PreToolUse`, CI) sont compilées depuis les sections `## Constraints` des ADR. Une règle absente de tout `## Constraints` n'est appliquée par rien. Or le brief pose que « le code entrant n'est pas relu ligne à ligne » et que « la confiance ne peut pas reposer sur la relecture humaine ».

**Le projet a donc construit un dispositif de confiance mécanique sans y raccorder aucun contrôle d'injection.** C'est le constat racine ; la majorité des autres en découlent.

**La recommandation générale tient en une phrase : appliquer à l'injection le traitement que le projet a su appliquer à la fuite de brouillon.**

---

## Tableau de bord

| Sévérité | Nombre | Constats |
|---|---|---|
| **Critique** | 4 | A-01 → A-04 |
| **Élevée** | 14 | B-01 → B-14 |
| **Moyenne** | 26 | C-01 → C-16, puis C-17a → C-17j (dix constats groupés sous un même titre pour la lisibilité, suivis individuellement) |
| **Faible / Info** | 10 | D-01 → D-10 |
| **Total** | **54** | |

---

# A. Constats critiques

## A-01 — Aucune racine « sécurité » dans la chaîne documentaire

**Documents** : `brief.md` §Contraintes et §Critères de succès ; `prd.md` (FR-001→FR-099, aucun SC de sécurité) ; `docs/adr/README.md` §Index (aucun ADR dont le `scope` soit la sécurité applicative).

Sur 99 exigences fonctionnelles, trois seulement touchent la validation d'entrée (FR-013 type de zone, FR-014 défiance envers le navigateur, FR-022 type réel d'un fichier) — toutes orientées **justesse fonctionnelle**, aucune orientée **hostilité**. Il n'existe ni section d'exigences non fonctionnelles de sécurité, ni critère de succès mesurable la concernant, ni ADR dédié.

Conséquence directe de la mécanique ADR-0002 : ce qui n'est pas dans un `## Constraints` n'est vérifié par aucun hook et par aucune CI. Dans un projet qui assume de ne pas relire le code ligne à ligne, l'absence de règle **est** l'absence de protection.

**Remédiation** : ouvrir un **ADR-0011 « Frontières de contenu hostile »** (scope : `packages/`, `apps/`), rédigé sur le modèle exact d'ADR-0010, dont le `## Constraints` sera compilable en hooks/CI. Ajouter au PRD une section d'exigences transverses à partir de FR-100 (la règle de numérotation interdisant toute renumérotation) : échappement contextuel, allowlist du texte riche, bornes de taille des entrées visiteur, limite de débit, en-têtes de réponse.

## A-02 — Sanitisation et échappement du contenu éditrice non spécifiés

**Documents** : `prd.md` FR-012, FR-013, FR-015, FR-016 ; `stack.md` §Modèle de données (« texte riche | JSON ProseMirror ») ; `ADR-0004` §b (« Renderer en deux temps »).

Le corpus dit *où* le contenu est stocké et *par quoi* il est rendu, jamais *comment il est rendu sûr*. Aucun document ne nomme l'étage de neutralisation — saisie, stockage, `toBlocks`, composant de rendu — ni n'affirme qu'il existe.

Le stockage en JSON ProseMirror est structurellement plus favorable que du HTML brut, et c'est probablement ce qui a fait passer le sujet sous le radar. Mais cette sûreté n'est réelle **que si le schéma Zod du texte riche est une allowlist fermée** de nœuds, de marques et d'attributs. Or ADR-0004 §a dit seulement que « le type de la zone détermine le Zod ». Un schéma permissif — `z.record(z.unknown())` sur les `attrs`, ce qu'un générateur produit naturellement pour « du JSON ProseMirror » — laisse passer un arbre porteur d'attributs arbitraires. L'îlot React d'édition, qui produit ce JSON, est lui-même du code généré par IA (ADR-0006 §5), et FR-014 interdit précisément de lui faire confiance.

**Remédiation** : amender `stack.md` et ADR-0004 §a — le schéma du texte riche énumère exhaustivement les `type` de nœuds, les marques et, pour chaque marque, ses attributs ; tout attribut non listé est **rejeté**, non ignoré. `## Constraints` d'ADR-0004 : « INTERDIT qu'un schéma de valeur de zone accepte un nœud, une marque ou un attribut non énuméré » ; « OBLIGATOIRE : la neutralisation du texte riche est une propriété du schéma d'entrée, jamais du rendu ». Cible de test ADR-0005 nommée, au même rang que la fuite de brouillon.

## A-03 — Le rendu est délégué au projet client sans aucune contrainte de sécurité

**Documents** : `ADR-0004` §« Le contrat de gabarit » (« **Rendu** (fourni par le **projet client**) ») ; `ADR-0008` §1 ; `CLAUDE.md` §Contraintes actives.

Le cœur produit des `RenderBlock[]` et les remet à des composants Astro qu'il ne contrôle pas. Astro échappe `{expression}` par défaut — mais pas `set:html`, et un renderer produisant des blocs de texte riche sera très naturellement consommé par un `set:html`. Aucune ligne du corpus n'aborde ce point.

Scénario : l'intégrateur (ou l'agent générant le projet client, **hors du dépôt open source donc hors du portail qualité d'ADR-0006/0009**) écrit `<div set:html={block.html} />`. Toute la protection du cœur est annulée dans un fichier qu'aucune CI du cœur ne voit. C'est la faille la plus difficile à rattraper *a posteriori* : elle se répète à chaque nouveau client, et le mécanisme de flotte d'ADR-0008 ne rejoue pas le portail sur les projets clients.

**Remédiation** : trancher dans ADR-0004 la **forme de sortie de `toBlocks()`** comme partie du contrat de gabarit — de préférence un arbre structuré rendu nœud par nœud avec l'échappement natif d'Astro, seul choix qui rende `set:html` inutile. `## Constraints` : « INTERDIT au contrat de gabarit d'exiger `set:html` pour rendre une valeur de zone ». Livrer **avec le cœur** une règle ESLint que le projet client active, et l'ajouter à la checklist de provisionnement d'ADR-0008 (b) — sans quoi la contrainte n'est appliquée nulle part.

## A-04 — Publication npm du cœur : aucune exigence de sécurité

**Documents** : `ADR-0008` §1 ; `stack.md` §Distribution du cœur ; `ADR-0004` §Frontière cœur/client.

Le cœur est publié en paquets versionnés que chaque client épingle : **le registre npm est le point unique de compromission de toute la flotte**. Rien ne spécifie 2FA sur le compte de publication, jeton à portée restreinte, provenance npm (`--provenance`), ni qui a le droit de publier. Un compte compromis permet de pousser un correctif malveillant que l'outillage de flotte (ADR-0008 §3) déploierait ensuite fidèlement partout.

L'asymétrie est frappante : le jeton Workers Builds fait l'objet d'un traitement soigné (ADR-0003 amendement (b), membre de compte non nominatif), et ce soin n'a pas été étendu au canal de distribution lui-même.

**Remédiation** : nouvelle section « Sécurité de la distribution » dans ADR-0008, avec `## Constraints` : publication depuis CI uniquement, provenance npm activée, 2FA obligatoire, jeton détenu par l'identité d'agence non nominative, interdiction de publier depuis un poste.

---

# B. Constats de sévérité élevée

## B-01 — L'exposition de la route publique de soumission face à Access n'est spécifiée nulle part

**Documents** : `ADR-0004` amendement 2026-07-17 point 2 (« première route d'écriture non protégée par Access », `POST /api/forms/:slug/submit` dans `apps/admin/`) ; `ADR-0003` amendement (b) point 3 ; `ADR-0005` §Alternatives (politique « Bypass », seule allusion) ; `ADR-0008` amendement (b) (liste de provisionnement, aucune exclusion mentionnée).

Contradiction non résolue. L'endpoint public vit dans `apps/admin`, donc sur le nom d'hôte qu'Access protège **intégralement**. Deux issues, aucune documentée : (a) l'intégrateur ne fait rien et tout visiteur anonyme est bloqué — SC-007 échoue à la première demande réelle ; (b) il crée une exclusion *ad hoc* sans aucune contrainte qui en borne le périmètre — un Bypass tracé sur `/api/*` expose les endpoints d'écriture admin à Internet, avec la seule vérification JWT comme barrière, alors qu'ADR-0003 (b) pose que la révocation n'est effective que **parce que** chaque requête traverse Access.

Question connexe non traitée : le site public et l'admin étant sur des hôtes différents, le POST de soumission est cross-origin (CORS ? endpoint servi sur le domaine du site ?).

**Remédiation** : trancher le mécanisme d'exposition (Bypass strictement limité à `POST /api/forms/*/submit`, ou hôte dédié hors Access) ; l'ajouter au provisionnement ADR-0008 (b) ; `## Constraints` : « INTERDIT toute exclusion Access au-delà du seul chemin de soumission » ; cible ADR-0005 vérifiant que les routes admin restent derrière Access quand la soumission fonctionne.

## B-02 — Aperçu SSR : du contenu non fiable rendu dans l'origine authentifiée

**Documents** : `ADR-0004` §Topologie et §Les flux (« Preview (SSR) : `GET /preview/:slug` (derrière Access) ») ; `prd.md` FR-030→FR-033 ; `ADR-0003` amendement (b) point 3.

L'aperçu vit dans le Worker d'admin, donc sur la **même origine** que les endpoints `writeHandler({auth:'access'})` et que le JWT de session de 7 jours. Il rend le contenu `state='draft'` — le contenu le moins validé du système, celui qui n'a pas franchi les vérifications de publication d'ADR-0010 §5. Aucun document ne relève que le pire emplacement possible pour un XSS est précisément celui-là.

Scénario : un contenu piégé (par A-02, par un bug de l'îlot d'édition, ou injecté directement sur l'API d'écriture) s'exécute dans l'origine admin avec la session Access valide. Il peut publier, modifier l'adresse de destination d'un formulaire, déclencher un Deploy Hook. Le CSRF `checkOrigin` ne protège de rien : la requête *vient* de la bonne origine.

**Remédiation** : amender ADR-0004 (amendement (b), qui traite déjà de la fidélité de l'aperçu) — poser que l'aperçu est un rendu de contenu non fiable dans une origine privilégiée, et en tirer une décision : au minimum une CSP restrictive sur `/preview/*` (aucun script inline, aucun `connect-src` hors origine) ; idéalement une isolation par nom d'hôte distinct protégé par la même politique Access (coût nul chez Cloudflare) ou par `<iframe sandbox>`.

## B-03 — Contenu de soumission hostile réaffiché dans la corbeille admin

**Documents** : `prd.md` FR-064, FR-097 ; `ADR-0007` amendement (c) (« l'afficher ne révèle rien de plus que l'e-mail qu'elle n'a pas reçu ») ; `stack.md` DDL `undelivered_submissions`.

L'amendement (c) argumente très bien la frontière *produit* mais raisonne sur le contenu **informationnel** du message, pas sur son contenu **actif**. FR-097 crée une surface nouvelle : du contenu 100 % contrôlé par un visiteur anonyme, rendu dans l'origine authentifiée de l'admin — même conséquence que B-02.

Scénario : un attaquant soumet un formulaire dont l'acheminement échoue (ou provoque l'échec par saturation, cf. B-08), avec des valeurs porteuses de balisage. L'éditrice ouvre la corbeille pour comprendre pourquoi elle ne reçoit plus rien. Le contenu s'exécute avec sa session. C'est un XSS stocké **déclenché par le geste de remédiation lui-même**, donc à taux de déclenchement élevé.

**Remédiation** : `## Constraints` d'ADR-0007 : « OBLIGATOIRE : le contenu d'une demande non acheminée est affiché comme texte, jamais interprété ». Le choix « corps en texte brut » de B-04 rend cette contrainte triviale à tenir. Cible de test ADR-0005, à côté de l'invariant « corbeille vide sur le chemin nominal » déjà nommé.

## B-04 — Composition du message d'acheminement entièrement non spécifiée

**Documents** : `prd.md` FR-061, FR-091, FR-094 ; `ADR-0007` §Décision point 5 ; `ADR-0004` §f (seam `sendMail`) ; `stack.md` §Acheminement.

Le corpus prescrit avec soin **ce que le message contient** et **à qui il va**. Il ne dit rien de **comment il est composé** : ni le sujet, ni le format (texte ou HTML), ni l'échappement des valeurs, ni le traitement des retours chariot.

Trois risques : (1) **injection d'en-tête CRLF** — si le sujet incorpore une valeur de champ, réflexe naturel (« Nouvelle demande de {nom} »), une valeur contenant `\r\n` injecte des en-têtes arbitraires (`Bcc:`, `Reply-To:`) selon la composition MIME ; aucune contrainte de rejet des caractères de contrôle n'existe. (2) **corps HTML** — réponses du visiteur injectées sans échappement : lien piégé, contenu déguisé en message système, phishing visant la cliente, qui est l'administratrice du site. (3) le même `payload_json` est réaffiché dans l'admin (B-03).

**Remédiation** : amender ADR-0007 §5 — **sujet constant** (au plus complété par le titre du formulaire, donnée d'éditrice et non de visiteur) ; **corps en texte brut en v1** (le message n'a aucun besoin de mise en forme, et cela ferme les risques 2 et 3 d'un coup) ; **rejet à l'entrée** de tout caractère de contrôle dans les champs mono-ligne. `## Constraints` : « INTERDIT de composer un en-tête d'e-mail à partir d'une valeur fournie par le visiteur » ; « OBLIGATOIRE : le message d'acheminement est en texte brut ». Cible ADR-0005 : « une valeur porteuse de CRLF ne produit aucun en-tête supplémentaire ».

## B-05 — Aucune contrainte de requête paramétrée D1

**Documents** : `ADR-0004` §Règle du contrat, §d (`createRepository`), `## Constraints` ; `stack.md` §Lecture D1 au build ; `ADR-0006` §5 et §Contexte (« SQL confiant mais erroné »).

Le corpus **localise** parfaitement le SQL (tout dans `@colibri/db`, jamais dans `apps/*`) mais n'impose **jamais** qu'il soit paramétré. Le seul exemple applicatif (`createRepository`) utilise bien des placeholders, mais c'est un exemple, pas une règle : aucun `## Constraints` ne dit « INTERDIT de construire une requête par concaténation ».

C'est le constat le plus révélateur de A-01 : ADR-0006 identifie nommément « SQL confiant mais erroné » comme mode d'échec de la génération IA, place l'intérieur des repositories en colonne « généré par l'IA », et construit un portail à quatre contrôles — dont aucun ne regarde le SQL. **Le mécanisme de défense et la menace identifiée ne se rencontrent jamais.**

Le chemin de lecture au build aggrave : l'API REST D1 accepte `{sql, params}`, mais rien ne dit que l'adaptateur HTTP passe les paramètres séparément plutôt que de les interpoler — et ce chemin lit le contenu qui devient le site public.

**Remédiation** : `## Constraints` d'ADR-0004 : « OBLIGATOIRE : toute requête D1 est paramétrée (`.bind()` ou champ `params`) ; INTERDIT de construire une clause SQL par interpolation, y compris pour un nom de colonne ou une clause `IN` de longueur variable ». Ajouter au portail une règle ESLint refusant tout littéral gabarit contenant `SELECT`/`INSERT`/`UPDATE`/`DELETE` avec substitution — contrôle bon marché, parfaitement mécanisable, exactement de la nature de ceux que le brief exige.

## B-06 — `field_key` / `option_key` : clés naturelles centrales, jamais spécifiées

**Documents** : `ADR-0010` §2 et `## Constraints` ; `stack.md` DDL `form_fields`, `form_field_options` ; `prd.md` FR-043, FR-091 ; `ADR-0007` §Décision point 6.

La décision est bonne et bien motivée. Mais rien ne dit **d'où vient** une `field_key`, **quel jeu de caractères** elle admet, **comment son unicité est garantie**, ni **ce qui arrive si elle change**. Quatre conséquences :

1. **Injection** : la clé circule dans l'attribut `name` du HTML, dans le JSON de soumission, dans le corps de l'e-mail, dans la corbeille admin et dans les clauses `WHERE` — une entrée utilisateur indirecte traversant cinq contextes d'échappement.
2. **Collision** : si la clé dérive du libellé par slugification (le plus probable), « Prénom » et « prénom », ou « Taille (cm) » et « Taille (mm) » selon la normalisation, produisent la même clé — conflit de clé primaire ou écrasement silencieux.
3. **Instabilité** : si l'éditrice corrige un libellé après publication et que la clé suit, FR-090 rejette des soumissions légitimes et FR-091 calcule sur des champs qui ne correspondent plus — alors qu'ADR-0010 exige la stabilité « à travers les publications ». La contrainte est écrite, le mécanisme qui la tient ne l'est pas.
4. **Parsing** : sans charset borné, une clé contenant `[`, `]` ou `.` interagit avec les conventions de désérialisation (`champ[0]`, `champ.sous`).

**Remédiation** : amender ADR-0010 §2 — charset fermé (`^[a-z][a-z0-9_]{0,63}$`), **engendrée une fois** à la création du champ et **immuable ensuite**, unicité vérifiée avec suffixe déterministe en cas de collision, rejet Zod strict à la lecture. Cible ADR-0005 : « renommer le libellé d'un champ publié ne change pas sa `field_key` ; une soumission antérieure reste valide ». Même traitement pour `option_key` et `zone_key`.

## B-07 — Le média original, non réencodé, est servi depuis l'origine admin

**Documents** : `ADR-0004` §b (« admin (preview) → URL R2 brute ») ; `ADR-0003` `## Constraints` (« INTERDIT d'introduire une dépendance de traitement d'image dans le runtime Worker ») ; `stack.md` §Réduction d'image à l'entrée.

Conséquence non écrite du couplage de trois décisions par ailleurs justes : Sharp est build-only, le Worker ne peut rien réencoder, l'octet déposé par le navigateur est stocké **tel quel**, et l'aperçu le sert **brut**. Le seul réencodage — qui est aussi la seule neutralisation d'un fichier polyglotte — n'a lieu que sur le chemin du site public.

Scénario : un JPEG/HTML polyglotte (préambule `FF D8` valide, charge HTML dans un segment de commentaire) franchit la validation par signature, est stocké tel quel, et servi dans l'aperçu. Sans `Content-Type` forcé, `X-Content-Type-Options: nosniff` ni `Content-Disposition`, le navigateur peut l'interpréter comme du HTML **dans l'origine admin** — même conséquence que B-02.

Le corpus n'indique nulle part comment les objets R2 sont servis à l'aperçu, alors que ce détail décide entièrement de la sévérité.

**Remédiation** : trancher dans ADR-0004 §b où et comment un média est servi hors build. `## Constraints` : « OBLIGATOIRE : tout média servi hors du build l'est avec un `Content-Type` issu du type détecté à l'entrée (jamais du fichier), `X-Content-Type-Options: nosniff` et `Content-Disposition: inline; filename=` normalisé » ; « OBLIGATOIRE : les médias bruts sont servis depuis une origine distincte de celle de l'admin ». Noter la conséquence structurelle : **le produit ne peut pas réencoder à l'entrée**, la validation par signature est donc la seule barrière et doit être décrite comme telle.

## B-08 — Aucune borne de taille sur les valeurs d'une soumission

**Documents** : `prd.md` FR-042, FR-045 (bornes du champ **nombre uniquement**), FR-090 ; `ADR-0007` §Décision points 2 et 3.

FR-045 est excellent, mais son motif écrit est la **justesse du total**, pas la résistance à l'abus. Aucune borne pour les autres types : `textarea` sans longueur maximale, `text` sans longueur maximale, `select_multi` sans nombre maximal de valeurs, et aucune taille maximale de corps de requête. FR-090 valide « les bornes » — mais les bornes n'existent que pour un seul type de champ.

Scénario : une soumission de plusieurs mégaoctets dans un `textarea`. Elle est validée, le total recalculé, le message composé — soit il est acheminé (limite plateforme de 25 Mio, largement de quoi rendre la boîte de l'éditrice inutilisable), soit il échoue et **s'installe 30 jours dans `undelivered_submissions`**, en D1, sur un quota gratuit. Répété, c'est un déni de service sur la base, et le geste de remédiation offert (FR-097) exige justement de charger ces lignes.

**Remédiation** : chaque type de champ porte une longueur maximale par défaut appliquée côté serveur (≈200 caractères pour `text`/`email`/`phone`, 5 000 pour `textarea`), et la soumission une taille maximale de corps. `## Constraints` d'ADR-0007 : « OBLIGATOIRE : le schéma de soumission borne la longueur de chaque valeur et la taille totale du corps ».

## B-09 — Aucune limite de débit : Turnstile est la seule défense de la route publique

**Documents** : `prd.md` FR-063, FR-089 ; `stack.md` §Anti-spam ; `ADR-0007` §Décision point 9, §Conséquences, amendement (b).

Aucun document ne mentionne de limite de débit, de quota par IP, ni de plafond par formulaire ou par jour. Deux aggravations propres au projet :

1. **Le dernier frein de fait a été retiré sans être remplacé.** L'amendement (b) d'ADR-0007 présente comme un *bénéfice* que « le mur des 100 messages/jour n'existe plus, et avec lui la borne de 50 soumissions/jour ». C'était pourtant, involontairement, le seul limiteur de volume du système. L'ADR n'en prend pas acte.
2. **Turnstile n'est pas un limiteur de débit.** Il élève le coût unitaire d'une soumission automatisée sans le porter à l'infini ; un solveur commercial permet des centaines de soumissions valides. Chacune produit un e-mail vers la boîte de la cliente, hors quota, sans aucune surface où s'en apercevoir — FR-064 étant volontairement dépourvu de recherche et de tri, la corbeille ne peut même pas servir de témoin.

Points connexes non trouvés : le mode d'intégration Turnstile (managed/invisible) ; la vérification du champ `hostname` dans la réponse `siteverify` — sans elle, un jeton obtenu sur un autre site du même compte Cloudflare est rejouable, vecteur réel dans une flotte partageant un compte, ce qui est précisément l'architecture d'ADR-0008 ; le comportement quand `siteverify` est injoignable (fail-open ou fail-closed).

**Remédiation** : exigence PRD de limitation de débit, distincte de FR-063 — résister à l'automatisation et borner le volume sont deux propriétés différentes. Cloudflare Rate Limiting au niveau WAF (règle simple disponible sur l'offre gratuite) et/ou compteur KV par formulaire et fenêtre glissante, plafond quotidien configurable au provisionnement. `## Constraints` : « OBLIGATOIRE : la vérification Turnstile contrôle le `hostname` de `siteverify` contre l'hôte de l'instance » ; « échec de `siteverify` = refus (fail-closed) ».

## B-10 — Exposition des médias R2 non spécifiée : la fuite de brouillon reste possible par les images

**Documents** : `ADR-0004` §b ; `ADR-0010` `## Constraints` (portée limitée aux lectures du build) ; `ADR-0005` (cible « fuite de brouillon » définie sur « le HTML bâti ») ; `stack.md` (`media.r2_key = media/{yyyy}/{mm}/{uuid}.{ext}`) ; `prd.md` FR-017, FR-032.

Tout le dispositif anti-fuite porte sur les lignes D1 et le HTML bâti. Or une image est persistée en R2 **avant** enregistrement et publication (FR-017), et l'aperçu la sert par URL brute. Aucun document ne dit **comment le bucket est exposé** : public ? domaine custom ? proxifié par un Worker ? Si les originaux ou dérivés sont servis sur un hôte public, (a) une image de brouillon jamais publiée est accessible à qui obtient son URL (partage de l'URL d'aperçu, historique, referrer), et (b) l'aperçu protégé par Access embarque des URLs d'assets qui ne traversent aucune politique — FR-032 ne protège alors que le HTML. Les clés en UUID sont une atténuation, pas un contrôle d'accès.

**Remédiation** : spécifier le mode d'exposition R2 dans ADR-0004 (seam `AssetResolver`) et étendre l'invariant d'ADR-0010 §8 : « rien de rendu au visiteur ne vit hors des deux contenus » doit couvrir les **assets**. Décider explicitement : originaux jamais publics (servis via l'admin derrière Access pour l'aperçu) ; seuls les dérivés référencés par du contenu `live` atteignent une surface publique. Cible ADR-0005 : une image référencée uniquement par un `draft` ne répond pas sur la surface publique.

## B-11 — `recipient_email` risque d'être embarqué dans le site statique public

**Documents** : `stack.md` note « Cycle brouillon/publication des formulaires » (« la définition `state='live'` est **bâtie dans le site** (donnée statique consommée par le rendu et le calcul navigateur, FR-049/FR-050) ») ; `stack.md` DDL `form_defs.recipient_email` ; `prd.md` FR-046.

La « définition » d'un formulaire comprend `form_defs`, qui porte `recipient_email` — l'adresse personnelle ou professionnelle de la cliente. Aucun document ne définit une **projection publique** excluant cette colonne. Si la définition est embarquée telle quelle dans les assets, l'adresse est publiée en clair sur un site statique : collecte triviale par robots, spam, divulgation d'une donnée personnelle de l'éditrice — alors même que Turnstile protège soigneusement l'endpoint. Le rendu et le calcul du total n'ont besoin que des champs, choix et prix.

**Remédiation** : contrainte explicite dans ADR-0007 ou `stack.md` : « la donnée de formulaire bâtie dans le site est une projection **sans** `recipient_email` ni aucune donnée de destination ; l'adresse n'est résolue que côté serveur à l'acheminement ». Cible ADR-0005 : aucun asset bâti ne contient une adresse de `form_defs`.

## B-12 — Information du visiteur, base légale, mentions légales : aucune exigence, et une contradiction de périmètre

**Documents** : `prd.md` §Questions ouvertes « Conformité RGPD » (« non bloquant ») et §Pistes post-V1 (« Pied de page enrichi : **mentions légales** » — reporté) ; `ADR-0007` amendement (c) ; `prd.md` FR-064.

Le produit collecte des données personnelles de visiteurs et les retient jusqu'à ~30 jours, consultables par l'éditrice. Les obligations d'information (art. 13 RGPD) sont reconnues par les documents, mais **aucun FR ne les porte** : il n'existe aucune exigence qu'une page ou un lien d'information existe, et le seul véhicule identifié est explicitement **post-V1**.

Contradiction directe : ADR-0007 (c) exige que la rétention « figure dans la mention d'information », alors que le périmètre V1 ne garantit l'existence d'aucune mention d'information. S'ajoutent, non couverts : la base légale de l'acheminement, la qualification des rôles (cliente responsable de traitement, agence et Cloudflare sous-traitants), les droits du visiteur — qui ignore que ses données sont retenues, l'échec lui étant silencieux — et l'obligation LCEN d'afficher des mentions légales, indépendante du RGPD.

**Remédiation** : (a) un FR imposant que tout site portant un formulaire expose une information de confidentialité (finalité, destinataire, rétention, sous-traitance Cloudflare, droits) — réalisable via le contrat de gabarit sans rien exiger de l'éditrice ; (b) rapatrier « mentions légales » en V1, au moins comme zone fournie par l'intégrateur ; (c) documenter cette fourniture comme étape de provisionnement dans ADR-0008 (b).

## B-13 — Jeton d'API D1 du build : périmètre non spécifié, capable de lire brouillons et corbeille

**Documents** : `stack.md` §Lecture D1 au build et §Secrets hors dépôt ; `ADR-0003` (c) ; `ADR-0004` amendement 2026-08-01 point 3 ; `ADR-0005` (cible « fuite de brouillon », qui ne porte que sur le *code*).

La cible « aucune lecture du build ne sert `state='draft'` » est un contrôle de code ; le **jeton**, lui, peut lire toute la base — brouillons, `verified_recipients`, `undelivered_submissions` (données personnelles de visiteurs). Rien n'exige un jeton en lecture seule ni scopé à la base de l'instance.

Pire à l'échelle de la flotte : l'API D1 est de la forme `/accounts/{account_id}/d1/database/{id}/query` ; si les instances partagent un compte Cloudflare d'agence — la topologie de comptes n'est **tranchée nulle part** — un jeton sur-scopé compromis dans le CI d'un client expose les données de **tous** les clients.

**Remédiation** : jeton D1 **en lecture seule**, **scopé à la seule base de l'instance** ; un jeton distinct par instance ; documenter la topologie de comptes (un compte par client vs compte d'agence) avec ses conséquences d'isolement.

## B-14 — Le portail IA vérifie la conformité, pas l'innocuité

**Documents** : `ADR-0006` §Résumé, §5, §7, `## Constraints` ; `brief.md` (« le code entrant n'est pas relu ligne à ligne ») ; `ADR-0002` §3.

ADR-0006 est calibré sur le mode d'échec « plausible mais subtilement faux » et la triche aux tests. Un code **intentionnellement malveillant** — exfiltration vers un domaine attaquant, affaiblissement discret d'une validation, backdoor dans un îlot React — passe tous les contrôles : tests verts, mutation OK, frontières respectées. `dependency-cruiser` vérifie la topologie interne, pas les appels réseau sortants. Le brief assume l'absence de relecture ligne à ligne, mais aucune vérification mécanique ne cible ce risque. Le même trou vaut pour les contributeurs open source que le brief nomme lui-même.

**Remédiation** : ajouter au portail des contrôles d'innocuité mécaniques — allowlist des hôtes réseau atteignables depuis le cœur (lint sur `fetch` vers des littéraux hors liste), interdiction de littéraux d'URL non déclarés — et une revue humaine **ciblée** sur les surfaces sensibles (handlers, seams, tout appel réseau nouveau), même sans relecture intégrale.

---

# C. Constats de sévérité moyenne

## C-01 — Validation JWT : exigée dans son principe, sous-spécifiée dans son contenu

`ADR-0004` §e et §f (`verifyAccessJwt(token, { jwks })`) ; `ADR-0003` amendement (b) point 3 ; `ADR-0005` §f.

La validation JWT côté Worker est **explicitement exigée** (pipeline non contournable). Mais **ce que « valider » signifie n'est écrit nulle part** : ni vérification de signature contre le JWKS du team domain, ni de l'audience (`aud` = tag de la politique), ni de l'émetteur, ni de l'expiration ; le comportement en cas d'échec de récupération du JWKS n'est pas spécifié. Dans un projet où ADR-0006 pose que le mode d'échec attendu de l'IA est « un contrôle d'accès qui *semble* présent », une validation qui vérifie la signature mais pas `aud` — acceptant un JWT émis pour une autre application Access du même compte — est exactement le bug plausible que rien n'attraperait : les tests d'ADR-0005 ne nomment pas ce cas.

**Remédiation** : `## Constraints` d'ADR-0004 : « `verifyAccessJwt` DOIT vérifier signature (JWKS du team domain), `aud`, `iss` et `exp` ; tout échec, y compris d'obtention du JWKS, DOIT refuser (fail-closed) ». Cible ADR-0005 : rejet d'un JWT signé valide portant une mauvaise audience.

## C-02 — Rotation des secrets absente, y compris au départ d'un intégrateur

`stack.md` §Secrets hors dépôt ; `ADR-0008` amendements (b) et (c) ; `ADR-0003` amendement (b).

Le *stockage* est bien traité ; la **rotation** n'apparaît nulle part — ni périodicité, ni procédure, ni déclencheur. Surtout, la procédure de sortie d'une personne (ADR-0008 §c), par ailleurs remarquablement écrite, ne couvre que Access : un intégrateur qui part a pu connaître l'URL du Deploy Hook, le jeton D1, le jeton Builds et la clé Turnstile de **chaque instance**. Le membre non nominatif protège la *continuité* de la publication, pas la *confidentialité* des secrets déjà vus.

**Remédiation** : ADR-0008 §c gagne un troisième geste — rotation des secrets d'instance auxquels la personne avait accès ; l'outillage de flotte doit rendre cette rotation praticable en lot.

## C-03 — Deploy Hook : URL non authentifiée, fuite = épuisement du quota de builds

`stack.md` §Mise à jour du site public ; `ADR-0003` amendement (c) point 3 (3 000 min/mois, 1 build concurrent) ; `ADR-0010` §5–6.

Le bon réflexe est là (URL traitée comme un secret, mockée en test). Mais un Deploy Hook est par nature une URL POST sans authentification : qui l'obtient peut déclencher des builds en boucle et **épuiser les 3 000 minutes/mois**, mettant la publication en carence pour le reste du mois (FR-056 conserve les modifications sans les mettre en ligne). La boucle de réconciliation redéclencherait par-dessus, aggravant la consommation. Ni rotation ni détection d'activité anormale ne sont documentées.

**Remédiation** : procédure de régénération du hook comme réponse standard à toute suspicion de fuite ; garde-fou dans la boucle de réconciliation — détecter des builds que l'admin n'a pas demandés (`current_build_uuid` inconnu de `site_build_state`, comparaison que la table permet déjà) et le signaler.

## C-04 — Quotas free tier comme vecteur de déni de service : seul celui des builds est traité

`prd.md` FR-056/FR-057 ; `ADR-0003` amendement (c) point 3 ; `ADR-0007` §Risque.

Les **100 000 requêtes Workers/jour** sont partagées entre l'admin, le Cron et l'endpoint public. Un flood sur ce dernier consomme des invocations **même quand Turnstile rejette** (la vérification s'exécute dans le Worker), pouvant rendre l'admin et la réconciliation indisponibles jusqu'au lendemain. Turnstile protège la boîte mail, pas le quota d'invocations. Le tableau d'ADR-0003 (c) constate les quotas, il n'en tire aucune menace.

**Remédiation** : colonne « vecteur d'épuisement / parade » dans le tableau d'ADR-0003 (c) ; documenter la parade périphérique gratuite (règle WAF / rate limiting en amont du Worker) au provisionnement.

## C-05 — Soumission vers un formulaire dépublié : ambiguïté FR-090 × ADR-0010 §4

`ADR-0010` §4 (« Dépublier ne touche pas au contenu en ligne ») ; `prd.md` FR-090 ; `ADR-0007` `## Constraints`.

Après dépublication, les lignes `state='live'` subsistent par conception. ADR-0007 formule la validation « contre la définition `state='live'` » — critère qu'un formulaire dépublié satisfait toujours. Rien n'exige de vérifier `publications.en_ligne = 1`. Conséquence : un formulaire retiré du site continue d'accepter des soumissions forgées (l'URL et les `field_key` sont connaissables depuis d'anciens caches — cas explicitement reconnu par ADR-0007 amendement (d)) et d'acheminer des e-mails, c'est-à-dire de **collecter des données personnelles via une surface que l'éditrice croit fermée**.

**Remédiation** : amender la contrainte — la soumission est validée contre la définition `state='live'` **d'un formulaire dont `publications.en_ligne = 1`**, sinon rejet. Cible ADR-0005.

## C-06 — L'adresse de destination n'est re-vérifiée ni à l'acheminement ni à la relance

`prd.md` FR-046, FR-098 ; `ADR-0007` §Décision point 8, `## Constraints`, amendement (c) ; `stack.md` DDL `verified_recipients`.

La vérification est spécifiée comme condition **de publication**, pas d'**envoi**. Deux écarts : une adresse retirée de `verified_recipients` après publication continue de recevoir ; et FR-098 (relancer) ne dit pas **quelle** adresse la relance utilise. Si elle accepte une adresse fournie au moment du geste, la garantie centrale d'ADR-0007 (b) — « un seul message, vers une adresse vérifiée du compte » — est contournable, et la corbeille devient un relais de courrier vers une adresse arbitraire avec un contenu contrôlé par un tiers.

**Remédiation** : « OBLIGATOIRE : l'appartenance à `verified_recipients` est vérifiée **à chaque acheminement**, y compris en relance » ; « une relance relit l'adresse depuis `form_defs` en `state='live'` ; INTERDIT qu'une adresse soit fournie au moment du geste ».

## C-07 — « Type réel » (FR-022) non défini ; SVG jamais exclu ; extension de clé R2 indéterminée

`prd.md` FR-021, FR-022, FR-023, FR-088 ; `stack.md` DDL `media` ; `ADR-0005` §b point 4 ; `ADR-0003` `## Constraints`.

FR-022 est l'une des exigences les mieux formulées du PRD — elle nomme le bon critère et écarte le nom et l'extension — mais elle n'est **jamais opérationnalisée**. Comment le type réel est-il déterminé : lecture des octets de signature, ou `Content-Type` de la requête multipart ? Le second violerait FR-014 et FR-022 elle-même, tout en étant l'implémentation la plus probable d'un générateur. Le **SVG** n'apparaît nulle part : hors de la liste FR-021 donc théoriquement refusé, mais rien ne l'interdit explicitement, et c'est le format dont l'ajout est le plus tentant (logo, pictogramme) — servi depuis l'origine du site, c'est un XSS stocké permanent. Enfin, si l'`{ext}` de la clé R2 dérive du nom fourni, c'est une entrée utilisateur dans un chemin de stockage.

**Remédiation** : « type réel déterminé par lecture de la signature d'octets côté Worker ; INTERDIT de se fier au `Content-Type` ou à l'extension » ; « liste fermée à JPEG, PNG, WebP, AVIF ; **INTERDIT** d'y ajouter `image/svg+xml` sans ADR » ; « l'extension de la clé R2 dérive du type détecté ».

## C-08 — Zone vidéo : `ref` non validée, iframe non contrainte, vignette oEmbed récupérée au build

`prd.md` FR-069 ; `stack.md` §Notes et §Vignette vidéo ; `ADR-0003` amendement (c) point 2.

La liste fermée de fournisseurs est le bon choix, mais : (1) le **format de `ref` n'est pas spécifié** alors qu'il est interpolé dans une URL d'iframe — une valeur non contrainte permet une évasion d'attribut ou une manipulation de paramètres d'embed ; (2) l'**iframe n'est décrite nulle part** (ni `sandbox`, ni `allow`, ni `referrerpolicy`) ; (3) la **vignette est récupérée au build par oEmbed** vers une URL dérivée d'une saisie d'éditrice, puis servie depuis le domaine du site, sans vérification du type réel ni bornage de taille et de redirections — SSRF léger et fichier arbitraire servi depuis notre origine.

**Remédiation** : `ref` conforme à une expression rationnelle **par fournisseur** (`^[A-Za-z0-9_-]{11}$` YouTube, `^[0-9]{6,12}$` Vimeo) ; URL d'embed **construite** par le cœur, jamais stockée ; `sandbox` et `referrerpolicy` sur l'iframe ; endpoint oEmbed en dur par fournisseur, pas de redirection hors domaine, vérification du type et de la taille avant écriture R2.

## C-09 — Corbeille : délai non normatif, purge sans exécuteur désigné, accès agence non cadré

`prd.md` FR-064, §Questions ouvertes ; `stack.md` §Corbeille (« **Paramètre à fixer** — Défaut proposé : 30 jours ») ; `ADR-0003` amendement (a) point 1.

Trois faiblesses : (a) le délai reste un « défaut proposé » alors que le PRD exige qu'il soit « écrit » et annoncé, et « court » (PRD) cohabite avec « 30 jours » (stack) sans arbitrage ; (b) **aucun mécanisme n'exécute l'expiration** — `expires_at` existe en colonne, mais le Cron documenté ne liste que le suivi de build et la réconciliation ; une expiration « inconditionnelle » sans exécuteur est non testable et risque d'être implémentée en lecture filtrée, la ligne PII persistant en base ; (c) FR-097 ouvre la consultation à l'éditrice, mais l'agence a un accès direct D1 — cet accès aux PII n'est cadré nulle part.

**Remédiation** : fixer le délai comme valeur normative ; assigner la purge (suppression effective, pas filtrage) au Cron idempotent, avec cible ADR-0005 « après `expires_at`, la ligne n'existe plus » ; noter dans ADR-0008 l'accès de l'agence aux données de production.

## C-10 — Sauvegardes D1 : lieu, accès, rétention absents ; contradiction avec l'effacement inconditionnel

`ADR-0008` §4 et §5 ; `prd.md` FR-064/FR-065 ; `stack.md` `undelivered_submissions.payload_json`.

La sauvegarde pré-migration contient tout D1, donc les coordonnées et devis en clair. Ni lieu, ni accès, ni durée ne sont spécifiés. Deux effets : une soumission « expirée inconditionnellement » peut survivre indéfiniment dans une sauvegarde — l'inconditionnalité ne vaut qu'au niveau applicatif ; et une **restauration** peut faire *réapparaître* des soumissions effacées. Les capacités de restauration temporelle de la plateforme ne sont pas discutées.

**Remédiation** : rétention bornée des sauvegardes, stockage et accès nominatifs, et une étape de la procédure de rollback traitant les données à effacement dû (re-purge post-restauration).

## C-11 — Observabilité et logs du Worker : rien dans les documents

Non trouvé dans les documents audités. Points de contact : `prd.md` FR-065 (« pas conservées **par le produit** ») ; `stack.md` `failure_reason`.

Aucun document ne cadre ce que le Worker journalise. Un échec de validation loggé « avec son contexte » embarquerait le payload — donc des PII — dans un système de logs hors du périmètre de FR-064/FR-065, à rétention non maîtrisée. Le `failure_reason` **technique** conservé en base n'a pas de contenu borné : une réponse SMTP peut contenir l'adresse de destination ou des fragments de message. FR-065 se limite prudemment à « par le produit », ce qui laisse les logs de plateforme sans exigence.

**Remédiation** : exigence « aucun contenu de soumission ni donnée personnelle dans les logs, produit et plateforme » ; borner `failure_reason` (code + catégorie, jamais le message ni le payload) ; documenter la configuration de logging attendue au provisionnement.

## C-12 — Aucun en-tête de sécurité, aucune CSP

Non trouvé dans les documents audités : `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, ni aucune mention d'en-têtes de réponse — ni pour le site statique, ni pour le Worker.

Une CSP sur l'admin est la mesure d'atténuation la moins chère de A-02, B-02, B-03 et B-07 réunis. Le site statique s'y prête particulièrement bien : FR-089 interdisant déjà tout code tiers, une CSP quasi-nominale y est atteignable sans friction.

**Remédiation** : section dédiée dans l'ADR-0011 proposé en A-01, CSP en `## Constraints`, vérification sur le HTML bâti dans la suite Playwright déjà prévue.

## C-13 — Cache CDN et dérivés après dépublication non traités

`prd.md` FR-083, FR-035, §Cas limites ; `stack.md` §Retraitement incrémental (dérivés persistés en R2, jamais supprimés).

FR-035 décrit l'état du **build**, pas ce que le CDN sert. Après dépublication d'une page (offre retirée, photo), le HTML peut rester servi jusqu'à expiration — aucun document ne parle d'invalidation ni de TTL — et les dérivés d'image restent en R2 par conception (FR-093), potentiellement résolvables indéfiniment (cf. B-10). L'éditrice qui « retire du site » croit retirer du public ; les documents ne bornent pas l'écart.

**Remédiation** : exigence de délai borné après dépublication (aligné sur SC-004), stratégie de cache/invalidation dans `stack.md`.

## C-14 — Définition de formulaire non bornée ; `price_delta` sans signe ; débordement d'entier

`prd.md` FR-041, FR-044, FR-045, FR-048 ; `stack.md` DDL `form_fields`, `form_field_options` ; `ADR-0007` §Décision point 3.

Trois trous : (1) aucune borne de composition (nombre de champs, d'options, longueur des libellés) alors que cette définition est bâtie dans le site et relue à chaque soumission ; (2) **`price_delta` n'a aucune contrainte de signe** dans le DDL, alors qu'ADR-0007 énonce « un champ à prix ne peut jamais faire baisser le total » — l'invariant est garanti pour le champ `number` et **pas** pour les options : contradiction directe entre ADR-0007 et le DDL ; (3) `max_value × unit_price` peut dépasser `Number.MAX_SAFE_INTEGER` et produire un total faux, éventuellement négatif, qui traverse le recalcul de FR-091 et arrive dans le message comme un montant faisant foi.

**Remédiation** : `CHECK (price_delta >= 0)`, plafonds sur `max_value` et `unit_price`, bornes de composition ; « OBLIGATOIRE : le total recalculé est vérifié contre un plafond absolu ; un dépassement fait échouer la soumission plutôt que de produire un montant faux ».

## C-15 — FR-090 / FR-091 hors du pipeline `writeHandler`

`ADR-0004` §e ; `ADR-0007` §Décision point 5 ; `prd.md` FR-090, FR-091.

Le pipeline garantit structurellement Turnstile et Zod. Mais la **validation contre la définition `state='live'`** et le **recalcul du total** — les deux mécanismes qu'ADR-0007 amendement (a) décrit comme la raison même de l'amendement (« le total venait du visiteur — 5 € annoncés pour une pièce à 500 € ») — vivent dans `run`, du code applicatif généré par IA, sans garantie de forme. L'argument « éliminé par la forme » ne s'applique donc pas aux deux règles les plus importantes de la seule route publique.

**Remédiation** : introduire une troisième forme, par exemple `writeHandler({ auth: 'public', against: 'live-form-definition' })`, où la relecture et le recalcul sont **dans la tête du pipeline** ; à défaut, écrire explicitement que ces règles sont garanties par le test et non par la forme, et étendre le portail en conséquence.

## C-16 — Migrations D1 : vérification indéfinie, rollback non écrit, exécutant non désigné

`ADR-0008` §4 et §5 ; `ADR-0005` ; `stack.md`.

Le filet « sauvegarde + vérification, jamais automatique » est le bon principe, mais : la **vérification** post-migration n'a aucun contenu défini (vérifier quoi ?) et n'est donc pas testable ; le **rollback** est marqué « procédure à écrire » alors que c'est le seul filet en cas de migration fautive en production ; le mécanisme de **sauvegarde** n'est pas nommé ; et **qui a le droit** d'exécuter une migration n'est pas spécifié.

**Remédiation** : contenu minimal de la vérification (invariants d'ADR-0010 : présence des deux états, comptages avant/après), mécanisme et rétention de la sauvegarde, restauration testée sur une instance de recette, exécution réservée à l'identité d'agence.

## C-17 — Autres constats moyens groupés

- **Contextes d'échappement hétérogènes** (`prd.md` FR-025, FR-027/028, FR-043/044, FR-070, FR-071/072) : ces textes libres atterrissent dans des contextes différents — corps HTML, attribut `alt`, `<title>`, `content` d'une `<meta>`, attributs `name`/`for`/`id`, `href` de réseau social (encore une URL saisie sans contrainte de protocole). Un échappement uniforme « corps HTML » est insuffisant pour les trois derniers. → Notion de **contexte de rendu déclaré** dans le contrat de gabarit.
- **Restriction http(s) hors de tout `## Constraints`** (`stack.md` §Destination typée d'un lien) : la seule règle anti-XSS écrite du corpus vit dans un **commentaire de code** d'un extrait de `stack.md`. Elle n'est donc compilée en aucune vérification. `z.string().url()` accepte `javascript:`. → Remonter en `## Constraints` d'ADR-0004, ajouter `rel="noopener noreferrer"`.
- **Service tokens E2E sans gouvernance** (`ADR-0005` §f) : un service token franchit la politique Access et vit dans les secrets CI. Rien n'interdit d'en créer un sur une instance de **production**, rien ne fixe sa rotation. Sémantique indéfinie : un service token n'a pas d'e-mail — le `writeHandler` (résolution `email→users`) l'accepte-t-il ? → Restreindre aux instances de test/staging, définir le comportement.
- **Accumulation de médias non bornée** (`prd.md` FR-017, §Cas limites) : aucune limite de téléversement, et — décision explicite — **aucun moyen de supprimer**. Un accès admin obtenu une fois (session 7 jours) sature irréversiblement le quota R2, cassant SC-001 sans remède. → Borner, ou écrire explicitement que le risque est assumé.
- **Ajout de dépendances par l'IA non gouverné** (`ADR-0006` §5) : les zones interdites ne couvrent ni `package.json` ni le `catalog:`. Une IA qui hallucine un nom de paquet (slopsquatting) peut l'introduire. → Approbation humaine explicite pour toute dépendance nouvelle.
- **Hooks, CI et portail hors des zones protégées** (`ADR-0006` §9) : la liste protégée omet `.claude/hooks/`, `.github/workflows/` et `tooling/quality-gate` — **le mécanisme d'application lui-même**. Une génération qui édite le hook désactive tout le portail sans toucher une zone interdite. ADR-0009, qui apporte le fail-closed, n'est qu'un **candidat** : ce fail-closed n'est garanti par aucun document accepté. → Étendre la liste, prioriser la promotion d'ADR-0009, et faire re-vérifier par la CI (la protection des hooks par les hooks est auto-référente).
- **Jeton D1 de build rangé sous un mécanisme inopérant** (`stack.md` §Secrets vs `ADR-0003` (c)) : `wrangler secret put` provisionne des secrets **de runtime Worker**, or le jeton D1 sert au **build**, qui s'exécute dans un conteneur CI où le runtime Worker n'existe pas. → Distinguer secrets de runtime et de build.
- **Transitives non figées, pas de veille CVE** (`ADR-0003`) : le `catalog:` épingle les directes ; la table de décision affiche des plages caret contredisant le bloc épinglé ; rien n'impose `--frozen-lockfile` ; aucune veille de vulnérabilités. Figer sans veiller transforme la durabilité en accumulation de CVE. → Trancher exact-pin vs plage, imposer le lockfile gelé en CI, définir la boucle de veille.
- **Pas de processus d'urgence CVE ni d'inventaire de flotte** (`ADR-0008` §2–3) : « chaque client monte de version quand il est prêt » est la bonne règle pour une évolution fonctionnelle, la mauvaise pour un correctif de sécurité. Aucun chemin accéléré, aucun inventaire des versions déployées permettant de savoir quels clients sont vulnérables. → Définir la classe « correctif de sécurité » et son déploiement poussé.
- **Aucun monitoring opérateur** (`ADR-0004` §i ; `ADR-0008` §c) : toute la visibilité converge vers **l'éditrice** (FR-087, FR-094), jamais vers l'**intégrateur**. Les docs nomment pourtant des échecs silencieux (jeton Builds mort après un départ, Cron sans réessai, corbeille « si elle regarde »). Pour une flotte, cela signifie découvrir les pannes par l'appel du client. → Signaux minimaux à remonter à l'agence.

---

# D. Constats faibles et informatifs

- **D-01 — Pas de déconnexion volontaire, facteur unique jamais nommé** (`prd.md` US5, FR-001/002) : aucun FR ne donne à l'éditrice un geste de déconnexion — sur un poste partagé, la session de 7 jours reste ouverte. Et le code e-mail à usage unique comme facteur unique fait que la sécurité de tout l'admin égale celle de la boîte mail de la cliente : choix probablement bon pour la cible, mais nulle part écrit comme risque accepté.
- **D-02 — Provision des comptes `users` ambiguë** (`ADR-0004` §e) : rien ne dit si `users` est un registre d'identité alimenté à la volée ou une seconde liste d'autorisation (risque de divergence avec Access). TTL du cache KV non spécifié. → Une phrase : « Access est l'unique source d'autorisation ; `users` enregistre l'identité et n'est jamais consulté comme liste d'accès. »
- **D-03 — Jeton de verrou optimiste à la seconde** (`stack.md` DDL) : `datetime('now')` a une résolution d'une seconde ; deux écritures dans la même seconde produisent le même jeton et l'`UPDATE … WHERE updated_at=?` réussit alors qu'il devrait échouer. Le scénario métier (deux onglets à quelques heures) n'est pas affecté, mais la cible de test « refus d'écrasement concurrent » d'ADR-0005 serait **intermittente** — pire qu'absente. → `strftime('%Y-%m-%dT%H:%M:%f','now')` ou un compteur de version entier.
- **D-04 — Incohérence « Email Routing » vs « Email Service »** : ADR-0004 §f et §Topologie disent « Email Routing » ; ADR-0005, ADR-0007 (b) et `stack.md` disent « Email Service ». Or **Email Routing est le service de courrier entrant**, pas le service d'envoi. ADR-0004 étant immuable, la correction passe par un amendement daté — sans lui, un agent lisant ADR-0004 en Plan Mode implémentera le mauvais service.
- **D-05 — Incohérence « 500 builds/mois »** : ADR-0005 §f véhicule une métrique qu'ADR-0003 (c) a explicitement invalidée. Le fond reste vrai (la CI ne consomme pas le quota Cloudflare), mais c'est une dérive factuelle que la règle d'immuabilité rend piégeuse. → Amendement daté.
- **D-06 — Cycle de vie des données de l'éditrice non spécifié** (`stack.md` `users`, `verified_recipients`, cache KV ; `ADR-0008` §c) : la sortie d'une personne coupe l'accès mais ne dit rien du devenir de ses données. Volumes minimes, mais ce sont des données personnelles sans fin de vie documentée.
- **D-07 — Tiers côté visiteur : volet information absent** (`prd.md` FR-089, FR-063, FR-069 ; `ADR-0003` (c) point 1) : la conception minimise remarquablement les tiers, mais l'analyse ePrivacy consignée ne couvre que la mesure d'audience. L'équivalent pour Turnstile et l'embed vidéo (traceurs déposés, modes à confidentialité renforcée, mention dans l'information visiteur) n'est pas fait.
- **D-08 — Chiffrement et localisation des données : non trouvés** : rien sur le chiffrement au repos de D1/R2/KV, sur un chiffrement applicatif de `payload_json` (seul contenu PII persistant), sur le TLS de l'acheminement, ni sur la localisation géographique (pertinent pour une clientèle européenne). Écart faible en risque réel, à combler pour la mention d'information et un registre de traitement.
- **D-09 — Gouvernance des contributions externes non définie** (`brief.md` §Contraintes) : le brief anticipe les contributeurs extérieurs, mais rien ne définit protection de branche, revue obligatoire, ni politique de divulgation de vulnérabilité (`SECURITY.md`). Théorique pré-V1, immédiat à l'ouverture du dépôt.
- **D-10 — Écart de total absorbé sans trace** (`ADR-0007` amendement (d) point 2) : un visiteur peut avoir vu 5 € tandis que l'éditrice reçoit 500 €, sans qu'aucune des deux parties n'ait de trace de ce qui a été affiché (FR-095 retiré). FR-051 (total indicatif, non contractuel) est la parade et elle est adéquate. Signalé pour mémoire : le corpus a l'habitude d'écrire ses renoncements, celui-ci ne l'est pas.

---

# Ce qui est bien couvert

Ces points méritent d'être préservés tels quels ; plusieurs sont d'un niveau rarement atteint au stade documentaire.

1. **Le traitement de la fuite de brouillon est le patron à imiter** (ADR-0010). Le projet identifie une classe de bug (« le pire bug possible du produit »), la ferme par une contrainte de **forme** (seam typé, deux fonctions de lecture distinctes, aucune fonction générique paramétrée par l'état), refuse explicitement de s'en remettre à la vigilance, et la raccorde à une cible de test nommée. Le déplacement du `alt` hors de `media` (§8) ferme une fuite non évidente. C'est exactement la démarche qui manque à l'injection.

2. **L'écriture est sécurisée par construction** (ADR-0004 §e). Deux familles de pipeline, « il n'existe pas de troisième voie », contrainte compilée en CI, doublée par « 100 % des endpoints d'écriture testés pour l'autorisation ». Le risque « endpoint sans contrôle » est éliminé par la forme, pas par la vigilance. Corollaire remarquable d'ADR-0007 (b) : le destinataire de l'e-mail est **structurellement hors du contrôle du visiteur**, ce qui ferme d'emblée l'usage du formulaire comme relais de spam ouvert — la classe d'abus la plus courante sur ce type d'endpoint, ici obtenue en convertissant une contrainte de plateforme subie en garantie.

3. **La fermeture des surfaces contournant Access est d'une précision rare** (ADR-0003 amendement (b)). Le document identifie qu'Access protège un *nom d'hôte* et non un Worker, impose `workers_dev: false` **et** `preview_urls: false` en contraintes vérifiables par hook, avec le motif et la conscience que la valeur par défaut de Wrangler a changé trois fois. La révocation en deux gestes ordonnés, avec ses délais réels, est documentée puis reprise en procédure dans ADR-0008 §c.

4. **La défiance envers le client est systématique** (FR-014, FR-022, FR-090, FR-091). « Ne jamais se fier à la validation côté navigateur » est énoncé au niveau PRD, donc traçable et opposable, repris par FR-048 et FR-090, matérialisé par la séparation `xxxRow`/`xxxInput`. FR-022 nomme exactement le bon critère de validation d'un upload.

5. **Minimisation par construction des soumissions** (FR-064/FR-065, ADR-0007 (c)). Non-conservation au-delà de l'acheminement réussi, corbeille limitée aux échecs avec trois gestes et rien d'autre, expiration inconditionnelle, invariant « corbeille vide sur le chemin nominal » érigé en cible de test. Le coût RGPD de la rétention est explicitement « écrit et délibéré ».

---

# Plan de remédiation proposé

> **Ces priorités 1→10 ne sont pas les lots.** Elles sont la proposition d'origine de l'audit, conservée telle quelle. Le découpage réellement suivi est celui de [`suites-audit-securite.md`](./suites-audit-securite.md) — onze lots numérotés `L1`…`L11`, un par document cible — qui couvre les mêmes constats avec une matrice de traçabilité exhaustive. En cas d'écart, **le plan fait foi** ; cette section reste pour son argumentaire.

## Avant la première ligne de code

| Priorité | Action | Ferme |
|---|---|---|
| 1 | Ouvrir **ADR-0011 « Frontières de contenu hostile »** — allowlist du texte riche, échappement contextuel, validation d'upload par signature, CSP et en-têtes, bornes d'entrée | A-01, A-02, C-07, C-12, C-17 (contextes) |
| 2 | Amender **ADR-0004** — forme de sortie de `toBlocks()` et interdiction de `set:html` ; contenu de la validation JWT ; requêtes paramétrées ; exposition R2 et service des médias ; aperçu comme origine à risque | A-03, B-02, B-05, B-07, B-10, C-01, C-17 (http(s)) |
| 3 | Amender **ADR-0007** — composition du message en texte brut, rejet CRLF, corbeille rendue comme texte, re-vérification du destinataire, bornes de soumission, limite de débit, `en_ligne=1` | B-03, B-04, B-08, B-09, C-05, C-06, C-14 |
| 4 | Amender **ADR-0010** — spécification de `field_key` / `option_key` (charset, engendrement unique, immuabilité) | B-06 |
| 5 | Amender le **PRD** — section transverse à partir de FR-100 : limite de débit, bornes de taille, information RGPD du visiteur, mentions légales rapatriées en V1 | A-01, B-08, B-09, B-12 |
| 6 | Amender **ADR-0005** — les cibles de test correspondantes, au même rang que « aucune fuite de brouillon » | l'ensemble |

## Avant la première publication du cœur

| Priorité | Action | Ferme |
|---|---|---|
| 7 | Amender **ADR-0008** — sécurité de la publication npm (2FA, provenance, CI uniquement), rotation des secrets au départ d'une personne, urgence CVE et inventaire de flotte, sauvegardes et rollback | A-04, C-02, C-10, C-16, C-17 (CVE) |
| 8 | Amender **ADR-0006** et promouvoir **ADR-0009** — contrôles d'innocuité, gouvernance des dépendances, protection des hooks et de la CI | B-14, C-17 (dépendances, hooks) |
| 9 | Trancher la **topologie de comptes Cloudflare** et le périmètre des jetons (D1 lecture seule scopé, un jeton par instance) | B-13 |
| 10 | Amender **ADR-0003** — chemin d'exposition de la route publique à travers Access, quotas comme vecteurs de DoS, secrets de build vs de runtime, lockfile et veille CVE | B-01, C-03, C-04, C-17 (jeton, transitives) |

## Corrections ponctuelles

Amendements datés pour D-04 (Email Routing → Email Service, susceptible d'induire une mauvaise implémentation — à traiter tôt) et D-05 (500 builds/mois) ; `strftime` pour D-03 ; les autres constats faibles au fil de l'eau.

---

# Suivi

Cette section est la **partie vivante** du document : le reste ne bouge plus, celle-ci se met à jour à chaque remédiation. Les identifiants de constat (`A-01`…) sont stables et servent de clé entre cet audit, les ADR amendés et `docs/JOURNAL.md`.

## Règle de mise à jour

Une ligne passe à **Traité** quand, et seulement quand, les deux conditions sont réunies :

1. la remédiation est **écrite dans un document accepté** — pas un candidat, pas une note ;
2. s'il s'agit d'une règle applicable mécaniquement, elle vit dans une section **`## Constraints`** et le hook ou le check CI correspondant existe.

Une remédiation écrite en prose mais absente de `## Constraints` reste **En cours**, jamais Traité : par le fait de gouvernance n° 1 ci-dessus, elle n'est appliquée par rien.

**Les numéros de lot (`L1`, `L2`…) cités en Preuve renvoient au découpage de [`suites-audit-securite.md`](./suites-audit-securite.md), qui en est la source de vérité.** Ils ont déjà été renumérotés une fois, le 2026-08-01, quand le découpage est passé de onze à neuf lots documentaires. C'est pourquoi chaque renvoi nomme d'abord son **document cible**, qui ne bouge pas : si un numéro de lot paraît incohérent, se fier au document et relire le plan.

Renseigner la colonne **Preuve** avec ce qui permet de vérifier sans relire : la référence de l'amendement daté (`ADR-0004 amdt 2026-08-14 §3`), le nom du check CI, ou le nom de la cible de test. Un constat volontairement non traité passe à **Accepté** avec son motif écrit — le corpus a l'habitude d'assumer explicitement ses renoncements, garder cette habitude ici.

## États

`À traiter` · `En cours` · `Traité` · `Accepté` (risque assumé, motif obligatoire) · `Caduc` (le constat ne s'applique plus, expliquer pourquoi)

## Tableau de suivi

### Critiques — bloquants avant la première ligne de code

| ID | Constat | Doc cible | État | Preuve |
|---|---|---|---|---|
| A-01 | Aucune racine sécurité dans la chaîne documentaire | ADR-0011 + PRD | Traité | Les deux volets existent en documents acceptés : PRD, section « Exigences transverses » `FR-100` → `FR-110`, et **ADR-0011 « Frontières de contenu hostile »** `accepted` (2026-08-01, lot L2), dont le `## Constraints` est compilable en hooks/CI. La racine demandée existe ; les règles qu'elle porte sont suivies individuellement par A-02, C-07, C-12, C-17a. |
| A-02 | Sanitisation / échappement du contenu éditrice non spécifiés | ADR-0011, stack.md | En cours | **ADR-0011** § Décision 2 et `## Constraints` — allowlist fermée du schéma de texte riche, élément non énuméré **rejeté**, neutralisation à l'entrée et jamais au rendu ; `stack.md` § Modèle de données (2026-08-01, lot L2). Reste le check refusant `z.any`/`z.unknown`/`z.record`/`.passthrough()` sur un schéma de valeur de zone. |
| A-03 | Rendu délégué au projet client sans contrainte | ADR-0004, ADR-0008 (b) | À traiter | |
| A-04 | Publication npm du cœur non sécurisée | ADR-0008 | À traiter | |

### Élevés

| ID | Constat | Doc cible | État | Preuve |
|---|---|---|---|---|
| B-01 | Route publique de soumission face à Access non spécifiée | ADR-0003 (b) ou ADR-0007 | À traiter | |
| B-02 | Aperçu SSR : contenu non fiable dans l'origine admin | ADR-0004 amdt (b) | À traiter | |
| B-03 | Soumission hostile réaffichée dans la corbeille | ADR-0007 | À traiter | |
| B-04 | Composition du message e-mail non spécifiée (CRLF, HTML) | ADR-0007 §5 | À traiter | |
| B-05 | Aucune contrainte de requête paramétrée D1 | ADR-0004 + portail | À traiter | |
| B-06 | `field_key` / `option_key` non spécifiées | ADR-0010 §2 | À traiter | |
| B-07 | Média original non réencodé servi depuis l'origine admin | ADR-0004 §b | À traiter | |
| B-08 | Aucune borne de taille sur les valeurs de soumission | PRD + ADR-0007 | En cours | PRD `FR-101` (2026-08-01). Reste le volet **ADR-0007** (lot L5) et le check. |
| B-09 | Aucune limite de débit ; Turnstile seule défense | PRD + ADR-0007 | En cours | PRD `FR-102` (2026-08-01), distincte de FR-063. Reste `hostname`/fail-closed en **ADR-0007** (lot L5). |
| B-10 | Exposition R2 non spécifiée : fuite de brouillon par les images | ADR-0004, ADR-0010 §8 | À traiter | |
| B-11 | `recipient_email` embarqué dans le site statique | ADR-0007 ou stack.md | À traiter | |
| B-12 | Information visiteur / base légale / mentions légales | PRD + ADR-0008 (b) | En cours | PRD `FR-105` → `FR-109` (2026-08-01) : existence, contenu obligatoire, surface d'édition, blocage de publication. Mentions légales rapatriées en V1. Reste l'étape de provisionnement en **ADR-0008** (lot L8). |
| B-13 | Jeton D1 de build : périmètre non spécifié | ADR-0003 ou ADR-0008 (b) | À traiter | |
| B-14 | Portail IA aveugle au code malveillant | ADR-0006 | À traiter | |

### Moyens

| ID | Constat | Doc cible | État | Preuve |
|---|---|---|---|---|
| C-01 | Contenu de la validation JWT sous-spécifié | ADR-0004 | À traiter | |
| C-02 | Rotation des secrets absente | ADR-0008 §c | À traiter | |
| C-03 | Deploy Hook : fuite → épuisement du quota | ADR-0003 | À traiter | |
| C-04 | Quotas free tier comme vecteur de DoS | ADR-0003 (c) | À traiter | |
| C-05 | Soumission vers un formulaire dépublié | ADR-0007 | À traiter | |
| C-06 | Destinataire non re-vérifié à l'envoi et à la relance | ADR-0007, PRD FR-046 | À traiter | |
| C-07 | « Type réel » non défini ; SVG non exclu | ADR-0011 | En cours | **ADR-0011** § Décision 4 et `## Constraints` (2026-08-01, lot L2) : signature d'octets côté Worker, liste fermée JPEG/PNG/WebP/AVIF, `image/svg+xml` interdit sans nouvel ADR, extension de clé R2 dérivée du type détecté. Reste le check refusant `image/svg+xml` et la cible de test « fichier dont la signature contredit l'extension ». |
| C-08 | Vidéo : `ref` non validée, iframe et oEmbed non contraints | stack.md, ADR-0007 | À traiter | |
| C-09 | Corbeille : délai non normatif, purge sans exécuteur | stack.md, ADR-0003 | À traiter | |
| C-10 | Sauvegardes D1 : lieu, accès, rétention absents | ADR-0008 §4–5 | À traiter | |
| C-11 | Logs du Worker : aucune exigence, PII possibles | PRD ou ADR-0004 | En cours | PRD `FR-104` (2026-08-01). Reste le bornage de `failure_reason` en **ADR-0007** (lot L5). |
| C-12 | Aucun en-tête de sécurité, aucune CSP | ADR-0011 | En cours | **ADR-0011** § Décision 5 et `## Constraints` (2026-08-01, lot L2) : CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy` sur les deux surfaces, point de pose unique par surface, `unsafe-inline`/`unsafe-eval` interdits. Reste la vérification des en-têtes sur le HTML bâti (Playwright, ADR-0005). |
| C-13 | Cache CDN et dérivés après dépublication | PRD ou ADR-0010 | À traiter | |
| C-14 | Définition de formulaire non bornée ; `price_delta` sans signe | PRD FR-048, stack.md | À traiter | |
| C-15 | FR-090 / FR-091 hors du pipeline `writeHandler` | ADR-0004 §e | À traiter | |
| C-16 | Migrations D1 : vérification, rollback, exécutant | ADR-0008 §4–5 | À traiter | |
| C-17a | Contextes d'échappement hétérogènes | ADR-0011 + ADR-0004 | En cours | **ADR-0011** § Décision 3 et `## Constraints` (2026-08-01, lot L2) : cinq contextes de rendu (`html`, `attribute`, `url`, `meta`, `text`) déclarés par le descripteur, aucun contexte implicite. Reste le portage dans le descripteur du **contrat de gabarit** (ADR-0004) et son check. |
| C-17b | Restriction http(s) hors de tout `## Constraints` | ADR-0004 | À traiter | |
| C-17c | Service tokens E2E sans gouvernance | ADR-0005 | À traiter | |
| C-17d | Accumulation de médias non bornée | PRD | Traité | PRD `FR-103` (2026-08-01) : volume borné, éditrice informée avant la limite. Exigence produit, non mécanisable par hook. |
| C-17e | Ajout de dépendances par l'IA non gouverné | ADR-0006 | À traiter | |
| C-17f | Hooks / CI / portail hors des zones protégées | ADR-0006 + promo 0009 | À traiter | |
| C-17g | Jeton D1 de build sous un mécanisme inopérant | stack.md | À traiter | |
| C-17h | Transitives non figées, pas de veille CVE | ADR-0003 | À traiter | |
| C-17i | Pas de processus d'urgence CVE ni d'inventaire de flotte | ADR-0008 | À traiter | |
| C-17j | Aucun monitoring opérateur | ADR-0008 ou ADR dédié | À traiter | |

### Faibles et informatifs

| ID | Constat | Doc cible | État | Preuve |
|---|---|---|---|---|
| D-01 | Pas de déconnexion volontaire ; facteur unique non nommé | PRD, ADR-0003 (b) | En cours | PRD `FR-110` (2026-08-01) : geste de déconnexion explicite. Reste le facteur unique à nommer comme risque accepté en **ADR-0003** (lot L6). |
| D-02 | Provision des comptes `users` ambiguë | ADR-0004 | À traiter | |
| D-03 | Jeton de verrou optimiste à la seconde | stack.md, ADR-0004 §d | À traiter | |
| D-04 | « Email Routing » vs « Email Service » | ADR-0004 (amdt daté) | À traiter | |
| D-05 | « 500 builds/mois » caduc | ADR-0005 (amdt daté) | À traiter | |
| D-06 | Cycle de vie des données de l'éditrice | ADR-0008 §c, stack.md | À traiter | |
| D-07 | Tiers côté visiteur : volet information | ADR-0003 (c) | À traiter | |
| D-08 | Chiffrement et localisation des données | stack.md | À traiter | |
| D-09 | Gouvernance des contributions externes | ADR-0006 ou ADR dédié | À traiter | |
| D-10 | Écart de total absorbé sans trace | ADR-0007 (pour mémoire) | À traiter | |

## Jalons

Trois portes, dans cet ordre. Chacune est franchie quand tous ses constats sont `Traité`, `Accepté` ou `Caduc`.

- [ ] **Porte 1 — avant la première ligne de code du cœur.** A-01, A-02, A-03, B-02→B-12, C-01, C-05→C-08, C-11→C-15, C-17a, C-17b, D-03, D-04. Ces constats portent sur ce que le code doit être : les corriger après coup coûte une réécriture, les corriger maintenant coûte un paragraphe.
- [ ] **Porte 2 — avant la première publication npm du cœur.** A-04, B-13, B-14, C-02, C-16, C-17e, C-17f, C-17g, C-17h, D-09. À partir de cette porte, la flotte dépend d'un canal de distribution ; le sécuriser après la première publication, c'est le sécuriser après l'avoir exposé.
- [ ] **Porte 3 — avant la mise en production de la première instance cliente.** B-01, C-03, C-04, C-09, C-10, C-17i, C-17j, D-01, D-06, D-07, D-08. Ces constats deviennent réels le jour où un visiteur et des données personnelles existent.

## Journal des remédiations

Une ligne par session de remédiation, la plus récente en haut. Reporter aussi l'événement dans `docs/JOURNAL.md` selon le contrat du skill `journal` — ce tableau-ci est le détail par constat, le journal est la chronologie du projet.

| Date | Constats traités | Documents amendés | Note |
|---|---|---|---|
| 2026-08-01 | A-01 **Traité** ; A-02, C-07, C-12, C-17a **En cours** | `docs/adr/ADR-0011-frontieres-de-contenu-hostile.md` *(nouveau)*, `docs/adr/README.md`, `docs/stack.md`, `CLAUDE.md` | **Lot L2** — création d'**ADR-0011 « Frontières de contenu hostile »**, `accepted`, `depends-on: [ADR-0004]`, tracé vers `FR-100` → `FR-104`. Trois frontières tenues chacune en un seul endroit : entrée (schéma), rendu (contexte déclaré), transport (en-têtes) — aucune ne rattrape le défaut d'une autre. Allowlist **fermée** du texte riche, élément non énuméré **rejeté** et non ignoré ; `z.any`/`z.unknown`/`z.record`/`.passthrough()` interdits sur un schéma de valeur de zone, forme mécaniquement détectable de l'allowlist ouverte. Contexte de rendu déclaré par le descripteur (`html`, `attribute`, `url`, `meta`, `text`). Type réel par signature d'octets, liste fermée JPEG/PNG/WebP/AVIF, `image/svg+xml` interdit sans ADR — Sharp étant *build-only*, aucun réencodage ne rattrape la validation. En-têtes et CSP sur les deux surfaces, point de pose unique, sans `unsafe-inline`. Le § 6 nomme ce que ce lot **ne ferme pas** (A-03, C-17b, B-02, B-08/B-09, C-11), pour que les lots suivants ne le rejouent pas. **Tension signalée, non tranchée** : les quatre constats mécanisables restent `En cours` jusqu'à la mécanisation, alors que la Porte 1 exige `Traité` — arbitrage renvoyé au lot de clôture. |
| 2026-08-01 | C-17d **Traité** ; A-01, B-08, B-09, B-12, C-11, D-01 **En cours** | `docs/prd.md` | **Lot L1** — section « Exigences transverses », `FR-100` → `FR-110`. Bornes de taille des entrées visiteur, plafond de volume de soumissions distinct de l'anti-robot, bornage des médias, PII hors journaux, information de confidentialité et mentions légales **rapatriées en V1** avec surface d'édition et blocage de publication, déconnexion volontaire. La ligne « Pied de page enrichi » des Pistes post-V1 est scindée par rature. `SC-001` et `SC-007` gagnent leurs nouveaux *Servi par* ; la question ouverte RGPD est amendée. Découpage des dix lots suivants dans [`suites-audit-securite.md`](./suites-audit-securite.md). |
| 2026-08-01 | — | — | Audit initial : 54 constats ouverts (4 critiques, 14 élevés, 26 moyens, 10 faibles/info). Aucune remédiation encore appliquée. |

## Re-passe d'audit

Cet audit est daté. Il est **périmé** dès que l'un de ces événements survient, et doit être rejoué sur le périmètre concerné :

- la Porte 1 est franchie (les amendements ont changé le corpus qu'il auditait) ;
- du code de production existe — l'audit devient alors un audit de code, pas de conception, et ses conclusions ne se transportent pas telles quelles ;
- un nouvel ADR accepté touche `packages/`, `apps/`, le seam d'auth ou le constructeur de formulaires ;
- le périmètre produit change (nouveau type de zone, nouvelle surface publique, nouveau tiers chargé côté visiteur).

Rejouer l'audit consiste à relancer les quatre angles indépendants en contexte frais — auth et surfaces, entrées et injection, données et vie privée, chaîne d'approvisionnement et opérations — puis à fusionner en réutilisant les identifiants existants pour tout constat déjà connu.

---

*Audit produit le 1ᵉʳ août 2026 par quatre analyses indépendantes en contexte frais, fusionnées et dédoublonnées. Chaque constat cite ses sources ; les mentions « non trouvé dans les documents audités » signalent une absence dans le corpus, non une affirmation sur le code à venir.*
