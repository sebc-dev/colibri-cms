# 05 — La mise en ligne met la base à niveau, puis déploie

**Bloqué par :** —
**Vérif :** observé
**Fichiers :** `package.json`, `.claude/skills/recette/SKILL.md`, `docs/architecture/context.c4`, `docs/cahier-de-test.md`

## Ce que ça livre

La mise en ligne d'une instance est **une commande unique, la même chez tous les clients**. Elle
s'exécute dans le compte Cloudflare du client à chaque changement de la branche principale de son
dépôt : elle met la base au niveau de la version, puis déploie cette version. Une première mise en
service, une **publication** de l'éditrice et plus tard une nouvelle version passent par le même
chemin. Aucun poste de l'intégrateur n'a besoin d'atteindre la base.

**État du code.** `package.json` n'a pas de commande de mise en ligne ; il a `db:migrate`
(`wrangler d1 migrations apply DB --local`). Sur le serveur de recette (`colibri.sebc.dev`), Workers
Builds joue déjà, depuis le 2026-11-18, une commande de déploiement saisie dans le tableau de bord
qui met la base à niveau puis déploie. Il a été constaté là, ce jour-là : la clé que Workers Builds
crée par défaut suffit à mettre la base à niveau ; une mise à niveau fautive n'a rien déployé et
n'a pas été inscrite ; la construction suivante a abouti ; la construction récupère les images
publiées d'un dépôt privé sans qu'aucune clé du dépôt lui soit confiée. `SKILL.md` de la recette dit
encore, à tort, que la clé de construction n'a aucun droit sur la base.

**Ce que ce ticket livre** (ADR-0035) :

- `package.json` gagne `mise-en-ligne` :
  `wrangler d1 migrations apply DB --remote && wrangler deploy`. Le `&&` garantit qu'une mise à
  niveau en échec ne déploie rien. La mise à niveau lit `wrangler.jsonc`, à la racine, qui désigne la
  base par son nom ; le déploiement emploie la configuration produite par la construction.
- La commande de déploiement du serveur de recette, dans Workers Builds, devient
  `npm run mise-en-ligne` (réglage du tableau de bord : geste humain, signalé comme tel).
- `SKILL.md` de la recette est corrigé : la construction met la base à niveau, avec sa clé par
  défaut.
- Dans `docs/architecture/context.c4`, la relation
  `workers-builds -[async]-> colibri-cms.d1` perd sa marque `#planned` et son commentaire « trace
  attendue » devient une trace ; `likec4 validate --no-layout --json --project colibri-cms
  docs/architecture` passe.
- `docs/cahier-de-test.md` : la commande `npm run db:migrate` y est décrite comme appliquant « les
  6 migrations » ; le nombre est périmé et la mention est corrigée sans nombre figé.

**Preuve attendue.** Mode `observé` : le code tient en une ligne, et son effet ne se voit que sur la
plateforme. La preuve est capturée sur le serveur de recette : le journal d'une construction qui
joue `npm run mise-en-ligne` (base à niveau, aucune mise à niveau appliquée, déploiement), la marque
de publication constatée en ligne après une publication, et l'absence de construction après un
changement de la seule branche des images. Le cas d'une mise à niveau en échec a été constaté le
2026-11-18 sur la recette ; il se rejoue avec une mise à niveau d'essai fautive, retirée ensuite.
Le journal de Workers Builds ne se lit pas par l'API avec la connexion de `wrangler` : une ligne du
journal se relève dans le tableau de bord, par un humain. Le cas d'une **base neuve** ne se constate
pas sur la recette, dont la base existe : il reste à constater à l'épreuve de livraison, sur un
compte neuf, et se signale comme constat humain attendu.

**Hors périmètre** : passer une instance en service à une nouvelle version et prouver qu'elle n'y
perd rien ; la règle « chaque mise à niveau reste lisible par la version précédente » ; créer la
base (geste de l'outil de livraison) ; une clé de construction sur mesure ; tout workflow sous
`.github/`.

**Références** : ADR-0035, ADR-0023, ADR-0005 (`docs/adr/`), `docs/ci.md`.

## Critères

- [ ] Quand la mise en ligne s'exécute pour la première fois, sur une base vide, toutes les mises à niveau de la base sont appliquées dans l'ordre, puis la version est déployée   (SC-05a)
- [ ] Quand la mise en ligne s'exécute sur une base déjà au niveau de la version, aucune mise à niveau n'est appliquée, et les brouillons, le contenu publié, les demandes et l'adresse autorisée sont inchangés   (SC-05b)
- [ ] Quand une mise à niveau de la base échoue pendant la mise en ligne, la version n'est pas déployée, le site en ligne reste celui d'avant, et les mises à niveau déjà appliquées restent appliquées   (SC-05c)
- [ ] Quand l'éditrice publie et que le dépôt du client reçoit le contenu publié, la même commande de mise en ligne s'exécute, sans geste de personne   (SC-05d)
- [ ] Quand seule la branche des images change, aucune mise en ligne ne s'exécute   (SC-05e)
- [ ] Quand le dépôt change et qu'une mise en ligne s'exécute, elle s'exécute dans le compte de la plateforme qui porte l'instance, sans poste ni service de l'intégrateur   (SC-05f)
- [ ] Quand la construction récupère les images publiées d'un dépôt privé sans qu'aucune clé du dépôt lui soit confiée, elle les récupère et aboutit   (SC-05g)
