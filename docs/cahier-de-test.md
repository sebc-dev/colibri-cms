# ColibriCMS — Cahier de test manuel

État couvert : tout ce qui est livré dans `main` au 2026-09-28 — les changes **001 Connexion par
code**, **002 Socle d'îlots d'administration**, **003 Remplir et corriger les emplacements d'une
page** et **004 Bibliothèque de médias** — et le change **005 Mise en page de l'administration**, dont les §§ 18 à 22 portent la recette de fin de front (§ 18,
connexion habillée ; § 19, marque de brouillon ; § 20, « Mes pages » habillé ; § 21, éditeur habillé,
emplacements de texte ; § 22, emplacements d'image habillés). La source de vérité de chaque attendu est la spec vivante
citée en tête de section (`openspec/specs/<capacité>/spec.md`).

Ce cahier complète les tests automatiques (`docs/test.md`), il ne les remplace pas : il vise ce
qu'un test dans `workerd` ne voit pas — le rendu au navigateur, la CSP réellement appliquée (voir
`docs/test.md`, la CSP est invisible aux tests), les textes lus par l'éditrice, les gestes.

**Hors périmètre** (pas encore livré, ne pas tester) : Aperçu et
publication, le rendu des images sur le site public, l'effacement réel des images orphelines à la
publication. Le site public n'a pas encore de page rendue : tout ce qui parle d'« état publié intact »
n'est observable qu'en base (§ 0.5) ou par les tests automatiques.

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
npx wrangler d1 execute DB --local --command "delete from codes_connexion; delete from sessions; delete from brouillons_emplacements; delete from medias; delete from brouillons_reglages; delete from brouillons_formulaires;"
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

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-1.1 | Sans session, ouvrir `http://127.0.0.1:8787/admin/` | Renvoi vers l'écran de connexion ; rien de l'accueil n'apparaît | |
| CT-1.2 | Ouvrir `/admin/connexion` sans session, puis (plus tard) avec session | L'écran de connexion se rend dans les deux cas, avec son champ d'adresse | |
| CT-1.3 | Ouvrir `/admin/nimportequoi` sans session, puis avec session | Refus ; rien de l'administration n'est visible (ni menu, ni page) | |
| CT-1.4 | Ouvrir `/admin` (sans barre finale), sans session | Même comportement que CT-1.1 | |
| CT-1.5 | Outils de développement → Réseau, sur la réponse de `/admin/connexion` | En-têtes présents : `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, un refus de mise en cadre (`X-Frame-Options` ou `frame-ancestors`) | |
| CT-1.6 | Même vérification sur le **renvoi** de CT-1.1 et sur le **refus** de CT-1.3 | Exactement les mêmes en-têtes, aux mêmes valeurs, que CT-1.5 | |
| CT-1.7 | Lire la valeur de `Content-Security-Policy` | `script-src` sans `unsafe-inline` ni `unsafe-eval` ; aucune origine tierce (aucun `https://…` étranger) ; `style-src-attr 'unsafe-inline'` présent | |
| CT-1.8 | Source de la page (Ctrl+U) sur `/admin/connexion` | Aucun `<script>` en ligne ; les scripts sont chargés par `<script src>` | |

## 2. Demander un code — `connexion-par-code`

