# 08 — L'outil de livraison sème la première adresse autorisée, une seule fois

**Bloqué par :** 07
**Vérif :** tdd
**Fichiers :** `scripts/livraison.mjs`, `src/platform/auth/premier-semis.ts`, `docs/architecture/context.c4`, `tests/unit/premier-semis.test.ts`, `tests/integration/premier-semis.test.ts`

## Ce que ça livre

Une instance neuve n'a aucune **adresse autorisée** : personne ne peut ouvrir l'administration.
Aujourd'hui, la première adresse se sème par une requête manuelle. Ce ticket livre le geste
`semer <adresse>` de l'outil de livraison : il inscrit la première adresse autorisée d'une instance
qui n'en a aucune. Il ne remplace ni n'ajoute jamais une adresse sur une instance qui en a déjà une :
la remplacer est un geste de l'éditrice dans l'administration.

**État du code.** L'adresse autorisée vit dans la table `adresses_autorisees` de la base, où
`adresse` est unique. `src/platform/auth/magasin.ts` la lit (`lireAdresseAutorisee`,
`adresseAutoriseeEnregistree`, qui reconnaît une adresse sans tenir compte de la casse ni des espaces
de bord). L'écran `/admin/connexion` écrit un code pour l'adresse autorisée et pour elle seule.
`scripts/livraison.mjs` a une enveloppe d'accès à la plateforme qui vise le compte du fichier
d'instance et reçoit en paramètre la fonction qui exécute `wrangler`.

**Ce que ce ticket livre** :

- Une fonction pure de **verdict**, sous `src/platform/auth/`, reçoit l'adresse demandée et le
  contenu lu de la table, et rend : « à inscrire », « déjà en place » (la même adresse, reconnue
  comme la connexion la reconnaît), « refusé : une autre adresse est en place », ou « refusé :
  adresse mal formée ». La forme de l'adresse est jugée par la fonction que la connexion emploie
  déjà, pas par une règle neuve.
- Le geste `semer <adresse>` lit la table par l'enveloppe d'accès à la plateforme, applique le
  verdict, et n'écrit que dans le cas « à inscrire » : une seule ligne. Dans les autres cas il
  n'écrit rien et dit pourquoi.
- La lecture puis l'écriture ne sont pas atomiques ; c'est accepté : `adresse` est unique en base et
  le geste est joué par une personne, une fois.
- L'adresse passe en argument de la commande : elle entre dans l'historique de commandes du poste
  de qui livre. C'est accepté et la procédure de livraison le signalera.
- Dans `docs/architecture/context.c4`, la relation `integrateur -> colibri-cms.d1` perd sa marque
  `#planned` et reçoit sa trace complète ; `likec4 validate --no-layout --json --project colibri-cms
  docs/architecture` passe.

**Tests.** Unité sur le verdict. Intégration dans `workerd` (ADR-0014), base D1 réelle, sans double
de la base ni de la liaison d'e-mail : le test applique à la base locale l'écriture que le geste
décide, puis demande un code sur `POST /admin/connexion`. Oracle : le contenu de
`adresses_autorisees`, **et** le comportement — un code est écrit pour l'adresse semée, aucun pour
une autre. Reprendre le montage de `tests/integration/adresse-de-connexion-sans-casse.test.ts`
(schéma, cookie d'appareil, espion d'expédition, en-tête `Origin`) sans le modifier. Cas limites :
table vide ; même adresse ; même adresse en autre casse ; autre adresse ; adresse vide, sans `@`,
avec espaces autour.

**Hors périmètre** : remplacer l'adresse d'une instance en service ou la réamorcer ; une adresse
initiale dans le fichier d'instance ; une route d'amorçage dans le produit ; vérifier l'adresse
comme destination d'e-mail (geste de l'éditrice dans sa boîte, hors de l'outil).

**Références** : ADR-0005, ADR-0033 (`docs/adr/`), `docs/security.md`.

## Critères

- [ ] Quand le semis est lancé avec une adresse bien formée sur une instance qui n'a aucune adresse autorisée, cette adresse devient l'adresse autorisée et l'écran de connexion lui envoie un code quand elle le demande   (SC-08a)
- [ ] Quand le semis est lancé avec une autre adresse sur une instance qui a déjà une adresse autorisée, le semis est refusé en le disant et l'adresse autorisée est inchangée   (SC-08b)
- [ ] Quand le semis est relancé avec l'adresse déjà autorisée, l'instance garde une seule adresse autorisée, la même   (SC-08c)
- [ ] Quand le semis est lancé avec une adresse vide ou mal formée, le semis est refusé en le disant et rien n'est écrit dans la base   (SC-08d)
