# Tâches : Connexion de l'éditrice par code
Trace vers : [plan.md](./plan.md) (fichiers, contrats, décisions) · [spec.md](./spec.md) (FR/SC/SHALL)

## Légende
- [ ] à faire · [x] fait · [P] parallélisable (aucune dépendance avec les autres [P])
- `Rn` = **lot de review** : une *vertical slice* — une tranche qui traverse toutes les couches et
  livre un morceau de fonctionnalité complet, relisable seul (≈ une PR)
- `Tn` = **tâche** : un critère observable = un commit = une vérification au vert
- _vérif : <mode>_ = comment le lot prouve qu'il est fait — `TDD` (le test avant le code, défaut) ·
  `test-after` (le test après) · `check` (pas de test auto : une vérification observée) ·
  `inhérent` (la preuve est le résultat lui-même)
- _Requirements:_ = **backref** : les FR/SC que la tâche couvre — le fil qui dit pourquoi elle
  existe. **Toute tâche de ce fichier en porte un**, et il nomme une exigence de la spec.

**Ce que `_Livre :_` promet, et ce qu'un backref plus tardif ne promet pas.** Un lot **livre** une
exigence quand il porte à la fois son implémentation et sa vérification observable. Un lot ultérieur
peut néanmoins **corroborer** cette exigence en ajoutant au parcours une étape qui n'était pas
jouable plus tôt — l'étape **o** cherche le dernier code de l'étape **m**, et **m** naît quatre lots
plus loin. Ces tâches-là portent le backref sans revendiquer l'exigence, et chacune dit en clair
pourquoi elle atterrit là. Quatre existent : **o** (R10), **ℓ** (R5), le recâblage de **k** (R7) et
le volet parcours-entier des absences (R11).

**Ordre des lots.** R1 ouvre parce que rien ne se construit sans lui : `I6` veut que **tout** fichier
de route sous `src/pages/admin/` importe la garde de session, donc la garde et la première route
naissent ensemble. **Aucun lot n'est parallélisable, et R3 pas plus qu'un autre** : ses trois
fichiers sont partagés — `src/core/auth/regles.ts` avec R8, R9 et R10,
`src/platform/session/index.ts` avec R1 et R7, `src/platform/session/magasin.ts` avec R1. Le
marqueur qu'il a porté jusqu'au 2026-08-22 promettait une disjonction que sa propre ligne
`Fichiers :` démentait. Le restreindre à des fichiers propres n'est pas une issue **à ce niveau** :
`regles.ts` est, par le contrat du plan, le module unique des règles pures, et l'y scinder serait
décider à la place du plan. À partir de R4, tout retouche en outre
`src/pages/admin/connexion.astro` et `scripts/verif-connexion.sh` : la chaîne est sérielle de bout
en bout, et c'est le prix de la route unique qu'impose la décision 1 du plan.

**Le script de parcours se construit lot par lot.** `scripts/verif-connexion.sh` naît en R1 et chaque
lot y ajoute les étapes qui prouvent **ses** exigences — plutôt qu'un lot terminal qui rejouerait les
vérifications de tous les autres sans rien livrer en propre. Les étapes sont insérées à leur place
dans l'ordre du plan (a, b, b-bis, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r), et non à la suite :
un lot tardif peut donc en glisser une **avant** celles d'un lot antérieur — c'est le cas de **e**,
qui s'intercale devant **f** et lui laisse le code qu'elle lit. R11 ne garde que ce qui ne peut se
faire qu'une fois tout écrit.

**`[P]` n'est accordé qu'entre modules distincts du contrat du plan.** Deux tâches qui visent le
même module — donc, très probablement, le même fichier de test — ne le portent pas, même quand
rien ne les ordonne logiquement. Le marqueur promet qu'on peut les mener de front ; il ne doit pas
promettre plus que la découpe en fichiers ne tient.

---

## R1 — Aucune route d'administration ne se sert sans session
_Livre : FR-019, FR-022, FR-023, FR-035 · SC-006_ · _vérif : TDD_ · _~280 lignes est._ ·
_6 concepts_ · dépend de : —
Fichiers : `migrations/0002_connexion.sql`, `package.json`, `package-lock.json`, `vitest.config.ts`,
`src/platform/test/cloudflare-test.d.ts`, `src/platform/session/cookies.ts`,
`src/platform/session/index.ts`, `src/platform/session/magasin.ts`, `src/pages/admin/index.astro`,
`scripts/verif-connexion.sh`, `scripts/verif-bout-en-bout.sh`

> **Ce lot livre le refus, pas l'écran.** La porte qui se ferme se constate sans rien avoir à
> ouvrir : un `GET /admin/` sans cookie rend un renvoi, et c'est tout ce que `FR-019`, `FR-035` et
> `SC-006` demandent. L'écran sur lequel elle ouvre est R2. **Coût assumé et chiffré** :
> `src/pages/admin/index.astro` sert ici un document minimal — la route doit exister pour qu'`I6`
> ait quelque chose à contrôler et pour que l'étape **b** ait une cible — et R2 remplace ce
> document par l'accueil. Cinq lignes réécrites, contre un lot de ~400 lignes traversant huit
> sujets qu'on relit en survolant.

> **`ouvrirSession` n'est pas ici.** La garde exposée par ce lot est `exigerSession` seule.
> `ouvrirSession` naît en R7, avec son premier appelant et son premier test : l'implémenter ici
> aurait posé du code que rien n'exerce pendant six lots.

> **La migration pose trois tables et ce lot n'en exerce qu'une. Ce que ça coûte, et pourquoi c'est
> quand même moins cher.** Le relecteur voit le DDL d'`adresse_autorisee` et de `code_connexion` sans
> une ligne qui les lise : deux tiers du schéma ne sont pas jugeables ici, et il doit les prendre sur
> parole jusqu'à R5. En face, découper en `0002`/`0003`/`0004` par lot consommateur ferait dépendre
> **la suite des migrations de l'ordre de fusion des PR** : un lot fusionné hors séquence
> appliquerait une migration dont la précédente est absente, et la panne se manifesterait sur une
> base réelle, pas en relecture. Un DDL qu'on lit trop tôt est un inconfort ; une séquence de
> migrations qui dépend de l'ordre des merges est un incident.