Vider `.wrangler/tmp/email/` avant de commencer (`rm -rf .wrangler/tmp/email/*`). Sur le serveur de
recette, « un fichier `.txt` apparaît » se lit « un message arrive dans la boîte de l'adresse autorisée »
(§ 0.3).

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-2.1 | Soumettre `editrice@example.com` | L'écran passe à la saisie du code ; un fichier `.txt` apparaît sous `.wrangler/tmp/email/` | |
| CT-2.2 | Ouvrir ce fichier | Texte seul (aucune balise HTML) ; objet `Votre code de connexion` ; corps `Code : XXXXXXXX` | |
| CT-2.3 | Lire le code | Huit signes, chiffres ou majuscules, **jamais** de `I`, `L`, `O` ni `U` | |
| CT-2.4 | En base (§ 0.5), la ligne `codes_connexion` créée | Le code en clair **n'y figure pas** (`empreinte` et `sel` seulement) ; `identifiant_appareil` renseigné | |
| CT-2.5 | Soumettre `inconnu@example.com` (autre appareil ou après reset) | **Même écran, même texte** qu'en CT-2.1 ; **aucun** nouveau fichier dans `.wrangler/tmp/email/` ; aucune nouvelle ligne en base | |
| CT-2.6 | Onglet Réseau : comparer les deux réponses POST de CT-2.1 et CT-2.5 | Même statut, mêmes en-têtes, corps identique ; le temps de réponse est ≥ 300 ms dans les deux cas et du même ordre | |
| CT-2.7 | Outils → Application → Cookies, après affichage de `/admin/connexion` | Un cookie d'identifiant d'appareil est posé ; recharger la page ne le change pas | |
| CT-2.8 | Demander **six** codes de suite avec l'adresse autorisée (moins d'une heure) | Les cinq premiers produisent un fichier ; le sixième affiche un message de plafond atteint, **sans** fichier ni ligne en base | |
| CT-2.9 | Plafond atteint, soumettre `inconnu@example.com` | Le **même** message de plafond, mot pour mot | |
| CT-2.10 | Plafond atteint, puis `delete from codes_connexion` (simule la sortie de l'heure) et redemander | Un code est de nouveau écrit et déposé | |
| CT-2.11 | Reset complet **sans** réinsérer l'adresse autorisée (instance non semée), soumettre une adresse | Même écran que CT-2.1, rien d'autre — l'instance ne trahit pas qu'elle n'est pas semée. Réinsérer l'adresse ensuite (§ 0.2) | |

## 3. Recopier le code, ouvrir la session — `connexion-par-code`

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-3.1 | Lire l'écran de saisie du code | Il dit que le code reste valable **quinze minutes** et que **seul le dernier code demandé depuis cet appareil** permet d'entrer | |
| CT-3.2 | Demander un code, le recopier tel quel | Renvoi vers l'accueil `/admin/` : « Vous êtes connectée. », aucun lien ni bouton d'action sur l'accueil | |
| CT-3.3 | Outils → Application → Cookies après CT-3.2 | Un cookie `__Host-…` avec `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` ; sa valeur est opaque (ne contient ni adresse, ni date lisible) | |
| CT-3.4 | Nouveau code ; le recopier en **minuscules**, avec des **tirets ou espaces** entre les signes | Accepté | |
| CT-3.5 | Nouveau code contenant un `0`, `1` ou `V` ; le recopier en remplaçant par `O`, `I`/`L`, `U` | Accepté (confusables ramenés à leur signe) | |
| CT-3.6 | Se déconnecter (supprimer le cookie `__Host-…`), présenter le **même** code une seconde fois | Refus : « Ce code a déjà servi : demandez un nouveau code. » | |
| CT-3.7 | Nouveau code ; saisir un code faux | « Ce code n'est pas reconnu. Vérifiez-le et retapez-le. » ; pas de session | |
| CT-3.8 | Saisir un code faux **cinq fois**, puis le **bon** code | À la cinquième : « Trop de tentatives avec ce code : demandez un nouveau code. » ; le bon code est ensuite refusé lui aussi (brûlé) | |
| CT-3.9 | Demander un code depuis l'appareil A ; le saisir depuis l'appareil B (fenêtre privée) | « Ce code a été demandé depuis un autre appareil : revenez sur l'appareil où vous l'avez demandé pour vous connecter. » — jamais « demandez un nouveau code » | |
| CT-3.10 | Appareil A : demander un code C1, puis un code C2 ; saisir C1 | « Ce code n'est plus valable : demandez un nouveau code. » ; C2 reste accepté | |
| CT-3.11 | Appareil A : code CA ; appareil B : code CB ; saisir CA sur A | Accepté — la nouvelle demande de B n'a pas annulé le code de A | |
| CT-3.12 | Demander un code, en base : `update codes_connexion set expire_le = 0;` puis le saisir | « Ce code a expiré : demandez un nouveau code. » | |
| CT-3.13 | Session ouverte ; en base : `update sessions set creee_le = 0;` puis recharger `/admin/` | Renvoi vers la connexion (butée absolue de trente jours simulée) | |
| CT-3.14 | Session ouverte ; recharger `/admin/mes-pages` dix fois de suite | Toujours servi ; aucune nouvelle ligne `sessions` à chaque requête (le rafraîchissement n'écrit pas à chaque fois) | |
| CT-3.15 | Ouvrir une session sur A **et** une sur B | Les deux coexistent ; aucune ne ferme l'autre | |

> Les échéances de sept jours sans usage et le repoussement glissant ne se testent pas à la main ;
> ils sont couverts par les tests automatiques de `tests/integration/`.

## 4. Le cadre de l'administration — `pages-et-emplacements`, `socle-ilots-admin`

Session ouverte. Ouvrir `/admin/mes-pages`.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-4.1 | Lire la barre latérale | Cinq rubriques : **Mes pages**, **Médias**, **Réglages**, **Formulaires**, **Demandes** ; « Mes pages » marquée active | |
| CT-4.2 | Cliquer « Médias » | L'écran Médias s'ouvre, « Médias » devient la rubrique active | |
| CT-4.3 | Cliquer « Demandes » | L'écran Demandes s'ouvre, « Demandes » devient la rubrique active | |
| CT-4.4 | Actionner « Replier le menu » | La barre devient un rail d'icônes seules ; la rubrique active reste marquée ; la zone de contenu s'élargit | |
| CT-4.5 | Actionner « Déplier le menu » | Les libellés reparaissent à côté des icônes | |
| CT-4.6 | Replier, puis **recharger** la page ; onglet Réseau pendant le repli | L'état replié est conservé ; **aucune** requête serveur n'a été émise par le repli | |
| CT-4.7 | Parcourir tout le menu | Aucun bouton « + », « ajouter », « renommer », « supprimer », « déplacer » sur les rubriques ou les pages | |
| CT-4.8 | Console ouverte pendant tout le § 4 | Aucune violation CSP ; aucun style de composant bloqué (menus, boutons, champs s'affichent normalement) | |
| CT-4.9 | Source de l'écran | Aucune directive `client:` ; aucun `<script>` en ligne | |

## 5. La liste des pages — `pages-et-emplacements`

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-5.1 | Ouvrir « Mes pages » | Trois lignes, dans cet ordre : **Accueil, Tarifs, Contact** | |
| CT-5.2 | Cliquer « Accueil » | L'éditeur de la page Accueil s'ouvre | |
| CT-5.3 | Sur la liste, aucune page n'a encore de brouillon | Aucune pastille « brouillon » | |
| CT-5.4 | *(optionnel, coupe le serveur)* Renommer temporairement `content/pages` en `content/pages.off`, rebâtir et relancer `wrangler dev`, ouvrir « Mes pages » | Un message d'état vide, **sans** bouton de création. Remettre le dossier ensuite | |

## 6. L'éditeur d'une page — `pages-et-emplacements`

Ouvrir la page **Accueil**.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-6.1 | Lire l'éditeur | Cinq emplacements, dans l'ordre : texte riche · lien de vidéo · bouton d'action · image · galerie — chacun reconnaissable à sa nature | |
| CT-6.2 | Lire les contenus | Le lien de vidéo montre l'URL YouTube ; le bouton montre « Demander un devis » / `/contact` ; la galerie est vide | |
| CT-6.3 | L'emplacement **image** (son identité de démonstration n'existe pas en bibliothèque) | L'écran ne casse pas ; aucun identifiant technique (`media-fixture-hero`) ni mot « undefined » n'apparaît ; le sélecteur d'image reste utilisable | |
| CT-6.4 | Actionner le fil de retour | Retour à « Mes pages » | |
| CT-6.5 | Ouvrir **Contact** | texte riche · lien de vidéo (Vimeo) · image · carrousel, dans cet ordre | |
| CT-6.6 | Ouvrir **Tarifs** | texte riche · bouton d'action | |
| CT-6.7 | Parcourir l'éditeur | Aucun geste d'ajout, retrait, déplacement ni renommage d'emplacement | |

## 7. Le bouton d'action — `pages-et-emplacements`

Page **Accueil**, emplacement « bouton d'action ».

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-7.1 | Changer le libellé en « Obtenir un devis », enregistrer | Enregistré sans quitter l'écran ; la **pastille brouillon** apparaît au fil de retour ; en base une ligne `brouillons_emplacements` | |
| CT-7.2 | Retour à « Mes pages » | La ligne Accueil porte la pastille brouillon ; Tarifs et Contact non | |
| CT-7.3 | Recharger l'éditeur d'Accueil | Le libellé corrigé est bien celui affiché (persistance) | |
| CT-7.4 | Destination `https://exemple.fr/devis`, enregistrer | Accepté | |
| CT-7.5 | Destination `mailto:contact@exemple.fr`, puis `tel:+33123456789`, puis `/tarifs` | Chacune acceptée | |
| CT-7.6 | Destination `javascript:alert(1)` | Refusée **au champ**, message compréhensible ; rien de nouveau en base | |
| CT-7.7 | Destination `http://exemple.fr` (sans s), puis `ftp://exemple.fr` | Refusées au champ ; rien d'écrit | |
| CT-7.8 | Page **Tarifs**, corriger son bouton | Seule Tarifs bascule à « brouillon » ; l'état d'Accueil ne change pas | |

## 8. Le lien de vidéo — `pages-et-emplacements`

Page **Accueil**, emplacement « lien de vidéo ».

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-8.1 | Coller `https://www.youtube.com/watch?v=aqz-KE-bpKQ`, enregistrer | Accepté ; pastille brouillon ; persiste au rechargement | |
| CT-8.2 | Coller `https://youtu.be/aqz-KE-bpKQ` | Accepté | |
| CT-8.3 | Coller `https://vimeo.com/76979871` | Accepté | |
| CT-8.4 | Coller `https://exemple.com/video` | Refusé au champ, en disant **ce qui est attendu** (YouTube ou Vimeo) ; rien en base | |
| CT-8.5 | Coller `http://www.youtube.com/watch?v=aqz-KE-bpKQ` (sans s) | Refusé | |
| CT-8.6 | Coller `pas une url` | Refusé | |
| CT-8.7 | Après un refus, l'état de la page | N'a pas basculé à cause du refus (une page sans autre brouillon reste sans pastille) | |

## 9. Le texte riche — `pages-et-emplacements`

Page **Contact**, emplacement « texte riche ».

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-9.1 | Lire la barre de mise en forme | Gras, italique, lien, liste, titre — et rien d'autre ; aucun bouton « HTML », « code », « source » | |
| CT-9.2 | Taper un paragraphe, sélectionner un mot, actionner **gras** puis **italique** | Les marques se posent visuellement, sans qu'aucune balise ne s'écrive dans le texte | |
| CT-9.3 | Poser un **titre**, une **liste** à deux éléments | Rendus comme tels | |
| CT-9.4 | Poser un **lien** vers `https://exemple.fr` | Accepté | |
| CT-9.5 | Poser un lien vers `javascript:alert(1)` | Refusé, sans terme de développeur | |
| CT-9.6 | Enregistrer, recharger la page | Tout le contenu et toutes les marques sont retrouvés ; pastille brouillon ; en base le contenu est du Markdown (`**gras**`, `# Titre`, `- élément`), sans HTML | |
| CT-9.7 | Coller depuis un traitement de texte un contenu avec couleur, police, tableau | Seules gras/italique/lien/liste/titre survivent après enregistrement + rechargement ; le reste est écarté | |

## 10. La bibliothèque — écran Médias — `bibliotheque-de-medias`

Bibliothèque vide au départ (`delete from medias`).

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-10.1 | Ouvrir « Médias », bibliothèque vide | « La bibliothèque ne contient encore aucune image. » ; bouton « Téléverser une image » ; champ « Rechercher par nom ou description » | |
| CT-10.2 | Téléverser `photo.jpg` | Une vignette apparaît dans la grille ; en base : `nom_origine = photo.jpg`, `format` = JPEG, `largeur`/`hauteur` = les vraies dimensions, `poids_octets` | |
| CT-10.3 | Téléverser `logo.png` puis `banniere.webp` | Trois vignettes ; formats PNG et WebP en base | |
| CT-10.4 | Téléverser `dessin.svg` | « Cette image n'est pas dans un format accepté (JPEG, PNG ou WebP) : choisissez une autre image. » ; rien en base | |
| CT-10.5 | Téléverser `anim.gif` | Même refus de format | |
| CT-10.6 | Téléverser `menteur.png` (un GIF renommé) | Refus de **format** — seuls les octets décident, pas l'extension | |
| CT-10.7 | Téléverser `lourde.jpg` (> 2 Mo) | « Cette image est trop lourde : choisissez une image plus légère. » ; rien en base | |
| CT-10.8 | Téléverser `tronque.jpg` | Refusé proprement (format) ; rien en base ; l'écran reste utilisable | |
| CT-10.9 | Téléverser `jpeg-deguise.png` (un vrai JPEG renommé) | **Admis** ; en base `format` = JPEG, pas PNG | |
| CT-10.10 | Recharger l'écran | Toutes les vignettes sont là ; l'ordre est stable | |
| CT-10.11 | Rechercher « logo » | La grille ne montre que `logo.png` | |
| CT-10.12 | Rechercher « zzz » | « Aucune image ne correspond à cette recherche. » — texte **différent** de CT-10.1 ; effacer la recherche rend toutes les images | |
| CT-10.13 | Donner une description à `photo.jpg` (§ 11), puis rechercher un mot de cette description | `photo.jpg` est trouvée par sa description | |
| CT-10.14 | Console et onglet Réseau pendant le § 10 | Aucune violation CSP ; les vignettes sont servies depuis `/admin/medias/<id>/octets` | |

## 11. La fiche d'une image — `bibliotheque-de-medias`

Cliquer la vignette de `photo.jpg`.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-11.1 | Lire la fiche | Aperçu de l'image ; champ « Nom » ; champ « Description » ; bouton « Enregistrer » ; lien de retour « Médias » ; titre « Posée dans » | |
| CT-11.2 | Renommer en « Façade de l'atelier », enregistrer | Le nom affiché change dans la fiche et dans la grille ; en base `nom_affichage` = le nouveau nom et `nom_origine` = **toujours** `photo.jpg` | |
| CT-11.3 | Vider le nom, enregistrer | « Le nom ne peut pas être vide. » ; rien d'écrit | |
| CT-11.4 | Saisir la description « Vue de la rue, printemps 2026 », enregistrer, recharger | Retrouvée ; en base `description` renseignée | |
| CT-11.5 | Modifier la description, enregistrer | La nouvelle remplace l'ancienne | |
| CT-11.6 | Section « Posée dans » d'une image posée nulle part | « Cette image n'est posée dans aucun emplacement. » | |
| CT-11.7 | Marque d'orphelin sur une image posée nulle part | Sur la **fiche** et sur la **vignette** : « Cette image n'est posée dans aucun emplacement : elle sera effacée à la prochaine publication. » | |

## 12. Servir les octets — `bibliotheque-de-medias`

Relever l'identité d'une image (`select id …`, § 0.5) ; noter `<id>`.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-12.1 | Avec session, ouvrir `/admin/medias/<id>/octets` ; onglet Réseau | L'image s'affiche ; `Content-Type: image/jpeg` (ou png/webp selon le vrai format) ; `X-Content-Type-Options: nosniff` | |
| CT-12.2 | Même URL sur `jpeg-deguise.png` | `Content-Type: image/jpeg` — jamais `image/png` | |
| CT-12.3 | Même URL en **fenêtre privée** (sans session) | Aucun octet : renvoi vers la connexion ou refus | |
| CT-12.4 | `/admin/medias/inexistant/octets` avec session | Refus propre, rien de l'administration ne fuit | |

## 13. Poser et remplacer une image — `pages-et-emplacements`

Page **Accueil**, emplacement **image**. `.wrangler/tmp/email` et l'onglet Réseau restent ouverts.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-13.1 | Ouvrir le sélecteur d'image | Il présente les images de la bibliothèque, par leur **nom d'affichage** (« Façade de l'atelier », pas `photo.jpg` ni un identifiant) | |
| CT-13.2 | Choisir « Façade de l'atelier » | L'emplacement montre l'image ; pastille brouillon ; **aucun** téléversement dans l'onglet Réseau ; en base, le brouillon de l'emplacement porte l'`id` de l'image | |
| CT-13.3 | Remplacer par `logo.png` | La nouvelle image est montrée à la place ; le brouillon porte le nouvel `id` et plus l'ancien | |
| CT-13.4 | Recharger l'éditeur | L'image posée est retrouvée | |
| CT-13.5 | Fiche de `logo.png` → « Posée dans » | « Accueil — image » (titre de page + nature en français, **pas** `image-hero`) | |
| CT-13.6 | Vignette et fiche de `logo.png` | La marque d'orphelin a **disparu** ; celle de « Façade de l'atelier » (plus posée nulle part) est **revenue** | |
| CT-13.7 | Sélecteur d'image sur une bibliothèque vidée (`delete from medias`, après le § 14) | État vide compréhensible, sans terme de développeur | |

## 14. Composer une galerie ou un carrousel — `pages-et-emplacements`

Page **Accueil**, emplacement **galerie** ; puis page **Contact**, emplacement **carrousel**.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-14.1 | Poser trois images dans la galerie, dans l'ordre A, B, C | La galerie montre A, B, C dans cet ordre ; pastille brouillon ; en base l'ordre est celui choisi | |
| CT-14.2 | Réordonner en C, A, B | L'ordre est mis à jour, persiste au rechargement | |
| CT-14.3 | Retirer B | La galerie montre C, A ; B reste dans la bibliothèque | |
| CT-14.4 | Recharger l'éditeur | C, A retrouvés | |
| CT-14.5 | Fiche de A → « Posée dans » | « Accueil — galerie » | |
| CT-14.6 | Même parcours sur le **carrousel** de Contact | Identique | |
| CT-14.7 | Poser A dans le carrousel de Contact alors qu'elle est déjà dans la galerie d'Accueil | Accepté ; sa fiche liste **les deux** emplacements, chacun par sa page et sa nature | |
| CT-14.8 | Pendant le § 14, la liste des pages | Accueil et Contact portent la pastille ; Tarifs n'a pas bougé (hors CT-7.8) | |

> Rang parmi plusieurs emplacements de même nature (« 1re galerie », « 2e galerie ») : aucune page
> de démonstration n'en a deux. Pour le tester, ajouter temporairement un second emplacement
> `"nature": "galerie"` à `content/pages/accueil/page.json`, rebâtir et relancer `wrangler dev`.

## 15. Supprimer une image partout — `bibliotheque-de-medias`

État de départ attendu : A posée dans la galerie d'Accueil **et** dans le carrousel de Contact ;
Tarifs sans image.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-15.1 | Fiche de A → « Supprimer… » | Une confirmation « Supprimer « A » ? » présente **d'abord** « Elle est posée dans : » suivi de la liste (Accueil — galerie, Contact — carrousel) ; boutons « Annuler » / « Supprimer » ; **rien n'est encore appliqué** | |
| CT-15.2 | « Annuler » | Rien ne change : A toujours posée aux deux endroits | |
| CT-15.3 | « Supprimer… » puis « Supprimer » | A est retirée de la galerie d'Accueil **et** du carrousel de Contact ; leurs brouillons sont mis à jour en base ; Accueil et Contact portent la pastille ; Tarifs non | |
| CT-15.4 | Fiche de A après suppression | « Cette image n'est posée dans aucun emplacement. » + marque « sera effacée à la prochaine publication » ; A **reste** dans la grille (l'effacement réel attend la publication) | |
| CT-15.5 | Ouvrir l'éditeur d'Accueil et de Contact | Aucun emplacement ne montre d'image cassée ni d'identifiant ; l'ordre des autres images de la galerie est conservé | |
| CT-15.6 | « Supprimer… » sur une image posée nulle part | La confirmation dit « Cette image n'est posée dans aucun emplacement. » ; confirmer ne touche aucun brouillon (aucune nouvelle pastille, aucune ligne modifiée en base) | |

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

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-16.1 | Ouvrir `http://localhost:8080/forge.html`, cliquer « go », lire la console | La requête n'aboutit pas (erreur réseau/CORS **ou** statut de refus) : le cookie `SameSite=Strict` n'est pas joint ; le bouton de Tarifs n'a **pas** changé ; rien de nouveau en base | |
| CT-16.2 | Même page, remplacer l'URL par `/admin/medias/televerser` et le corps par un `FormData` portant `photo.jpg` | Refus ; rien en base | |

