# 07 — L'outil de livraison crée la base dans le compte du fichier d'instance

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `scripts/livraison.mjs`, `src/platform/instance/plateforme-de-livraison.ts`, `docs/architecture/context.c4`, `tests/unit/plateforme-de-livraison.test.ts`

## Ce que ça livre

La base d'une instance doit exister avant sa première mise en ligne, et elle doit être créée dans le
compte Cloudflare **du client**, jamais dans celui d'un autre. Ce ticket livre le geste `base` de
l'outil de livraison, et la règle que tous les gestes de l'outil qui agissent sur la plateforme
suivront : ils visent le compte que désigne le **fichier d'instance** du dépôt du client, et aucun
autre.

**État du code.** `scripts/livraison.mjs` existe avec des gestes qui n'atteignent pas la
plateforme. Le fichier d'instance porte le champ `compteCloudflare` (32 hexadécimaux, facultatif à
la construction), lu par le module de `src/platform/instance/`. La base s'appelle `colibri` dans
chaque compte : `wrangler` la retrouve par ce nom, à la mise à niveau comme au déploiement, et un
compte refuse deux bases du même nom (constaté le 2026-11-16 sur le compte de recette).

**Ce que ce ticket livre** (ADR-0034) :

- Une **enveloppe d'accès à la plateforme**, que les gestes de l'outil emploient pour appeler
  `wrangler`. Elle lit `compteCloudflare` dans le fichier d'instance du dépôt du client et le passe à
  `wrangler` par `CLOUDFLARE_ACCOUNT_ID`. Elle ne lit aucun fichier d'environnement et n'emploie
  aucun compte par défaut. Sans `compteCloudflare`, elle échoue en nommant le champ, et aucune
  commande ne part. Quand la connexion de qui livre ne donne pas accès à ce compte, `wrangler`
  échoue : l'enveloppe rend cet échec lisible et rien n'est écrit.
- L'enveloppe reçoit en paramètre la fonction qui exécute une commande : les tests lui en passent
  une qui rend des sorties enregistrées. La logique décidable (compte visé, lecture de la liste des
  bases, verdict) vit en TypeScript sous `src/` ; le script ne fait que brancher.
- Le geste `base` : il liste les bases du compte ; si aucune ne s'appelle `colibri`, il la crée ; si
  elle existe, il ne crée rien et le dit. Il ne crée jamais de seconde base.
- L'outil n'accepte aucune valeur de clé en argument et ne pose aucun secret.
- Dans `docs/architecture/context.c4`, la relation `integrateur -> colibri-cms.d1` reçoit sa trace
  pour la partie « crée la base » ; sa marque `#planned` est retirée par le ticket du semis, qui la
  complète.

**Tests.** Unité, l'exécuteur de commandes doublé par des sorties enregistrées de `wrangler`.
Oracle : la liste des commandes parties (leurs arguments et la valeur de `CLOUDFLARE_ACCOUNT_ID`),
et le message rendu. Cas limites : compte sans base ; base déjà là ; connexion sans accès au compte
(sortie d'erreur enregistrée de `wrangler`) ; `compteCloudflare` absent du fichier d'instance ;
compte par défaut de la connexion différent du compte du fichier d'instance. Pour « rien n'est
écrit » : aucune commande d'écriture ne figure dans la liste des commandes parties.

**Hors périmètre** : mettre la base à niveau (c'est la mise en ligne) ; semer l'adresse autorisée ;
plusieurs instances dans un même compte ; créer le compte ou y inviter qui que ce soit ; déterminer
le rôle de membre le plus étroit qui suffit (constaté à l'épreuve de livraison).

**Références** : ADR-0034, ADR-0035, ADR-0005 (`docs/adr/`), `docs/security.md`.

## Critères

- [x] Quand la création de la base est lancée sur un compte qui n'en porte pas, la base existe dans ce compte, sous le nom commun à toutes les instances   (SC-07a)
- [x] Quand la création de la base est relancée sur un compte qui porte déjà la base de l'instance, aucune base n'est créée et l'outil dit que la base existe déjà   (SC-07b)
- [x] Quand un geste de l'outil qui agit sur la plateforme est lancé, il s'adresse au compte que désigne le fichier d'instance, quel que soit le compte par défaut de la connexion   (SC-07c)
- [x] Quand la connexion de la personne qui livre ne donne pas accès au compte du fichier d'instance, le geste échoue en le disant et rien n'est écrit, dans aucun compte   (SC-07d)
- [x] Quand le fichier d'instance ne porte pas l'identifiant du compte, le geste échoue en nommant le champ manquant et aucune commande ne part vers la plateforme   (SC-07e)
