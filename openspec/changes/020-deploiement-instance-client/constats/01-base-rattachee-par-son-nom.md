# Constat 1 — La base se rattache par son nom, sans identifiant

Cahier de recette du premier constat préalable aux tickets du change 020 (`design.md`, D3 et D4).

## Ce qu'on cherche à savoir

Le design affirme qu'aucun identifiant de base n'a besoin d'être écrit, ni dans `instance.json`, ni
dans un fichier `wrangler` : l'outil de déploiement retrouverait la base par son nom, `colibri`, à
la mise à niveau comme au déploiement. Ce fait a été lu dans le code de `wrangler` 4.129, jamais
joué. Ce cahier le joue.

Si tous les cas passent, D3 tient tel quel. Si CT-C1.3 ou CT-C1.5 échoue, le repli de D3 s'applique :
l'identifiant entre dans `instance.json`, et l'ADR-0005 est à amender.

## Ce que ce cahier ne couvre pas

- La même commande jouée **par Workers Builds**, avec une clé de construction qui a le droit sur la
  base : c'est le constat de D4, à jouer ensuite.
- La branche `media` atteinte ou non sans clé : c'est le constat 2.

## Terrain

Le compte Cloudflare de recette, celui de `RECETTE_COMPTE` dans `.env.recette`. Le cahier y crée un
Worker `colibri-cms` et une base `colibri`, les noms exacts du produit, puis les supprime. Il ne
touche ni au Worker `colibri-recette`, ni à la base `colibri-recette`, ni au dépôt de recette, ni à
`colibri.sebc.dev`.

Toutes les commandes se lancent à la racine du dépôt du produit, sur `main`, arbre propre, avec les
fichiers `wrangler` **non modifiés**. C'est le cœur de l'épreuve : aucune configuration dérivée,
aucun `--config`.

```sh
# Le compte visé, lu dans .env.recette ; à refaire dans chaque terminal.
export CLOUDFLARE_ACCOUNT_ID="$(grep '^RECETTE_COMPTE=' .env.recette | cut -d= -f2)"
export CI=true          # wrangler ne pose aucune question
A="$(grep '^RECETTE_ADRESSE=' .env.recette | cut -d= -f2)"   # adresse vérifiée du compte
```

## Conventions

- **OK** : le résultat attendu est constaté, la sortie est recopiée dans la colonne Verdict.
- **KO** : il ne l'est pas ; la sortie est recopiée, et la suite du cahier s'arrête si le cas est
  marqué *bloquant*.
- **Informatif** : le cas n'a pas d'attendu qui décide ; on note ce qui se passe.
- Chaque verdict porte sa date et la version de `wrangler` (`npx wrangler --version`).

## 0. Préalables

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C1.0a | `git status --short` ; `git rev-parse --abbrev-ref HEAD` | Arbre propre, sur `main` | OK avec écart — 2026-11-16, wrangler 4.129.0 : sur `main` ; l'arbre porte deux écarts sans effet sur l'épreuve, `docs/security.md` modifié et le dossier du change non suivi. Aucun fichier `wrangler` ni `instance.json` touché |
| CT-C1.0b | `npx wrangler whoami` | Connecté ; le compte de `RECETTE_COMPTE` figure dans la liste | OK — 2026-11-16, wrangler 4.129.0 : connecté, compte de 32 caractères lu dans `.env.recette` |
| CT-C1.0c | `npx wrangler d1 list --json` | Aucune base nommée `colibri`. *Bloquant* : s'il en existe une, s'arrêter et demander | OK — 2026-11-16, wrangler 4.129.0 : bases du compte `colibri-recette`, `sebcdev`, `sebc-dev-db` ; aucune `colibri` |
| CT-C1.0d | `npx wrangler deployments list --name colibri-cms` | Échec : aucun Worker `colibri-cms` dans le compte. *Bloquant* : s'il existe, s'arrêter et demander | OK — 2026-11-16, wrangler 4.129.0 : « This Worker does not exist on your account. [code: 10007] » |
| CT-C1.0e | `grep -n database_id wrangler.jsonc wrangler.astro.jsonc instance.json` | Aucune ligne | OK — 2026-11-16, wrangler 4.129.0 : aucune ligne (`grep` rend 1) |

