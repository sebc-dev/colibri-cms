# ColibriCMS — Tests

Le cap durable de la vérification : quel **oracle** décide si un test dit vrai, comment la pyramide
est disposée, et ce qu'une tâche doit tenir pour être « done ». Le *pourquoi* du choix d'oracle est
figé dans [ADR-0003](./adr/0003-tests-vitest-dans-workerd.md).

## L'oracle — pourquoi `workerd`, pas Node

Le produit ne s'exécute pas dans Node : il s'exécute dans **`workerd`**, contre D1 et le stockage
d'un Durable Object. Un test qui ne rencontre jamais ces implémentations n'atteste de rien de ce qui
sera déployé. La question n'est pas *quel outil de test* mais **quel oracle** — et l'oracle retenu
est celui du produit.

- **Vitest exécuté dans `workerd`** via **`@cloudflare/vitest-pool-workers`**, avec un stockage
  partagé entre les tests d'un même fichier (aucune isolation par test : les tables persistent d'un
  `it()` à l'autre, d'où les nettoyages explicites) — les liaisons D1 et Durable Object rencontrées
  sont les implémentations réelles,
  servies **localement** par Miniflare (« réel » n'est pas « distant » : rien ne part vers un compte
  Cloudflare).
- **Playwright** pour les parcours de bout en bout — **à venir** : aucune dépendance ni script à ce
  jour.
- **Épreuve de réversibilité scriptée** — SC-011 réclame une **pièce datée** : un script rejouable,
  pas un constat manuel. **À venir** également : `scripts/` n'en porte aucun.

## Pyramide

| Étage | Emplacement | Ce qu'il exerce |
|---|---|---|
| Intégration | `tests/integration/**` | la logique contre les liaisons réelles dans `workerd` (D1, Durable Object) |
| Statique | `tests/static/**` | ce qui se vérifie sans requête — invariants, calculs `core/`, formes de sortie |
| Amorçage | `tests/setup/**` | pas un étage : ce que Vitest exécute avant chaque fichier de test (`setupFiles`) |
| Parcours | Playwright — **à venir** | les gestes de l'éditrice et de la visiteuse, écran par écran |
| Réversibilité | script dédié — **à venir** | la reconstruction du site depuis les seuls fichiers déposés (SC-011) |

La testabilité **sans plateforme** est un invariant de structure (`C5` / `I2` — voir
[`docs/architecture.md`](./architecture.md)) : la logique métier de `src/core/` s'instancie et se
vérifie sans base, sans HTTP, sans Worker. C'est ce qui rend l'étage statique rapide et l'étage
intégration ciblé.

## Commandes

- `npm test` — `vitest run --passWithNoTests`. Le `--passWithNoTests` est un garde-fou : quand des
  tests existent, le vert atteste bien que les assertions ont tourné. La commande déclenche d'abord
  `pretest` → `npm run build` (qui bâtit le worker de test) : **un échec de build ressort comme un
  échec de test** — voir [`docs/ci.md`](./ci.md).
- `npx vitest run tests/integration/<fichier>.test.ts` — **un seul fichier**, sans rejouer le build ;
  exige donc que le worker de test soit déjà bâti (un `npm run build`, ou un `npm test`, au moins une
  fois). Sans lui, l'exécution échoue avant toute assertion : `Cannot find module
  '…/.wrangler/test-worker/server/entry.mjs'`.
- `npm run coverage` — produit `coverage/lcov.info` (fournisseur `istanbul`). **Informatif**, jamais
  bloquant : la couverture mesure l'**exécution**, jamais l'**assertion**. Un seuil, quand il
  viendra, portera sur le **code nouveau**, jamais sur une couverture globale.

## Nommage

Le nom du test porte l'identifiant du critère du ticket :

```ts
it('SC-02a — la liste des pages affiche les pages déclarées dans l’ordre posé', async () => { /* … */ });
```

**Un critère, un test.** L'identifiant vient du ticket
(`openspec/changes/<change>/tickets/NN-*.md`, § Critères) et ne change plus : c'est lui qui relie le
vert à l'exigence, sans lecture d'un tableau de correspondance.

Les tests écrits sous le système précédent — les `tests/integration/*.test.ts` et
`tests/static/*.test.ts` existants — précèdent cette convention et **ne sont pas à renommer**.

## Écrire un test d'intégration

- **Ouvrir par la directive de types.** `tsconfig.json` étend `astro/tsconfigs/strict` et ne déclare
  aucune clé `types` : chaque fichier qui touche `cloudflare:test` commence donc par
  `/// <reference types="@cloudflare/vitest-pool-workers/types" />`, juste avant ses imports (patron
  tenu par les huit fichiers de `tests/integration/`).
- **Passer par le produit.** `import { SELF, env } from 'cloudflare:test'` : `SELF.fetch(...)` lance
  une requête HTTP réelle contre le worker tel qu'il tournerait déployé, `env` donne les liaisons de
  la plateforme (`env.DB` pour D1). Le worker visé est celui que `wrangler.jsonc` désigne en `main` —
  d'où la précondition de build ci-dessus.
- **Appliquer une migration depuis le test.** Aucune migration n'est jouée d'office : le fichier
  `migrations/*.sql` est importé en texte (`?raw`), découpé en requêtes, puis exécuté sur `env.DB`.
  Patron de référence :
  [`tests/integration/code-vers-adresse-autorisee.test.ts:110-124`](../tests/integration/code-vers-adresse-autorisee.test.ts)
  — une promesse mémoïsée (`assurerSchema()`) appelée depuis l'*Arrange* de chaque test qui en a
  besoin, **pas** depuis un `beforeAll` : un `beforeAll` en échec transforme tout le fichier en
  « skipped » au lieu d'échecs lisibles. Le nettoyage entre tests se fait par `afterEach` (`delete
  from …`) : mesuré sur ces fichiers, les tables **persistent d'un `it()` à l'autre** au sein d'un
  même fichier — le stockage n'est pas remis à neuf test par test par défaut.
- **Le fichier d'amorçage.** `vitest.config.ts` déclare
  `setupFiles: ['./tests/setup/ignorer-rejet-wasm-lexer.ts']` : il neutralise le **seul** rejet non
  géré bénin du bundle SSR (`es-module-lexer` tente un `WebAssembly.compile` que `workerd` refuse),
  et lui seul — tout autre rejet non géré reste un échec visible. C'est ce ciblage qui a permis de
  retirer le drapeau global `--dangerouslyIgnoreUnhandledErrors`.

## Definition of Done

Une tâche n'est « done » que si :

- [ ] `npm run typecheck` **puis** `npm run build` passent (le build seul ne type pas) ;
- [ ] `npm test` passe ;
- [ ] les critères observables du ticket (`SC-<NN><lettre>`) sont couverts selon le mode de vérif du
      ticket — `tdd` / `test` (un critère = un test nommé), `observé` (preuve capturée), `aucun` (spike) ;
- [ ] rien hors périmètre de la tâche n'a été modifié ;
- [ ] la **preuve** est fournie (sortie de commande réelle), pas seulement « ça a l'air fait ».
