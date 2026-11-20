# 02 — La configuration de déploiement effective sert le domaine de l'instance

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/platform/instance/configuration-de-deploiement.ts`, `scripts/deriver-configuration-de-deploiement.mjs`, `package.json`, `scripts/batir-site-jetable.mjs`, `.claude/skills/recette/scripts/recette.mjs`, `.claude/skills/recette/SKILL.md`, `tests/unit/configuration-de-deploiement.test.ts`, `tests/static/configuration-de-deploiement-statique.test.ts`

## Ce que ça livre

Deux dépôts de clients ne doivent différer que par leur **fichier d'instance** et leur contenu.
Aujourd'hui, pour servir un domaine, il faut écrire ce domaine dans les fichiers `wrangler` : c'est
ce que fait l'outillage de recette, et chaque client aurait alors trois fichiers propres au lieu
d'un. Ce ticket fait dériver le domaine du fichier d'instance, à la construction : les fichiers
`wrangler` versionnés restent ceux du produit, identiques partout.

**État du code.** La construction (`astro build`) produit `dist/server/wrangler.json`, et
`.wrangler/deploy/config.json` y renvoie : un `wrangler deploy` lancé à la racine déploie cette
configuration **produite**. Elle porte aujourd'hui `name`, `main`, `assets`, `d1_databases` (la base
désignée par `database_name: "colibri"`, sans identifiant), `send_email`, sans `routes`.
`postbuild` joue déjà `node scripts/preparer-worker-de-test.mjs --apres`. L'outillage de recette
(`.claude/skills/recette/scripts/recette.mjs`) écrit sa propre configuration dérivée
(`ecrireConfigRecette`) et, dans sa commande `depot`, réécrit les deux fichiers `wrangler` du dépôt
de recette (`appliquerCompteDeRecette`).

**Ce que ce ticket livre** (ADR-0034) :

- Une fonction pure, sous `src/platform/instance/`, reçoit la configuration produite et les valeurs
  du fichier d'instance, et rend la configuration effective :
  `routes: [{ pattern: <domain>, custom_domain: true }]`, `workers_dev: false`,
  `preview_urls: false`. Elle n'ajoute ni ne retire aucune liaison et n'écrit aucun `database_id`.
  Rejouée sur sa propre sortie, elle rend la même chose.
- Un script joué en fin de construction (`postbuild`, à la suite de l'existant) lit `instance.json`
  par le module de lecture du fichier d'instance, applique la fonction et réécrit
  `dist/server/wrangler.json`. Il échoue bruyamment si ce fichier est absent ou ne porte pas la
  liaison `DB`.
- Il le fait toujours, y compris dans le dépôt du produit, avec le domaine d'exemple : personne ne
  déploie cette configuration-là, et les tests emploient `wrangler.jsonc`.
- L'outillage de recette reprend ce mécanisme : sa commande `depot` ne réécrit plus les fichiers
  `wrangler`. Le serveur de recette garde ses propres valeurs (aperçus, adresse par défaut, nom de
  base), posées par-dessus par sa configuration dérivée. `SKILL.md` de la recette est mis à jour.
  `colibri.sebc.dev` doit se rebâtir après ce ticket.

**Tests.** Unité sur la fonction pure : le JSON produit comparé champ par champ, les liaisons
comparées à celles de l'entrée. Cas limites : domaine avec sous-domaine ; configuration sans liaison
`DB` (échec) ; dérivation rejouée deux fois ; aucun `database_id` en sortie. Un test joue la
dérivation sur le `dist/server/wrangler.json` d'une **construction réelle**, faite dans un arbre
jetable avec un fichier d'instance complet : les tests tournent dans `workerd` et ne lancent aucun
processus, donc cette construction est faite avant eux par `scripts/batir-site-jetable.mjs` (patron
existant : il consigne un résultat que le test lit). Un test statique lit `wrangler.jsonc` et
`wrangler.astro.jsonc` et vérifie qu'ils ne portent aucune valeur d'instance.

**Hors périmètre** : la commande de mise en ligne ; tout champ nouveau dans le fichier d'instance ;
écrire le domaine dans un fichier versionné ; les variables de construction de Workers Builds.

**Références** : ADR-0034, ADR-0005, invariants `I8` et `I19` de `docs/architecture.md`.

## Critères

- [x] Quand le site est construit avec un fichier d'instance qui porte un nom de domaine, la configuration de déploiement effective sert ce nom de domaine   (SC-02a)
- [x] Quand le site est construit, la configuration de déploiement effective n'ouvre ni l'adresse par défaut de la plateforme ni des adresses d'aperçu   (SC-02b)
- [x] La configuration de déploiement effective désigne la base par son nom, sans identifiant   (SC-02c)
- [x] La configuration de déploiement effective porte les mêmes liaisons que celle du produit, sans en ajouter ni en retirer   (SC-02d)
- [x] Rejouée sur une configuration déjà dérivée, la dérivation la laisse inchangée   (SC-02e)
- [x] Les fichiers de configuration de déploiement versionnés du produit ne portent ni identifiant de compte, ni identifiant de base, ni nom de domaine, ni adresse e-mail propre à une instance   (SC-02f)
