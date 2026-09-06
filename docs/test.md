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
  isolé par test — les liaisons D1 et Durable Object rencontrées sont les implémentations réelles,
  servies **localement** par Miniflare (« réel » n'est pas « distant » : rien ne part vers un compte
  Cloudflare).
- **Playwright** pour les parcours de bout en bout.
- **Épreuve de réversibilité scriptée** — SC-011 réclame une **pièce datée** : un script rejouable,
  pas un constat manuel.

## Pyramide

| Étage | Emplacement | Ce qu'il exerce |
|---|---|---|
| Intégration | `tests/integration/**` | la logique contre les liaisons réelles dans `workerd` (D1, Durable Object) |
| Statique | `tests/static/**` | ce qui se vérifie sans requête — invariants, calculs `core/`, formes de sortie |
| Parcours | Playwright | les gestes de l'éditrice et de la visiteuse, écran par écran |
| Réversibilité | script dédié | la reconstruction du site depuis les seuls fichiers déposés (SC-011) |

La testabilité **sans plateforme** est un invariant de structure (`C5` / `I2` — voir
[`docs/architecture.md`](./architecture.md)) : la logique métier de `src/core/` s'instancie et se
vérifie sans base, sans HTTP, sans Worker. C'est ce qui rend l'étage statique rapide et l'étage
intégration ciblé.

## Commandes

- `npm test` — `vitest run --passWithNoTests`. Le `--passWithNoTests` est un garde-fou : quand des
  tests existent, le vert atteste bien que les assertions ont tourné.
- `npm run coverage` — produit `coverage/lcov.info`. **Informatif**, jamais bloquant : la couverture
  mesure l'**exécution**, jamais l'**assertion**. Un seuil, quand il viendra, portera sur le **code
  nouveau**, jamais sur une couverture globale.

## Definition of Done

Une tâche n'est « done » que si :

- [ ] `npm run typecheck` **puis** `npm run build` passent (le build seul ne type pas) ;
- [ ] `npm test` passe ;
- [ ] les critères observables du ticket (`SC-<NN><lettre>`) sont couverts selon le mode de vérif du
      ticket — `tdd` / `test` (un critère = un test nommé), `observé` (preuve capturée), `aucun` (spike) ;
- [ ] rien hors périmètre de la tâche n'a été modifié ;
- [ ] la **preuve** est fournie (sortie de commande réelle), pas seulement « ça a l'air fait ».
