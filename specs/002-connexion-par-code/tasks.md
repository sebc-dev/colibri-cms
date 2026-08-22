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
  existe. **Toute tâche de ce fichier en porte un**, et il nomme une exigence de la spec : les trois
  backrefs qui nommaient un ADR faute de porteur — la CSP d'administration et le bilan
  d'`arch-invariants` — sont rebranchés depuis la passe de correction du 2026-08-21, qui a créé
  `FR-041` à `FR-044` et `SC-014`.

**Ordre des lots.** R1 ouvre parce que rien ne se construit sans lui : `I6` veut que **tout** fichier
de route sous `src/pages/admin/` importe la garde de session, donc la garde et la première route
naissent ensemble. R2 et R3 sont **parallélisables** (fichiers disjoints). À partir de R4, tout
retouche `src/pages/admin/connexion.astro` et `scripts/verif-connexion.sh` : la chaîne est sérielle,
et c'est le prix de la route unique qu'impose la décision 1 du plan.

**Le script de parcours se construit lot par lot.** `scripts/verif-connexion.sh` naît en R1 et chaque
lot y ajoute les étapes qui prouvent **ses** exigences — plutôt qu'un lot terminal qui rejouerait les
vérifications de tous les autres sans rien livrer en propre. R10 ne garde donc que ce qui ne peut se
faire qu'une fois tout écrit : l'absence de route, la relecture du vocabulaire, l'essai avec une
personne.

**`[P]` n'est accordé qu'entre modules distincts du contrat du plan.** Deux tâches qui visent le
même module — donc, très probablement, le même fichier de test — ne le portent pas, même quand
rien ne les ordonne logiquement : `T18` suit `T17` (tous deux `platform/auth/magasin.ts`), `T37`
suit `T36` (`core/auth/verdict.ts`), `T43` suit `T42` (`pages/admin/connexion.astro`). Le marqueur
promet qu'on peut les mener de front ; il ne doit pas promettre plus que la découpe en fichiers ne
tient.

---

## R1 — Toute route d'administration exige une session, et l'accueil s'ouvre derrière
_Livre : FR-018, FR-019, FR-022, FR-023, FR-035 · SC-006_ · _vérif : TDD_ · _~400 lignes est._ ·
_5 concepts_ · dépend de : —
Fichiers : `migrations/0002_connexion.sql`, `package.json`, `package-lock.json`, `vitest.config.ts`,
`src/platform/test/cloudflare-test.d.ts`, `src/platform/session/index.ts`,
`src/platform/session/cookies.ts`, `src/platform/session/magasin.ts`, `src/admin/Page.astro`,
`src/admin/accueil/Accueil.astro`, `src/admin/textes.ts`, `public/admin.css`,
`src/pages/admin/index.astro`, `scripts/verif-connexion.sh`, `scripts/verif-bout-en-bout.sh`

> **Budget à hauteur de plafond, assumé.** Les deux retraits verticaux possibles ont été faits —
> l'expiration des sessions en R2, les en-têtes d'administration en R3, qui ont désormais leurs
> propres exigences. Ce qui reste ne se coupe plus sans devenir horizontal : une route sans garde ne
> construit pas (`I6`), une garde sans écran ne se constate pas.

> **La migration pose trois tables, ce lot n'en exerce qu'une, et c'est assumé.** Le plan fixe
> `migrations/0002_connexion.sql` comme **migration unique de la feature** (§ Contrats) ; la découper
> par lot consommateur contredirait ce contrat. `session_admin` est exercée ici ;
> `adresse_autorisee` et `code_connexion` le sont en R4, qui est le premier à les lire et à y écrire.

