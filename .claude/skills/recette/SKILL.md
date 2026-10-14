---
name: recette
description: Monte, déploie et pilote le serveur de recette ColibriCMS sur Cloudflare (vraie D1, vraie liaison send_email, HTTPS sur colibri.sebc.dev) — pour dérouler docs/cahier-de-test.md au plus près de la production, ou pour relire une branche en cours d'implémentation dans un vrai navigateur (playwright-cli) sur son adresse d'aperçu. Utiliser quand on parle de recette, de cahier de test, de serveur de test/staging, de « voir la branche en vrai », ou de relecture visuelle d'un ticket.
---

# Recette sur Cloudflare

Un Worker `colibri-recette`, séparé du produit, sert **l'artefact bâti** avec une **D1 distante**
(`colibri-recette`) et la **vraie liaison `send_email`**. Tout passe par un script :

```sh
R="node .claude/skills/recette/scripts/recette.mjs"
$R deployer [--principal]   # migre la base, sème l'adresse, publie
                            # --alias <nom> : nom d'aperçu imposé ; --racine <dossier> : build fait ailleurs
$R instance [--racine <d>]  # pose domaine + expéditeur de la recette dans instance.json, AVANT le build
$R session [--hote <h>]     # ouvre une session sans e-mail → .wrangler/recette/etat-<h>.json
$R sql "<requête>"          # lit/écrit la base de recette (remplace le `--local` du cahier)
$R raz                      # remet à zéro (équivalent § 0.6), resème l'adresse
$R secret-depot             # geste HUMAIN, dans son propre terminal : pose JETON_DEPOT (invite masquée)
$R chrono <url> <texte>     # chronomètre : combien avant que la page présente le texte
$R depot <clone>            # compose le dépôt de recette dans son clone (§ Publication réelle)
$R journal                  # journaux du serveur en direct (le terminal de `wrangler dev`)
```

Réglages du compte : `.env.recette` (hors dépôt, `.env.*`). Configuration de déploiement : **dérivée**
à chaque passe de `dist/server/wrangler.json` vers `dist/server/wrangler.recette.json` — jamais
`wrangler.jsonc` ni `wrangler.astro.jsonc`, qui restent sans identifiant du compte (CLAUDE.md).

## Deux usages

| Usage | Branche | Commande | Adresse |
|---|---|---|---|
| Cahier de test | `main` à jour | `$R instance && npm run typecheck && npm run build && $R deployer --principal; git checkout instance.json` | `https://colibri.sebc.dev/admin/` |
| Relecture d'un ticket | `impl/…` | `$R instance && npm run typecheck && npm run build && $R deployer; git checkout instance.json` | l'**adresse d'aperçu** imprimée (`https://<branche>-colibri-recette.chauveau-sebastien.workers.dev/admin/`) |

Pour le cahier de test, le contenu servi est le **site factice** (`recette/site-factice/`) et non
`content/pages/` : c'est le skill `site-factice` qui bâtit et appelle `deployer` pour vous.

Sur une branche autre que `main`, `deployer` **ne touche pas** au serveur principal : il téléverse une
version avec un alias au nom de la branche. **Mais la base est partagée** : les migrations de la
branche s'y appliquent. Une branche qui ajoute une migration → la recette de `main` la voit aussi.

## Se connecter

