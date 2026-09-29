# Que fait vraiment `@cloudflare/vitest-pool-workers`, et sur quoi repose-t-il ? — relevé

*Mesure du 12 août 2026, sur le registre npm public et sur le paquet installé.
Instruit le deuxième des quatre faits de `S-10` de `docs/audit-stack.md` — la version `0.21.0` et
sa « capacité de liaisons réelles » citées par le candidat ADR n° 13 de `docs/stack.md`, absentes
de tout rapport de `docs/research/`.*
*Ce document est un **relevé de mesure**, pas une recherche : il établit une version, une capacité
et une chaîne de dépendances, il n'arbitre pas le choix de l'outil de test.*
*Trace brute rejouable — commandes et sortie intégrale :
`2026-08-12-vitest-pool-workers-liaisons.transcript.txt`.*

---

## TL;DR

**La version existe, la capacité est réelle, le mot qui la nomme est faux, et l'épingle est déjà
périmée.**

1. **`0.21.0` existe** — publiée le **2026-08-10 à 17:05:59 UTC**, 23 fichiers, 7 403 271 o
   dépaquetés. Mais elle est **déjà dépassée deux fois** : `0.21.1` le 11/08 à 19:27, `0.21.2` le
   **12/08 à 14:25**, c'est-à-dire le jour de ce relevé. **Trois versions en moins de 48 heures**,
   sur un paquet qui en compte 319 depuis mars 2024.
2. **La capacité est vérifiable dans le paquet livré**, sans passer par la documentation : il
   expose des aides **propres à D1 et aux Durable Objects** — `applyD1Migrations`,
   `readD1Migrations`, `runInDurableObject`, `runDurableObjectAlarm`, `listDurableObjectIds`,
   `evictDurableObject`, `evictAllDurableObjects`, `abortAllDurableObjects` — plus `SELF`,
   `createExecutionContext` et `waitOnExecutionContext`. Aucune de ces aides n'a de sens sans de
   véritables liaisons dans le moteur.
3. **« Liaisons réelles » nomme mal ce qui se passe.** Le README du paquet écrit : « Runs tests
   **fully-locally** using Miniflare ». Ce qui est réel, c'est le **moteur** — les tests
   s'exécutent dans `workerd`, l'exécutable qui fait tourner les Workers en production — et les
   **implémentations** de D1 et du stockage des Durable Objects, avec un stockage **isolé par
   test**. Ce qui n'est pas réel, c'est la **connexion** : rien ne part vers la base D1 d'un compte
   Cloudflare.
4. **« Réel » et « distant » sont deux réglages distincts du même outil.** Le pool expose une
   option `remoteBindings`, dont le défaut est **`true`** en `0.21.0` : elle autorise les liaisons
   *explicitement marquées distantes* dans la configuration à joindre de vraies ressources. Le
   document emploie donc le vocabulaire de l'un pour désigner l'autre.
5. **Ce que le paquet tire n'est pas mentionné par la stack** : **79 paquets**, **266,3 Mo** sur
   disque, `miniflare` épinglé à **`5.20260804.0-alpha`** — une version **alpha** —, `wrangler` à
   `4.120.1`, `workerd` à `1.20260804.1`, et un pair **`vitest ^4.1.0`** qui impose une version
   majeure.

**Rien de ceci ne conteste la décision.** La distinction que le candidat ADR n° 13 voulait poser —
contre « Vitest sous Node avec liaisons simulées », où l'oracle devient faux — reste entière : le
raisonnement est juste, c'est son étiquette qui ne l'est pas.

---

## Ce qui a été mesuré, et comment

**La version** est interrogée sur le registre `registry.npmjs.org` le 12/08/2026, sur le numéro
exact que la stack nomme, puis comparée à `latest` et à la chronologie des publications (`npm view
… time`). C'est cette chronologie, et non le seul numéro, qui établit le défaut.

**La capacité** est lue **dans le paquet installé** : les signatures de
`types/cloudflare-test.d.ts`, le schéma d'options du pool dans `dist/pool/index.d.mts`, et la
valeur par défaut de `remoteBindings` dans `dist/pool/index.mjs`. La documentation en ligne n'a
servi à rien ici ; le README joint au paquet est cité **verbatim** parce qu'il est, lui, versionné
avec le code.

**La chaîne de dépendances** est lue dans le `package.json` du paquet, puis **vérifiée sur l'arbre
réellement installé** — les deux peuvent diverger, et c'est l'arbre installé qui décide de ce qui
tourne.

---

## Les nombres

### Registre npm

| Grandeur | Valeur |
|---|---|
| `0.21.0` — publication | **2026-08-10T17:05:59Z** |
| `0.21.0` — `dist.unpackedSize` / `fileCount` | 7 403 271 o / 23 fichiers |
| `0.21.1` — publication | 2026-08-11T19:27:17Z |
| `0.21.2` — publication | **2026-08-12T14:25:39Z** (jour du relevé) |
| version courante au 12/08/2026 | **`0.21.2`** |
| versions publiées depuis le 2024-03-14 | **319** |

### Chaîne tirée par `0.21.0`

| | Version |
|---|---|
| `miniflare` (dépendance, épinglée) | **`5.20260804.0-alpha`** |
| `wrangler` (dépendance, épinglée) | `4.120.1` |
| `workerd` (installé transitivement) | `1.20260804.1` |
| `esbuild` / `zod` / `cjs-module-lexer` | `0.28.1` / `4.4.3` / `1.2.3` |
| pairs exigés | `vitest`, `@vitest/runner`, `@vitest/snapshot` — tous **`^4.1.0`** |
| paquets installés / poids sur disque | **79** / **266 265 268 o = 266,3 Mo** |

### Capacité — ce que le paquet expose

| Point vérifié | Constat |
|---|---|
| Aides Durable Objects | `runInDurableObject`, `runDurableObjectAlarm`, `listDurableObjectIds`, `evictDurableObject`, `evictAllDurableObjects`, `abortAllDurableObjects` |
| Aides D1 | `applyD1Migrations`, `readD1Migrations` |
| Aides de requête | `SELF`, `createExecutionContext`, `waitOnExecutionContext` |
| Où tournent les tests | dans `workerd` — README : « Provides direct access to Workers runtime APIs and bindings » |
| Local ou distant | **local** — README : « Runs tests **fully-locally** using Miniflare » |
| Isolation | README : « Implements isolated per-test storage » |
| Option `remoteBindings` | présente au schéma du pool, **défaut `true`** |

---

## Ce que ce relevé **ne** dit **pas**

- **Aucun test n'a été exécuté.** Le paquet a été installé et lu, pas mis en marche : ni suite de
  tests, ni liaison D1 réellement ouverte, ni Durable Object réellement instancié. Ce relevé
  établit ce que l'outil **expose et déclare**, pas ce qu'il fait à l'exécution.
- **Il ne compare rien.** L'alternative « Vitest sous Node avec liaisons simulées » n'a pas été
  mesurée ; l'argument de l'oracle faux qui l'écarte n'est ni confirmé ni infirmé ici.
- **Il ne dit rien de `remoteBindings` en usage.** Le défaut `true` autorise les liaisons marquées
  distantes ; aucune ne l'est par défaut, et le comportement d'un branchement distant réel n'a pas
  été observé.
- **Il vieillit à vue d'œil.** La version courante a changé **pendant** la mesure. Tout chiffre de
  ce document est daté du 12/08/2026 et se rejoue par le transcript joint.