## 1. La mise à niveau de la base

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C1.1 | **Sans base.** `npx wrangler d1 migrations apply DB --remote` | Échec, avec un message qui nomme la base `colibri` introuvable. Puis `npx wrangler d1 list --json` : toujours aucune base `colibri` (la commande n'en a créé aucune) | OK — 2026-11-16, wrangler 4.129.0 : code de sortie 1, « Couldn't find a D1 DB named 'colibri' (bound as 'DB') in the API. Run 'wrangler d1 create colibri' to create it. » ; la liste des bases est inchangée |
| CT-C1.2 | `npx wrangler d1 create colibri` ; noter l'identifiant rendu (**ID-A**). Puis `git status --short` | La base est créée. Aucun fichier du dépôt n'est modifié : si `wrangler` a écrit l'identifiant dans un fichier `wrangler`, le noter et faire `git checkout` du fichier | OK — 2026-11-16, wrangler 4.129.0 : « Successfully created DB 'colibri' in region WEUR », **ID-A** = `3e53c0e1-1db5-48b7-a4d0-427d5439f3e0`. `wrangler` propose d'écrire l'identifiant dans la configuration ; hors terminal interactif il répond non (« Using fallback value in non-interactive context: no »). Aucun fichier modifié |
| CT-C1.3 | **Base vide.** `npx wrangler d1 migrations apply DB --remote`. *Bloquant* | Les 17 mises à niveau sont appliquées, dans l'ordre, sans qu'aucun identifiant ait été fourni. Noter le fichier de configuration que la sortie dit avoir lu (attendu : `wrangler.jsonc`) | OK — 2026-11-16, wrangler 4.129.0 : les 17 mises à niveau, de `0001_amorce.sql` à `0017_remplacement_adresse.sql`, toutes ✅, code de sortie 0, sans identifiant fourni. La sortie ne nomme pas le fichier lu ; lancé à la racine sans `--config`, seul `wrangler.jsonc` porte le nom `colibri` et `migrations_dir` |
| CT-C1.3b | `npx wrangler d1 execute colibri --remote --command "select count(*) as n from d1_migrations"` ; `npx wrangler d1 list --json` | `n` vaut 17. Une seule base `colibri`, d'identifiant **ID-A** | OK — 2026-11-16, wrangler 4.129.0 : `n` = 17 ; une seule base `colibri`, `3e53c0e1-…` = **ID-A** |
| CT-C1.4 | **Base à niveau.** Rejouer `npx wrangler d1 migrations apply DB --remote` | Aucune mise à niveau à appliquer ; code de sortie 0 ; `n` vaut toujours 17 | OK — 2026-11-16, wrangler 4.129.0 : « ✅ No migrations to apply! », code de sortie 0 |

## 2. Le déploiement

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C1.5a | `npm run typecheck && npm run build` ; `grep -c database_id dist/server/wrangler.json` ; `cat .wrangler/deploy/config.json` | La construction aboutit. `0` : la configuration produite ne porte aucun identifiant de base. Le renvoi désigne `dist/server/wrangler.json` | OK — 2026-11-16, wrangler 4.129.0 : `typecheck` 0, construction aboutie ; `grep -c database_id` = 0 ; le renvoi désigne `../../dist/server/wrangler.json`, qui porte `name: colibri-cms` et `d1_databases: [{binding: DB, database_name: colibri, migrations_dir: ../../migrations}]`, sans `routes` ni `workers_dev` |
| CT-C1.5 | `npx wrangler deploy`. *Bloquant* | Le déploiement aboutit. La sortie liste la liaison `DB` rattachée à la base `colibri`. Noter l'adresse `workers.dev` rendue (**URL**) et recopier le tableau des liaisons | OK — 2026-11-16, wrangler 4.129.0 : 45 fichiers envoyés, code de sortie 0. Liaisons : `env.EXPEDITEUR_CODE_CONNEXION (unrestricted)` Send Email ; `env.DB (colibri)` D1 Database ; `env.ASSETS` Assets. **URL** = `https://colibri-cms.chauveau-sebastien.workers.dev` (l'adresse par défaut est ouverte tant que rien ne la ferme : la dérivation de D3 devra poser `workers_dev: false`) |
| CT-C1.5b | `npx wrangler d1 list --json` ; `git status --short` | Toujours une seule base `colibri`, d'identifiant **ID-A** : le déploiement n'en a créé aucune autre. Aucun fichier suivi n'est modifié (le déploiement n'a écrit aucun identifiant dans un fichier `wrangler`) | OK — 2026-11-16, wrangler 4.129.0 : une seule base `colibri`, **ID-A** ; aucun fichier suivi modifié |
| CT-C1.6 | **Preuve par l'effet.** `npx wrangler d1 execute colibri --remote --command "insert into adresses_autorisees (adresse) values ('$A')"`. Ouvrir **URL**`/admin/connexion`, saisir l'adresse `$A`, demander un code. Puis `npx wrangler d1 execute colibri --remote --command "select count(*) as n from codes_connexion"` | `n` vaut 1 : le Worker déployé a écrit dans la base **ID-A**. L'arrivée du message n'est pas attendue (l'adresse d'expéditeur du produit est celle d'exemple). Si `n` vaut 0, lire la table du seuil par origine (migration 0012) avant de conclure, et recopier `npx wrangler tail colibri-cms` pendant un nouvel essai | OK, cas corrigé — 2026-11-16, wrangler 4.129.0 : joué par `curl`. Un premier `POST` sans cookie n'écrit aucun code (`n` = 0) mais une ligne dans `comptes_seuil` : le Worker écrit déjà dans la base. Le code exige le cookie `identifiant-appareil`, que pose le `GET` de l'écran : `GET` puis `POST` avec ce cookie et l'en-tête `Origin` → `n` = 1. Dans `colibri-recette`, le dernier code date de dix heures plus tôt : la base de recette n'a rien reçu |
| CT-C1.7 | **Redéployer.** `npx wrangler deploy`, puis rejouer les deux lectures de CT-C1.5b et le `select` de CT-C1.6 | Une seule base, **ID-A** ; `n` vaut toujours 1 : le second déploiement s'est rattaché à la même base | OK — 2026-11-16, wrangler 4.129.0 : joué avec CT-C1.8. La sortie du second déploiement dit `env.DB (inherited)` : la liaison est reprise du déploiement précédent. Une seule base, **ID-A** ; les lignes écrites sont toujours là |

## 3. La commande de mise en ligne, d'un seul tenant

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C1.8 | `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy` (la future commande `mise-en-ligne`) | Les deux temps aboutissent : rien à appliquer, puis déploiement. Une seule base, **ID-A** | OK — 2026-11-16, wrangler 4.129.0 : « No migrations to apply! » puis déploiement, version `abda0508-…` ; une seule base, **ID-A** |
| CT-C1.9 | **Informatif.** `npx wrangler d1 create colibri` une seconde fois | Noter la réponse. Attendu : refus, un compte ne porte pas deux bases du même nom. Si une seconde base est créée, la supprimer aussitôt par son identifiant et le signaler : c'est le risque nommé dans `design.md` § Risks | OK — 2026-11-16, wrangler 4.129.0 : refus, « A database with that name already exists » |

## 4. Remise en état

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C1.10 | `npx wrangler delete --name colibri-cms` ; `npx wrangler d1 delete colibri -y` | Le Worker et la base sont supprimés | OK — 2026-11-16, wrangler 4.129.0 : « Successfully deleted colibri-cms » (avec `--force`, sans quoi la commande demande confirmation) ; « Deleted 'colibri' successfully. » |
| CT-C1.11 | `npx wrangler d1 list --json` ; `git status --short` | Plus aucune base `colibri` ; la base `colibri-recette` est toujours là ; arbre propre | OK — 2026-11-16, wrangler 4.129.0 : bases du compte `colibri-recette`, `sebcdev`, `sebc-dev-db` ; arbre dans l'état de CT-C1.0a |
| CT-C1.12 | Ouvrir `https://colibri.sebc.dev/` | Le site de recette répond comme avant | OK — 2026-11-16, wrangler 4.129.0 : `https://colibri.sebc.dev/` répond 200 ; l'adresse du Worker supprimé répond 404 |

## Bilan

- **Date, version de `wrangler`, joué par :** 2026-11-16, 4.129.0, Claude, sur le compte de recette.
- **D3 tient-il ?** Oui. La mise à niveau et le déploiement atteignent la base `colibri` par son nom,
  sans identifiant écrit nulle part, et le Worker déployé y écrit. Aucune seconde base n'est créée,
  et le compte refuse deux bases du même nom. Le repli (`baseDeDonnees` dans `instance.json`) est
  sans objet.
- **`wrangler` a-t-il écrit un identifiant dans un fichier du dépôt ?** Non. `d1 create` le propose,
  et répond non de lui-même hors terminal interactif. Dans un terminal, il faut refuser.
- **Quel fichier la mise à niveau lit-elle à la racine ?** `wrangler.jsonc`. La sortie ne le nomme
  pas ; c'est le seul fichier lu à la racine sans `--config`, et le renvoi de la construction
  n'existait pas encore à CT-C1.3.
- **Sans base, rien n'est créé en silence** : la mise à niveau échoue en nommant la base (CT-C1.1).
  Le geste `base` de l'outil de livraison doit donc précéder la première mise en ligne.
- **Ce qui change dans le change 020 :** rien dans l'approche. `design.md` D3 passe de « à
  constater » à « constaté ». Deux précisions pour les tickets : la dérivation doit fermer l'adresse
  par défaut (elle était ouverte ici), et la preuve « le Worker écrit dans la base » demande le
  cookie d'appareil.
- **Ce qui reste à constater :** la même commande jouée par Workers Builds avec une clé de
  construction qui a le droit sur la base (D4), et la branche `media` atteinte ou non sans clé.