## 17. Site public — `socle-ilots-admin`

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-17.1 | `npm run build`, puis inspecter `dist/` | Aucun fichier de page publique ne référence un composant de `src/admin` ni une feuille Tailwind (`grep -rlE "tailwind\|/admin/" dist/` hors du dossier admin doit être vide) | |
| CT-17.2 | Ouvrir `http://127.0.0.1:8787/` | Aucune route serveur ne répond hors `/admin/` (le site public reste statique ; une 404 propre est acceptable tant qu'aucune page publique n'est livrée) | |

## 18. La connexion habillée — change 005 · ticket 06

Livré par la PR **#116** sans ces vérifications : elles sont reportées à cette recette, en fin de
mise en page. Une fois #116 fusionnée, la mise en route du § 0.2 suffit ; avant, servir le build de
la branche `impl/connexion-habillee-06`. Pour le vrai téléphone, l'instance exposée doit servir ce
build. Les tests automatiques couvrent déjà la structure (SC-06a à
SC-06e) ; ce § vise ce qu'ils ne voient pas : largeur, zones de toucher, contrastes, clavier.

Joué le 2026-10-02 sur `https://colibri.sebc.dev` et les variantes du site factice (`main` `42da591`), au navigateur piloté (`playwright-cli`) : mesures calculées dans la page (contrastes, tailles, polices, `scrollWidth`), sans session pour le § 18.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-18.1 | À 1280 px de large, sans session, ouvrir `/admin/connexion` | Une carte centrée (400 px de large au plus) sur le fond neutre chaud ; logo et titre « Connexion » en tête ; deux étapes séparées par un trait : recevoir un code (libellé « Adresse », bouton « Recevoir un code »), puis saisir le code (durée de validité, libellé « Code », bouton « Se connecter ») | OK — 1280 px sans session : carte de 400 px centrée sur fond neutre chaud ; logo puis « Connexion » ; étape 1 (« Adresse », « Recevoir un code »), trait, étape 2 (durée de validité, « Code », « Se connecter ») |
| CT-18.2 | Outils → Éléments → onglet *Calculé*, sur le titre puis sur un libellé ; onglet Réseau, filtre *Police* | Titre en **Fraunces**, texte en **Instrument Sans** ; les polices viennent de la même origine (aucune requête vers un domaine tiers) | OK — titre Fraunces, texte Instrument Sans ; polices chargées depuis l'origine, aucune ressource tierce (`performance` : 0 requête hors origine) |
| CT-18.3 | Regarder les deux boutons ; comparer les textes avec § 2 et § 3 | Les deux boutons portent la couleur principale (plumage) ; aucun texte n'a changé : mêmes libellés, même durée de validité, mêmes messages de refus et de plafond | OK — « Recevoir un code » et « Se connecter » en plumage rgb(14,107,85) ; textes inchangés : durée « quinze minutes » et « seul le dernier code demandé depuis cet appareil » (CT-3.1), refus « Ce code n'est pas reconnu. Vérifiez-le et retapez-le. » (CT-3.7), message de plafond |
| CT-18.4 | Mode appareil à **360 px** de large (360 × 740), état initial ; dans la console : `document.documentElement.scrollWidth` | Valeur **≤ 360** ; aucun défilement horizontal ; la carte occupe toute la largeur moins 16 px de chaque côté ; aucun texte ni champ coupé (SC-06f) | OK — 360 × 740, état initial : scrollWidth 360, carte à 16 px de chaque bord, aucun élément ne dépasse de la carte |
| CT-18.5 | Toujours à 360 px : saisir un code faux (état « code refusé »), puis déclencher le plafond (CT-2.8) | Dans les deux états, `scrollWidth` ≤ 360 et rien n'est coupé ; le message de refus et le message d'attente passent à la ligne sans déborder (SC-06f) | OK — 360 px, état « code refusé » (code en attente inséré en base pour l'appareil, code faux saisi) puis plafond (cinq codes de l'heure insérés en base, adresse soumise : aucun e-mail envoyé) : scrollWidth 360 dans les deux états, messages passés à la ligne, rien ne dépasse |
| CT-18.6 | À 360 px, dans la console : ``[...document.querySelectorAll('button,input')].map(e => { const r = e.getBoundingClientRect(); return [e.name \|\| e.textContent.trim(), Math.round(r.width), Math.round(r.height)] })`` | Les deux champs et les deux boutons mesurent chacun **au moins 44 × 44 px** (SC-06g) | OK — 360 px : champ d'adresse, « Recevoir un code », champ de code, « Se connecter » à 296 × 44 px chacun |
| CT-18.7 | Outils → Éléments → sélecteur de couleur (ou Lighthouse → Accessibilité) sur le titre, les deux phrases d'étape, les libellés, le texte des champs et des boutons | Chaque texte atteint un contraste d'**au moins 4,5:1** sur son fond (SC-06h) | OK — titre, phrases d'étape, libellés et texte des champs 16,67:1 ; texte des boutons 6,46:1 |
| CT-18.8 | Code faux : mesurer le contraste du message de refus | Message en rouge (danger), placé sous l'étape de code, au-dessus du champ ; contraste **≥ 4,5:1** sur son fond (SC-06d, SC-06h) | OK — refus en rouge (danger), sous la phrase de l'étape de code et au-dessus du champ, 5,62:1 |
| CT-18.9 | Plafond atteint (CT-2.8) : lire la carte et mesurer le contraste du message d'attente | La carte ne montre **que** le message d'attente, sur fond ambre, sans champ ni bouton ; contraste **≥ 4,5:1** sur son fond ambre (SC-06b, SC-06h) | OK — plafond : la carte ne montre que « Trop de demandes de connexion ont déjà été envoyées récemment. Merci de patienter un moment avant de réessayer. », sans champ ni bouton, texte rgb(138,90,0) sur ambre rgb(252,239,210), 5,2:1 ; aucun code écrit |
| CT-18.10 | Sur un **vrai téléphone** (iPhone et Android si possible) : toucher le champ d'adresse, puis le champ de code | Le champ d'adresse ouvre le clavier d'e-mail (touche `@`) ; le champ de code propose le code reçu en suggestion quand l'appareil sait le faire — NA si le code n'arrive pas sur le téléphone, puisqu'en local aucun e-mail ne part (SC-06c) | NA — exige un vrai téléphone ; structure vérifiée : champ d'adresse `type="email"` `autocomplete="email"`, champ de code `autocomplete="one-time-code"` |

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

Joué le 2026-10-02 sur `https://colibri.sebc.dev` et les variantes du site factice (`main` `42da591`), au navigateur piloté (`playwright-cli`) : mesures calculées dans la page (contrastes, tailles, polices, `scrollWidth`), sans session pour le § 18.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-19.1 | Ouvrir « Mes pages » | Aucune ligne ne porte de marque « Brouillon » | OK — « Mes pages » sans aucune marque après remise à zéro |
| CT-19.2 | Ouvrir **Tarifs** (sans brouillon) ; corriger le texte du bouton d'action et enregistrer, **sans recharger** | Une marque apparaît à côté du titre : libellé écrit « Brouillon », point devant, texte rubis sur fond rubis pâle, forme de pastille ; aucune violation CSP dans la console (SC-05b) | OK — après enregistrement sans recharger, marque « Brouillon » à côté du titre : point de 6 px, texte rubis rgb(180,35,90) sur rubis pâle rgb(251,227,236), pastille (rayon plein) ; console vide |
| CT-19.3 | Sans recharger, enregistrer une seconde correction ; dans la console : `document.querySelectorAll('[data-pastille-brouillon]').length` | Toujours **une seule** marque à l'écran ; la console renvoie **1** (SC-05b) | OK — seconde correction enregistrée : `[data-pastille-brouillon]` = 1 |
| CT-19.4 | Recharger l'éditeur de Tarifs ; comparer avec la marque vue en CT-19.2 | Marque visuellement identique : même libellé, même point, mêmes couleurs, même taille, même place (SC-05b) | OK — après rechargement, marque identique au pixel près (position, taille, couleurs, police, balisage) |
| CT-19.5 | Revenir à « Mes pages » | La ligne Tarifs porte la même marque que le titre de son éditeur (SC-05a) | OK — la ligne Tarifs porte la même marque (balisage identique), les autres non |
| CT-19.6 | Parcourir « Mes pages », l'éditeur, Médias et la fiche d'une image | Aucun bouton ni lien n'est rubis : cette couleur ne paraît que dans la marque (SC-05c) | OK — aucun élément hors de la marque en rubis ni rubis pâle (texte, fond, bord) sur « Mes pages », l'éditeur, Médias et la fiche d'une image |

---

## 20. « Mes pages » habillé — change 005 · ticket 07

Livré sans ces vérifications : elles sont reportées à cette recette, en fin de mise en page. Avant
la fusion, servir le build de la branche `impl/mes-pages-habille-07`. Les tests automatiques
couvrent déjà le balisage : ordre des lignes, adresse sous le titre en `font-mono`, `<h1>` et
`<li>` sans attribut, fond `bg-card`, aucune couleur littérale (SC-07a, moitié balisage de SC-07b
et SC-07c) ; ce § vise ce qu'ils ne voient pas : polices réellement rendues, largeur, zones de
toucher, contrastes. Partir d'une base remise à zéro (§ 0.6), session ouverte.

