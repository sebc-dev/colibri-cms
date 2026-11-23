# Run bloqué — l'outil de livraison crée la base dans le compte du fichier d'instance

Portée : 020-deploiement-instance-client · ticket 07
Ouvert le 2026-11-23 · Actualisé le 2026-11-23 · branche `impl/l-outil-cree-la-base-dans-le-compte-du-fichier-d-instance-07` · HEAD `cb4b563`

## Objectif
Mener le ticket 07 jusqu'à sa PR : le run du 2026-11-23 s'est arrêté en `blocked-quality`, sur un
défaut de style dans le test neuf, que la quality gate n'avait pas le droit de corriger.

## Contexte à charger
à lire      `openspec/changes/020-deploiement-instance-client/tickets/07-l-outil-cree-la-base-dans-le-compte-du-fichier-d-instance.md` — le contrat du ticket
à lire      `openspec/changes/020-deploiement-instance-client/design.md` — le change que le ticket implémente

## Acquis
- Le run (mode `tdd`) avait écrit le test, puis le code, puis passé la ceinture ; il s'est arrêté à
  la quality gate, avant la review, le commit et la PR. Rien n'était commité : le code et le test
  étaient dans l'arbre de travail de la branche du ticket.
- Le seul check en échec était `analyse` (bloquant), localisé dans le test, non corrigeable par
  autofix. Sortie d'erreur :
  `tests/unit/plateforme-de-livraison.test.ts 32:45 error Do not delete dynamically computed property keys @typescript-eslint/no-dynamic-delete`
- La ligne en cause était `for (const nom of retirer) delete contenu[nom];`, dans la fonction
  `instance()` qui fabrique le fichier d'instance du test.
- Empreinte du test au moment du blocage :
  `af21e7b9eada862fe12eb2bcf9640e5dc2a1ba633b563d290eff5b0ee82681bc`.

## Prochaine étape
Faire corriger la ligne 32 du test par l'humain, sans changer ni assertion ni cas, par exemple en
bâtissant l'objet par filtrage (`Object.fromEntries(Object.entries(contenu).filter(…))`) ;
`git add tests/unit/plateforme-de-livraison.test.ts` ; puis reprendre, dans la session qui a lancé
le run seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1010673.js",
         resumeFromRunId: "wf_5438bab2-f21",
         args: { changeDir: "openspec/changes/020-deploiement-instance-client", ticket: "07",
                 oldBase: "impl/le-controle-d-instance-refuse-un-fichier-d-instance-pas-pret-03",
                 rerun: "2" })
```

Après un `/clear`, cette reprise n'existait plus : il fallait commiter le travail en vol puis
relancer `/scd-spec-dev:run 020-deploiement-instance-client 07`, qui repartait du début.

## Écarté
- Reprise nue, sans jeton `rerun` — le cache aurait resservi le même échec à l'identique.
- `eslint-disable` sur la ligne — c'est un escape-hatch, que le filet CI annote.
