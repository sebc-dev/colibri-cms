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
$R session [--hote <h>]     # ouvre une session sans e-mail → .wrangler/recette/etat-<h>.json
$R sql "<requête>"          # lit/écrit la base de recette (remplace le `--local` du cahier)
$R raz                      # remet à zéro (équivalent § 0.6), resème l'adresse
$R journal                  # journaux du serveur en direct (le terminal de `wrangler dev`)
```

Réglages du compte : `.env.recette` (hors dépôt, `.env.*`). Configuration de déploiement : **dérivée**
à chaque passe de `dist/server/wrangler.json` vers `dist/server/wrangler.recette.json` — jamais
`wrangler.jsonc` ni `wrangler.astro.jsonc`, qui restent sans identifiant du compte (CLAUDE.md).

## Deux usages

| Usage | Branche | Commande | Adresse |
|---|---|---|---|
| Cahier de test | `main` à jour | `npm run typecheck && npm run build && $R deployer --principal` | `https://colibri.sebc.dev/admin/` |
| Relecture d'un ticket | `impl/…` | `npm run typecheck && npm run build && $R deployer` | l'**adresse d'aperçu** imprimée (`https://<branche>-colibri-recette.chauveau-sebastien.workers.dev/admin/`) |

Pour le cahier de test, le contenu servi est le **site factice** (`recette/site-factice/`) et non
`content/pages/` : c'est le skill `site-factice` qui bâtit et appelle `deployer` pour vous.

Sur une branche autre que `main`, `deployer` **ne touche pas** au serveur principal : il téléverse une
version avec un alias au nom de la branche. **Mais la base est partagée** : les migrations de la
branche s'y appliquent. Une branche qui ajoute une migration → la recette de `main` la voit aussi.

## Se connecter

- **Parcours réel (l'e-mail)** — ne marche pas encore : `src/platform/email/index.ts` envoie le code
  *depuis* l'adresse destinataire (Gmail), or Cloudflare n'envoie que depuis un domaine routé
  (« You can only send from your routing domains »). Le code est écrit en base, l'e-mail ne part
  pas, et l'échec est avalé (`connexion.astro`, `.catch(() => {})`) : `journal` ne montre rien.
  Tant que ce n'est pas corrigé : CT-2.1/2.2 et CT-3.x sont **KO** ou non jouables en recette, et
  se jouent en local (§ 0.3 du cahier). Une fois corrigé : le code arrive dans la boîte de
  `RECETTE_ADRESSE` — le lire par le MCP Gmail (`subject:"code de connexion" newer_than:1h`).
- **Session de relecture** — `$R session` insère une ligne `sessions` (opaque : la ligne suffit) et
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
| § 0.3 fichier `.wrangler/tmp/email/…` | Gmail (quand l'envoi sera corrigé) |
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

Le domaine personnalisé est créé par `deployer --principal` (route `custom_domain`). **Ne jamais
activer Email Routing sur le domaine principal d'une zone dont le courrier est ailleurs** (ici
`sebc.dev` → OVH) : il remplacerait ses MX. Si un routage est nécessaire, l'activer sur le seul
sous-domaine (dashboard → Email Routing → Settings → Subdomains).

## Ce qui reste hors d'atteinte

- La base est unique : deux relectures simultanées se marchent dessus — `raz` efface tout.
- Les versions d'aperçu ne se suppriment pas une à une ; elles restent sans effet sur le principal.
- Le compte est celui de l'opérateur, pas celui d'une cliente : SC-012/SC-013 (révocation
  d'Isometria) ne se recettent pas ici.
