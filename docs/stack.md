# Stack technique — ColibriCMS

| | |
|---|---|
| **Statut** | Draft |
| **Date** | 2026-08-10 |
| **Trace vers** | [PRD](./prd.md) |
| **Consommé par** | Archi, ADR, CI, niveau specs |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants `I1`–`I6`, contraintes `C1`–`C10`, Annexe A datée |

> **Méthode.** Chaque domaine a été arbitré par l'humain sur des faits **sourcés et datés**,
> jamais sur une préférence d'agent. Les faits proviennent des trois rapports de
> `docs/research/` du 2026-08-10 et de vérifications faites sur la machine, citées ici avec
> leur emplacement. Un fait non sourcé est marqué comme tel : il ne descend pas dans un ADR.

## Vue d'ensemble

ColibriCMS est un CMS déployé en une instance par site, servant un site statique et une
administration depuis un même Worker Cloudflare, dans les comptes du client.
La forme de la solution — style macro et micro, invariants — est dans `docs/archi.md` (phase 4).

## Choix retenus

| Domaine | Choix | Sert (FR/SC) | ADR |
|---|---|---|---|
| Langage | TypeScript, mode strict | (tous) | |
| Générateur du site public et de l'aperçu | Astro 7 | FR-081, FR-095, FR-096, SC-005 | |
| Cible de déploiement et système de build | Un Worker Cloudflare unique — assets statiques + routes serveur —, bâti par Workers Builds | FR-087, FR-089, FR-096, FR-097, SC-001, SC-004 | |
| Base de données | Cloudflare D1 — brouillons, état publié, demandes | FR-026, FR-032, FR-044, FR-051, FR-065, FR-078, FR-092 | |
| Contenu publié en fichiers | Un répertoire par objet dans le dépôt : `page.json` pour la structure, un `.md` par emplacement de texte riche | FR-087, FR-107, FR-109, SC-011 | |
| Médias publiés | Même dépôt, branche orpheline `media` : dépôt **additif** à la publication, **élagage des orphelins au début de la publication suivante** | FR-037, FR-084, FR-088, FR-107, FR-108, SC-011 | |
| Médias en brouillon | D1 : le binaire est stocké en `BLOB`, transféré sur `media` à la publication puis effacé de la base. Plafond **2 Mo par média**, imposé par D1 et non choisi | FR-027, FR-033, FR-034, FR-040, SC-010 | |
| Ingestion des médias | Liste blanche fermée — **JPEG, PNG, WebP**, **SVG refusé** — reconnue sur les **octets d'en-tête** du fichier, jamais sur l'extension ni sur le `Content-Type` du téléversement ; le `Content-Type` servi est déduit de cette liste | FR-027, FR-040, FR-108 | |
| Forge et écriture de la publication | GitHub ; API REST *git data* — **contenu textuel inliné** dans les entrées de `POST /git/trees`, **médias déposés par `POST /git/blobs` en base64** — puis `PATCH /git/refs` en `force: false`, avance rapide obligatoire — **sauf l'élagage de `media`**, seul geste non-avance-rapide, exécuté sous le verrou et calculé depuis D1. Jeton à portée fine, sans expiration, permission `Contents: Read and write` **seule** | FR-086, FR-089, FR-091 | |
| Déclenchement du build | Workers Builds surveille la branche `main` **seule** ; le build récupère `media` pendant son exécution | FR-089, FR-107, SC-011 | |
| Maintien en vie du jeton d'écriture | Cron Trigger dans le compte de la cliente, appel anodin **hebdomadaire** — la cadence *est* la parade : le Cron du palier gratuit n'a **pas de retry**, un appel sauté n'est jamais réémis, et 52 passages par an laissent la marge que la fenêtre glissante d'un an de GitHub absorbe | FR-101, SC-012 | |
| Auth | Implémentation maison sur D1, mécanisme par mécanisme : **code à saisir** — 40 bits, haché, usage unique, expirant, **lié au navigateur demandeur**, brûlé au 5ᵉ essai — et **jamais un lien** ; **session opaque en D1**, donc **sans clé de signature**, expirant à **sept jours d'inactivité et trente jours d'âge** ; cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` ; **jeton anti-CSRF sur chaque écriture**, doublé d'un contrôle d'en-tête `Origin` | FR-001 à FR-008, FR-118, FR-120 à FR-122, SC-006, SC-021 | |
| Moyen de reprise | Code de **128 bits** — 26 caractères base32, groupés pour la recopie — **haché en D1**, remis sur papier à la livraison, **à usage unique et réémis à l'emploi** ; **aucun frein par secret**, l'entropie seule rend la devinette sans objet, en ligne comme sur fuite de la base — rien en configuration du déploiement (`FR-011`), aucune dépendance à un tiers | FR-009 à FR-012, SC-020 | |
| Acheminement des demandes | Cloudflare Email Routing, binding `send_email` vers l'adresse de destination **vérifiée** ; e-mail **inerte et étiqueté** — texte seul, objet fixe posé par le produit, chaque donnée du visiteur rendue derrière son étiquette, aucun lien ni mise en forme construits depuis sa saisie | FR-063, FR-064, SC-007 | |
| Moyen anti-abus | Turnstile en mode *managed* devant, puis compteur de fréquence dans un Durable Object **unique**, qui porte une **table d'origines** — jamais un objet par visiteur. Chaque origine y entre sous une empreinte **HMAC, sous une clé tirée au hasard par le produit pour la seule fenêtre de comptage en cours** ; clé et entrées **effacées ensemble** à la fin de la fenêtre | FR-007, FR-062 | |
| Sérialisation et suivi des publications | Une **seule** ligne d'état en D1 : verrou conditionnel, **bail horodaté** repris à l'expiration, et **issue du dépôt** | FR-090, FR-091 | |
| Constat de la mise en ligne | Le site publié expose l'empreinte du commit dont il est né ; l'administration la lit par une requête **publique** et la compare | FR-090 | |
| Framework d'îlots — administration et pages publiques | Îlots Svelte 5 dans Astro | FR-017, FR-054, FR-117, SC-003, SC-005, SC-015 | |
| Texte riche | Éditeur TipTap, sérialisation en **Markdown restreint** aux marques testées ; au rendu, **liste blanche de schémas d'URL** (`https`, `mailto`, `tel`, relatif) et **aucun HTML brut** | FR-018, FR-117, SC-011 | |
| En-têtes de réponse | **Deux porteurs, imposés par la plateforme** : un fichier `_headers` pour les pages publiques, servies en assets statiques ; les mêmes en-têtes posés **dans le code** pour l'administration, l'aperçu et les médias servis depuis D1, **dont une CSP stricte propre à l'administration** — seule parade qui subsiste au XSS same-origin tant que l'origine reste commune | FR-082, FR-095, FR-096 | |
| Pipeline d'images | `image.layout: 'constrained'`, `image.breakpoints: [640, 960, 1280]`, `<Image>` à un seul format | SC-005, SC-001 (par `C5`) | |
| Accès aux données | API D1 native, migrations `wrangler d1 migrations` | FR-105, FR-106, SC-008 | |
| Tests | Vitest dans `workerd` via `@cloudflare/vitest-pool-workers`, Playwright pour les parcours, épreuve de réversibilité scriptée | (tous) ; SC-003, SC-009, SC-011, SC-016 | |
| Détection de panne d'acheminement | État d'acheminement porté par chaque demande et affiché dans la liste | **— exigence à créer**, voir ci-dessous | |

### Domaines sans objet

- **Authentification du visiteur** — non applicable : `FR-062` exige le seuil de fréquence
  « sans exiger de compte du visiteur ».
- **File d'attente / traitement asynchrone** — non applicable : `FR-097` fait de l'envoi
  d'une demande le seul traitement serveur déclenché par un **visiteur**, et les gestes de
  l'éditrice — édition, aperçu, publication — sont synchrones, la publication étant en outre
  sérialisée.
- **Analytique tierce** — non applicable : exclue par le PRD, qui n'exclut qu'elle ;
  l'instrument exigé par `FR-075` à `FR-078` est porté par D1, déjà retenu.
- **Cache / CDN applicatif** — non applicable : les assets statiques sont servis
  gratuitement et sans quota, sans configuration propre au projet.

### Le seul choix qui ne sert aujourd'hui aucune exigence

L'**état d'acheminement affiché dans la liste des demandes** répond à la question que le
Brief renvoie ici (« comment la cliente s'aperçoit-elle que l'e-mail ne part plus ? »), mais
le PRD ne porte que l'atténuation : `FR-066` enregistre la demande même si l'acheminement
échoue, `FR-010` garde l'admin atteignable. **Aucun `FR` ne demande de détecter.**

Ce choix est donc retenu **sans exigence porteuse**. Il ne peut pas descendre au niveau
specs en l'état : il faut d'abord que `/scd-sdd:premortem socle` crée le `FR` qui le porte.
La phase Stack ne rétro-modifie pas le PRD.

## Contraintes techniques transverses

### Ce que `I5` impose à tout composant

Aucun composant retenu n'exige de moyen de paiement à l'activation, et tous opposent un
**mur** au dépassement (refus, erreur, mise en file) plutôt qu'un compteur facturé. Vérifié
composant par composant dans `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`.
C'est ce critère, et non un palier chiffré, qui disqualifie R2.

**Réserve à porter telle quelle :** « aucun compteur facturé sur le palier gratuit » est une
**déduction** tirée du silence de la documentation, pas une phrase de l'éditeur. Le seuil qui
la ferait tomber — une limite gratuite passant du mur au compteur facturé — est à surveiller.

### Le domaine doit être sur DNS Cloudflare

Deux contraintes convergent et il n'y a rien à arbitrer : `send_email` exige que le domaine
soit servi par le DNS Cloudflare (`FR-063`), et un Worker n'accepte aucun domaine dont les
serveurs de noms sont gérés ailleurs. C'est une ligne de la recette de livraison.

### La publication est une séquence en deux temps

Dépôt **additif** des médias sur la branche `media` → commit du contenu sur la branche
principale. L'ordre est imposé : commit d'abord, marquage « publié » ensuite. Il en découle
que **la sérialisation des publications est obligatoire** (cas limite du PRD, `prd.md:640`) :
un compare-and-swap sur le dernier geste ne protège pas le premier.

**L'élagage des orphelins de `media` n'est pas un troisième temps : il ouvre la publication
suivante.** Le faire après le build supposerait un signal de fin de build que rien ne
produit — le tenir du build lui-même ferait tomber `C3` (« le build ne commite jamais »), le
tenir de l'API Cloudflare imposerait un secret de plus dans le Worker, contre `C7`. La
publication N+1 est déjà sous le verrou et déjà en train d'écrire sur `media` : elle élague
ce que N a laissé, sans acteur ni secret supplémentaire. Conséquence assumée : les orphelins
survivent d'une publication à l'autre — l'espace ne croît pas sans fin, il ne maigrit pas à
l'instant du build.

**Ce qu'il faut garder se calcule depuis D1, jamais depuis l'état lu de la branche.** L'élagage
est le seul geste du système qui écrase (`force: true`) : la latence de réplication mesurée le
11/08 y ferait disparaître en silence un média fraîchement déposé, là où un `force: false`
répondrait `422`. L'inventaire des médias publiés est en D1 ; c'est lui qui décide.

### Le brouillon des médias vit en D1, et c'est D1 qui fixe la borne de `FR-040`

Entre le téléversement et la publication, le binaire est une ligne de D1 ; la publication le
dépose sur `media` puis l'efface de la base. **`media` continue donc de ne recevoir que du
publié**, et le budget de 42 médias par publication mesuré plus bas reste vrai tel quel.

Deux limites officielles décident, et aucune n'est un choix
(docs Cloudflare D1 · *Limits*, page datée du **21/04/2026**) :

- `Maximum string, BLOB or table row size` = **2 000 000 octets**. C'est la borne que
  `FR-040` réclamait au « déploiement » : elle est **documentée, pas estimée**. Un original
  d'appareil photo la dépasse ; `FR-040` le refuse en le disant à l'éditrice. Le coût réel est
  faible — le plus grand *breakpoint* retenu est **1280 px**, et une source de 1280 à 2000 px
  de large passe très en dessous de 2 Mo.
- `Maximum database size` (plan gratuit) = **500 Mo**, et non les 5 Go que l'Annexe A connaît.
  Les 5 Go sont le total **du compte** ; la page *Pricing* ne mentionne pas le plafond par
  base. Le magasin de brouillon partage ces 500 Mo avec les brouillons et les demandes — il ne
  contient jamais que les téléversements non encore publiés, mais c'est ce chiffre-là, dix fois
  plus bas, qui mord.

Ce que ce choix ne tranchait pas — les **formats** admis, le sort du SVG et les en-têtes de
réponse — est tranché au paragraphe suivant : le magasin ne dit rien de ce qui a le droit d'y
entrer.

**Écartées.** *Déposer sur `media` dès le téléversement* — c'est la seule voie qui ferait tomber
le budget de 42 (la publication redeviendrait constante à 4 appels), mais elle rouvre ce que la
séquence en deux temps venait de fermer : l'élagage en `force: true` est calculé depuis D1 et
s'exécute **sous le verrou**, quand un téléversement, lui, ne l'est pas — un média déposé pendant
l'élagage disparaîtrait en silence, exactement le mode de défaillance que le calcul depuis D1
servait à empêcher. Et l'aperçu de `FR-081` devrait relire les octets depuis GitHub, sollicitant
en lecture, à chaque aperçu, un jeton d'écriture. *Une branche orpheline `media-draft`
distincte* — mêmes coûts, plus un espace de plus à ouvrir et à vérifier sous `I1` : c'est le
motif qui avait déjà écarté « deux dépôts distincts ».

### Trois portes remontent vers l'origine commune, et chacune se ferme à un endroit différent

Le site public et l'administration sont servis par **un même Worker**, donc par une même
origine : tout contenu tiers exécuté côté public vaut vol du cookie de session de l'éditrice.
Le choix du Markdown restreint (n° 8) ferme le vecteur du texte riche, et lui seul. Trois
portes restaient ouvertes ; aucune ne se ferme au même endroit.

**1. Ce qui entre — une liste blanche reconnue sur les octets.** Les formats admis au
téléversement sont **JPEG, PNG et WebP**, et le format est reconnu sur les **octets d'en-tête**
du fichier : ni l'extension du nom d'origine, ni le `Content-Type` du téléversement ne sont
crus, et le `Content-Type` renvoyé plus tard est déduit de la liste, jamais recopié. Le geste
est **gratuit** parce qu'il est déjà obligatoire : `FR-108` exige que les fichiers déposés
portent les **dimensions** de chaque média, donc l'en-tête du fichier est lu de toute façon.
`FR-040` — « refuser un téléversement dont le **format** ou le poids sort des bornes » — reçoit
ici son volet manquant ; `S-09` lui avait donné son volet poids (2 Mo, borne D1).

**Le SVG est refusé**, et c'est le même arbitrage que le n° 8 rendu dans l'autre sens : un SVG
est un document exécutable, l'assainir demanderait de prouver une absence, et la stack a déjà
refusé ce pari sur le HTML restreint. Deux conséquences en découlent, toutes deux favorables :
le comportement du pipeline d'images face à un SVG n'a plus besoin d'être établi, et `FR-108`
tient sans règle supplémentaire — un SVG n'a pas de dimensions en pixels fiables. Coût assumé,
et il est réel : un logo vectoriel devra être fourni en PNG, et un téléversement direct depuis
un téléphone en HEIC est refusé — en le disant à l'éditrice, comme `FR-040` l'exige.

**Écartées.** *Le SVG assaini* — une bibliothèque de plus sous le plafond de 3 Mo gzip, pour un
risque dont on ne prouve jamais l'absence. *Le SVG servi depuis une origine distincte* — ferme
le vol de session, mais ouvre un espace de plus à vérifier sous `I1` pour un format dont le
produit n'a pas besoin.

**2. Ce qui est rendu — la liste blanche de marques s'étend aux URL.** Le Markdown restreint
borne les **marques** ; il ne disait rien des **URL**. Sont admis `https`, `mailto`, `tel` et
les chemins relatifs ; tout autre schéma est rejeté, et le rendu n'accepte **aucun HTML brut**.
Le filtre vit dans le **rendu partagé** — l'invariant que `archi` doit reprendre (« l'aperçu et
le publié partagent les mêmes composants ») le fait couvrir d'un seul geste le site bâti et
l'aperçu de `FR-081`. Aucun mécanisme neuf : c'est le contrôle bloquant déjà prévu en `ci` pour
l'aller-retour de sérialisation qui gagne un second volet.

**3. Ce qui est renvoyé — les en-têtes ont deux porteurs, et la plateforme l'impose.**
Docs Cloudflare · *Workers · Static Assets · Headers*, page datée du **23/04/2026** :

> « Custom headers defined in the `_headers` file are **not applied to responses generated by
> your Worker code**, even if the request URL matches a rule defined in `_headers`. »

Or `FR-095` et `FR-096` font des pages publiques des **assets statiques** : `_headers` s'y
applique, et sans rien coûter — « Requests to static assets are free and unlimited » (page
*Pricing*, datée du 07/07/2026), donc hors du quota de 100 000 requêtes par jour. Mais
l'administration, l'aperçu et la route qui sert un média en brouillon depuis D1 sont
**générés par le code** : leurs en-têtes s'y écrivent. C'est la même figure que `FR-090` — un
seul porteur ne couvre pas le cas. Les limites du fichier ne mordent pas : 100 règles, 2 000
caractères par ligne.

À poser des deux côtés : une CSP — qui doit prévoir `challenges.cloudflare.com`, Turnstile
étant retenu —, `X-Content-Type-Options: nosniff`, `Referrer-Policy` et le refus d'être mis en
cadre. `nosniff` est ce qui rattrape la porte n° 1 : un fichier hostile passé pour une image
n'est pas réinterprété par le navigateur.

**Une contrainte de conception en découle, et elle est vérifiable mécaniquement** : si
`run_worker_first` devenait global, **toutes** les réponses seraient générées par le code et
`_headers` ne s'appliquerait plus nulle part. Il reste donc une liste **bornée** de chemins
(`/api/*`, l'administration), jamais un fourre-tout. Le routage est déjà le point n° 2 de la
recette ; il y gagne cette exigence plutôt qu'un point à lui.

**Ce que S-06 ne voyait pas, parce qu'il est daté d'avant l'arbitrage de `S-09`.** Le constat
ne parlait que du **publié**. Depuis que le brouillon vit en D1, un média téléversé est servi
par une **route du Worker**, sur l'origine commune, avec un `Content-Type` que le code choisit
— **avant toute publication**. C'est pour cela que la liste blanche est posée au
**téléversement** et non à la publication.

**L'origine commune est conservée.** Un sous-domaine d'administration dédié mettrait le cookie
de session hors de portée d'un XSS public, mais les trois portes se ferment sans lui, et il
coûterait une entrée DNS et une route de plus, le §3 du socle à amender, et `FR-081` à
revérifier sur les URL relatives de l'aperçu. **Non écarté sur le fond** : c'est la parade de
repli si un jour un contenu tiers doit être servi.

**Hors périmètre de ce paragraphe** : les attributs du cookie de session lui-même relèvent de
la ligne « Auth », sous-spécifiée par ailleurs (`S-05`).

### Pourquoi un code à saisir, et pourquoi une session opaque

Les deux formes sont possibles ; ce sont les modes de panne qui les départagent, et non le
confort.

**Un code plutôt qu'un lien.** Un lien à usage unique est **consommé par les scanners de
messagerie** qui préchargent les URL, avant même le clic : l'éditrice ne peut plus entrer, les
envois sont bornés par `FR-006`, et elle finit par brûler son moyen de reprise à cause d'un
antivirus. Le code n'offre rien à précharger, ne met pas le secret dans une URL — donc ni dans
l'historique, ni dans un `Referer`, ni dans les journaux de la plateforme —, et il rend
**gratuite** la liaison au navigateur demandeur : elle lit sur le téléphone et saisit sur
l'ordinateur, alors que lier un lien interdirait le multi-appareil. Cette liaison ne protège
pas d'un lecteur de sa boîte — le formulaire de connexion est public, quiconque peut déclencher
son propre envoi — mais elle ferme l'ingénierie sociale du « lisez-moi le code que vous venez
de recevoir », qui est le vecteur réaliste sur un profil non technique. L'entropie est portée à
**40 bits** : six chiffres est une convention héritée du SMS, deux caractères de plus rendent la
question de la force brute sans objet.

**Une session opaque plutôt qu'un cookie signé.** L'économie invoquée par un cookie signé
n'existe pas : l'administration lit déjà D1 à chaque écran, et une lecture de session par
requête pèse de l'ordre de **500 lignes par jour sur les 5 000 000** de l'Annexe A. En
échange, la session opaque **retire un secret de l'inventaire** — il n'y a plus de clé de
signature à ouvrir, à ranger ni à faire tourner *(cette phrase annonçait, le 2026-08-11, des
secrets ajoutés par `S-02` et `S-06` ; les arbitrages rendus n'en ont apporté aucun — celui que
`S-01` aura à inventorier est la clé de vérification Turnstile, que son propre constat nomme)* —,
et surtout elle permet à `FR-012` et `FR-013` de **fermer les autres sessions** au moment du
remplacement. C'est ce qui rend réel le remède que le PRD décrit au cas limite de la boîte
compromise, sans offrir pour autant à l'éditrice la fonction que le PRD exclut explicitement :
constater ou fermer une session ouverte ailleurs. Une conséquence automatique n'est pas une
capacité offerte. Écriture bornée en conséquence : le rafraîchissement glissant n'écrit pas à
chaque requête, le budget d'écriture étant cinquante fois plus serré que celui de lecture.

**Et une session expire** (`FR-118`) : sept jours sans usage — la durée de base que le
rafraîchissement fait glisser, jusqu'ici écrite nulle part — et trente jours d'âge, quel que
soit l'usage. Sans ces bornes, une session servie était perpétuelle, et l'objection qui a
écarté la rémanence longue en `A-02` — « irrévocable en cas de vol d'appareil » — s'appliquait
mot pour mot à la propriété que le design conservait : `FR-012` ferme bien les autres sessions,
mais seulement si l'éditrice **sait** qu'il en survit une, et le PRD lui refuse délibérément
tout écran pour le constater (`AU-05`). La borne absolue est celle qui arrête un attaquant qui
entretient la session volée — le glissant l'aurait renouvelée sans fin — ; la borne
d'inactivité éteint en une semaine la session oubliée sur un appareil partagé. Au rythme que
les critères mesurent — `SC-015` prévoit trois mois d'absence — l'éditrice se reconnecte de
toute façon : les bornes n'ajoutent rien au parcours courant.

### La quatrième porte : l'administration affiche du texte d'inconnus

`S-06` a compté trois portes vers l'origine commune et conclu qu'elles se fermaient sans y
toucher. Il en existe une quatrième, que le constat ne pouvait pas voir : **la liste des
demandes**. `FR-064` y porte « les coordonnées du visiteur », `FR-065` enregistre la demande et
`FR-069` à `FR-074` la présentent — le chemin va donc d'un **inconnu de l'internet public**
jusqu'à un écran d'administration, et `FR-061` (aucun fichier téléversé) confirme que c'est du
texte, soit exactement le vecteur d'un XSS stocké. Le filtre de `S-06` ne le couvre pas : il vit
dans le **rendu partagé**, qui sert le publié et l'aperçu, pas l'administration.

Sur une origine commune, un script injecté dans l'administration **est** l'administration : il
n'a pas besoin du cookie, que `HttpOnly` lui cache, puisqu'il émet des requêtes déjà
authentifiées et en lit les réponses. Ni `SameSite`, ni un jeton anti-CSRF — lisible dans le DOM
— n'y opposent quoi que ce soit. **La CSRF est le petit problème ; le XSS est tout le jeu**, et
la protection anti-CSRF retenue au tableau ne vise que la forgerie venue d'un autre site, que
`SameSite=Strict` et le contrôle d'`Origin` referment en une ligne.

Deux parades tiennent l'origine commune, et elles sont cumulatives : l'**invariant
d'échappement** ci-dessous, et la **CSP stricte de l'administration** portée par le second
porteur d'en-têtes que `S-06` vient de créer. Le **sous-domaine d'administration dédié** reste
la parade de repli du candidat n° 15 ; cette quatrième porte lui donne un second motif, sans
rendre le premier caduc.

**« Stricte » se définit par ses interdits, pas par sa chaîne complète** : aucun
`unsafe-inline`, aucun `unsafe-eval`, aucune source tierce — hors `challenges.cloudflare.com`,
déjà exigé plus haut pour Turnstile. Tout script ou style en ligne porte donc un nonce engendré
à chaque réponse, ou une empreinte ; le porteur du nonce est le second porteur d'en-têtes
lui-même — le code qui génère la réponse d'administration pose la même valeur dans l'en-tête et
dans le balisage. Le coût est réel et porte sur la manière dont l'administration est bâtie —
l'hydratation des îlots Svelte produit du script en ligne — et c'est à `archi` de l'instruire :
l'invariant déposé plus bas l'y oblige. Enfin, il n'existe pas de repli pour cette porte : un
script stocké dans la liste des demandes s'exécute dans l'administration quel que soit son
domaine — le sous-domaine dédié ne vaut que contre le XSS venu des pages publiques. Si la CSP
tombait, l'invariant d'échappement resterait seul ; ce renoncement serait un arbitrage à
écrire, jamais une économie d'implémentation.

### La cinquième porte : l'e-mail acheminé vise le facteur d'authentification

`AU-01` l'a nommée : `FR-063` achemine chaque demande **dans la boîte qui reçoit les codes de
connexion**, et le formulaire de devis est ouvert à l'internet anonyme (`FR-057`), borné en
fréquence seulement (`FR-062`). Un inconnu peut donc déposer du texte à côté des vrais messages
du produit, déclencher lui-même l'envoi d'un code depuis l'écran public, et maquiller sa
demande en message de service pour récolter le code — l'ingénierie sociale que la liaison au
navigateur fermait au téléphone se rouvrait par écrit.

La parade est une propriété du **gabarit d'acheminement**, et c'est pourquoi elle vit ici et
non au PRD : l'e-mail est **inerte et étiqueté**. Texte seul — jamais de HTML —, objet fixe
posé par le produit, et chaque donnée du visiteur rendue derrière son étiquette (« Nom : »,
« Téléphone : »…), jamais en position de titre ni de phrase du produit. La surface s'y prête :
une demande ne porte **aucun texte libre** — les sélections viennent du catalogue, le total est
calculé, le visiteur n'écrit que ses coordonnées (`FR-057`, `FR-058`), sans fichier (`FR-061`).
L'imitation d'un message de service doit alors tenir dans une ligne « Nom : … » d'un e-mail
dont le cadre entier dit « demande de devis » — le constat perd ce qui faisait sa force,
« avec la mise en forme et le vocabulaire du produit ».

Deux limites, assumées. Un client de messagerie peut rendre cliquable une URL collée dans un
champ — elle reste derrière son étiquette, le produit n'y peut rien de plus. Et le canal reste
ouvert en écriture : un texte marqué atteint toujours les yeux de l'éditrice. Ce résidu part au
dossier de `/scd-sdd:premortem socle`, où les deux failles de la même racine sont déjà.

**La dissociation des deux adresses au PRD est écartée, sur rejeu de l'écarté de `A-02`.** La
seule forme qui ferme la porte est une adresse d'authentification **dédiée**, ne recevant que
les codes — tout alias ou renvoi remélange les flux, et détourner les demandes hors de la boîte
de la cliente casse « la demande survit : elle arrive dans la boîte e-mail de la cliente »
(Brief). Or une boîte dédiée est un compte ouvert par l'intégrateur que l'éditrice visiterait à
chaque connexion — contre la lettre de `SC-006` (« jamais visités par elle ») et contre
`FR-004` —, avec son mot de passe au dossier d'instance (`AU-11` s'aggrave), le réapprentissage
que `SC-003`/`SC-015` interdisent, et une **compromission silencieuse** : une boîte regardée
seulement à la connexion, l'attaquant s'y installe sans que rien ne se voie, là où la boîte de
vie est au moins surveillée — le cas limite « boîte compromise » s'aggrave au lieu de se
refermer. Enfin elle ne lève pas le verrou qu'on lui prêtait : `send_email` n'écrit qu'à une
destination **vérifiée**, la vérification passe par le compte Cloudflare que `SC-006` interdit
de faire visiter — remplacer une adresse reste un geste de livraison, dissociées ou non, et les
dettes `FR-005`/`FR-014` et `FR-013` restent au dépôt de `S-05` pour le premortem. `AU-12`
(l'adresse se divulgue à l'usage) reste donc ouvert et se requalifie en **constat accepté** —
d'impact « faible en soi », par son propre constat.

### Le rayon d'une session compromise, et où il s'arrête

Tout ce qui précède ferme les portes d'**entrée**. Reste à écrire ce qu'une session volée permet
une fois **entré** — c'est ce qui dit où la frontière est déjà posée. Une session
d'administration compromise fait tout ce que l'éditrice fait : elle déclenche une publication qui
écrit dans le dépôt de contenu (`FR-089`, jeton `Contents: Read and write` du Worker), et elle lit
l'intégralité des demandes reçues (`FR-065` à `FR-079`), qui sont des données personnelles de
tiers.

**La borne du registre durable est déjà tenue par `S-03`, lue ici sous un autre angle.** La
publication écrit en `force: false` : on ne peut qu'**ajouter** des commits, jamais réécrire ni
effacer. Une session compromise peut donc **enterrer** le contenu de référence — publier du
contenu hostile par-dessus le bon — mais pas le **détruire** : le bon reste dans l'historique git,
et `I3` garantit qu'un développeur tiers reconstruit le site sain à partir du dépôt. Le sinistre
est réversible **hors du produit**, sans perte. C'est un vrai coût — la restauration offerte par
l'admin ne tient qu'un cran (`FR-092`/`FR-094`), donc deux publications hostiles la débordent et le
retour à l'état sain devient une reprise git, pas un geste d'administration — mais un coût de
reprise, non une perte. Le `force: false` posé par `S-03` pour la concurrence est ainsi, pour une
seconde raison, ce qui borne une session volée.

**Ce que la session ne prend pas** : le jeton d'écriture lui-même, secret du Worker jamais exposé
au navigateur ; une session compromise ne fait que **demander** au Worker de publier, et son rayon
reste borné par ce que les portes de l'administration acceptent de faire — rien qui excède ce que
l'éditrice fait légitimement. Réduire la portée du jeton ne bornerait donc pas la session (le
Worker a besoin d'écrire pour publier), et exiger une confirmation hors-session à la publication
combattrait `FR-003` sans fermer la lecture des demandes, qui n'exige aucune publication : les deux
sont écartés sur leurs coûts propres, contre un rayon déjà borné.

**Trois résidus qu'aucune borne d'authentification ne ferme**, versés à qui de droit : la
**lecture des demandes** (confidentialité de données de tiers — la session *doit* pouvoir les lire)
rejoint le cadrage des données personnelles ; la **branche `media`**, seule exception au
`force: false` par son élagage en `force: true`, laisse une session compromise détruire des médias
publiés là où le contenu est indestructible — asymétrie portée à `/scd-sdd:premortem socle` ; et la
**fenêtre de réputation** entre une publication hostile et son `git revert`, réversible mais non
instantanée, au même dossier.

### `FR-013` et `FR-014` n'ont aucun porteur, et c'est délibéré

La ligne Auth ne couvre plus que `FR-001` à `FR-008`, et le moyen de reprise `FR-009` à
`FR-012`. Le remplacement de l'adresse autorisée reste **sans choix technique**, parce qu'il est
aujourd'hui **impossible à honorer**, pour deux raisons indépendantes.

1. **`FR-005` verrouille `FR-014`.** Prouver la maîtrise d'une adresse candidate suppose de lui
   écrire ; `FR-005` interdit tout message de preuve « à une adresse autre que l'adresse
   autorisée », et le glossaire du PRD réserve ce titre à celle qui ouvre déjà l'administration.
   L'intention de `A-01` visait l'énumération par balayage, pas un envoi demandé depuis une
   session ouverte : c'est un défaut de rédaction, mais il n'en est pas moins bloquant tel quel.
2. **`FR-013` casse les deux canaux à la fois.** Le glossaire fond en une seule adresse celle
   qui ouvre l'administration et celle où les demandes sont acheminées ; `send_email` n'écrit
   qu'à une **destination vérifiée**. Remplacer l'adresse depuis l'administration coupe donc
   l'acheminement **et** la connexion, jusqu'à une vérification qui se fait dans le compte
   Cloudflare — que `SC-006` interdit précisément de faire visiter à l'éditrice.

Une issue existe et elle est **écartée sur le fond** : appeler l'API Email Routing depuis le
Worker ferait envoyer par Cloudflare lui-même le courrier de vérification, dont le clic vaudrait
la preuve de maîtrise de `FR-014`, refermant les deux points d'un seul geste. Elle exige un
jeton capable de **réécrire le routage du courrier de la cliente**, déposé dans un Worker exposé
à l'internet : une compromission de l'administration cesserait alors d'emporter le contenu du
site pour emporter l'interception permanente de son courrier, donc la récupération de tous ses
comptes. Le correctif élégant aggrave le sinistre ; il n'est pas retenu, et sa disponibilité n'a
même pas à être sourcée.

Les autres issues — épingler la destination des demandes à l'adresse de livraison, assister le
remplacement hors produit, ou renvoyer `FR-013` à la reprise sur pièces de `SC-014` — **amendent
toutes le PRD**. Aucune n'est du ressort de cette phase. En attendant, la Stack refuse de porter
`FR-013` et `FR-014` plutôt que de laisser le niveau specs en inventer une.

### Une seule ligne d'état porte le verrou, son bail et l'issue

Le verrou conditionnel en D1 ne suffit pas seul : un Worker tué net — déploiement, limite
atteinte — n'exécute pas sa sortie, et le verrou resterait posé, refusant toute publication
ultérieure. La ligne porte donc **l'instant de pose et une durée de bail**, et une publication
qui trouve un verrou **expiré** le reprend au lieu de renoncer. La valeur du bail se borne par
ce que dure la séquence — 4 + `M` appels GitHub — et **se mesure en recette** : le chiffre
descend en specs, il ne se décide pas ici.

Reprendre est légitime parce que **la séquence est rejouable telle quelle**. Le dépôt sur
`media` est additif et adressé par contenu : le rejouer redépose les mêmes blobs, sans effet
de bord. L'arbre et le commit se recalculent depuis le HEAD courant — c'est déjà ce
qu'impose le réessai obligatoire du `422`.

Le seul cas qui résiste est **la réponse perdue** : le `PATCH` a abouti, le Worker ne l'a pas
vu, le réessai repart. Il le reconnaît **en comparant l'oid de l'arbre qu'il s'apprête à
pousser à celui du HEAD** — le même contenu produit déterministement le même oid — et rapporte
un succès au lieu d'empiler un doublon. Aucun marqueur à maintenir.

**`FR-090` — « informer l'éditrice de l'issue de sa publication » — est porté par deux gestes
et non un.** La ligne d'état rapporte l'issue du **dépôt**. Mais le dépôt n'est que le
déclencheur (`FR-089`) : un build peut échouer après lui — mur des 20 minutes, quota —, et
l'éditrice verrait l'ancien site avec un succès affiché. Le site publié expose donc
**l'empreinte du commit dont il est né**, à un chemin connu, et l'administration la lit par une
requête **publique**. Aucun jeton d'API Cloudflare, aucun webhook : rien qui morde sur `C7`
ni sur l'inventaire des secrets.

### Le budget de sous-requêtes d'une publication, mesuré

`POST /git/trees` accepte le contenu **inliné** dans l'entrée d'arbre : le texte ne coûte
alors aucun appel dédié, et la chaîne tient en **4 appels quel que soit le nombre de fichiers
texte** — mesuré jusqu'à 1 000 entrées en une requête. Un blob par fichier coûtait `N + 4`,
soit les 50 sous-requêtes franchies **au 47ᵉ fichier**.

**Le contenu inliné est de l'UTF-8, et un binaire y est corrompu en silence** : un PNG de
70 octets en ressort à 84, `0x89` devenu `0xC2 0x89`, l'arbre répondant `201` malgré tout.
Les médias gardent donc `POST /git/blobs` en base64 — **un appel chacun, non mutualisable**.

Le budget devient `M + 4` appels pour `M` médias, le nombre de fichiers texte n'y figurant
plus. Un réessai (ci-dessous) coûte 4 appels de plus sans recréer les blobs, d'où `M + 8 ≤ 50` :

| | Plafond par publication |
|---|---|
| Fichiers texte | **non contraint** |
| Médias déposés | **42**, un réessai réservé — borne à descendre en specs |

**Le préambule qui lit le HEAD n'est pas fiablement *read-your-writes*.** Sur dix publications
enchaînées, deux `PATCH` ont été rejetés en `422 Update is not a fast forward` alors que rien
d'autre n'écrivait sur la branche ; les deux voies de lecture — `git data` et REST — se sont
montrées en retard tour à tour, et leur accord n'a rien garanti. **Le réessai est donc
obligatoire**, et le `422` fait au passage la démonstration de ce sur quoi `FR-091` s'appuie :
il refuse, il n'écrase pas. La fréquence réelle reste inconnue — la mesure enchaîne les gestes
en conditions adverses, là où le verrou D1 les sérialise et les espace.

Mesure du 11/08/2026, sur dépôt jetable et avec témoin :
[relevé](./research/2026-08-11-sous-requetes-publication.md), trace brute rejouable à côté.

### Ce que le déclenchement par `main` seule règle, et ce qu'il laisse

`FR-089` fait du dépôt du **contenu publié** l'unique déclencheur : le dépôt des médias n'en
est pas un, donc `media` ne déclenche rien et une publication ne produit **qu'un** build.
L'élagage ayant quitté l'après-build (ci-dessus), il n'y a plus d'écriture sur `media` après
le build non plus. Reste une dépendance qu'il faut lever **avant** la mise en ligne et non
après : le *checkout* de Workers Builds doit atteindre `media`, sinon le build ne trouve
aucun média. C'est un point **bloquant** de la recette, plus une curiosité.

**`C4` est tenu par construction, mais sa vérification teste autre chose.** « Une rafale
d'enregistrements doit produire un build, pas dix » décrit une architecture où enregistrer
commite. Ici les enregistrements vont en D1 et ne commitent jamais : seule une publication
commite, et c'est un geste explicite avec récapitulatif et confirmation (`FR-083`, `FR-085`).
Dix enregistrements en deux minutes produisent **zéro** déploiement. La ligne de vérification
du socle est à corriger en conséquence. Résidu assumé : dix *publications* en deux minutes
feraient dix builds — le verrou sérialise, il ne débounce pas —, mais la concurrence de build
est de 1 et les met en file **sans erreur ni coût** (Annexe A).

**Les minutes de build ne sont bornées par rien de mesuré.** À la limite de conception de
`C5` — 15 000 fichiers, de l'ordre de 3 000 photographies —, le build régénère toutes les
variantes d'images. Le mur des **20 minutes par build** est la limite dure, et les 3 000
minutes/mois sont précisément le quota dont le comportement au dépassement n'est documenté
d'aucun côté (Annexe A, réserve 1). La durée du build rejoint donc le nombre de fichiers par
photographie dans ce qui **se mesure au premier déploiement réel**.

**La bifurcation, écrite pour ne pas être découverte au mur.** Si cette mesure montre une
durée qui croît avec la médiathèque, la parade connue est de **générer les variantes à la
publication** et de les déposer, le build ne faisant plus que les servir. Elle a un prix
chiffrable dès aujourd'hui : cinq fichiers par photographie au lieu d'un font tomber le
budget médias de **42 à environ 8 par publication**. C'est `archi` qui tranchera, avec le
chiffre en main — pas cette page.

### `C6` change de forme

« Un clone nu du dépôt produit le site complet » devient **« un clone, deux branches »** :
la procédure de reconstruction de `FR-107` et `FR-109` doit récupérer `main` **et** `media`.
Le *fetch* de `media` pendant le build doit être **explicite dans la commande de build et
porter son propre jeton** en lecture — Cloudflare ne documente ni la profondeur du clone ni
les refs récupérées. C'est un secret de plus à ouvrir sous `I4` et à inventorier sous `C7`.

### Le garde-fou `C5`, chiffré par la configuration retenue

Le plafond de 20 000 fichiers porte sur la **sortie du build**, jamais sur les sources du
dépôt. Avec `constrained` + breakpoints `[640, 960, 1280]` + `<Image>` à un format, une
photographie produit **5 fichiers** — soit un mur vers 4 000 photographies et l'alerte `C5`
(15 000 fichiers) vers 3 000. Calcul dérivé de `astro@7.2.0`,
`package/dist/assets/layout.js` (`getWidths`) et `internal.js:121` (sélection de
`LIMITED_RESOLUTIONS` dès que le service d'images est local). La valeur réelle se mesure au
premier déploiement et se reporte en Annexe A (réserve 3).

### Données personnelles

« Une même origine » au sens de `FR-007` et `FR-062` est une adresse IP, donc une donnée
personnelle. **Un hachage simple n'en fait pas une pseudonymisation**, et cette page l'a
prétendu jusqu'ici : la recette d'un hachage est publique, si bien qu'on ne *renverse* pas une
empreinte — on hache un candidat et on compare. Vérifier qu'une personne dont on connaît
l'adresse est passée coûte donc **une** opération ; et balayer l'espace IPv4 entier a été
**mesuré à ~110 s** sur un poste à douze cœurs, moins d'une seconde sur une carte graphique.
La taille de l'espace n'y change rien : l'attaque par confirmation vaut identiquement en IPv6,
et une adresse tronquée se confirme comme une adresse entière.

**Forme retenue.** Le compteur vit dans un **objet unique** qui porte une table d'origines —
jamais un objet par visiteur, dont le nom serait lui-même l'empreinte d'une adresse et
créerait, dans l'infrastructure de la plateforme, un identifiant qu'aucune reprise ne retire.
Chaque origine entre dans cette table sous une empreinte **HMAC**, sous une clé que le produit
**tire au hasard au début de chaque fenêtre de comptage** ; à la fin de la fenêtre, la clé et
les entrées sont **effacées ensemble**. La durée de la fenêtre et la valeur du seuil ne sont
pas fixées ici — ni `FR-007` ni `FR-062` ne les chiffrent, c'est au niveau specs de le faire —
mais la propriété tient quelle que soit leur valeur : **rien de dérivé d'une origine ne survit
à la fenêtre qui l'a fait naître**.

**Ce que cette clé est, et ce qu'elle n'est pas.** Elle n'est **pas** un secret ouvert au nom
de la cliente : personne ne la crée, ne la range ni ne la remet — le produit la fabrique et la
jette. Elle n'entre donc pas à l'inventaire ci-dessous, et il n'y a aucune rotation à tenir à
la main, celle-ci étant automatique par construction. Contre qui lit à la fois la table et la
clé, elle ne protège rien ; mais ce lecteur-là dispose déjà, dans la même base, des
coordonnées en clair de tout visiteur ayant envoyé une demande (`FR-057`). Elle vaut contre la
fuite partielle — une table lue sans sa clé, une sauvegarde ancienne — et, surtout, contre la
conservation qui n'a pas lieu d'être.

**Ce compteur est le seul endroit du produit qui retienne quoi que ce soit tiré d'une adresse
IP** : une demande enregistrée ne porte que sa date, son formulaire et sa page d'origine
(`FR-067`), et ses coordonnées sont saisies par le visiteur lui-même. Il n'y a donc rien
d'autre à assainir ailleurs.

Ce qui reste au chantier `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md`
est l'**information du visiteur** — dire qu'une adresse est traitée, et à quelle fin —,
question juridique et non technique. La **période de rotation** ne lui est pas renvoyée : la
forme retenue n'en a pas. *(§ réécrit le 2026-08-12 par le traitement de `S-02`.)*

### Secrets à ouvrir au nom de la cliente (`I4`, `C7`)

**Trois**, et aucun n'appartient à l'intégrateur. Le dossier d'instance dit où chacun est rangé,
jamais sa valeur (`FR-112`).

| Secret | Portée |
|---|---|
| Jeton d'écriture de la publication | Portée fine, dépôt unique, **sans expiration**, `Contents: Read and write` **seule** — mesurée le 11/08/2026 |
| Jeton de lecture du *fetch* de `media` pendant le build | Portée fine, dépôt unique, `Contents: Read-only` — mesurée le 11/08/2026 |
| **Clé de vérification Turnstile** | Le widget est créé dans le compte Cloudflare de la cliente ; sa clé **publique** vit dans la page, seule la clé de vérification est un secret, et elle ne sert qu'à l'appel serveur qui valide le jeton du visiteur — portée close par construction, rien à borner. Ajoutée le 2026-08-12 par le traitement de `S-01` |

*La **clé de signature des cookies de session** a été retirée de cet inventaire le 2026-08-11
par le traitement de `S-05` : la session est opaque en D1, il n'y a plus rien à signer. Cet
inventaire est celui de la phase Stack, et non l'inventaire de livraison — c'est le traitement
de `S-01` qui l'établit. **Ni `S-02` ni `S-06` n'ajoutent de secret** — contrairement à ce que
le traitement de `S-05` annonçait le 2026-08-11 : `S-06` s'est refermé sur les médias, les URL
et les en-têtes, et `S-02`, arbitré le 2026-08-12, sur une clé d'empreinte que le produit tire
lui-même pour la seule fenêtre de comptage, ouverte au nom de personne. **`S-01`, rendu le
2026-08-12, a fermé les trois renvois** : le Turnstile entre ci-dessus ; le retrait de la clé
de signature était sans objet au socle, où elle n'a jamais figuré ; et le **moyen de reprise
n'entre pas dans ce tableau** — le produit le fabrique et l'imprime, il n'est ouvert dans aucun
compte, exactement la forme qui avait laissé la clé d'empreinte de `S-02` hors inventaire. Il
est porté par le §7 du socle, où `SC-013` et `FR-112` le réclament.*

**Le jeton d'écriture n'expire pas, mais il peut disparaître.** La documentation de GitHub
énonce, pour un jeton **à portée fine** — celui-ci —, qu'il est « **revoked automatically** if
pushed to a public repository or gist, or **if unused for one year** » (docs GitHub ·
*GitHub credential types reference*, § « Credential revocation », ligne *Fine-grained personal
access token* ; fichier source `github/docs` au commit `6f9f6f89` du **23/06/2026**). Comme
`FR-101` exige qu'une publication aboutisse après retrait de tous les accès de l'intégrateur,
et que `SC-006` interdit d'envoyer la cliente sur GitHub, un **Cron Trigger dans son propre
compte** fait périodiquement un appel anodin avec ce jeton. Il vit chez elle, donc `I6` et
`C10` tiennent.

*Cette parade repose sur une **lecture**, et non sur une phrase de GitHub : « unused for one
year » est une fenêtre glissante, mais la documentation n'écrit nulle part que le compteur
**repart à zéro** à chaque usage, ni ce qui compte comme usage. Relevé versé :
[`research/2026-08-12-jeton-github-desuetude.md`](./research/2026-08-12-jeton-github-desuetude.md).*

### Ce que `archi` devra reprendre en invariants

- Le rendu de l'aperçu et le rendu publié partagent **les mêmes composants** : c'est la seule
  façon de tenir `FR-081` (« le même rendu que celui du site publié ») sans un second moteur
  qui divergerait.
- La logique métier n'importe pas le framework web : sans cela, `C6` — le mode de build
  depuis les fichiers plats, sans D1 — n'est pas atteignable.
- **Aucune donnée fournie par un visiteur n'atteint un rendu HTML brut.** Svelte échappe par
  défaut ; seul `{@html}` casse cette propriété. L'invariant est falsifiable et se lit dans les
  sources — c'est la première des deux parades qui tiennent la quatrième porte.
- **Aucun script ni style en ligne sans nonce ou empreinte dans l'administration.** C'est la
  contrainte d'écriture que la CSP stricte impose ; l'hydratation des îlots Svelte en produit,
  et `archi` doit instruire ce coût — mécanisme du nonce ou de l'empreinte compris — avant de
  figer la manière dont l'administration est bâtie. L'invariant se lit dans les réponses et
  dans les sources — c'est la seconde des deux parades qui tiennent la quatrième porte ; la
  première est l'invariant qui précède.
- **Rien de dérivé d'une origine ne survit à la fenêtre de comptage qui l'a fait naître.** Le
  compteur de fréquence tient dans un objet unique et n'y écrit que des empreintes HMAC sous
  une clé propre à la fenêtre ; clé et entrées s'effacent ensemble. Trois manières de le
  casser, toutes lisibles dans les sources : un objet nommé d'après une origine, une entrée
  qui franchit sa fenêtre, une clé qui ne change pas d'une fenêtre à l'autre.

### Vérification mécanique obligatoire

Le Brief pose que « le code entrant n'est pas relu ligne à ligne » et que la confiance doit
venir de vérifications mécaniques. Neuf choix de cette page en dépendent explicitement et la
phase `ci` doit les rendre bloquants :

- l'**aller-retour de sérialisation Markdown** de l'éditeur — une marque autorisée qui ne se
  sérialise pas disparaît en silence à la publication ;
- le **rejet d'une URL de schéma non autorisé** dans le Markdown rendu, sur le même chemin de
  vérification que le précédent ;
- le **garde-fou `C5`** sur le nombre de fichiers produits ;
- la **liste `run_worker_first` bornée** — un contrôle de configuration, lu dans le fichier de
  déploiement : elle passe globale et le fichier `_headers` cesse silencieusement de s'appliquer
  aux pages publiques ;
- l'**absence de `{@html}` sur toute donnée fournie par un visiteur** — l'invariant ci-dessus, qui
  se vérifie dans les sources. Sans lui, la liste des demandes est un XSS stocké ouvert à
  l'internet public, sur la même origine que l'administration ;
- la **composition inerte de l'e-mail acheminé** — texte seul, objet fixe, chaque donnée du
  visiteur derrière son étiquette : un gabarit qui redevient HTML, ou laisse une saisie en
  position de phrase du produit, rouvre en silence la cinquième porte ;
- la **CSP stricte sur toute réponse d'administration** — l'en-tête est présent **et** ne porte
  ni `unsafe-inline`, ni `unsafe-eval`, ni source tierce hors Turnstile : la présence seule ne
  prouve rien, ce sont les interdits qui se vérifient ; une directive qui se relâche rouvre en
  silence la seconde parade de la quatrième porte ;
- les **attributs du cookie d'administration et le jeton anti-CSRF** — préfixe `__Host-`,
  `HttpOnly`, `Secure`, `SameSite=Strict` sur le cookie qui porte la session, et jeton vérifié
  sur **chaque** écriture, doublé du contrôle d'en-tête `Origin` : quatre attributs et deux
  gestes dont l'absence ne casse aucun écran — elle ne se voit qu'à l'attaque. Ils sont
  statiques, donc lisibles dans les sources ; les deux mécanismes de comportement de la même
  ligne relèvent, eux, de `FR-120` à `FR-122` et de l'épreuve `SC-021`.
- l'**effacement conjoint de la clé de fenêtre et des entrées du compteur de fréquence**, et
  l'**absence de tout objet nommé d'après une origine** — la promesse du § « Données
  personnelles » est une propriété statique, donc lisible dans les sources, et c'est le seul
  registre qui puisse la porter : une entrée qui survit à sa fenêtre ne casse aucun écran et ne
  se voit qu'en ouvrant la base.

## Le jeton d'écriture — mesuré ou cité, jamais déduit

Ce point était ouvert. Il a été fermé le **11/08/2026** par une série de mesures sur un dépôt
jetable (`sebc-dev/colibri-jeton-essai`), avec témoin positif à chaque fois. **Chaque ligne porte
désormais son propre niveau de preuve**, dans la colonne de droite, plutôt qu'un découpage annoncé
en tête : le 12/08/2026, le traitement de `S-10` a montré qu'un même fait pouvait être mesuré ici
et cité là.

Deux passages de ce traitement l'ont remanié. Le fait 3 a substitué à une phrase portée aux jetons
**classiques** la ligne qui parle du jeton **à portée fine**, et la documentation s'est trouvée
corroborer, au passage, le fait mesuré de la première ligne. Le cinquième grief a montré que **deux
lignes n'avaient pas besoin d'être mesurées** : GitHub publie les permissions exigées de chaque
point d'entrée REST sous forme de donnée lisible à la machine, et cette donnée dit en outre ce que
la mesure ne pouvait pas voir — le déplacement de ref admet un **second** jeu de permissions.
Relevé versé :
[`research/2026-08-12-permissions-rest-git-data.md`](./research/2026-08-12-permissions-rest-git-data.md)
+ trace brute rejouable.

**Ce qui reste sans trace, et qui est assumé.** Le dépôt jetable a disparu et la trace des appels
du 11/08 n'a jamais été versée ici ; **quatre** lignes portent donc `[mesuré · trace non versée]`,
dont une pour sa seule moitié mesurée. Trois ne coûtent rien — la première est corroborée par la
documentation, l'avance rapide l'est pour son intention, celle du `git push` ne porte aucun
argument. **La quatrième, si** : la double permission exigée par GraphQL est le seul motif
écrit de son écartement au candidat ADR n° 5, et elle ne se citera jamais. **Arbitré le 12/08/2026
par le traitement de `S-10` : elle est conservée telle quelle, marquée.** Rejouer la mesure
supposerait de créer à la main des jetons à portée fine — un jeton `gh` ordinaire ne peut pas en
tenir lieu, puisque c'est précisément ce qu'une permission *unique* autorise qui est en jeu.

| Fait | Comment il a été obtenu |
|---|---|
| Un jeton à portée fine sur compte personnel peut n'avoir **aucune expiration** | [mesuré · trace non versée] Témoin à 7 j → en-tête `github-authentication-token-expiration` daté ; jeton sans expiration → aucun en-tête. **Corroboré par la dernière ligne**, qui le dit par la documentation |
| `POST /git/blobs`, `/git/trees` et `/git/commits` n'exigent que **`Contents: write`** | [officiel · cité] `progAccess.permissions` vaut `{"Contents": "write"}` pour les trois — donnée source de la doc GitHub, `github/docs` › `src/rest/data/fpt-2026-03-10/git.json`, commit `0b2db291` du 23/06/2026, identique en version d'API `2022-11-28`. Corrobore la mesure du 11/08 (aucun refus sur la chaîne) |
| **Le déplacement de ref, lui, a *deux* jeux de permissions suffisants** : `Contents: write`, **ou** `Contents: write` + `Workflows: write` | [officiel · cité] même source, `POST /git/refs` et `PATCH /git/refs/{ref}`. La mesure du 11/08 ne pouvait pas le voir : le dépôt d'essai n'avait aucun fichier de workflow. *Lecture, non citée : le second jeu se lève quand le commit visé touche `.github/workflows/`* — voir la contrainte au candidat ADR n° 5 |
| `PATCH /git/refs` en `force: false` **refuse** un déplacement qui n'est pas en avance rapide | [officiel · cité] pour l'intention — *« Indicates whether to force the update or to make sure the update is a fast-forward update. Leaving this out or setting it to false will make sure you're not overwriting work. »*, REST · *Update a reference*. [mesuré · trace non versée] pour la réponse exacte : commit bâti sur un parent périmé → `422 Update is not a fast forward` ; sur la tête courante → accepté |
| Les mutations GraphQL `updateRefs` et `createCommitOnBranch` exigent **`Contents` + `Workflows`** | [mesuré · trace non versée] `Contents` seul → `FORBIDDEN` ; `Contents` + `Workflows` → `UNPROCESSABLE` sur l'oid attendu, puis commit créé. Ne se citera jamais : l'entrée `createCommitOnBranch` de la donnée GraphQL de `github/docs` ne porte **aucune** clé de permission, là où une opération REST porte la sienne |
| Le `git push --force-with-lease` fait le même contrôle, avec `Contents` seule | [mesuré · trace non versée] Oid attendu faux → `stale info` ; oid attendu juste → accepté. Rien ne repose dessus : `git push` est écarté parce qu'un Worker n'a ni sous-processus ni système de fichiers |
| Un jeton **à portée fine** inutilisé pendant un an est révoqué — comme il l'est s'il est poussé dans un dépôt ou un gist public | [officiel · cité] *« **Revoked automatically** if pushed to a public repository or gist, or if unused for one year »* — docs GitHub · *GitHub credential types reference*, § « Credential revocation », ligne *Fine-grained personal access token* ; source `github/docs` au commit `6f9f6f89` du 23/06/2026 |
| Un jeton à portée fine peut avoir une durée de vie **infinie** — le même fait que la première ligne, ici par la documentation et non par le témoin | [officiel · cité] *« Configurable (up to 1 year, or no expiration) »* — même page, tableau d'ensemble, colonne *Lifespan* |

**Ce qui reste une inférence, à écrire comme telle** : la *nécessité* de `Workflows` pour les
mutations GraphQL est obtenue par différence — un seul facteur a changé entre les deux jetons —
et non par une phrase de GitHub, qui ne publie aucune table de permissions GraphQL.

**Ce qui n'a pas été instruit** : la branche GitHub App. Le jeton d'installation expire en une
heure (documenté) ; que la clé privée n'expire jamais n'est écrit sur aucune page lue, et la
propriété d'une App installée sur un compte de particulier (`I4`, `FR-098`) n'a pas été
établie. Sans objet tant que la voie retenue tient.

## À constater en recette, jamais par recherche

Ces points ne se tranchent que par un appel réel ; ils ne sont ni des faits acquis, ni des
options. Les trois qui portaient sur le jeton d'écriture ont été retirés le 11/08/2026 —
ils sont mesurés ci-dessus.

1. `DELETE … RETURNING` sur D1 — la page SQL n'énumère que FTS5, JSON et math, et renvoie au
   code source.
2. Le routage `/api/*` vers le code du Worker — `run_worker_first` et `not_found_handling` ne
   sont tenus que d'un billet personnel, pas de la documentation. **Le traitement de `S-06` y
   ajoute une exigence** : la liste de `run_worker_first` doit rester **bornée** aux chemins de
   l'administration et de l'API, faute de quoi les pages publiques cessent d'être des assets
   statiques et le fichier `_headers` ne s'applique plus à rien.
3. **Bloquant.** Le *checkout* Cloudflare atteint-il la branche `media` sans jeton fourni —
   ni documenté ni infirmé. Le build ne déclenche que sur `main` : si la réponse est non, le
   jeton de lecture `Contents: Read-only` déjà prévu au §7 du socle devient **obligatoire**,
   et sans lui le site bâti n'a aucun média. À lever avant la mise en ligne.
4. La délivrabilité réelle vers les boîtes françaises — Email Sending est en bêta publique
   depuis le 16/04/2026.
5. Qu'un `BLOB` de ~2 Mo fasse l'aller-retour par un **paramètre lié**. La documentation borne
   la ligne à 2 Mo et l'instruction SQL à 100 Ko — donc le binaire ne peut pas être inliné —,
   mais elle ne dit **rien** de la taille maximale d'un paramètre lié. Le plafond de `FR-040`
   en dépend : si le paramètre lié mord plus bas, c'est ce chiffre-là qui devient la borne.
6. **Au nom de qui la connexion entre Workers Builds et GitHub est-elle posée.** C'est le seul
   endroit de la chaîne où deux comptes se parlent, et ce n'est **pas un jeton** : c'est une
   autorisation, donnée par un compte GitHub, que ni le tableau ci-dessus ni la topologie du
   §3 ne nomment. Si elle porte le compte de l'intégrateur, le retrait des accès laisse le
   `git push` passer et **le build ne part plus** — la dépendance invisible que `I4` décrit,
   et qu'aucun des trois secrets inventoriés ne couvre. À constater par un appel réel, et non
   par recherche : le durcissement de `C10` au §7 du socle donne la manière de le voir.
   *(Ajouté le 2026-08-12 par le traitement de `S-01`.)*
7. **La disponibilité des Cron Triggers sur le palier gratuit, et leurs limites** — 5
   déclencheurs par compte, 3 par Worker, minimum d'une minute, UTC seulement. Le rapport du
   palier gratuit, qui inventorie composant par composant, **ne les mentionne pas** : elles ne
   sont tenues que de blogs tiers, comme au point 2. Le §7 du socle fait déjà constater le Cron
   de maintien en vie actif avant la livraison — c'est là que ça se voit, et c'est la même
   observation qui vérifiera que la cadence hebdomadaire du tableau est tenable.
   *(Ajouté le 2026-08-12 par le traitement de `S-11`.)*

## Décisions structurantes → candidats ADR

Une ligne = un futur ADR. La colonne « ADR » du tableau ci-dessus est back-fillée par
`/scd-sdd:adr`.

1. **Cible de déploiement et système de build : un Worker unique bâti par Workers Builds.**
   Retenue car `FR-081` exige un aperçu rendu serveur avec les mêmes composants que le site
   publié, ce qui impose un adaptateur, et parce que la CI hébergée de Cloudflare est couplée
   à la cible. Alternative écartée : **projet Pages + Pages Build** — `@astrojs/cloudflare`
   a retiré le support de Pages à la **v13.0.0, publiée le 10/03/2026** : le plan de routage
   `_routes.json`, propre à Pages et à aucune autre cible, est écrit par la v12.6.13 et
   n'apparaît plus **une seule fois** dans le `dist` de la v13.0.0, dont le module
   `generate-routes-json.js` tombe de 225 à 22 lignes et perd son `createRoutesFile`. L'aperçu
   rendu serveur y imposerait donc `astro@5.18.2` — dernier de la branche que la v12.6.13
   épingle (`astro ^5.7.0`) — contre `astro@7.2.1` : deux majors en arrière, sur une branche
   que l'adaptateur a quittée, et `FR-105`/`SC-008` font porter cette dette par toute la
   flotte. Les plafonds, eux, sont **égaux** des deux côtés et n'ont rien départagé.

   *Complété le 2026-08-12 par le traitement de `S-10` et de `S-11`, qui reprochaient à cette
   ligne un fait sans trace et une correction tue. **« v13 » et « Astro 6 » nomment le même
   événement** : `@astrojs/cloudflare@13.0.0` et `astro@6.0.0` ont été publiés le 10/03/2026 à
   trois secondes d'intervalle. Ce document ne corrige donc pas
   [son rapport](./research/2026-08-10-pages-ou-workers-static-assets.md), qui date la rupture
   d'« Astro 6, déc. 2025 » : il substitue une **date de publication** à une **date
   d'annonce** — la PR de documentation que le rapport cite est passée pendant l'alpha d'Astro
   6 (`6.0.0-alpha.0`, 10/11/2025). Les deux dates coexistent, et un lecteur qui remonte au
   rapport doit le savoir. La mesure a par ailleurs invalidé deux des preuves écrites ici : le
   README de la 13.0.0 dit **encore** « Cloudflare Pages Functions targets » — il ne bascule
   qu'à la 13.1.3, le 20/03/2026 —, et le mot `pages` figure bien trois fois dans son `dist`,
   au sens des pages du site. Elles ont cédé la place à `_routes.json`, qui se vérifie d'une
   commande.* Relevé versé :
   [`research/2026-08-12-adaptateur-astro-pages.md`](./research/2026-08-12-adaptateur-astro-pages.md)
   + trace brute rejouable.

   *Étendue le 2026-08-12 par le traitement de `S-17`, qui a trouvé la ligne « Déclenchement du
   build » sans candidat : née le 11/08 du traitement de `S-08`, elle est postérieure au constat,
   et le système de build qu'elle configure est le sujet de cette ligne-ci.* **Workers Builds
   surveille la branche `main` seule ; le build récupère `media` pendant son exécution.** Retenu
   car `FR-089` réserve le déclenchement au dépôt du **contenu** : `media` ne déclenche donc rien,
   et une publication ne produit **qu'un** build — l'élagage ayant quitté l'après-build par `S-03`,
   il n'y a pas de troisième build. `C4` en découle par construction : dix enregistrements vont en
   D1 et produisent **zéro** déploiement, seule une publication commite. Alternative écartée :
   **surveiller les deux branches** — le dépôt sur `media` rebâtirait le site sur un contenu
   inchangé et doublerait une consommation de minutes que l'Annexe A ne sait pas encore chiffrer.
   Résidu assumé : dix *publications* en deux minutes font dix builds, mis en file sans erreur ni
   coût par la concurrence de 1. **Ce que la configuration suppose et qui n'est pas acquis** : que
   le *checkout* de Cloudflare atteigne `media` sans jeton fourni — sinon le jeton de lecture
   `Read-only` du §7 devient obligatoire, faute de quoi le site bâti n'a aucun média ; c'est le
   point 3 de « À constater en recette », promu bloquant.

2. **Générateur : Astro 7.** Retenu car il produit un site statique par défaut (`FR-095`,
   `FR-096`) *et* sait rendre les mêmes composants côté serveur pour l'aperçu (`FR-081`).
   Alternative écartée : **Eleventy ou Hugo** — un générateur purement statique n'a pas de
   moteur de rendu serveur, donc l'aperçu repasserait par un build (attente pour l'éditrice,
   consommation du quota) ou par un second moteur, dont la divergence casserait « le même
   rendu que celui du site publié ».

3. **Magasin : D1 porte les brouillons et l'état publié ; le dépôt reçoit la copie publiée.**
   Retenu car il confirme `C1` et `I2` sans retouche. Alternative écartée : **le dépôt EST le
   magasin** (et sa variante dépôt + index D1 dérivé) — reconstruire l'index inverse
   qu'exige `FR-032` sans base dépasse le plafond de **50 sous-requêtes par requête** des
   Workers, à la lecture comme à la reconstruction.

4. **Médias : deux magasins, un par état — branche orpheline `media` pour le publié, additive
   à la publication et élaguée au début de la suivante ; D1 pour le brouillon, le binaire
   passant de l'un à l'autre à la publication.** La branche est retenue
   car l'espace occupé est **borné par le jeu courant des médias publiés** au lieu de croître
   sans fin — un dépôt à historique complet, lui, garde chaque version de chaque média pour
   toujours —, `FR-037` et `FR-084` restent vrais à l'écran, et `SC-011` n'exige pas l'identité
   binaire. Alternatives écartées : **R2** — tout
   usage, même gratuit, passe par un *checkout* d'activation obligatoire (doc R2 « Get
   started », MAJ 21/04/2026) qui **souscrit un service facturé à l'usage sur le moyen de
   paiement du compte** (Billing policy) ; `I5` tenant à l'**absence** de moyen de paiement
   enregistré, il tombe là — sans qu'il soit besoin du dialogue de carte, lui seulement
   rapporté ; **deux dépôts distincts** — mêmes bénéfices, un
   espace de plus à ouvrir et à vérifier sous `I1` ; **D1, KV ou Durable Objects pour le
   publié** — `FR-107` exige des **fichiers**, un clone nu n'en produirait aucun ; **un dépôt à
   historique complet** — `FR-037` et `FR-084` deviendraient faux à l'écran.
   **D1 pour le brouillon est retenu par la portée de ce même motif** : `FR-107` et `SC-011`
   portent sur le site reconstructible, donc sur le publié — ce qui n'est pas encore publié n'a
   pas à survivre dans un clone nu, et croire cette piste morte est ce qui laissait le brouillon
   sans magasin. Le choix ne coûte ni espace ni secret de plus sous `I1` et `C7`, il laisse
   intacte la séquence de publication, et il fait de `FR-040` une borne **documentée** (2 Mo,
   limite de ligne D1) au lieu d'un chiffre d'estime. Alternatives écartées pour le brouillon :
   **déposer sur `media` dès le téléversement** — ferait tomber le budget de 42 médias, mais un
   téléversement hors verrou courrait contre l'élagage en `force: true`, et l'aperçu relirait
   GitHub sous le jeton d'écriture ; **une branche `media-draft`** — même course, un espace de
   plus sous `I1`.

   *Requalifié le 2026-08-12 par le traitement de `S-19`, qui reprochait à cette ligne d'écrire
   « l'espace maigrit » — plus fort que ce qui est su, et en contradiction avec le corps de ce
   document. La borne est **logique** et tient par construction : ce que la branche porte à tout
   instant est le **jeu courant** des médias publiés, et c'est ce plafond-là, non une
   décroissance, qui écarte le dépôt à historique complet. La récupération de l'espace
   **physique** dépend, elle, d'un ramasse-miettes GitHub que rien ne documente et qu'aucune
   recette ne peut constater — il n'est ni déclenchable ni daté —, et elle n'a jamais porté
   l'arbitrage. Le § sur l'élagage le disait déjà — « les orphelins survivent d'une publication
   à l'autre — l'espace ne croît pas sans fin, il ne maigrit pas à l'instant du build » : c'est
   le candidat qui avait dérivé, pas le corps.*

5. **Forge et écriture de la publication : GitHub, API REST *git data* puis
   `PATCH /git/refs` en `force: false`, sous un jeton à portée fine sans expiration portant
   `Contents: Read and write` seule.** Retenue car l'avance rapide obligatoire refuse
   précisément les situations que `FR-091` redoute — mesuré : `422 Update is not a fast
   forward` sur un commit bâti sur un parent périmé — et parce que c'est la voie qui demande
   **une seule permission** sur le dépôt de la cliente. Alternative écartée : **GraphQL
   `updateRefs` avec `beforeOid` et `force: true`** — vrai compare-and-swap y compris sur une
   réécriture, et deux refs en un appel atomique, mais il exige en plus **`Workflows: write`**
   (mesuré par différence), c'est-à-dire le droit de réécrire le pipeline qui bâtit le site,
   accordé à un jeton qui vit dans un Worker. Les deux « manques » de la voie retenue ne
   coûtent rien : l'atomicité multi-refs n'était de toute façon pas atteignable — la
   publication est une séquence en deux temps — et le seul geste non-avance-rapide, l'élagage
   de `media` qui ouvre la publication suivante, se déroule sous le verrou conditionnel en D1
   retenu au tableau des choix, et se calcule depuis D1 et non depuis l'état lu de la branche.
   Alternatives écartées plus tôt : **`git push --force-with-lease`** — même contrôle avec la
   même permission (mesuré), mais un Worker n'a ni sous-processus ni système de fichiers, donc
   il ne peut pas lancer `git` ; **GitLab** — aucun des faits sourcés ne porte sur lui.

   *Complété le 2026-08-12 par le cinquième grief de `S-10`. L'argument « une seule permission »
   est vrai **sous une condition que personne n'avait écrite**. La donnée source de la
   documentation GitHub donne au déplacement de ref **deux** jeux de permissions suffisants —
   `Contents: write`, ou `Contents: write` + `Workflows: write` — là où blob, arbre et commit
   n'en ont qu'un. La mesure du 11/08 ne pouvait pas le voir : le dépôt d'essai n'avait aucun
   fichier de workflow. **Contrainte posée, à rendre falsifiable en `archi` : la publication
   n'écrit jamais sous `.github/`.** Tant qu'elle tient, le jeton à une seule permission suffit ;
   si elle tombe, le jeton se fait refuser au dernier geste de la publication — celui qui rend le
   contenu visible —, et rien dans le code ne relierait la panne à cette ligne. L'écartement de
   GraphQL, lui, n'est pas entamé : il exige `Workflows` **toujours**, y compris sur un dépôt sans
   workflows, quand REST ne l'exige que **sous condition**. Ce fait-là reste `[mesuré · trace non
   versée]` et le restera — GitHub ne publie aucune permission pour ses mutations GraphQL.*

   *Complété le 2026-08-12 par le traitement de `S-18`. Ce candidat ne portait **ni la
   désuétude du jeton ni sa parade** : le motif du Cron de maintien en vie, instruit plus haut,
   ne descendait pas jusqu'ici. Il y entre, et avec lui le compromis qu'il engage — jusque-là
   tacite. **Ce qu'on paie :** un jeton d'écriture **permanent**, maintenu vivant par un appel
   hebdomadaire, **sans rotation et sans détection de compromission**, sur un dépôt qui **est**
   le site publié. La révocation à un an était une sécurité **passive** — un jeton oublié meurt
   — et le Cron la neutralise sciemment. **Pourquoi c'est néanmoins le seul point tenable :**
   la rotation n'a **aucun porteur possible**, `I6` ayant fait partir l'intégrateur et `SC-006`
   interdisant d'envoyer la cliente sur GitHub — le motif même qui a fait écarter la clé HMAC à
   rotation au candidat n° 12, sur le constat `S-02`. Sans keep-alive, c'est `FR-101` qui tombe
   à un an. **Ce qui borne le coût :** une seule permission, `Contents: Read and write`, jamais
   `Workflows` — la contrainte `.github/` du paragraphe précédent —, et un jeton qui vit dans un
   Worker du compte de la cliente (`I4`, `I6`, `C10`).*

6. **Auth : implémentation maison sur D1.** Retenue car la surface est exactement le besoin —
   une adresse, un jeton, une session — et parce que `FR-005` (ne rien envoyer à une adresse
   non autorisée) y est tenu par la plateforme elle-même, `send_email` n'écrivant qu'à une
   destination vérifiée. `FR-008`, en revanche, **n'est pas tenu par construction** : le
   traitement de `AU-09` (2026-08-12) a montré que le plafond de `FR-006` n'est atteignable
   que pour l'adresse autorisée, et que le chemin qui envoie un message n'a aucune raison de
   répondre dans le même délai que celui qui n'en envoie pas ; l'exigence a été rédigée à
   nouveau et bornée, et c'est elle qui doit être tenue, non une propriété supposée acquise.
   Alternatives écartées : **Better Auth 1.6.26** — **17 dépendances et 19 pairs**, dont six
   piles de base de données pour une seule qui sert (cinq adaptateurs plus `kysely` en
   dépendances, sept pilotes de base en pairs) ; l'éditeur **ne publie aucun point d'entrée
   Cloudflare ni D1** — huit cibles de framework sur cinquante-six exports, pas une pour la
   plateforme retenue —, si bien que le branchement de la seule porte du CMS passerait par un
   **dialecte tiers**, `kysely-d1@0.4.0`, écrit ni par Better Auth ni par Cloudflare ; le
   paquet **exige `nodejs_compat`**, important `node:crypto` ; son installation ajoute
   **22 paquets** et sa version bouge à la semaine (`1.6.26` le 04/08/2026, `1.6.27` le
   11/08/2026), sur le chemin d'accès unique à l'administration ; et le **moyen de reprise**
   (`FR-009` à `FR-012`) resterait entièrement à écrire par-dessus, ses codes de secours
   naissant dans une session déjà ouverte quand le glossaire exige un secret **remis** à la
   livraison, `FR-008` restant à écrire des deux côtés. **L'argument de poids qui portait cet
   écarté est retiré le 2026-08-12 par le traitement de `S-10`, et c'est une mesure qui le
   retire** : « 3,2 Mo dépaquetés » ne se rejoue
   sur aucune grandeur — le registre donne 2,07 Mo pour cette version —, et surtout ce n'était
   pas l'unité du plafond invoqué, qui porte sur le paquet déployé **gzippé** ; un Worker réel
   important `betterAuth` et son plugin de code à usage unique pèse **0,19 Mo gzip, soit 6,1 %
   des 3 Mio** du plan gratuit. Ce que ce même relevé a montré des quatre mécanismes de
   `S-05` est également porté ici : `otpLength`, `expiresIn`, `allowedAttempts`, `storeOTP`,
   le préfixe `__Host-`, `originCheck` et les sessions opaques en table existent tous dans le
   paquet — **la surface restant à écrire par-dessus est donc bien plus étroite qu'annoncé**,
   et l'écarté ne tient plus que sur les motifs d'intégration et d'approvisionnement ci-dessus.
   Relevé versé : [`research/2026-08-12-better-auth-poids.md`](./research/2026-08-12-better-auth-poids.md)
   + trace brute rejouable ; **Cloudflare Access one-time PIN** — son palier gratuit n'a
   **aucune source primaire**, donc invérifiable face à `I5` et `FR-103`, et l'éditrice se
   connecterait à une couche d'identité tierce, ce que `FR-004` et `SC-006` interdisent.
   **Complété le 2026-08-11 par le traitement de `S-05`, qui reprochait à cette décision de ne
   décrire que la connexion nominale.** Quatre mécanismes la composent désormais, et chacun
   porte son motif. **(1) Un code à saisir, jamais un lien** — un lien à usage unique se fait
   consommer par les scanners de messagerie avant le clic, met le secret dans une URL donc dans
   les journaux, et ne peut être lié au navigateur demandeur qu'en interdisant le multi-appareil ;
   le code ferme les trois, et sa seule faiblesse propre — l'entropie — se paie de deux
   caractères, à **40 bits** plutôt que les 20 bits hérités du SMS. La liaison au navigateur
   demandeur ne protège pas d'un lecteur de la boîte, le formulaire de connexion étant public :
   elle ferme l'ingénierie sociale du « lisez-moi le code », qui est le vecteur réaliste ici.
   **(2) Une session opaque en D1, non un cookie signé** — à coût identique (500 lectures par
   jour sur les 5 000 000 de l'Annexe A, l'administration lisant déjà D1 à chaque écran), elle
   retire un secret de l'inventaire et permet à `FR-012` et `FR-013` de fermer automatiquement
   les autres sessions, ce qui rend réel le remède du cas limite « boîte compromise » sans offrir
   la fonction que le PRD exclut. **Bornée à sept jours d'inactivité et trente jours d'âge**
   (`FR-118`, ajouté le 2026-08-11 par le traitement de `AU-05`) : sans bornes la session était
   perpétuelle tant qu'elle servait, et l'objection d'`A-02` contre la rémanence longue —
   « irrévocable en cas de vol d'appareil » — s'appliquait à la propriété conservée, `FR-012` ne
   révoquant que su, quand aucun écran ne montre les sessions. La borne absolue arrête
   l'attaquant qui entretient la session, que le rafraîchissement glissant renouvellerait sans
   fin ; l'inactivité à sept jours n'ajoute aucune reconnexion au rythme que `SC-003` et
   `SC-015` mesurent. **(3) Un cookie `__Host-`, `HttpOnly`, `Secure`,
   `SameSite=Strict`, sans restriction de `Path`** — le préfixe est gratuit et ferme l'injection
   depuis un sous-domaine ; restreindre le `Path` casserait `FR-082`, l'aperçu vivant sur la même
   origine sous une autre route. **(4) Un jeton anti-CSRF par écriture, doublé d'un contrôle
   d'en-tête `Origin`** — il ne vise que la forgerie venue d'un autre site ; contre le XSS
   same-origin, ni lui ni `SameSite` ne peuvent rien, et ce sont l'invariant d'échappement et la
   CSP de l'administration qui répondent. **Alternatives écartées en propre : la passkey
   WebAuthn en facteur primaire — et le secret TOTP remis à la livraison, ajouté le 2026-08-11
   par le traitement de `AU-04`, qui a montré que l'unicité affirmée ici était fausse.** Deux
   formes survivent à un lecteur de la boîte — le scénario le plus probable —, non une seule.
   La **passkey** *serait* le moyen de reprise ; mais `FR-009` et le glossaire du PRD disent
   « secret **remis** à la livraison », quand une passkey naît sur l'appareil de l'éditrice et
   suppose une session déjà ouverte, et sa récupération pend au trousseau d'un tiers — le motif
   même du rejet d'Access OTP. Elle demande d'amender le PRD : c'est un arbitrage de
   `/scd-sdd:premortem socle`, pas de cette phase. Une graine **TOTP** engendrée par
   l'intégrateur et remise sur papier à la livraison ne heurte, elle, aucun de ces quatre
   motifs — ni `SC-006`, ni `FR-004` — et s'écarte sur ses coûts propres, jamais plus sur
   l'unicité : elle n'est vérifiable qu'en **clair** côté serveur, une lecture de la base la
   livrerait telle quelle — le régime hors ligne instruit au n° 16, que le moyen de reprise ne
   concède qu'en hachage à 128 bits — et l'inventaire se rallonge au moment où la session
   opaque le raccourcissait ; un outil à provisionner et une saisie de plus à chaque connexion
   pèsent sur le parcours courant que `SC-003` et `SC-015` mesurent et que le glossaire promet
   « par sa seule adresse e-mail » ; et le gain serait partiel, la boîte restant la clé de
   voûte de l'instance — sa lecture porte la récupération des comptes tiers. Le lecteur de la
   boîte reste donc une impasse, désormais tenue sur un choix motivé et non plus forcé ; résidu
   au dépôt de `S-05` : la connexion en lecture seule est le chemin le plus discret, et le TOTP
   l'aurait fermé. **Ce que `FR-005` doit à
   la plateforme** : l'interdiction d'écrire à une adresse non autorisée n'est pas seulement
   programmée, `send_email` ne sait écrire qu'à une destination vérifiée — mais c'est aussi ce
   qui bloque `FR-013` et `FR-014`, voir la section dédiée.
   **Chaque mécanisme porte désormais son exigence, ajouté le 2026-08-12 par le traitement de
   `AU-10`**, qui reprochait aux quatre de n'être portés par aucune et mesurés par aucun
   critère — un mécanisme qu'un lot pouvait donc omettre sans qu'aucun contrôle échoue. Les
   deux qui sont des **comportements** descendent en exigences : la liaison à l'appareil
   demandeur par `FR-120`, l'usage unique et l'expiration du code — orphelins eux aussi, que
   le constat n'avait pas comptés — par `FR-121`, le brûlage par `FR-122`. Les deux qui sont
   des **propriétés statiques** — attributs du cookie, jeton anti-CSRF doublé d'`Origin` —
   rejoignent le § « Vérification mécanique obligatoire » en 8ᵉ contrôle bloquant, sur le
   modèle retenu pour la CSP au traitement de `AU-06` : ce qui se lit dans les sources se
   vérifie mécaniquement plutôt que de s'exiger en prose. L'ensemble se mesure par l'épreuve
   `SC-021`, qui manquait côté abus quand `SC-014` et `SC-020` existaient déjà côté reprise.

7. **Format du contenu déposé : un répertoire par objet.** Retenu car le §4.3 du clausier
   promet des fichiers « exploitables par n'importe quel professionnel, avec ou sans
   l'outil », et c'est le texte de la cliente qui doit rester lisible. Alternatives
   écartées : **un JSON par objet** — le texte riche y devient une chaîne échappée et le diff
   Git cesse d'être une lecture ; **Markdown + frontmatter** — empêchement de structure, une
   page porte plusieurs emplacements de texte riche (`FR-017`, `FR-018`) là où un fichier
   Markdown n'a qu'un corps.

8. **Texte riche : Markdown restreint aux marques testées, et aux schémas d'URL autorisés.**
   Retenu car le risque résiduel — la perte silencieuse d'une marque à la sérialisation — est
   **testable**, donc fermable par la phase `ci`. La restriction porte sur deux axes et non un :
   les marques, et les **URL** (`https`, `mailto`, `tel`, relatif ; aucun HTML brut) — une marque
   autorisée peut porter une cible qui ne l'est pas. Alternative écartée : **HTML restreint** —
   plus fidèle, mais il faudrait assainir sur deux chemins, et le PRD envisage explicitement le
   cas où l'administration est compromise, où du HTML stocké deviendrait du contenu tiers servi
   à chaque visiteuse. Un assainissement raté est un risque dont on ne prouve jamais l'absence.

9. **Acheminement : Email Routing et `send_email` vers l'adresse de destination vérifiée.**
   Retenu car c'est gratuit sur tout plan, sans carte, et c'est exactement ce que `FR-063`
   demande. Alternative écartée : **Email Sending vers un destinataire arbitraire** — exige
   Workers Paid (5 $/mois minimum), ce qui fait tomber `I5`, `FR-103` et `SC-001`.
   *Frontière de périmètre à porter : aucun `FR` n'envoie d'e-mail au visiteur.*
   Alternatives écartées plus tôt : **SendGrid, SES, MailerSend, ZeptoMail** — échouent sur
   « permanent » ou sur « sans carte » ; **le SMTP de la boîte de la cliente** — suspendu à
   un fournisseur grand public acceptant un envoi depuis une IP Cloudflare partagée.
   **Amendé le 2026-08-11 par le traitement de `AU-01`.** La forme de l'e-mail devient une
   décision : **inerte et étiqueté** — texte seul, objet fixe posé par le produit, chaque
   donnée du visiteur derrière son étiquette — parce que la destination est la boîte même qui
   reçoit les codes de connexion et que le formulaire est public ; voir § « La cinquième
   porte ». La **dissociation des deux adresses** y est écartée sur rejeu de l'écarté de
   `A-02`.

10. **Langage : TypeScript strict.** Retenu car le Brief exige que la confiance vienne de
    vérifications mécaniques, le code n'étant pas relu ligne à ligne. Alternative écartée :
    **JavaScript + JSDoc vérifié par `tsc`** — même vérificateur, ergonomie dégradée sur les
    structures du produit (schéma des emplacements, contrats de publication).

11. **Îlots : Svelte 5.** Retenu car `FR-054` fait expédier du JavaScript sur toute page
    publique portant un formulaire, et `SC-005` mesure Lighthouse ≥ 95 en mobile sur ces
    pages : le compilateur de Svelte n'expédie pas de runtime de framework. Alternative
    écartée : **React 19** — écosystème plus large, mais le coût est payé par la visiteuse,
    là où le critère se mesure.

12. **Anti-abus : Turnstile *managed* devant, compteur de fréquence dans un objet unique, à
    empreintes de fenêtre.** Retenu car `FR-062` et `FR-007` demandent littéralement un
    **seuil de fréquence** — un compteur, pas une preuve d'humanité — et parce que l'ordre
    décide : Turnstile est gratuit et ses vérifications sont données pour **illimitées en mode
    *managed*** (docs Turnstile *Plans*, 16/04/2026, « Unlimited challenges »), il absorbe le
    volume avant que le compteur, plafonné à 100 000 requêtes par jour, ne soit sollicité. La **forme du
    compteur** est arbitrée avec le reste (2026-08-12, traitement de `S-02`) parce qu'elle
    porte, seule, la seule rétention de donnée personnelle du produit : une **table dans un
    objet unique** — un objet par visiteur aurait fait du nom de l'objet l'empreinte d'une
    adresse, créée dans l'infrastructure de la plateforme et hors de portée de toute reprise —
    et des empreintes **HMAC sous une clé de fenêtre**, tirée par le produit et effacée avec
    les entrées qu'elle protège. Ce que ce choix achète : aucun secret à l'inventaire, aucune
    rotation à tenir à la main, et une promesse **statique** — rien de dérivé d'une origine ne
    survit à sa fenêtre — donc portable par un contrôle bloquant plutôt que par une exigence,
    selon la doctrine d'`AU-10`. Alternatives écartées : **une règle Cloudflare Rate
    Limiting** — sa disponibilité et ses limites sur le palier gratuit ne sont pas sourcées,
    elle ne peut donc pas descendre en ADR ; **une clé HMAC ouverte à la livraison, à
    rotation** (la piste du constat `S-02`) — elle remet le troisième secret que `S-05` venait
    de retirer, sa rotation n'a **aucun porteur** — ni ligne de recette §7, ni exigence, ni
    contrôle —, et elle protège moins qu'il n'y paraît, la clé vivant dans le compte qui
    héberge déjà la table *et* les coordonnées en clair des visiteurs (`FR-057`) ; **la même
    sans rotation**, qui garde le coût en perdant le motif ; **le comptage en mémoire seule**,
    qui ne persiste rien mais rend le seuil gratuit à qui provoque le recyclage de l'objet ;
    **la troncature de l'adresse**, sans aucun effet sur l'attaque par confirmation, qui ne
    balaie pas l'espace mais teste un candidat connu.

    *Réserve rétablie le 2026-08-12 par le traitement de `S-11`, qui reprochait à cette ligne
    d'avoir promu « incertain » en « acquis » : deux pages officielles de Cloudflare divergent
    — le blog GA annonce un plafond de « 1 million siteverify », la page **Plans** écrit
    « Unlimited challenges » —, et la conciliation qui réserve ce plafond aux widgets
    **invisibles** est tenue d'une **analyse tierce**, marquée `[INCERTAIN]` par*
    [le rapport](./research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md)*. **L'ordre
    décide dans les deux lectures** : sous l'hypothèse basse, ce plafond reste un **mur** — un
    refus, jamais un compteur facturé, donc `I5` tient — et reste **devant** le compteur qu'il
    protège. L'incertitude ne déplace que la **hauteur** de ce mur : le rapport ne lui donne
    même pas de période, aucun calcul ne la fixerait sans refaire l'erreur écartée le 10/08
    (diviser un quota par trente pour en tirer un seuil), et aucune recette ne peut la
    constater. Elle est donc **assumée marquée**, la troisième des trois issues posées par le
    traitement de `S-10`.*

13. **Tests : Vitest dans `workerd`, Playwright, épreuve de réversibilité scriptée.** Retenue
    car `@cloudflare/vitest-pool-workers` (famille `0.21.x`) exécute les tests **dans
    `workerd` lui-même**, l'exécutable qui fait tourner les Workers en production, contre les
    **implémentations** de D1 et du stockage des Durable Objects, avec un stockage isolé par
    test ; et parce que `SC-011` demande une pièce datée, donc un script rejouable.
    **Ce qui est réel ici est le moteur, non la connexion** : les liaisons sont **locales**,
    servies par Miniflare, et rien ne part vers la base D1 d'un compte Cloudflare — l'outil
    expose bien une option `remoteBindings`, mais « réel » et « distant » y sont deux réglages
    distincts, à ne pas confondre en recette. Deux contraintes que le choix emporte : le pair
    **`vitest ^4.1.0`**, donc une version majeure imposée, et une chaîne de moteur épinglée au
    correctif près dont `miniflare` est en version **alpha** (`5.20260804.0-alpha`) — c'est la
    façon dont Cloudflare publie, mais la brique qui sert d'oracle au projet repose dessus.
    Alternative écartée : **Vitest sous Node avec liaisons simulées** — l'oracle devient faux,
    les tests attestant du comportement des simulacres. *Amendé le 2026-08-12 par le
    traitement de `S-10` : la version était épinglée à `0.21.0` et sa capacité dite « liaisons
    réelles », deux formulations qu'aucun rapport ne portait. La mesure confirme la capacité
    et corrige les deux — `0.21.0` a été publiée le 10/08 et dépassée deux fois en moins de
    48 h (`0.21.2` le 12/08), si bien qu'un numéro de correctif n'a pas sa place dans un
    document immuable.* Relevé versé :
    [`research/2026-08-12-vitest-pool-workers-liaisons.md`](./research/2026-08-12-vitest-pool-workers-liaisons.md)
    + trace brute rejouable.

14. **Ingestion des médias : liste blanche fermée JPEG / PNG / WebP, reconnue sur les octets
    d'en-tête, SVG refusé.** Retenue car elle donne à `FR-040` son volet « format » — `S-09` lui
    avait donné son volet « poids » — et parce qu'elle ne coûte rien : `FR-108` exige les
    **dimensions** de chaque média déposé, donc l'en-tête du fichier est lu de toute façon, et
    la signature s'y lit dans le même geste. Reconnaître sur les octets plutôt que sur
    l'extension ou sur le `Content-Type` déclaré est ce qui rend la liste opposable : l'un
    comme l'autre sont choisis par celui qui téléverse. Alternatives écartées : **le SVG
    assaini** — c'est le motif du n° 8 dans l'autre sens, un assainissement raté est un risque
    dont on ne prouve jamais l'absence, et il faudrait embarquer la bibliothèque sous le
    plafond de 3 Mo gzip ; **le SVG servi depuis une origine distincte** — ferme le vol de
    session, mais ouvre un espace de plus à vérifier sous `I1` pour un format dont le produit
    n'a pas besoin ; **admettre le HEIC** — couvrirait le téléversement direct depuis un
    téléphone, mais sa lecture par le pipeline n'est pas établie et deviendrait un point de
    recette bloquant de plus. Coût assumé : un logo vectoriel est fourni en PNG.

15. **En-têtes de réponse : deux porteurs — `_headers` pour le public, le code pour tout ce que
    le Worker génère —, sur une origine qui reste commune.** La forme n'est pas un choix, la
    plateforme l'impose : les en-têtes du fichier `_headers` « are not applied to responses
    generated by your Worker code » (docs Cloudflare · *Workers · Static Assets · Headers*, page
    datée du **23/04/2026**). Comme `FR-095` et `FR-096` font des pages publiques des assets
    statiques, le fichier les couvre sans coût — « Requests to static assets are free and
    unlimited » (page *Pricing*, datée du 07/07/2026) —, tandis que l'administration, l'aperçu
    et les médias servis depuis D1 portent les leurs dans le code. Il en découle une contrainte
    vérifiable : `run_worker_first` reste une liste **bornée**, sans quoi le fichier ne
    s'applique plus à rien. **L'origine commune est conservée** parce que les trois portes de
    `S-06` se ferment sans y toucher. Alternative écartée, mais **pas sur le fond** : un
    **sous-domaine d'administration dédié** met le cookie de session hors de portée d'un XSS
    public ; il coûte une entrée DNS et une route de plus, le §3 du socle à amender et `FR-081`
    à revérifier sur les URL relatives de l'aperçu. C'est la parade de repli le jour où du
    contenu tiers devra être servi.
    **Amendé le 2026-08-11 par le traitement de `S-05`.** Le porteur « dans le code » gagne un
    en-tête nommé : une **CSP stricte propre à l'administration**, qui est — avec l'invariant
    d'échappement — l'une des deux seules parades au XSS same-origin, contre lequel ni
    `SameSite` ni un jeton anti-CSRF ne peuvent rien. Et le sous-domaine dédié gagne un **second
    motif** : `S-06` concluait que les trois portes se fermaient sans toucher à l'origine
    commune ; il en existe une quatrième, la liste des demandes, où du texte d'inconnus atteint
    un écran d'administration. Le premier motif n'est pas caduc, la prémisse du compte l'est.
    **Amendé le 2026-08-11 par le traitement de `AU-06`.** La CSP stricte cesse d'être un
    membre de phrase : définie par ses interdits (`unsafe-inline`, `unsafe-eval`, sources
    tierces hors Turnstile), porteur du nonce nommé — le second porteur d'en-têtes —, septième
    contrôle bloquant de `ci` et second invariant déposé pour `archi`. Et une limite du repli
    est consignée : le sous-domaine dédié ne reprend **pas** la charge de la quatrième porte —
    un script stocké dans la liste des demandes s'exécute dans l'administration quelle que soit
    son origine ; le repli ne vaut que contre le XSS venu des pages publiques. Pour cette
    porte, il n'existe que deux parades, et toutes deux sont désormais falsifiables.

16. **Moyen de reprise : un code de 128 bits haché en D1, remis sur papier à la
    livraison, à usage unique et réémis à l'emploi — sans frein par secret.** Retenu parce que
    c'est la seule forme que
    le PRD laisse ouverte sans être amendé — « secret non e-mail **remis** à la livraison »
    (glossaire), rien en configuration qui le reconstitue (`FR-011`), remplaçable depuis une
    session ouverte avec cessation de l'ancien (`FR-012`), ce qui impose un magasin mutable,
    donc D1 — et parce qu'il n'ajoute ni dépendance, ni mécanisme neuf : c'est le patron déjà
    retenu pour le code de connexion. L'usage unique est ce qui le départage : un code à usage
    multiple serait une porte dérobée permanente sur papier, et un usage unique sans réémission
    laisserait l'éditrice sans filet au sortir de la panne même qui l'a fait servir — `FR-012`
    fournit déjà le geste de réémission. L'entropie est **chiffrée à 128 bits** — 26 caractères
    base32, groupés pour la recopie, le coût d'une clé produit une fois par incident — parce que
    ce secret n'a ni l'expiration ni le brûlage qui rendent 40 bits suffisants au code de
    connexion : permanent, il doit tenir aussi **hors ligne** — une lecture de la base livre son
    hachage, jamais algorithmé ailleurs qu'ici, et 40 bits y tombent en secondes quel que soit
    le KDF — quand 128 bits rendent la devinette sans objet par arithmétique seule, en ligne
    comme hors ligne, indépendamment de `FR-007` et du sort de l'empreinte d'origine (`S-02`) :
    le dernier recours de l'instance ne pend plus à un mécanisme non arbitré (`AU-03`). Pour la
    même raison, **aucun frein par secret** ne s'ajoute au seuil par origine — à cette entropie
    il n'ajoute rien contre la devinette, et Turnstile plus `FR-007` restent devant l'écran pour
    le bruit. Alternatives écartées : **la passkey** (voir n° 6, elle
    demande d'amender le glossaire) ; **la rémanence de session longue**, déjà écartée par `A-02`
    au motif qu'elle est irrévocable en cas de vol d'appareil — l'objection perd de sa force avec
    la session opaque du n° 6, mais une session n'est pas un secret remis à la livraison et ne
    répond pas à `FR-009` ; **une seconde adresse e-mail**, écartée par `A-02` et `A-09` (deux
    boîtes valent un second compte contre `SC-006`, et leurs pannes sont corrélées) ; **le refus
    temporisé après N échecs sur le moyen de reprise** — un attaquant qui entretient les échecs
    à bas coût ferait heurter le refus à l'éditrice pendant son urgence : le déni de service sur
    le dernier recours, celui-là même qui interdit le brûlage, en version adoucie ; **la
    temporisation par tentative (~1/s par secret)** — saine, mais redondante à cette entropie :
    un mécanisme et un état de plus pour rien.

17. **Sérialisation des publications et constat de la mise en ligne : une seule ligne d'état en
    D1 — verrou, bail horodaté, issue du dépôt —, et l'empreinte du commit exposée par le site
    publié.** Retenue car les trois manques qu'elle referme n'en font qu'un : un Worker tué net
    n'exécute pas sa sortie, si bien qu'un verrou **sans bail** laisse le site bloqué pour
    toujours, quand un bail expiré se reprend. La reprise est sûre parce que la séquence est
    **rejouable telle quelle** — le dépôt sur `media` est additif et adressé par contenu, l'arbre
    et le commit se recalculent depuis le HEAD (mesure de `S-04`) —, et le seul cas qui y
    résistait, la **réponse perdue**, se ferme en comparant l'oid de l'arbre à pousser à celui du
    HEAD : le même contenu donne le même oid, donc le réessai reconnaît son propre commit. **Le
    second geste tient à ce que `FR-090` demande vraiment** : le dépôt n'est qu'un déclencheur
    (`FR-089`) et un build peut échouer après lui — l'éditrice verrait l'ancien site avec un
    succès affiché. Le site publié expose donc l'empreinte du commit dont il est né, et
    l'administration la lit par une requête **publique**. Alternatives écartées : **lire l'issue
    du build par un webhook ou par l'API Cloudflare** — l'un et l'autre exigent un jeton d'API
    dans le compte de la cliente, ce qui mord sur `C7` et rallonge l'inventaire de `S-01`, quand
    la requête publique ne coûte rien ; **tenir l'issue du dépôt pour l'issue de la publication**
    — c'est exactement le succès affiché à tort ; **maintenir un marqueur d'idempotence à part**
    pour reconnaître un réessai — l'oid de l'arbre le donne gratuitement, sans état de plus à
    tenir à jour. La **valeur du bail** n'est pas arbitrée ici : elle se borne par la durée de la
    séquence (4 + `M` appels), se mesure en recette et descend en specs.

18. **Accès aux données : l'API D1 native du Worker et les migrations `wrangler d1 migrations`,
    sans couche intermédiaire.** Retenue car `FR-105`, `FR-106` et `SC-008` exigent qu'une
    nouvelle version se déploie sur une instance existante **sans perte du contenu**, ce qui
    demande des migrations **versionnées et rejouables** : `wrangler d1 migrations` est le
    mécanisme que la plateforme fournit, déjà présent dans l'outil de déploiement retenu, et il
    n'ajoute ni dépendance sous le plafond de **3 Mo gzip** ni dialecte tiers sur le chemin
    d'accès à la seule base du produit — le motif même qui a fait écarter `kysely-d1` au n° 6.

    *Réserve posée le 2026-08-12 par le traitement de `S-17` — la troisième des trois issues de
    `S-10`, **assumer marqué**. Cette ligne du tableau n'avait aucun candidat, et l'instruction a
    trouvé pourquoi : **aucune alternative n'a jamais été instruite par la phase**. Ni Drizzle, ni
    Kysely, ni aucune couche de requête ne figure nulle part dans ce document comme option pesée
    — `kysely-d1` n'y paraît qu'en **argument contre Better Auth**, jamais comme choix d'accès aux
    données du produit. Le motif ci-dessus est donc **reconstruit depuis les contraintes déjà
    écrites**, non rendu par un arbitrage. `/scd-sdd:adr` ne doit pas fabriquer un « écarté » pour
    cet ADR : il n'y en a pas eu.*

19. **Pipeline d'images : les variantes sont produites au build, et leur nombre par photographie
    est ce qui chiffre `C5`.** `image.layout: 'constrained'`, breakpoints `[640, 960, 1280]`,
    `<Image>` à un seul format. Retenu car `SC-005` mesure Lighthouse ≥ 95 en mobile sur les pages
    publiques — le même critère qui a départagé le n° 11 —, et parce que produire au build est ce
    qui laisse la publication constante : le budget de **42 médias** mesuré en `S-04` compte un
    fichier par média, non ses variantes. **Ce que la configuration décide au-delà d'elle-même** :
    une photographie produit **5 fichiers** de sortie, soit un mur vers **4 000 photographies** et
    l'alerte `C5` (15 000 fichiers) vers 3 000 — le plafond du produit est donc fixé ici, et
    chaque breakpoint ou format ajouté le rapproche. Alternative écartée : **générer les variantes
    à la publication** — elle est la parade si la durée du build croît jusqu'aux 20 minutes, mais
    elle fait tomber le budget médias de **42 à ~8** (5 fichiers par photographie au lieu d'un)
    dans la séquence mesurée en `S-04`. **Condition de révision, posée par le traitement de
    `S-08`** : la durée du build ne peut pas être mesurée aujourd'hui — le dépôt n'a pas une ligne
    de code, et un chiffre obtenu en local ne dirait rien du matériel de Workers Builds. Elle est
    en réserve 3 de l'Annexe A, et c'est `archi` qui tranchera la bifurcation, le chiffre en main.
    La valeur des 5 fichiers, elle, se mesure au premier déploiement et se reporte en Annexe A.

## Ce que cette phase dépose sur les autres documents

- **`docs/socle-de-livraison.md`** : §3, `C6`, Annexe A et réserve 1 amendés le 2026-08-10
  par cette phase (le bandeau ⚠️ du document demandait cette revalidation) ; le n° 6 de « Ce
  qui reste ouvert » fermé le 2026-08-11 par la mesure du jeton d'écriture ; **réserve 3 de
  l'Annexe A élargie à la durée du build** le 2026-08-11 par le traitement de `S-08` ; **deux
  lignes ajoutées au tableau de l'Annexe A** le 2026-08-11 par le traitement de `S-09` — taille
  d'une base D1 (500 Mo, palier gratuit) et taille d'une ligne ou d'un `BLOB` (2 Mo), toutes
  deux absentes de la page *Pricing* qui avait servi au relevé.
- **`C4` reste à corriger au socle** : sa vérification (« dix enregistrements en deux minutes
  → un seul déploiement ») teste une architecture où enregistrer commite, ce qui n'est pas
  celle-ci. Dette portée par le traitement de `S-14`.
- **La recette de livraison** (§7 du socle) gagne trois lignes que cette phase impose :
  le jeton d'écriture créé **sans expiration** et portant `Contents: Read and write` seule,
  le jeton de lecture de `media` en `Contents: Read-only`, et le Cron de maintien en vie
  actif avant la livraison. **Le traitement de `S-01` en a ajouté cinq le 2026-08-12** : la
  clé de vérification Turnstile créée dans le compte de la cliente, le moyen de reprise
  engendré et remis sur papier, son emplacement noté au dossier d'instance, la ligne `C7`
  élargie **aux liaisons du déploiement** — comme `C7` et `SC-013` l'exigeaient déjà, là où
  la recette ne parlait que de secrets — et la ligne `C10` durcie : une publication ne
  compte pour aboutie que si le **site en ligne porte la nouvelle empreinte de commit**, le
  mécanisme acquis par `S-07`. Un `git push` réussi devant un build mort ne prouve rien.
- **`docs/prd.md`** : non modifié **par la phase Stack elle-même**, et il ne doit pas l'être
  ici — les exigences ajoutées depuis le 2026-08-11 (`FR-118` à `FR-122`, `SC-021`, `FR-012`
  amendée) le sont par les traitements de l'audit de l'authentification, chacune consignée à
  sa ligne des « arbitrages rendus ». **Quatre** dettes y restent ouvertes, toutes pour
  `/scd-sdd:premortem socle` : le `FR` qui porterait la détection de panne d'acheminement ; la
  qualification de `FR-005`, qui verrouille `FR-014` tel qu'il est rédigé ; le sort de
  `FR-013`, dont le glossaire fond l'adresse de connexion et la destination des demandes en un
  seul objet que `send_email` ne sait pas déplacer ; et, **depuis le 2026-08-12 par le
  traitement de `S-10`**, l'**absence d'observabilité du Cron de maintien en vie** — s'il cesse
  de tourner, rien ne le signale, et la panne ne se manifeste que par une publication qui
  échoue, **jusqu'à un an plus tard**, ce que `FR-101` interdit. C'est le même angle mort que
  `S-07` a fermé pour la publication en faisant exposer l'empreinte du commit par le site
  publié ; ici il n'a pas de porteur, et il ne se referme par aucune citation. Les deux du
  milieu datent du 2026-08-11, par le traitement de `S-05`.
- **La recette de livraison et l'inventaire de livraison** gagnent le **moyen de reprise** —
  code remis sur papier, rangé dans un espace de la cliente, son emplacement noté au dossier
  d'instance et jamais sa valeur (`FR-112`). *Renvoi **fermé** le 2026-08-12 par le traitement
  de `S-01` : les deux lignes sont au §7. Le **retrait de la clé de signature**, renvoyé au
  même endroit, s'est révélé sans objet — elle n'a jamais figuré au socle, seulement au
  tableau de la phase Stack, d'où `S-05` l'avait déjà retirée.*
- **`docs/ci.md`** (phase 6) : **neuf** contrôles nommés ci-dessus doivent y devenir
  bloquants — l'aller-retour Markdown de l'éditeur, le rejet des URL de schéma non autorisé,
  le garde-fou `C5`, la liste `run_worker_first` bornée, l'absence de `{@html}` sur toute
  donnée fournie par un visiteur, la composition inerte de l'e-mail acheminé, la CSP stricte
  sur toute réponse d'administration, les attributs du cookie d'administration avec le
  jeton anti-CSRF, et l'effacement conjoint de la clé de fenêtre et des entrées du compteur de
  fréquence. Les deux du milieu datent du 2026-08-11 par le traitement de `S-06`, le
  cinquième du même jour par celui de `S-05`, le sixième du même jour par le traitement de
  `AU-01`, le septième du même jour par celui de `AU-06`, le huitième du 2026-08-12 par le
  traitement de `AU-10`, et le neuvième du même jour par celui de `S-02`.
- **Le chantier `cadrage-donnees-personnelles`** reçoit du traitement de `S-02` (2026-08-12)
  la seule **information du visiteur** — dire qu'une adresse est traitée, et à quelle fin. Il
  ne reçoit **pas** de période de rotation, ni de durée de rétention à décider : la forme
  retenue au § « Données personnelles » borne d'elle-même la conservation à la fenêtre de
  comptage, et le produit ne retient rien d'autre qui soit tiré d'une adresse.