Joué le 2026-10-02 sur `https://colibri.sebc.dev` et les variantes du site factice (`main` `42da591`), au navigateur piloté (`playwright-cli`) : mesures calculées dans la page (contrastes, tailles, polices, `scrollWidth`), sans session pour le § 18.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-20.1 | À 1280 px de large, ouvrir « Mes pages » | Sous le titre, une carte sur le fond neutre chaud (ni blanc pur ni gris froid) ; une ligne par page dans l'ordre Accueil, Tarifs, Contact, séparées par un filet ; sous chaque titre, son adresse : `/`, `/tarifs`, `/contact` (SC-07a, SC-07c) | OK — carte blanche bordée (1 px, sans ombre) sur fond neutre chaud rgb(247,246,241) ; Accueil, Tarifs, Contact dans l'ordre, filets 1 px entre les lignes ; adresses /, /tarifs, /contact |
| CT-20.2 | Outils → Éléments → onglet *Calculé* (ou *Polices affichées*) sur le titre « Mes pages », sur le titre d'une ligne, puis sur une adresse ; dans la console : `[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family)` | Titre de l'écran en **Fraunces**, texte des lignes en **Instrument Sans**, adresse en **JetBrains Mono** ; les trois familles figurent parmi les polices chargées (SC-07b, SC-07c) | OK — titre Fraunces, lignes Instrument Sans, adresses JetBrains Mono ; les trois familles chargées |
| CT-20.3 | Corriger un emplacement de **Tarifs** et enregistrer, puis revenir à « Mes pages » | La ligne Tarifs porte la marque « Brouillon » (§ 19), sur la ligne de l'adresse, sans décaler le titre ; cliquer n'importe où sur la ligne ouvre l'éditeur de Tarifs | OK — marque sur la ligne de l'adresse de Tarifs, hauteur de ligne inchangée (77 px comme Accueil) ; un clic à l'extrême droite de la ligne ouvre l'éditeur de Tarifs |
| CT-20.4 | Mode appareil à **360 px** de large (360 × 740), avec le brouillon de CT-20.3 ; dans la console : `document.documentElement.scrollWidth` | Valeur **≤ 360** ; aucun défilement horizontal ; titre, adresse et marque de brouillon ne sont pas coupés ; la marque passe sous le titre (SC-07d, SC-07e) | OK — 360 × 740 : scrollWidth 360 ; rien de coupé ; la marque passe sous le titre, sur la ligne de l'adresse |
| CT-20.5 | Titre long : dans `content/pages/tarifs/page.json`, remplacer `"titre": "Tarifs"` par un titre de 80 caractères sans espace (ex. `TarifsDesPrestationsDeMariageEtDeReceptionPourLesGrandesOccasionsDeLaSaisonDEte`), puis un titre de 120 caractères avec espaces ; rebâtir et servir (§ 0.2), ouvrir « Mes pages » à 360 px ; **à la fin, `git restore content/pages` et rebâtir** | Dans les deux cas, `scrollWidth` ≤ 360 ; le titre passe à la ligne sans déborder de la carte, rien n'est coupé ; l'adresse reste lisible sous le titre (SC-07d) | OK — variante `titres-longs` à 360 px : titres de 120 signes (4 lignes) et de 80 signes sans espace (3 lignes) passent à la ligne dans la carte (bord droit ≤ 306 px pour une carte à 328 px), scrollWidth 360, adresses lisibles dessous |
| CT-20.6 | À 360 px, dans la console : ``[...document.querySelectorAll('#liste-des-pages > li, a, button')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)] })`` | Chaque ligne de la liste et chaque lien ou bouton de l'écran mesure **au moins 44 × 44 px** (SC-07e) | OK — 360 px : les trois lignes 294 × 76-77 px, « Ouvrir le menu » 44 × 44 px ; aucune cible sous 44 px |
| CT-20.7 | Sélecteur de couleur (onglet Styles) ou Lighthouse → Accessibilité, sur : le titre de l'écran, le titre d'une ligne, une adresse, la marque « Brouillon » | Chaque texte atteint **≥ 4,5:1** sur son fond ; l'adresse, en texte atténué, aussi (SC-07f) | OK — contrastes calculés : titre 15,41:1, ligne 16,67:1, adresse (atténuée) 6,12:1, marque « Brouillon » 5,2:1 |
| CT-20.8 | Liste vide : déplacer temporairement les trois dossiers de `content/pages/` hors du dépôt, rebâtir et servir, ouvrir « Mes pages » à 1280 px puis à 360 px ; mesurer le contraste du message ; **à la fin, remettre les dossiers en place (`git status` propre) et rebâtir** | Le message « Aucune page n'est disponible pour le moment : il n'y a rien à modifier ici. » s'affiche **dans la carte**, en texte atténué, inchangé ; contraste **≥ 4,5:1** ; à 360 px, `scrollWidth` ≤ 360 (SC-07d, SC-07f) | OK — variante `vide` : « Aucune page n’est disponible pour le moment : il n’y a rien à modifier ici. » dans la carte, texte atténué rgb(91,100,95), contraste 6,12:1 ; aucun bouton ; scrollWidth 1280 puis 360 |

---

## 21. L'éditeur habillé, emplacements de texte — change 005 · ticket 08

Livré par la PR **#122** : le run a mesuré ces points sur l'artefact bâti, ce § les rejoue à la main. Avant la fusion, servir le build de la branche `impl/editeur-emplacements-texte-08`. Aucun test automatique ne voit le rendu de l'éditeur (ni feuille, ni CSP dans `workerd`). **SC-08a reste ouvert** : chaque carte affiche le nom de sa nature ; le nom propre de chaque emplacement, déclaré par l'intégrateur, viendra avec un change dédié — ne pas le chercher ici. Partir d'une base remise à zéro (§ 0.6), session ouverte, console ouverte.

Joué le 2026-10-02 sur `https://colibri.sebc.dev` et les variantes du site factice (`main` `42da591`), au navigateur piloté (`playwright-cli`) : mesures calculées dans la page (contrastes, tailles, polices, `scrollWidth`), sans session pour le § 18.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-21.1 | À 1280 px de large, ouvrir l'éditeur d'**Accueil** | En tête, le lien « ‹ Mes pages » puis le titre de la page ; une carte par emplacement, dans l'ordre Texte riche, Lien de la vidéo, Bouton d'action, Image, Galerie ; chaque carte porte le **nom de sa nature** au-dessus de son contenu, puis ses gestes ; fond neutre chaud, cartes sans ombre (SC-08a, SC-08c) | OK — 1280 px : « ‹ Mes pages » puis « Accueil » ; cartes Texte riche, Lien de la vidéo, Bouton d’action, Image, Galerie dans l'ordre, nature en tête ; fond neutre chaud rgb(247,246,241), cartes blanches cerclées d'un filet 1 px, sans ombre portée |
| CT-21.2 | Outils → Éléments → onglet *Calculé* sur le titre de la page, un titre de carte, le texte d'un champ ; regarder les trois boutons « Enregistrer » | Titre de la page en **Fraunces**, le reste en **Instrument Sans** ; les trois « Enregistrer » dans la couleur principale (plumage), texte blanc (SC-08c) | OK — titre Fraunces, cartes et champs Instrument Sans ; les trois « Enregistrer » en plumage rgb(14,107,85), texte blanc (6,46:1) |
| CT-21.3 | Mode appareil à **360 px** de large (360 × 740) ; parcourir l'éditeur ; corriger le texte riche et enregistrer, puis régler le lien de vidéo et enregistrer | Les cartes se suivent sur **une seule colonne**, en pleine largeur ; dans chaque carte, « Enregistrer » passe sous le contenu, en pleine largeur ; corriger, enregistrer et régler le lien restent possibles ; après le premier enregistrement, la marque « Brouillon » apparaît à côté du titre (SC-08a) | OK — 360 px : cinq cartes en une colonne (296 px de large, même bord gauche) ; les trois « Enregistrer » sous leur contenu, pleine largeur de carte (264 px dans 296 px de carte, marge intérieure comprise) ; texte riche puis lien de vidéo corrigés et enregistrés (lus en base) ; marque « Brouillon » apparue dès le premier enregistrement ; scrollWidth 360 |
| CT-21.4 | Onglet Réseau, limitation *3G lente* ; enregistrer une correction du bouton d'action | Pendant l'envoi, « Enregistrer » est **désactivé** et garde son libellé (aucun « Enregistrement… ») ; il redevient actif à la fin (SC-08b) | OK — envoi retardé de 4 s (interception réseau) : « Enregistrer » désactivé de ~1 s à ~4 s, libellé inchangé, réactivé ensuite ; correction écrite en base |
| CT-21.5 | Outils → Application → Cookies : supprimer le cookie `__Host-…` **sans recharger** ; actionner « Enregistrer » dans chacune des trois cartes de texte ; se reconnecter ensuite (§ 0.3) | Chaque carte affiche, **dans la carte**, « Votre accès a expiré : reconnectez-vous, puis réessayez. » en rouge (danger) sur fond rouge pâle ; les autres cartes ne bougent pas ; rien d'écrit en base (SC-08b) | OK — cookie `__Host-session` supprimé sans recharger, « Enregistrer » des trois cartes de texte : chacune affiche dans la carte « Votre accès a expiré : reconnectez-vous, puis réessayez. », rouge rgb(180,35,24) sur rouge pâle (5,55:1) ; cartes Image et Galerie inchangées ; brouillons en base inchangés (même nombre, mêmes dates) |
| CT-21.6 | À 360 px, dans la console : `document.documentElement.scrollWidth`, au repos puis après les refus de CT-21.5. Titre long : dans `content/pages/accueil/page.json`, remplacer `"titre": "Accueil"` par un titre de 80 caractères sans espace, puis de 120 caractères avec espaces ; rebâtir et servir (§ 0.2) ; **à la fin, `git restore content/pages` et rebâtir** | Dans tous les cas, valeur **≤ 360** ; aucun défilement horizontal ; le titre passe à la ligne avec sa marque de brouillon, rien n'est coupé ; les messages de refus passent à la ligne sans déborder (SC-08d) | OK (titres longs) — variante `titres-longs` à 360 px : titre d'Accueil (120 signes) sur 8 lignes, titre de Tarifs (80 signes sans espace) sur 7 lignes avec sa marque « Brouillon » dessous, bord droit 325 px, scrollWidth 360 ; refus : voir mesure à 360 px plus bas ; OK (refus) — 360 px : scrollWidth 360 au repos et après les trois refus de CT-21.5, messages passés à la ligne dans leur carte |
| CT-21.7 | À 360 px, ouvrir le champ de lien du texte riche (bouton « Lien »), puis dans la console : ``[...document.querySelectorAll('main a, main button, main input, main [contenteditable]')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20) \|\| e.placeholder \|\| e.type, Math.round(r.width), Math.round(r.height), getComputedStyle(e).fontSize] })`` | Chaque lien, bouton et champ des emplacements de texte mesure **au moins 44 × 44 px** (SC-08e) ; les quatre champs de saisie et la zone d'écriture du texte riche ont **la même taille de texte**, 16 px. « Remplacer l'image » et « Ajouter une image » relèvent du ticket 09 : voir CT-22.10 | OK — 360 px, champ de lien du texte riche ouvert : 17 liens, boutons et champs mesurés, aucun sous 44 × 44 px ; les quatre champs de saisie et la zone d'écriture du texte riche à 16 px |
| CT-21.8 | Sélecteur de couleur (onglet Styles) ou Lighthouse → Accessibilité, sur : le titre, un titre de carte, le texte d'un champ, le **texte d'exemple grisé** du champ « Adresse du lien », un message de refus (CT-21.5), la marque « Brouillon », le texte d'un « Enregistrer » | Chaque texte atteint **≥ 4,5:1** sur son fond, texte d'exemple compris (≈ 6:1 attendu) (SC-08f) | OK — titre 15,41:1, titre de carte 16,67:1, texte d'un champ 16,67:1, texte d'exemple grisé de « Adresse du lien » 6,12:1, refus 5,55:1, marque 5,2:1, « Enregistrer » 6,46:1 |
| CT-21.9 | Console ouverte pendant tout le § 21 ; dans le texte riche, taper deux espaces de suite entre deux mots, enregistrer, recharger | **Aucune** violation CSP, et aucun avertissement de l'éditeur de texte riche sur `white-space` (corrigé par la PR **#124**) ; les deux espaces restent deux espaces ordinaires à l'écran, après l'enregistrement et après le rechargement | OK — deux espaces tapés après « pâtisserie » (devant l'espace existant) : trois espaces ordinaires (U+0020) à l'écran, enregistrés tels quels, retrouvés après rechargement (`white-space: break-spaces`) ; console vide (0 message) sur tout le § 21 |

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

