# ColibriCMS — Cahier de test manuel

État couvert : tout ce qui est livré dans `main` au 2026-11-12 (`9db5146`) — les changes **001
Connexion par code**, **002 Socle d'îlots d'administration**, **003 Remplir et corriger les
emplacements d'une page** et **004 Bibliothèque de médias** (§§ 1 à 17) ; **005 Mise en page de
l'administration**, dont les §§ 18 à 22 portent la recette de fin de front ; **006 Nom des
emplacements** (sans section propre : les noms se lisent aux §§ 13 à 15) ; **007 Expéditeur du code
de connexion** (§ 23) ; **008 Réglages transverses** (§§ 24 à 26) ; **009 Parcours navigateur**
(tests automatiques, sans section ici) ; **010 Réglage des formulaires** (§§ 27 et 28) ; **011
Aperçu et publication** (§§ 29 à 32) ; **012 Envoi des demandes de devis** (§§ 33 et 34) ; **013
Réception et suivi des demandes** (§§ 35 à 41) ; **015 Restauration** (cas en fin de bilan) ; **016 Moyen de reprise**
(§§ 43 à 45) ; **017 Remplacement de l'adresse autorisée** (§§ 46 et 47) ; **018 Envoi du code de
remplacement fiable** (§§ 48 et 49). La source
de vérité de chaque attendu est la spec vivante citée en tête de section
(`openspec/specs/<capacité>/spec.md`).

Ce cahier complète les tests automatiques (`docs/test.md`), il ne les remplace pas : il vise ce
qu'un test dans `workerd` ne voit pas — le rendu au navigateur, la CSP réellement appliquée (voir
`docs/test.md`, la CSP est invisible aux tests), les textes lus par l'éditrice, les gestes.

**Hors périmètre** (pas encore livré, ne pas tester) : le
déploiement d'une instance au nom du
client et de ses nouvelles versions, la reconstruction du site sans le CMS et le dossier
d'instance. La rapidité du site public (SC-005) se recette au § 42. Sur le serveur de recette, la révocation des accès
d'Isometria (SC-012, SC-013) ne se recette pas : le compte est celui de l'opérateur.

---

## 0. Préparer le terrain

### 0.1 Prérequis

- Node + `npm ci` (jamais `npm install`).
- Un navigateur récent (Chrome/Chromium ou Firefox) avec ses outils de développement.
- Un second « appareil » : une **fenêtre de navigation privée** du même navigateur, ou un autre
  navigateur — le produit distingue les appareils par un cookie, une fenêtre privée en est un.
- Un jeu d'images à préparer avant de commencer (§ 0.4).
- Si l'instance est exposée sur un autre nom (par ex. `https://colibri-cms.kfz.lan`), lire
  `http://127.0.0.1:8787` comme ce nom partout dans le cahier ; le code de connexion, lui, se lit
  toujours sur la machine qui fait tourner `wrangler dev` (§ 0.3).

### 0.2 Mettre en route

```sh
npm run db:migrate          # applique les 6 migrations sur la base locale
npx wrangler d1 execute DB --local \
  --command "insert into adresses_autorisees (adresse) values ('editrice@example.com');"
mkdir -p .wrangler/tmp/email
npm run typecheck && npm run build   # l'artefact bâti, copié sous .wrangler/test-worker/
npx wrangler dev --port 8787         # le sert avec la base locale → http://127.0.0.1:8787
```

**Pas `npm run dev` pour ce cahier** : en développement, Vite injecte le CSS par script et Astro
sa barre d'outils — la CSP stricte de l'administration bloque les deux (aucun style, console rouge).
Seul l'artefact bâti reproduit ce que le navigateur verra en production. Après toute modification
des sources ou de `content/pages/`, rejouer `npm run build` puis relancer `wrangler dev`.

L'adresse autorisée est `editrice@example.com` : c'est celle que déclare `wrangler.astro.jsonc`
(`send_email.destination_address`), la seule vers laquelle la liaison locale accepte d'expédier.

### 0.3 Lire le code de connexion

**Sur le serveur de recette** (`https://colibri.sebc.dev`), le message arrive dans la boîte de l'adresse
autorisée, expédié depuis l'adresse d'expéditeur déclarée par l'instance (`senderAddress`) : le lire dans
cette boîte (objet `Votre code de connexion`, corps `Code : XXXXXXXX`). Prérequis, geste humain unique :
déclarer `senderAddress` dans `instance.json`, puis activer l'acheminement d'e-mail sur le domaine de cette
adresse dans le compte Cloudflare (Email Routing ; **sous-domaine** via Settings > Subdomains si le domaine
principal reçoit son courrier ailleurs, jamais sur le domaine principal dans ce cas : cela remplacerait ses
enregistrements MX). Un envoi refusé laisse une ligne d'échec dans les journaux du serveur.

**En local**, ce qui suit.

Aucun e-mail ne part réellement en local. Le message est déposé par la plateforme locale dans
`.wrangler/tmp/email/<id>/email-text/<id>.txt` ; le code y figure sous la forme `Code : XXXXXXXX`. Le terminal
de `wrangler dev` affiche aussi une ligne `send_email binding called`.

```sh
find .wrangler/tmp/email -name '*.txt' -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2- | xargs cat
```

### 0.4 Le jeu d'images

| Fichier | Comment l'obtenir | Sert à |
|---|---|---|
| `photo.jpg` (< 2 Mo) | n'importe quelle photo JPEG | téléversement admis |
| `logo.png` (< 2 Mo) | n'importe quel PNG | téléversement admis, recherche |
| `banniere.webp` (< 2 Mo) | n'importe quel WebP | téléversement admis |
| `dessin.svg` | un fichier texte `<svg xmlns="http://www.w3.org/2000/svg"/>` | refus de format |
| `anim.gif` | n'importe quel GIF | refus de format (hors liste) |
| `lourde.jpg` (> 2 Mo) | une photo de téléphone non compressée | refus de poids |
| `menteur.png` | `cp anim.gif menteur.png` | extension qui ment, refus |
| `jpeg-deguise.png` | `cp photo.jpg jpeg-deguise.png` | type servi = type réel |
| `tronque.jpg` | `head -c 100 photo.jpg > tronque.jpg` | fichier tronqué |

### 0.5 Regarder en base (pour les attendus « rien n'est écrit »)

```sh
npx wrangler d1 execute DB --local --command "select id, identifiant_appareil, essais, utilise_le, annule_le from codes_connexion;"
npx wrangler d1 execute DB --local --command "select * from brouillons_emplacements;"
npx wrangler d1 execute DB --local --command "select id, nom_origine, nom_affichage, format, largeur, hauteur, poids_octets from medias;"
```

### 0.6 Remettre à zéro

```sh
npx wrangler d1 execute DB --local --command "delete from codes_connexion; delete from sessions; delete from brouillons_emplacements; delete from medias; delete from medias_effacees; delete from brouillons_reglages; delete from brouillons_formulaires;"
```

Le plafond de **cinq codes par heure** se déclenche vite en test : `delete from codes_connexion`
libère les places.

### 0.7 Pages de démonstration

Trois pages sont déclarées par l'intégrateur dans `content/pages/` (lecture seule pour l'éditrice) :

| Page | Emplacements, dans l'ordre |
|---|---|
| Accueil | texte riche · lien de vidéo (YouTube) · bouton d'action · **image** · **galerie** (vide) |
| Tarifs | texte riche · bouton d'action |
| Contact | texte riche · lien de vidéo (Vimeo) · **image** · **carrousel** (vide) |

Les deux emplacements d'image référencent au départ des identités d'images (`media-fixture-hero`,
`media-fixture-equipe`) qui n'existent pas dans la bibliothèque : c'est voulu (contenu de démonstration).
Noter ce que l'éditeur affiche dans ce cas (CT-6.3) — il ne doit ni casser ni montrer d'identifiant.

---

## Conventions

- Un cas = une ligne. **Résultat** : `OK` / `KO` / `NA` + commentaire. Un KO cite l'écran, le texte
  ou l'en-tête vu.
- **Contrôle transverse « aucun terme de développeur » (FR-117)** — à appliquer sur **chaque écran
  et chaque message** rencontré, sans qu'il soit répété à chaque ligne. Sont interdits, entre
  autres : *commit, branche, build, déploiement, base, base de données, serveur, fichier, JSON,
  identifiant / id, slug, URL, route, session, cookie, token, cache, brouillon* (dans les écrans
  Médias), *orpheline, référence, undefined, null, erreur 4xx/5xx*. Les mots du métier (glossaire
  du `CLAUDE.md`) sont attendus : *page, emplacement, brouillon* (dans les pages), *publication,
  image, galerie, carrousel*.
- **Contrôle transverse CSP** — la console du navigateur ne doit rapporter **aucune** violation
  `Content Security Policy` sur aucun écran. Garder la console ouverte pendant toute la session.
- **Contrôle transverse structure (FR-024/025)** — nulle part un geste d'ajout, retrait,
  déplacement ou renommage de page, de rubrique ou d'emplacement.

---

