# 16 — Le site est raccordé à son dépôt, et une publication qui échoue avant le dépôt ne change rien

**Bloqué par :** 15
**Vérif :** test
**Fichiers :** `src/platform/publication/forge-github.ts`, `src/platform/publication/publier.ts`, `astro.config.ts`, `src/env.d.ts`, `src/platform/d1/cloudflare-workers.d.ts`, `src/admin/textes.ts`, `src/admin/ilots-svelte-5/EcranPublier.svelte`, `docs/architecture/context.c4`, `docs/architecture/model.c4`, `tests/unit/publication/forge-github.test.ts`, `tests/integration/publication-qui-echoue.test.ts`

## Ce que ça livre

La publication écrit désormais pour de vrai dans le **dépôt GitHub du client**. Deux réglages
l'activent :
- le dépôt de publication, déclaré dans le fichier d'instance ;
- une **clé d'écriture**, secret du compte Cloudflare du client. Jamais une clé d'Isometria : la
  révocation de nos accès ne doit pas casser le site (SC-012, SC-013).

Quand une publication échoue **avant** que le contenu soit déposé — dépôt injoignable, accès refusé,
clé absente ou invalide, dépôt non configuré —, rien ne change (FR-091) : le site public, le contenu
publié et chaque brouillon restent exactement tels qu'ils étaient. L'éditrice l'apprend par un message
qui le dit et l'invite à réessayer plus tard, sans aucun terme de développeur (FR-117). La clé
d'écriture ne paraît jamais, ni dans une réponse, ni à l'écran, ni dans un journal : une clé fuitée
réécrirait le site publié.

**Décisions à respecter :**
- **Adaptateur** `src/platform/publication/forge-github.ts` : il implémente le port `Forge` (ticket
  12) par un `fetch` **reçu en paramètre** (le `fetch` global en production, une fonction locale en
  test) vers `api.github.com`.
  - En-têtes : `Authorization: Bearer <clé>`, `X-GitHub-Api-Version`, un `User-Agent` neutre.
  - Il traduit les réponses en issues typées : `refusee-pas-avance-rapide`, `acces-refuse`,
    `injoignable`, `introuvable`.
  - Il ne journalise ni la clé, ni les corps, ni les en-têtes. La clé est lue de `env` dans
    l'adaptateur seul, jamais passée à `core/`, jamais sérialisée.
- **Configuration** (ADR-0005, ADR-0021) :
  - le dépôt `proprietaire/nom` vit dans `instance.json`, clé facultative `depotDePublication`, lue
    par `astro.config.ts` et injectée par `define` (I8, I10). Le dépôt produit n'en déclare pas : sa
    démonstration n'est pas raccordée ;
  - la clé, à portée fine, sur ce seul dépôt, avec `Contents: Read and write` seule, est le secret
    `JETON_DEPOT` du compte Cloudflare du client (`wrangler secret put`). Elle n'apparaît jamais dans
    le dépôt, ni dans `instance.json`, ni dans `wrangler*.jsonc` ;
  - dépôt ou clé absents → la publication échoue avant tout appel, sans rien changer.
- La fabrique de `Forge` du ticket 15 rend l'adaptateur GitHub quand le dépôt et la clé sont présents.
- **Messages** (dans `src/admin/textes.ts`) :
  - échec avant le dépôt : « La publication n'a pas pu se faire. Rien n'a changé : votre site et vos
    modifications sont intacts. Réessayez dans quelques minutes. » ;
  - site non raccordé : « La publication n'est pas encore possible sur ce site. Rien n'a changé. »
- **Tests** :
  - l'adaptateur se teste avec un `fetch` de substitution qui rend des `Response`, sans aucun appel
    réseau : forme des requêtes (méthode, chemin, en-têtes), traduction des statuts 401, 403, 404 et
    422, absence de la clé dans tout message d'erreur et dans la console, succès comme échec ;
  - « non raccordé » se teste par `exports.default.fetch`, l'instance de test n'ayant pas de dépôt ;
  - l'échec d'accès se teste au niveau de `platform/` avec le dépôt simulé en mémoire, qui injecte la
    panne.
- **Modèle d'architecture** :
  - système externe `github` (`#external`) et relation `colibri-cms.worker.platform -[sync]-> github
    'dépose le contenu et les images publiés'` dans `context.c4` ;
  - la description de `colibri-cms.contenu` devient « lu par le produit ; la publication en dépose la
    copie publiée » ;
  - `likec4 validate` vert.

**Hors périmètre :** la mise en place du vrai dépôt et de la vraie clé sur la recette (ticket 19) ; le
Cron de maintien en vie de la clé, le déploiement d'une instance au nom du client (Epic D).

## Critères
- [ ] Quand l'éditrice confirme une publication et que le dépôt refuse l'écriture, chaque brouillon est intact et porte toujours sa marque, le contenu publié est inchangé, et l'écran dit que la publication n'a pas pu se faire et que rien n'a changé   (SC-16a)
- [ ] Quand l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et que l'éditrice confirme une publication, rien n'est déposé, chaque brouillon est intact, et l'écran dit que la publication n'a pas pu se faire, sans aucun terme de développeur   (SC-16b)
- [ ] Quand une publication aboutit puis qu'une autre échoue, la clé d'écriture du dépôt ne figure dans aucune réponse, aucun écran ni aucune ligne de journal   (SC-16c)
