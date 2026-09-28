---
name: site-factice
description: Bâtit, déploie et garnit le site factice de recette (recette/site-factice/ — pages, variantes, jeu d'images) sur le serveur de recette Cloudflare, pour que chaque cas de docs/cahier-de-test.md soit jouable sans modifier content/pages/. Utiliser pour préparer une recette, servir une variante (titres longs, liste vide, deux galeries), générer le jeu d'images du § 0.4, semer une bibliothèque garnie, ou ajouter/modifier une variante quand le cahier ou le schéma des pages évolue.
---

# Site factice de recette

Le contenu vit dans `recette/site-factice/` (lire son `README.md` avant de le modifier). Ce skill
le **bâtit dans un arbre de travail jetable** — `git worktree` au HEAD, sous
`.wrangler/recette/arbre`, `content/pages/` remplacé par la variante — puis le publie par le
skill `recette` (`recette.mjs deployer --racine … --alias …`), dont il suppose les prérequis
(`.env.recette`, wrangler connecté, `playwright-cli` : voir son `SKILL.md` § Avant de commencer).

```sh
S="node .claude/skills/site-factice/scripts/site.mjs"
$S variantes                          # nom, cas servis, description
$S deployer standard --principal      # la base → https://colibri.sebc.dev/admin/
$S deployer <variante>                # → https://site-<variante>-colibri-recette.<compte>.workers.dev/admin/
$S images                             # jeu d'images → .wrangler/recette/images/{cahier,bibliotheque}/
$S semer-bibliotheque --hote <h>      # 12 images « A · … » à « L · … » par la vraie route de téléversement
```

## Préparer une recette complète

1. Être sur `main` à jour — **le build part du HEAD** : du code non commité n'y est pas (le script
   l'annonce par ⚠).
2. `$S deployer standard --principal`, puis `$S deployer rang`, `titres-longs`, `vide` — les quatre
   adresses coexistent.
3. `node .claude/skills/recette/scripts/recette.mjs raz` — la base est **partagée** par toutes les
   variantes et par les aperçus de branche.
4. `$S images` — le jeu du § 0.4. L'opérateur est souvent **à distance** : lui envoyer les fichiers
   de `.wrangler/recette/images/cahier/` (SendUserFile) pour qu'il les téléverse depuis son
   navigateur ; `lourde.jpg` pèse ~6 Mo.
5. `$S semer-bibliotheque --hote colibri.sebc.dev` **seulement** avant les cas qui supposent une
   bibliothèque garnie (§ 22, au moins une douzaine d'images) — le § 10 part d'une bibliothèque vide.

## Rejouer un cas soi-même (playwright-cli)

```sh
node .claude/skills/recette/scripts/recette.mjs session --hote <h>
playwright-cli -s=site open
playwright-cli -s=site state-load .wrangler/recette/etat-<h>.json
playwright-cli -s=site goto https://<h>/admin/mes-pages
playwright-cli -s=site upload .wrangler/recette/images/cahier/menteur.png   # après un clic sur « Téléverser une image »
```

Les vignettes se chargent à la demande (`loading="lazy"`) : attendre avant une capture, ou vérifier
`img.naturalWidth > 0`. La 404 sur `/admin/medias/media-fixture-*/octets` est attendue : les
emplacements d'image de la base référencent des images absentes de la bibliothèque (CT-6.3).

## Faire évoluer

- Un cas nouveau du cahier exige un contenu → une **variante** (`README.md` § Le modifier), jamais
  une modification de `content/pages/` du produit.
- Le schéma des pages change → mettre à jour `pages/` et les pages recopiées des variantes, puis
  `$S deployer` chaque variante et ouvrir « Mes pages » et un éditeur sur chaque adresse.
- Les deux scripts vivent sous `.claude/skills/`, exclu du lint et de knip : les garder lisibles
  sans eux.