## 1. La porte de l'administration — `connexion-par-code`

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), par requêtes directes (curl), sans session puis avec une session de relecture ; console : sans objet (aucun écran ouvert au navigateur pour ce §, l'écran de connexion est contrôlé au § 18)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-1.1 | Sans session, ouvrir `http://127.0.0.1:8787/admin/` | Renvoi vers l'écran de connexion ; rien de l'accueil n'apparaît | OK — 2026-11-12 : `/admin/` sans session : 302 vers `/admin/connexion`, corps vide (0 octet) |
| CT-1.2 | Ouvrir `/admin/connexion` sans session, puis (plus tard) avec session | L'écran de connexion se rend dans les deux cas, avec son champ d'adresse | OK — 2026-11-12 : `/admin/connexion` : 200 sans session et avec session, champ « Adresse » (`name="adresse"`) présent dans les deux cas |
| CT-1.3 | Ouvrir `/admin/nimportequoi` sans session, puis avec session | Refus ; rien de l'administration n'est visible (ni menu, ni page) | OK — 2026-11-12 : `/admin/nimportequoi` : 404 « Page introuvable — Cette page n’existe pas : l’adresse est peut-être incomplète. », sans et avec session ; ni menu ni page, seul le lien « Retour à l’administration » |
| CT-1.4 | Ouvrir `/admin` (sans barre finale), sans session | Même comportement que CT-1.1 | OK — 2026-11-12 : `/admin` sans barre finale : 302 vers `/admin/connexion`, corps vide, comme CT-1.1 |
| CT-1.5 | Outils de développement → Réseau, sur la réponse de `/admin/connexion` | En-têtes présents : `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, un refus de mise en cadre (`X-Frame-Options` ou `frame-ancestors`) | OK — 2026-11-12 : sur `/admin/connexion` : CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` et `frame-ancestors 'none'` |
| CT-1.6 | Même vérification sur le **renvoi** de CT-1.1 et sur le **refus** de CT-1.3 | Exactement les mêmes en-têtes, aux mêmes valeurs, que CT-1.5 | OK — 2026-11-12 : le renvoi (302) de `/admin/` et `/admin`, et le refus (404), portent les quatre mêmes en-têtes, aux mêmes valeurs que CT-1.5 |
| CT-1.7 | Lire la valeur de `Content-Security-Policy` | `script-src` sans `unsafe-inline` ni `unsafe-eval` ; aucune origine tierce (aucun `https://…` étranger) ; `style-src-attr 'unsafe-inline'` présent | OK — 2026-11-12 : `script-src 'self'`, ni `unsafe-inline` ni `unsafe-eval`, aucune origine tierce ; `style-src-attr 'unsafe-inline'` présent |
| CT-1.8 | Source de la page (Ctrl+U) sur `/admin/connexion` | Aucun `<script>` en ligne ; les scripts sont chargés par `<script src>` | OK — 2026-11-12 : source de l'écran de connexion : aucune balise `<script>` (ni en ligne ni par `src`) |

## 2. Demander un code — `connexion-par-code`

Vider `.wrangler/tmp/email/` avant de commencer (`rm -rf .wrangler/tmp/email/*`). Sur le serveur de
recette, « un fichier `.txt` apparaît » se lit « un message arrive dans la boîte de l'adresse autorisée »
(§ 0.3).

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), au navigateur piloté (écran, 1280 px) et par curl (un jeu de cookies par appareil) pour comparer les réponses, codes lus dans Gmail (fil 1a1d120f62dc9342, nouveau fil du jour) ; console : aucun message

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-2.1 | Soumettre `editrice@example.com` | L'écran passe à la saisie du code ; un fichier `.txt` apparaît sous `.wrangler/tmp/email/` | OK — 2026-11-12 : adresse autorisée soumise à 18:59:14 : l'écran garde sa carte à deux étapes (§ 18), étape « Code » prête ; message reçu à 18:59:15. L'attendu « passe à la saisie » date d'avant cette carte |
| CT-2.2 | Ouvrir ce fichier | Texte seul (aucune balise HTML) ; objet `Votre code de connexion` ; corps `Code : XXXXXXXX` | OK — 2026-11-12 : message en `text/plain; charset=utf-8`, aucune partie HTML ; objet « Votre code de connexion », corps `Code : BXDT66WP`, expédié de `code@colibri.sebc.dev` |
| CT-2.3 | Lire le code | Huit signes, chiffres ou majuscules, **jamais** de `I`, `L`, `O` ni `U` | OK — 2026-11-12 : codes reçus pendant les §§ 2 et 3 : huit signes chacun, aucun `I`, `L`, `O` ni `U` (voir le décompte au § 3) |
| CT-2.4 | En base (§ 0.5), la ligne `codes_connexion` créée | Le code en clair **n'y figure pas** (`empreinte` et `sel` seulement) ; `identifiant_appareil` renseigné | OK — 2026-11-12 : ligne 70 : colonnes `empreinte` (64 signes) et `sel` (32), aucune colonne de code en clair ; `identifiant_appareil` = le cookie de l'appareil (3cef3573-…) |
| CT-2.5 | Soumettre `inconnu@example.com` (autre appareil ou après reset) | **Même écran, même texte** qu'en CT-2.1 ; **aucun** nouveau fichier dans `.wrangler/tmp/email/` ; aucune nouvelle ligne en base | OK — 2026-11-12 : `inconnu@example.com` depuis un autre appareil : même corps, au signe près, que l'adresse autorisée ; aucune ligne en base, aucun message |
| CT-2.6 | Onglet Réseau : comparer les deux réponses POST de CT-2.1 et CT-2.5 | Même statut, mêmes en-têtes, corps identique ; le temps de réponse est ≥ 300 ms dans les deux cas et du même ordre | OK — 2026-11-12 : 200 des deux côtés, en-têtes (hors date et traçage) et corps identiques ; 0,40 s et 0,41 s |
| CT-2.7 | Outils → Application → Cookies, après affichage de `/admin/connexion` | Un cookie d'identifiant d'appareil est posé ; recharger la page ne le change pas | OK — 2026-11-12 : cookie `identifiant-appareil` posé à l'affichage, inchangé au rechargement et tout au long des §§ 2 et 3 |
| CT-2.8 | Demander **six** codes de suite avec l'adresse autorisée (moins d'une heure) | Les cinq premiers produisent un fichier ; le sixième affiche un message de plafond atteint, **sans** fichier ni ligne en base | OK — 2026-11-12 : codes vidés puis six demandes de suite : cinq lignes, cinq messages (19:00:20 à 19:00:24) ; la sixième : « Trop de demandes de connexion ont déjà été envoyées récemment. Merci de patienter un moment avant de réessayer. », sans ligne ni message |
| CT-2.9 | Plafond atteint, soumettre `inconnu@example.com` | Le **même** message de plafond, mot pour mot | OK — 2026-11-12 : plafond atteint, `inconnu@example.com` : même message au signe près au navigateur ; par curl, corps et en-têtes identiques à ceux de l'adresse autorisée ; toujours cinq lignes |
| CT-2.10 | Plafond atteint, puis `delete from codes_connexion` (simule la sortie de l'heure) et redemander | Un code est de nouveau écrit et déposé | OK — 2026-11-12 : `delete from codes_connexion` puis nouvelle demande : une ligne écrite (77), message reçu à 19:00:49 (`1G5YCFYA`) |
| CT-2.11 | Reset complet **sans** réinsérer l'adresse autorisée (instance non semée), soumettre une adresse | Même écran que CT-2.1, rien d'autre — l'instance ne trahit pas qu'elle n'est pas semée. Réinsérer l'adresse ensuite (§ 0.2) | OK — 2026-11-12 : ligne de `adresses_autorisees` sauvegardée (id 7), retirée à 20:33:14 UTC (0 ligne), l'adresse d'origine soumise depuis un appareil neuf : 200 en 0,45 s, corps identique au signe près (même empreinte sha256) à celui d'une adresse inconnue soumise juste avant, mêmes en-têtes (hors date et traçage) ; aucune ligne `codes_connexion` écrite, aucun message dans la boîte. Ligne réinsérée à l'identique à 20:33:18 (fenêtre de 4,6 s), prouvé par `select count(*), sum(id = 7 and adresse = '<sauvegarde>')` → 1 et 1. Ensuite, l'adresse soumise de nouveau : même corps encore, une ligne écrite et un code reçu à 20:33:30. `codes_connexion`, `comptes_seuil` et `fenetre_seuil` vidés après le cas |

## 3. Recopier le code, ouvrir la session — `connexion-par-code`

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), au navigateur piloté (appareil A, 1280 px) et par curl (appareil B, jeu de cookies distinct), codes lus dans Gmail ; console : aucun message

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-3.1 | Lire l'écran de saisie du code | Il dit que le code reste valable **quinze minutes** et que **seul le dernier code demandé depuis cet appareil** permet d'entrer | OK — 2026-11-12 : « Vous avez déjà reçu un code sur cet appareil ? Seul le dernier code demandé depuis cet appareil permet d'entrer ; il reste valable quinze minutes, recopiez-le ci-dessous. » |
| CT-3.2 | Demander un code, le recopier tel quel | Renvoi vers l'accueil `/admin/` : « Vous êtes connectée. », aucun lien ni bouton d'action sur l'accueil | OK — 2026-11-12 : `1G5YCFYA` recopié : arrivée sur « Mes pages » (`/admin/mes-pages`), comme le veut la spec vivante : l'accueil « Vous êtes connectée. » n'existe plus |
| CT-3.3 | Outils → Application → Cookies après CT-3.2 | Un cookie `__Host-…` avec `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` ; sa valeur est opaque (ne contient ni adresse, ni date lisible) | OK — 2026-11-12 : `__Host-session` : `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` ; valeur de 64 signes hexadécimaux, sans adresse ni date |
| CT-3.4 | Nouveau code ; le recopier en **minuscules**, avec des **tirets ou espaces** entre les signes | Accepté | OK — 2026-11-12 : `7fy-rg aaq` pour `7FYRGAAQ` : accepté, arrivée sur « Mes pages » |
| CT-3.5 | Nouveau code contenant un `0`, `1` ou `V` ; le recopier en remplaçant par `O`, `I`/`L`, `U` | Accepté (confusables ramenés à leur signe) | OK — 2026-11-12 : `GCMHZQ9U` pour `GCMHZQ9V` : accepté |
| CT-3.6 | Se déconnecter (supprimer le cookie `__Host-…`), présenter le **même** code une seconde fois | Refus : « Ce code a déjà servi : demandez un nouveau code. » | OK — 2026-11-12 : cookie de session retiré, `1G5YCFYA` présenté de nouveau : « Ce code a déjà servi : demandez un nouveau code. » |
| CT-3.7 | Nouveau code ; saisir un code faux | « Ce code n'est pas reconnu. Vérifiez-le et retapez-le. » ; pas de session | OK — 2026-11-12 : code faux : « Ce code n'est pas reconnu. Vérifiez-le et retapez-le. » ; aucun cookie de session posé |
| CT-3.8 | Saisir un code faux **cinq fois**, puis le **bon** code | À la cinquième : « Trop de tentatives avec ce code : demandez un nouveau code. » ; le bon code est ensuite refusé lui aussi (brûlé) | OK — 2026-11-12 : quatre premiers essais faux : « Ce code n'est pas reconnu… » ; au cinquième : « Trop de tentatives avec ce code : demandez un nouveau code. » ; le bon code (`EFEYH2VS`) reçoit ensuite le même refus. Au premier passage, le seuil par origine a répondu « Trop de tentatives de connexion depuis votre accès à internet. Merci de patienter une heure avant de réessayer. » (25 soumissions dans l'heure) : compte remis à zéro, série reprise sur le même code |
| CT-3.9 | Demander un code depuis l'appareil A ; le saisir depuis l'appareil B (fenêtre privée) | « Ce code a été demandé depuis un autre appareil : revenez sur l'appareil où vous l'avez demandé pour vous connecter. » — jamais « demandez un nouveau code » | OK — 2026-11-12 : code de A (`JDZXV931`) saisi depuis B : « Ce code a été demandé depuis un autre appareil : revenez sur l'appareil où vous l'avez demandé pour vous connecter. », sans session ; le même code est ensuite accepté sur A |
| CT-3.10 | Appareil A : demander un code C1, puis un code C2 ; saisir C1 | « Ce code n'est plus valable : demandez un nouveau code. » ; C2 reste accepté | OK — 2026-11-12 : C1 `0ZJFMVB3` puis C2 `05N5JFTQ` sur A ; C1 : « Ce code n'est plus valable : demandez un nouveau code. » ; C2 accepté |
| CT-3.11 | Appareil A : code CA ; appareil B : code CB ; saisir CA sur A | Accepté — la nouvelle demande de B n'a pas annulé le code de A | OK — 2026-11-12 : CA `GH86FJT5` sur A, puis CB demandé par B ; CA saisi sur A : accepté |
| CT-3.12 | Demander un code, en base : `update codes_connexion set expire_le = 0;` puis le saisir | « Ce code a expiré : demandez un nouveau code. » | OK — 2026-11-12 : `update codes_connexion set expire_le = 0` puis `V8K49216` : « Ce code a expiré : demandez un nouveau code. » |
| CT-3.13 | Session ouverte ; en base : `update sessions set creee_le = 0;` puis recharger `/admin/` | Renvoi vers la connexion (butée absolue de trente jours simulée) | OK — 2026-11-12 : `creee_le = 0` sur ma seule session A, `/admin/` rechargé : renvoi vers `/admin/connexion` |
| CT-3.14 | Session ouverte ; recharger `/admin/mes-pages` dix fois de suite | Toujours servi ; aucune nouvelle ligne `sessions` à chaque requête (le rafraîchissement n'écrit pas à chaque fois) | OK — 2026-11-12 : dix rechargements de `/admin/mes-pages` servis (200) ; une ligne `sessions` pour l'appareil avant comme après, `dernier_usage_le` inchangé |
| CT-3.15 | Ouvrir une session sur A **et** une sur B | Les deux coexistent ; aucune ne ferme l'autre | OK — 2026-11-12 : sessions de A (navigateur) et de B (curl, 302 vers `/admin/` puis 200 sur « Mes pages ») servies ensemble |

> Les échéances de sept jours sans usage et le repoussement glissant ne se testent pas à la main ;
> ils sont couverts par les tests automatiques de `tests/integration/`.

## 4. Le cadre de l'administration — `pages-et-emplacements`, `socle-ilots-admin`

Session ouverte. Ouvrir `/admin/mes-pages`.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 800, console : aucun message sur les cinq rubriques et l'éditeur d'Accueil (hors la 404 de favicon.ico au premier chargement)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-4.1 | Lire la barre latérale | Cinq rubriques : **Mes pages**, **Médias**, **Réglages**, **Formulaires**, **Demandes** ; « Mes pages » marquée active | OK — 2026-11-12 : Mes pages, Médias, Réglages, Formulaires, Demandes ; « Mes pages » marquée active (`aria-current="page"`, fond vert rgb(14,107,85)) |
| CT-4.2 | Cliquer « Médias » | L'écran Médias s'ouvre, « Médias » devient la rubrique active | OK — 2026-11-12 : `/admin/medias`, titre « Médias », « Médias » devient la seule rubrique active |
| CT-4.3 | Cliquer « Demandes » | L'écran Demandes s'ouvre, « Demandes » devient la rubrique active | OK — 2026-11-12 : `/admin/demandes`, « 0 demande · 0 commande », « Demandes » devient la seule rubrique active |
| CT-4.4 | Actionner « Replier le menu » | La barre devient un rail d'icônes seules ; la rubrique active reste marquée ; la zone de contenu s'élargit | OK — 2026-11-12 : rail d'icônes de 63 px, « Demandes » reste marquée (fond vert) ; le contenu passe de 1056 à 1216 px (capture `CT-4.4-replie.png`) |
| CT-4.5 | Actionner « Déplier le menu » | Les libellés reparaissent à côté des icônes | OK — 2026-11-12 : menu de 223 px, libellés revenus à côté des icônes, contenu à 1056 px (capture `CT-4.5-deplie.png`) |
| CT-4.6 | Replier, puis **recharger** la page ; onglet Réseau pendant le repli | L'état replié est conservé ; **aucune** requête serveur n'a été émise par le repli | OK — 2026-11-12 : toujours replié (63 px) après rechargement ; aucune requête émise au repli ni au dépli (écoute des requêtes du navigateur : 0) |
| CT-4.7 | Parcourir tout le menu | Aucun bouton « + », « ajouter », « renommer », « supprimer », « déplacer » sur les rubriques ou les pages | OK — 2026-11-12 : sur les cinq rubriques, hors navigation, « Replier le menu » et « Publier » : « Téléverser une image » (Médias) ; Monter/Descendre/Retirer un réseau social, « Ajouter un lien », « Revenir à la version publiée », « Enregistrer » et la mise en forme (Réglages) ; les deux formulaires (Formulaires) ; aucun geste sur une page ni une rubrique |
| CT-4.8 | Console ouverte pendant tout le § 4 | Aucune violation CSP ; aucun style de composant bloqué (menus, boutons, champs s'affichent normalement) | OK — 2026-11-12 : console vide sur les cinq rubriques et l'éditeur d'Accueil ; une feuille de style chargée, « Publier » sur fond vert, menus, boutons et champs stylés normalement |
| CT-4.9 | Source de l'écran | Aucune directive `client:` ; aucun `<script>` en ligne | OK — 2026-11-12 : source brute des cinq rubriques et des éditeurs d'Accueil et de Contact (réponse 200) : aucun `client:` ni `client=`, aucun `<script>` en ligne (1 ou 2 scripts, tous par `src`) ; CSP `default-src 'none'; script-src 'self'; …` |

## 5. La liste des pages — `pages-et-emplacements`

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 800 ; CT-5.4 sur la variante `vide` à 1280 × 720 ; console : aucun message hors la 404 de favicon.ico

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-5.1 | Ouvrir « Mes pages » | Trois lignes, dans cet ordre : **Accueil, Tarifs, Contact** | OK — 2026-11-12 : Accueil, Tarifs, Contact, dans cet ordre |
| CT-5.2 | Cliquer « Accueil » | L'éditeur de la page Accueil s'ouvre | OK — 2026-11-12 : un clic sur la ligne Accueil ouvre `/admin/pages/accueil`, titre « Accueil » |
| CT-5.3 | Sur la liste, aucune page n'a encore de brouillon | Aucune pastille « brouillon » | OK — 2026-11-12 : au départ (base sans aucun brouillon de page), aucune pastille, `[data-pastille-brouillon]` = 0 (vu en CT-19.1) ; ensuite, Accueil et Contact, toujours sans brouillon, restent sans pastille |
| CT-5.4 | *(optionnel, coupe le serveur)* Renommer temporairement `content/pages` en `content/pages.off`, rebâtir et relancer `wrangler dev`, ouvrir « Mes pages » | Un message d'état vide, **sans** bouton de création. Remettre le dossier ensuite | OK — 2026-11-12 : joué sur la variante `vide` : « Aucune page n’est disponible pour le moment : il n’y a rien à modifier ici. », aucun bouton ni lien dans la zone principale ; console sans violation CSP (capture `CT-20.8-vide-1280.png`) |

## 6. L'éditeur d'une page — `pages-et-emplacements`

Ouvrir la page **Accueil**.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 800, console : aucun message

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-6.1 | Lire l'éditeur | Cinq emplacements, dans l'ordre : texte riche · lien de vidéo · bouton d'action · image · galerie — chacun reconnaissable à sa nature | OK — 2026-11-12 : Texte riche · Lien de la vidéo · Bouton d’action · Image · Galerie, chacune titrée de sa nature |
| CT-6.2 | Lire les contenus | Le lien de vidéo montre l'URL YouTube ; le bouton montre « Demander un devis » / `/contact` ; la galerie est vide | OK — 2026-11-12 : vidéo `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, bouton « Demander un devis » / `/contact`. Écart d'attendu inchangé : l'éditeur montre le contenu publié courant, dont une galerie de 44 images (« 44 images composent cette galerie. ») publiée lors d'une passe précédente, pas une galerie vide |
| CT-6.3 | L'emplacement **image** (son identité de démonstration n'existe pas en bibliothèque) | L'écran ne casse pas ; aucun identifiant technique (`media-fixture-hero`) ni mot « undefined » n'apparaît ; le sélecteur d'image reste utilisable | OK — 2026-11-12 : prémisse vieillie : l'emplacement porte l'image publiée « X-01.jpg » (plus `media-fixture-hero`), affichée par son adresse `/_astro/…`. 0 image cassée sur 45 dans l'éditeur ; « Remplacer l'image » ouvre « Choisir une image » : 45 images, toutes chargées, aucune cassée ; fermé par « Fermer » sans choisir, rien écrit en base (capture `CT-6.3-selecteur.png`) ; ni « undefined » ni `media-fixture` à l'écran |
| CT-6.4 | Actionner le fil de retour | Retour à « Mes pages » | OK — 2026-11-12 : « ‹ Mes pages » ramène à `/admin/mes-pages` |
| CT-6.5 | Ouvrir **Contact** | texte riche · lien de vidéo (Vimeo) · image · carrousel, dans cet ordre | OK — 2026-11-12 : Texte riche · Lien de la vidéo (`https://vimeo.com/76979871`) · Image · Carrousel, dans cet ordre, suivis d'un cinquième emplacement « Formulaire — Devis gâteau » (lien « Régler ce formulaire ») que l'attendu ne cite pas |
| CT-6.6 | Ouvrir **Tarifs** | texte riche · bouton d'action | OK — 2026-11-12 : Texte riche · Bouton d’action, suivis d'un emplacement « Formulaire — Devis gâteau » que l'attendu ne cite pas |
| CT-6.7 | Parcourir l'éditeur | Aucun geste d'ajout, retrait, déplacement ni renommage d'emplacement | OK — 2026-11-12 : gestes vus sur Accueil, Tarifs et Contact : Voir l’aperçu, mise en forme, Enregistrer, Remplacer l’image, dans la galerie Monter/Descendre/Retirer et Ajouter une image, « Régler ce formulaire », « Revenir à la version publiée » (Tarifs, qui a un brouillon) ; aucun geste de structure |

## 7. Le bouton d'action — `pages-et-emplacements`

Page **Accueil**, emplacement « bouton d'action ».

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 800, console : seulement les trois réponses 400 attendues des refus de CT-7.6 et CT-7.7, aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-7.1 | Changer le libellé en « Obtenir un devis », enregistrer | Enregistré sans quitter l'écran ; la **pastille brouillon** apparaît au fil de retour ; en base une ligne `brouillons_emplacements` | OK — 2026-11-12 : l'éditeur reste affiché, marque « Brouillon » au titre ; ligne `accueil` / `bouton-devis` (« Obtenir un devis », `/contact`) en base |
| CT-7.2 | Retour à « Mes pages » | La ligne Accueil porte la pastille brouillon ; Tarifs et Contact non | OK — 2026-11-12 : Accueil « Brouillon », Contact sans ; Tarifs porte déjà le sien, posé au § 19 |
| CT-7.3 | Recharger l'éditeur d'Accueil | Le libellé corrigé est bien celui affiché (persistance) | OK — 2026-11-12 : « Obtenir un devis » affiché après rechargement |
| CT-7.4 | Destination `https://exemple.fr/devis`, enregistrer | Accepté | OK — 2026-11-12 : `https://exemple.fr/devis` enregistrée en base, aucun message, champ non marqué invalide |
| CT-7.5 | Destination `mailto:contact@exemple.fr`, puis `tel:+33123456789`, puis `/tarifs` | Chacune acceptée | OK — 2026-11-12 : `mailto:contact@exemple.fr`, `tel:+33123456789` puis `/tarifs` enregistrées tour à tour ; la base suit chacune (`maj_le` avance) |
| CT-7.6 | Destination `javascript:alert(1)` | Refusée **au champ**, message compréhensible ; rien de nouveau en base | OK — 2026-11-12 : « Cette destination n'est pas reconnue : utilisez une adresse web (commençant par https://), une adresse e-mail (mailto:), un numéro (tel:) ou un lien du site (commençant par /). » dans la carte, champ marqué invalide (`aria-invalid="true"`) ; base inchangée (`/tarifs`, même `maj_le`) |
| CT-7.7 | Destination `http://exemple.fr` (sans s), puis `ftp://exemple.fr` | Refusées au champ ; rien d'écrit | OK — 2026-11-12 : même message pour `http://exemple.fr` et `ftp://exemple.fr`, champ marqué invalide ; base inchangée (capture `CT-7.7-ftp.png`) |
| CT-7.8 | Page **Tarifs**, corriger son bouton | Seule Tarifs bascule à « brouillon » ; l'état d'Accueil ne change pas | OK — 2026-11-12 : prémisse vieillie : Tarifs avait déjà un brouillon (§ 19). Bouton de Tarifs corrigé (« Voir nos tarifs détaillés ») : seule la ligne `tarifs` change en base, celle d'Accueil garde son contenu et son `maj_le` ; Accueil et Tarifs « Brouillon », Contact sans |

## 8. Le lien de vidéo — `pages-et-emplacements`

Page **Accueil**, emplacement « lien de vidéo ».

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 800, console : aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-8.1 | Coller `https://www.youtube.com/watch?v=aqz-KE-bpKQ`, enregistrer | Accepté ; pastille brouillon ; persiste au rechargement | OK — 2026-11-12 : enregistré en base (`lien-video`), marque « Brouillon », retrouvé dans le champ après rechargement |
| CT-8.2 | Coller `https://youtu.be/aqz-KE-bpKQ` | Accepté | OK — 2026-11-12 : `https://youtu.be/aqz-KE-bpKQ` enregistré en base |
| CT-8.3 | Coller `https://vimeo.com/76979871` | Accepté | OK — 2026-11-12 : `https://vimeo.com/76979871` enregistré en base |
| CT-8.4 | Coller `https://exemple.com/video` | Refusé au champ, en disant **ce qui est attendu** (YouTube ou Vimeo) ; rien en base | OK — 2026-11-12 : « Ce lien n'est pas reconnu : collez un lien YouTube (par exemple https://www.youtube.com/watch?v=… ou https://youtu.be/…) ou Vimeo (par exemple https://vimeo.com/…). » ; base inchangée. Remarque inchangée : le champ n'est pas marqué invalide (`aria-invalid` absent), contrairement à celui du bouton d'action |
| CT-8.5 | Coller `http://www.youtube.com/watch?v=aqz-KE-bpKQ` (sans s) | Refusé | OK — 2026-11-12 : même message ; base inchangée |
| CT-8.6 | Coller `pas une url` | Refusé | OK — 2026-11-12 : même message ; base inchangée |
| CT-8.7 | Après un refus, l'état de la page | N'a pas basculé à cause du refus (une page sans autre brouillon reste sans pastille) | OK — 2026-11-12 : refus joué sur Contact, page sans brouillon : aucune marque dans l'éditeur ni sur « Mes pages », aucune ligne `contact` en base |

## 9. Le texte riche — `pages-et-emplacements`

Page **Contact**, emplacement « texte riche ».

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 800, gestes espacés de 300 ms, console : aucun message

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-9.1 | Lire la barre de mise en forme | Gras, italique, lien, liste, titre — et rien d'autre ; aucun bouton « HTML », « code », « source » | OK — 2026-11-12 : Gras, Italique, Lien, Liste, Titre, rien d'autre |
| CT-9.2 | Taper un paragraphe, sélectionner un mot, actionner **gras** puis **italique** | Les marques se posent visuellement, sans qu'aucune balise ne s'écrive dans le texte | OK — 2026-11-12 : « gourmand » sélectionné au clavier puis Gras et Italique : rendu gras (700) et italique (`<strong><em>`), aucune balise écrite dans le texte (capture `CT-9.2.png`) |
| CT-9.3 | Poser un **titre**, une **liste** à deux éléments | Rendus comme tels | OK — 2026-11-12 : titre « Nos horaires » (`<h2>`) et liste à deux puces Lundi, Mardi rendus comme tels (capture `CT-9.3.png`) |
| CT-9.4 | Poser un **lien** vers `https://exemple.fr` | Accepté | OK — 2026-11-12 : « atelier » lié à `https://exemple.fr` par le champ « Adresse du lien » puis « Appliquer le lien » |
| CT-9.5 | Poser un lien vers `javascript:alert(1)` | Refusé, sans terme de développeur | OK — 2026-11-12 : « Ce lien n'est pas accepté : il doit commencer par https://, mailto:, tel: ou /. », texte et lien existant inchangés (capture `CT-9.5.png`) |
| CT-9.6 | Enregistrer, recharger la page | Tout le contenu et toutes les marques sont retrouvés ; pastille brouillon ; en base le contenu est du Markdown (`**gras**`, `# Titre`, `- élément`), sans HTML | OK — 2026-11-12 : tout retrouvé après rechargement, marque « Brouillon » ; en base `Un [atelier](https://exemple.fr) **_gourmand_** au cœur du village.`, `## Nos horaires`, `- Lundi`, `- Mardi`, sans HTML |
| CT-9.7 | Coller depuis un traitement de texte un contenu avec couleur, police, tableau | Seules gras/italique/lien/liste/titre survivent après enregistrement + rechargement ; le reste est écarté | OK — 2026-11-12 : collage simulé (événement de collage portant le HTML d'un traitement de texte) : couleurs, polices, fond, taille, souligné, barré, code, image et structure du tableau écartés ; gras, italique, lien, liste et titre gardés après enregistrement et rechargement, Markdown sans HTML en base (capture `CT-9.7.png`). Remarques inchangées : les cellules se collent sans espace (« Case ACase BCase CCase D ») ; un titre collé garde le niveau 1 (`#`), que le bouton Titre ne pose jamais |

## 10. La bibliothèque — écran Médias — `bibliotheque-de-medias`

Bibliothèque vide au départ (`delete from medias`).

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146, serveur bâti depuis af0fdfe), à 1280 × 720 px, console : aucune violation CSP (seule la 404 de favicon.ico au premier chargement)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-10.1 | Ouvrir « Médias », bibliothèque vide | « La bibliothèque ne contient encore aucune image. » ; bouton « Téléverser une image » ; champ « Rechercher par nom ou description » | NA — 2026-11-12 : état vide hors d'atteinte : la bibliothèque part de 45 images publiées que l'écran réinscrit seul, et vider `medias` est exclu par la consigne. Le reste est conforme : titre « Médias », bouton « Téléverser une image », champ « Rechercher » d'indication « Rechercher par nom ou description ». Geste requis : une passe sur base vidée |
| CT-10.2 | Téléverser `photo.jpg` | Une vignette apparaît dans la grille ; en base : `nom_origine = photo.jpg`, `format` = JPEG, `largeur`/`hauteur` = les vraies dimensions, `poids_octets` | OK — 2026-11-12 : réponse 201 ; vignette en tête de grille, servie par `/admin/medias/<id>/octets`, avec la marque d'orphelin ; en base `nom_origine = photo.jpg`, `format = jpeg`, 1600 × 1067, `poids_octets = 23385` (le poids du fichier) |
| CT-10.3 | Téléverser `logo.png` puis `banniere.webp` | Trois vignettes ; formats PNG et WebP en base | OK — 2026-11-12 : deux 201 ; la grille passe de 46 à 48 vignettes (écart vieilli : la bibliothèque part de 45 images publiées, lu « trois vignettes de plus ») ; en base `png` 512 × 512 (12545 octets) et `webp` 1920 × 640 (6092 octets) |
| CT-10.4 | Téléverser `dessin.svg` | « Cette image n'est pas dans un format accepté (JPEG, PNG ou WebP) : choisissez une autre image. » ; rien en base | OK — 2026-11-12 : « Cette image n'est pas dans un format accepté (JPEG, PNG ou WebP) : choisissez une autre image. » ; réponse 400 `raison: format` ; base inchangée (48 lignes) |
| CT-10.5 | Téléverser `anim.gif` | Même refus de format | OK — 2026-11-12 : même message ; 400 `raison: format` ; base inchangée (48 lignes) |
| CT-10.6 | Téléverser `menteur.png` (un GIF renommé) | Refus de **format** — seuls les octets décident, pas l'extension | OK — 2026-11-12 : refus de format malgré l'extension `.png` : même message, 400 `raison: format` ; base inchangée |
| CT-10.7 | Téléverser `lourde.jpg` (> 2 Mo) | « Cette image est trop lourde : choisissez une image plus légère. » ; rien en base | OK — 2026-11-12 : « Cette image est trop lourde : choisissez une image plus légère. » ; 400 `raison: poids` (fichier de 6 117 991 octets) ; base inchangée |
| CT-10.8 | Téléverser `tronque.jpg` | Refusé proprement (format) ; rien en base ; l'écran reste utilisable | OK — 2026-11-12 : refus de format (400 `raison: format`, même message) ; base inchangée (48 lignes) ; le téléversement suivant (CT-10.9) passe et efface le message de refus |
| CT-10.9 | Téléverser `jpeg-deguise.png` (un vrai JPEG renommé) | **Admis** ; en base `format` = JPEG, pas PNG | OK — 2026-11-12 : admis (201) ; en base `format = jpeg`, 1600 × 1067, 23385 octets ; servi en `image/jpeg` (CT-12.2) |
| CT-10.10 | Recharger l'écran | Toutes les vignettes sont là ; l'ordre est stable | OK — 2026-11-12 : 49 vignettes (45 publiées + 4), la plus récente en tête (jpeg-deguise.png, banniere.webp, logo.png, photo.jpg, puis les publiées) ; ordre identique sur cinq rechargements (même empreinte de la liste) |
| CT-10.11 | Rechercher « logo » | La grille ne montre que `logo.png` | OK — 2026-11-12 : une seule vignette, `logo.png` |
| CT-10.12 | Rechercher « zzz » | « Aucune image ne correspond à cette recherche. » — texte **différent** de CT-10.1 ; effacer la recherche rend toutes les images | OK — 2026-11-12 : « Aucune image ne correspond à cette recherche. », aucune vignette ; effacer la recherche rend les 49 images |
| CT-10.13 | Donner une description à `photo.jpg` (§ 11), puis rechercher un mot de cette description | `photo.jpg` est trouvée par sa description | OK — 2026-11-12 : « devanture » et « printemps », mots de la description saisie en CT-11.4 et 11.5, ne laissent que « Façade de l'atelier » |
| CT-10.14 | Console et onglet Réseau pendant le § 10 | Aucune violation CSP ; les vignettes sont servies depuis `/admin/medias/<id>/octets` | OK — 2026-11-12 : console sans violation CSP (0 message après rechargement, seule la 404 de `favicon.ico` au premier chargement) ; les 4 images téléversées viennent de `/admin/medias/<id>/octets`, les 45 publiées de `/_astro/…` ; aucune vignette cassée ni restée sans charger après défilement |

## 11. La fiche d'une image — `bibliotheque-de-medias`

Cliquer la vignette de `photo.jpg`.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720 px, console : aucune violation CSP (0 message)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-11.1 | Lire la fiche | Aperçu de l'image ; champ « Nom » ; champ « Description » ; bouton « Enregistrer » ; lien de retour « Médias » ; titre « Posée dans » | OK — 2026-11-12 : aperçu chargé (1600 px, servi par `/octets`), champs « Nom » et « Description » avec chacun son bouton « Enregistrer », lien « ‹ Médias », titre « Posée dans », bouton « Supprimer… » |
| CT-11.2 | Renommer en « Façade de l'atelier », enregistrer | Le nom affiché change dans la fiche et dans la grille ; en base `nom_affichage` = le nouveau nom et `nom_origine` = **toujours** `photo.jpg` | OK — 2026-11-12 : `…/renommer` 200 ; titre de la fiche « Façade de l'atelier », et la vignette de la grille porte ce nom (texte de remplacement ; la grille n'affiche pas de légende) ; en base `nom_affichage = Façade de l'atelier`, `nom_origine = photo.jpg` |
| CT-11.3 | Vider le nom, enregistrer | « Le nom ne peut pas être vide. » ; rien d'écrit | OK — 2026-11-12 : « Le nom ne peut pas être vide. » sous le champ ; aucun envoi au serveur ; en base le nom reste « Façade de l'atelier » |
| CT-11.4 | Saisir la description « Vue de la rue, printemps 2026 », enregistrer, recharger | Retrouvée ; en base `description` renseignée | OK — 2026-11-12 : `…/decrire` 200 ; retrouvée après rechargement ; en base `description = Vue de la rue, printemps 2026` |
| CT-11.5 | Modifier la description, enregistrer | La nouvelle remplace l'ancienne | OK — 2026-11-12 : « Vue de la rue au printemps, devanture repeinte » remplace l'ancienne (200), à l'écran après rechargement et en base |
| CT-11.6 | Section « Posée dans » d'une image posée nulle part | « Cette image n'est posée dans aucun emplacement. » | OK — 2026-11-12 : « Cette image n'est posée dans aucun emplacement. » sous « Posée dans » |
| CT-11.7 | Marque d'orphelin sur une image posée nulle part | Sur la **fiche** et sur la **vignette** : « Cette image n'est posée dans aucun emplacement : elle sera effacée à la prochaine publication. » | OK — 2026-11-12 : « Cette image n'est posée dans aucun emplacement : elle sera effacée à la prochaine publication. » sur la fiche (alerte sous le titre) et sur la vignette de la grille ; dans la grille, seules les 4 images téléversées la portent, aucune des 45 publiées |

## 12. Servir les octets — `bibliotheque-de-medias`

Relever l'identité d'une image (`select id …`, § 0.5) ; noter `<id>`.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720 px, console : aucune violation CSP (seule l'entrée 404 de la page d'erreur du navigateur pour CT-12.4)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-12.1 | Avec session, ouvrir `/admin/medias/<id>/octets` ; onglet Réseau | L'image s'affiche ; `Content-Type: image/jpeg` (ou png/webp selon le vrai format) ; `X-Content-Type-Options: nosniff` | OK — 2026-11-12 : `photo.jpg` : 200, `image/jpeg`, `nosniff`, 23385 octets, affichée (1600 × 1067) ; `logo.png` en `image/png` (512 × 512) et `banniere.webp` en `image/webp` (1920 × 640), tous deux `nosniff` |
| CT-12.2 | Même URL sur `jpeg-deguise.png` | `Content-Type: image/jpeg` — jamais `image/png` | OK — 2026-11-12 : `jpeg-deguise.png` servie en `image/jpeg`, `nosniff`, 23385 octets, affichée en 1600 × 1067 |
| CT-12.3 | Même URL en **fenêtre privée** (sans session) | Aucun octet : renvoi vers la connexion ou refus | OK — 2026-11-12 : second navigateur sans aucun cookie : 401, corps vide, sans renvoi ; le navigateur montre sa page d'erreur, aucun octet de l'image |
| CT-12.4 | `/admin/medias/inexistant/octets` avec session | Refus propre, rien de l'administration ne fuit | OK — 2026-11-12 : `/admin/medias/inexistant/octets` avec session : 404, corps vide, aucun type de contenu, `nosniff` |

## 13. Poser et remplacer une image — `pages-et-emplacements`

Page **Accueil**, emplacement **image**. `.wrangler/tmp/email` et l'onglet Réseau restent ouverts.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720 px, console : aucune violation CSP (0 message)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-13.1 | Ouvrir le sélecteur d'image | Il présente les images de la bibliothèque, par leur **nom d'affichage** (« Façade de l'atelier », pas `photo.jpg` ni un identifiant) | OK — 2026-11-12 : prémisse vieillie, la carte Image d'Accueil porte déjà `X-01.jpg` : sélecteur ouvert par « Remplacer l'image ». La sur-couche « Choisir une image » présente les 49 images, chacune nommée par son nom d'affichage (« Poser l'image Façade de l'atelier »), jamais `photo.jpg` ni un identifiant ; aucune vignette cassée |
| CT-13.2 | Choisir « Façade de l'atelier » | L'emplacement montre l'image ; pastille brouillon ; **aucun** téléversement dans l'onglet Réseau ; en base, le brouillon de l'emplacement porte l'`id` de l'image | OK — 2026-11-12 : la sur-couche se ferme, la carte montre « Façade de l'atelier » servie par `/octets` (1600 px) ; un seul envoi, `…/emplacements/image-hero` (200), aucun téléversement ; en base `mediaId` = l'identité de l'image. Marque « Brouillon » présente au titre, mais elle l'était déjà (brouillon de texte laissé par l'agent `pages`) : son apparition ne se constate pas ici |
| CT-13.3 | Remplacer par `logo.png` | La nouvelle image est montrée à la place ; le brouillon porte le nouvel `id` et plus l'ancien | OK — 2026-11-12 : `logo.png` montrée à la place ; en base `mediaId` = celle de `logo.png`, plus l'ancienne |
| CT-13.4 | Recharger l'éditeur | L'image posée est retrouvée | OK — 2026-11-12 : `logo.png` retrouvée après rechargement, vignette chargée (512 px) |
| CT-13.5 | Fiche de `logo.png` → « Posée dans » | « Accueil — image » (titre de page + nature en français, **pas** `image-hero`) | OK — 2026-11-12 : fiche de `logo.png` : « Posée dans » → « Accueil — image » |
| CT-13.6 | Vignette et fiche de `logo.png` | La marque d'orphelin a **disparu** ; celle de « Façade de l'atelier » (plus posée nulle part) est **revenue** | OK — 2026-11-12 : plus de marque d'orphelin sur la fiche ni sur la vignette de `logo.png` ; marque revenue sur « Façade de l'atelier », fiche (« Cette image n'est posée dans aucun emplacement. ») et vignette |
| CT-13.7 | Sélecteur d'image sur une bibliothèque vidée (`delete from medias`, après le § 14) | État vide compréhensible, sans terme de développeur | NA — 2026-11-12 : même raison que CT-10.1 : la bibliothèque ne peut pas être vidée (45 images publiées réinscrites, `medias` à ne pas vider). Geste requis : une passe sur base vidée |

## 14. Composer une galerie ou un carrousel — `pages-et-emplacements`

Page **Accueil**, emplacement **galerie** ; puis page **Contact**, emplacement **carrousel**.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720 px, bibliothèque semée de 12 images (61 en tout), console : aucune violation CSP (0 message)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-14.1 | Poser trois images dans la galerie, dans l'ordre A, B, C | La galerie montre A, B, C dans cet ordre ; pastille brouillon ; en base l'ordre est celui choisi | OK — 2026-11-12 : prémisse vieillie, la galerie porte 44 images publiées. A, B, C = `banniere.webp`, `jpeg-deguise.png`, « Façade de l'atelier », ajoutées par « Ajouter une image » à la suite des 44 ; « 47 images composent cette galerie. » ; en base, positions 45 à 47 dans cet ordre. Marque « Brouillon » au titre, déjà présente avant (brouillon de texte de l'agent `pages`) |
| CT-14.2 | Réordonner en C, A, B | L'ordre est mis à jour, persiste au rechargement | OK — 2026-11-12 : C, A, B après deux « Monter » sur C, à l'écran, en base et après rechargement |
| CT-14.3 | Retirer B | La galerie montre C, A ; B reste dans la bibliothèque | OK — 2026-11-12 : « Retirer » sur B : C, A ; « 46 images composent cette galerie. » ; B toujours dans la bibliothèque (ligne en base) |
| CT-14.4 | Recharger l'éditeur | C, A retrouvés | OK — 2026-11-12 : C, A retrouvés après rechargement, compte 46 |
| CT-14.5 | Fiche de A → « Posée dans » | « Accueil — galerie » | OK — 2026-11-12 : fiche de A (`banniere.webp`) : « Posée dans » → « Accueil — galerie » (l'emplacement n'a pas de nom chez l'intégrateur) |
| CT-14.6 | Même parcours sur le **carrousel** de Contact | Identique | OK — 2026-11-12 : carrousel vide au départ (« Aucune image ne compose ce carrousel. ») ; A, B, C (« 1 image compose ce carrousel. », 2, 3), puis C, A, B, puis C, A (« 2 images composent ce carrousel. »), retrouvés au rechargement et en base |
| CT-14.7 | Poser A dans le carrousel de Contact alors qu'elle est déjà dans la galerie d'Accueil | Accepté ; sa fiche liste **les deux** emplacements, chacun par sa page et sa nature | OK — 2026-11-12 : A acceptée dans le carrousel alors qu'elle était dans la galerie ; sa fiche : « Accueil — galerie » puis « Contact — carrousel » |
| CT-14.8 | Pendant le § 14, la liste des pages | Accueil et Contact portent la pastille ; Tarifs n'a pas bougé (hors CT-7.8) | OK — 2026-11-12 : « Mes pages » : Accueil et Contact portent « Brouillon » ; Tarifs aussi, mais par son brouillon de bouton laissé par l'agent `pages`, pas par ce § : en base, les seuls brouillons d'image sont `accueil` (image, galerie) et `contact` (carrousel), aucun sur Tarifs |

> Rang parmi plusieurs emplacements de même nature (« 1re galerie », « 2e galerie ») : aucune page
> de démonstration n'en a deux. Pour le tester, ajouter temporairement un second emplacement
> `"nature": "galerie"` à `content/pages/accueil/page.json`, rebâtir et relancer `wrangler dev`.

## 15. Supprimer une image partout — `bibliotheque-de-medias`

État de départ attendu : A posée dans la galerie d'Accueil **et** dans le carrousel de Contact ;
Tarifs sans image.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720 px, console : aucune violation CSP (0 message)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-15.1 | Fiche de A → « Supprimer… » | Une confirmation « Supprimer « A » ? » présente **d'abord** « Elle est posée dans : » suivi de la liste (Accueil — galerie, Contact — carrousel) ; boutons « Annuler » / « Supprimer » ; **rien n'est encore appliqué** | OK — 2026-11-12 : sur A (`banniere.webp`) : « Supprimer « banniere.webp » ? », puis « Elle est posée dans : » Accueil — galerie, Contact — carrousel ; boutons « Annuler » et « Supprimer » (plus une croix de fermeture nommée « Annuler ») ; aucun envoi à l'ouverture |
| CT-15.2 | « Annuler » | Rien ne change : A toujours posée aux deux endroits | OK — 2026-11-12 : « Annuler » ferme la confirmation ; aucun envoi ; empreinte des brouillons (date et longueur de chaque ligne) identique avant et après ; la fiche liste toujours les deux emplacements |
| CT-15.3 | « Supprimer… » puis « Supprimer » | A est retirée de la galerie d'Accueil **et** du carrousel de Contact ; leurs brouillons sont mis à jour en base ; Accueil et Contact portent la pastille ; Tarifs non | OK — 2026-11-12 : un envoi `…/supprimer` (200 `{"ok":true}`) ; seules deux lignes de brouillon changent : la galerie d'Accueil (45 images : les 44 publiées puis C) et le carrousel de Contact (C seule) ; Accueil et Contact portent « Brouillon » ; Tarifs aussi, mais par son brouillon de bouton antérieur (agent `pages`), sa ligne en base n'a pas bougé |
| CT-15.4 | Fiche de A après suppression | « Cette image n'est posée dans aucun emplacement. » + marque « sera effacée à la prochaine publication » ; A **reste** dans la grille (l'effacement réel attend la publication) | OK — 2026-11-12 : fiche de A : alerte « Cette image n'est posée dans aucun emplacement : elle sera effacée à la prochaine publication. » et « Cette image n'est posée dans aucun emplacement. » ; A reste dans la grille, avec la même marque |
| CT-15.5 | Ouvrir l'éditeur d'Accueil et de Contact | Aucun emplacement ne montre d'image cassée ni d'identifiant ; l'ordre des autres images de la galerie est conservé | OK — 2026-11-12 : éditeur d'Accueil : 46 images (l'image posée et 45 dans la galerie), 0 cassée, les 44 publiées dans l'ordre X-01 à X-45 puis C ; éditeur de Contact : 2 images (image et carrousel), 0 cassée, « 1 image compose ce carrousel. » ; aucun identifiant dans le texte des deux écrans |
| CT-15.6 | « Supprimer… » sur une image posée nulle part | La confirmation dit « Cette image n'est posée dans aucun emplacement. » ; confirmer ne touche aucun brouillon (aucune nouvelle pastille, aucune ligne modifiée en base) | OK — 2026-11-12 : sur B (`jpeg-deguise.png`) : « Supprimer « jpeg-deguise.png » ? » puis « Cette image n'est posée dans aucun emplacement. » ; confirmer envoie `…/supprimer` (200) ; empreinte de tous les brouillons identique avant et après, aucune pastille nouvelle dans « Mes pages » |

## 16. Écritures forgées depuis une autre origine — `pages-et-emplacements`

Session ouverte dans le navigateur. Dans un autre dossier :

```sh
cat > forge.html <<'EOF'
<button id="go">go</button>
<script>
document.getElementById('go').onclick = () =>
  fetch('http://127.0.0.1:8787/admin/pages/tarifs/emplacements/bouton-devis', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ libelle: 'FORGÉ', destination: '/contact' }),
  }).then(r => console.log('statut', r.status), e => console.log('refusé', e));
