# Constats 2 et 3 — La construction dans le compte : la base mise à niveau, les images atteintes

Cahier de recette des deux constats qui restent avant les tickets du change 020 (`design.md`, D1, D4
et Open Questions). Le constat 1 est fait (`01-base-rattachee-par-son-nom.md`).

## Ce qu'on cherche à savoir

- **Constat 2 (D4).** Workers Builds accepte-t-il une clé de construction qui a le droit d'écrire
  dans la base, et joue-t-il alors la commande de mise en ligne
  `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy` ? Une mise à niveau en échec
  empêche-t-elle bien le déploiement ?
- **Constat 3 (D1).** Sur un dépôt privé, la construction atteint-elle la branche `media` sans aucune
  clé du dépôt ? Sinon, la clé d'écriture du dépôt, posée comme secret de construction, suffit-elle ?

Ce que chaque issue change :

| Issue | Conséquence pour le change |
|---|---|
| Constat 2 OK | D4 tient. La procédure de livraison crée une clé de construction sur mesure |
| Constat 2 KO | Repli de D4 : la mise à niveau depuis un poste. Il heurte FR-102 : à rediscuter avant les tickets |
| Constat 3, sans clé OK | La clé du dépôt n'est posée qu'à un endroit, le Worker. Une ligne de moins à l'inventaire |
| Constat 3, sans clé KO, avec la clé d'écriture OK | D1 tient tel quel : une clé, deux endroits |

## Terrain

Le serveur de recette : le Worker `colibri-recette`, sa base `colibri-recette`, le dépôt de recette
privé (`RECETTE_DEPOT`, cloné dans `../colibri_recette`), rebâti par Workers Builds. Ce cahier
modifie des réglages de Workers Builds et pousse des commits dans le dépôt de recette ; il ne touche
à aucun fichier du dépôt du produit. La § 5 remet tout dans l'état relevé en § 0.

Pendant le jeu, ne lancer ni `$R deployer` vers le principal, ni `$R depot`, ni aucune autre recette.

```sh
R="node .claude/skills/recette/scripts/recette.mjs"
export CLOUDFLARE_ACCOUNT_ID="$(grep '^RECETTE_COMPTE=' .env.recette | cut -d= -f2)"
export CI=true
D=../colibri_recette
# Le dernier déploiement du Worker de recette : sa date et sa source.
dernier() { npx wrangler deployments list --name colibri-recette --json | python3 -c "import json,sys; d=json.load(sys.stdin)[-1]; print(d['created_on'], d.get('source'), d['id'][:8])"; }
# Une lecture dans la base de recette.
base() { npx wrangler d1 execute colibri-recette --remote --json --command "$1" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['results'])"; }
```

## Qui fait quoi

- **[Humain]** : tout geste du tableau de bord Cloudflare ou de GitHub, et toute création de clé.
  Aucune valeur de clé ne passe par la conversation, ni par un terminal que Claude lit.
- **[Claude]** : les commits dans le dépôt de recette, les lectures par `wrangler`, les constats sur
  le site, le report des verdicts.
- Le journal d'une construction n'est lisible que dans le tableau de bord : quand un cas demande une
  ligne du journal, l'humain la recopie.

Un cas se joue dans l'ordre : le geste, puis la reconstruction (deux à quatre minutes), puis le
constat. Une seule reconstruction tourne à la fois.

## Conventions

- **OK**, **KO**, **Informatif** : comme au constat 1. Chaque verdict porte sa date.
- *Bloquant* : si le cas est KO, la partie s'arrête et on passe à sa remise en état.

