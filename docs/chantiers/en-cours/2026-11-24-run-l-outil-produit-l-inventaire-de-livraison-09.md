# Run bloqué — l'outil de livraison produit l'inventaire de livraison

Portée : 020-deploiement-instance-client · ticket 09
Ouvert le 2026-11-24 · Actualisé le 2026-11-24 · branche `impl/l-outil-produit-l-inventaire-de-livraison-09` · HEAD `3c240ce`

## Objectif
Mener le ticket 09 jusqu'à sa PR : le run du 2026-11-24 s'est arrêté en `blocked-quality`, sur un
défaut de style dans le test statique neuf, que la quality gate n'avait pas le droit de corriger.

## Contexte à charger
à lire      `openspec/changes/020-deploiement-instance-client/tickets/09-l-outil-produit-l-inventaire-de-livraison.md` — le contrat du ticket
à lire      `openspec/changes/020-deploiement-instance-client/design.md` — le change que le ticket implémente

## Acquis
- Le run (mode `tdd`) avait écrit les deux tests, puis le code, puis passé la ceinture ; il s'est
  arrêté à la quality gate, avant la review, le commit et la PR. Rien n'était commité : le code et
  les tests étaient dans l'arbre de travail de la branche du ticket.
- Le seul check en échec était `analyse` (bloquant), localisé dans le test, non corrigeable par
  autofix ; les neuf autres checks passaient. Sortie d'erreur :
  `tests/static/inventaire-statique.test.ts 36:20 error Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically  sonarjs/no-alphabetical-sort`
- La ligne visée était le `return [...noms].sort();` de la fonction d'aide `nomsLus`, qui range les
  noms relevés dans les sources ; aucune assertion ni aucun cas n'y était en jeu.
- Empreintes des tests au moment du blocage, telles que rendues par le run :
  `tests/unit/inventaire-de-livraison.test.ts` `eef4781169fc50a9933bd54b441c17e78279d912361976bb484b37a663dc39cb`,
  `tests/static/inventaire-statique.test.ts` `faed262c78bdcbd6ccf13e75fc6d1799eaa6c8531071f99c141f207dc1d20db d`
  (la seconde portait une espace parasite avant son dernier caractère : empreinte mal recopiée par
  l'agent, à ne pas prendre pour une retouche du test).

## Prochaine étape
Faire remplacer par l'humain `.sort()` par `.sort((a, b) => a.localeCompare(b))` à la ligne 36 du
test statique, sans toucher à rien d'autre ; `git add tests/static/inventaire-statique.test.ts` ;
puis reprendre, dans la session qui a lancé le run seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.680317.js",
         resumeFromRunId: "wf_ae17f614-669",
         args: { changeDir: "openspec/changes/020-deploiement-instance-client", ticket: "09",
                 oldBase: "impl/l-outil-cree-la-base-dans-le-compte-du-fichier-d-instance-07",
                 rerun: "2" })
```

Après un `/clear`, cette reprise n'existait plus : il fallait commiter le travail en vol puis
relancer `/scd-spec-dev:run 020-deploiement-instance-client 09`, qui repartait du début.

## Écarté
- Reprise nue, sans jeton `rerun` — le cache aurait resservi le même échec à l'identique.
- `eslint-disable` sur la ligne — c'est un escape-hatch, que le filet CI annote.