</script>
EOF
python3 -m http.server 8080
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, page forgée servie par `python3 -m http.server 8091`, à 1280 × 720, console : erreurs CORS attendues de la page forgée, aucune violation CSP

La page forgée est servie par `python3 -m http.server 8091` (le port 8080 est pris sur la machine, par un autre service) et vise `https://colibri.sebc.dev` au lieu de `http://127.0.0.1:8787`.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-16.1 | Ouvrir `http://localhost:8080/forge.html`, cliquer « go », lire la console | La requête n'aboutit pas (erreur réseau/CORS **ou** statut de refus) : le cookie `SameSite=Strict` n'est pas joint ; le bouton de Tarifs n'a **pas** changé ; rien de nouveau en base | OK — 2026-11-12 : depuis `http://localhost:8091/forge.html`, « go » est bloqué par le navigateur (« blocked by CORS policy: Response to preflight request doesn't pass access control check », puis « refusé TypeError: Failed to fetch ») ; le bouton de Tarifs reste « Voir nos tarifs détaillés » et aucun brouillon de ce bouton n'est en base. Hors navigateur, la même requête JSON avec le cookie de session et `Origin: http://localhost:8091` est acceptée (200, `{"ok":true,"porteUnBrouillon":true}`) : la route ne contrôle pas l'origine, la défense est le seul `SameSite=Strict` (ADR-0011) ; ce brouillon « FORGÉ » a été effacé aussitôt |
| CT-16.2 | Même page, remplacer l'URL par `/admin/medias/televerser` et le corps par un `FormData` portant `photo.jpg` | Refus ; rien en base | OK — 2026-11-12 : l'envoi d'un `FormData` portant `photo.jpg` vers `/admin/medias/televerser` part sans cookie et sa réponse est bloquée (CORS, « Failed to fetch ») ; base inchangée (51 images). Rejoué hors navigateur avec `Origin: http://localhost:8091` : refus 403 avec le cookie de session comme sans lui |

## 17. Site public — `socle-ilots-admin`

Joué le 2026-11-12 sur https://colibri.sebc.dev et sur un build local de `9db5146`, à 1280 × 720, console : vide sur les trois pages publiques

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-17.1 | `npm run build`, puis inspecter `dist/` | Aucun fichier de page publique ne référence un composant de `src/admin` ni une feuille Tailwind (`grep -rlE "tailwind\|/admin/" dist/` hors du dossier admin doit être vide) | OK — 2026-11-12 : `npm run build` local du HEAD `9db5146`. La commande du cahier, hors des dossiers admin, remonte des modules du serveur (`dist/server/…`) et 3 fichiers de `dist/client/_astro/` : le script de « Mes pages », `monter.eWmcJigN.js` et `Gabarit.6xkinp-1.css`, tous de l'administration. Aucune page publique ne les référence : `index.html`, `tarifs/`, `contact/` et `404.html` ne chargent que `site.DX_-667i.css` et, pour Tarifs et Contact, le script du formulaire public, tous deux sans « tailwind » ni « /admin/ » |
| CT-17.2 | Ouvrir `http://127.0.0.1:8787/` | Aucune route serveur ne répond hors `/admin/` (le site public reste statique ; une 404 propre est acceptable tant qu'aucune page publique n'est livrée) | OK — 2026-11-12 : accueil, Tarifs et Contact servis comme fichiers fixes (200, `etag`, aucun `set-cookie`, CSP stricte `default-src 'none'; script-src 'self'…`, console vide) ; une adresse inconnue rend la 404 bâtie (« Page introuvable ») ; POST sur `/` : 405 |

## 18. La connexion habillée — change 005 · ticket 06

Livré par la PR **#116** sans ces vérifications : elles sont reportées à cette recette, en fin de
mise en page. Une fois #116 fusionnée, la mise en route du § 0.2 suffit ; avant, servir le build de
la branche `impl/connexion-habillee-06`. Pour le vrai téléphone, l'instance exposée doit servir ce
build. Les tests automatiques couvrent déjà la structure (SC-06a à
SC-06e) ; ce § vise ce qu'ils ne voient pas : largeur, zones de toucher, contrastes, clavier.

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), au navigateur piloté, à 1280 px puis 360 × 740 px, sans session puis par le vrai parcours (code lu dans Gmail), mesures calculées dans la page ; console : aucune violation CSP (seul message : un avertissement du canevas de mon propre script de mesure)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-18.1 | À 1280 px de large, sans session, ouvrir `/admin/connexion` | Une carte centrée (400 px de large au plus) sur le fond neutre chaud ; logo et titre « Connexion » en tête ; deux étapes séparées par un trait : recevoir un code (libellé « Adresse », bouton « Recevoir un code »), puis saisir le code (durée de validité, libellé « Code », bouton « Se connecter ») | OK — 2026-11-12 : 1280 px sans session : carte blanche de 400 px centrée (440 px de chaque côté) sur fond neutre chaud rgb(247,246,241) ; logo puis « Connexion » ; étape 1 (« Adresse », « Recevoir un code »), trait de 1 px rgb(225,223,214), étape 2 (durée « quinze minutes », « Code », « Se connecter ») ; capture `CT-18.1-carte-1280.png` |
| CT-18.2 | Outils → Éléments → onglet *Calculé*, sur le titre puis sur un libellé ; onglet Réseau, filtre *Police* | Titre en **Fraunces**, texte en **Instrument Sans** ; les polices viennent de la même origine (aucune requête vers un domaine tiers) | OK — 2026-11-12 : titre en Fraunces 600, libellés en Instrument Sans 500, phrases en Instrument Sans 400 ; polices servies par l'origine (`/_astro/…woff2`), aucune ressource hors origine |
| CT-18.3 | Regarder les deux boutons ; comparer les textes avec § 2 et § 3 | Les deux boutons portent la couleur principale (plumage) ; aucun texte n'a changé : mêmes libellés, même durée de validité, mêmes messages de refus et de plafond | OK — 2026-11-12 : « Recevoir un code » et « Se connecter » en plumage rgb(14,107,85), texte blanc ; durée, phrase « seul le dernier code demandé depuis cet appareil », refus et message de plafond identiques aux §§ 2 et 3 |
| CT-18.4 | Mode appareil à **360 px** de large (360 × 740), état initial ; dans la console : `document.documentElement.scrollWidth` | Valeur **≤ 360** ; aucun défilement horizontal ; la carte occupe toute la largeur moins 16 px de chaque côté ; aucun texte ni champ coupé (SC-06f) | OK — 2026-11-12 : 360 × 740, état initial : `scrollWidth` 360, carte de 328 px à 16 px de chaque bord, aucun élément ne dépasse ni n'est coupé |
| CT-18.5 | Toujours à 360 px : saisir un code faux (état « code refusé »), puis déclencher le plafond (CT-2.8) | Dans les deux états, `scrollWidth` ≤ 360 et rien n'est coupé ; le message de refus et le message d'attente passent à la ligne sans déborder (SC-06f) | OK — 2026-11-12 : 360 px, état « code refusé » (vrai code demandé, code faux saisi) puis plafond (quatre codes de l'heure ajoutés en base, adresse soumise, lignes retirées ensuite) : `scrollWidth` 360 dans les deux états, messages passés à la ligne (62 et 106 px de haut), rien ne dépasse ; captures `CT-18.5-refus-360.png`, `CT-18.9-plafond-360.png` |
| CT-18.6 | À 360 px, dans la console : ``[...document.querySelectorAll('button,input')].map(e => { const r = e.getBoundingClientRect(); return [e.name \|\| e.textContent.trim(), Math.round(r.width), Math.round(r.height)] })`` | Les deux champs et les deux boutons mesurent chacun **au moins 44 × 44 px** (SC-06g) | OK — 2026-11-12 : 360 px : champ d'adresse, « Recevoir un code », champ de code, « Se connecter » à 296 × 44 px chacun |
| CT-18.7 | Outils → Éléments → sélecteur de couleur (ou Lighthouse → Accessibilité) sur le titre, les deux phrases d'étape, les libellés, le texte des champs et des boutons | Chaque texte atteint un contraste d'**au moins 4,5:1** sur son fond (SC-06h) | OK — 2026-11-12 : titre, phrases d'étape, libellés, texte des champs et lien de reprise rgb(23,32,28) sur blanc, 16,67:1 ; texte des boutons blanc sur plumage, 6,46:1 |
| CT-18.8 | Code faux : mesurer le contraste du message de refus | Message en rouge (danger), placé sous l'étape de code, au-dessus du champ ; contraste **≥ 4,5:1** sur son fond (SC-06d, SC-06h) | OK — 2026-11-12 : refus encadré en rouge, texte rendu rgb(187,57,47) sur blanc, 5,62:1, sous la phrase de l'étape de code et au-dessus du champ « Code » |
| CT-18.9 | Plafond atteint (CT-2.8) : lire la carte et mesurer le contraste du message d'attente | La carte ne montre **que** le message d'attente, sur fond ambre, sans champ ni bouton ; contraste **≥ 4,5:1** sur son fond ambre (SC-06b, SC-06h) | OK — 2026-11-12 : plafond : la carte ne montre que « Connexion » et « Trop de demandes de connexion ont déjà été envoyées récemment. Merci de patienter un moment avant de réessayer. », aucun champ ni bouton ; texte rgb(138,90,0) sur ambre rgb(252,239,210), 5,2:1 |
| CT-18.10 | Sur un **vrai téléphone** (iPhone et Android si possible) : toucher le champ d'adresse, puis le champ de code | Le champ d'adresse ouvre le clavier d'e-mail (touche `@`) ; le champ de code propose le code reçu en suggestion quand l'appareil sait le faire — NA si le code n'arrive pas sur le téléphone, puisqu'en local aucun e-mail ne part (SC-06c) | OK — 2026-11-13, joué par l'opérateur sur son téléphone Android (Chrome, clavier Gboard) : le clavier du champ « Adresse » montre la touche `@` ; après « Recevoir un code », le clavier du champ « Code » propose le code une fois celui-ci copié depuis le message. Remarque : la veille à 00:22 (heure de Paris), sur le même téléphone, le clavier du champ « Adresse » s'était ouvert en disposition ordinaire, sans `@` (capture de l'opérateur) ; non reproduit le lendemain, cause non établie. Deux demandes de code faites alors depuis le téléphone n'ont créé aucun code : l'adresse se compare à la lettre près, majuscules comprises (`src/platform/auth/magasin.ts`), et un clavier ordinaire met une majuscule en tête de saisie — hypothèse non vérifiée. iPhone non essayé |

Mesure de contraste : dans Chrome, cliquer la pastille de couleur d'une propriété `color` dans
l'onglet Styles ; le rapport s'affiche avec ses seuils AA/AAA. Firefox : outil *Accessibilité* →
« Vérifier les problèmes » → Contraste.

## 19. La marque de brouillon — change 005 · ticket 05

Livré par la PR **#120** sans cette vérification : elle est reportée à cette recette, en fin de
mise en page. Avant la fusion, servir le build de la branche `impl/marque-de-brouillon-05`. Les
tests automatiques couvrent déjà la marque rendue par le serveur et le modèle servi (SC-05a, SC-05c,
la moitié de SC-05b) ; ce § vise ce qu'ils ne voient pas : la marque ajoutée par le navigateur,
sans recharger, après un enregistrement (SC-05b). Partir d'une base remise à zéro (§ 0.6), console
ouverte.

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146, serveur bâti depuis af0fdfe), à 1280 × 720, base sans aucun brouillon de page, console : aucun message hors la 404 de favicon.ico au premier chargement

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-19.1 | Ouvrir « Mes pages » | Aucune ligne ne porte de marque « Brouillon » | OK — 2026-11-12 : base sans aucun brouillon de page (table vide) : « Mes pages » sans aucune marque, `[data-pastille-brouillon]` = 0 |
| CT-19.2 | Ouvrir **Tarifs** (sans brouillon) ; corriger le texte du bouton d'action et enregistrer, **sans recharger** | Une marque apparaît à côté du titre : libellé écrit « Brouillon », point devant, texte rubis sur fond rubis pâle, forme de pastille ; aucune violation CSP dans la console (SC-05b) | OK — 2026-11-12 : libellé du bouton de Tarifs corrigé en « Demander un devis gratuit », enregistré sans recharger : marque « Brouillon » à droite du titre, point de 6 × 6 px, texte rubis rgb(180,35,90) sur rubis pâle rgb(251,227,236), pastille à bords pleinement arrondis, Instrument Sans 12 px ; console vide (capture `CT-19.2-marque.png`) |
| CT-19.3 | Sans recharger, enregistrer une seconde correction ; dans la console : `document.querySelectorAll('[data-pastille-brouillon]').length` | Toujours **une seule** marque à l'écran ; la console renvoie **1** (SC-05b) | OK — 2026-11-12 : seconde correction « Demander nos tarifs détaillés » enregistrée (lue en base) : `[data-pastille-brouillon]` = 1 |
| CT-19.4 | Recharger l'éditeur de Tarifs ; comparer avec la marque vue en CT-19.2 | Marque visuellement identique : même libellé, même point, mêmes couleurs, même taille, même place (SC-05b) | OK — 2026-11-12 : après rechargement, marque identique à celle ajoutée sans recharger : même balisage, même place (507 ; 151), même taille 75,7 × 20 px, mêmes couleurs et police (capture `CT-19.4-recharge.png`) |
| CT-19.5 | Revenir à « Mes pages » | La ligne Tarifs porte la même marque que le titre de son éditeur (SC-05a) | OK — 2026-11-12 : la ligne Tarifs porte une marque au balisage identique à celle de l'éditeur ; Accueil et Contact n'en portent pas |
| CT-19.6 | Parcourir « Mes pages », l'éditeur, Médias et la fiche d'une image | Aucun bouton ni lien n'est rubis : cette couleur ne paraît que dans la marque (SC-05c) | OK — 2026-11-12 : aucun élément hors de la marque en rubis ni rubis pâle (texte, fond, bords, contour) sur « Mes pages », les éditeurs d'Accueil, Tarifs et Contact, Médias et la fiche de l'image X-07.jpg. Remarque : la bibliothèque était vide au départ ; ouvrir Médias y a réinscrit les 45 images publiées (comportement prévu après une remise à zéro), d'où la fiche disponible |

---

## 20. « Mes pages » habillé — change 005 · ticket 07

Livré sans ces vérifications : elles sont reportées à cette recette, en fin de mise en page. Avant
la fusion, servir le build de la branche `impl/mes-pages-habille-07`. Les tests automatiques
couvrent déjà le balisage : ordre des lignes, adresse sous le titre en `font-mono`, `<h1>` et
`<li>` sans attribut, fond `bg-card`, aucune couleur littérale (SC-07a, moitié balisage de SC-07b
et SC-07c) ; ce § vise ce qu'ils ne voient pas : polices réellement rendues, largeur, zones de
toucher, contrastes. Partir d'une base remise à zéro (§ 0.6), session ouverte.

Joué le 2026-11-12 sur https://colibri.sebc.dev et les variantes `titres-longs` et `vide` du site factice, à 1280 × 720 puis 360 × 740, console : seule la 404 de favicon.ico au premier chargement de chaque hôte

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-20.1 | À 1280 px de large, ouvrir « Mes pages » | Sous le titre, une carte sur le fond neutre chaud (ni blanc pur ni gris froid) ; une ligne par page dans l'ordre Accueil, Tarifs, Contact, séparées par un filet ; sous chaque titre, son adresse : `/`, `/tarifs`, `/contact` (SC-07a, SC-07c) | OK — 2026-11-12 : 1280 px : carte blanche bordée (1 px rgb(225,223,214), sans ombre) sur fond neutre chaud rgb(247,246,241) ; Accueil, Tarifs, Contact dans l'ordre, filets de 1 px entre les lignes ; adresses /, /tarifs, /contact sous les titres (capture `CT-20.1-mes-pages-1280.png`) |
| CT-20.2 | Outils → Éléments → onglet *Calculé* (ou *Polices affichées*) sur le titre « Mes pages », sur le titre d'une ligne, puis sur une adresse ; dans la console : `[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family)` | Titre de l'écran en **Fraunces**, texte des lignes en **Instrument Sans**, adresse en **JetBrains Mono** ; les trois familles figurent parmi les polices chargées (SC-07b, SC-07c) | OK — 2026-11-12 : titre « Mes pages » en Fraunces, titres des lignes en Instrument Sans, adresses en JetBrains Mono ; polices chargées : Fraunces, Instrument Sans, JetBrains Mono |
| CT-20.3 | Corriger un emplacement de **Tarifs** et enregistrer, puis revenir à « Mes pages » | La ligne Tarifs porte la marque « Brouillon » (§ 19), sur la ligne de l'adresse, sans décaler le titre ; cliquer n'importe où sur la ligne ouvre l'éditeur de Tarifs | OK — 2026-11-12 : bouton de Tarifs corrigé (« Demander un devis personnalisé », lu en base) : la marque est sur la ligne de l'adresse, à droite de /tarifs ; titre au même décalage (13 px) et ligne de même hauteur (77 px) qu'Accueil ; un clic à 4 px du bord droit de la ligne ouvre l'éditeur de Tarifs |
| CT-20.4 | Mode appareil à **360 px** de large (360 × 740), avec le brouillon de CT-20.3 ; dans la console : `document.documentElement.scrollWidth` | Valeur **≤ 360** ; aucun défilement horizontal ; titre, adresse et marque de brouillon ne sont pas coupés ; la marque passe sous le titre (SC-07d, SC-07e) | OK — 2026-11-12 : 360 × 740 : `scrollWidth` 360, aucun élément hors de l'écran ; titre, adresse et marque entiers, la marque sous le titre, sur la ligne de l'adresse (capture `CT-20.4-mes-pages-360.png`) |
| CT-20.5 | Titre long : dans `content/pages/tarifs/page.json`, remplacer `"titre": "Tarifs"` par un titre de 80 caractères sans espace (ex. `TarifsDesPrestationsDeMariageEtDeReceptionPourLesGrandesOccasionsDeLaSaisonDEte`), puis un titre de 120 caractères avec espaces ; rebâtir et servir (§ 0.2), ouvrir « Mes pages » à 360 px ; **à la fin, `git restore content/pages` et rebâtir** | Dans les deux cas, `scrollWidth` ≤ 360 ; le titre passe à la ligne sans déborder de la carte, rien n'est coupé ; l'adresse reste lisible sous le titre (SC-07d) | OK — 2026-11-12 : variante `titres-longs` à 360 px : Accueil à 120 signes avec espaces et Tarifs à 80 signes sans espace ; `scrollWidth` 360, titres passés à la ligne dans la carte (lignes de 143 et 121 px, aucun débordement), adresses lisibles dessous, marque de Tarifs à côté de son adresse (capture `CT-20.5-titres-longs-360.png`) |
| CT-20.6 | À 360 px, dans la console : ``[...document.querySelectorAll('#liste-des-pages > li, a, button')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)] })`` | Chaque ligne de la liste et chaque lien ou bouton de l'écran mesure **au moins 44 × 44 px** (SC-07e) | OK — 2026-11-12 : 360 px : les trois lignes à 294 × 77, 77 et 76 px ; bouton du menu 44 × 44 ; « Publier » 72 × 44 ; les liens du menu replié ne sont pas affichés |
| CT-20.7 | Sélecteur de couleur (onglet Styles) ou Lighthouse → Accessibilité, sur : le titre de l'écran, le titre d'une ligne, une adresse, la marque « Brouillon » | Chaque texte atteint **≥ 4,5:1** sur son fond ; l'adresse, en texte atténué, aussi (SC-07f) | OK — 2026-11-12 : titre 15,41:1 ; titre de ligne 16,67:1 ; adresse en texte atténué rgb(91,100,95) 6,12:1 ; marque « Brouillon » 5,2:1 |
| CT-20.8 | Liste vide : déplacer temporairement les trois dossiers de `content/pages/` hors du dépôt, rebâtir et servir, ouvrir « Mes pages » à 1280 px puis à 360 px ; mesurer le contraste du message ; **à la fin, remettre les dossiers en place (`git status` propre) et rebâtir** | Le message « Aucune page n'est disponible pour le moment : il n'y a rien à modifier ici. » s'affiche **dans la carte**, en texte atténué, inchangé ; contraste **≥ 4,5:1** ; à 360 px, `scrollWidth` ≤ 360 (SC-07d, SC-07f) | OK — 2026-11-12 : variante `vide` : « Aucune page n’est disponible pour le moment : il n’y a rien à modifier ici. » dans la carte blanche bordée, en texte atténué, 6,12:1 ; `scrollWidth` 1280 puis 360 ; aucun lien ni bouton dans la zone principale (captures `CT-20.8-vide-1280.png`, `CT-20.8-vide-360.png`). Remarque : sur les variantes, la pastille du cadre dit « La dernière mise en ligne n'a pas abouti » (« Site à jour » sur le principal) |

---

## 21. L'éditeur habillé, emplacements de texte — change 005 · ticket 08

Livré par la PR **#122** : le run a mesuré ces points sur l'artefact bâti, ce § les rejoue à la main. Avant la fusion, servir le build de la branche `impl/editeur-emplacements-texte-08`. Aucun test automatique ne voit le rendu de l'éditeur (ni feuille, ni CSP dans `workerd`). **SC-08a reste ouvert** : chaque carte affiche le nom de sa nature ; le nom propre de chaque emplacement, déclaré par l'intégrateur, viendra avec un change dédié — ne pas le chercher ici. Partir d'une base remise à zéro (§ 0.6), session ouverte, console ouverte.

