# Site factice de recette

Portée : hors-cycle
Ouvert le 2026-09-28 · Actualisé le 2026-09-28 · branche `chore/site-factice-recette` · HEAD `031a6f7`

## Objectif
Versionner dans le dépôt un site factice — pages, emplacements, jeu d'images — qui rende jouables
tous les cas de `docs/cahier-de-test.md` sur le serveur de recette Cloudflare, sans toucher au code
du produit ; et un skill `site-factice` qui le bâtit, le sème et le déploie.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — le serveur sur lequel le site se greffe (118 l.)
à lire      `src/platform/contenu/pages.ts` — le chargement du contenu, chemin figé (100 l.)
à lire      `src/pages/admin/medias/televerser.ts` — la porte d'entrée pour semer les images (84 l.)
à extraire  `src/core/pages/declaration.ts` › `NatureEmplacement` … `type Emplacement` — le schéma d'un page.json (284 l.)
à extraire  `docs/cahier-de-test.md` › § 0.4, § 0.7, CT-5.4, note sous CT-14, CT-20.5, CT-20.8, CT-21.6, en-tête § 22 — les cas qui exigent un contenu particulier (530 l.)
à situer    `.claude/skills/recette/scripts/recette.mjs` — à étendre, pas à relire en entier
à situer    `openspec/changes/006-nom-des-emplacements/` — changera le schéma des emplacements : le site devra suivre

## Acquis
- `content/pages/` est empaqueté au build par un `import.meta.glob` à chemin figé. J'ai décidé de ne
  pas le paramétrer : chaque variante se bâtit dans un worktree jetable dont `content/pages/` est
  remplacé par celui de la variante.
- Le cahier attend des contenus incompatibles entre eux (3 pages ; deux galeries sur une page ;
  titres de 80 et 120 signes ; aucune page). J'ai retenu une variante par contenu, sous
  `recette/site-factice/<variante>/`, chacune servie sur son adresse d'aperçu `site-<variante>` ;
  le serveur principal garde la variante `standard`.
- `sharp` est présent dans `node_modules` (via Astro) : j'allais générer le jeu d'images du § 0.4
  par un script versionné plutôt que commiter des binaires (`lourde.jpg` > 2 Mo).
- La bibliothèque (≥ 12 images pour le § 22) se sème par `POST /admin/medias/televerser` avec une
  session de `recette.mjs session`, jamais par écriture directe en base.
- Navigateur : playwright-cli, choisi par l'utilisateur.

## Prochaine étape
Poser `recette/site-factice/standard/pages/` à partir de `content/pages/`, puis ajouter à
`recette.mjs` un `deployer --site <variante>` qui bâtit dans le worktree jetable.

## Écarté
- Paramétrer le chemin du contenu dans le produit — toucherait le code livré pour un besoin de test.
- Un seul site « complet » cumulant tous les cas — contredirait les attendus du cahier (CT-5.1 : trois pages ; CT-6.1 : cinq emplacements).
- Écrire les médias directement en D1 — court-circuiterait la reconnaissance des formats par les octets, que le cahier vérifie.
- Serveur MCP Playwright — remplacé par playwright-cli à la demande de l'utilisateur.

## Issue
Fait le 2026-09-28 sur `chore/site-factice-recette` : le skill `recette` (serveur Cloudflare,
aperçu par branche, session de relecture) en `876a408`, le site factice et le skill
`site-factice` en `64628c5`. Les quatre variantes ont été déployées et contrôlées au navigateur
(playwright-cli). Reste ouvert, hors de ce chantier : le code de connexion ne part pas en
conditions réelles (`from` = destinataire) — à porter par un change dédié.