- [ ] T1 — Brancher le harnais de test et poser la migration unique de la feature :
      `migrations/0002_connexion.sql` (les trois tables du contrat du plan), `vitest.config.ts`
      (`readD1Migrations` + liaison `MIGRATIONS`), `src/platform/test/cloudflare-test.d.ts`, et
      monter `@cloudflare/vitest-pool-workers` de `^0.20.3` à `^0.21.3` (décision 15 — la famille
      qu'`ADR-0013` retient ; les décisions 11 et 12 sont mesurées sur `0.20.3` et se rejouent ici) ;
      critère d'acceptation : un test qui applique les migrations, insère une ligne dans
      `session_admin` et la relit passe, et `npm run typecheck` sort à `0`
      _Requirements: FR-018_ ; dépend de : —
- [ ] T2 — Écrire le test des attributs du cookie de session : préfixe `__Host-`, `HttpOnly`,
      `Secure`, `SameSite=Strict`, `Path=/` — l'identifiant n'est pas lisible par un script de la
      page, et une requête venue d'un autre site ne l'emporte pas
      _Requirements: FR-022, FR-023_ ; bloqué par : T1
- [ ] T3 — Implémenter `src/platform/session/cookies.ts`, **porteur unique** de la sérialisation
      des cookies du parcours (un second porteur échapperait au contrôle `ADR-0006`
      d'`arch-invariants`) _Requirements: FR-022, FR-023_ ; bloqué par : T2
- [ ] T4 [P] — Écrire le test de la garde : une session valide présentée rend la session ; aucun
      cookie, cookie inconnu ou session fermée rendent une réponse `302` vers `/admin/connexion`
      _Requirements: FR-018, FR-019, FR-035, SC-006_ ; bloqué par : T1
- [ ] T5 — Implémenter `src/platform/session/index.ts` (`exigerSession`, `ouvrirSession`) et
      `src/platform/session/magasin.ts` — `exigerSession` rend **soit** la session **soit** la
      réponse de renvoi, si bien que l'oubli se voit au typage
      _Requirements: FR-018, FR-019, FR-035, SC-006_ ; bloqué par : T4
- [ ] T6 — Servir l'écran d'accueil derrière la garde — `src/pages/admin/index.astro`,
      `src/admin/Page.astro`, `src/admin/accueil/Accueil.astro`, `src/admin/textes.ts`,
      `public/admin.css` (aucun bloc `<style>`, décision 4) ; critère d'acceptation : une session
      semée en base ouvre l'accueil, l'absence de cookie renvoie vers l'écran de connexion
      _Requirements: FR-018, FR-019, FR-025, FR-035_ ; bloqué par : T5
- [ ] T7 — Créer `scripts/verif-connexion.sh` — l'ossature, les **quatre commandes normatives**
      (`npm run typecheck`, `npm test`, `npm run build`, `npm run lint:boundaries`) et les étapes
      **b** (`GET /admin/` sans cookie → `302` vers `/admin/connexion`) et **k** (`GET /admin/` avec
      le cookie → `200`, l'écran d'accueil) ; critère d'acceptation : le script sort à `0` sur un
      dépôt propre et refuse au premier écart
      _Requirements: FR-018, FR-019, FR-035, SC-006_ ; bloqué par : T6
- [ ] T8 — Poser dans `scripts/verif-connexion.sh` l'assertion de bilan **exact**
      d'`arch-invariants.sh` — `12 contrôle(s) au vert · 1 vérifié(s) ailleurs · 2 hors portée ·
      0 violation(s)` — et corriger celle de `scripts/verif-bout-en-bout.sh`, **déjà fausse avant
      cette feature** (l'état `AILLEURS` introduit par `d2bc478`, postérieur à son écriture) ;
      critère d'acceptation : les deux scripts rejoués sortent à `0`, et l'assertion attrape les deux
      sens — un `I6` retombé hors portée dirait que les routes ont quitté le préfixe gardé, un
      `ADR-0006` en violation dirait qu'un des quatre attributs du cookie a disparu
      _Requirements: FR-019, FR-022, FR-023, SC-006_ ; bloqué par : T7

## R2 [P] — Une session s'éteint d'elle-même
_Livre : FR-020, FR-021_ · _vérif : TDD_ · _~120 lignes est._ · _2 concepts_ · dépend de : R1
Fichiers : `src/core/auth/regles.ts`, `src/platform/session/index.ts`,
`src/platform/session/magasin.ts`

- [ ] T9 — Écrire le test des deux bornes **à instant injecté** : sept jours sans usage ferment la
      session ; trente jours d'âge la ferment quel que soit son usage — les attendre en temps réel
      serait un test qui dure un mois _Requirements: FR-020, FR-021_ ; dépend de : —
- [ ] T10 — Implémenter les deux bornes dans `src/core/auth/regles.ts` (sans horloge ni
      plateforme, `I2`) et leur lecture à chaque requête dans `src/platform/session/` ; critère
      d'acceptation : le rafraîchissement glissant n'écrit pas à chaque requête, le budget
      d'écriture D1 étant cinquante fois plus serré que celui de lecture
      _Requirements: FR-020, FR-021_ ; bloqué par : T9

## R3 [P] — Toute réponse d'administration porte la politique de sécurité
_Livre : FR-041, FR-042, FR-043, FR-044 · SC-014_ · _vérif : TDD_ · _~150 lignes est._ ·
_3 concepts_ · dépend de : R1
Fichiers : `src/platform/entetes/middleware.ts`, `astro.config.ts`, `scripts/verif-connexion.sh`

- [ ] T11 — Écrire le test des en-têtes d'administration : toute réponse sous `/admin/` porte la
      politique définie par ses **trois interdits** (ni script en ligne, ni évaluation dynamique de
      code, ni source autre que le site lui-même), le refus de voir son type de contenu réinterprété
      et le refus de transmettre l'adresse consultée — sur la page `200` **comme sur la redirection
      `302`** de la garde _Requirements: FR-041, FR-042, FR-043, FR-044_ ; dépend de : —
- [ ] T12 — Implémenter `src/platform/entetes/middleware.ts` et l'inscrire depuis `astro.config.ts`
      par `addMiddleware` (entrypoint en `new URL(…, import.meta.url)`, décision 3)
      _Requirements: FR-041, FR-042, FR-043, FR-044_ ; bloqué par : T11
- [ ] T13 — Ajouter au parcours l'étape **p** : les **trois** formes de réponse — l'écran servi, le
      renvoi vers l'écran de connexion, un chemin inconnu — tirées **séparément**, chacune portant la
      politique et aucune n'admettant les trois interdits ; critère d'acceptation : les trois sont
      tirées une par une, parce que c'est exactement ce que `SC-014` compte — une politique posée sur
      l'écran mais absente du renvoi ou de l'erreur laisse deux réponses nues sur l'origine commune
      _Requirements: FR-041, FR-042, FR-043, FR-044, SC-014_ ; bloqué par : T12

## R4 — L'écran de connexion n'engendre un code que pour l'adresse autorisée
_Livre : FR-002, FR-003, FR-029, FR-034, FR-038, FR-040 · SC-010, SC-011, SC-015_ · _vérif : TDD_ ·
_~350 lignes est._ · _5 concepts_ · dépend de : R3
Fichiers : `src/core/auth/code.ts`, `src/platform/auth/magasin.ts`,
`src/platform/session/cookies.ts`, `src/admin/connexion/FormulaireAdresse.astro`,
`src/admin/textes.ts`, `src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T14 — Écrire le test du code : huit signes tirés d'un alphabet de trente-deux caractères d'où
      les confusables sont absents, et `32^8 = 2^40` exactement
      _Requirements: FR-002, FR-034, SC-011_ ; dépend de : —
- [ ] T15 — Implémenter l'alphabet et l'engendrement dans `src/core/auth/code.ts` — les octets
      d'aléa sont **reçus en paramètre**, `src/core/` n'ayant ni plateforme ni horloge (`I2`)
      _Requirements: FR-002, FR-034, SC-011_ ; bloqué par : T14
- [ ] T16 [P] — Écrire le test de la lecture de l'adresse autorisée : une adresse autre n'engendre
      aucun code ; aucune adresse enregistrée n'engendre aucun code et n'ouvre aucune session
      _Requirements: FR-003, FR-029, SC-010_ ; dépend de : —
- [ ] T17 — Implémenter `src/platform/auth/magasin.ts` — lecture de l'adresse autorisée, écriture
      d'une ligne de `code_connexion` _Requirements: FR-003, FR-029, SC-010_ ; bloqué par : T16
- [ ] T18 — Écrire le test de la conservation : après émission, la lecture intégrale de ce que
      le système a conservé ne contient pas le code émis, et deux codes identiques donnent deux
      empreintes différentes _Requirements: FR-040, SC-015_ ; bloqué par : T17
- [ ] T19 — Implémenter le sel tiré au hasard par ligne et l'empreinte
      `SHA-256(sel ‖ code normalisé)` — le code n'est jamais écrit (décision 14) ; critère
      d'acceptation : ce qui est promis est la **conservation**, non l'irréversibilité calculatoire —
      à 40 bits ce sont l'expiration et le brûlage qui opposent la recherche exhaustive
      _Requirements: FR-040, SC-015_ ; bloqué par : T18
- [ ] T20 — Écrire le test du cookie d'appareil et de l'absence de `Set-Cookie` : le `GET` du
      formulaire pose le cookie s'il manque et deux navigateurs repartent avec deux identifiants
      différents ; **aucune des deux réponses du `POST` d'adresse ne porte de `Set-Cookie`**, donc
      rien dont la présence ou la longueur dépende de l'adresse soumise
      _Requirements: FR-038_ ; bloqué par : T15, T17
- [ ] T21 — Implémenter l'étape « adresse » de `src/pages/admin/connexion.astro` et
      `src/admin/connexion/FormulaireAdresse.astro` — le `GET` pose le cookie d'appareil (décision 6),
      le `POST` éprouve l'adresse puis engendre et écrit, et passe à l'étape suivante par une
      redirection `303` vers `?etape=code`, si bien qu'un rafraîchissement ne réémet pas ; un `POST`
      sans cookie d'appareil renvoie au formulaire sans rien engendrer
      _Requirements: FR-003, FR-025, FR-029, FR-038_ ; bloqué par : T19, T20
- [ ] T22 — Ajouter au parcours les étapes **a** (semer l'adresse autorisée en base locale),
      **b-bis** (chacun des deux bocaux repart avec son cookie d'appareil, différent de l'autre),
      **c** (`POST` d'une adresse inconnue → la réponse, et aucun code engendré), **n** (base vidée
      de son adresse autorisée → aucun code, aucune session) et **o** (le code extrait ne figure
      nulle part dans ce que les trois tables ont conservé)
      _Requirements: FR-003, FR-029, FR-038, FR-040, SC-010, SC-015_ ; bloqué par : T21

## R5 — Le message portant le code part vers la seule adresse autorisée
_Livre : FR-001, FR-004, FR-036, FR-037 · SC-002_ · _vérif : TDD_ · _~160 lignes est._ ·
_3 concepts_ · dépend de : R4
Fichiers : `src/platform/auth/emission.ts`, `src/platform/auth/expediteur.ts`, `wrangler.jsonc`,
`src/admin/textes.ts`, `src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T23 — Écrire le test de la composition du message : texte seul sans mise en forme, objet
      identique d'une émission à l'autre et dont aucune partie ne provient de la saisie, destination
      = l'adresse autorisée et **aucune autre**
      _Requirements: FR-001, FR-004, FR-036, FR-037_ ; dépend de : —
- [ ] T24 — Implémenter `src/platform/auth/emission.ts` et `expediteur.ts` (adresse d'expédition
      dérivée d'`instance.json` par import, décision 10), et déclarer la liaison `ENVOI_CODE` dans
      `wrangler.jsonc` **sans `destination_address`** — la forme restreinte a été retirée par
      l'arbitrage du 2026-08-21 (décision 9) : le contrôle qui rend `I8` cherche les valeurs
      d'`instance.json` **en sous-chaîne** dans `wrangler.*`, si bien qu'une adresse hébergée sur le
      domaine de l'instance rendrait `ko I8`
      _Requirements: FR-001, FR-004, FR-025, FR-036, FR-037_ ; bloqué par : T23
- [ ] T25 — Brancher l'émission sur l'étape « adresse » et ajouter au parcours l'étape **f** (le
      message est en texte seul, son objet est celui du produit et ne porte rien de la saisie ; le
      code en est extrait pour la suite) ainsi que le volet « **aucun** message émis » de l'étape
      **c** _Requirements: FR-001, FR-004, FR-036, FR-037, SC-002_ ; bloqué par : T24

## R6 — Le code recopié sur l'appareil demandeur ouvre la session
_Livre : FR-011, FR-012, FR-013, FR-016, FR-017, FR-024, FR-030, FR-032 · SC-008_ · _vérif : TDD_ ·
_~340 lignes est._ · _5 concepts_ · dépend de : R5
Fichiers : `src/core/auth/code.ts`, `src/core/auth/verdict.ts`, `src/platform/auth/magasin.ts`,
`src/platform/session/index.ts`, `src/admin/connexion/FormulaireCode.astro`, `src/admin/textes.ts`,
`src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T26 — Écrire le test de la normalisation d'une saisie : casse indifférente, séparateurs
      ignorés, `O` → `0`, `I` et `L` → `1` — c'est le versant lecture de l'alphabet sans confusables
      _Requirements: FR-011_ ; dépend de : —
- [ ] T27 — Implémenter `normaliserSaisie` dans `src/core/auth/code.ts`
      _Requirements: FR-011_ ; bloqué par : T26
- [ ] T28 [P] — Écrire le test du verdict nominal et de la liaison à l'appareil : un code non
      expiré, retrouvé **par le cookie de demande**, première présentation → `ouvrir` ; le même code
      présenté sans ce cookie → `autre-appareil`, et l'écran invite à reprendre sur l'appareil
      demandeur _Requirements: FR-011, FR-012, FR-032_ ; dépend de : —
- [ ] T29 — Implémenter `src/core/auth/verdict.ts` — le code est retrouvé par le cookie d'appareil
      et par rien d'autre, ce qui rend `FR-012` vrai par construction plutôt que par une comparaison
      de plus (décision 6) _Requirements: FR-011, FR-012, FR-032_ ; bloqué par : T28
- [ ] T30 [P] — Écrire le test du brûlage à l'usage : un code qui a ouvert une session n'en ouvre
      pas une seconde _Requirements: FR-013_ ; dépend de : —
- [ ] T31 — Implémenter la consommation du code à l'ouverture de session
      _Requirements: FR-013_ ; bloqué par : T30
- [ ] T32 — Écrire le test de l'étape « code » : un code juste ouvre une session et renvoie vers
      l'accueil ; l'écran de saisie porte la mention que seul le dernier message reçu ouvre une
      session ; aucun champ de mot de passe, aucun lien de création de compte, aucun renvoi vers un
      autre compte sur tout le parcours
      _Requirements: FR-016, FR-017, FR-024, FR-030, SC-008_ ; bloqué par : T27, T29, T31
- [ ] T33 — Implémenter l'étape « code » de `src/pages/admin/connexion.astro`,
      `src/admin/connexion/FormulaireCode.astro` (dont le premier des trois textes de refus, celui
      qui invite à reprendre sur l'appareil demandeur) et l'appel à `ouvrirSession` — c'est cet
      appel qui rend honnête l'import du garde par cette route (`I6`, décision 1)
      _Requirements: FR-011, FR-016, FR-017, FR-024, FR-025, FR-030, FR-032, SC-008_ ;
      bloqué par : T32
- [ ] T34 — Ajouter au parcours les étapes **g** (présenter le code depuis le second bocal → refus,
      et le texte est celui qui invite à reprendre sur l'appareil demandeur) et **j** (présenter le
      bon code → `302` vers `/admin/`, cookie de session posé ; le **rejouer** → refus)
      _Requirements: FR-011, FR-012, FR-013, FR-032_ ; bloqué par : T33

## R7 — Un code refusé dit quoi faire
_Livre : FR-014, FR-015, FR-027, FR-028, FR-031 · SC-004, SC-009_ · _vérif : TDD_ ·
_~250 lignes est._ · _3 concepts_ · dépend de : R6
Fichiers : `src/core/auth/verdict.ts`, `src/core/auth/regles.ts`, `src/platform/auth/magasin.ts`,
`src/admin/textes.ts`, `src/admin/connexion/FormulaireCode.astro`, `scripts/verif-connexion.sh`

- [ ] T35 — Écrire le test des trois causes qui appellent le même geste, **à instant injecté** :
      présenté au-delà de quinze minutes, déjà utilisé, annulé par une demande ultérieure faite
      **depuis le même appareil** → `redemander`
      _Requirements: FR-014, FR-027, FR-031_ ; dépend de : —
- [ ] T36 — Implémenter l'expiration à quinze minutes (`src/core/auth/regles.ts`) et l'annulation,
      **à l'émission** d'un nouveau code, des codes encore utilisables portant le **même identifiant
      d'appareil** ; critère d'acceptation : un code demandé depuis un **autre** appareil n'est pas
      touché et continue d'y ouvrir une session
      _Requirements: FR-014, FR-027, FR-031_ ; bloqué par : T35
- [ ] T37 — Écrire le test du brûlage à la cinquième erreur : les quatre premières
      présentations erronées invitent à vérifier la saisie, la cinquième rend le code inutilisable
      pour toute présentation ultérieure _Requirements: FR-015, FR-028_ ; bloqué par : T36
- [ ] T38 — Implémenter le décompte des présentations restantes et le brûlage
      _Requirements: FR-015, FR-028_ ; bloqué par : T37
- [ ] T39 — Écrire le test du registre des refus : **cinq causes, trois réponses**, chaque cause
      rendant celle qui correspond au geste attendu, et **aucune** des quatre présentations
      fautives — rejeu, autre appareil, au-delà de quinze minutes, cinquième erreur — n'ouvrant de
      session _Requirements: SC-004, SC-009_ ; bloqué par : T36, T38
- [ ] T40 — Implémenter les deux textes de refus restants dans `src/admin/textes.ts` (vérifier la
      saisie ; demander un nouveau code) et leur rendu par `src/admin/connexion/FormulaireCode.astro`
      _Requirements: FR-025, FR-028, FR-031, SC-004, SC-009_ ; bloqué par : T39
- [ ] T41 — Ajouter au parcours les étapes **h** (un code faux présenté cinq fois : les quatre
      premiers invitent à retaper, le cinquième invite à demander un nouveau code et le code cesse
      d'être présentable) et **i** (redemander un code, puis présenter l'avant-dernier → refus,
      invitation à en demander un nouveau)
      _Requirements: FR-015, FR-027, FR-028, FR-031, SC-004_ ; bloqué par : T40

## R8 — La réponse de l'écran de connexion ne trahit rien par son délai
_Livre : FR-005, FR-006, FR-007, FR-033 · SC-003, SC-012_ · _vérif : TDD_ · _~220 lignes est._ ·
_4 concepts_ · dépend de : R7
Fichiers : `src/core/auth/regles.ts`, `src/pages/admin/connexion.astro`,
`scripts/verif-connexion.sh`

- [ ] T42 — Écrire le test de l'émission non attendue : la réponse est rendue sans attendre l'issue
      de l'émission, et une émission qui échoue rend la **même** réponse qu'une émission qui aboutit
      _Requirements: FR-006, FR-007_ ; dépend de : —
- [ ] T43 — Écrire le test de la réponse au contenu identique : l'adresse autorisée et une
      adresse inconnue rendent le **même corps** et les **mêmes champs d'en-tête** — c'est le
      périmètre que `FR-005` fixe, rien de plus, rien de moins
      _Requirements: FR-005_ ; bloqué par : T42
- [ ] T44 — Implémenter l'ordre imposé par les exigences : engendrer et **écrire le code en base**
      (attendu — sinon l'éditrice pourrait saisir un code que la base ignore encore), confier
      l'**émission** à `Astro.locals.cfContext.waitUntil`, attendre le solde du délai plancher,
      répondre — jamais un délai *supplémentaire* constant, dont le total varierait avec le travail
      _Requirements: FR-005, FR-006, FR-007, FR-033_ ; bloqué par : T42, T43
- [ ] T45 — Geler le délai plancher à **1 500 ms** dans `src/core/auth/regles.ts` ; critère
      d'acceptation : la valeur est **dérivée du budget de travail** de la décision 7 — trois
      allers-retours D1 à 25 ms plus un hachage, soit ~75 ms, et 20 × 75 = 1 500 — et elle est écrite
      **avant que quoi que ce soit ne la mesure**, aucune étape de vérification ne la réécrivant :
      une mesure qui règle le seuil qu'elle juge ne peut jamais échouer
      _Requirements: FR-033_ ; bloqué par : T44
- [ ] T46 — Ajouter au parcours les étapes **d** (le `POST` de l'adresse autorisée et celui d'une
      adresse inconnue rendent un corps identique octet pour octet et le même jeu de champs
      d'en-tête, `Date` excepté — assertion faisable parce qu'aucune des deux ne porte de
      `Set-Cookie`) et **e** (cent soumissions de chaque adresse : écart des 95ᵉ centiles ≤ 25 ms ;
      le travail le plus long observé est relevé et **consigné comme pièce**, et le plancher gelé
      doit valoir au moins vingt fois ce relevé) ; critère d'acceptation : l'étape **juge** la
      constante et ne la règle jamais — un rouge est un fait, et relever le plancher est une
      modification de source avec son commit
      _Requirements: FR-005, FR-033, SC-003, SC-012_ ; bloqué par : T45

## R9 — Le plafond d'envois protège la boîte de la cliente
_Livre : FR-008, FR-009, FR-010, FR-039 · SC-005, SC-013_ · _vérif : TDD_ · _~200 lignes est._ ·
_3 concepts_ · dépend de : R8
Fichiers : `src/core/auth/regles.ts`, `src/platform/auth/magasin.ts`,
`src/admin/connexion/FormulaireAdresse.astro`, `src/admin/textes.ts`,
`src/pages/admin/connexion.astro`, `scripts/verif-connexion.sh`

- [ ] T47 — Écrire le test du plafond **à instant injecté** : cinq messages déjà émis dans l'heure
      glissante n'en laissent émettre aucun de plus ; la fenêtre glisse et libère un envoi ; les
      lignes annulées comptent, l'exigence portant sur les **messages émis** et non sur les codes
      vivants _Requirements: FR-008, SC-005_ ; dépend de : —
- [ ] T48 — Implémenter le comptage sur `code_connexion` et l'épreuve du plafond **avant tout autre
      effet** : quand il est atteint la route ne touche à rien, donc n'annule aucun code, donc le
      dernier code émis ouvre encore une session **jusqu'à son expiration** sans qu'aucune ligne ne
      le prévoie (décision 8) _Requirements: FR-008, FR-010, SC-005_ ; bloqué par : T47
- [ ] T49 — Écrire le test de l'annonce et de son indiscernabilité : le plafond atteint est indiqué
      à qui soumet, **et** une adresse inconnue soumise sous plafond reçoit le même corps et les
      mêmes champs d'en-tête que l'adresse autorisée — sans quoi l'annonce serait le seul endroit du
      parcours qui désigne l'adresse autorisée
      _Requirements: FR-009, FR-039, SC-013_ ; bloqué par : T48
- [ ] T50 — Implémenter l'annonce (`?etape=plafond`) dans `src/admin/textes.ts` et
      `src/admin/connexion/FormulaireAdresse.astro` ; critère d'acceptation : le choix entre la
      réponse ordinaire et celle du plafond ne dépend que de l'état du plafond du déploiement,
      jamais de l'adresse soumise _Requirements: FR-009, FR-025, FR-039_ ; bloqué par : T49
- [ ] T51 — Ajouter au parcours l'étape **m** et son **second tir** : six soumissions d'affilée de
      l'adresse autorisée → cinq messages seulement, la sixième réponse annonce le plafond et le
      dernier code reçu ouvre encore une session ; puis, **le plafond toujours atteint**, une
      soumission d'une **adresse inconnue** → même corps et mêmes champs d'en-tête que la sixième
      _Requirements: FR-008, FR-009, FR-010, FR-039, SC-005, SC-013_ ; bloqué par : T50

## R10 — Vérification bout-en-bout
_Livre : FR-025, FR-026 · SC-001, SC-007_ · _vérif : **check** — l'absence de route et la conformité
du vocabulaire relèvent de la classe 12 de `docs/archi.md` (conformité sémantique, hors d'atteinte
d'un grep, donc d'un test), et `SC-001` est un test d'usage observé avec une personne_ ·
_~90 lignes est._ · _3 concepts_ · dépend de : R1, R2, R3, R4, R5, R6, R7, R8, R9
Fichiers : `scripts/verif-connexion.sh`

> **Ce lot ne rejoue pas les autres.** Chaque étape du parcours a été ajoutée par le lot dont elle
> prouve les exigences ; ne restent ici que les trois choses qui ne peuvent se faire qu'une fois
> tout écrit.

> **`FR-025` est transverse, et c'est dit plutôt que caché.** Ses textes naissent partout où du
> texte visible s'écrit — T6, T21, T24, T33, T40, T50 —, chacune de ces tâches portant le backref ;
> mais seule une relecture du **parcours entier** l'atteste, d'où sa vérification ici. C'est la seule
> exigence de la feature dont l'implémentation et la vérification ne tiennent pas dans un même lot,
> et l'y forcer voudrait dire soit relire six fois un texte incomplet, soit inventer un porteur
> unique que `src/admin/textes.ts` est déjà.

- [ ] T52 — Ajouter l'étape **4** : aucune source de `src/pages/` ni de `src/admin/` n'écrit dans
      `adresse_autorisee` — l'exigence est une **absence de route**, et elle ne s'atteste qu'une
      fois toutes les routes écrites ; critère d'acceptation : l'assertion échoue si on lui soumet
      une écriture injectée, et le script complet sort à `0` sur un dépôt propre
      _Requirements: FR-026_ ; dépend de : —
- [ ] T53 — Relire les textes visibles du parcours — écran de connexion, écran de saisie du code,
      écran d'accueil, message portant le code — et constater qu'aucun n'emploie de terme de
      développeur ; critère d'acceptation : la relecture porte sur `src/admin/textes.ts` et
      `src/platform/auth/emission.ts`, ses deux seuls porteurs, et son constat est consigné
      _Requirements: FR-025, SC-007_ ; bloqué par : T52
- [ ] T54 — Faire ouvrir l'administration par une personne qui n'a jamais vu le produit, à partir
      de la seule adresse autorisée ; critère d'acceptation : elle entre sans aide, sans mot de
      passe et sans créer de compte, et l'observation est consignée
      _Requirements: SC-001_ ; bloqué par : T52, T53

---

> **Contraintes de livraison, reprises du plan.** R1 touche `vitest.config.ts`, surveillé par
> `quality-config-guard` : sa PR doit porter le label `config-change`, ou le commit qui y touche un
> scope `chore(config):`. R1 touche aussi `package.json` et le lockfile (décision 15) : ce commit-là
> porte `build(deps):` ou `chore(deps):`, ou la PR le label `deps`. R3 touche `astro.config.ts`,
> surveillé lui aussi par `quality-config-guard` : même exigence de scope ou de label.

> Les cases seront cochées par le niveau implémentation, pas ici. Ce fichier part rempli et vierge.