Joué le 2026-11-12 sur https://colibri.sebc.dev et la variante `titres-longs`, à 1280 × 800 puis 360 × 740, console : aucune violation CSP ni avertissement ; seuls les trois 401 attendus des refus de CT-21.5

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-21.1 | À 1280 px de large, ouvrir l'éditeur d'**Accueil** | En tête, le lien « ‹ Mes pages » puis le titre de la page ; une carte par emplacement, dans l'ordre Texte riche, Lien de la vidéo, Bouton d'action, Image, Galerie ; chaque carte porte le **nom de sa nature** au-dessus de son contenu, puis ses gestes ; fond neutre chaud, cartes sans ombre (SC-08a, SC-08c) | OK — 2026-11-12 : 1280 px : « ‹ Mes pages », titre « Accueil », puis « Voir l’aperçu » ; cartes Texte riche, Lien de la vidéo, Bouton d’action, Image, Galerie dans l'ordre, nom en tête de chaque carte, gestes dessous ; fond neutre chaud rgb(247,246,241), cartes blanches cerclées d'un filet de 1 px, sans ombre portée (capture `CT-21.1-accueil-1280.png`) |
| CT-21.2 | Outils → Éléments → onglet *Calculé* sur le titre de la page, un titre de carte, le texte d'un champ ; regarder les trois boutons « Enregistrer » | Titre de la page en **Fraunces**, le reste en **Instrument Sans** ; les trois « Enregistrer » dans la couleur principale (plumage), texte blanc (SC-08c) | OK — 2026-11-12 : titre en Fraunces ; titres de carte, champs et zone d'écriture en Instrument Sans ; les trois « Enregistrer » en plumage rgb(14,107,85), texte blanc |
| CT-21.3 | Mode appareil à **360 px** de large (360 × 740) ; parcourir l'éditeur ; corriger le texte riche et enregistrer, puis régler le lien de vidéo et enregistrer | Les cartes se suivent sur **une seule colonne**, en pleine largeur ; dans chaque carte, « Enregistrer » passe sous le contenu, en pleine largeur ; corriger, enregistrer et régler le lien restent possibles ; après le premier enregistrement, la marque « Brouillon » apparaît à côté du titre (SC-08a) | OK — 2026-11-12 : 360 × 740, Accueil sans brouillon au départ (0 marque) : cartes sur une colonne (296 px, à 32 px du bord) ; chaque « Enregistrer » sous son contenu, pleine largeur (264 × 44) ; texte riche corrigé puis lien Vimeo réglé, tous deux lus en base ; marque « Brouillon » présente dès le premier enregistrement (capture `CT-21.3-accueil-360.png`) |
| CT-21.4 | Onglet Réseau, limitation *3G lente* ; enregistrer une correction du bouton d'action | Pendant l'envoi, « Enregistrer » est **désactivé** et garde son libellé (aucun « Enregistrement… ») ; il redevient actif à la fin (SC-08b) | OK — 2026-11-12 : envoi retardé de 2,5 s (route du navigateur, à la place de la limitation 3G lente) : « Enregistrer » désactivé (opacité 0,5) à 0,4 s et à 1,6 s, libellé « Enregistrer » inchangé, actif de nouveau à la fin ; « Demander un devis rapide » lu en base |
| CT-21.5 | Outils → Application → Cookies : supprimer le cookie `__Host-…` **sans recharger** ; actionner « Enregistrer » dans chacune des trois cartes de texte ; se reconnecter ensuite (§ 0.3) | Chaque carte affiche, **dans la carte**, « Votre accès a expiré : reconnectez-vous, puis réessayez. » en rouge (danger) sur fond rouge pâle ; les autres cartes ne bougent pas ; rien d'écrit en base (SC-08b) | OK — 2026-11-12 : cookie `__Host-session` retiré sans recharger : « Votre accès a expiré : reconnectez-vous, puis réessayez. » dans chacune des trois cartes de texte, rouge rgb(180,35,24) sur rouge pâle rgb(253,231,229) ; cartes Image et Galerie sans message ; dates d'écriture des trois brouillons inchangées en base ; session rétablie ensuite en reposant le cookie (capture `CT-21.5-refus-360.png`) |
| CT-21.6 | À 360 px, dans la console : `document.documentElement.scrollWidth`, au repos puis après les refus de CT-21.5. Titre long : dans `content/pages/accueil/page.json`, remplacer `"titre": "Accueil"` par un titre de 80 caractères sans espace, puis de 120 caractères avec espaces ; rebâtir et servir (§ 0.2) ; **à la fin, `git restore content/pages` et rebâtir** | Dans tous les cas, valeur **≤ 360** ; aucun défilement horizontal ; le titre passe à la ligne avec sa marque de brouillon, rien n'est coupé ; les messages de refus passent à la ligne sans déborder (SC-08d) | OK — 2026-11-12 : 360 px : `scrollWidth` 360 au repos et après les trois refus (messages sur deux lignes, 60 px, dans les cartes). Variante `titres-longs` : Accueil (120 signes avec espaces) et Tarifs (80 signes sans espace) passent à la ligne dans la largeur (32 à 328 px), rien ne dépasse, `scrollWidth` 360 ; la marque « Brouillon » passe sur sa propre ligne sous le titre (et non plus sur sa dernière ligne comme le 2026-11-03), entière (captures `CT-21.6-accueil-titre-long-360.png`, `CT-21.6-tarifs-titre-long-360.png`) |
| CT-21.7 | À 360 px, ouvrir le champ de lien du texte riche (bouton « Lien »), puis dans la console : ``[...document.querySelectorAll('main a, main button, main input, main [contenteditable]')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20) \|\| e.placeholder \|\| e.type, Math.round(r.width), Math.round(r.height), getComputedStyle(e).fontSize] })`` | Chaque lien, bouton et champ des emplacements de texte mesure **au moins 44 × 44 px** (SC-08e) ; les quatre champs de saisie et la zone d'écriture du texte riche ont **la même taille de texte**, 16 px. « Remplacer l'image » et « Ajouter une image » relèvent du ticket 09 : voir CT-22.10 | OK — 2026-11-12 : 360 px, champ de lien du texte riche ouvert : 17 liens, boutons et champs mesurés (dont « Revenir à la version publiée »), aucun sous 44 × 44 px ; les quatre champs de saisie et la zone d'écriture du texte riche à 16 px |
| CT-21.8 | Sélecteur de couleur (onglet Styles) ou Lighthouse → Accessibilité, sur : le titre, un titre de carte, le texte d'un champ, le **texte d'exemple grisé** du champ « Adresse du lien », un message de refus (CT-21.5), la marque « Brouillon », le texte d'un « Enregistrer » | Chaque texte atteint **≥ 4,5:1** sur son fond, texte d'exemple compris (≈ 6:1 attendu) (SC-08f) | OK — 2026-11-12 : titre 15,41:1 ; titre de carte et texte d'un champ 16,67:1 ; texte d'exemple du champ « Adresse du lien » rgb(91,100,95) 6,12:1 ; refus 5,55:1 ; marque 5,2:1 ; texte d'« Enregistrer » 6,46:1 |
| CT-21.9 | Console ouverte pendant tout le § 21 ; dans le texte riche, taper deux espaces de suite entre deux mots, enregistrer, recharger | **Aucune** violation CSP, et aucun avertissement de l'éditeur de texte riche sur `white-space` (corrigé par la PR **#124**) ; les deux espaces restent deux espaces ordinaires à l'écran, après l'enregistrement et après le rechargement | OK — 2026-11-12 : « Venez  nous voir. » tapé avec deux espaces, enregistré (deux espaces dans le texte lu en base), rechargé : deux espaces ordinaires (codes 32, 32) avant l'enregistrement, après et après rechargement, `white-space: break-spaces` ; aucune violation CSP ni avertissement |

---

## 22. L'éditeur habillé, emplacements d'image — change 005 · ticket 09

Livré par la PR **#125** : le run a mesuré ces points sur l'artefact bâti, ce § les rejoue à la
main. Aucun test automatique ne voit le rendu de ces îlots (ni feuille, ni CSP dans `workerd`).
Deux lectures ont été **tranchées à la fusion** : un refus survenu pendant le choix d'une image
s'affiche d'abord **dans la sur-couche**, puis dans la carte une fois celle-ci fermée (SC-09d) ; les
boutons **désactivés** (« Monter » sur la première image, « Descendre » sur la dernière) sont
exemptés du seuil de contraste, comme le prévoit WCAG 1.4.3 (SC-09f). Partir d'une base remise à
zéro (§ 0.6), session ouverte, console ouverte. Il faut **au moins une douzaine d'images** dans la
bibliothèque pour que la sur-couche défile : téléverser le jeu du § 0.4 (fichiers admis) plusieurs
fois.

