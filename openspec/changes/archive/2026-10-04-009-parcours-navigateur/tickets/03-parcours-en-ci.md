# 03 — Les parcours se jouent sur chaque PR, sans bloquer la fusion

**Bloqué par :** 02
**Vérif :** observé
**Fichiers :** `.github/workflows/ci.yml`, `docs/ci.md`

## Ce que ça livre

Les parcours dans un vrai navigateur tiennent en local (tickets 01 et 02) : `npm run parcours` bâtit le
site, le sert par `wrangler dev` sur une base neuve, entre dans l'administration par une session
semée, et joue le parcours pilote (correction du bouton d'action de l'accueil) sous une garde qui fait
échouer le parcours à la moindre violation de la politique de sécurité. Ce ticket les fait jouer
**sur chaque PR**, par un job `parcours` de la CI qui publie leur verdict. Comme le reste de la CI, ce
job **annote, il ne bloque pas** : un rouge se voit sur la PR, il n'empêche pas la fusion.

**Décisions à respecter :**
- Un job `parcours` dans `.github/workflows/ci.yml`, **non requis** par le ruleset « Main protect »
  (qui n'exige aucun status check) ; parallèle aux autres jobs.
- Il met en cache les navigateurs de Playwright et installe Chromium **avec ses dépendances système**
  (`npx playwright install --with-deps chromium`) ; installation des paquets par `npm ci`.
- Il joue `npm run parcours`, la même commande qu'en local.
- `docs/ci.md` reçoit la ligne du job, informatif comme les autres.
- Ce ticket vient **après** que le pilote a tenu en local : brancher la CI sur un dispositif pas encore
  éprouvé produirait des rouges qu'on apprendrait à ignorer.

**Hors périmètre :** toute modification des parcours eux-mêmes ou de leur dispositif ; toute
promotion du job en check requis ; toute modification du produit.

## Critères
- [x] Quand une PR est ouverte, un job `parcours` joue les parcours et publie leur verdict ; un rouge de ce job n'empêche pas la fusion (aucun status check requis par le ruleset, `docs/ci.md` à jour)   (SC-03a)
- [x] Quand on compare la branche du ticket à `main`, aucun fichier sous `src/`, `migrations/`, `content/` ni `public/` n'est modifié   (SC-03b)