- [ ] T1 — Brancher le harnais de test et poser la migration unique de la feature :
      `migrations/0002_connexion.sql` (les trois tables du contrat du plan), `vitest.config.ts`
      (`readD1Migrations` + liaison `MIGRATIONS`), `src/platform/test/cloudflare-test.d.ts`, et
      monter `@cloudflare/vitest-pool-workers` de `^0.20.3` à `^0.21.3` (décision 15 — la famille
      qu'`ADR-0013` retient ; les décisions 11 et 12 sont mesurées sur `0.20.3` et se rejouent ici) ;
      critère d'acceptation : un test qui applique les migrations, insère une ligne dans
      `session_admin` et la relit passe, et `npm run typecheck` sort à `0`
      _Requirements: FR-019, SC-006_ ; dépend de : —
- [ ] T2 — Écrire le test des attributs du cookie de session : préfixe `__Host-`, `HttpOnly`,
      `Secure`, `SameSite=Strict`, `Path=/` — l'identifiant n'est pas lisible par un script de la
      page, et une requête venue d'un autre site ne l'emporte pas
      _Requirements: FR-022, FR-023_ ; bloqué par : T1
- [ ] T3 — Implémenter `src/platform/session/cookies.ts`, **porteur unique** de la sérialisation
      des cookies du parcours (un second porteur échapperait au contrôle `ADR-0006`
      d'`arch-invariants`, qui ne lit que cette zone) _Requirements: FR-022, FR-023_ ; bloqué par : T2
- [ ] T4 [P] — Écrire le test de la garde : une session valide présentée rend la session ; aucun
      cookie, cookie inconnu ou session fermée rendent une réponse `302` vers `/admin/connexion`
      _Requirements: FR-019, FR-035, SC-006_ ; bloqué par : T1
- [ ] T5 — Implémenter `exigerSession` dans `src/platform/session/index.ts` et
      `src/platform/session/magasin.ts` — `exigerSession` rend **soit** la session **soit** la
      réponse de renvoi, si bien que l'oubli se voit au typage plutôt qu'à l'exécution
      _Requirements: FR-019, FR-035, SC-006_ ; bloqué par : T3, T4
- [ ] T6 — Servir `src/pages/admin/index.astro` derrière la garde ; critère d'acceptation : une
      session semée en base rend un `200`, l'absence de cookie renvoie vers l'écran de connexion, et
      le fichier **importe et appelle** la garde — c'est ce qu'`I6` contrôle, et importer sans
      appeler est l'angle mort qu'`ADR-0026` déclare assumé
      _Requirements: FR-019, FR-035, SC-006_ ; bloqué par : T5
- [ ] T7 — Créer `scripts/verif-connexion.sh` — l'ossature, les **quatre commandes normatives**
      (`npm run typecheck`, `npm test`, `npm run build`, `npm run lint:boundaries`) et l'étape
      **b** (`GET /admin/` sans cookie → `302` vers `/admin/connexion`) ; critère d'acceptation : le
      script sort à `0` sur un dépôt propre et refuse au premier écart
      _Requirements: FR-019, FR-035, SC-006_ ; bloqué par : T6
- [ ] T8 — Poser dans `scripts/verif-connexion.sh` l'assertion de bilan **exact**
      d'`arch-invariants.sh` — `12 contrôle(s) au vert · 1 vérifié(s) ailleurs · 2 hors portée ·
      0 violation(s)` — et corriger celle de `scripts/verif-bout-en-bout.sh`, **déjà fausse avant
      cette feature** (l'état `AILLEURS` introduit par `d2bc478`, postérieur à son écriture) ;
      critère d'acceptation : les deux scripts rejoués sortent à `0`, et l'assertion attrape les deux
      sens — un `I6` retombé hors portée dirait que les routes ont quitté le préfixe gardé, un
      `ADR-0006` en violation dirait qu'un des quatre attributs du cookie a disparu
      _Requirements: FR-019, FR-022, FR-023, SC-006_ ; bloqué par : T7

## R2 — L'écran d'accueil s'ouvre derrière la garde
_Livre : FR-018_ · _vérif : TDD_ · _~130 lignes est._ · _3 concepts_ · dépend de : R1
Fichiers : `src/admin/Page.astro`, `src/admin/accueil/Accueil.astro`, `src/admin/textes.ts`,
`public/admin.css`, `src/pages/admin/index.astro`, `scripts/verif-connexion.sh`

- [ ] T9 — Écrire le test de l'accueil servi : une session valide rend un document portant le titre
      de l'écran d'accueil ; l'absence de cookie continue de renvoyer vers l'écran de connexion
      _Requirements: FR-018_ ; dépend de : —
- [ ] T10 — Implémenter `src/admin/Page.astro` (la coquille, **aucun bloc `<style>`**, décision 4),
      `src/admin/accueil/Accueil.astro`, `src/admin/textes.ts` et `public/admin.css`, et brancher
      `src/pages/admin/index.astro` dessus à la place du document minimal de R1 ; critère
      d'acceptation : aucun des dix-huit termes que la Légende de la spec énumère sous « terme de
      développeur » ne paraît dans les textes que cette tâche ajoute à `src/admin/textes.ts`
      _Requirements: FR-018, FR-025_ ; bloqué par : T9
- [ ] T11 — Ajouter au parcours l'étape **k** (`GET /admin/` avec le cookie → `200`, l'écran
      d'accueil) ; critère d'acceptation : la session est **semée en base** et son identifiant posé
      à la main dans le bocal, faute de quoi que ce soit qui l'ouvre — R7 rebranchera cette étape
      sur le cookie que l'étape **j** obtient
      _Requirements: FR-018_ ; bloqué par : T10

## R3 — Une session s'éteint d'elle-même
_Livre : FR-020, FR-021_ · _vérif : TDD_ · _~120 lignes est._ · _2 concepts_ · dépend de : R1
Fichiers : `src/core/auth/regles.ts`, `src/platform/session/index.ts`,
`src/platform/session/magasin.ts`

- [ ] T12 — Écrire le test des deux bornes **à instant injecté** : sept jours sans usage ferment la
      session ; trente jours d'âge la ferment quel que soit son usage — les attendre en temps réel
      serait un test qui dure un mois _Requirements: FR-020, FR-021_ ; dépend de : —
- [ ] T13 — Implémenter les deux bornes dans `src/core/auth/regles.ts` (sans horloge ni
      plateforme, `I2`) et leur lecture à chaque requête dans `src/platform/session/` ; critère
      d'acceptation : le rafraîchissement glissant n'écrit pas à chaque requête, le budget
      d'écriture D1 étant cinquante fois plus serré que celui de lecture
      _Requirements: FR-020, FR-021_ ; bloqué par : T12

## R4 — Toute réponse d'administration porte la politique de sécurité
_Livre : FR-041, FR-042, FR-043, FR-044 · SC-014_ · _vérif : TDD_ · _~170 lignes est._ ·
_4 concepts_ · dépend de : R2
Fichiers : `src/platform/entetes/middleware.ts`, `astro.config.ts`, `wrangler.jsonc`,
`scripts/verif-connexion.sh`

- [ ] T14 — Déclarer `assets.run_worker_first: ["/admin/*"]` dans `wrangler.jsonc` (décision 16) —
      la liste qu'`ADR-0015` et `ADR-0026` **supposent déjà écrite** et qui n'existait nulle part ;
      sans elle, `FR-041` reposait sur l'absence fortuite de fichier sous `public/admin/`. Le bloc
      `assets` **ne porte pas `directory`** : câbler le déploiement reste hors de ce lot, qui ne
      déploie rien. Critère d'acceptation : `wrangler d1 migrations list DB --local` s'exécute sans
      réserve sur cette configuration (mesuré sur `wrangler@4.120.0`), et `arch-invariants.sh` rend
      toujours `✓ ADR-0015 (a)` — un rouge dirait que la liste est passée à `true` ou à `/*`, et que
      le fichier `_headers` a cessé en silence de couvrir les pages publiques
      _Requirements: FR-041_ ; dépend de : —
- [ ] T15 — Écrire le test des en-têtes d'administration : toute réponse sous `/admin/` porte la
      politique définie par ses **trois interdits** (ni script en ligne, ni évaluation dynamique de
      code, ni source autre que le site lui-même), le refus de voir son type de contenu réinterprété
      et le refus de transmettre l'adresse consultée — sur la page `200` **comme sur la redirection
      `302`** de la garde _Requirements: FR-041, FR-042, FR-043, FR-044_ ; bloqué par : T14
- [ ] T16 — Implémenter `src/platform/entetes/middleware.ts` et l'inscrire depuis `astro.config.ts`
      par `addMiddleware` (entrypoint en `new URL(…, import.meta.url)`, décision 3)
      _Requirements: FR-041, FR-042, FR-043, FR-044_ ; bloqué par : T15
- [ ] T17 — Ajouter au parcours l'étape **p** : les **trois** formes de réponse — l'écran servi, le
      renvoi vers l'écran de connexion, un chemin inconnu — tirées **séparément**, chacune portant la
      politique et aucune n'admettant les trois interdits ; critère d'acceptation : les trois sont
      tirées une par une, parce que c'est exactement ce que `SC-014` compte — une politique posée sur
      l'écran mais absente du renvoi ou de l'erreur laisse deux réponses nues sur l'origine commune
      _Requirements: FR-041, FR-042, FR-043, FR-044, SC-014_ ; bloqué par : T16

## R5 — L'écran de connexion n'engendre un code que pour l'adresse autorisée
_Livre : FR-002, FR-003, FR-029, FR-034, FR-038, FR-040 · SC-010, SC-011, SC-015_ · _vérif : TDD_ ·
_~380 lignes est._ · _6 concepts_ · dépend de : R4
Fichiers : `src/core/auth/code.ts`, `src/platform/auth/magasin.ts`,
`src/platform/session/cookies.ts`, `src/admin/connexion/FormulaireAdresse.astro`,
`src/admin/textes.ts`, `src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T18 — Écrire le test du code : huit signes tirés d'un alphabet de trente-deux caractères d'où
      les confusables sont absents, et `32^8 = 2^40` exactement
      _Requirements: FR-002, FR-034, SC-011_ ; dépend de : —
- [ ] T19 — Implémenter l'alphabet et l'engendrement dans `src/core/auth/code.ts` — les octets
      d'aléa sont **reçus en paramètre**, `src/core/` n'ayant ni plateforme ni horloge (`I2`)
      _Requirements: FR-002, FR-034, SC-011_ ; bloqué par : T18
- [ ] T20 [P] — Écrire le test de la lecture de l'adresse autorisée : une adresse autre n'engendre
      aucun code ; aucune adresse enregistrée n'engendre aucun code et n'ouvre aucune session
      _Requirements: FR-003, FR-029, SC-010_ ; dépend de : —
- [ ] T21 — Implémenter `src/platform/auth/magasin.ts` — lecture de l'adresse autorisée, écriture
      d'une ligne de `code_connexion` _Requirements: FR-003, FR-029, SC-010_ ; bloqué par : T20
- [ ] T22 — Écrire le test de la conservation : après émission, la lecture intégrale de ce que
      le système a conservé ne contient pas le code émis, et deux codes identiques donnent deux
      empreintes différentes _Requirements: FR-040, SC-015_ ; bloqué par : T21
- [ ] T23 — Implémenter le sel tiré au hasard par ligne et l'empreinte
      `SHA-256(sel ‖ code normalisé)` — le code n'est jamais écrit (décision 14) ; critère
      d'acceptation : ce qui est promis est la **conservation**, non l'irréversibilité calculatoire —
      à 40 bits ce sont l'expiration et le brûlage qui opposent la recherche exhaustive
      _Requirements: FR-040, SC-015_ ; bloqué par : T22
- [ ] T24 — Écrire le test du cookie d'appareil et de l'absence de `Set-Cookie` : le `GET` du
      formulaire pose le cookie s'il manque et deux navigateurs repartent avec deux identifiants
      différents ; **aucune des deux réponses du `POST` d'adresse ne porte de `Set-Cookie`**, donc
      rien dont la présence ou la longueur dépende de l'adresse soumise
      _Requirements: FR-038_ ; bloqué par : T19, T21
- [ ] T25 — Implémenter l'étape « adresse » de `src/pages/admin/connexion.astro` et
      `src/admin/connexion/FormulaireAdresse.astro` — le `GET` pose le cookie d'appareil (décision 6),
      le `POST` éprouve l'adresse puis engendre et écrit, et passe à l'étape suivante par une
      redirection `303` vers `?etape=code`, si bien qu'un rafraîchissement ne réémet pas ; un `POST`
      sans cookie d'appareil renvoie au formulaire sans rien engendrer. Critère d'acceptation :
      aucun des dix-huit termes de la Légende ne paraît dans les textes que cette tâche ajoute
      _Requirements: FR-003, FR-025, FR-029, FR-038_ ; bloqué par : T23, T24
- [ ] T26 — Ajouter au parcours les étapes **a** (semer l'adresse autorisée dans la base locale —
      c'est le geste d'exploitation que la spec range hors produit, et l'étape en est la
      démonstration exécutable), **b-bis** (chacun des deux bocaux repart avec son cookie d'appareil,
      tiré au hasard et différent de l'autre), **c** (`POST` d'une adresse inconnue → la réponse, et
      aucune ligne engendrée) et **n** (base vidée de son adresse autorisée → la réponse ordinaire,
      et **aucune ligne écrite dans `code_connexion`** : aucun code n'existant à présenter, aucune
      session ne peut s'ouvrir) ; critère d'acceptation : les volets « aucun message émis » de **c**
      et de **n** se referment en R6, qui fait naître l'émission
      _Requirements: FR-003, FR-029, FR-038, SC-010_ ; bloqué par : T25
- [ ] T27 — Ajouter au parcours l'étape **ℓ** : un `POST` sur `/admin/connexion` portant une
      **origine étrangère** → `403`. Le contrôle est celui du framework (`security.checkOrigin`,
      `true` par défaut, mesuré) : aucune ligne de code ne le pose, et c'est là sa fragilité.
      Critère d'acceptation : l'assertion échoue quand on lui soumet un `security: { checkOrigin:
      false }` injecté dans `astro.config.ts` — sans ce défaut injecté, elle attesterait d'un réglage
      que personne n'a posé et qu'un réglage peut retirer en silence. **Corroboration** : `FR-023`
      est livré par R1 (l'attribut `SameSite=Strict` du cookie) ; cette étape en couvre l'autre
      moitié, le refus d'origine, qui n'existe qu'à partir du premier `POST` — né ici
      _Requirements: FR-023_ ; bloqué par : T25

## R6 — Le message portant le code part vers la seule adresse autorisée
_Livre : FR-001, FR-004, FR-036, FR-037 · SC-002_ · _vérif : TDD_ · _~170 lignes est._ ·
_4 concepts_ · dépend de : R5
Fichiers : `src/platform/auth/emission.ts`, `src/platform/auth/expediteur.ts`, `wrangler.jsonc`,
`src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

> **Le texte du message ne vit pas dans `src/admin/textes.ts`, et c'est `I1` qui l'impose** : la
> matrice interdit l'arête `platform → admin`. Il vit avec sa composition, dans
> `src/platform/auth/emission.ts`. Ce sont les **deux** — et les seuls — porteurs de texte visible
> du parcours.

- [ ] T28 — Écrire le test de la composition du message : texte seul sans mise en forme, objet
      identique d'une émission à l'autre et dont aucune partie ne provient de la saisie, destination
      = l'adresse autorisée et **aucune autre**
      _Requirements: FR-001, FR-004, FR-036, FR-037_ ; dépend de : —
- [ ] T29 — Implémenter `src/platform/auth/emission.ts` et `expediteur.ts` (adresse d'expédition
      dérivée d'`instance.json` par import, décision 10), et déclarer la liaison `ENVOI_CODE` dans
      `wrangler.jsonc` **avec `destination_address`** — la restriction rétablie par l'arbitrage
      humain du 2026-08-22 (décision 9) : elle avait été retirée sur le rouge d'un contrôle
      **informatif** défaillant, et retirer une protection réelle pour cette raison prend le problème
      par le mauvais bout. Critères d'acceptation : **(1)** l'adresse d'exemple portée par
      `destination_address` est **hors du domaine d'`instance.json`**, faute de quoi le contrôle
      `I8` — qui cherche en sous-chaîne — rend `ko` et l'assertion de bilan de T8 tombe ; **(2)**
      c'est **exactement** l'adresse que l'étape **a** sème, sans quoi la plateforme refuse
      l'émission et le parcours ne produit aucun `.eml` ; **(3)** aucun des dix-huit termes de la
      Légende ne paraît dans le texte du message
      _Requirements: FR-001, FR-004, FR-025, FR-036, FR-037_ ; bloqué par : T28
- [ ] T30 — Brancher l'émission sur l'étape « adresse » ; ajouter au parcours le **volet « un `.eml`
      apparaît » de l'étape d** (`POST` de l'adresse autorisée depuis le premier bocal — R9
      l'enrichira de l'assertion d'identité octet pour octet), l'étape **f** (le message est en texte
      seul, son objet est celui du produit et ne porte rien de la saisie ; le code en est extrait
      pour la suite) et les **volets « aucun message émis » des étapes c et n**
      _Requirements: FR-001, FR-004, FR-036, FR-037, SC-002_ ; bloqué par : T29

## R7 — Le code recopié sur l'appareil demandeur ouvre la session
_Livre : FR-011, FR-012, FR-013, FR-016, FR-017, FR-024, FR-030, FR-032_ · _vérif : TDD_ ·
_~360 lignes est._ · _6 concepts_ · dépend de : R6
Fichiers : `src/core/auth/code.ts`, `src/core/auth/verdict.ts`, `src/platform/auth/magasin.ts`,
`src/platform/session/index.ts`, `src/admin/connexion/FormulaireCode.astro`, `src/admin/textes.ts`,
`src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T31 — Écrire le test de la normalisation d'une saisie : casse indifférente, séparateurs
      ignorés, `O` → `0`, `I` et `L` → `1` — c'est le versant lecture de l'alphabet sans confusables
      _Requirements: FR-011_ ; dépend de : —
- [ ] T32 — Implémenter `normaliserSaisie` dans `src/core/auth/code.ts`
      _Requirements: FR-011_ ; bloqué par : T31
- [ ] T33 [P] — Écrire le test du verdict nominal et de la liaison à l'appareil : un code non
      expiré, retrouvé **par le cookie de demande**, première présentation → `ouvrir` ; un appareil
      qui n'a **jamais** demandé de code → `autre-appareil`, et l'écran invite à reprendre sur
      l'appareil demandeur _Requirements: FR-011, FR-012, FR-032_ ; dépend de : —
- [ ] T34 — Implémenter `src/core/auth/verdict.ts` et la lecture par appareil dans
      `src/platform/auth/magasin.ts` — `… where appareil = ? order by emis_le desc limit 1`,
      **sans aucune clause sur `expire_le`, `consomme`, `annule` ni `essais_restants`** : c'est
      `juger()` qui tranche à partir de l'état lu, et lui seul. Critère d'acceptation : un code
      expiré ou déjà consommé rend `redemander`, jamais `autre-appareil` — filtrer à la lecture
      renverrait l'éditrice sur un autre appareil pour un code qu'elle a bien demandé sur le sien
      _Requirements: FR-011, FR-012, FR-032_ ; bloqué par : T33
- [ ] T35 [P] — Écrire le test du brûlage à l'usage : un code qui a ouvert une session n'en ouvre
      pas une seconde _Requirements: FR-013_ ; dépend de : —
- [ ] T36 — Implémenter `ouvrirSession` dans `src/platform/session/index.ts` et la consommation du
      code à l'ouverture ; critère d'acceptation : c'est cet appel qui rend honnête l'import du garde
      par `src/pages/admin/connexion.astro` (`I6`, décision 1) — importer sans appeler est
      exactement l'angle mort qu'`ADR-0026` déclare assumé
      _Requirements: FR-011, FR-013_ ; bloqué par : T35
- [ ] T37 — Écrire le test de l'étape « code » : un code juste ouvre une session et renvoie vers
      l'accueil ; l'écran de saisie porte la mention **bornée à l'appareil** — « si un nouveau code a
      été demandé depuis cet appareil, seul le dernier **permet d'entrer** » —, et **deux bornes**
      tiennent cette phrase : « seul le dernier message reçu » serait faux pour qui a deux appareils
      en cours, et « ouvre une session » emploierait *session*, le premier des dix-huit termes que la
      Légende de la spec interdit sur cet écran depuis que `FR-025` l'y couvre — l'étape **q** (T59)
      le relèverait sur le texte rendu, et le lot échouerait sur sa propre prescription ; **sur les
      écrans que ce lot et les précédents servent** — connexion, saisie du code, accueil — aucun
      champ de mot de passe, aucun lien de création de compte, aucun renvoi vers un autre compte
      _Requirements: FR-016, FR-017, FR-024, FR-030_ ; bloqué par : T32, T34, T36
- [ ] T38 — Implémenter l'étape « code » de `src/pages/admin/connexion.astro` et
      `src/admin/connexion/FormulaireCode.astro` (dont le premier des trois textes de refus, celui
      qui invite à reprendre sur l'appareil demandeur) ; critère d'acceptation : aucun des dix-huit
      termes de la Légende ne paraît dans les textes que cette tâche ajoute
      _Requirements: FR-011, FR-016, FR-017, FR-024, FR-025, FR-030, FR-032_ ; bloqué par : T37
- [ ] T39 — Ajouter au parcours les étapes **g** (présenter le code depuis le second bocal → refus,
      et le texte est celui qui invite à reprendre sur l'appareil demandeur) et **j** (présenter le
      bon code → `302` vers `/admin/`, cookie de session portant les quatre attributs ; le
      **rejouer** → refus) ; **et recâbler l'étape k** sur le cookie de session que **j** vient
      d'obtenir. Critère d'acceptation : plus aucune session n'est semée à la main dans le script —
      celle de R2 n'a tenu que le temps où rien ne l'ouvrait, et la laisser ferait passer **k** sur
      une session que le parcours n'a pas produite
      _Requirements: FR-011, FR-012, FR-013, FR-018, FR-032_ ; bloqué par : T38

## R8 — Un code refusé dit quoi faire
_Livre : FR-014, FR-015, FR-027, FR-028, FR-031 · SC-004, SC-009_ · _vérif : TDD_ ·
_~250 lignes est._ · _3 concepts_ · dépend de : R7
Fichiers : `src/core/auth/verdict.ts`, `src/core/auth/regles.ts`, `src/platform/auth/magasin.ts`,
`src/admin/textes.ts`, `src/admin/connexion/FormulaireCode.astro`, `scripts/verif-connexion.sh`

- [ ] T40 — Écrire le test des trois causes qui appellent le même geste, **à instant injecté** :
      présenté au-delà de quinze minutes, déjà utilisé, annulé par une demande ultérieure faite
      **depuis le même appareil** → `redemander`
      _Requirements: FR-014, FR-027, FR-031_ ; dépend de : —
- [ ] T41 — Implémenter l'expiration à quinze minutes (`src/core/auth/regles.ts`) et l'annulation,
      **à l'émission** d'un nouveau code, des codes encore utilisables portant le **même identifiant
      d'appareil** ; critère d'acceptation : un code demandé depuis un **autre** appareil n'est pas
      touché et continue d'y ouvrir une session
      _Requirements: FR-014, FR-027, FR-031_ ; bloqué par : T40
- [ ] T42 — Écrire le test du brûlage à la cinquième erreur : les quatre premières
      présentations erronées invitent à vérifier la saisie, la cinquième rend le code inutilisable
      pour toute présentation ultérieure _Requirements: FR-015, FR-028_ ; bloqué par : T41
- [ ] T43 — Implémenter le décompte des présentations restantes et le brûlage
      _Requirements: FR-015, FR-028_ ; bloqué par : T42
- [ ] T44 — Écrire le test du registre des refus : **cinq causes, trois réponses**, chaque cause
      rendant celle qui correspond au geste attendu, et **aucune** des quatre présentations
      fautives — rejeu, autre appareil, au-delà de quinze minutes, cinquième erreur — n'ouvrant de
      session _Requirements: SC-004, SC-009_ ; bloqué par : T41, T43
- [ ] T45 — Implémenter les deux textes de refus restants dans `src/admin/textes.ts` (vérifier la
      saisie ; demander un nouveau code) et leur rendu par `src/admin/connexion/FormulaireCode.astro` ;
      critère d'acceptation : aucun des dix-huit termes de la Légende ne paraît dans les textes que
      cette tâche ajoute _Requirements: FR-025, FR-028, FR-031, SC-004, SC-009_ ; bloqué par : T44
- [ ] T46 — Ajouter au parcours les étapes **h** (un code faux présenté cinq fois : les quatre
      premiers invitent à retaper, le cinquième invite à demander un nouveau code et le code cesse
      d'être présentable) et **i** (redemander un code, puis présenter l'avant-dernier → refus,
      invitation à en demander un nouveau)
      _Requirements: FR-015, FR-027, FR-028, FR-031, SC-004_ ; bloqué par : T45

## R9 — La réponse de l'écran de connexion ne trahit rien par son délai
_Livre : FR-005, FR-006, FR-007, FR-033 · SC-003, SC-012_ · _vérif : TDD_ · _~240 lignes est._ ·
_4 concepts_ · dépend de : R8
Fichiers : `src/core/auth/regles.ts`, `src/pages/admin/connexion.astro`,
`scripts/verif-connexion.sh`

- [ ] T47 — Écrire le test de l'émission non attendue : la réponse est rendue sans attendre l'issue
      de l'émission, et une émission qui échoue rend la **même** réponse qu'une émission qui aboutit
      _Requirements: FR-006, FR-007_ ; dépend de : —
- [ ] T48 — Écrire le test de la réponse au contenu identique : l'adresse autorisée et une
      adresse inconnue rendent le **même corps** et les **mêmes champs d'en-tête** — c'est le
      périmètre que `FR-005` fixe, rien de plus, rien de moins
      _Requirements: FR-005_ ; bloqué par : T47
- [ ] T49 — Implémenter l'ordre imposé par les exigences : engendrer et **écrire le code en base**
      (attendu — sinon l'éditrice pourrait saisir un code que la base ignore encore), confier
      l'**émission** à `Astro.locals.cfContext.waitUntil`, attendre le solde du délai plancher,
      répondre — jamais un délai *supplémentaire* constant, dont le total varierait avec le travail
      _Requirements: FR-005, FR-006, FR-007, FR-033_ ; bloqué par : T47, T48
- [ ] T50 — Geler le délai plancher à **1 500 ms** dans `src/core/auth/regles.ts` ; critère
      d'acceptation : la valeur est dérivée comme **budget d'étalement** (décision 7, redérivée le
      2026-08-22) — l'étalement toléré vaut la médiane divisée par vingt, soit 75 ms pour un plancher
      de 1 500 — et elle est écrite **avant que quoi que ce soit ne la mesure**, aucune étape de
      vérification ne la réécrivant : une mesure qui règle le seuil qu'elle juge ne peut jamais
      échouer _Requirements: FR-033_ ; bloqué par : T49
- [ ] T51 — Ajouter au parcours l'**assertion d'identité de l'étape d** (le `POST` de l'adresse
      autorisée et celui d'une adresse inconnue rendent un corps identique **octet pour octet** et le
      même jeu de champs d'en-tête, `Date` excepté — faisable parce qu'aucune des deux ne porte de
      `Set-Cookie`, le cookie d'appareil étant posé au `GET`) et l'étape **e**, la campagne
      d'indiscernabilité **conduite hors plafond** : deux cents soumissions alternées — cent de
      chaque adresse — en **vingt-cinq salves de quatre paires**, la table `code_connexion` étant
      **vidée avant chaque salve**, si bien qu'au plus quatre émissions cohabitent dans l'heure
      glissante et qu'**aucun tir n'atteint le plafond** ; **deux assertions sur ces mêmes deux cents
      délais, et aucun instrument de plus** — l'écart des **95ᵉ centiles** des deux séries est
      ≤ 25 ms (`SC-003`), et l'**étalement** des deux cents, du 5ᵉ au 95ᵉ centile, est **au plus le
      vingtième de leur médiane** (`SC-012`). L'étape **se referme en rendant la suite jouable** :
      `code_connexion` et le répertoire des `.eml` sont vidés une dernière fois, puis un code est
      réémis depuis le bon bocal — c'est celui-là que **f** lit, et la fenêtre repart à un seul
      envoi. Critère d'acceptation : l'étape **juge** le plancher gelé en T50 et ne le règle jamais —
      un rouge est un fait, et relever le plancher est une modification de source avec son commit
      _Requirements: FR-005, FR-006, FR-033, SC-003, SC-012_ ; bloqué par : T50

## R10 — Le plafond d'envois protège la boîte de la cliente
_Livre : FR-008, FR-009, FR-010, FR-039 · SC-005, SC-013_ · _vérif : TDD_ · _~250 lignes est._ ·
_4 concepts_ · dépend de : R9
Fichiers : `src/core/auth/regles.ts`, `src/platform/auth/magasin.ts`,
`src/admin/connexion/FormulaireAdresse.astro`, `src/admin/textes.ts`,
`src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T52 — Écrire le test du plafond **à instant injecté** : cinq messages déjà émis dans l'heure
      glissante n'en laissent émettre aucun de plus ; la fenêtre glisse et libère un envoi ; les
      lignes annulées comptent, l'exigence portant sur les **messages émis** et non sur les codes
      vivants ; et une rafale de cinq demandes depuis un même appareil — dont `FR-027` tue les quatre
      premières à mesure — atteint bien le plafond, les écritures successives n'ayant emporté aucune
      de ces lignes _Requirements: FR-008, SC-005_ ; dépend de : —
- [ ] T53 — Implémenter le comptage sur `code_connexion`, **la garde du ramassage des lignes
      mortes** dans `src/platform/auth/magasin.ts` — une ligne n'est supprimée qu'une fois **sortie
      de l'heure glissante** (`… where emis_le < ?`), jamais sur son seul état — et l'épreuve du
      plafond **avant tout autre effet** : quand il est atteint la route ne touche à rien, donc
      n'annule aucun code, donc le dernier code émis ouvre encore une session **jusqu'à son
      expiration** sans qu'aucune ligne ne le prévoie (décision 8). Critères d'acceptation :
      **(1)** sans cette garde, `FR-027` annulant le code précédent à chaque demande du même
      appareil, quatre des cinq lignes d'une rafale meurent avant la cinquième, le ramassage les
      emporte et **le plafond n'est jamais atteint** ; **(2)** la borne de l'heure glissante est
      **lue dans `src/core/auth/regles.ts`** et non recopiée, sans quoi un second réglage dériverait
      de celui de `FR-008` _Requirements: FR-008, FR-010, SC-005_ ; bloqué par : T52
- [ ] T54 — Écrire le test de l'annonce et de son indiscernabilité : le plafond atteint est indiqué
      à qui soumet, **et** une adresse inconnue soumise sous plafond reçoit le même corps et les
      mêmes champs d'en-tête que l'adresse autorisée — sans quoi l'annonce serait le seul endroit du
      parcours qui désigne l'adresse autorisée
      _Requirements: FR-009, FR-039, SC-013_ ; bloqué par : T53
- [ ] T55 — Implémenter l'annonce (`?etape=plafond`) dans `src/admin/textes.ts` et
      `src/admin/connexion/FormulaireAdresse.astro` ; critères d'acceptation : le choix entre la
      réponse ordinaire et celle du plafond ne dépend que de l'état du plafond du déploiement, jamais
      de l'adresse soumise ; et aucun des dix-huit termes de la Légende ne paraît dans les textes que
      cette tâche ajoute _Requirements: FR-009, FR-025, FR-039_ ; bloqué par : T54
- [ ] T56 — Ajouter au parcours l'étape **m** et son **second tir**. Elle s'ouvre en **vidant la
      fenêtre de comptage**, sans quoi elle ne compte rien — **e** et **i** ont laissé des émissions
      dans l'heure glissante, et six soumissions n'en produiraient plus que trois. Critère
      d'acceptation : la fenêtre se vide en **reculant `emis_le`** de plus d'une heure
      (`update code_connexion set emis_le = emis_le - 3700000`) et **jamais** en supprimant les
      lignes : reculer les sort de la fenêtre **et** les rend ramassables du même geste, ce qui met
      l'étape dans l'état que le § Schéma D1 décrit au lieu d'un état que rien ne produirait en
      exploitation. Le répertoire des `.eml` est vidé pour que le décompte porte sur cette étape
      seule. Puis six soumissions d'affilée de l'adresse autorisée
      → **cinq `.eml` seulement**, la sixième réponse annonce le plafond, et le dernier code reçu
      ouvre encore une session ; puis, **le plafond toujours atteint**, une soumission d'une
      **adresse inconnue** → même corps et mêmes champs d'en-tête que la sixième
      _Requirements: FR-008, FR-009, FR-010, FR-039, SC-005, SC-013_ ; bloqué par : T55
- [ ] T57 — Ajouter au parcours l'étape **o** : déverser les trois tables de la base locale dans un
      fichier et y chercher **littéralement le dernier code de m** — celui qui vient d'ouvrir une
      session. Aucune occurrence. Critères d'acceptation : **(1)** le code cherché est celui de
      **m**, jamais celui de **f** — la ligne de **f** est morte depuis **h**, donc sortie de la
      fenêtre et ramassée bien avant ici, et l'assertion serait restée verte quand bien même le code
      y aurait été écrit en clair ; celle de **m** vient d'être écrite, n'a pas quitté l'heure
      glissante, la garde de T53 interdit de la ramasser avant cette sortie, et elle a traversé
      **les deux** écritures de la vie d'un code, l'émission et la consommation ; **(2)** ce que
      l'étape prouve reste borné par la décision 14 — la conservation, jamais l'irréversibilité
      calculatoire. **Corroboration** : `FR-040` et `SC-015` sont livrés par R5 (T22 les vérifie,
      T23 les implémente) ; l'étape n'est jouable qu'ici, parce qu'elle lit le dernier code que
      **m** produit et que **m** naît dans ce lot _Requirements: FR-040, SC-015_ ; bloqué par : T56

## R11 — Vérification bout-en-bout
_Livre : FR-025, FR-026 · SC-001, SC-007, SC-008, SC-016_ · _vérif : **check** — aucune de ces
quatre vérifications n'est un test automatisé : `FR-026` est une **absence de route** et ne
s'atteste que sur les sources, `SC-007` est une assertion du script de parcours sur les textes
rendus, `SC-016` est une relecture (classe 12 de `docs/archi.md`, conformité sémantique hors
d'atteinte d'un grep) et `SC-001` un test d'usage observé avec une personne_ · _~140 lignes est._ ·
_4 concepts_ · dépend de : R1, R2, R3, R4, R5, R6, R7, R8, R9, R10
Fichiers : `scripts/verif-connexion.sh`

> **Ce lot ne rejoue pas les autres.** Chaque étape du parcours a été ajoutée par le lot dont elle
> prouve les exigences ; ne restent ici que ce qui ne peut se constater qu'une fois tout écrit.

> **`FR-025` est transverse, et c'est dit plutôt que caché.** Ses textes naissent partout où du
> texte visible s'écrit — T10, T25, T29, T38, T45, T55 —, et **chacune de ces tâches porte
> désormais son propre critère d'acceptation** : aucun des dix-huit termes de la Légende dans les
> textes qu'elle ajoute. Ce qui reste ici est ce qu'aucune d'elles ne peut faire seule : l'assertion
> sur le parcours **entier** (T59) et la relecture de ce que la liste n'a pas prévu (T61). C'est la
> seule exigence de la feature dont l'implémentation et la vérification ne tiennent pas dans un même
> lot.

> **Le texte visible a deux porteurs, pas un.** `src/admin/textes.ts` porte celui des écrans,
> `src/platform/auth/emission.ts` celui du message. Ils ne se réunissent pas : `I1` interdit l'arête
> `platform → admin`. C'est ce qui rend `SC-016` **énumérable** — les textes visibles du parcours
> sont exactement les chaînes de ces deux modules —, et c'est pourquoi la relecture les nomme tous
> les deux.

- [ ] T58 — Ajouter l'étape **4** : aucune source de `src/pages/` ni de `src/admin/` n'écrit dans
      `adresse_autorisee` — l'exigence est une **absence de route**, et elle ne s'atteste qu'une
      fois toutes les routes écrites ; critère d'acceptation : l'assertion échoue si on lui soumet
      une écriture injectée, et le script complet sort à `0` sur un dépôt propre
      _Requirements: FR-026_ ; dépend de : —
- [ ] T59 — Ajouter l'étape **q**, le vocabulaire sur les textes **réellement rendus** : le script
      conserve le corps de chaque écran qu'il a demandé — le formulaire d'adresse de **b-bis**, le
      formulaire de code et ses trois refus de **g**, **h** et **i**, l'annonce du plafond de **m**,
      l'écran d'accueil de **k** — et le `.eml` de **f** ; il en retire le balisage, puis cherche,
      **sans égard à la casse ni aux accents**, chacun des dix-huit termes que la Légende de la spec
      énumère sous « terme de développeur » : aucune occurrence. Critère d'acceptation : l'assertion
      porte sur ce qui a été **rendu**, jamais sur les sources — un terme employé dans un commentaire
      ou dans un nom de variable n'est pas un texte visible, et l'y chercher rendrait le contrôle
      faux dans les deux sens _Requirements: FR-025, SC-007_ ; bloqué par : T58
- [ ] T60 — Ajouter au script le volet **parcours entier** des absences : sur tous les écrans du
      parcours — connexion, saisie du code et ses trois refus, annonce du plafond, accueil —, aucun
      ne demande la connexion à un compte autre que l'administration : aucun champ de mot de passe,
      aucun lien de création de compte, aucun renvoi vers un autre compte. Critère d'acceptation :
      l'assertion ne se joue qu'ici — R7 a constaté les écrans qu'il servait, mais R8 et R10 en ont
      ajouté après lui, et « sur tout le parcours » était faux tant qu'ils manquaient
      _Requirements: SC-008_ ; bloqué par : T59
- [ ] T61 — Relire l'intégralité des textes visibles du parcours et constater qu'aucun terme de
      développeur n'y paraît **au-delà de ceux qu'énumère la Légende** — la liste est un plancher,
      T59 prouve mécaniquement qu'elle est tenue, cette relecture couvre ce qu'elle n'a pas prévu ;
      critère d'acceptation : la relecture porte sur `src/admin/textes.ts` **et**
      `src/platform/auth/emission.ts`, les deux porteurs que `I1` empêche de réunir, elle épuise donc
      ces textes, et son constat est consigné _Requirements: SC-016_ ; bloqué par : T59
- [ ] T62 — Faire ouvrir l'administration par une personne qui n'a jamais vu le produit, à partir
      de la seule adresse autorisée ; **le message émis lui est remis intégralement et tel quel**, à
      la place de la boîte e-mail que cette feature ne livre pas, et elle ne reçoit **aucune autre
      assistance** ; critère d'acceptation : elle repère seule le code dans le message, le recopie
      sans le confondre, comprend l'écran et entre — sans mot de passe et sans créer de compte —, et
      l'observation est consignée _Requirements: SC-001_ ; bloqué par : T58, T60, T61

---

> **Contraintes de livraison, reprises du plan.** R1 touche `vitest.config.ts`, surveillé par
> `quality-config-guard` : sa PR doit porter le label `config-change`, ou le commit qui y touche un
> scope `chore(config):`. R1 touche aussi `package.json` et le lockfile (décision 15) : ce commit-là
> porte `build(deps):` ou `chore(deps):`, ou la PR le label `deps`. R4 touche `astro.config.ts` et
> `wrangler.jsonc`, R6 touche `wrangler.jsonc` : même exigence de scope ou de label.

> Les cases seront cochées par le niveau implémentation, pas ici. Ce fichier part rempli et vierge.