## 0. État de départ

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.0a | [Claude] `git -C $D pull` ; `git -C $D status --short` ; `git -C $D log --oneline -1` | Clone à jour, arbre propre. Noter le commit de départ (**C0**) | OK — 2026-11-16 : clone à jour avec `origin/main`, arbre propre ; **C0** = `d2bbc32` « recette : coupe les adresses d'aperçu entre deux recettes » |
| CT-C2.0b | [Claude] `dernier` ; `curl -s -o /dev/null -w "%{http_code}\n" https://colibri.sebc.dev/` | Noter le déploiement de départ (**DEP0**). Le site répond 200 | OK — 2026-11-16 : **DEP0** = `43a97381`, du 2026-11-15T17:47:32Z, source `wrangler` (c'est aussi la source d'un déploiement fait par Workers Builds : elle ne les distingue pas) ; le site répond 200 |
| CT-C2.0c | [Humain] Workers & Pages → `colibri-recette` → Settings → Builds. Relever : la commande de construction, la commande de déploiement, la clé d'API choisie (son nom), les variables et secrets de construction (leurs noms) | Attendu : `npm run build`, `npx wrangler deploy`, la clé créée par défaut. Dire si `COLIBRI_CLE_LECTURE_DEPOT` y figure. C'est l'état à rétablir en § 5 | OK — 2026-11-18, relevé de l'humain : commande de build `npm run build` ; commande de déploiement `npx wrangler deploy` ; jeton d'API « Builds de Workers - 2026-10-14 09:16 » (celui créé par défaut) ; **aucune** variable ni secret de build. `COLIBRI_CLE_LECTURE_DEPOT` n'y figure donc pas : la recette se rebâtit déjà sans clé du dépôt depuis le 14 octobre, ce qui annonce l'issue du constat 3 |
| CT-C2.0d | [Claude] `base "select count(*) as n from d1_migrations"` | `n` vaut 17 | OK — 2026-11-16 : `n` = 17 |
| CT-C2.0e | [Claude] `$R journal` pendant une publication d'essai, ou lecture de la dernière trace `[publication]` | La clé `JETON_DEPOT` de recette est acceptée. Si la trace dit `acces-refuse`, la clé a expiré : [Humain] en créer une (portée fine, ce seul dépôt, `Contents: Read and write`, **sans expiration**) et la poser par `$R secret-depot` avant de continuer | Non joué — 2026-11-18 : aucune publication n'a été jouée dans ce cahier ; l'état de la clé `JETON_DEPOT` de recette n'est pas vérifié |

## 1. Constat 2 — La commande de mise en ligne, avec la clé par défaut

But : voir l'échec. La clé créée par défaut n'a aucun droit sur la base.

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.1 | [Humain] Remplacer la commande de déploiement par `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`. Ne pas changer de clé | Le réglage est enregistré | OK — 2026-11-18 : commande de déploiement remplacée par l'humain, jeton inchangé |
| CT-C2.2 | [Claude] `git -C $D commit --allow-empty -m "constat 2 : clé par défaut" && git -C $D push`, attendre la fin de la reconstruction. [Humain] Recopier la ligne d'erreur du journal | La reconstruction **échoue** à la mise à niveau, sur un refus d'accès à la base. Informatif si elle réussit : la clé par défaut a désormais ce droit, le noter et passer à CT-C2.6 | **Informatif, issue inattendue** — 2026-11-18 : commit `63622df` poussé à 22:49:55 UTC. La reconstruction **réussit** avec le jeton par défaut. Journal recopié par l'humain : « Executing user deploy command: npx wrangler d1 migrations apply DB --remote && npx wrangler deploy », « ✅ No migrations to apply! », puis « Using redirected Wrangler configuration. Configuration being used: "dist/server/wrangler.json" », liaison `env.DB (colibri-recette)`, « Success: Deploy command completed ». Le jeton créé par défaut atteint donc la base, contrairement à ce que disaient la documentation et `SKILL.md` |
| CT-C2.3 | [Claude] `dernier` ; `curl` du site | Le dernier déploiement est toujours **DEP0** : rien n'a été déployé. Le site répond 200 | Sans objet — 2026-11-18 : la reconstruction a réussi ; déploiement `1ea38e12` à 22:51:52 UTC (**DEP1**) |