Joué le 2026-10-02 sur `https://colibri.sebc.dev` et les variantes du site factice (`main` `42da591`), au navigateur piloté (`playwright-cli`) : mesures calculées dans la page (contrastes, tailles, polices, `scrollWidth`), sans session pour le § 18.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-22.1 | À 1280 px de large, éditeur d'**Accueil**, carte **Image**, sans image posée | La carte dit « Aucune image n'est posée à cet emplacement. » en texte atténué, puis le bouton « Choisir une image » dans la couleur principale | OK — 1280 px, carte Image vide : « Aucune image n'est posée à cet emplacement. » atténué (6,12:1), puis « Choisir une image » en plumage, texte blanc |
| CT-22.2 | « Choisir une image » ; choisir une image | Une sur-couche « Choisir une image » s'ouvre, vignettes sur 3 colonnes, bouton de fermeture (croix) en haut à droite ; au choix, elle se ferme et la carte **montre l'image posée** (plus une phrase) ; la marque « Brouillon » apparaît à côté du titre | OK — sur-couche « Choisir une image », 12 vignettes sur 3 colonnes, croix « Fermer » en haut à droite ; au choix (A · fraisier) elle se ferme et la carte montre l'image (plus de phrase, bouton « Remplacer l'image ») ; marque « Brouillon » à côté du titre (déjà présente depuis le § 21 sur Accueil ; son apparition sur une page sans brouillon est constatée en CT-22.5 sur Contact) |
| CT-22.3 | « Remplacer l'image » ; en choisir une autre ; recharger | La nouvelle image est montrée à la place de l'ancienne, et retrouvée au rechargement (SC-09a) | OK — « Remplacer l'image » → J · buffet : nouvelle image montrée, retrouvée au rechargement |
| CT-22.4 | Carte **Galerie** : « Ajouter une image » trois fois (A, B, C) ; puis Descendre A, Monter C, Retirer B | La sur-couche « Ajouter une image » s'ouvre à chaque ajout ; les vignettes composées s'alignent sur 3 colonnes ; le compte suit (« 3 images composent cette galerie. », puis 2) ; « Monter » est grisé sur la première image, « Descendre » sur la dernière (SC-09a) | OK — Galerie : trois ajouts (fraisier, paris-brest, tarte citron), sur-couche « Ajouter une image » à chaque fois ; vignettes composées sur 3 colonnes ; « 3 images composent cette galerie. » puis « 2 … » après Retirer ; Descendre A, Monter C, Retirer B donnent l'ordre attendu ; « Monter » grisé sur la première, « Descendre » sur la dernière à chaque étape |
| CT-22.5 | Mode appareil à **360 px** de large (360 × 740) ; refaire CT-22.2 à CT-22.4 sur Accueil, puis composer le **carrousel** de **Contact** ; à chaque étape, dans la console : `document.documentElement.scrollWidth` | Tous les gestes restent possibles ; valeur **≤ 360**, sur-couche ouverte comprise ; « Choisir une image », « Remplacer l'image » et « Ajouter une image » prennent toute la largeur de la carte ; les vignettes composées passent sur 2 colonnes (SC-09a) | OK — 360 × 740 : sur Accueil, remplacer l'image, ajouter, monter et retirer dans la galerie ; sur Contact, carrousel composé de trois images (« 3 images composent ce carrousel. ») ; scrollWidth 360 à chaque étape, sur-couche ouverte comprise ; « Remplacer l'image » et « Ajouter une image » à 264 px, pleine largeur de carte ; vignettes composées sur 2 colonnes ; la marque « Brouillon » apparaît sur Contact (0 → 1) au premier ajout |
| CT-22.6 | À 360 px, ouvrir la sur-couche de choix ; faire défiler son contenu jusqu'en bas | La sur-couche occupe l'écran moins 16 px de chaque côté, sans déborder en largeur ; vignettes sur 2 colonnes ; **seul son contenu défile** : le titre et la croix de fermeture restent visibles en haut ; la croix ferme la sur-couche (SC-09b) | OK — 360 px : sur-couche à 16 px de chaque bord, vignettes sur 2 colonnes ; seule sa zone de contenu défile (jusqu'en bas, 312 px) : titre et croix restent à 32 px du haut ; la croix ferme la sur-couche |
| CT-22.7 | Outils → *Rendu* (Chrome) → « Émuler la fonctionnalité CSS prefers-reduced-motion » → `reduce` ; ouvrir puis fermer la sur-couche, à 1280 px et à 360 px | La sur-couche apparaît et disparaît **sans mouvement** (ni zoom, ni glissement) (SC-09c) | OK — `prefers-reduced-motion: reduce` émulé, à 1280 et 360 px : à l'ouverture et à la fermeture, aucune animation active (`getAnimations()` vide, `animation: none`) ; contrôle sans la préférence : animation `enter` de 100 ms sur la sur-couche et son fond |
| CT-22.8 | Outils → Application → Cookies : supprimer le cookie `__Host-…` **sans recharger** ; carte Image : ouvrir le choix et choisir une image ; puis fermer la sur-couche avec la croix | Le refus « Votre accès a expiré : reconnectez-vous, puis réessayez. » s'affiche **dans la sur-couche**, en rouge (danger) sur fond rouge pâle, sous le titre, sans la fermer ; après fermeture, le même texte s'affiche **dans la carte Image**, dans le même style ; les autres cartes ne bougent pas ; rien d'écrit en base (SC-09d) | OK — cookie supprimé sans recharger, carte Image : choisir (chocolats) → « Votre accès a expiré : reconnectez-vous, puis réessayez. » dans la sur-couche, sous le titre, rouge rgb(180,35,24) sur rouge pâle, sur-couche restée ouverte ; fermée par la croix, le même texte, même style, dans la carte Image ; image posée inchangée (facade), autres cartes sans message ; brouillons en base inchangés (7, mêmes dates) |
| CT-22.9 | Toujours sans cookie : carte Galerie, « Ajouter une image » → choisir une image (lire, puis fermer) ; puis « Monter » ou « Retirer » sur une image composée ; se reconnecter ensuite (§ 0.3) | Le refus d'ajout s'affiche dans la sur-couche, puis dans la carte Galerie après fermeture ; le refus de Monter ou Retirer s'affiche **directement dans la carte Galerie** ; même texte, même style qu'en CT-22.8 (SC-09d) | OK — toujours sans cookie : ajout en Galerie (vitrine) refusé dans la sur-couche, puis dans la carte Galerie après fermeture ; sur page fraîche sans message préalable, « Monter » refusé directement dans la carte Galerie (0 → 1 message, aucune sur-couche), même texte et style ; ordre et base inchangés |
| CT-22.10 | À 360 px, galerie composée, dans la console : ``[...document.querySelectorAll('main button, [role=dialog] button')].map(e => { const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label') \|\| e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)] })`` — une fois sur-couche fermée, une fois ouverte | Chaque bouton des cartes Image, Galerie et Carrousel (choix, Monter, Descendre, Retirer, Ajouter) et chaque vignette-bouton et la croix de la sur-couche mesurent **au moins 44 × 44 px** (SC-09e) | OK — 360 px, galerie et carrousel composés : aucun bouton des cartes (choix, Monter, Descendre, Retirer, Ajouter) sous 44 × 44 px ; sur-couche ouverte : vignettes-boutons et croix (44 × 44) non plus |
| CT-22.11 | Sélecteur de couleur (onglet Styles) ou Lighthouse → Accessibilité, sur : le texte « Aucune image… », le compte d'images, le texte des boutons **actifs**, le titre de la sur-couche, son message vide (« La bibliothèque ne contient encore aucune image. », cf. CT-13.7), un message de refus (CT-22.8) | Chaque texte atteint **≥ 4,5:1** sur son fond (≈ 5,5:1 au plus faible, attendu). Les boutons **désactivés**, grisés à ≈ 3,2:1, sont exemptés (SC-09f) | OK — « Aucune image… » 6,12:1, compte « 2 images composent cette galerie. » 6,12:1, boutons actifs (Choisir/Remplacer/Ajouter 6,46:1 ; Monter/Descendre/Retirer 15,41:1), titre de la sur-couche 16,67:1, message vide « La bibliothèque ne contient encore aucune image. » 6,12:1 (bibliothèque vidée par `raz`), refus 5,55:1 ; boutons désactivés à 3,2:1, exemptés |
| CT-22.12 | Console ouverte pendant tout le § 22 | **Aucune** violation CSP, ni à l'ouverture de la sur-couche ni pendant son défilement | OK — console relue après ouverture, défilement complet et choix dans la sur-couche (360 px), puis ouverture à 1280 px, et à la fin de chaque page du § 22 : 0 message, aucune violation CSP |

## 23. Le code arrive en recette — change 007 · ticket 03

Se joue **sur le serveur de recette seulement** : en local, aucun e-mail ne part (§ 0.3). Instance bâtie
après `recette.mjs instance` (`senderAddress` = `code@colibri.sebc.dev`). Le critère SC-03a a été coché par
la PR **#157** sans constat ; il est constaté ici. Joué le 2026-10-02 sur l'adresse d'aperçu de la branche
`impl/code-arrive-en-recette-03` (`bcdc5bf`), adresse autorisée = l'adresse Gmail de l'opérateur.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-23.1 | Compte Cloudflare de recette : `npx wrangler email routing list` | L'acheminement d'e-mail est activé sur le domaine de `senderAddress` | OK — zone `sebc.dev` activée (`ready`), MX Cloudflare sur `sebc.dev` et `colibri.sebc.dev` |
| CT-23.2 | Soumettre l'adresse autorisée sur `/admin/connexion` | Un message arrive dans la boîte de l'adresse autorisée (SC-03a) | OK — reçu dans la boîte de réception (pas en indésirables) |
| CT-23.3 | Lire l'en-tête et le corps du message | Expéditeur = `senderAddress` ; objet `Votre code de connexion` ; texte seul ; corps `Code : XXXXXXXX` | OK — expéditeur `code@colibri.sebc.dev`, aucune partie HTML, code de huit signes |
| CT-23.4 | Recopier le code reçu | La session s'ouvre (cf. CT-3.2) | OK — constaté par l'opérateur |
| CT-23.5 | `recette.mjs journal` lancé avant la demande | Aucune ligne `[connexion] envoi du code échoué` | NA — sur une adresse d'aperçu, le journal ne reçoit rien (pas même les requêtes) ; l'arrivée du message (CT-23.2) exclut l'échec |

## 24. La carte Coordonnées — change 008 · ticket 06

Cas visuels, jamais observables en `workerd` (aucun navigateur) : à jouer sur l'instance locale ou de
recette, connectée (§ 0.3), à 1280 px puis à 360 px.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-24.1 | Ouvrir `Réglages` sur une instance où rien n'a été enregistré | Aucune des trois cartes ne porte la marque « Brouillon » (SC-06d) | OK — 2026-10-08, recette (aperçu), 1280 px |
| CT-24.2 | Carte Coordonnées : parcourir les champs | Aucun geste d'ajout, de retrait, de renommage ni de déplacement (SC-06a) | OK — 2026-10-08 : trois champs et « Enregistrer », aucun autre geste |
| CT-24.3 | Saisir `abc` dans le téléphone, « Enregistrer » | Le champ du téléphone est marqué en erreur (texte danger), message « Un numéro de téléphone, de 6 à 15 chiffres. » ; la saisie reste ; aucune marque « Brouillon » nouvelle (SC-06b) | OK — 2026-10-08 : message en text-danger sous le champ, aria-invalid=true, « abc » gardé, aucune marque, base inchangée |
| CT-24.4 | Corriger le téléphone, « Enregistrer » | Pendant l'envoi, le bouton est inactif et dit « Enregistrement… » ; au succès la marque « Brouillon » paraît aussitôt dans la carte Coordonnées, sans changement d'écran ; les cartes Réseaux sociaux et Mention gardent leur état (SC-06c) | OK — 2026-10-08 (envoi retardé de 3 s) : « Enregistrement… » + bouton inactif ; marque aussitôt, même page ; Réseaux et Mention sans marque |
| CT-24.5 | Recharger l'écran | La carte Coordonnées garde la marque et les valeurs saisies (SC-06c) | OK — 2026-10-08 : marque et « 04 11 22 33 44 » après rechargement |
| CT-24.6 | Couper la connexion, « Enregistrer » | Message « La connexion a échoué… » ; la saisie est gardée | OK — 2026-10-08 (fetch rejeté, simule hors ligne) : message affiché, saisie gardée, base inchangée |
| CT-24.7 | À 360 px | Champs et bouton mesurent au moins 44 px de haut ; console : aucune violation CSP | OK — 2026-10-08 : champs 44/44/90 px, bouton 44 px, pas de défilement horizontal (360), console sans violation CSP |

## 25. La carte Réseaux sociaux — change 008 · ticket 07

Gestes de composition au navigateur, jamais observables en `workerd` : à jouer sur l'instance locale ou
de recette, connectée (§ 0.3), à 1280 px puis à 360 px.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-25.1 | Carte Réseaux sociaux : « Ajouter un lien », corriger le nom d'un autre, « Retirer » un troisième, « Monter » le dernier, puis « Enregistrer » | La carte montre la liste résultante dans le nouvel ordre et porte la marque « Brouillon » (SC-07a) |  OK — 2026-10-09, recette (aperçu), 1280 px : LinkedIn ajouté, Facebook renommé « Facebook de l'atelier », Pinterest retiré, LinkedIn monté ; la carte montre Instagram, LinkedIn, Facebook de l'atelier avec la marque « Brouillon » ; la base porte la même liste dans cet ordre, gardée au rechargement |
| CT-25.2 | Liste vide | « Aucun lien pour l'instant. » et « Ajouter un lien » (SC-07a) |  OK — 2026-10-09 : les trois liens retirés → « Aucun lien pour l'instant. » et « Ajouter un lien » |
| CT-25.3 | Premier lien / dernier lien | « Monter » inactif sur le premier, « Descendre » inactif sur le dernier ; libellés accessibles « Monter Instagram » (SC-07a) |  OK — 2026-10-09 : « Monter Instagram » inactif (premier), « Descendre Pinterest » inactif (dernier) ; libellés « Monter Instagram », « Retirer Facebook »… |
| CT-25.4 | Saisir `http://exemple.fr` comme adresse, « Enregistrer » | Le champ de l'adresse dit « Une adresse qui commence par https:// » ; la saisie reste ; rien n'est enregistré (SC-07e) |  OK — 2026-10-09 : champ marqué invalide, « Une adresse qui commence par https:// », saisie gardée, base inchangée |
| CT-25.5 | Atteindre 12 liens | « Ajouter un lien » disparaît, « La liste est complète (12 liens au plus). » paraît (SC-07f) |  OK — 2026-10-09 : au 12e lien « Ajouter un lien » disparaît, « La liste est complète (12 liens au plus). » paraît |
| CT-25.6 | À 360 px | Champs et boutons d'au moins 44 px de haut ; aucune violation CSP en console |  OK — 2026-10-09 : 17 champs et boutons, le plus petit à 44 px, pas de défilement horizontal (360), console sans violation CSP |

## 26. La carte Mention d'information — change 008 · ticket 08

| N° | Geste | Résultat attendu | OK / KO |
|---|---|---|---|
| CT-26.1 | Sur la carte, sélectionner un mot puis actionner « Gras », « Italique », puis « Lien », « Liste », « Titre » | Chaque mise en forme se pose sans écrire de balise (SC-08d) | OK — 2026-10-08, recette (aperçu), 1280 px : Gras → `<strong>`, Italique → `<em>`, Lien → `<a href=https…>`, Liste → `<ul><li>`, Titre → `<h2>` (Liste et Titre défaits par un second appui) ; aucune balise écrite dans le texte |
| CT-26.2 | Poser du gras et un lien https, « Enregistrer » | La carte porte la marque « Brouillon » (SC-08a) | OK — 2026-10-08 : marque « Brouillon » aussitôt dans la carte ; base : `Les **informations** … _uniquement_ … [tiers](https://exemple.fr/donnees).` |
| CT-26.3 | Vider le texte, « Enregistrer » | « La mention ne peut pas rester vide. » ; rien n'est enregistré (SC-08c) | OK — 2026-10-08 : « La mention ne peut pas rester vide. » (alerte), réponse 400 ; base inchangée |
| CT-26.4 | Saisir un lien `http://…` dans « Adresse du lien » | Le lien est refusé avec son message (SC-08b) | OK — 2026-10-08 : champ marqué invalide, « Ce lien n'est pas accepté : il doit commencer par https://, mailto:, tel: ou /. », lien non posé |
| CT-26.5 | À 360 px | Boutons d'au moins 44 px ; aucune violation CSP en console | OK — 2026-10-08 : boutons 50/66/47/51/50 × 44 px, « Enregistrer » 262 × 44 px, pas de défilement horizontal (360), mise en forme jouée à 360 px, console sans violation CSP |

---

## 27. La liste des formulaires — change 010 · ticket 02

Session ouverte. Ouvrir `/admin/formulaires`.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-27.1 | Cliquer « Formulaires » dans le menu | L'écran s'ouvre ; « Formulaires » est la seule rubrique marquée active | OK — depuis « Mes pages », le clic ouvre `/admin/formulaires` ; « Formulaires » seule en surbrillance (fond vert, texte blanc) et seule `aria-current="page"`, dans la barre latérale comme dans le tiroir du téléphone ; console vide, aucune violation CSP |
| CT-27.2 | Lire la liste | « Devis atelier » puis « Devis gâteau », chacun sur une ligne entière cliquable | OK — « Devis atelier » puis « Devis gâteau » (ce dernier avec sa marque « Brouillon », laissée par le § 28) ; chaque lien couvre toute sa ligne (990 × 46 px) : un clic au bord droit ouvre l'écran du formulaire |
| CT-27.3 | Chercher un geste d'ajout, retrait, renommage ou déplacement | Aucun, ni dans le menu ni sur l'écran ; aucun terme technique ni identifiant visible | OK — aucun bouton hors « Replier le menu » et « Ouvrir le menu », aucun champ, aucun élément à glisser ni modifiable ; texte visible : les cinq rubriques, « Formulaires », les deux noms, « Brouillon » — aucun identifiant |
| CT-27.4 | Ouvrir l'adresse de la variante `sans-formulaire` | « Aucun formulaire n'est prévu pour votre site. », sans bouton de création | OK — adresse d'aperçu `site-sans-formulaire` : « Aucun formulaire n’est prévu pour votre site. », aucun bouton ni lien dans la zone principale, « Formulaires » active ; seule erreur de console, le 404 de `favicon.ico` |
| CT-27.5 | Ouvrir `/admin/formulaires` sans session | Renvoi vers la connexion, aucun formulaire montré | OK — sans cookie, 302 vers `/admin/connexion`, corps vide ; au navigateur, l'écran de connexion s'affiche et la page ne contient aucun nom de formulaire |

## 28. L'écran d'un formulaire, corriger les options — change 010 · ticket 07

Session ouverte. Ouvrir « Devis gâteau » depuis `/admin/formulaires`.

Joué le 2026-10-11 sur l'adresse d'aperçu de la branche `impl/corriger-les-options-depuis-l-ecran-07` (`d9499f1`), au navigateur piloté (`playwright-cli`), à partir d'un formulaire sans brouillon. Console : aucune violation CSP sur tout le §, seuls le 404 de `favicon.ico` et le 400 attendu du refus.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-28.1 | Monter « Fraise » de deux rangs, puis « Enregistrer » | « Fraise », « Vanille », « Chocolat » dans cet ordre ; la marque « Brouillon » apparaît à côté du titre sans changement d'écran ; la saisie reste affichée ; « Modifications enregistrées. Elles seront visibles sur le site après publication. » | OK — 1280 px : Fraise, Vanille, Chocolat à l'écran et en base (10, 8 et 9 €) ; marque « Brouillon » apparue à côté du titre, même page (témoin JS conservé, adresse inchangée) ; saisie gardée ; message de confirmation affiché |
| CT-28.2 | Écrire « douze » dans le prix d'une option, puis « Enregistrer » | Message en haut ; la ligne fautive porte « Un montant en euros, par exemple 12 ou 12,50. » ; toute la saisie reste ; la marque n'apparaît pas si elle n'y était pas | OK — « Rien n'est enregistré : corrigez les choix signalés. » en haut, rouge sur rouge pâle ; sous le prix de Fraise, « Un montant en euros, par exemple 12 ou 12,50. » (`aria-invalid`, relié par `aria-describedby`) ; les 15 zones gardent leur saisie, « douze » compris ; aucune marque ; aucun brouillon en base |
| CT-28.3 | Cliquer « Ajouter un choix » | Le curseur est dans la ligne vide | OK — « Ajouter un choix dans Parfum » : le curseur est dans la zone « Choix » de la nouvelle ligne, vide, 4e de la carte |
| CT-28.4 | Garder une seule option dans un champ | « Retirer » inactif, « Gardez au moins un choix. » | OK — Occasion réduite à « Baptême & communion » : « Retirer » inactif, « Gardez au moins un choix. » affiché |
| CT-28.5 | Pendant l'envoi | Le bouton est inactif et affiche « Enregistrement… » | OK — envoi retardé de 3 s (interception réseau) : à 1 s, bouton inactif, « Enregistrement… », pas encore de marque ; actif et « Enregistrer » à la fin |
| CT-28.6 | Sur téléphone, monter, descendre, retirer au doigt et au clavier | Les boutons sont assez grands et atteignables ; aucun terme technique ni identifiant visible | OK — 360 × 740 au navigateur : `scrollWidth` 360, 47 boutons, zones et liens tous ≥ 44 × 44 px ; au clavier, Tab mène du prix à « Descendre Fraise » puis « Retirer Fraise » (« Monter », inactif, est sauté), Entrée descend Fraise ; aucun terme technique ni identifiant dans le texte de l'écran. Pas joué au doigt sur un vrai téléphone |
| CT-28.7 | Écrire « douze » dans le prix d'une option, puis « Enregistrer » | L'écran se place sur ce prix et le curseur y est ; le message en haut reste affiché | OK — après le refus, le prix de Fraise est dans la vue et a le curseur ; le message du haut reste en place, au-dessus de la première carte (hors de la vue tant qu'on ne remonte pas) |
| CT-28.8 | Ouvrir « Devis gâteau » | Un seul bouton « Enregistrer » à l'écran, et il enregistre | OK — un seul « Enregistrer » (celui de l'îlot, `type="submit"`) ; c'est lui qui enregistre en CT-28.1 |

## 29. Aperçu et publication sur la vraie chaîne — change 011 · ticket 19

Prérequis (gestes humains, guidés par le skill `recette`, § Publication réelle) : dépôt privé de recette, clé `JETON_DEPOT` posée sur le Worker de recette, reconstruction automatique branchée sur la seule branche principale. Jouer CT-31.1 avant de poser `JETON_DEPOT`. Session ouverte sur `https://colibri.sebc.dev/admin/`. La colonne Résultat reste vide tant que le cas n'a pas été joué sur l'instance : un cas non constaté n'est jamais coché.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-29.1 | Modifier un texte d'une page avec un texte unique, suffixé de l'heure (« Ouvert le lundi 14h32 »), « Publier », confirmer ; lancer `$R chrono https://colibri.sebc.dev/<page> "<texte>"` au moment de la confirmation ; une fois chrono réussi, recharger un écran de l'administration puis l'écran Publier | La page publique présente le texte en moins de 5 minutes (SC-004) ; l'administration dit la publication en ligne : la pastille du cadre dit « Site à jour » et l'écran Publier dit « Votre site est à jour. » (capture à l'appui). Si le chronomètre expire, lire le journal de la reconstruction ; sur « Impossible de récupérer les images publiées », poser `COLIBRI_CLE_LECTURE_DEPOT` (clé `Contents: Read-only` sur le dépôt de recette, variable secrète de construction de Workers Builds, compte de recette), relancer, puis rejouer le cas | OK — 2026-10-14 : « Ouvert le mardi 09h56 » en ligne 44 s après la confirmation (`chrono` : 51 s, lancé 7 s avant le clic) ; la pastille dit « Site à jour » et l'écran Publier « Votre site est à jour. » (captures) |
| CT-29.2 | Publier un brouillon qui porte des images et du texte ; relever l'activité du dépôt de recette avec `gh api 'repos/<propriétaire>/<dépôt>/activity?per_page=10' --jq '.[] | [.id, .ref, .activity_type, .timestamp] | @tsv'` et garder cette sortie comme preuve | Pour cette publication, l'entrée de `refs/heads/media` (force_push, ou branch_creation à la toute première publication) précède celle de `refs/heads/main` (push), selon l'`id` croissant et pas seulement l'heure. Les images arrivent ainsi sur la branche des images avant le contenu sur la branche principale | OK — `media` force_push 46441861553 (07:57:43) avant `main` push 46441865555 (07:57:46) ; même ordre pour la publication de 40 images (46442206192 avant 46442210629) et pour celle de 45 (46468731855 avant 46468735701) |
| CT-29.3 | Relever les reconstructions lancées par cette publication | Une seule, déclenchée par la branche principale ; le dépôt sur la branche des images n'en lance aucune (FR-089) | OK — une seule reconstruction par publication, sur le commit de `main` ; aucune sur le commit de `media` ; un seul déploiement à chaque fois (07:58:19, 08:02:14) |
| CT-29.4 | Ouvrir la page publique après reconstruction | Les images publiées s'affichent : la reconstruction a bien récupéré la branche des images | OK — la galerie publique sert toutes ses images en 200 (41, puis 45) ; la reconstruction récupère `media` du dépôt privé sans `COLIBRI_CLE_LECTURE_DEPOT` |
| CT-29.5 | Mesurer : publication à 1 image, à 40 images, puis durée d'une reconstruction | Durées consignées ci-dessous et comparées à `BAIL` (5 min, `src/core/publication/depot.ts`) et `BORNE_MISE_EN_LIGNE` (30 min, `src/core/publication/etat.ts`) ; si infirmées, corriger ces constantes sans toucher l'ADR-0023 | OK — voir Mesures : durées très en deçà de `BAIL` (5 min) et de `BORNE_MISE_EN_LIGNE` (30 min) ; constantes inchangées |
| CT-29.6 | À 360 px, ouvrir un gabarit public | `scrollWidth` ≤ 360, aucun défilement horizontal | OK — `scrollWidth` 360 sur `/`, `/tarifs` et `/contact` |
| CT-29.7 | À 360 px, ouvrir l'écran Publier | Lisible, boutons ≥ 44 × 44 px, aucun terme de développeur | KO — lisible, aucun terme de développeur, « Publier maintenant » 167 × 44 et « Annuler » 89 × 44 ; mais les liens « Voir mon site » et « Voir l'aperçu » n'offrent qu'environ 20 px de hauteur de toucher (spec `mise-en-page-administration`, « Gestes au doigt sur écran étroit » : 44 × 44) |
| CT-29.8 | À 360 px, tiroir fermé | « Publier » reste visible en haut de l'écran | OK — menu replié, « Publier » reste en haut à droite (72 × 44) |
| CT-29.9 | Ouvrir l'aperçu d'une page | Le bandeau, hors de la page, dit que ce n'est pas encore en ligne ; aucun terme de développeur | OK — bandeau « Aperçu — cette page n'est pas encore en ligne. » au-dessus de la page, hors de son menu ; aucun terme de développeur |

Mesures (2026-10-14, images JPEG d'environ 150 Kio) : 1 image ≈ 7 s (3 images envoyées : la neuve et les 2 de démonstration, dont la base n'avait pas encore l'empreinte) · 40 images ≈ 41 s (5,9 Mio, une passe) · reconstruction ≈ 33 à 41 s (envoi sur `main` → déploiement) · publication → page en ligne 44 s (1 image), 85 s (40 images).

## 30. Plus d'images qu'une passe n'en porte — change 011 · ticket 17

Constat SC-17a, reporté au ticket 19 : à jouer sur la recette raccordée (prérequis du § 29). La colonne Résultat reste vide tant que le cas n'a pas été joué.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-30.1 | Poser 45 images dans la galerie d'Accueil, ouvrir « Publier », cliquer une seule fois sur « Publier maintenant » | Sans autre geste, l'écran affiche « Envoi des images : 40 sur 45 » et monte jusqu'à « 45 sur 45 », puis « C'est publié. Votre site sera à jour dans quelques minutes. Vous pouvez continuer à travailler. ». Ensuite, la branche `media` du dépôt de recette porte les 45 images, relevé par `gh api 'repos/<propriétaire>/<dépôt>/git/trees/media?recursive=1' --jq '[.tree[] \| select(.type=="blob" and (.path \| startswith("medias/")))] \| length'` | OK — 2026-10-14, un seul clic : « Envoi des images : 40 sur 45 » à 36 s, « 45 sur 45 » à 41 s, « C'est publié… » à 48 s ; `media` porte les 45 images (88 fichiers : les 41 images que cette publication efface restent jusqu'à sa finalisation, D5, et partent à la publication suivante, qui laisse 47 = 45 + 2 de démonstration) |

## 31. Publication impossible ou refusée — change 011 · ticket 16

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-31.1 | SC-16b, à jouer AVANT de poser `JETON_DEPOT` : sur la recette sans clé ni dépôt raccordé, modifier une page, ouvrir « Publier », confirmer | L'écran dit que la publication n'a pas pu se faire, sans aucun terme de développeur (dépôt, GitHub, jeton, commit, branche, build, déploiement) ; la page garde sa marque de brouillon dans « Mes pages » et dans l'éditeur ; noter le texte exact affiché | OK — 2026-10-14, recette sans clé ni dépôt : « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos modifications sont intacts. Réessayez dans quelques minutes. » ; Accueil garde « Brouillon » dans « Mes pages » et dans l'éditeur |
| CT-31.2 | SC-16a, sur la recette raccordée : geste humain, dans son terminal, `$R secret-depot` avec une clé invalide ou en lecture seule ; modifier une page, ouvrir « Publier », confirmer | L'écran affiche « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos modifications sont intacts. Réessayez dans quelques minutes. » ; la page garde sa marque de brouillon ; aucun nouveau dépôt dans le dépôt de recette ; le site public est inchangé. Puis reposer la bonne clé de la même façon | OK — 2026-10-14, clé `Contents: Read-only` : même message, joué deux fois ; « Brouillon » gardé ; aucun dépôt (`main` et `media` inchangés, aucune activité) ; page d'accueil publique identique octet pour octet ; bonne clé reposée ensuite. Réserve : ni l'écran ni le journal ne nomment la cause ; la même publication a réussi une fois la clé d'écriture posée |

## 32. Une publication à la fois — change 011 · ticket 15

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-32.1 | SC-15f, sur la recette raccordée, au moins un brouillon : deux onglets sur « Publier ». Cliquer « Publier maintenant » dans l'onglet A puis, pendant « Publication… », dans l'onglet B | B affiche « Une publication est déjà en cours. Attendez qu'elle se termine, puis réessayez. » ; A va au bout | OK — 2026-10-14 : B affiche « Une publication est déjà en cours. Attendez qu'elle se termine, puis réessayez. » pendant que A dépose 45 images (CT-30.1) ; A va au bout (« C'est publié… ») |

## 33. Une demande part par e-mail — change 012 · ticket 07

Constat de l'arrivée réelle de l'e-mail, qui ne se joue pas en local (ticket 07). À jouer sur la recette, sur la page « Contact » qui pose le formulaire « Devis gâteau », l'adresse autorisée étant la boîte de recette. La colonne Résultat reste vide tant que le cas n'a pas été joué.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-33.1 | Sur « Contact », choisir « Fraise » et « 10 parts », renseigner une adresse e-mail, actionner « Envoyer ma demande » | « Merci, votre demande a été envoyée. » remplace le formulaire et reçoit le focus | |
| CT-33.2 | Consulter la boîte de recette | Un e-mail venu de l'adresse d'expéditeur de l'instance, d'objet « Demande de devis — Devis gâteau ». Sa source (afficher l'original) ne porte aucune partie HTML. Ses lignes viennent dans l'ordre : formulaire « Devis gâteau », page « Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Total indicatif : 40 € (estimation non engageante) », puis les coordonnées renseignées | |
| CT-33.3 | Saisir `<a href="https://piege.example">Code : 123456</a>` dans « Votre nom » et envoyer | La saisie paraît telle quelle, balises comprises, sur une seule ligne derrière « Votre nom : », et la source de l'e-mail n'a aucune partie HTML | |
| CT-33.4 | Saisir dans « Votre message » plusieurs lignes, dont « Total indicatif : 0 € », et envoyer | Sous « Votre message : », chaque ligne commence par `  > `. La seule ligne qui commence par « Total indicatif » est celle du produit (40 €) | |

## 34. Le seuil des demandes par origine — change 012 · ticket 12

Constat de l'origine que Cloudflare attribue réellement à chaque envoi, qui ne se voit pas en local : sans l'en-tête `CF-Connecting-IP`, tous les envois locaux comptent sous une même origine (ticket 12, FR-062). À jouer sur la recette, sur la page « Contact » qui pose le formulaire « Devis gâteau », l'adresse autorisée étant la boîte de recette, depuis un même appareil et une même connexion à internet. La fenêtre est une heure d'horloge (de 14 h 00 à 15 h 00, par exemple) : jouer CT-34.1 à CT-34.3 dans la même heure, en commençant au moins 15 minutes avant sa fin, sans autre envoi depuis cette connexion dans l'heure, § 33 compris (tout envoi compte, même refusé). La colonne Résultat reste vide tant que le cas n'a pas été joué.

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-34.1 | Envoyer cinq demandes complètes sur « Contact » (« Fraise », « 10 parts », une adresse e-mail), en rechargeant la page entre deux envois | Chaque envoi affiche « Merci, votre demande a été envoyée. » ; cinq e-mails arrivent dans la boîte de recette | |
| CT-34.2 | Dans la même heure, depuis le même appareil, envoyer une sixième demande complète | « Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure. » paraît et reçoit le focus ; « Fraise », « 10 parts » et l'adresse restent saisis ; le bouton « Envoyer ma demande » est de nouveau actif ; aucun sixième e-mail n'arrive. Dans les outils de développement, onglet Réseau, la réponse de `/api/public/demandes` est un 429 sans en-tête `Set-Cookie` (SC-12f, SC-12g) | |
| CT-34.3 | Dans la même heure, depuis le même appareil, dans un autre onglet, soumettre l'adresse autorisée sur `/admin/connexion` | L'écran ne dit pas « Trop de tentatives de connexion… » et le code arrive dans la boîte de recette : la connexion a son propre seuil (SC-12d) | |
| CT-34.4 | Après le début de l'heure suivante, revenir à l'onglet de CT-34.2 et, sans recharger, actionner de nouveau « Envoyer ma demande » | « Merci, votre demande a été envoyée. » ; l'e-mail arrive (SC-12c) | |

## 35. La liste des demandes — change 013 · ticket 03

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-35.1 | Ouvrir « Demandes » depuis le menu, au téléphone (tiroir) | La liste s'ouvre, « Demandes » est marquée active ; chaque demande se lit en carte empilée : date, formulaire, page, coordonnée, total, suite | |
| CT-35.2 | Envoyer une demande dont l'e-mail ne peut pas partir, puis ouvrir la liste | La ligne porte la pastille « E-mail non parti » | |
| CT-35.3 | Ouvrir la liste sans aucune demande | « Aucune demande n'est encore arrivée. Les demandes envoyées depuis les formulaires du site paraîtront ici. » | |

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

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-36.1 | Avec des demandes de deux formulaires, ouvrir « Demandes » au téléphone et toucher le nom d'un formulaire dans la rangée « Formulaire : » | Seules les demandes de ce formulaire restent, la plus récente d'abord ; son nom est marqué comme courant | |
| CT-36.2 | Depuis ce filtre, toucher « Tous » | Les demandes de tous les formulaires reparaissent | |
| CT-36.3 | Les demandes du préalable semées, ouvrir « Demandes » au téléphone, toucher « Demandes plus anciennes » puis « Demandes plus récentes » ; refaire le parcours après avoir touché « Devis gâteau » dans la rangée « Formulaire : » | « Page 2 sur N » paraît puis on revient à la première page ; le filtre choisi est gardé d'une page à l'autre | |
| CT-36.4 | Les demandes du préalable semées, ouvrir « Demandes » au téléphone, repérer « Ancien devis » dans la rangée « Formulaire : » et le toucher | Elles restent listées sous son nom et le filtre le propose toujours | |

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

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-37.1 | Les demandes du préalable semées, sans les témoins retirés, ouvrir « Demandes » au téléphone | En haut, « N demandes · N commandes » puis un tableau Formulaire / Demandes / Commandes, formulaires par nom, lisible sans défiler de côté | |
| CT-37.2 | Sans aucune demande, ouvrir « Demandes » | « 0 demande · 0 commande », aucun tableau | |
| CT-37.3 | Les demandes du préalable semées, toucher « Devis gâteau » dans la rangée « Formulaire : » puis « Demandes plus anciennes » | Les nombres du haut et du tableau ne changent pas | |
| CT-37.4 | Les témoins retirés du préalable semés en plus, ouvrir « Demandes » au téléphone | « · 2 retirées » suit les nombres du haut ; le tableau porte la colonne Retirées ; il se lit sans défiler de côté | |

## 38. Le détail d'une demande — change 013 · ticket 06

Le retrait n'existe pas encore et l'envoi est borné par le seuil par origine (§ 34) : la demande se sème en base, sur la base locale du § 0.2 :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-38-message', 'devis-gateau', 'Devis gâteau', 'a-renseigner', 'presente', 1767225600000, 'Contact', null, 'marie@exemple.fr', '[{\"etiquette\":\"Votre nom\",\"valeur\":\"Marie Dupont\"},{\"etiquette\":\"Votre message\",\"lignes\":[\"Bonjour,\",\"\",\"mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm\",\"Merci\"]}]', 'non-parti');"
```

Après les cas, l'effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-38-%';"
```

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-38.1 | La demande semée, ouvrir « Demandes » au téléphone puis toucher sa date | Sous « Votre message » : « Bonjour, », une ligne vide qui garde sa place, le mot long, « Merci », l'un sous l'autre | |
| CT-38.2 | Même écran, au téléphone (360 px) | Le mot de 80 caractères passe à la ligne, aucun défilement de côté | |
| CT-38.3 | Même écran | La pastille « E-mail non parti » et sa mention sous le titre, « Demandes » marquée active dans le menu, et le lien « ← Toutes les demandes » ramène à la liste | |

## 39. Noter la suite d'une demande — change 013 · ticket 07

Les demandes se sèment en base, sur la base locale du § 0.2 :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-39-suite', 'devis-gateau', 'Devis gâteau', 'devis-envoye', 'presente', 1792238700000, 'Contact', null, 'marie@exemple.fr', '[]', 'parti'), ('recette-39-neuve', 'devis-gateau', 'Devis gâteau', 'a-renseigner', 'presente', 1792242300000, 'Contact', null, 'paul@exemple.fr', '[]', 'parti');"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-39-%';"
```

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-39.1 | Au téléphone (360 px), ouvrir « Demandes » | La liste déroulante de la ligne du 17 octobre 2026 à 14:05 mesure au moins 44 px de haut (getBoundingClientRect) ; choisie au pouce, « Commande » s'y pose ; le nombre de commandes de la phrase du haut et la cellule « Commandes » de « Devis gâteau » augmentent de 1, sans rechargement (SC-07b) | |
| CT-39.2 | Recharger, puis toucher la date pour ouvrir le détail | La ligne et la liste déroulante du détail portent toujours « Commande » (SC-07a) | |
| CT-39.3 | La ligne de la demande neuve (15:05) | La liste montre « À renseigner », que l'on ne peut pas choisir (grisée) ; « Sans suite », « Devis envoyé » et « Commande » se choisissent | |
| CT-39.4 | Avec un lecteur d'écran (NVDA ou VoiceOver), mettre le focus sur la liste de la ligne de 14:05 | Elle est annoncée « Suite de la demande du 17 octobre 2026 à 14:05 » | |
| CT-39.5 | Outils → Réseau → bloquer l'URL de requête `/admin/demandes/recette-39-suite/suite`, puis choisir une autre suite dans la liste | La liste revient à la suite d'avant ; « La suite n'a pas pu être enregistrée. Réessayez dans quelques instants. » paraît sous la ligne, et le lecteur d'écran l'annonce sans couper la lecture ; après déblocage et rechargement, la demande porte toujours la suite d'avant (SC-07c) | |
| CT-39.6 | Même blocage, depuis l'écran du détail | Même retour, même message, sous la liste du détail (SC-07c) | |

## 40. Retirer une demande depuis son détail — change 013 · ticket 08

Les demandes se sèment en base, sur la base locale du § 0.2 :

```sh
npx wrangler d1 execute DB --local --command "insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel) values ('recette-40-a', 'devis-gateau', 'Devis gâteau', 'devis-envoye', 'presente', 1792238700000, 'Contact', null, 'Marie Dupont marie@exemple.fr', '[]', 'parti'), ('recette-40-b', 'devis-gateau', 'Devis gâteau', 'commande', 'presente', 1792242300000, 'Contact', null, 'Paul Martin paul@exemple.fr', '[]', 'parti');"
```

Après les cas, les effacer :

```sh
npx wrangler d1 execute DB --local --command "delete from demandes where id like 'recette-40-%';"
```

| ID | Étapes | Attendu | Résultat |
|---|---|---|---|
| CT-40.1 | Au clavier seul, ouvrir le détail de la demande de Marie Dupont, atteindre « Retirer cette demande », l'activer | Le dialogue s'ouvre, le focus est sur « Annuler » ; Tab et Maj+Tab ne sortent jamais du dialogue ; « Retirer » est inactif tant qu'aucun motif n'est choisi, aucun motif n'est coché d'avance | |
| CT-40.2 | Dans le dialogue, appuyer sur Échap | Le dialogue se ferme, le focus revient sur « Retirer cette demande » ; la demande reste dans la liste avec sa suite (SC-08b) | |
| CT-40.3 | Avec un lecteur d'écran (NVDA ou VoiceOver), ouvrir le dialogue | Il est annoncé comme dialogue, avec son titre « Retirer cette demande ? » et son texte ; les deux motifs sont annoncés comme boutons radio d'un groupe « Raison du retrait » | |
| CT-40.4 | Choisir « Retrait ordinaire », puis « Retirer » | « Retrait en cours… » est annoncé, puis l'écran mène à la liste à jour : la demande de Marie Dupont n'y est plus, le nombre « retirée » de la phrase du haut gagne 1 (SC-08a) | |
| CT-40.5 | Outils → Réseau → bloquer l'URL `/admin/demandes/retrait`, ouvrir le dialogue d'une demande, choisir un motif, « Retirer » | Le message « Le retrait n'a pas pu se faire : aucune demande n'a été retirée. Réessayez dans quelques instants. » est annoncé dans le dialogue, qui reste ouvert ; la demande reste dans la liste | |

## Bilan

| Section | Cas | OK | KO | NA |
|---|---|---|---|---|
| 1 Porte et sécurité | 8 | | | |
| 2 Demander un code | 11 | | | |
| 3 Recopier le code, session | 15 | | | |
| 4 Cadre | 9 | | | |
| 5 Liste des pages | 4 | | | |
| 6 Éditeur | 7 | | | |
| 7 Bouton d'action | 8 | | | |
| 8 Lien de vidéo | 7 | | | |
| 9 Texte riche | 7 | | | |
| 10 Écran Médias | 14 | | | |
| 11 Fiche | 7 | | | |
| 12 Octets | 4 | | | |
| 13 Poser / remplacer | 7 | | | |
| 14 Galerie / carrousel | 8 | | | |
| 15 Supprimer partout | 6 | | | |
| 16 Écritures forgées | 2 | | | |
| 17 Site public | 2 | | | |
| 18 Connexion habillée | 10 | 9 | 0 | 1 |
| 19 Marque de brouillon | 6 | 6 | 0 | 0 |
| 20 Mes pages habillé | 8 | 8 | 0 | 0 |
| 21 Éditeur habillé | 9 | 9 | 0 | 0 |
| 22 Emplacements d'image habillés | 12 | 12 | 0 | 0 |
| 23 Code en recette | 5 | 4 | 0 | 1 |
| 29 Publication sur la vraie chaîne | 9 | 8 | 1 | 0 |
| 30 Images en plusieurs passes | 1 | 1 | 0 | 0 |
| 31 Publication impossible ou refusée | 2 | 2 | 0 | 0 |
| 32 Une publication à la fois | 1 | 1 | 0 | 0 |
| 33 Une demande part par e-mail | 4 | | | |
| 34 Seuil des demandes par origine | 4 | | | |
| 35 Liste des demandes | 3 | | | |
| 36 Filtre et pages des demandes | 4 | | | |
| 37 Nombres des demandes | 4 | | | |
| 38 Détail d'une demande | 3 | | | |
| 39 Suite d'une demande | 6 | | | |
| 40 Retrait d'une demande | 5 | | | |
| **Total** | **208** | | | |

Testé par : ________ · Date : ________ · Commit de `main` : ________ · Navigateur : ________