- **Parcours réel (l'e-mail)** — le code arrive dans la boîte de `RECETTE_ADRESSE`, expédié depuis
  `senderAddress`, l'adresse que déclare le fichier d'instance du build (`code@<RECETTE_DOMAINE>`
  par défaut, ou `RECETTE_EXPEDITEUR`). Ce fichier est posé par `$R instance` **avant** le build
  (le skill `site-factice` le fait pour vous) ; aucune valeur de recette n'entre dans `wrangler.jsonc`
  ni `wrangler.astro.jsonc`. Lire le code par le MCP Gmail (`subject:"Votre code de connexion"
  newer_than:1h`) : objet fixe, texte seul, `From` = `senderAddress`. Prérequis, **geste humain** :
  l'acheminement d'e-mail activé sur le domaine de `senderAddress` dans le compte Cloudflare de
  recette (sinon Cloudflare refuse : « You can only send from your routing domains »).
  Un envoi refusé n'empêche pas l'écran de saisie (même réponse, anti-énumération) mais laisse
  une **ligne d'échec** : la chercher avec `$R journal` (à lancer en arrière-plan avant la demande).
  `$R journal` ne suit que le serveur principal : sur une **adresse d'aperçu**, il ne reçoit rien,
  pas même les requêtes (constaté le 2026-10-02) — y vérifier l'arrivée du message plutôt.
- **Session de relecture** — plus le détour obligé : sert à la relecture visuelle. `$R session` insère une ligne `sessions` (opaque : la ligne suffit) et
  écrit l'état de stockage Playwright. Le cookie est `__Host-` : **propre à un nom d'hôte**, donc
  `--hote <nom-de-l'aperçu>` pour une adresse de branche.

## Piloter le navigateur (skill `playwright-cli`)

```sh
$R session --hote colibri.sebc.dev
playwright-cli -s=recette open
playwright-cli -s=recette state-load .wrangler/recette/etat-colibri.sebc.dev.json
playwright-cli -s=recette goto https://colibri.sebc.dev/admin/mes-pages
playwright-cli -s=recette resize 360 740                                   # CT-*.4 à 360 px
playwright-cli -s=recette eval "document.documentElement.scrollWidth"      # ≤ 360
playwright-cli -s=recette console                                          # violations CSP = KO
playwright-cli -s=recette screenshot
playwright-cli -s=recette close
```

Un ticket relu = une session nommée (`-s=<NN>`), pour ne pas mêler les cookies de deux hôtes.
`console` est le **contrôle transverse CSP** : la CSP est invisible aux tests `workerd`, ici elle
est réellement appliquée. Une 404 de `favicon.ico` n'est pas un défaut du produit.

## Traduire le cahier de test

| Cahier (local) | Recette |
|---|---|
| `http://127.0.0.1:8787` | `https://colibri.sebc.dev` (ou l'adresse d'aperçu) |
| `wrangler d1 execute DB --local --command "…"` (§ 0.5, CT-3.12, 3.13…) | `$R sql "…"` |
| § 0.6 Remettre à zéro | `$R raz` |
| § 0.3 fichier `.wrangler/tmp/email/…` | Gmail : message dans la boîte de `RECETTE_ADRESSE` |
| Terminal de `wrangler dev` | `$R journal` (à lancer en arrière-plan) |
| Modifier `content/pages/`, rebâtir, relancer (CT-5.4, 20.5, 20.8, 21.6) | Ouvrir l'adresse de la **variante** du site factice (`site-vide-…`, `site-titres-longs-…`, `site-rang-…`) — skill `site-factice` |
| § 0.4 Le jeu d'images | `site.mjs images` (skill `site-factice`) |
| CT-16 page forgée sur `localhost:8080` | Inchangé : viser `https://colibri.sebc.dev/admin/…` depuis `http://localhost:8080` (autre site → `SameSite=Strict` retient le cookie) |
| CT-18.10 vrai téléphone | Ouvrir `https://colibri.sebc.dev/admin/connexion` directement |

`__Host-` exige HTTPS : sur la recette, CT-3.3 se vérifie pour de vrai (en local il dépend de l'outil).

## Avant de commencer

1. `npx wrangler whoami` — si « Not logged in » et que l'opérateur est **à distance** : lancer
   `npx wrangler login --browser=false` **en arrière-plan**, lui donner le lien imprimé, lui faire
   coller l'adresse `http://localhost:8976/oauth/callback?code=…` sur laquelle son navigateur
   échoue, puis la rejouer ici avec `curl -s '<adresse>'`.
2. `.env.recette` présent (sinon § Première installation).
3. `playwright-cli --version` — sinon `npm install -g @playwright/cli@0.1.21` puis
   `playwright-cli install --skills` (déjà fait dans ce dépôt).

## Première installation (autre compte, autre machine)

```sh
npx wrangler d1 create colibri-recette            # → database_id
# destination vérifiée : dashboard → Email Service → Email Routing → Destination addresses,
# ou POST /accounts/<compte>/email/routing/addresses {"email": "<adresse>"} puis clic dans l'e-mail
```

Puis écrire `.env.recette` :

```
RECETTE_COMPTE=<account id>        RECETTE_WORKER=colibri-recette
RECETTE_BASE=colibri-recette       RECETTE_BASE_ID=<database_id>
RECETTE_DOMAINE=<sous-domaine d'une zone du compte>
RECETTE_ADRESSE=<adresse vérifiée, devient l'adresse autorisée>
```

Optionnel : `RECETTE_EXPEDITEUR=<adresse d'expéditeur>` (défaut `code@<RECETTE_DOMAINE>`), et
`RECETTE_DEPOT=<propriétaire>/<dépôt>`, le dépôt de recette que lit `depot` (§ Publication réelle).
**Activer l'acheminement d'e-mail sur le domaine de cette adresse** (dashboard → Email Routing),
sans quoi aucun code n'arrive.

Le domaine personnalisé est créé par `deployer --principal` (route `custom_domain`). **Ne jamais
activer Email Routing sur le domaine principal d'une zone dont le courrier est ailleurs** : il
remplacerait ses MX. Si un routage est nécessaire, l'activer sur le seul sous-domaine (dashboard →
Email Routing → Settings → Subdomains). Ici, `sebc.dev` n'a plus de courrier ailleurs : depuis le
2026-10-02, Email Routing y est activé sur la zone entière (MX Cloudflare), ce qui couvre
`colibri.sebc.dev`. État réel : `npx wrangler email routing list`.

## Publication réelle (SC-004, FR-089)

Pour prouver « publié, en ligne en moins de 5 minutes » sur la vraie chaîne, le Worker de recette
est rebâti par Workers Builds depuis un **dépôt de recette** GitHub privé (`RECETTE_DEPOT`). Ce
dépôt est le seul à porter les identifiants du compte de recette : ils ne vont jamais dans le dépôt
produit. Trois **gestes humains** :

1. un dépôt GitHub **privé** pour le site de recette, créé vide par l'humain. Le remplir est
   scripté, l'agent peut le faire. Depuis le dépôt produit, sur le commit à recetter :

   ```sh
   S="node .claude/skills/site-factice/scripts/site.mjs"
   $S deployer standard --principal       # migre la base et sème l'adresse, AVANT l'étape 3
   git clone git@github.com:<RECETTE_DEPOT>.git ../colibri_recette
   $R depot ../colibri_recette            # compose et commite ; n'envoie rien
   git -C ../colibri_recette push -u origin HEAD:main    # en premier : main devient la branche par défaut
   git -C ../colibri_recette push origin media
   ```

   `depot` recopie le produit au HEAD et remplace `content/pages/` par le site factice. Il écrit
   `instance.json` : `domain`, `senderAddress` et `depotDePublication` = `RECETTE_DEPOT` (sans ce
   champ, toute publication échoue avant le dépôt). Il récrit `wrangler.jsonc` et
   `wrangler.astro.jsonc` avec le Worker, la base, l'adresse et le domaine de recette : Workers
   Builds exige le nom du Worker connecté, et `npx wrangler deploy` suit après le build la
   configuration que l'adaptateur en dérive. Il retire `.github/` : aucune action GitHub ne tourne
   dans ce dépôt. Si le dépôt n'a pas de branche `media`, il la pose avec les images du produit,
   sans quoi la reconstruction échoue sur l'image absente (SC-06f). Rejouer `depot` sur un clone à
   jour (`git pull` d'abord) recompose tout, contenu du site factice compris ;
2. une clé à portée fine sur ce seul dépôt (`Contents: Read and write`), posée par
   `$R secret-depot` en secret `JETON_DEPOT` du Worker de recette. L'humain lance lui-même
   `$R secret-depot` dans un terminal interactif et tape la clé à l'invite masquée. L'agent ne lance
   jamais cette commande, ne demande jamais la clé dans la conversation et ne la fait jamais passer
   par `echo … |` ni par un argument ;
3. la reconstruction automatique (Workers Builds) branchée sur la **seule** branche principale :
   tableau de bord → Workers & Pages → `colibri-recette` → Settings → Builds → Connect, le dépôt
   de recette. Commande de construction `npm run build`, commande de déploiement
   `npx wrangler deploy` (le défaut), répertoire racine vide. Dans Branch control : branche de
   production `main`, et **Enable Preview Builds décoché**, pour qu'un dépôt sur `media` ne
   déclenche rien (FR-089). Une reconstruction part à chaque dépôt sur `main` ; pour la première,
   pousser un commit vide (`git -C ../colibri_recette commit --allow-empty -m "recette : première
   reconstruction" && git -C ../colibri_recette push`).

La clé que Workers Builds crée pour ses constructions n'a aucun droit sur D1 : la reconstruction
n'applique pas les migrations. Avant de recetter une version du produit qui en ajoute une,
l'appliquer par un aperçu (`$S deployer standard`, sans `--principal` : il migre la base partagée),
puis rejouer `$R depot` et les envois de l'étape 1.

Une fois la reconstruction automatique branchée, ne plus lancer `$R deployer` vers le serveur
principal (depuis `main` ou avec `--principal`) : il remplacerait le Worker bâti depuis le dépôt de
recette par un Worker sans `depotDePublication`. Les aperçus de branche restent permis.

Puis dérouler `docs/cahier-de-test.md` § 29 : `$R chrono` à la confirmation, dépôts relevés dans le
dépôt de recette (images avant contenu, une seule reconstruction), mesures à 1 et 40 images.
Si `$R chrono` expire (CT-29.1), ouvrir le journal de la reconstruction dans Workers Builds. S'il
contient « Impossible de récupérer les images publiées », poser une clé à portée fine
`Contents: Read-only` sur le dépôt de recette comme variable secrète de construction
`COLIBRI_CLE_LECTURE_DEPOT` de Workers Builds, dans le compte de recette (jamais dans le dépôt
produit), puis relancer la reconstruction.
Ce que l'agent ne constate pas lui-même est remonté pour constat humain, jamais attesté.

## Ce qui reste hors d'atteinte

- La base est unique : deux relectures simultanées se marchent dessus — `raz` efface tout.
- Les versions d'aperçu ne se suppriment pas une à une ; elles restent sans effet sur le principal.
- Le compte est celui de l'opérateur, pas celui d'une cliente : SC-012/SC-013 (révocation
  d'Isometria) ne se recettent pas ici.