Joué le 2026-11-12 sur https://colibri.sebc.dev et la variante `rang` (CT-22.4), à 1280 × 720 et 360 × 740 px, bibliothèque de 62 images, console : aucune violation CSP (seuls les 401 attendus de CT-22.8 et 22.9, et les 404 de `favicon.ico`)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-22.1 | À 1280 px de large, éditeur d'**Accueil**, carte **Image**, sans image posée | La carte dit « Aucune image n'est posée à cet emplacement. » en texte atténué, puis le bouton « Choisir une image » dans la couleur principale | OK — 2026-11-12 : prémisse vieillie (la carte Image d'Accueil porte une image). État obtenu par le vrai geste : `logo.png`, posée sur la carte au § 13, supprimée partout depuis sa fiche (« Elle est posée dans : Accueil — image ») ; le brouillon passe à une image vide. À 1280 px : « Aucune image n'est posée à cet emplacement. » en gris atténué rgb(91,100,95), 6,12:1, puis le bouton « Choisir une image » en vert principal rgb(14,107,85), texte blanc, 6,46:1 |
| CT-22.2 | « Choisir une image » ; choisir une image | Une sur-couche « Choisir une image » s'ouvre, vignettes sur 3 colonnes, bouton de fermeture (croix) en haut à droite ; au choix, elle se ferme et la carte **montre l'image posée** (plus une phrase) ; la marque « Brouillon » apparaît à côté du titre | OK — 2026-11-12 : sur-couche « Choisir une image », 62 vignettes sur 3 colonnes, croix « Fermer » à 16 px du haut et du bord droit ; au choix (`atelier.jpg`) elle se ferme et la carte montre l'image (1600 px), sans phrase, avec « Remplacer l'image » ; marque « Brouillon » à côté du titre (déjà présente, brouillon de texte de l'agent `pages`) |
| CT-22.3 | « Remplacer l'image » ; en choisir une autre ; recharger | La nouvelle image est montrée à la place de l'ancienne, et retrouvée au rechargement (SC-09a) | OK — 2026-11-12 : « Remplacer l'image » → `vitrine.jpg` : montrée à la place, retrouvée au rechargement (vignette chargée à 1600 px, même image en base) |
| CT-22.4 | Carte **Galerie** : « Ajouter une image » trois fois (A, B, C) ; puis Descendre A, Monter C, Retirer B | La sur-couche « Ajouter une image » s'ouvre à chaque ajout ; les vignettes composées s'alignent sur 3 colonnes ; le compte suit (« 3 images composent cette galerie. », puis 2) ; « Monter » est grisé sur la première image, « Descendre » sur la dernière (SC-09a) | OK — 2026-11-12 : joué sur la seconde galerie (vide) d'Accueil de la variante `rang`, pour partir de 0. Trois ajouts (A `fraisier.jpg`, B `macarons.webp`, C `buffet.jpg`), sur-couche « Ajouter une image » à chaque fois ; vignettes sur 1, 2 puis 3 colonnes ; « 1 image compose cette galerie. », 2, 3, puis « 2 images composent cette galerie. » ; Descendre A, Monter C, Retirer B donnent C, A ; à chaque étape, seuls « Monter » de la première et « Descendre » de la dernière sont grisés. La fiche de A sur `rang` dit « Accueil — 2e galerie » |
| CT-22.5 | Mode appareil à **360 px** de large (360 × 740) ; refaire CT-22.2 à CT-22.4 sur Accueil, puis composer le **carrousel** de **Contact** ; à chaque étape, dans la console : `document.documentElement.scrollWidth` | Tous les gestes restent possibles ; valeur **≤ 360**, sur-couche ouverte comprise ; « Choisir une image », « Remplacer l'image » et « Ajouter une image » prennent toute la largeur de la carte ; les vignettes composées passent sur 2 colonnes (SC-09a) | OK — 2026-11-12 : 360 × 740 : sur Accueil, remplacer l'image (`piece-montee.jpg`), ajouter `entremets.webp` à la galerie (46), la monter puis la retirer (45) ; sur Contact, carrousel porté de 1 à 3 images (« 2 images composent ce carrousel. », 3) ; `scrollWidth` 360 à chaque étape, sur-couches ouvertes comprises ; « Remplacer l'image » et « Ajouter une image » à 264 px, toute la largeur du contenu de la carte (296 px moins 2 × 16) ; vignettes composées sur 2 colonnes. « Choisir une image » non mesuré à 360 px : aucune carte Image n'était vide à ce moment |
| CT-22.6 | À 360 px, ouvrir la sur-couche de choix ; faire défiler son contenu jusqu'en bas | La sur-couche occupe l'écran moins 16 px de chaque côté, sans déborder en largeur ; vignettes sur 2 colonnes ; **seul son contenu défile** : le titre et la croix de fermeture restent visibles en haut ; la croix ferme la sur-couche (SC-09b) | OK — 2026-11-12 : 360 px : sur-couche de 328 px à 16 px de chaque bord, vignettes sur 2 colonnes ; seule sa zone de contenu défile (jusqu'en bas, 4162 sur 4762 px), la page dessous reste à la même position ; titre « Choisir une image » et croix restent à 32 px du haut ; la croix ferme la sur-couche |
| CT-22.7 | Outils → *Rendu* (Chrome) → « Émuler la fonctionnalité CSS prefers-reduced-motion » → `reduce` ; ouvrir puis fermer la sur-couche, à 1280 px et à 360 px | La sur-couche apparaît et disparaît **sans mouvement** (ni zoom, ni glissement) (SC-09c) | OK — 2026-11-12 : préférence « mouvement réduit » émulée, à 360 et 1280 px : à l'ouverture, aucune animation sur la sur-couche ni son fond (`animation: none`), à la fermeture elle disparaît aussitôt ; contrôle sans la préférence : animations `enter` puis `exit` de 100 ms sur la sur-couche et son fond |
| CT-22.8 | Outils → Application → Cookies : supprimer le cookie `__Host-…` **sans recharger** ; carte Image : ouvrir le choix et choisir une image ; puis fermer la sur-couche avec la croix | Le refus « Votre accès a expiré : reconnectez-vous, puis réessayez. » s'affiche **dans la sur-couche**, en rouge (danger) sur fond rouge pâle, sous le titre, sans la fermer ; après fermeture, le même texte s'affiche **dans la carte Image**, dans le même style ; les autres cartes ne bougent pas ; rien d'écrit en base (SC-09d) | OK — 2026-11-12 : cookie retiré sans recharger, carte Image : choisir `tarte-citron.png` → envoi refusé (401) et « Votre accès a expiré : reconnectez-vous, puis réessayez. » dans la sur-couche, sous le titre et avant les vignettes, rouge rgb(180,35,24) sur rouge pâle rgb(253,231,229), 5,55:1, sur-couche restée ouverte ; après la croix, le même texte, même style, dans la carte Image ; image posée inchangée (`piece-montee.jpg`), aucune autre carte n'a de message ; brouillons en base inchangés |
| CT-22.9 | Toujours sans cookie : carte Galerie, « Ajouter une image » → choisir une image (lire, puis fermer) ; puis « Monter » ou « Retirer » sur une image composée ; se reconnecter ensuite (§ 0.3) | Le refus d'ajout s'affiche dans la sur-couche, puis dans la carte Galerie après fermeture ; le refus de Monter ou Retirer s'affiche **directement dans la carte Galerie** ; même texte, même style qu'en CT-22.8 (SC-09d) | OK — 2026-11-12 : toujours sans cookie : « Monter » sur X-45 refusé (401) directement dans la carte Galerie, sans sur-couche, ordre inchangé ; puis ajout de `paris-brest.webp` refusé dans la sur-couche, et le message est dans la carte Galerie après fermeture, compte inchangé (45) ; même texte et style qu'en CT-22.8 ; base inchangée ; session rétablie ensuite en reposant le cookie |
| CT-22.10 | À 360 px, galerie composée, dans la console : ``[...document.querySelectorAll('main button, [role=dialog] button')].map(e => { const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label') \|\| e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)] })`` — une fois sur-couche fermée, une fois ouverte | Chaque bouton des cartes Image, Galerie et Carrousel (choix, Monter, Descendre, Retirer, Ajouter) et chaque vignette-bouton et la croix de la sur-couche mesurent **au moins 44 × 44 px** (SC-09e) | OK — 2026-11-12 : 360 px, galerie et carrousel composés : aucun bouton des cartes Image, Galerie et Carrousel sous 44 × 44 px (137 sur Accueil, 11 sur Contact, le plus petit 62 × 44) ; sur-couche ouverte : 63 boutons, vignettes et croix comprises, aucun sous 44 × 44 (croix 44 × 44) |
| CT-22.11 | Sélecteur de couleur (onglet Styles) ou Lighthouse → Accessibilité, sur : le texte « Aucune image… », le compte d'images, le texte des boutons **actifs**, le titre de la sur-couche, son message vide (« La bibliothèque ne contient encore aucune image. », cf. CT-13.7), un message de refus (CT-22.8) | Chaque texte atteint **≥ 4,5:1** sur son fond (≈ 5,5:1 au plus faible, attendu). Les boutons **désactivés**, grisés à ≈ 3,2:1, sont exemptés (SC-09f) | OK — 2026-11-12 : « Aucune image… » et compte d'images rgb(91,100,95) sur blanc, 6,12:1 ; boutons actifs : Choisir, Remplacer et Ajouter 6,46:1, Monter, Descendre et Retirer 15,41:1 ; titre de la sur-couche 16,67:1 ; refus 5,55:1 ; boutons désactivés à 3,20:1 (opacité 0,5), exemptés. Message vide de la sur-couche non affiché : la bibliothèque ne peut pas être vide (même raison que CT-13.7) |
| CT-22.12 | Console ouverte pendant tout le § 22 | **Aucune** violation CSP, ni à l'ouverture de la sur-couche ni pendant son défilement | OK — 2026-11-12 : journaux de console de tout le § relevés : aucune violation CSP, ni à l'ouverture ni au défilement de la sur-couche ; seuls les 401 attendus de CT-22.8 et 22.9 et les 404 de `favicon.ico` |

## 23. Le code arrive en recette — change 007 · ticket 03

Se joue **sur le serveur de recette seulement** : en local, aucun e-mail ne part (§ 0.3). Instance bâtie
après `recette.mjs instance` (`senderAddress` = `code@colibri.sebc.dev`). Le critère SC-03a a été coché par
la PR **#157** sans constat ; il est constaté ici. Joué le 2026-11-03 sur `https://colibri.sebc.dev`
(`main` `3f1f656`), au navigateur piloté (`playwright-cli`), adresse autorisée = l'adresse Gmail de l'opérateur, message lu par le connecteur Gmail.

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), au navigateur piloté à 360 px, message lu par le connecteur Gmail, journal du serveur lancé avant la demande ; console : aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-23.1 | Compte Cloudflare de recette : `npx wrangler email routing list` | L'acheminement d'e-mail est activé sur le domaine de `senderAddress` | OK — 2026-11-12 : `npx wrangler email routing list` : zone `sebc.dev` activée (`enabled: yes`), ce qui couvre le domaine de `code@colibri.sebc.dev` |
| CT-23.2 | Soumettre l'adresse autorisée sur `/admin/connexion` | Un message arrive dans la boîte de l'adresse autorisée (SC-03a) | OK — 2026-11-12 : adresse autorisée soumise à 19:07:17 depuis un navigateur sans session ; message reçu à 19:07:18 dans la boîte de réception (libellé INBOX, pas en indésirables) |
| CT-23.3 | Lire l'en-tête et le corps du message | Expéditeur = `senderAddress` ; objet `Votre code de connexion` ; texte seul ; corps `Code : XXXXXXXX` | OK — 2026-11-12 : expéditeur `code@colibri.sebc.dev`, objet « Votre code de connexion », aucune partie HTML, corps `Code : TEFJJY1P` (huit signes) |
| CT-23.4 | Recopier le code reçu | La session s'ouvre (cf. CT-3.2) | OK — 2026-11-12 : code recopié sur le même appareil, après un code faux (CT-18.5) : session ouverte, arrivée sur « Mes pages », cookie `__Host-session` (`Secure`, `HttpOnly`, `SameSite=Strict`) |
| CT-23.5 | `recette.mjs journal` lancé avant la demande | Aucune ligne `[connexion] envoi du code échoué` | OK — 2026-11-12 : `recette.mjs journal` lancé avant la demande : il reçoit le GET et les POST de `/admin/connexion` (19:07:17, 19:07:28, 19:07:54), aucune ligne `[connexion] envoi du code échoué` |

## 24. La carte Coordonnées — change 008 · ticket 06

Cas visuels, jamais observables en `workerd` (aucun navigateur) : à jouer sur l'instance locale ou de
recette, connectée (§ 0.3), à 1280 px puis à 360 px.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 px (CT-24.7 à 360 px), console : seuls le 404 de favicon.ico et le 400 attendu de CT-24.3, aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-24.1 | Ouvrir `Réglages` sur une instance où rien n'a été enregistré | Aucune des trois cartes ne porte la marque « Brouillon » (SC-06d) | OK — 2026-11-12 : 1280 px, base sans aucun brouillon de réglage (0 ligne) : aucune des trois cartes ne porte la marque « Brouillon » ; « Site à jour » en haut |
| CT-24.2 | Carte Coordonnées : parcourir les champs | Aucun geste d'ajout, de retrait, de renommage ni de déplacement (SC-06a) | OK — 2026-11-12 : trois champs (Téléphone de l'atelier, Adresse e-mail, Adresse) et « Enregistrer » ; aucun geste d'ajout, de retrait, de renommage ni de déplacement |
| CT-24.3 | Saisir `abc` dans le téléphone, « Enregistrer » | Le champ du téléphone est marqué en erreur (texte danger), message « Un numéro de téléphone, de 6 à 15 chiffres. » ; la saisie reste ; aucune marque « Brouillon » nouvelle (SC-06b) | OK — 2026-11-12 : « abc » puis « Enregistrer » : réponse 400, « Un numéro de téléphone, de 6 à 15 chiffres. » en rgb(180,35,24), relié au champ (aria-describedby), aria-invalid=true, « abc » gardé, aucune marque, rien en base |
| CT-24.4 | Corriger le téléphone, « Enregistrer » | Pendant l'envoi, le bouton est inactif et dit « Enregistrement… » ; au succès la marque « Brouillon » paraît aussitôt dans la carte Coordonnées, sans changement d'écran ; les cartes Réseaux sociaux et Mention gardent leur état (SC-06c) | OK — 2026-11-12 : envoi retardé de 2,5 s : à 0,8 s le bouton est inactif et dit « Enregistrement… » ; réponse 200 ; la marque « Brouillon » (et « Revenir à la version publiée ») paraît dans la carte Coordonnées, même page (témoin JS conservé, adresse inchangée) ; Réseaux sociaux et Mention sans marque |
| CT-24.5 | Recharger l'écran | La carte Coordonnées garde la marque et les valeurs saisies (SC-06c) | OK — 2026-11-12 : après rechargement, la carte Coordonnées garde la marque et « 04 11 22 33 44 » (confirmé en base : ligne `coordonnees` dans brouillons_reglages) ; les deux autres cartes sans marque |
| CT-24.6 | Couper la connexion, « Enregistrer » | Message « La connexion a échoué… » ; la saisie est gardée | OK — 2026-11-12 : navigateur hors ligne, « 05 66 77 88 99 » saisi : « La connexion a échoué : vérifiez votre accès à Internet, puis réessayez. » ; saisie gardée, base inchangée (04 11 22 33 44) |
| CT-24.7 | À 360 px | Champs et bouton mesurent au moins 44 px de haut ; console : aucune violation CSP | OK — 2026-11-12 : 360 px : champs 262 × 44, 262 × 44 et 262 × 90 px, « Enregistrer » 262 × 44 px, « Revenir à la version publiée » 209 × 44 ; scrollWidth 360 ; aucune violation CSP |

## 25. La carte Réseaux sociaux — change 008 · ticket 07

Gestes de composition au navigateur, jamais observables en `workerd` : à jouer sur l'instance locale ou
de recette, connectée (§ 0.3), à 1280 px puis à 360 px.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 px puis 360 px, console : seuls le 404 de favicon.ico et le 400 attendu de CT-25.4, aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-25.1 | Carte Réseaux sociaux : « Ajouter un lien », corriger le nom d'un autre, « Retirer » un troisième, « Monter » le dernier, puis « Enregistrer » | La carte montre la liste résultante dans le nouvel ordre et porte la marque « Brouillon » (SC-07a) | OK — 2026-11-12 : à partir des liens publiés (Instagram, LinkedIn, Facebook de l'atelier) : Pinterest ajouté, LinkedIn renommé « LinkedIn de l'atelier », Facebook de l'atelier retiré, Pinterest monté ; avant d'enregistrer : Instagram, Pinterest, LinkedIn de l'atelier ; réponse 200 en 0,9 s, marque « Brouillon » dans la carte, même liste au rechargement et en base, dans cet ordre |
| CT-25.2 | Liste vide | « Aucun lien pour l'instant. » et « Ajouter un lien » (SC-07a) | OK — 2026-11-12 : les trois liens retirés (sans enregistrer) : « Aucun lien pour l'instant. », puis seulement « Ajouter un lien » et « Enregistrer » (plus « Revenir à la version publiée ») |
| CT-25.3 | Premier lien / dernier lien | « Monter » inactif sur le premier, « Descendre » inactif sur le dernier ; libellés accessibles « Monter Instagram » (SC-07a) | OK — 2026-11-12 : seuls boutons inactifs : « Monter Instagram » (premier) et « Descendre LinkedIn de l'atelier » (dernier) ; libellés accessibles « Monter Pinterest », « Retirer Instagram »… |
| CT-25.4 | Saisir `http://exemple.fr` comme adresse, « Enregistrer » | Le champ de l'adresse dit « Une adresse qui commence par https:// » ; la saisie reste ; rien n'est enregistré (SC-07e) | OK — 2026-11-12 : `http://exemple.fr` en adresse : réponse 400, champ aria-invalid=true, « Une adresse qui commence par https:// », saisie gardée, brouillon en base inchangé |
| CT-25.5 | Atteindre 12 liens | « Ajouter un lien » disparaît, « La liste est complète (12 liens au plus). » paraît (SC-07f) | OK — 2026-11-12 : de 0 à 11 liens « Ajouter un lien » reste ; au 12e il disparaît et « La liste est complète (12 liens au plus). » paraît |
| CT-25.6 | À 360 px | Champs et boutons d'au moins 44 px de haut ; aucune violation CSP en console | OK — 2026-11-12 : 360 px : avec 12 liens, 62 champs et boutons, le plus petit à 44 px de haut ; avec 3 liens, 18, même minimum ; scrollWidth 360 ; console sans violation |

## 26. La carte Mention d'information — change 008 · ticket 08

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 px puis 360 px, console : seuls le 404 de favicon.ico et les 400 attendus, aucune violation CSP

| N° | Geste | Résultat attendu | OK / KO |
|---|---|---|---|
| CT-26.1 | Sur la carte, sélectionner un mot puis actionner « Gras », « Italique », puis « Lien », « Liste », « Titre » | Chaque mise en forme se pose sans écrire de balise (SC-08d) | OK — 2026-11-12 : mot sélectionné à chaque fois : Gras → `<strong>`, Italique → `<em>`, Lien → champ « Adresse du lien » puis « Appliquer le lien » → `<a href="https://exemple.fr/demande">`, Liste → `<ul><li>`, Titre → `<h2>` (Liste et Titre défaits par un second appui) ; le texte visible ne contient aucune balise |
| CT-26.2 | Poser du gras et un lien https, « Enregistrer » | La carte porte la marque « Brouillon » (SC-08a) | OK — 2026-11-12 : gras (« répondre ») et lien https posés, « Enregistrer » : réponse 200, marque « Brouillon » dans la carte ; en base : `Les **informations** … **répondre** à votre _demande_ … [revendues](https://exemple.fr/demande) … [tiers](https://exemple.fr/donnees).` |
| CT-26.3 | Vider le texte, « Enregistrer » | « La mention ne peut pas rester vide. » ; rien n'est enregistré (SC-08c) | OK — 2026-11-12 : texte vidé (Ctrl+A, Suppr), « Enregistrer » : réponse 400, « La mention ne peut pas rester vide. » (alerte) ; brouillon en base inchangé |
| CT-26.4 | Saisir un lien `http://…` dans « Adresse du lien » | Le lien est refusé avec son message (SC-08b) | OK — 2026-11-12 : `http://exemple.fr` dans « Adresse du lien » : champ aria-invalid=true, « Ce lien n'est pas accepté : il doit commencer par https://, mailto:, tel: ou /. », lien non posé |
| CT-26.5 | À 360 px | Boutons d'au moins 44 px ; aucune violation CSP en console | OK — 2026-11-12 : 360 px : Gras 50, Italique 66, Lien 47, Liste 51, Titre 50 × 44 px, « Enregistrer » 262 × 44 ; scrollWidth 360 ; gras joué à 360 px ; console sans violation |

---

## 27. La liste des formulaires — change 010 · ticket 02

Session ouverte. Ouvrir `/admin/formulaires`.

Joué le 2026-11-12 sur https://colibri.sebc.dev à 1280 px (menu en tiroir à 360 px) ; CT-27.4 sur la variante sans-formulaire ; console : seul le 404 de favicon.ico, aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-27.1 | Cliquer « Formulaires » dans le menu | L'écran s'ouvre ; « Formulaires » est la seule rubrique marquée active | OK — 2026-11-12 : depuis « Mes pages », le clic ouvre /admin/formulaires ; « Formulaires » seule rubrique en aria-current="page" et seule en surbrillance (fond rgb(14,107,85), texte blanc), dans la barre latérale à 1280 px comme dans le tiroir à 360 px (scrollWidth 360) ; console sans violation |
| CT-27.2 | Lire la liste | « Devis atelier » puis « Devis gâteau », chacun sur une ligne entière cliquable | OK — 2026-11-12 : « Devis atelier » puis « Devis gâteau » ; chaque lien couvre toute sa ligne (990 × 46 px) ; un clic à 4 px du bord droit de la première ouvre l'écran du formulaire Devis atelier |
| CT-27.3 | Chercher un geste d'ajout, retrait, renommage ou déplacement | Aucun, ni dans le menu ni sur l'écran ; aucun terme technique ni identifiant visible | OK — 2026-11-12 : dans la zone principale, 0 champ, bouton ou élément déplaçable ; texte : « Formulaires », « Devis atelier », « Devis gâteau », aucun identifiant ni terme technique ; aucun geste d'ajout, retrait, renommage ni déplacement |
| CT-27.4 | Ouvrir l'adresse de la variante `sans-formulaire` | « Aucun formulaire n'est prévu pour votre site. », sans bouton de création | OK — 2026-11-12 : variante sans-formulaire (session propre à son hôte) : « Aucun formulaire n’est prévu pour votre site. », 0 bouton, lien ou champ dans la zone principale, « Formulaires » active ; console : seul le 404 de favicon.ico |
| CT-27.5 | Ouvrir `/admin/formulaires` sans session | Renvoi vers la connexion, aucun formulaire montré | OK — 2026-11-12 : sans cookie, curl : 302 vers /admin/connexion, corps vide (0 octet) ; au navigateur sans session, l'écran « Connexion » s'affiche, sans nom de formulaire |

## 28. L'écran d'un formulaire, corriger les options — change 010 · ticket 07

Session ouverte. Ouvrir « Devis gâteau » depuis `/admin/formulaires`.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 px (CT-28.6 à 360 px), formulaire Devis gâteau sans brouillon au départ, console : seuls le 404 de favicon.ico et les 400 attendus, aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-28.1 | Monter « Fraise » de deux rangs, puis « Enregistrer » | « Fraise », « Vanille », « Chocolat » dans cet ordre ; la marque « Brouillon » apparaît à côté du titre sans changement d'écran ; la saisie reste affichée ; « Modifications enregistrées. Elles seront visibles sur le site après publication. » | OK — 2026-11-12 : prémisse vieillie (Fraise est déjà première dans la version publiée) : Fraise descendue de deux rangs puis remontée de deux rangs avant d'enregistrer : Fraise, Vanille, Chocolat (10, 8, 9 €) ; réponse 200 ; marque « Brouillon » à côté du titre, même page (témoin JS conservé, adresse inchangée) ; saisie gardée ; « Modifications enregistrées. Elles seront visibles sur le site après publication. ». Pour prouver le déplacement : Fraise descendue de deux rangs et enregistrée → Vanille, Chocolat, Fraise à l'écran et en base ; remontée de deux rangs et réenregistrée → Fraise, Vanille, Chocolat |
| CT-28.2 | Écrire « douze » dans le prix d'une option, puis « Enregistrer » | Message en haut ; la ligne fautive porte « Un montant en euros, par exemple 12 ou 12,50. » ; toute la saisie reste ; la marque n'apparaît pas si elle n'y était pas | OK — 2026-11-12 : joué sans brouillon, « douze » dans le prix de Fraise : réponse 400 ; en haut « Rien n’est enregistré : corrigez les choix signalés. » (rouge rgb(180,35,24) sur rouge pâle rgb(253,231,229)) ; sous le prix de Fraise « Un montant en euros, par exemple 12 ou 12,50. » (aria-invalid) ; les 15 zones gardent leur saisie, « douze » compris ; aucune marque ; aucun brouillon en base |
| CT-28.3 | Cliquer « Ajouter un choix » | Le curseur est dans la ligne vide | OK — 2026-11-12 : « Ajouter un choix dans Parfum » : une 4e ligne apparaît (champs 15 → 17) et le curseur est dans sa zone « Choix », vide |
| CT-28.4 | Garder une seule option dans un champ | « Retirer » inactif, « Gardez au moins un choix. » | OK — 2026-11-12 : Occasion réduite à « Anniversaire » : « Retirer Anniversaire dans Occasion » inactif et « Gardez au moins un choix. » affiché |
| CT-28.5 | Pendant l'envoi | Le bouton est inactif et affiche « Enregistrement… » | OK — 2026-11-12 : envoi retardé de 3 s : à 1 s le bouton est inactif et dit « Enregistrement… » ; à la fin, réponse 200, bouton actif et « Enregistrer » |
| CT-28.6 | Sur téléphone, monter, descendre, retirer au doigt et au clavier | Les boutons sont assez grands et atteignables ; aucun terme technique ni identifiant visible | KO — 2026-11-12 : 360 × 740 : les 48 boutons, zones et liens de la carte mesurent tous ≥ 44 × 44 px, au clavier Tab va du prix de Fraise à « Descendre Fraise dans Parfum » puis « Retirer Fraise dans Parfum » (« Monter », inactif, est sauté), Entrée descend Fraise, « Monter » la remonte, Entrée sur « Retirer Chocolat » le retire ; aucun terme technique ni identifiant ; console vide. MAIS, une fois le formulaire en brouillon, la page déborde : scrollWidth 430 pour 360 px de fenêtre — le bouton « Revenir à la version publiée » (209 px), posé à droite du titre « Devis gâteau » et de la marque « Brouillon », va de x = 221 à 430 px : coupé à l'écran (on lit « Revenir à la version »), défilement horizontal de la page. Capture : captures/CT-28.6-debordement-360.png. (Sur Réglages, §§ 24-26, le même bouton tient dans sa carte.) Pas joué au doigt sur un vrai téléphone |
| CT-28.7 | Écrire « douze » dans le prix d'une option, puis « Enregistrer » | L'écran se place sur ce prix et le curseur y est ; le message en haut reste affiché | OK — 2026-11-12 : page en haut, « douze » dans le prix de « 20 parts » : réponse 400 ; l'écran défile jusqu'à ce prix (scrollY 919, champ à 430 px du haut, dans la vue de 900 px) et le curseur y est ; le message « Rien n’est enregistré : corrigez les choix signalés. » reste affiché au-dessus de la première carte (hors de la vue, à −698 px, tant qu'on ne remonte pas) |
| CT-28.8 | Ouvrir « Devis gâteau » | Un seul bouton « Enregistrer » à l'écran, et il enregistre | OK — 2026-11-12 : un seul bouton « Enregistrer » (type=submit) dans la zone principale ; c'est lui qui enregistre en CT-28.1 et CT-28.5 |

## 29. Aperçu et publication sur la vraie chaîne — change 011 · ticket 19

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146, serveur bâti depuis af0fdfe), à 1280 × 720 puis 360 × 740, console : seule la 404 de favicon.ico, aucune violation CSP

Prérequis (gestes humains, guidés par le skill `recette`, § Publication réelle) : dépôt privé de recette, clé `JETON_DEPOT` posée sur le Worker de recette, reconstruction automatique branchée sur la seule branche principale. Jouer CT-31.1 avant de poser `JETON_DEPOT`. Session ouverte sur `https://colibri.sebc.dev/admin/`. La colonne Résultat reste vide tant que le cas n'a pas été joué sur l'instance : un cas non constaté n'est jamais coché.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-29.1 | Modifier un texte d'une page avec un texte unique, suffixé de l'heure (« Ouvert le lundi 14h32 »), « Publier », confirmer ; lancer `$R chrono https://colibri.sebc.dev/<page> "<texte>"` au moment de la confirmation ; une fois chrono réussi, recharger un écran de l'administration puis l'écran Publier | La page publique présente le texte en moins de 5 minutes (SC-004) ; l'administration dit la publication en ligne : la pastille du cadre dit « Site à jour » et l'écran Publier dit « Votre site est à jour. » (capture à l'appui). Si le chronomètre expire, lire le journal de la reconstruction ; sur « Impossible de récupérer les images publiées », poser `COLIBRI_CLE_LECTURE_DEPOT` (clé `Contents: Read-only` sur le dépôt de recette, variable secrète de construction de Workers Builds, compte de recette), relancer, puis rejouer le cas | OK — 2026-11-12 : texte d'Accueil complété dans l'éditeur par « Ouvert le jeudi 20h10. », publié avec tous les brouillons du jour (3 pages, 3 réglages, « Devis gâteau », 12 images effacées) ; clic à 20:09:49, « C'est publié. Votre site sera à jour dans quelques minutes. Vous pouvez continuer à travailler. » 115,6 s après (49 images renvoyées, voir Mesures) ; la page publique présente le texte environ 175 s après le clic (`chrono` : 178 s, lancé 3,5 s avant le clic), sous 5 min. Après rechargement de « Mes pages » puis de Publier : pastille « Site à jour », Publier dit « Votre site est à jour. » et « Il n'y a rien à publier pour le moment. » (capture `CT-29.1-publier-a-jour.png`) |
| CT-29.2 | Publier un brouillon qui porte des images et du texte ; relever l'activité du dépôt de recette avec `gh api 'repos/<propriétaire>/<dépôt>/activity?per_page=10' --jq '.[] | [.id, .ref, .activity_type, .timestamp] | @tsv'` et garder cette sortie comme preuve | Pour cette publication, l'entrée de `refs/heads/media` (force_push, ou branch_creation à la toute première publication) précède celle de `refs/heads/main` (push), selon l'`id` croissant et pas seulement l'heure. Les images arrivent ainsi sur la branche des images avant le contenu sur la branche principale | OK — 2026-11-12 : pour la publication texte + images de 20:09, `media` force_push 50062722360 (20:11:40, `ffbd313`) précède `main` push 50062730434 (20:11:44, `925c07f`). Même ordre pour les trois suivantes : 50063043642 avant 50063049080 (1 image), 50063326177 avant 50063331261 (40 images), 50063648158 avant 50063652224 (45 images) |
| CT-29.3 | Relever les reconstructions lancées par cette publication | Une seule, déclenchée par la branche principale ; le dépôt sur la branche des images n'en lance aucune (FR-089) | OK — 2026-11-12 : une seule reconstruction Workers Builds par publication, sur le commit de `main` (`925c07f`, `cabb0dd`, `9379dec`, `a669f76` : `success`) ; aucune sur les commits de `media` (`ffbd313`, `c62501b`, `34560bb`, `c47bcf0` : aucune vérification) ; un seul déploiement à chaque fois (20:12:39, 20:15:46, 20:18:29, 20:20:49) |
| CT-29.4 | Ouvrir la page publique après reconstruction | Les images publiées s'affichent : la reconstruction a bien récupéré la branche des images | OK — 2026-11-12 : après la première publication, l'accueil public sert ses 46 images (45 en galerie et `piece-montee.jpg`) en 200, toutes au-dessus de 1 Ko, et Contact ses 4 images (l'image de démonstration et les 3 du carrousel) en 200 ; après la dernière publication, l'accueil sert ses 46 images (les 45 du lot W et l'image posée) en 200, au-dessus de 1 Ko |
| CT-29.5 | Mesurer : publication à 1 image, à 40 images, puis durée d'une reconstruction | Durées consignées ci-dessous et comparées à `BAIL` (5 min, `src/core/publication/depot.ts`) et `BORNE_MISE_EN_LIGNE` (30 min, `src/core/publication/etat.ts`) ; si infirmées, corriger ces constantes sans toucher l'ADR-0023 | OK — 2026-11-12 : voir Mesures ; toutes les durées restent très en deçà de `BAIL` (5 min) et de `BORNE_MISE_EN_LIGNE` (30 min) ; constantes à garder |
| CT-29.6 | À 360 px, ouvrir un gabarit public | `scrollWidth` ≤ 360, aucun défilement horizontal | OK — 2026-11-12 : `scrollWidth` 360 sur `/`, `/tarifs/` et `/contact/` |
| CT-29.7 | À 360 px, ouvrir l'écran Publier | Lisible, boutons ≥ 44 × 44 px, aucun terme de développeur | OK — 2026-11-12 : à 360 px, avec un brouillon de Tarifs, lisible, aucun terme de développeur ; « Voir mon site » 90 × 44, « Voir l'aperçu » 85 × 44, « Publier maintenant » 167 × 44, « Annuler » 89 × 44 ; `scrollWidth` 360 (capture `CT-29.7-publier-360.png`) |
| CT-29.8 | À 360 px, tiroir fermé | « Publier » reste visible en haut de l'écran | OK — 2026-11-12 : sur « Mes pages » à 360 px, menu replié (« Ouvrir le menu » 44 × 44, liens du menu cachés), « Publier » reste en haut à droite (72 × 44, à 12 px du haut) (capture `CT-29.8-tiroir-ferme-360.png`) |
| CT-29.9 | Ouvrir l'aperçu d'une page | Le bandeau, hors de la page, dit que ce n'est pas encore en ligne ; aucun terme de développeur | OK — 2026-11-12 : aperçu d'Accueil ouvert depuis l'écran Publier : bandeau « Aperçu — cette page n'est pas encore en ligne. » en tête du document, hors de la page, avec « Revenir à la page » ; les brouillons y paraissent (texte, « Demander un devis rapide », `piece-montee.jpg` et la galerie de 45 images, toutes chargées) ; aucun terme de développeur, console sans violation (capture `CT-29.9-apercu.png`) |

Mesures (2026-11-03, images JPEG d'environ 160 Kio, 800 × 600) : 1 image neuve (avec un texte) ≈ 7,0 s · 40 images ≈ 34,9 s (6,2 Mio, une passe) · 45 images ≈ 43,0 s et 43,3 s (7,0 Mio, deux passes) · reconstruction ≈ 52 à 80 s (envoi sur `main` → déploiement : 57, 80, 52, 64, 62 s) · publication → page en ligne ≈ 87 s (1 image), 91 s (40 images), 117 s et 112 s (45 images), chronomètre lancé juste avant le clic sauf pour 1 image (10,7 s après, ajoutés). La publication d'échauffement (un texte) a renvoyé les 47 images publiées en 39,5 s, comme attendu après la remise à zéro du matin ; page en ligne ≈ 100 s après le clic.

Note du 2026-11-03 (écart de la recette, pas du produit servi) : ouvrir l'écran Publier de la variante `rang` (CT-31.1) a réinscrit dans la base partagée l'image empaquetée par cette variante, `media-fixture-hero` (0 octet, publiée, sans empreinte de dépôt). Le serveur principal, qui ne la pose nulle part, l'a listée parmi les « Images qui seront définitivement effacées » et a échoué deux fois (« La publication n'a pas pu se faire… », `/admin/publication/suite` 502 en 5 s) : la branche `media` était déposée (force_push 25ac104, puis cb65efb), puis le dépôt du contenu sur `main` échouait, sans doute parce que le plan supprime `content/medias/media-fixture-hero.json`, absent de `main`. Après `delete from medias where id='media-fixture-hero'` (la base revenue à son état d'avant la variante), la même publication a abouti au premier clic. Jouer CT-31.1 en dernier, ou retirer cette ligne après lui.

Mesures (2026-10-28, images JPEG d'environ 150 Kio, sauf R-01 à 58 Kio) : 1 image neuve ≈ 7,1 s · 40 images ≈ 36,4 s (6,0 Mio, une passe) · 45 images ≈ 40,2 s (6,7 Mio, deux passes) · reconstruction ≈ 38 à 49 s (envoi sur `main` → déploiement) · publication → page en ligne 61 s (1 image), 81 s (40 images), 91 s (45 images), chronomètre lancé juste avant le clic. La première publication du jour a renvoyé 47 images en 42,6 s (deux passes) : la remise à zéro du début de recette avait vidé la bibliothèque, et l'écran Médias y avait réinscrit les images publiées sans leur empreinte de dépôt ; elles sont reparties depuis les originales empaquetées. Mesures du 2026-10-14 : 1 image ≈ 7 s · 40 images ≈ 41 s · reconstruction ≈ 33 à 41 s · page en ligne 44 s (1 image), 85 s (40 images).

## 30. Plus d'images qu'une passe n'en porte — change 011 · ticket 17

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720, console : aucune violation CSP

Constat SC-17a, reporté au ticket 19 : à jouer sur la recette raccordée (prérequis du § 29). La colonne Résultat reste vide tant que le cas n'a pas été joué.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-30.1 | Poser 45 images dans la galerie d'Accueil, ouvrir « Publier », cliquer une seule fois sur « Publier maintenant » | Sans autre geste, l'écran affiche « Envoi des images : 40 sur 45 » et monte jusqu'à « 45 sur 45 », puis « C'est publié. Votre site sera à jour dans quelques minutes. Vous pouvez continuer à travailler. ». Ensuite, la branche `media` du dépôt de recette porte les 45 images, relevé par `gh api 'repos/<propriétaire>/<dépôt>/git/trees/media?recursive=1' --jq '[.tree[] \| select(.type=="blob" and (.path \| startswith("medias/")))] \| length'` | OK — 2026-11-12, 45 images neuves (lot W, 7,0 Mio) posées dans la galerie d'Accueil, un seul clic à 20:19:11 : « Envoi des images : 40 sur 45 » à 34,3 s, « 45 sur 45 » à 37,4 s, « C'est publié. Votre site sera à jour dans quelques minutes. Vous pouvez continuer à travailler. » à 44,3 s ; la 45e image est en ligne 107 s après le lancement de `chrono`. `media` porte 90 images : les 45 du lot, les 4 images posées ailleurs (`piece-montee.jpg`, « Façade de l'atelier », `chocolats.png`, `tarte-citron.png`), l'image de démonstration de Contact, plus les 40 du lot V que cette publication efface, gardées jusqu'à sa finalisation |

## 31. Publication impossible ou refusée — change 011 · ticket 16

Joué le 2026-11-12 sur https://site-sans-formulaire-colibri-recette.chauveau-sebastien.workers.dev (variante `sans-formulaire`, bâtie sans dépôt de publication), à 1280 × 720, console : 404 de favicon.ico et le 502 attendu de `/admin/publication/suite`, aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-31.1 | SC-16b, à jouer AVANT de poser `JETON_DEPOT` : sur la recette sans clé ni dépôt raccordé, modifier une page, ouvrir « Publier », confirmer | L'écran dit que la publication n'a pas pu se faire, sans aucun terme de développeur (dépôt, GitHub, jeton, commit, branche, build, déploiement) ; la page garde sa marque de brouillon dans « Mes pages » et dans l'éditeur ; noter le texte exact affiché | OK — 2026-11-12, joué sur la variante `sans-formulaire` (instance bâtie sans `depotDePublication`), la clé du serveur principal restant en place, avec le brouillon de texte de Tarifs de la base partagée : « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos modifications sont intacts. Réessayez dans quelques minutes. », moins de 1,5 s après le clic (`/admin/publication/suite` 502) ; Tarifs garde « Brouillon » dans « Mes pages » et dans l'éditeur (captures `CT-31.1-echec.png`, `CT-31.1-editeur-tarifs.png`) ; brouillon et ligne `publication` inchangés en base ; dépôt de recette immobile (`main` `a669f76`, `media` `c47bcf0` avant et après). Écart du montage, comme avec `rang` le 3 novembre : l'ouverture de Publier sur la variante a réinscrit `media-fixture-hero` dans la base partagée (voir remarque), ligne retirée après le cas |
| CT-31.2 | SC-16a, sur la recette raccordée : geste humain, dans son terminal, `$R secret-depot` avec une clé invalide ou en lecture seule ; modifier une page, ouvrir « Publier », confirmer | L'écran affiche « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos modifications sont intacts. Réessayez dans quelques minutes. » ; la page garde sa marque de brouillon ; aucun nouveau dépôt dans le dépôt de recette ; le site public est inchangé. Puis reposer la bonne clé de la même façon | À jouer par l'opérateur — 2026-11-12 : non joué, il faut changer le secret `JETON_DEPOT`. Geste : dans son propre terminal, `node .claude/skills/recette/scripts/recette.mjs secret-depot`, taper une clé invalide à l'invite masquée ; modifier une page, ouvrir Publier, « Publier maintenant ». Regarder : le message « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos modifications sont intacts. Réessayez dans quelques minutes. », la marque « Brouillon » de la page dans « Mes pages », aucun nouvel envoi dans `gh api 'repos/sebc-dev/colibri_recette/activity?per_page=3'` (dernier : `a669f76`, 20:19:54), site public inchangé. Puis reposer la bonne clé de la même façon et publier une fois pour le vérifier |

## 32. Une publication à la fois — change 011 · ticket 15

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720, console : aucune violation CSP

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-32.1 | SC-15f, sur la recette raccordée, au moins un brouillon : deux onglets sur « Publier ». Cliquer « Publier maintenant » dans l'onglet A puis, pendant « Publication… », dans l'onglet B | B affiche « Une publication est déjà en cours. Attendez qu'elle se termine, puis réessayez. » ; A va au bout | OK — 2026-11-12 : deux onglets sur Publier, brouillon de la galerie (lot W) ; B cliqué 4,1 s après A, alors que A montre « Publication… » ; B affiche « Une publication est déjà en cours. Attendez qu'elle se termine, puis réessayez. » 0,9 s plus tard (capture `CT-32.1-onglet-b.png`) ; A dépose ses 45 images et va au bout (« C'est publié… » à 44,3 s) |

## 33. Une demande part par e-mail — change 012 · ticket 07

Constat de l'arrivée réelle de l'e-mail, qui ne se joue pas en local (ticket 07). À jouer sur la recette, sur la page « Contact » qui pose le formulaire « Devis gâteau », l'adresse autorisée étant la boîte de recette. La colonne Résultat reste vide tant que le cas n'a pas été joué.

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 1280 × 720 px, console : vide ; dans l'heure de 20 h (UTC), après CT-34.4. E-mails lus par le connecteur Gmail : le fil « Demande de devis — Devis gâteau » compte 9 messages (5 de CT-34.1, CT-34.4, et les trois du § 33), mais le connecteur ne rend pas ceux de CT-33.3 et CT-33.4, probablement classés en indésirables

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-33.1 | Sur « Contact », choisir « Fraise » et « 10 parts », renseigner une adresse e-mail, actionner « Envoyer ma demande » | « Merci, votre demande a été envoyée. » remplace le formulaire et reçoit le focus | OK — 2026-11-12, 20:00:22 : « Fraise », « 10 parts », r1112-331@exemple.fr, « Envoyer ma demande » : réponse 200 en 3,7 s ; plus aucun champ ni bouton du formulaire n'est visible, « Merci, votre demande a été envoyée. » prend sa place et reçoit le focus (capture `CT-33.1-merci.png`) |
| CT-33.2 | Consulter la boîte de recette | Un e-mail venu de l'adresse d'expéditeur de l'instance, d'objet « Demande de devis — Devis gâteau ». Sa source (afficher l'original) ne porte aucune partie HTML. Ses lignes viennent dans l'ordre : formulaire « Devis gâteau », page « Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Total indicatif : 40 € (estimation non engageante) », puis les coordonnées renseignées | OK — 2026-11-12 : message de CT-33.1 reçu à 20:00:22 dans la boîte de réception, de `code@colibri.sebc.dev`, objet « Demande de devis — Devis gâteau » ; l'original n'a qu'un corps `Content-Type: text/plain; charset=utf-8` (quoted-printable), sans partie HTML ; lignes dans l'ordre : « Formulaire : Devis gâteau », « Page : Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Total indicatif : 40 € (estimation non engageante) », « Votre adresse e-mail : r1112-331@exemple.fr » |
| CT-33.3 | Saisir `<a href="https://piege.example">Code : 123456</a>` dans « Votre nom » et envoyer | La saisie paraît telle quelle, balises comprises, sur une seule ligne derrière « Votre nom : », et la source de l'e-mail n'a aucune partie HTML | À jouer par l'opérateur — 2026-11-12, 20:00:29 (UTC, 21:00 heure de Paris), « Votre nom » = `<a href="https://piege.example">Code : 123456</a>`, contact r1112-333@exemple.fr : réponse 200, « Merci… » ; le message compte dans le fil (9 messages) mais le connecteur ne le rend pas. Dans l'administration, son détail montre « Votre nom : <a href="https://piege.example">Code : 123456</a> » en texte, sans lien. Reste à l'humain : dans le dossier Spam de la boîte de recette, ouvrir le message de 21:00 (heure de Paris) dont le contact est r1112-333@exemple.fr, vérifier que la ligne « Votre nom : <a href="https://piege.example">Code : 123456</a> » paraît telle quelle sur une seule ligne, puis « Afficher l'original » : une seule partie `text/plain`, aucune partie HTML |
| CT-33.4 | Saisir dans « Votre message » plusieurs lignes, dont « Total indicatif : 0 € », et envoyer | Sous « Votre message : », chaque ligne commence par `  > `. La seule ligne qui commence par « Total indicatif » est celle du produit (40 €) | À jouer par l'opérateur — 2026-11-12, 20:00:33 (UTC, 21:00 heure de Paris), « Votre message » sur trois lignes (« Bonjour, », « Total indicatif : 0 € », « Merci de me rappeler. »), contact r1112-334@exemple.fr : réponse 200, « Merci… » ; le message compte dans le fil mais le connecteur ne le rend pas ; le détail d'administration garde les trois lignes. Reste à l'humain : dans le dossier Spam, ouvrir le message de 21:00 (heure de Paris) dont le contact est r1112-334@exemple.fr et vérifier que sous « Votre message : » chaque ligne commence par `  > ` et que la seule ligne qui commence par « Total indicatif » est celle du produit (40 €) |

## 34. Le seuil des demandes par origine — change 012 · ticket 12

Constat de l'origine que Cloudflare attribue réellement à chaque envoi, qui ne se voit pas en local : sans l'en-tête `CF-Connecting-IP`, tous les envois locaux comptent sous une même origine (ticket 12, FR-062). À jouer sur la recette, sur la page « Contact » qui pose le formulaire « Devis gâteau », l'adresse autorisée étant la boîte de recette, depuis un même appareil et une même connexion à internet. La fenêtre est une heure d'horloge (de 14 h 00 à 15 h 00, par exemple) : jouer CT-34.1 à CT-34.3 dans la même heure, en commençant au moins 15 minutes avant sa fin, sans autre envoi depuis cette connexion dans l'heure, § 33 compris (tout envoi compte, même refusé). La colonne Résultat reste vide tant que le cas n'a pas été joué.

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146, serveur bâti depuis af0fdfe), à 1280 px, console : vide (0 message) ; `demandes`, `fenetre_seuil` et `comptes_seuil` sans compte au départ, CT-34.1 à 34.3 dans l'heure de 19 h (UTC), de 19:10:54 à 19:11:58 ; CT-34.4 à 20:00:13

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-34.1 | Envoyer cinq demandes complètes sur « Contact » (« Fraise », « 10 parts », une adresse e-mail), en rechargeant la page entre deux envois | Chaque envoi affiche « Merci, votre demande a été envoyée. » ; cinq e-mails arrivent dans la boîte de recette | OK — 2026-11-12, heure de 19 h (UTC) : cinq envois (r1112-341-client1 à client5, de 19:10:54 à 19:11:23), page rechargée avant chacun ; chacun affiche « Merci, votre demande a été envoyée. », qui reçoit le focus, et plus aucun champ n'est visible (réponses 200 en 0,9 à 5,5 s) ; les cinq demandes sont « parti » en base et les cinq e-mails sont dans la boîte de réception (fil « Demande de devis — Devis gâteau », 5 messages de 19:10:54 à 19:11:23) |
| CT-34.2 | Dans la même heure, depuis le même appareil, envoyer une sixième demande complète | « Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure. » paraît et reçoit le focus ; « Fraise », « 10 parts » et l'adresse restent saisis ; le bouton « Envoyer ma demande » est de nouveau actif ; aucun sixième e-mail n'arrive. Dans les outils de développement, onglet Réseau, la réponse de `/api/public/demandes` est un 429 sans en-tête `Set-Cookie` (SC-12f, SC-12g) | OK — 2026-11-12, 19:11:31, sixième envoi (r1112-342-client6) : « Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure. » paraît et reçoit le focus ; « Fraise — 10 € », « 10 parts — 30 € » et l'adresse restent saisis, « Envoyer ma demande » reste actif ; réponse 429 en 85 ms, sans `Set-Cookie` ; aucune sixième demande en base, le fil Gmail reste à 5 messages (capture `CT-34.2-refus.png`) |
| CT-34.3 | Dans la même heure, depuis le même appareil, dans un autre onglet, soumettre l'adresse autorisée sur `/admin/connexion` | L'écran ne dit pas « Trop de tentatives de connexion… » et le code arrive dans la boîte de recette : la connexion a son propre seuil (SC-12d) | OK — 2026-11-12, 19:11:58, même navigateur, autre onglet : l'adresse autorisée soumise sur `/admin/connexion` (réponse 200) ne montre aucun « Trop de tentatives… » et le code arrive à 19:11:58 (fil « Votre code de connexion ») : la connexion a son propre seuil |
| CT-34.4 | Après le début de l'heure suivante, revenir à l'onglet de CT-34.2 et, sans recharger, actionner de nouveau « Envoyer ma demande » | « Merci, votre demande a été envoyée. » ; l'e-mail arrive (SC-12c) | OK — 2026-11-12, 20:00:13, onglet de CT-34.2 non rechargé (adresse r1112-342-client6 toujours saisie) : « Envoyer ma demande » → réponse 200 en 1,3 s, « Merci, votre demande a été envoyée. » reçoit le focus ; la demande est « parti » en base et l'e-mail de client6 est arrivé à 20:00:13 dans la boîte de réception |

## 35. La liste des demandes — change 013 · ticket 03

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; CT-35.1 sur les demandes de CT-34.1, CT-35.3 après les avoir effacées, CT-35.2 dans l'heure de 20 h (UTC), après le § 33

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-35.1 | Ouvrir « Demandes » depuis le menu, au téléphone (tiroir) | La liste s'ouvre, « Demandes » est marquée active ; chaque demande se lit en carte empilée : date, formulaire, page, coordonnée, total, suite | OK — 2026-11-12, 360 px : « Demandes » ouverte par le tiroir (« Ouvrir le menu »), marquée active (`aria-current="page"`) ; chaque demande de CT-34.1 se lit en carte empilée (294 px de large) : date (« 12 novembre 2026 à 20:11 », heure de Paris), « Devis gâteau », « Contact », la coordonnée, « 40 € », la liste de la suite (« À renseigner ») ; `scrollWidth` 360, console vide (capture `CT-35.1-liste-360.png`) |
| CT-35.2 | Envoyer une demande dont l'e-mail ne peut pas partir, puis ouvrir la liste | La ligne porte la pastille « E-mail non parti » | OK — 2026-11-12, 20:00:57 : l'adresse autorisée (ligne 7) sauvegardée, remplacée en base pour un seul envoi par une adresse non vérifiée, puis rétablie 5 s plus tard (20:00:54 → 20:00:59) ; vérification `count(*)` 1, `sum(adresse = '<sauvegarde>')` 1, `id` 7. Le visiteur lit « Merci, votre demande a été envoyée. » (200), la demande (r1112-352) est gardée en `non-parti`, aucun e-mail n'arrive (fil Gmail resté à 9 messages), et sa carte seule porte la pastille « E-mail non parti » (capture `CT-35.2-non-parti-360.png`) |
| CT-35.3 | Ouvrir la liste sans aucune demande | « Aucune demande n'est encore arrivée. Les demandes envoyées depuis les formulaires du site paraîtront ici. » | OK — 2026-11-12, base sans demande : « 0 demande · 0 commande », puis « Aucune demande n’est encore arrivée. Les demandes envoyées depuis les formulaires du site paraîtront ici. » ; console vide |

## 36. Filtrer et parcourir les demandes — change 013 · ticket 04

CT-36.3 et CT-36.4 partent de demandes semées en base : le seuil par origine (cinq envois par heure, § 34) empêche d'en réunir plus de 50 par le formulaire, et un formulaire retiré du site ne s'obtient qu'en semant un `formulaire_id` absent de `content/formulaires/`. Sur la base locale du § 0.2, `wrangler dev` arrêté ou en marche, semer 55 demandes de « Devis gâteau », une par minute, puis 2 demandes du formulaire « Ancien devis », que le site ne déclare pas :

```sh
npx wrangler d1 execute DB --local --command "with recursive n(i) as (select 1 union all select i + 1 from n where i < 55) insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) select 'recette-36-' || i, 'devis-gateau', 'Devis gâteau', 'a-renseigner', 'presente', 1767225600000 + i * 60000, 'Contact', null, 'c-' || i || '@exemple.fr', '[]', 'parti' from n;"
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-36-ancien-1', 'ancien-devis', 'Ancien devis', 'a-renseigner', 'presente', 1767400000000, 'Contact', null, 'ancien-1@exemple.fr', '[]', 'parti'), ('recette-36-ancien-2', 'ancien-devis', 'Ancien devis', 'a-renseigner', 'presente', 1767400060000, 'Contact', null, 'ancien-2@exemple.fr', '[]', 'parti');"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-36-%';"
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; semis et effacement du préalable joués par `recette.mjs sql` avec les requêtes du cahier, base sans autre demande (57 demandes en tout : 55 « Devis gâteau », 2 « Ancien devis »)

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-36.1 | Avec des demandes de deux formulaires, ouvrir « Demandes » au téléphone et toucher le nom d'un formulaire dans la rangée « Formulaire : » | Seules les demandes de ce formulaire restent, la plus récente d'abord ; son nom est marqué comme courant | OK — 2026-11-12, 360 px, « Devis gâteau » touché : seules ses demandes restent (`?formulaire=devis-gateau`), la plus récente d'abord (1 janvier 2026 à 01:55), son nom marqué courant (`aria-current`) ; même chose pour « Ancien devis » (deux demandes, 3 janvier 2026 à 01:27 puis 01:26) |
| CT-36.2 | Depuis ce filtre, toucher « Tous » | Les demandes de tous les formulaires reparaissent | OK — 2026-11-12 : « Tous » touché : les deux formulaires reparaissent, 50 demandes sur la page 1, « Page 1 sur 2 », « Tous » marqué courant |
| CT-36.3 | Les demandes du préalable semées, ouvrir « Demandes » au téléphone, toucher « Demandes plus anciennes » puis « Demandes plus récentes » ; refaire le parcours après avoir touché « Devis gâteau » dans la rangée « Formulaire : » | « Page 2 sur N » paraît puis on revient à la première page ; le filtre choisi est gardé d'une page à l'autre | OK — 2026-11-12 : « Demandes plus anciennes » : « Page 2 sur 2 » (7 demandes, `?page=2`), puis « Demandes plus récentes » ramène à la page 1 ; filtré sur « Devis gâteau », la page 2 (5 demandes, `?formulaire=devis-gateau&page=2`) garde le filtre dans l'adresse et dans la rangée, et le retour à la page 1 aussi |
| CT-36.4 | Les demandes du préalable semées, ouvrir « Demandes » au téléphone, repérer « Ancien devis » dans la rangée « Formulaire : » et le toucher | Elles restent listées sous son nom et le filtre le propose toujours | OK — 2026-11-12 : « Ancien devis », que le site ne déclare pas, figure dans la rangée « Formulaire : » (Tous, Ancien devis, Devis gâteau) et dans le tableau (2 / 0) ; touché, ses deux demandes restent listées sous son nom |

## 37. Les nombres du site et de chaque formulaire — change 013 · ticket 05

La suite « Commande » ne se choisit pas encore depuis l'administration, le seuil par origine (§ 34) empêche de réunir plus de 50 demandes par le formulaire et le retrait n'existe pas encore : les cas partent de demandes semées en base. Sur la base locale du § 0.2, `wrangler dev` arrêté ou en marche, semer 55 demandes de « Devis gâteau », une par minute, dont les 3 premières de suite « Commande », puis 3 demandes de « Devis atelier » :

```sh
npx wrangler d1 execute DB --local --command "with recursive n(i) as (select 1 union all select i + 1 from n where i < 55) insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) select 'recette-37-' || i, 'devis-gateau', 'Devis gâteau', case when i <= 3 then 'commande' else 'a-renseigner' end, 'presente', 1767225600000 + i * 60000, 'Contact', null, 'c-' || i || '@exemple.fr', '[]', 'parti' from n;"
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-37-atelier-1', 'devis-atelier', 'Devis atelier', 'a-renseigner', 'presente', 1767400000000, 'Contact', null, 'atelier-1@exemple.fr', '[]', 'parti'), ('recette-37-atelier-2', 'devis-atelier', 'Devis atelier', 'a-renseigner', 'presente', 1767400060000, 'Contact', null, 'atelier-2@exemple.fr', '[]', 'parti'), ('recette-37-atelier-3', 'devis-atelier', 'Devis atelier', 'a-renseigner', 'presente', 1767400120000, 'Contact', null, 'atelier-3@exemple.fr', '[]', 'parti');"
```

À semer seulement pour CT-37.4, deux témoins de retrait ordinaire de « Devis gâteau », l'un de suite « Commande », l'autre « Sans suite » :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat) values ('recette-37-retiree-1', 'devis-gateau', 'Devis gâteau', 'commande', 'retiree'), ('recette-37-retiree-2', 'devis-gateau', 'Devis gâteau', 'sans-suite', 'retiree');"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-37-%';"
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; semis et effacements du préalable joués par `recette.mjs sql` avec les requêtes du cahier, base sans autre demande ; CT-37.2 joué sur la base vidée de ses 5 demandes réelles

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-37.1 | Les demandes du préalable semées, sans les témoins retirés, ouvrir « Demandes » au téléphone | En haut, « N demandes · N commandes » puis un tableau Formulaire / Demandes / Commandes, formulaires par nom, lisible sans défiler de côté | OK — 2026-11-12 : semis sans les témoins : « 58 demandes · 3 commandes », tableau Formulaire / Demandes / Commandes (Devis atelier 3 / 0, Devis gâteau 55 / 3), formulaires par leur nom ; à 360 px, `scrollWidth` 360, le tableau finit à 328 px (capture `CT-37.1-nombres-360.png`) |
| CT-37.2 | Sans aucune demande, ouvrir « Demandes » | « 0 demande · 0 commande », aucun tableau | OK — 2026-11-12, base sans demande : « 0 demande · 0 commande », aucun tableau, puis « Aucune demande n’est encore arrivée. Les demandes envoyées depuis les formulaires du site paraîtront ici. » |
| CT-37.3 | Les demandes du préalable semées, toucher « Devis gâteau » dans la rangée « Formulaire : » puis « Demandes plus anciennes » | Les nombres du haut et du tableau ne changent pas | OK — 2026-11-12 : après « Devis gâteau » puis « Demandes plus anciennes » (page 2 sur 2, filtrée), « 58 demandes · 3 commandes » et le tableau (3 / 0, 55 / 3) sont inchangés |
| CT-37.4 | Les témoins retirés du préalable semés en plus, ouvrir « Demandes » au téléphone | « · 2 retirées » suit les nombres du haut ; le tableau porte la colonne Retirées ; il se lit sans défiler de côté | OK — 2026-11-12 : témoins semés en plus : « 58 demandes · 4 commandes · 2 retirées » (le témoin retiré de suite « Commande » compte parmi les commandes), tableau avec la colonne Retirées (Devis atelier 3/0/0, Devis gâteau 55/4/2) ; les en-têtes se suivent sans se chevaucher (de 32 à 328 px), `scrollWidth` 360, console vide (capture `CT-37.4-retirees-360.png`) |

## 38. Le détail d'une demande — change 013 · ticket 06

Le retrait n'existe pas encore et l'envoi est borné par le seuil par origine (§ 34) : la demande se sème en base, sur la base locale du § 0.2 :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-38-message', 'devis-gateau', 'Devis gâteau', 'a-renseigner', 'presente', 1767225600000, 'Contact', null, 'marie@exemple.fr', '[{\"etiquette\":\"Votre nom\",\"valeur\":\"Marie Dupont\"},{\"etiquette\":\"Votre message\",\"lignes\":[\"Bonjour,\",\"\",\"mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm\",\"Merci\"]}]', 'non-parti');"
```

Après les cas, l'effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-38-%';"
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; semis et effacement du préalable joués par `recette.mjs sql` avec les requêtes du cahier

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-38.1 | La demande semée, ouvrir « Demandes » au téléphone puis toucher sa date | Sous « Votre message » : « Bonjour, », une ligne vide qui garde sa place, le mot long, « Merci », l'un sous l'autre | OK — 2026-11-12, 360 px, détail ouvert depuis sa date (« 1 janvier 2026 à 01:00 ») : sous « Votre message », « Bonjour, », une ligne vide qui garde sa place (24 px de haut), le mot long, « Merci », l'un sous l'autre |
| CT-38.2 | Même écran, au téléphone (360 px) | Le mot de 80 caractères passe à la ligne, aucun défilement de côté | OK — 2026-11-12 : le mot long (82 « m » dans la requête du cahier) passe sur quatre lignes (88 px pour 22 px d'interligne, 296 px de large), `scrollWidth` 360 (capture `CT-38-detail-360.png`) |
| CT-38.3 | Même écran | La pastille « E-mail non parti » et sa mention sous le titre, « Demandes » marquée active dans le menu, et le lien « ← Toutes les demandes » ramène à la liste | OK — 2026-11-12 : pastille « E-mail non parti » et, sous le titre, « L’e-mail de cette demande n’a pas pu partir : elle n’est connue que d’ici. » ; « Demandes » marquée active dans le menu (`aria-current="page"`) ; « ← Toutes les demandes » ramène à `/admin/demandes` ; console vide. Remarque : à 360 px, les deux-points passent en début de ligne (« partir » / « : elle n’est… »), faute d'espace insécable |

## 39. Noter la suite d'une demande — change 013 · ticket 07

Les demandes se sèment en base, sur la base locale du § 0.2 :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-39-suite', 'devis-gateau', 'Devis gâteau', 'devis-envoye', 'presente', 1792238700000, 'Contact', null, 'marie@exemple.fr', '[]', 'parti'), ('recette-39-neuve', 'devis-gateau', 'Devis gâteau', 'a-renseigner', 'presente', 1792242300000, 'Contact', null, 'paul@exemple.fr', '[]', 'parti');"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-39-%';"
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; semis et effacement du préalable joués par `recette.mjs sql` avec les requêtes du cahier

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-39.1 | Au téléphone (360 px), ouvrir « Demandes » | La liste déroulante de la ligne du 17 octobre 2026 à 14:05 mesure au moins 44 px de haut (getBoundingClientRect) ; choisie au pouce, « Commande » s'y pose ; le nombre de commandes de la phrase du haut et la cellule « Commandes » de « Devis gâteau » augmentent de 1, sans rechargement (SC-07b) | OK — 2026-11-12, 360 px : la liste de la ligne du 17 octobre 2026 à 14:05 mesure 135 × 44 px ; « Commande » choisie s'y pose (réponse 200) ; « 2 demandes · 0 commande » devient « 2 demandes · 1 commande » et la cellule « Commandes » de « Devis gâteau » passe de 0 à 1, sans rechargement (témoin posé dans la page, toujours là après). Choix fait par le navigateur piloté, pas au pouce |
| CT-39.2 | Recharger, puis toucher la date pour ouvrir le détail | La ligne et la liste déroulante du détail portent toujours « Commande » (SC-07a) | OK — 2026-11-12 : après rechargement, la ligne porte « Commande » ; le détail ouvert par la date aussi ; en base `commande` |
| CT-39.3 | La ligne de la demande neuve (15:05) | La liste montre « À renseigner », que l'on ne peut pas choisir (grisée) ; « Sans suite », « Devis envoyé » et « Commande » se choisissent | OK — 2026-11-12 : ligne de 15:05 : « À renseigner » affiché et inactif ; « Sans suite », « Devis envoyé » et « Commande » se choisissent |
| CT-39.4 | Avec un lecteur d'écran (NVDA ou VoiceOver), mettre le focus sur la liste de la ligne de 14:05 | Elle est annoncée « Suite de la demande du 17 octobre 2026 à 14:05 » | À jouer par l'opérateur — 2026-11-12, joué au navigateur piloté jusqu'à l'arbre d'accessibilité : focus posé sur la liste de la ligne de 14:05, son nom accessible est « Suite de la demande du 17 octobre 2026 à 14:05 » (`aria-label`), rôle liste déroulante, valeur « Commande ». Reste à l'humain : avec NVDA ou VoiceOver, Tab jusqu'à cette liste (ligne de 14:05) et écouter qu'elle est annoncée « Suite de la demande du 17 octobre 2026 à 14:05 » |
| CT-39.5 | Outils → Réseau → bloquer l'URL de requête `/admin/demandes/recette-39-suite/suite`, puis choisir une autre suite dans la liste | La liste revient à la suite d'avant ; « La suite n'a pas pu être enregistrée. Réessayez dans quelques instants. » paraît sous la ligne, et le lecteur d'écran l'annonce sans couper la lecture ; après déblocage et rechargement, la demande porte toujours la suite d'avant (SC-07c) | OK — 2026-11-12 : `/admin/demandes/recette-39-suite/suite` bloquée par le navigateur (une requête interceptée), « Sans suite » choisi dans la liste : elle revient à « Commande » ; « La suite n'a pas pu être enregistrée. Réessayez dans quelques instants. » paraît juste sous la liste (écart 0 px), dans une région `aria-live="polite"` (annonce non écoutée au lecteur d'écran) ; après déblocage et rechargement, toujours « Commande » |
| CT-39.6 | Même blocage, depuis l'écran du détail | Même retour, même message, sous la liste du détail (SC-07c) | OK — 2026-11-12 : même blocage depuis le détail : même retour à « Commande », même message juste sous la liste du détail (écart 0 px), même région polie ; après rechargement, toujours « Commande » (en base `commande`) |

## 40. Retirer une demande depuis son détail — change 013 · ticket 08

Les demandes se sèment en base, sur la base locale du § 0.2 :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-40-a', 'devis-gateau', 'Devis gâteau', 'devis-envoye', 'presente', 1792238700000, 'Contact', null, 'Marie Dupont marie@exemple.fr', '[]', 'parti'), ('recette-40-b', 'devis-gateau', 'Devis gâteau', 'commande', 'presente', 1792242300000, 'Contact', null, 'Paul Martin paul@exemple.fr', '[]', 'parti');"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-40-%';"
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; semis et effacement du préalable joués par `recette.mjs sql` avec les requêtes du cahier

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-40.1 | Au clavier seul, ouvrir le détail de la demande de Marie Dupont, atteindre « Retirer cette demande », l'activer | Le dialogue s'ouvre, le focus est sur « Annuler » ; Tab et Maj+Tab ne sortent jamais du dialogue ; « Retirer » est inactif tant qu'aucun motif n'est choisi, aucun motif n'est coché d'avance | OK — 2026-11-12, au clavier seul : dix Tab jusqu'à la date de la demande de Marie Dupont, Entrée, cinq Tab jusqu'à « Retirer cette demande », Entrée ; le focus est sur « Annuler » ; huit Tab puis huit Maj+Tab restent tous dans le dialogue ; « Retirer » inactif, aucun motif coché |
| CT-40.2 | Dans le dialogue, appuyer sur Échap | Le dialogue se ferme, le focus revient sur « Retirer cette demande » ; la demande reste dans la liste avec sa suite (SC-08b) | OK — 2026-11-12 : Échap ferme le dialogue, le focus revient sur « Retirer cette demande » ; dans la liste, la demande de 14:05 (marie@exemple.fr) reste avec « Devis envoyé », « 2 demandes · 1 commande » |
| CT-40.3 | Avec un lecteur d'écran (NVDA ou VoiceOver), ouvrir le dialogue | Il est annoncé comme dialogue, avec son titre « Retirer cette demande ? » et son texte ; les deux motifs sont annoncés comme boutons radio d'un groupe « Raison du retrait » | À jouer par l'opérateur — 2026-11-12, joué au navigateur piloté jusqu'à l'arbre d'accessibilité : le dialogue a le rôle `dialog` (`aria-modal="true"`), le nom « Retirer cette demande ? » et une description (« Tout ce que les visiteurs ont envoyé… ») ; les deux motifs sont des boutons radio d'un groupe nommé « Raison du retrait ». Reste à l'humain : avec NVDA ou VoiceOver, ouvrir « Retirer cette demande » sur le détail d'une demande et écouter l'annonce du dialogue, de son titre, de son texte et des deux boutons radio du groupe |
| CT-40.4 | Choisir « Retrait ordinaire », puis « Retirer » | « Retrait en cours… » est annoncé, puis l'écran mène à la liste à jour : la demande de Marie Dupont n'y est plus, le nombre « retirée » de la phrase du haut gagne 1 (SC-08a) | OK — 2026-11-12 : « Retrait ordinaire » puis « Retirer » (réponse retardée de 1,5 s par le navigateur pour voir l'attente) : « Retrait en cours… » dans une région `aria-live="polite"`, puis l'écran mène à `/admin/demandes` : la demande de Marie Dupont n'y est plus, « 2 demandes · 1 commande » devient « 1 demande · 1 commande · 1 retirée » ; en base `retiree`, coordonnée et détail effacés |
| CT-40.5 | Outils → Réseau → bloquer l'URL `/admin/demandes/retrait`, ouvrir le dialogue d'une demande, choisir un motif, « Retirer » | Le message « Le retrait n'a pas pu se faire : aucune demande n'a été retirée. Réessayez dans quelques instants. » est annoncé dans le dialogue, qui reste ouvert ; la demande reste dans la liste | OK — 2026-11-12 : `/admin/demandes/retrait` bloquée par le navigateur, dialogue de la demande de Paul Martin, « Retrait ordinaire », « Retirer » : « Le retrait n’a pas pu se faire : aucune demande n’a été retirée. Réessayez dans quelques instants. » dans le dialogue (`role="alert"`), qui reste ouvert ; la demande de Paul Martin reste listée |

## 41. Retirer plusieurs demandes en un geste depuis la liste — change 013 · ticket 09

Sur la base locale du § 0.2, semer cinq demandes de « Devis gâteau » :

```sh
npx wrangler d1 execute DB --local --command "with recursive n(i) as (select 1 union all select i + 1 from n where i < 5) insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) select 'recette-41-' || i, 'devis-gateau', 'Devis gâteau', 'sans-suite', 'presente', 1792238700000 + i * 60000, 'Contact', null, 'Client ' || i || ' c' || i || '@exemple.fr', '[]', 'parti' from n;"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-41-%';"
```

Pour CT-41.7 seulement, à jouer après l'effacement des demandes `recette-41-%`, semer quarante demandes :

```sh
npx wrangler d1 execute DB --local --command "with recursive n(i) as (select 1 union all select i + 1 from n where i < 40) insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) select 'recette-41b-' || i, 'devis-gateau', 'Devis gâteau', 'sans-suite', 'presente', 1792238700000 + i * 60000, 'Contact', null, 'Client ' || i || ' s' || i || '@exemple.fr', '[]', 'parti' from n;"
```

Puis les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-41b-%';"
```

Joué le 2026-11-12 sur https://colibri.sebc.dev, à 360 × 740 px, console : vide ; semis et effacements du préalable joués par `recette.mjs sql` avec les requêtes du cahier ; CT-41.7 joué en premier, sur la base vidée de ses demandes ; CT-41.5 joué après CT-41.6

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-41.1 | Au téléphone, ouvrir « Demandes » et cocher trois cases | Chaque case mesure au moins 44 px ; son nom annoncé est « Sélectionner la demande du <date et heure>, Client N cN@exemple.fr » (la coordonnée de sa ligne) ; une barre fixe en bas de l'écran dit « 3 demandes sélectionnées » (SC-09b) | OK — 2026-11-12, 360 px, cinq demandes semées : chaque case mesure 44 × 44 px, son nom est « Sélectionner la demande du 17 octobre 2026 à 14:10, Client 5 c5@exemple.fr » (et ainsi de suite) ; trois cases cochées, une barre fixe (`position: fixed`, bas à 740 px sur 740) dit « 3 demandes sélectionnées » |
| CT-41.2 | Toucher « Retirer… » | Le dialogue « Retirer 3 demandes ? » annonce que ce que les visiteurs ont envoyé sera effacé définitivement ; rien n'est encore retiré ; aucun motif n'est coché d'avance | OK — 2026-11-12 : « Retirer… » : dialogue « Retirer 3 demandes ? », « 3 demandes vont être retirées. Tout ce que les visiteurs ont envoyé — choix, coordonnées, message — sera effacé définitivement. Ce retrait ne peut pas être annulé. » ; focus sur « Annuler », « Retirer » inactif, aucun motif coché ; les cinq demandes toujours présentes en base (capture `CT-41.2-dialogue-360.png`) |
| CT-41.3 | Choisir « Demande indésirable », puis « Retirer » | L'écran se recharge sur la même page : les trois demandes ne sont plus listées, les nombres du haut ont perdu 3 demandes et ne gagnent aucune retirée (SC-09a, SC-09e) | OK — 2026-11-12 : « Demande indésirable » puis « Retirer » : la liste revient sur la même page (`/admin/demandes`) avec Client 2 et Client 1 seulement ; « 5 demandes · 0 commande » devient « 2 demandes · 0 commande », sans retirée |
| CT-41.4 | Toucher « Tout sélectionner sur cette page », puis « Tout désélectionner » | La barre dit « 2 demandes sélectionnées » puis disparaît ; rien n'est retiré | OK — 2026-11-12 : « Tout sélectionner sur cette page » : « 2 demandes sélectionnées » ; « Tout désélectionner » : la barre disparaît ; les deux demandes restent listées |
| CT-41.5 | Depuis « Devis gâteau » dans la rangée « Formulaire : », retirer une demande | Après le retrait le filtre est gardé | OK — 2026-11-12, joué après CT-41.6 : depuis « Devis gâteau », une demande cochée et retirée (« Demande indésirable ») ; l'écran revient sur `?formulaire=devis-gateau`, « Devis gâteau » toujours marqué courant (`aria-current`), « 1 demande · 0 commande » |
| CT-41.6 | Outils → Réseau → bloquer l'URL `/admin/demandes/retrait`, cocher deux demandes, « Retirer… », un motif, « Retirer » | Le message « Le retrait n'a pas pu se faire : aucune demande n'a été retirée. Réessayez dans quelques instants. » est annoncé dans le dialogue, qui reste ouvert ; les demandes restent listées (SC-09d) | OK — 2026-11-12 : `/admin/demandes/retrait` bloquée par le navigateur, deux demandes cochées, « Retrait ordinaire », « Retirer » : « Le retrait n’a pas pu se faire : aucune demande n’a été retirée. Réessayez dans quelques instants. » dans le dialogue (`role="alert"`), qui reste ouvert ; les deux demandes restent listées |
| CT-41.7 | Effacer les demandes du § 41, vérifier que « Demandes » n'affiche plus aucune demande, semer les quarante demandes ci-dessus ; au téléphone, toucher « Tout sélectionner sur cette page », « Retirer… », « Demande indésirable », « Retirer » | Quatre actions suffisent ; la barre dit « 40 demandes sélectionnées » ; après le rechargement la liste est vide, et les nombres du haut sont revenus à ceux d'avant le semis, sans aucune retirée gagnée (UX2) | OK — 2026-11-12 : « Demandes » vide (« 0 demande · 0 commande ») ; quarante demandes semées (« 40 demandes · 0 commande ») ; « Tout sélectionner sur cette page », « Retirer… », « Demande indésirable », « Retirer » : quatre actions, la barre dit « 40 demandes sélectionnées » ; après le rechargement la liste est vide, « 0 demande · 0 commande », aucune retirée, aucune ligne en base |

## 42. Le site reste rapide avec des photos lourdes — change 014 · ticket 05

Préalable : redéployer la variante factice `photos-lourdes` (skill `site-factice`) sur `https://colibri.sebc.dev` (photo de tête + galerie de 45 photos d'environ 1 Mio). Mesures consignées ici : scores, coût par photo, qualité retenue (jamais dans l'ADR 0031).

Joué le 2026-11-12 sur https://site-photos-lourdes-colibri-recette.chauveau-sebastien.workers.dev (variante `photos-lourdes`), à 412 px (CT-42.2), console : aucun message (0 erreur, 0 avertissement)

Joué le 2026-11-02 sur la branche du ticket 05 (`96b71c1`, PR #301). La variante `photos-lourdes` est déployée par `site.mjs deployer photos-lourdes` sous `taskset -c 0,1` (2 cœurs, comme Workers Builds gratuit) à l'adresse `https://site-photos-lourdes-colibri-recette.chauveau-sebastien.workers.dev/`. Le serveur principal `https://colibri.sebc.dev` est rebâti depuis ce même commit (`recette.mjs depot`, commit `8092987` du dépôt de recette). Navigateur : `playwright-cli` 0.1.21. Qualité WebP retenue : 80, aucun levier appliqué.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-42.1 | `npx lighthouse@13` (Chromium Playwright), mobile, 3 passes sur Accueil, Tarifs, Contact | La médiane du score Performance de chaque page est d'au moins 95 (SC-05a) ; relever les 9 scores, les 3 médianes, les audits « LCP request discovery » et « Improve image delivery » | OK — 2026-11-12 : Accueil 100 / 100 / 100, médiane 100 (LCP simulé 1,5 / 1,5 / 1,6 s, TBT 40 / 10 / 0 ms) ; Tarifs 100 / 100 / 100, médiane 100 (LCP 0,9 s) ; Contact 100 / 100 / 100, médiane 100 (LCP 0,9 à 1,0 s). Aucune passe aberrante. Audit « LCP request discovery » : réussi (1) sur Accueil et Contact, sans objet sur Tarifs (pas d'image de tête). Audit « Improve image delivery » : réussi sur Tarifs et Contact ; sur Accueil score 0, économie estimée 1 023 Kio, car la tête (720 px affichée à 380 px) et les 45 cases (360 px affichées à 184 px) restent plus grandes que leur taille affichée et recompressables : conseil informatif, sans effet sur le score de 100 |
| CT-42.2 | `playwright-cli` à 412 px sur l'Accueil et son aperçu | Aucun refus `img-src` en console ; variante de 360 px chargée pour la galerie, de 720 px pour la photo de tête | OK — 2026-11-12 : côté public (agent `rapidite`) : Accueil de la variante `photos-lourdes` à 412 × 915, la tête en `photo-lourde-01-720`, les 45 cases en 360 px, 46 images, aucune vide, `scrollWidth` 412, console vide. Aperçu d'Accueil dans l'administration de `colibri.sebc.dev` (« Voir l'aperçu », `/admin/apercu/`), 20:33 UTC, page parcourue jusqu'en bas : 46 images, aucune vide, la tête en variante de 720 px (affichée à 380 px), les 45 cases en variante de 360 px (affichées à 184 px), `scrollWidth` 412, console vide, aucun refus `img-src`. Capture `CT-42.2-apercu-accueil-412.png` |
| CT-42.3 | Lire la ligne `[variantes] <n> photos, <f> fichiers, <s> s` de la construction (Workers Builds et locale) ; `find dist -type f \| wc -l` avant/après | Coût par photo relevé (signaler si > 0,5 s/photo) ; mise en ligne < 5 min (SC-004) ; 6 fichiers de plus qu'avant (119 dont 2 originaux) | OK — 2026-11-12, machine seule (charge 0,6), sous `taskset -c 0,1` : `site.mjs batir photos-lourdes` : « 46 photos déposées, 48.7 Mio », `[variantes] 48 photos, 144 fichiers, 8.3 s`, soit 0,17 s par photo de 2000 × 1500 px (~1 Mio), sous le seuil de 0,5 s ; construction complète en 48 s, 319 fichiers sous `dist`. Site de démonstration (`npm run build` au dépôt, images publiées récupérées) : `[variantes] 2 photos, 6 fichiers, 0.1 s`, `find dist -type f \| wc -l` = 135, dont 6 variantes WebP et 2 originaux PNG (le total a grandi depuis le 2026-11-03, 124, avec le code ajouté depuis ; les images restent 6 + 2). `git status --short` vide avant et après. Workers Builds : ligne `[variantes]` toujours illisible depuis la machine et aucune publication déclenchée (consigne : ne rien publier) ; la mise en ligne sous 5 min s'appuie sur les mesures du § 29 |
| CT-42.4 | Sur téléphone, regarder la photo de tête et une case de galerie | Image nette, sans artefacts | À jouer par l'opérateur — 2026-11-12 : un agent ne peut pas regarder un vrai téléphone. Geste : sur un téléphone Android (Chrome), ouvrir l'accueil de `https://colibri.sebc.dev` (pas la variante : ses photos sont du bruit aléatoire, que la réduction lisse en gris), faire une capture de la photo de tête puis d'une case de galerie. À regarder : image nette, bords francs, sans halo, sans blocs de compression visibles ; le grain du fond peut rester visible |

## 43. Créer le code de secours — change 016 · ticket 01

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), session de relecture, au navigateur piloté (`playwright-cli`, Chromium), à 360 × 740 px, console : aucun message

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-43.1 | À 360 px, ouvrir Réglages puis « Code de secours », créer le code | Aucun défilement horizontal ; le code s'affiche en groupes de quatre signes, lisible ; boutons « Imprimer » et lien « Continuer » d'au moins 44 px de haut | OK — 2026-11-12 : Réglages porte le lien « Code de secours » ; l'écran dit « Aucun code de secours n'est en place. » et offre « Créer le code de secours ». Après création : carte « Votre nouveau code de secours », code en JetBrains Mono 24 px, sept groupes sur trois lignes, aucun groupe coupé, encre rgb(23,32,28) sur blanc ; « Recopiez-le ou imprimez cette page, et rangez le papier en lieu sûr. » et « Ce code ne s'affichera plus. L'ancien ne permet plus d'entrer. ». `scrollWidth` 360, carte de 32 à 328 px, code contenu (264 px sur 264). « Imprimer » et « Continuer » : 44 px de haut chacun. En base, une ligne `code_de_secours` (empreinte de 64 signes et date, aucune valeur en clair) ; les 12 autres sessions ont été fermées, seule la mienne reste, comme le veut la spec |
| CT-43.2 | Actionner « Imprimer » (aperçu avant impression) | Une seule page, seule la carte du code est imprimée | KO — 2026-11-12 : « Imprimer » appelle bien l'impression du navigateur, mais la page imprimée est vide. Rendu en média d'impression (Chromium) : la carte du code et tout son contenu sont calculés `visibility: hidden`, rien ne paraît ; PDF A4 produit : une page, 1,2 Kio, sans aucun texte ni police. Cause lue dans la feuille servie : `body:has([data-carte-code-de-secours]) *{visibility:hidden}` l'emporte sur `[data-carte-code-de-secours] *{visibility:visible}`, car le `:has(...)` lui donne une priorité plus forte (`src/admin/admin.css`, lignes 463 à 475). « Une seule page » tient, « seule la carte est imprimée » non : rien n'est imprimé. Le rendu de la vraie boîte d'impression n'a pas été vu, mais elle applique les mêmes styles. Captures `CT-43.2-media-impression.png` (page blanche) et `CT-43.2-impression.pdf` |
| CT-43.3 | Cliquer « Continuer » puis revenir en arrière | L'écran dit la date de mise en place ; le code ne s'affiche plus | OK — 2026-11-12 : « Continuer » mène à « Code de secours », qui dit « Un code de secours est en place depuis le 12 novembre 2026. » et offre « Remplacer le code de secours » ; retour arrière : même texte, le code n'y paraît pas (vérifié aussi sans les espaces), aucun nouveau code créé (toujours une seule ligne en base, même date) |

## 44. Entrer par le code de secours — change 016 · ticket 02

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), navigateur sans session ni cookie (`-s=secours-2`), à 360 × 740 px, console : aucun message

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-44.1 | Dans une fenêtre de 360 px de large, ouvrir `/admin/reprise` | L'écran de saisie ne fait pas défiler la page horizontalement | OK — 2026-11-12 : l'écran de connexion porte le lien « Je n'ai plus accès à ma boîte e-mail » vers `/admin/reprise`. Écran « Entrer avec le code de secours » : « Saisissez le code de secours que vous avez noté sur papier. », champ « Code de secours », bouton « Entrer », lien « ← Revenir à la connexion par e-mail » ; `scrollWidth` 360, aucun défilement horizontal ; aucun terme de développeur |
| CT-44.2 | Saisir un code de 26 signes en groupes de quatre séparés par des espaces (par exemple « ABCD EFGH JKMN PQRS TVWX YZ01 23 ») | Le code tient dans le champ sans déborder de la carte | KO — 2026-11-12 : « ABCD EFGH JKMN PQRS TVWX YZ01 23 » saisi (32 signes avec les espaces) : le champ reste dans la carte (champ de 32 à 328 px, carte de 16 à 344 px, `scrollWidth` 360), mais le code ne tient pas dans le champ : le texte mesure 321 px pour 294 px visibles, il défile dans le champ et son début « AB » sort à gauche (capture `CT-44.2-saisie-360.png`). Le champ est une ligne unique (Instrument Sans 16 px) ; le ticket 02 et l'`ux.md` du change 016 le voulaient « assez large pour 26 signes groupés », passant « à la ligne sans déborder à 360 px » |

## 45. Le code de secours ne sert qu'une fois — change 016 · ticket 03

Joué le 2026-11-12 sur https://colibri.sebc.dev (main 9db5146), appareil neuf : navigateur sans cookie (`-s=secours-2`), à 360 × 740 px ; premier appareil : la session de relecture (`-s=secours`) ; contrôles par requêtes directes (curl, cookies neufs) ; boîte relue dans Gmail ; console : aucun message

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-45.1 | SC-020 : boîte e-mail inaccessible, appareil neuf, saisir le code de secours sur `/admin/reprise` | Une session s'ouvre ; un nouveau code s'affiche une seule fois ; « Continuer vers l'accueil » mène à « Mes pages » ; la liste des demandes est accessible | OK — 2026-11-12 : code du § 43 saisi sur `/admin/reprise` depuis l'appareil neuf, 20:37:18 UTC : une session s'ouvre ; carte « Votre nouveau code de secours », nouveau code de 26 signes (groupes 4,4,4,4,4,4,2), différent de l'ancien, avec « Ce code ne s'affichera plus. L'ancien ne permet plus d'entrer. » et « Les autres appareils connectés devront se reconnecter. » ; l'adresse de page reste `/admin/reprise`, sans code. « Continuer vers l'accueil » mène à « Mes pages » ; « Demandes » s'ouvre (« 5 demandes · 0 commande »). Aucun message parti (boîte relue, rien après 20:33:30). Spec vivante : la session du premier appareil est fermée (`/admin/mes-pages` renvoie vers `/admin/connexion`), une seule ligne `sessions` en base ; l'ancien code rejoué : « Ce code n'a pas permis d'entrer. Vérifiez chaque signe, puis réessayez. », sans session, corps et en-têtes identiques au signe près à ceux d'un code faux ; toujours une seule ligne `code_de_secours` (empreinte de 64 signes, date de l'emploi), aucune valeur en clair. Le nouveau code, saisi en minuscules avec des tirets, ouvre à son tour (20:38:17) : réponse `Cache-Control: no-store`, cookie `__Host-session` avec `Path=/; HttpOnly; Secure; SameSite=Strict` ; la session de l'appareil neuf est alors fermée à son tour |
| CT-45.2 | À 360 px, l'écran du nouveau code | Aucun défilement horizontal ; lien d'accueil d'au moins 44 px de haut ; la ligne sur les autres appareils est lisible | OK — 2026-11-12 : écran du nouveau code à 360 px : `scrollWidth` 360 ; carte de 16 à 344 px, code contenu (296 px sur 296) ; « Continuer vers l'accueil » : 44 px de haut (vers `/admin/`), « Imprimer » : 44 px ; « Les autres appareils connectés devront se reconnecter. » en 15 px, encre rgb(23,32,28) sur blanc, deux lignes, contenue dans la carte ; aucun terme de développeur. L'impression de cet écran a le même défaut que CT-43.2 (même carte, même règle) |

## 46. Proposer une nouvelle adresse — change 017 · ticket 02

Joué le 2026-11-12 sur colibri.sebc.dev, à 360 px, console : aucun message (0 erreur, 0 avertissement). CT-46.2 n'est pas rejoué : l'opérateur l'a joué le matin même.

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-46.1 | Sur `colibri.sebc.dev`, proposer une seconde boîte sur l'écran « Adresse e-mail » | Le message de Cloudflare arrive dans cette boîte, en anglais ; son bouton porte à la lettre le libellé « Verify email address » cité à l'écran (UX3) | OK — 2026-11-12 : alias neuf `chauveau.sebastien+recette1112@gmail.com` proposé à 22:31:46 UTC ; inscrit chez Cloudflare à 22:31:49 (« pending »), une ligne de plus dans `messages_remplacement` (16) ; message « [Action required] Verify your Email Routing address » de `noreply@notify.cloudflare.com` reçu à 22:31:54 (+5 s), en boîte de réception, en anglais, dans un fil à lui ; bouton « Verify email address », identique à la lettre au libellé de l'écran (UX3). À 360 px, la page ne défile pas (largeur 360) |
| CT-46.2 | Avec la clé limitée aux adresses, appeler l'API des règles de routage d'Email Routing (`/email/routing/rules`) | L'API refuse (preuve de la mitigation M2) ; sortie conservée | OK — 2026-11-12 : clé limitée à « Email Routing Addresses Edit », jouée par l'humain dans son terminal. Contrôle : `GET /accounts/<compte>/email/routing/addresses` réussit et liste les adresses de destination. Preuve : `GET /zones/<sebc.dev>/email/routing/rules` répond `HTTP 403`, `{"success":false,"errors":[{"code":10000,"message":"Authentication error"}],"result":null}` |
| CT-46.3 | Sur `colibri.sebc.dev`, proposer sur l'écran « Adresse e-mail » une adresse déjà inscrite parmi les adresses de destination du compte (y compris quand le compte en compte plus d'une page, pour constater la pagination de la liste) | Aucun nouveau message de confirmation n'arrive ; l'écran passe à l'étape 1 (« Un message va arriver à … ») et l'adresse autorisée ne change pas ; noter la forme réelle de la réponse de la liste (pagination, taille de page par défaut) pour le ticket 03 | OK — 2026-11-12 : alias `+recette017`, déjà inscrit et vérifié au compte, proposé à 22:31:28 UTC : étape 1 « Un message va arriver à chauveau.sebastien+recette017@gmail.com… », l'adresse en place redite ; aucun message de Cloudflare reçu (dernier pour cet alias : le 10 novembre), `messages_remplacement` reste à 15 lignes, `codes_remplacement` à 12, l'adresse autorisée ne change pas. Proposition abandonnée en proposant l'alias neuf de CT-46.1, qui l'a remplacée (`remplacement_adresse` ne porte plus que lui). Quatre adresses au compte avant l'essai : la seconde page de la liste ne se voit toujours pas |

## 47. Le code part après la confirmation — change 017 · ticket 03

Joué le 2026-11-12 sur colibri.sebc.dev, à 360 px, console : aucun message (0 erreur, 0 avertissement)

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-47.1 | Sur `colibri.sebc.dev`, proposer une seconde boîte, puis presser « J'ai cliqué sur le bouton » sans avoir cliqué dans le message de Cloudflare | Message ambre « Le clic n'a pas encore été enregistré… » ; aucun code n'arrive dans la boîte | OK — 2026-11-12 : alias neuf proposé, bouton pressé à 22:31:59 UTC avant tout clic dans le message de Cloudflare (adresse encore « pending ») ; message à la lettre « Le clic n'a pas encore été enregistré. Vérifiez vos courriers indésirables, cliquez sur le bouton du message, puis réessayez. », sur fond ambre (`rgb(252, 239, 210)`) ; `codes_remplacement` reste à 12 lignes, aucun message compté, aucun code reçu |
| CT-47.2 | Cliquer sur « Verify email address » dans le message, puis presser « J'ai cliqué sur le bouton » | L'écran dit « Un code vient de partir vers … » avec le champ Code ; un message « Confirmez votre nouvelle adresse », en texte seul, arrive dans la nouvelle boîte, expédié depuis l'adresse d'expédition de l'instance, avec « Code : » et huit signes | OK — 2026-11-12 : clic humain enregistré par Cloudflare à 22:39:52, bouton pressé de nouveau à 22:41:00 (le premier essai, à +0,6 s, a fait patienter : CT-48.1) ; « Un code vient de partir vers chauveau.sebastien+recette1112@gmail.com. » avec le champ Code ; code en base à 22:41:02, aucune ligne d'échec au journal du serveur ; le message « Confirmez votre nouvelle adresse » de `code@colibri.sebc.dev` est arrivé (lu par l'humain, dans les indésirables, a confirmé l'opérateur ; le connecteur Gmail ne le voit pas, signe qu'il est dans les indésirables) et son successeur a servi à la bascule |
| CT-47.3 | Presser « Recevoir un nouveau code » | Un second message arrive ; seul le code du second est valable (ticket 04) | OK — 2026-11-12 : « Recevoir un nouveau code » pressé à 22:41:17 ; second code en base à 22:41:18, le premier annulé à la même seconde (`annule_le`) ; les deux messages sont arrivés. Le premier code, recopié à 22:44:55, est refusé : « Ce code ne peut plus servir. Demandez-en un nouveau. », sans compter d'essai ; le second, recopié à 22:45:06, bascule l'adresse : « C'est fait : votre adresse est désormais chauveau.sebastien+recette1112@gmail.com. Vos codes de connexion et vos demandes de devis y arriveront. Vos autres appareils devront se reconnecter. » puis « Un message a prévenu votre ancienne adresse, chauveau.sebastien@gmail.com. » (page à 360 px, sans défilement). Avis « L'adresse de votre administration a changé » reçu à 22:45:07 dans la boîte d'origine (boîte de réception), en texte seul, nommant la nouvelle adresse et la date, renvoyant au code de secours, sans aucun code ; la session du second appareil, ouverte avant, renvoie à l'écran de connexion, la mienne reste ouverte |

## 48. Une confirmation de moins d'une minute fait patienter — change 018 · ticket 01

Joué le 2026-11-12 sur colibri.sebc.dev, à 360 px, console : aucun message (0 erreur, 0 avertissement)

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-48.1 | Sur `colibri.sebc.dev`, cliquer dans le message de Cloudflare puis presser aussitôt « J'ai cliqué sur le bouton » | Message ambre « Votre clic est bien enregistré… Patientez une minute » ; aucun code n'arrive ; l'adresse en place est redite | OK — 2026-11-12 : clic humain enregistré par Cloudflare à 22:39:52.708 UTC, bouton pressé à 22:39:53.300 (+0,6 s) ; message à la lettre « Votre clic est bien enregistré. Il faut encore un instant avant que le code puisse partir. Patientez une minute, puis appuyez de nouveau sur « J'ai cliqué sur le bouton ». », sur fond ambre (`rgb(252, 239, 210)`) ; aucun code en base (12 lignes), `messages_remplacement` inchangé (16) ; « votre adresse reste chauveau.sebastien@gmail.com » redit |
| CT-48.2 | Attendre une minute puis presser de nouveau « J'ai cliqué sur le bouton » | « Un code vient de partir vers … » ; le code arrive dans la nouvelle boîte | OK — 2026-11-12 : pressé de nouveau à 22:41:00 (+67 s) ; « Un code vient de partir vers chauveau.sebastien+recette1112@gmail.com. » puis « Recopiez-le ici. Il reste bon quinze minutes. » avec le champ Code ; code en base à 22:41:02, message compté (17) ; aucune ligne d'échec au journal du serveur ; le message est arrivé dans la nouvelle boîte (lu par l'humain, dans les indésirables, a confirmé l'opérateur, invisible au connecteur Gmail) |

## 49. Une adresse longue se lit en entier sur un téléphone — change 018 · ticket 04

Joué le 2026-11-12 EN LOCAL (pas sur colibri.sebc.dev), Chromium (`playwright-cli -s=secours-local`) à 360 × 740 px, console : aucun message

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-49.1 | À 360 px de large (`playwright-cli`), sur l'écran « Adresse e-mail », avec une adresse autorisée d'au moins quarante signes, ouvrir l'écran au repos, puis proposer une nouvelle adresse d'au moins quarante signes (étape de la confirmation), presser « J'ai cliqué sur le bouton » (étape du code) et enfin recopier le code (réussite) | À chaque étape, l'adresse revient à la ligne dans sa carte, aucun signe n'est rogné, y compris dans les messages ambres d'attente et de refus ; `document.documentElement.scrollWidth` ≤ 360 | OK — 2026-11-12, en local (montage ci-dessus), adresses sans tiret ni point dans la partie locale : autorisée de 55 signes, nouvelles de 57 signes. Onze écrans : repos ; confirmation à l'ouverture et après rechargement ; attente du clic (« Le clic n'a pas encore été enregistré… », ambre) ; « Votre clic est bien enregistré… Patientez une minute » (ambre) ; étape du code (« Un code vient de partir vers … ») ; code refusé (« Ce code ne correspond pas… », ambre) ; réussite (« C'est fait : votre adresse est désormais … », ancienne adresse prévenue) ; « Le changement n'a pas pu se faire. Rien n'a changé : votre adresse reste … » (API en panne, ambre) ; « Le code n'a pas pu partir vers … » (ambre) ; « Le changement d'adresse n'est pas possible pour le moment. Votre adresse reste … » (sans clé). Partout `scrollWidth` = 360, aucune ligne au-delà du bord de sa carte (texte jusqu'à 314 px au plus, carte de 32 à 328 px), aucun bloc qui rogne ; chaque adresse revient à la ligne (deux lignes seule, coupée après l'arobase ou dans la partie locale dans les phrases). Captures `CT-49.1-1-repos.png` à `CT-49.1-11-pas-possible-sans-cle.png` |

## Bilan

| Section | Cas | OK | KO | NA | À jouer par l'opérateur |
|---|---|---|---|---|---|
| 1 Porte et sécurité | 8 | 8 | 0 | 0 | 0 |
| 2 Demander un code | 11 | 11 | 0 | 0 | 0 |
| 3 Recopier le code, session | 15 | 15 | 0 | 0 | 0 |
| 4 Cadre | 9 | 9 | 0 | 0 | 0 |
| 5 Liste des pages | 4 | 4 | 0 | 0 | 0 |
| 6 Éditeur | 7 | 7 | 0 | 0 | 0 |
| 7 Bouton d'action | 8 | 8 | 0 | 0 | 0 |
| 8 Lien de vidéo | 7 | 7 | 0 | 0 | 0 |
| 9 Texte riche | 7 | 7 | 0 | 0 | 0 |
| 10 Écran Médias | 14 | 13 | 0 | 1 | 0 |
| 11 Fiche | 7 | 7 | 0 | 0 | 0 |
| 12 Octets | 4 | 4 | 0 | 0 | 0 |
| 13 Poser / remplacer | 7 | 6 | 0 | 1 | 0 |
| 14 Galerie / carrousel | 8 | 8 | 0 | 0 | 0 |
| 15 Supprimer partout | 6 | 6 | 0 | 0 | 0 |
| 16 Écritures forgées | 2 | 2 | 0 | 0 | 0 |
| 17 Site public | 2 | 2 | 0 | 0 | 0 |
| 18 Connexion habillée | 10 | 10 | 0 | 0 | 0 |
| 19 Marque de brouillon | 6 | 6 | 0 | 0 | 0 |
| 20 Mes pages habillé | 8 | 8 | 0 | 0 | 0 |
| 21 Éditeur habillé | 9 | 9 | 0 | 0 | 0 |
| 22 Emplacements d'image habillés | 12 | 12 | 0 | 0 | 0 |
| 23 Code en recette | 5 | 5 | 0 | 0 | 0 |
| 24 Carte Coordonnées | 7 | 7 | 0 | 0 | 0 |
| 25 Carte Réseaux sociaux | 6 | 6 | 0 | 0 | 0 |
| 26 Carte Mention d'information | 5 | 5 | 0 | 0 | 0 |
| 27 Liste des formulaires | 5 | 5 | 0 | 0 | 0 |
| 28 Écran d'un formulaire | 8 | 7 | 1 | 0 | 0 |
| 29 Publication sur la vraie chaîne | 9 | 9 | 0 | 0 | 0 |
| 30 Images en plusieurs passes | 1 | 1 | 0 | 0 | 0 |
| 31 Publication impossible ou refusée | 2 | 1 | 0 | 0 | 1 |
| 32 Une publication à la fois | 1 | 1 | 0 | 0 | 0 |
| 33 Une demande part par e-mail | 4 | 2 | 0 | 0 | 2 |
| 34 Seuil des demandes par origine | 4 | 4 | 0 | 0 | 0 |
| 35 Liste des demandes | 3 | 3 | 0 | 0 | 0 |
| 36 Filtre et pages des demandes | 4 | 4 | 0 | 0 | 0 |
| 37 Nombres des demandes | 4 | 4 | 0 | 0 | 0 |
| 38 Détail d'une demande | 3 | 3 | 0 | 0 | 0 |
| 39 Suite d'une demande | 6 | 5 | 0 | 0 | 1 |
| 40 Retrait d'une demande | 5 | 4 | 0 | 0 | 1 |
| 41 Retrait groupé de demandes | 7 | 7 | 0 | 0 | 0 |
| 42 Site rapide, photos lourdes | 4 | 3 | 0 | 0 | 1 |
| 43 Créer le code de secours | 3 | 2 | 1 | 0 | 0 |
| 44 Entrer par le code de secours | 2 | 1 | 1 | 0 | 0 |
| 45 Code de secours à usage unique | 2 | 2 | 0 | 0 | 0 |
| 46 Proposer une nouvelle adresse (CT-46.2 joué le matin par l'opérateur) | 3 | 3 | 0 | 0 | 0 |
| 47 Code après confirmation | 3 | 3 | 0 | 0 | 0 |
| 48 Confirmation de moins d'une minute | 2 | 2 | 0 | 0 | 0 |
| 49 Adresse longue sur téléphone | 1 | 1 | 0 | 0 | 0 |
| **Total du 2026-11-12** | **280** | **269** | **3** | **2** | **6** |

Testé par : Claude, par des agents pilotant `playwright-cli` 0.1.21 · Date : 2026-11-12 · Commit de `main` : `9db5146` · Serveur de recette bâti depuis `af0fdfe` (même code)

Rejeu du 2026-10-31 sur `main` `fb1f2db` (après #290 à #292) : CT-6.3 et CT-15.5 passent de KO à OK ; CT-13.1, CT-24.7 et CT-37.4 rejoués pour leurs remarques, levées.

§ 42 joué le 2026-11-02 sur la branche du ticket 05 du change 014 (`96b71c1`, PR #301) : Lighthouse 13.5.0, `playwright-cli` 0.1.21, téléphone Android de l'opérateur pour CT-42.4.

Recette complète rejouée le 2026-11-03 sur `main` `3f1f656` (le serveur de recette servait ce code : depuis `96b71c1`, seuls des documents ont changé), au navigateur piloté (`playwright-cli` 0.1.21, Chromium 1246), par huit passes successives sur une base remise à zéro le matin ; variantes du site factice redéployées depuis `main`, dont `sans-formulaire`, corrigée (ses pages posaient encore « Devis gâteau »). Les sept cas qui demandaient un geste humain (CT-18.10, CT-31.2, CT-33.3, CT-33.4, CT-39.4, CT-40.3, CT-42.4) ont été joués par l'opérateur du 2026-11-03 au 2026-11-07, guidé par une page de recette ; tous OK. Restent 2 NA : CT-10.1 et CT-13.7 (bibliothèque vide, injoignable sur la recette : l'écran Médias réinscrit les images publiées).

**Constat : des e-mails de demande classés en spam.** Dans chaque salve d'envois de la recette, seul le premier message est arrivé en boîte de réception (09:00 client1, 10:00:07 g342) ; les suivants, envoyés quelques secondes après et presque identiques, sont partis en spam, demande ordinaire comprise (g331) ; Gmail : « Ce message est semblable à des messages identifiés comme spam par le passé ». Le connecteur Gmail n'atteint pas le dossier Spam. Chaque demande reste dans la liste « Demandes » de l'administration, qui sert de filet. À reporter au dossier d'instance (Epic D) : conseiller à la cliente un filtre « Ne jamais envoyer dans le spam » pour l'expéditeur des demandes.

**Défaut relevé hors cahier, reproduit le 2026-11-03, corrigé par #305 (image effacée réinscrite) et #306 (pose d'une image absente).** Une publication qui efface une image retire sa fiche du dépôt, mais le site en service garde la version précédente jusqu'à sa reconstruction (une à deux minutes). Pendant ce délai, ouvrir l'écran Médias, la fiche d'une image ou l'écran Publier réinscrit l'image effacée comme publiée (`inscrireImagesDeDepart`, depuis les fiches empaquetées). La publication suivante la présente alors parmi les images à effacer et demande au dépôt de supprimer une fiche qu'il n'a plus : GitHub refuse l'écriture entière (`422 GitRPC::BadObjectState`, constaté par `gh api` sur le dépôt de recette), la publication échoue (`/admin/publication/suite` → 502) et échoue de nouveau à chaque essai, l'image étant réinscrite à chaque ouverture de l'écran Publier. Aucun écran ne permet d'en sortir. Reproduit à 09:30–09:37 UTC : image publiée, remplacée et publiée, écran Médias ouvert à 09:31:35, puis deux publications en échec. Corollaire vu pendant la reproduction : la route d'un emplacement accepte une image qui n'existe pas (posée par requête directe, ou depuis un onglet resté ouvert sur un sélecteur périmé) ; la publication dépose alors une page qui pose une image absente, la reconstruction du site échoue (`ImageManquanteError`) et l'aperçu de cette page répond 500. La recette a été réparée à la main (dépôt de recette `e99cdf2`, base), puis une publication a abouti à 09:42.

**Recette ciblée du 2026-11-07, sur `main` `44d75a3` (#305, #306 et #303 fusionnées), hors cahier.** Jouée sur `https://colibri.sebc.dev` au navigateur piloté (`playwright-cli`), les poses par la requête qu'envoie l'écran, sans visiter de variante. OK : après une publication qui efface une image (X-02, retirée de la galerie d'Accueil), les écrans Médias, fiche et Publier ouverts pendant la reconstruction (environ 30 s) ne la réinscrivent pas ; la publication suivante aboutit ; après reconstruction, poser cette image répond 404 ; poser une image inconnue répond 404 sans rien écrire ; poser une image de départ dont la ligne est absente répond 200 ; une publication interrompue reprend après l'expiration de son verrou et aboutit. **KO, défaut neuf, corrigé par la branche `fix/image-effacee-posee` :** pendant la reconstruction, poser l'image tout juste effacée répondait 200, car la route de #306 acceptait toute image encore empaquetée sans lire la trace de #305. Avec ce brouillon, l'aperçu répond 500 ; la publication dit « C'est publié », aucun déploiement ne suit en près de 5 minutes, l'écran reste sur « Mise en ligne en cours… » et le site public reste sur sa version précédente. Poser une autre image et republier répare. L'échec de la reconstruction est déduit de l'absence de déploiement : son journal n'a pas été lu. Le correctif est prouvé par les tests d'intégration, pas rejoué sur le serveur de recette.

Les quatre cas suivants ont été joués le 2026-11-07 sur `https://colibri.sebc.dev` (`main` `7e2708e`, migration 0015 appliquée), au navigateur piloté (`playwright-cli`) ; console sans aucun message sur tout le parcours.

**Retour d'une page à sa version publiée (change 015, ticket 01).** À 360 px (360 × 740), sur une page qui porte un brouillon : « Revenir à la version publiée » est lisible sans défilement horizontal (`scrollWidth` ≤ 360) ; la confirmation tient sur une colonne, ses deux boutons (« Garder mes modifications », « Revenir à la version publiée ») et la croix mesurent chacun au moins 44 px de haut, rien n'est coupé. OK — 2026-11-07, sur « Contact » : bouton de 209 × 44 px, `scrollWidth` 360 ; confirmation de 328 px à 16 px de chaque bord, « Les modifications de « Contact » seront perdues. La page reprend son contenu de départ. », boutons de 296 × 44 px l'un sous l'autre, croix de 44 × 44 px ; seul dépasse le texte réservé au lecteur d'écran de la croix (capture `r015-t01-confirmation-360.png`). Retour confirmé ensuite : plus de marque ni de brouillon. Remarque : la croix porte le nom accessible « Garder mes modifications », comme le bouton.

**Retour d'une page et publication (change 015, ticket 02, SC-009, SC-02d).** Sur le serveur de recette : relever le texte de la page publique « Tarifs » ; écraser son texte dans l'éditeur et enregistrer ; actionner « Revenir à la version publiée » et confirmer ; corriger « Accueil » et enregistrer ; publier ; attendre la mise en ligne. Résultat attendu : la page publique « Tarifs » est identique au relevé initial, et la page publique « Accueil » porte la correction. OK — 2026-11-07 : « Tarifs » écrasé (« Texte écrasé par la recette 015. », lu en base), puis revenu (200, « La page reprend sa version publiée. », plus aucun brouillon de « Tarifs ») ; « Accueil » corrigé ; l'écran Publier ne liste qu'« Accueil » ; « C'est publié… » en 6,4 s, texte d'« Accueil » en ligne 56 s après. La page publique « Tarifs » est identique, octet pour octet, à son relevé initial (même empreinte). Dans le dépôt de recette, le commit de publication `99e4329` ne réécrit que `content/pages/accueil/presentation.md` et `content/publication.json`, aucun fichier de « Tarifs ».

**Retour d'un réglage (change 015, ticket 03).** Sur le serveur de recette, écran Réglages sans aucun brouillon : aucune carte n'offre « Revenir à la version publiée ». Enregistrer une correction de la carte Réseaux sociaux : le bouton paraît sur cette carte seule, sans changement d'écran ; Coordonnées et Mention d'information ne l'offrent pas. L'actionner : la confirmation dit « Les modifications des réseaux sociaux seront perdues. ». Garder les modifications : rien ne change. L'actionner de nouveau et confirmer : l'écran se recharge, la carte présente son contenu sans marque ni bouton, et la console ne montre aucune violation. OK — 2026-11-07, à 1280 px : sans brouillon, aucun bouton ; nom d'un lien corrigé (« LinkedIn de recette 015 »), enregistré (200) : bouton et marque sur la carte Réseaux sociaux seule, même écran ; confirmation « Les modifications des réseaux sociaux seront perdues. » ; « Garder mes modifications » : saisie et brouillon intacts ; retour confirmé (200) : écran rechargé, nom d'origine « LinkedIn », aucune marque ni bouton, plus aucun brouillon de réglage.

**Retour d'un formulaire (change 015, ticket 04).** Sur le serveur de recette, écran « Devis gâteau » sans brouillon : aucune offre de « Revenir à la version publiée ». Enregistrer une correction des options : le bouton paraît à côté de la marque, sans changement d'écran. L'actionner : la confirmation dit « Les modifications du formulaire « Devis gâteau » seront perdues. ». Garder les modifications : rien ne change. L'actionner de nouveau et confirmer : l'écran se recharge sur les options publiées, sans marque ni bouton, et la console ne montre aucune violation. Avec une publication en cours : la confirmation affiche le message de publication en cours, le bouton de confirmation est retiré et le brouillon reste. OK — 2026-11-07, à 1280 px : sans brouillon, aucun bouton ; premier choix de « Parfum » renommé (« Recette 015 »), enregistré (200) : marque et bouton à côté du titre, même écran ; confirmation « Les modifications du formulaire « Devis gâteau » seront perdues. » ; « Garder mes modifications » : saisie et brouillon intacts. Publication en cours simulée en base (verrou avec instantané), puis remise à son état d'avant : réponse 409 `publication-en-cours`, la confirmation affiche « Une publication est en cours. Vous pourrez revenir à la version publiée quand elle sera terminée. », son bouton de confirmation est retiré, le brouillon reste. Retour confirmé ensuite (200) : écran rechargé sur « Fraise », sans marque ni bouton ; plus aucun brouillon de formulaire, numéros retenus dans `numeros_options`.

**L'ancienne adresse est prévenue du remplacement (change 017, ticket 07, SC-07a à SC-07d).** Sur le serveur de recette, remplacer l'adresse (écran « Adresse e-mail ») puis recopier le code. Résultat attendu : l'écran ajoute « Un message a prévenu votre ancienne adresse, <ancienne>. » ; la première boîte reçoit, sous l'objet « L'adresse de votre administration a changé », un texte seul qui nomme la nouvelle adresse et la date et renvoie au code de secours, sans aucun code. Remettre ensuite l'adresse d'origine. Parcours à 360 px via `playwright-cli`, en moins de cinq minutes (UX4). Joué le 2026-11-10 à 360 px via `playwright-cli` : OK pour l'avis — l'écran ajoute « Un message a prévenu votre ancienne adresse, … » ; la première boîte reçoit dans la seconde, sous l'objet attendu, un texte seul qui porte « Nouvelle adresse : … », « Date : 10 novembre 2026 » et le renvoi au code de secours, sans aucun code ; une seconde session ouverte avant la bascule est renvoyée vers la connexion (200 puis 302). Adresse d'origine remise par le même écran le 2026-11-11 et vérifiée en base ; les codes envoyés à l'adresse d'origine ont été lus par l'humain, le connecteur de courrier ne les montrant pas (classement en indésirables à confirmer). UX4 non mesuré : 7 min 50 s du premier geste à la réussite, dont l'attente du clic humain (la page de vérification de Cloudflare refuse un navigateur piloté) et l'enquête sur les codes de CT-47.2.

**Recette du change 018 (§ 47 et § 48), jouée le 2026-11-11 et le 2026-11-12 sur `https://colibri.sebc.dev`**, rebâti par Workers Builds depuis `af0fdfe` (le code de `main` après #347), au navigateur piloté (`playwright-cli`), avec l'alias neuf `+recette018` ; seul le clic dans le message de Cloudflare a été fait par l'humain. CT-48.1, CT-48.2 et CT-47.2 OK, sans aucune ligne d'échec au journal du serveur. **Constat : les messages « Confirmez votre nouvelle adresse » arrivent dans les indésirables de Gmail**, ceux de la nouvelle boîte comme ceux de l'adresse d'origine (constaté par l'humain), ce qui confirme le classement soupçonné le 2026-11-10. C'est le même constat que pour les demandes : un filtre « Ne jamais envoyer dans le spam » pour l'expéditeur des codes, à conseiller à la cliente dans le dossier d'instance. L'adresse autorisée est revenue à celle d'origine le 2026-11-12 à 07:08 UTC, vérifiée en base.

**Recette globale du 2026-11-12, sur `main` `9db5146`.** Bilan : 280 cas, dont 269 OK, 3 KO, 2 NA et 6 à jouer par l'opérateur (CT-18.10, joué par l'opérateur le 2026-11-13, est OK) ; le détail est dans le tableau ci-dessus. Le serveur de recette était bâti depuis `af0fdfe`, le même code que `main`. La base partagée a été remise à zéro et les variantes du site factice redéployées, puis des agents ont joué les sections en parallèle sur des objets disjoints, un agent par famille de cas (connexion, pages, médias, réglages, demandes, rapidité). Un agent a joué la publication seule, parce qu'elle touche tout le site. Un dernier agent a joué le code de secours et les rattrapages, quand la base était libre. Le § 49 a été joué en local, sur une construction locale avec une enveloppe qui remplace l'API de Cloudflare, et non sur `colibri.sebc.dev`. Les §§ 46, 47 et 48 ont été joués en fin de soirée, avec l'opérateur pour le clic dans le message de Cloudflare et la lecture des trois codes ; CT-46.2 garde son verdict du matin.

KO (trois) :
- CT-28.6 : sur le formulaire « Devis gâteau » à 360 px, une fois le formulaire en brouillon, la page déborde (`scrollWidth` 430 pour 360 px) parce que le bouton « Revenir à la version publiée » (209 px), posé à droite du titre et de la marque « Brouillon », est coupé à l'écran. Le reste du cas est conforme : les 48 boutons, zones et liens font au moins 44 × 44 px, et l'ordre de tabulation et les gestes de montée, descente et retrait fonctionnent.
- CT-43.2 : « Imprimer » ouvre bien l'impression du navigateur, mais la page imprimée est vide. Dans `src/admin/admin.css` (lignes 463 à 475), la règle `body:has([data-carte-code-de-secours]) *{visibility:hidden}` l'emporte sur `[data-carte-code-de-secours] *{visibility:visible}`, car le `:has(...)` lui donne une priorité plus forte ; la carte du code n'est donc pas imprimée. L'agent n'a pas vu la vraie boîte d'impression, seulement le rendu en média d'impression.
- CT-44.2 : à 360 px, le champ de saisie de `/admin/reprise` reste dans la carte mais le code de 26 signes en groupes ne tient pas dans le champ (texte de 321 px pour 294 px visibles) : il défile et son début sort à gauche. Le ticket 02 et l'`ux.md` du change 016 le voulaient assez large pour 26 signes groupés.

Cas à jouer par l'opérateur (sept) :
- CT-18.10 : sur un vrai téléphone (iPhone et Android si possible), ouvrir `/admin/connexion`, vérifier que le clavier du champ « Adresse » montre la touche `@`, puis que celui du champ « Code » propose le code reçu.
- CT-31.2 : dans son terminal, poser une clé invalide avec `node .claude/skills/recette/scripts/recette.mjs secret-depot`, tenter une publication, constater le message d'échec, la marque « Brouillon » conservée et l'absence de nouvel envoi dans le dépôt de recette, puis reposer la bonne clé.
- CT-33.3 et CT-33.4 : dans le dossier Spam de la boîte de recette, ouvrir les messages de 21 h (heure de Paris) dont les contacts sont `r1112-333@exemple.fr` et `r1112-334@exemple.fr`, et vérifier le texte brut (une seule partie `text/plain` ; lignes du message précédées de `  > `), parce que le connecteur Gmail ne rend pas ces deux messages.
- CT-39.4 : avec NVDA ou VoiceOver, vérifier que la liste de suite de la ligne de 14:05 est annoncée « Suite de la demande du 17 octobre 2026 à 14:05 ».
- CT-40.3 : avec NVDA ou VoiceOver, vérifier l'annonce du dialogue « Retirer cette demande ? », de son texte et des deux boutons radio.
- CT-42.4 : sur un téléphone Android, regarder la photo de tête et une case de galerie de l'accueil de `colibri.sebc.dev` (pas la variante) : image nette, sans halo ni blocs.

NA (deux) : CT-10.1 et CT-13.7 n'ont pas pu être joués, car l'état vide de la bibliothèque est hors d'atteinte : elle part de 45 images publiées que l'écran réinscrit seul, et vider `medias` était exclu par la consigne. Geste requis : une passe sur base vidée.

Écarts notés par les agents, sans changer un verdict :
- CT-42.2 : verdict « OK (partiel) » de l'agent de rattrapage, compté OK dans le bilan ; l'agent `rapidite` avait donné OK pour la partie publique. CT-2.11 et CT-42.3 : OK de l'agent `secours` (le premier les avait laissés « à rejouer »). Aucun cas à rejouer ne subsiste.
- Dans l'état de départ du code de secours, la table `codes_connexion` portait 1 ligne laissée par un agent précédent, au lieu de 0.

Remarques des agents, hors cahier :
- Montage de recette (constaté par l'agent de publication, cause lue dans le code) : toute variante du site factice, et pas seulement `rang`, inscrit l'image de démonstration `media-fixture-hero` dans la base partagée, parce que les variantes embarquent le `content/medias/` du produit. Cette ligne fait échouer la publication suivante du serveur principal, qui la listerait parmi les images à effacer. Elle a été retirée deux fois à la main pendant la recette (`delete from medias where id='media-fixture-hero' and poids_octets=0`). À corriger dans le site factice. Sur le principal, sa vignette était cassée dans la grille Médias et la sur-couche de choix.
- Les 12 images semées par `semer-bibliotheque` portent leur nom de fichier (`fraisier.jpg`…), pas les noms « A · … » à « L · … » qu'annonce le skill `site-factice`.
- Les images posées au départ par le site factice s'appellent `media-fixture-equipe.png` et `media-fixture-hero.png` dans la grille et dans les boutons de la sur-couche : un nom technique visible par l'éditrice, venu du contenu de démonstration et non du produit.
- À 1280 px, la croix de la sur-couche mesure 28 × 28 px (44 × 44 à 360 px, conforme au cas, qui ne vise que 360 px).
- § 29 : la publication d'échauffement a pris 115,6 s pour 49 images (contre 39,5 s pour 47 le 2026-11-03), et la première passe de 40 images 86,6 s, alors que 40 images neuves passent en 34,8 s : renvoyer des images publiées sans empreinte est plus lent que téléverser des images neuves, mais reste sous le bail de 5 min. Mesures du jour : 1 image neuve ≈ 10,4 s ; 40 images ≈ 41,5 s en une passe ; 45 images ≈ 44,3 s en deux passes ; reconstruction ≈ 55 à 87 s.
- § 29 : pendant la reconstruction qui suit la publication à 40 images, la pastille dit « Mise en ligne en cours… » et ouvrir Médias puis Publier ne réinscrit aucune image effacée (`medias` reste à 45 lignes). Défaut déjà corrigé par #305, #306 et `fix/image-effacee-posee` ; la pose d'une image effacée n'a pas été essayée.
- § 31 : sur la variante `sans-formulaire`, deux sessions `playwright-cli` se sont fermées d'elles-mêmes au lancement d'un `run-code` sur l'écran Publier ; le cas a été joué par des commandes simples. C'est l'outil de pilotage, pas le produit. La pastille de cette variante dit « Mise en ligne en cours… » parce qu'elle empaquette une marque de publication plus ancienne que celle de la base partagée, ce qui est attendu pour un aperçu.
- § 42 : Lighthouse 13.6.0 (la recette précédente avait la 13.5.0) ; 1 262 Kio transférés sur l'accueil de la variante `photos-lourdes`.
- État laissé par l'agent de secours (20:45 UTC) : adresse autorisée d'origine en place ; un code de secours mis en place à 20:38:17 UTC, encore valable, gardé dans `code-secours.txt` du dossier de travail ; aucune session ouverte ; 5 demandes, 50 images, aucun brouillon, rien publié.

Remarques hors cahier rendues par les agents des familles connexion, pages, réglages et demandes dans leur compte rendu :
- Connexion : les codes du jour arrivent dans un nouveau fil de la boîte de recette (l'ancien s'arrête au 28 octobre). Le seuil de 20 soumissions par heure et par origine a coupé une première fois la série de CT-3.8, comme prévu par le produit ; le compteur a été remis à zéro et la série rejouée.
- Pages : sur les variantes `vide` et `titres-longs`, la pastille du cadre dit « La dernière mise en ligne n'a pas abouti », quand le principal dit « Site à jour ». Dans l'éditeur à titre long, à 360 px, la marque « Brouillon » passe sur sa propre ligne sous le titre (elle était sur la dernière ligne du titre le 2026-11-03) ; rien n'est coupé. Trois remarques du 2026-11-03 restent vraies : le champ du lien de vidéo refusé ne porte pas `aria-invalid` (CT-8.4), les cellules d'un tableau collé se collent sans espace et un titre collé garde le niveau 1 (CT-9.7). Le texte publié de Tarifs se terminait par « jdizjdhzoz », reste d'une publication passée.
- Réglages : le bouton « Revenir à la version publiée » paraît dès qu'un brouillon existe, sur les cartes de Réglages (où il tient à 360 px) comme sur le formulaire (où il déborde, CT-28.6). La prémisse de CT-28.1 a vieilli : Fraise est déjà première dans la version publiée.
- Demandes : sur le détail d'une demande, à 360 px, les deux-points de « …n'a pas pu partir : elle n'est connue que d'ici. » passent en début de ligne, faute d'espace insécable. L'adresse autorisée a été remplacée 5 secondes pour CT-35.2, puis rétablie et vérifiée en base.
- Montage : la variante `rang` a aussi laissé un brouillon de la galerie `galerie-atelier`, qui n'existe pas sur le principal ; il a été retiré de la base avant la publication.

**§§ 46 à 48, joués le 2026-11-12 de 22:31 à 22:47 UTC.** Sept cas OK avec un alias neuf (`+recette1112`), à 360 px, console vide et aucune ligne d'échec au journal du serveur. Bouton pressé 0,6 s après le clic enregistré par Cloudflare : l'écran fait patienter une minute ; pressé de nouveau 67 s après, le code part. Le premier des deux codes est refusé (« Ce code ne peut plus servir. Demandez-en un nouveau. »), le second fait basculer l'adresse ; l'avis à l'ancienne adresse arrive en boîte de réception, sans code ; un second appareil est renvoyé à la connexion. Le retour à l'adresse d'origine s'est fait par le même écran à 22:46:52, vérifié en base. Les messages « Confirmez votre nouvelle adresse » restent invisibles au connecteur de courrier : l'opérateur a lu les trois codes (dans les indésirables). Constat : la bascule récrit la ligne de `adresses_autorisees`, dont le numéro change (7 puis 9) pour une adresse identique. L'alias neuf reste inscrit et vérifié au compte Cloudflare de recette (cinq adresses).