## 2. Constat 2 — Avec une clé de construction qui a le droit sur la base

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.4 | [Humain] Mon profil → API Tokens → Create Token → modèle « Edit Cloudflare Workers ». Y ajouter la permission de compte **D1 : Edit**. Limiter au compte de recette. Nommer la clé `construction-colibri-recette`. Ne pas copier la valeur ailleurs que dans l'étape suivante. Noter la liste exacte des permissions affichées | La clé est créée. Sa liste de permissions est recopiée ici : elle ira telle quelle dans la procédure de livraison | Non joué — 2026-11-18 : inutile, le jeton par défaut suffit (CT-C2.8). L'essai de création a buté sur le champ de zone du formulaire, que la procédure décrivait mal |
| CT-C2.5 | [Humain] Settings → Builds → API token : choisir `construction-colibri-recette` (ou l'ajouter par sa valeur si le tableau de bord le demande). *Bloquant* | Workers Builds accepte la clé. Si la clé est refusée à l'enregistrement, recopier le message | Non joué — 2026-11-18 : même raison |
| CT-C2.6 | [Claude] `git -C $D commit --allow-empty -m "constat 2 : clé avec D1" && git -C $D push`, attendre. [Humain] Recopier du journal la ligne de la mise à niveau. *Bloquant* | La reconstruction **aboutit**. Le journal porte « No migrations to apply! » puis le déploiement | OK par CT-C2.2 — 2026-11-18 : avec le jeton par défaut |
| CT-C2.7 | [Claude] `dernier` ; `curl` du site ; `base "select count(*) as n from d1_migrations"` | Un déploiement plus récent que **DEP0** (**DEP1**). Le site répond 200. `n` vaut 17 | OK par CT-C2.2 — 2026-11-18 : **DEP1** = `1ea38e12`, plus récent que **DEP0** ; `n` = 17 |

### 2.1 Une vraie mise à niveau

Les cas précédents n'appliquent rien. Ceux-ci font écrire la construction dans la base.

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.8 | [Claude] Dans `$D`, créer `migrations/9998_constat.sql` contenant `create table constat_d4 (id integer primary key);`. Commit « constat 2 : mise à niveau », push, attendre | La reconstruction aboutit ; le journal dit la mise à niveau `9998_constat.sql` appliquée | OK — 2026-11-18 : commit `2a3b3f4` poussé à 22:54:31 UTC, **avec le jeton par défaut**. La table apparaît dans la base à 22:56:15. Journal recopié par l'humain : « Migrations to be applied: 9998_constat.sql », « Using fallback value in non-interactive context: yes », « Executing on remote database DB (1305867e-…) », « Executed 2 commands », `9998_constat.sql ✅`, puis le déploiement et « Success: Deploy command completed ». La construction répond donc oui d'elle-même à la question de `wrangler`, sans réglage |
| CT-C2.9 | [Claude] `base "select name from sqlite_master where name = 'constat_d4'"` ; `base "select count(*) as n from d1_migrations"` ; `dernier` | La table existe. `n` vaut 18. Un déploiement plus récent que **DEP1** (**DEP2**) | OK — 2026-11-18 : `constat_d4` existe ; `n` = 18 ; **DEP2** = `e8fa97cd` à 22:56:17 UTC |
| CT-C2.10 | [Claude] Rejouer : `git -C $D commit --allow-empty -m "constat 2 : rejeu" && git -C $D push`, attendre | La reconstruction aboutit ; `n` vaut toujours 18 : la mise à niveau n'est pas rejouée | Non joué — 2026-11-18 : le rejeu sans effet est déjà établi par CT-C2.2 et par le constat 1 (CT-C1.4) |

### 2.2 Une mise à niveau qui échoue ne déploie rien

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.11 | [Claude] `dernier` (noter **DEP3**). Dans `$D`, créer `migrations/9999_constat_echec.sql` contenant `create table constat_d4 (id integer primary key);` (la table existe déjà : l'instruction échoue). Commit, push, attendre. [Humain] Recopier la ligne d'erreur du journal | La reconstruction **échoue** à la mise à niveau | OK, journal à relever — 2026-11-18 : **DEP3** = **DEP2** = `e8fa97cd`. Commit `ed4b18d` poussé à 22:56:31 UTC. Quatre minutes plus tard, aucun nouveau déploiement. La ligne d'erreur du journal reste à recopier par l'humain |
| CT-C2.12 | [Claude] `dernier` ; `curl` du site ; `base "select count(*) as n from d1_migrations"` | Le dernier déploiement est toujours **DEP3**. Le site répond 200. `n` vaut 18 : la mise à niveau en échec n'est pas inscrite | OK — 2026-11-18, à 23:00:31 UTC : dernier déploiement toujours `e8fa97cd` ; le site répond 200 ; `n` = 18, et `d1_migrations` ne porte que `9998_constat.sql` : la mise à niveau en échec n'est pas inscrite |
| CT-C2.13 | [Claude] `git -C $D rm migrations/9999_constat_echec.sql`, commit, push, attendre | La reconstruction aboutit de nouveau : un échec ne bloque pas les suivantes | OK — 2026-11-18 : commit `374a36e` (les deux fichiers retirés) poussé à 23:00:53 UTC ; déploiement `909fb6e1` à 23:02:55 : la reconstruction aboutit de nouveau après un échec |

### 2.3 Une publication de l'éditrice passe par la même commande

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.14 | [Claude] Sur `https://colibri.sebc.dev/admin/`, corriger un texte, publier (`$R chrono` à la confirmation) | La publication aboutit ; l'écran dit le site en ligne ; la correction est visible sur le site public. Noter la durée | Non joué — 2026-11-18 : à jouer avec le constat 3 (CT-C3.2), qui publie aussi |

## 3. Constat 3 — Les images, sans clé du dépôt

À jouer avec la commande et la clé de construction laissées par la § 2 si elle est OK, sinon avec
celles de départ.

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C3.1 | [Humain] Si `COLIBRI_CLE_LECTURE_DEPOT` figure dans les secrets de construction (CT-C2.0c), la supprimer. Sinon, ne rien faire et le noter | Aucune clé du dépôt n'est connue de la construction | Sans objet — 2026-11-18 : aucun secret de build n'existe (CT-C2.0c) |
| CT-C3.2 | [Claude] Téléverser une image neuve, la poser sur une page, publier (`$R chrono`). [Humain] Recopier du journal de la reconstruction la ligne des images publiées, ou la ligne « Impossible de récupérer les images publiées » | **Informatif, c'est la question.** Soit la reconstruction aboutit et l'image neuve est servie sur le site public : la construction atteint `media` sans clé. Soit elle échoue sur « Impossible de récupérer… » : elle ne l'atteint pas | OK par le journal, sans publication — 2026-11-18 : les deux journaux recopiés portent « 50 image(s) publiée(s) récupérée(s) depuis d45eb08c82ec4d230648d38137a0cd8fd4beb8da. », alors qu'aucun secret de build n'existe et que le dépôt est privé. Le script n'imprime une empreinte que si sa propre lecture du dépôt a réussi (`scripts/recuperer-images-publiees.mjs` : en repli sur une copie locale, il imprime un nom de référence). Et `git ls-remote origin media` rend la même empreinte. La construction atteint donc `media` sans clé : le clone fait par Workers Builds garde l'accès que lui donne l'application GitHub de Cloudflare |
| CT-C3.3 | [Claude] `curl -s -o /dev/null -w "%{http_code}\n"` sur l'adresse d'une variante de l'image neuve, relevée dans la page publique | 200 si CT-C3.2 a abouti ; sinon l'image n'est pas en ligne et le site est celui d'avant | Non joué — 2026-11-18 : aucune image neuve publiée ; les 50 images du dépôt sont servies (150 variantes produites par la construction) |

### 3.1 Si la construction n'atteint pas `media` : la clé d'écriture, à un second endroit

À jouer seulement si CT-C3.2 a échoué.

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C3.4 | [Humain] Créer une clé à portée fine, ce seul dépôt, `Contents: Read and write`, **sans expiration**. La poser deux fois : comme secret de construction `COLIBRI_CLE_LECTURE_DEPOT` dans Workers Builds, et comme secret du Worker par `$R secret-depot` | La même clé est aux deux endroits | Sans objet — 2026-11-18 : CT-C3.2 est OK |
| CT-C3.5 | [Humain] Settings → Builds → relancer la dernière reconstruction (« Retry »). [Claude] `dernier` ; `curl` de l'image de CT-C3.3 | La reconstruction aboutit ; l'image neuve répond 200 | Sans objet — 2026-11-18 |
| CT-C3.6 | [Claude] Corriger un texte et publier | La publication aboutit jusqu'en ligne : la même clé sert l'écriture par le Worker et la lecture par la construction | Sans objet — 2026-11-18 |

## 4. Bilan

- **Date, joué par :** 2026-11-18, Claude pour les commits et les lectures, l'humain pour le tableau
  de bord et les journaux.
- **Constat 2 — La construction met-elle la base à niveau ?** Oui, et **avec le jeton que Workers
  Builds crée par défaut**. Aucun jeton sur mesure n'est nécessaire. La documentation de Cloudflare
  (lue le 2026-11-15) ne liste pas D1 parmi les droits de ce jeton, et `SKILL.md` de la recette le
  disait sans droit sur la base : les deux sont démentis par l'essai.
- **La liste exacte des permissions du jeton de construction :** non relevée ; c'est le jeton
  « Builds de Workers - 2026-10-14 09:16 », créé par défaut. À relever une fois dans Mon profil →
  Jetons d'API, pour la procédure de livraison.
- **Une mise à niveau en échec empêche-t-elle le déploiement ?** Oui : aucun nouveau déploiement, le
  site reste servi, la mise à niveau fautive n'est pas inscrite, et la reconstruction suivante
  aboutit. La ligne d'erreur du journal reste à recopier.
- **La construction répond seule à la question de `wrangler`** (« continue? » → oui, hors terminal
  interactif) : la commande passe sans réglage.
- **Constat 3 — La construction atteint-elle `media` sans clé ?** Oui, sur un dépôt privé, sans aucun
  secret de build. La clé du dépôt n'est donc posée qu'à un endroit, le Worker.
- **Ce qui change dans le change 020 :** la clé de construction sur mesure disparaît (le jeton par
  défaut suffit, créé dans la session du client au raccordement) ; la clé du dépôt n'est plus posée
  comme secret de construction ; `COLIBRI_CLE_LECTURE_DEPOT` reste une possibilité du script, sans
  emploi à la livraison. `design.md` D1, D4, D10, les specs et la revue de sécurité sont mis à jour.
- **Non joué :** une publication depuis l'administration (CT-C2.14, CT-C3.3) et l'état de la clé
  `JETON_DEPOT` de recette (CT-C2.0e). Les reconstructions de ce cahier ont toutes été déclenchées
  par un envoi direct dans le dépôt de recette.

## 5. Remise en état

| N° | Cas | Résultat attendu | Verdict |
|---|---|---|---|
| CT-C2.20 | [Claude] `git -C $D rm migrations/9998_constat.sql` (et `9999_constat_echec.sql` s'il reste), commit, push. Puis `base "drop table if exists constat_d4"` et `base "delete from d1_migrations where name like '99%_constat%'"` | La base est revenue à 17 mises à niveau, sans table `constat_d4` | OK — 2026-11-18 : table supprimée, ligne `9998_constat.sql` retirée de `d1_migrations` (`n` = 17, table absente) ; les deux fichiers retirés du dépôt de recette par le commit `374a36e`, poussé à 23:00:53 UTC |
| CT-C2.21 | [Humain] **À décider au vu du bilan.** Si le constat 2 est OK, garder la commande de mise en ligne et la clé `construction-colibri-recette` : la recette se met alors à niveau seule, et `SKILL.md` sera corrigé par le ticket de la mise en ligne. Sinon, rétablir la commande et la clé relevées en CT-C2.0c et supprimer la clé `construction-colibri-recette` | L'état choisi est noté ici | À confirmer par l'humain — 2026-11-18 : la commande de mise en ligne est en place et fonctionne avec le jeton par défaut ; recommandation, la garder. Aucun jeton `construction-colibri-recette` n'est à supprimer s'il n'a pas été créé |
| CT-C2.22 | [Humain] Supprimer chez GitHub toute clé du dépôt de recette qui n'est plus posée nulle part | Il ne reste que les clés en service | Sans objet — 2026-11-18 : aucune clé du dépôt créée par ce cahier |
| CT-C2.23 | [Claude] `git -C $D status --short` ; `dernier` ; `curl` du site ; `base "select count(*) as n from d1_migrations"` ; une publication d'essai | Arbre propre ; le site répond 200 ; `n` vaut 17 ; la publication aboutit jusqu'en ligne | OK sauf la publication — 2026-11-18 : clone de recette propre ; dernier déploiement `909fb6e1` à 23:02:55 UTC ; le site répond 200 ; `n` = 17. Publication d'essai non jouée |
