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
| Maintien en vie du jeton d'écriture | Cron Trigger dans le compte de la cliente, appel anodin périodique | FR-101, SC-012 | |
| Auth | Implémentation maison sur D1, mécanisme par mécanisme : **code à saisir** — 40 bits, haché, usage unique, expirant, **lié au navigateur demandeur**, brûlé au 5ᵉ essai — et **jamais un lien** ; **session opaque en D1**, donc **sans clé de signature** ; cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` ; **jeton anti-CSRF sur chaque écriture**, doublé d'un contrôle d'en-tête `Origin` | FR-001 à FR-008, SC-006 | |
| Moyen de reprise | Code de haute entropie **haché en D1**, remis sur papier à la livraison, **à usage unique et réémis à l'emploi** — rien en configuration du déploiement (`FR-011`), aucune dépendance à un tiers | FR-009 à FR-012, SC-020 | |
| Acheminement des demandes | Cloudflare Email Routing, binding `send_email` vers l'adresse de destination **vérifiée** | FR-063, FR-064, SC-007 | |
| Moyen anti-abus | Turnstile en mode *managed* devant, puis compteur de fréquence par origine hachée dans un Durable Object | FR-007, FR-062 | |
| Sérialisation et suivi des publications | Une **seule** ligne d'état en D1 : verrou conditionnel, **bail horodaté** repris à l'expiration, et **issue de la publication** | FR-090, FR-091 | |
| Constat de la mise en ligne | Le site publié expose l'empreinte du commit dont il est né ; l'administration la lit par une requête **publique** et la compare | FR-090 | |
| Interface d'administration | Îlots Svelte 5 dans Astro | FR-017, FR-054, FR-117, SC-003, SC-005, SC-015 | |
| Texte riche | Éditeur TipTap, sérialisation en **Markdown restreint** aux marques testées ; au rendu, **liste blanche de schémas d'URL** (`https`, `mailto`, `tel`, relatif) et **aucun HTML brut** | FR-018, FR-117, SC-011 | |
| En-têtes de réponse | **Deux porteurs, imposés par la plateforme** : un fichier `_headers` pour les pages publiques, servies en assets statiques ; les mêmes en-têtes posés **dans le code** pour l'administration, l'aperçu et les médias servis depuis D1, **dont une CSP stricte propre à l'administration** — seule parade qui subsiste au XSS same-origin tant que l'origine reste commune | FR-082, FR-095, FR-096 | |
| Pipeline d'images | `image.layout: 'constrained'`, `image.breakpoints: [640, 960, 1280]`, `<Image>` à un seul format | SC-005, SC-001 (par `C5`) | |
| Accès aux données | API D1 native, migrations `wrangler d1 migrations` | FR-105, FR-106, SC-008 | |
| Tests | Vitest dans `workerd` via `@cloudflare/vitest-pool-workers`, Playwright pour les parcours, épreuve de réversibilité scriptée | (tous) ; SC-003, SC-009, SC-011, SC-016 | |
| Détection de panne d'acheminement | État d'acheminement porté par chaque demande et affiché dans la liste | **— exigence à créer**, voir ci-dessous | |

### Domaines sans objet

- **Authentification du visiteur** — non applicable : `FR-062` exige le seuil de fréquence
  « sans exiger de compte du visiteur », et le multi-éditeur est exclu par le PRD.
- **File d'attente / traitement asynchrone** — non applicable : `FR-097` fait de l'envoi
  d'une demande le seul traitement serveur, et la publication est un geste synchrone
  sérialisé.
- **Analytique** — non applicable : exclue par le PRD, et `FR-075` à `FR-078` portent
  l'instrument dans D1.
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
signature à ouvrir, à ranger ni à faire tourner, au moment où `S-02` et `S-06` en ajoutent —,
et surtout elle permet à `FR-012` et `FR-013` de **fermer les autres sessions** au moment du
remplacement. C'est ce qui rend réel le remède que le PRD décrit au cas limite de la boîte
compromise, sans offrir pour autant à l'éditrice la fonction que le PRD exclut explicitement :
constater ou fermer une session ouverte ailleurs. Une conséquence automatique n'est pas une
capacité offerte. Écriture bornée en conséquence : le rafraîchissement glissant n'écrit pas à
chaque requête, le budget d'écriture étant cinquante fois plus serré que celui de lecture.

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
personnelle. Le compteur de fréquence stocke une **empreinte**, jamais l'adresse en clair.
Le cadrage complet appartient au chantier `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md`.

### Secrets à ouvrir au nom de la cliente (`I4`, `C7`)

Deux, et aucun n'appartient à l'intégrateur. Le dossier d'instance dit où chacun est rangé,
jamais sa valeur (`FR-112`).

| Secret | Portée mesurée le 11/08/2026 |
|---|---|
| Jeton d'écriture de la publication | Portée fine, dépôt unique, **sans expiration**, `Contents: Read and write` **seule** |
| Jeton de lecture du *fetch* de `media` pendant le build | Portée fine, dépôt unique, `Contents: Read-only` |

*La **clé de signature des cookies de session** a été retirée de cet inventaire le 2026-08-11
par le traitement de `S-05` : la session est opaque en D1, il n'y a plus rien à signer. Cet
inventaire est celui de la phase Stack, et non l'inventaire de livraison — c'est le traitement
de `S-01` qui l'établit, et il devra y intégrer ce retrait, le **moyen de reprise** remis à la
livraison, et les secrets ajoutés par `S-02` et `S-06`.*

**Le jeton d'écriture n'expire pas, mais il peut disparaître.** GitHub documente qu'il
« removes personal access tokens that haven't been used in a year ». Comme `FR-101` exige
qu'une publication aboutisse après retrait de tous les accès de l'intégrateur, et que
`SC-006` interdit d'envoyer la cliente sur GitHub, un **Cron Trigger dans son propre compte**
fait périodiquement un appel anodin avec ce jeton. Il vit chez elle, donc `I6` et `C10`
tiennent.

### Ce que `archi` devra reprendre en invariants

- Le rendu de l'aperçu et le rendu publié partagent **les mêmes composants** : c'est la seule
  façon de tenir `FR-081` (« le même rendu que celui du site publié ») sans un second moteur
  qui divergerait.
- La logique métier n'importe pas le framework web : sans cela, `C6` — le mode de build
  depuis les fichiers plats, sans D1 — n'est pas atteignable.
- **Aucune donnée fournie par un visiteur n'atteint un rendu HTML brut.** Svelte échappe par
  défaut ; seul `{@html}` casse cette propriété. L'invariant est falsifiable et se lit dans les
  sources — c'est la première des deux parades qui tiennent la quatrième porte.

### Vérification mécanique obligatoire

Le Brief pose que « le code entrant n'est pas relu ligne à ligne » et que la confiance doit
venir de vérifications mécaniques. Cinq choix de cette page en dépendent explicitement et la
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
  l'internet public, sur la même origine que l'administration.

## Le jeton d'écriture — mesuré, et non déduit

Ce point était ouvert. Il a été fermé le **11/08/2026** par une série de mesures sur un dépôt
jetable (`sebc-dev/colibri-jeton-essai`), avec témoin positif à chaque fois. Ce qui suit est
citable dans un ADR au niveau de preuve **mesuré** ; la documentation de GitHub ne porte
aucune de ces trois premières lignes.

| Fait | Comment il a été obtenu |
|---|---|
| Un jeton à portée fine sur compte personnel peut n'avoir **aucune expiration** | Témoin à 7 j → en-tête `github-authentication-token-expiration` daté ; jeton sans expiration → aucun en-tête |
| L'écriture complète de la publication passe avec **`Contents: write` seule** — blob, arbre, commit, déplacement de ref | Aucun refus sur la chaîne REST *git data* |
| `PATCH /git/refs` en `force: false` **refuse** un déplacement qui n'est pas en avance rapide | Commit bâti sur un parent périmé → `422 Update is not a fast forward` ; commit bâti sur la tête courante → accepté |
| Les mutations GraphQL `updateRefs` et `createCommitOnBranch` exigent **`Contents` + `Workflows`** | `Contents` seul → `FORBIDDEN` ; `Contents` + `Workflows` → `UNPROCESSABLE` sur l'oid attendu, puis commit créé |
| Le `git push --force-with-lease` fait le même contrôle, avec `Contents` seule | Oid attendu faux → `stale info` ; oid attendu juste → accepté |
| Un jeton inutilisé pendant un an est retiré | [officiel · rapporté] *« GitHub automatically removes personal access tokens that haven't been used in a year »* |

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

## Décisions structurantes → candidats ADR

Une ligne = un futur ADR. La colonne « ADR » du tableau ci-dessus est back-fillée par
`/scd-sdd:adr`.

1. **Cible de déploiement et système de build : un Worker unique bâti par Workers Builds.**
   Retenue car `FR-081` exige un aperçu rendu serveur avec les mêmes composants que le site
   publié, ce qui impose un adaptateur, et parce que la CI hébergée de Cloudflare est couplée
   à la cible. Alternative écartée : **projet Pages + Pages Build** — `@astrojs/cloudflare`
   a retiré le support de Pages à la **v13** (publiée le 10/03/2026 ; README v12 « Cloudflare
   Pages Functions targets », README v13 « Cloudflare Workers targets », zéro occurrence de
   `pages` dans son `dist`), donc l'aperçu rendu serveur y imposerait `astro@5.18.2` contre
   `astro@7.2.0` — deux majors en arrière, sur une branche que l'adaptateur a quittée, et
   `FR-105`/`SC-008` font porter cette dette par toute la flotte. Les plafonds, eux, sont
   **égaux** des deux côtés et n'ont rien départagé.

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
   car l'espace maigrit au lieu de croître sans fin, `FR-037` et `FR-084` restent vrais à
   l'écran, et `SC-011` n'exige pas l'identité binaire. Alternatives écartées : **R2** — un
   moyen de paiement est exigé au *checkout* d'activation, ce qui tombe sous `I5` (Billing
   policy, et non le témoignage Community) ; **deux dépôts distincts** — mêmes bénéfices, un
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

6. **Auth : implémentation maison sur D1.** Retenue car la surface est exactement le besoin —
   une adresse, un jeton, une session — et parce que `FR-005` (ne rien envoyer à une adresse
   non autorisée) et `FR-008` (aucune réponse ne distingue) y sont tenus par construction.
   Alternatives écartées : **Better Auth 1.6.26** — 3,2 Mo dépaquetés, 17 dépendances et 19
   pairs pour six piles de base de données dont une seule sert, sous un plafond de Worker de
   3 Mo gzip, et `FR-005`, `FR-008` et le moyen de reprise (`FR-009` à `FR-012`) resteraient
   à écrire par-dessus ; **Cloudflare Access one-time PIN** — son palier gratuit n'a **aucune
   source primaire**, donc invérifiable face à `I5` et `FR-103`, et l'éditrice se
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
   la fonction que le PRD exclut. **(3) Un cookie `__Host-`, `HttpOnly`, `Secure`,
   `SameSite=Strict`, sans restriction de `Path`** — le préfixe est gratuit et ferme l'injection
   depuis un sous-domaine ; restreindre le `Path` casserait `FR-082`, l'aperçu vivant sur la même
   origine sous une autre route. **(4) Un jeton anti-CSRF par écriture, doublé d'un contrôle
   d'en-tête `Origin`** — il ne vise que la forgerie venue d'un autre site ; contre le XSS
   same-origin, ni lui ni `SameSite` ne peuvent rien, et ce sont l'invariant d'échappement et la
   CSP de l'administration qui répondent. **Alternative écartée en propre : la passkey WebAuthn
   en facteur primaire.** C'est la seule forme qui survivrait à un lecteur de la boîte — le
   scénario le plus probable — et elle *serait* le moyen de reprise ; mais `FR-009` et le
   glossaire du PRD disent « secret **remis** à la livraison », quand une passkey naît sur
   l'appareil de l'éditrice et suppose une session déjà ouverte, et sa récupération pend au
   trousseau d'un tiers — le motif même du rejet d'Access OTP. Elle demande d'amender le PRD :
   c'est un arbitrage de `/scd-sdd:premortem socle`, pas de cette phase. **Ce que `FR-005` doit à
   la plateforme** : l'interdiction d'écrire à une adresse non autorisée n'est pas seulement
   programmée, `send_email` ne sait écrire qu'à une destination vérifiée — mais c'est aussi ce
   qui bloque `FR-013` et `FR-014`, voir la section dédiée.

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

10. **Langage : TypeScript strict.** Retenu car le Brief exige que la confiance vienne de
    vérifications mécaniques, le code n'étant pas relu ligne à ligne. Alternative écartée :
    **JavaScript + JSDoc vérifié par `tsc`** — même vérificateur, ergonomie dégradée sur les
    structures du produit (schéma des emplacements, contrats de publication).

11. **Îlots : Svelte 5.** Retenu car `FR-054` fait expédier du JavaScript sur toute page
    publique portant un formulaire, et `SC-005` mesure Lighthouse ≥ 95 en mobile sur ces
    pages : le compilateur de Svelte n'expédie pas de runtime de framework. Alternative
    écartée : **React 19** — écosystème plus large, mais le coût est payé par la visiteuse,
    là où le critère se mesure.

12. **Anti-abus : Turnstile *managed* devant, compteur par origine hachée dans un Durable
    Object.** Retenu car `FR-062` et `FR-007` demandent littéralement un **seuil de
    fréquence** — un compteur, pas une preuve d'humanité — et parce que l'ordre décide :
    Turnstile est gratuit et illimité en mode *managed*, il absorbe le volume avant que le
    compteur, plafonné à 100 000 requêtes par jour, ne soit sollicité. Alternative écartée :
    **une règle Cloudflare Rate Limiting** — sa disponibilité et ses limites sur le palier
    gratuit ne sont pas sourcées, elle ne peut donc pas descendre en ADR.

13. **Tests : Vitest dans `workerd`, Playwright, épreuve de réversibilité scriptée.** Retenue
    car `@cloudflare/vitest-pool-workers@0.21.0` exécute les tests avec les liaisons réelles
    D1 et Durable Objects, et parce que `SC-011` demande une pièce datée, donc un script
    rejouable. Alternative écartée : **Vitest sous Node avec liaisons simulées** — l'oracle
    devient faux, les tests attestant du comportement des simulacres.

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

16. **Moyen de reprise : un code de haute entropie haché en D1, remis sur papier à la
    livraison, à usage unique et réémis à l'emploi.** Retenu parce que c'est la seule forme que
    le PRD laisse ouverte sans être amendé — « secret non e-mail **remis** à la livraison »
    (glossaire), rien en configuration qui le reconstitue (`FR-011`), remplaçable depuis une
    session ouverte avec cessation de l'ancien (`FR-012`), ce qui impose un magasin mutable,
    donc D1 — et parce qu'il n'ajoute ni dépendance, ni mécanisme neuf : c'est le patron déjà
    retenu pour le code de connexion. L'usage unique est ce qui le départage : un code à usage
    multiple serait une porte dérobée permanente sur papier, et un usage unique sans réémission
    laisserait l'éditrice sans filet au sortir de la panne même qui l'a fait servir — `FR-012`
    fournit déjà le geste de réémission. Alternatives écartées : **la passkey** (voir n° 6, elle
    demande d'amender le glossaire) ; **la rémanence de session longue**, déjà écartée par `A-02`
    au motif qu'elle est irrévocable en cas de vol d'appareil — l'objection perd de sa force avec
    la session opaque du n° 6, mais une session n'est pas un secret remis à la livraison et ne
    répond pas à `FR-009` ; **une seconde adresse e-mail**, écartée par `A-02` et `A-09` (deux
    boîtes valent un second compte contre `SC-006`, et leurs pannes sont corrélées).

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
  actif avant la livraison.
- **`docs/prd.md`** : non modifié, et il ne doit pas l'être ici. **Trois** dettes y sont
  ouvertes, toutes pour `/scd-sdd:premortem socle` : le `FR` qui porterait la détection de panne
  d'acheminement ; la qualification de `FR-005`, qui verrouille `FR-014` tel qu'il est rédigé ;
  et le sort de `FR-013`, dont le glossaire fond l'adresse de connexion et la destination des
  demandes en un seul objet que `send_email` ne sait pas déplacer. Les deux dernières datent du
  2026-08-11, par le traitement de `S-05`.
- **La recette de livraison et l'inventaire de livraison** gagnent le **moyen de reprise** —
  code remis sur papier, rangé dans un espace de la cliente, son emplacement noté au dossier
  d'instance et jamais sa valeur (`FR-112`). Renvoyé au traitement de `S-01`, à qui revient
  l'inventaire des secrets, et qui devra aussi y porter le **retrait de la clé de signature**.
- **`docs/ci.md`** (phase 6) : **cinq** contrôles nommés ci-dessus doivent y devenir
  bloquants — l'aller-retour Markdown de l'éditeur, le rejet des URL de schéma non autorisé,
  le garde-fou `C5`, la liste `run_worker_first` bornée, et l'absence de `{@html}` sur toute
  donnée fournie par un visiteur. Les deux du milieu datent du 2026-08-11 par le traitement de
  `S-06`, le dernier du même jour par celui de `S-05`.
