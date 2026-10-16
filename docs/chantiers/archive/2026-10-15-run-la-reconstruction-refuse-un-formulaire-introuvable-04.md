# Run du ticket 04 bloqué : un test du ticket 03 contredit la règle neuve

Portée : 012-envoi-des-demandes-de-devis · ticket 04
Ouvert le 2026-10-15 · branche `impl/la-reconstruction-refuse-un-formulaire-introuvable-04` · HEAD `a9869a3`

## Objectif
Faire aboutir le run du ticket 04 (`wf_cbdda30e-f8f`), arrêté en `blocked-red` après trois tentatives
de l'implémenteur, sans PR.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/04-la-reconstruction-refuse-un-formulaire-introuvable.md` — le ticket
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (proposal, design, delta `site-public`)

## Acquis
- Le workflow avait posé la branche, écrit les tests du ticket 04 (vus rouges), puis l'implémentation
  dans `src/core/rendu/page.ts` et `scripts/batir-site-jetable.mjs`. Ce travail était resté non
  commité dans l'arbre, tests neufs indexés.
- Le seul test rouge était celui du ticket 03, que le ticket 04 rend faux. Sortie, non tronquée :

```
 FAIL  tests/unit/rendu/composer-formulaire.test.ts > composerPage — un emplacement de formulaire > SC-03h — un libellé de champ ou d’option contenant <, >, & et guillemets reste du texte brut
FormulaireMalPoseError: Le formulaire « devis-gateau » posé par la page « contact » n'a aucun champ d'e-mail ou de téléphone obligatoire.
 ❯ composerFormulaire src/core/rendu/page.ts:317:25
 ❯ composerEmplacement src/core/rendu/page.ts:335:51
 ❯ composerPage src/core/rendu/page.ts:403:8
 ❯ tests/unit/rendu/composer-formulaire.test.ts:222:37
```

- J'ai jugé le test fautif, pas le code : son formulaire piégé n'a qu'un champ à choix, et SC-04b
  impose désormais d'en refuser un pareil. Ses assertions ne portent que sur l'échappement des
  libellés.

## Prochaine étape
Avec l'accord de l'humain : ajouter au formulaire du test SC-03h unitaire un champ e-mail
obligatoire, sans toucher aux assertions ; commiter ce seul fichier ; puis reprendre, dans la session
qui a lancé le run seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.04.js",
         resumeFromRunId: "wf_cbdda30e-f8f",
         args: { changeDir: "openspec/changes/012-envoi-des-demandes-de-devis", ticket: "04",
                 oldBase: "impl/la-page-publique-presente-le-formulaire-03", rerun: "2" })
```

Hors de cette session : commiter le travail en vol, puis relancer `/scd-spec-dev:run
012-envoi-des-demandes-de-devis 04`, qui rejoint la branche et repart du début.

## Écarté
- Assouplir la règle dans `page.ts` pour faire passer le test : ce serait trahir SC-04b.
- Laisser l'implémenteur retoucher le test : un test existant lui est interdit, à raison.

## Issue
Retouche faite le 2026-10-15, avec l'accord de l'humain, dans le test unitaire SC-03h du ticket 03 :
un champ `courriel` (e-mail, obligatoire) ajouté au formulaire piégé, aucune assertion changée
(commit `3c99c39`). Reprise avec `rerun: "2"` : le run a abouti, PR #251. Aucun finding retenu ; la
review a laissé en suspens que les tests ne fixent pas lequel des deux motifs d'échec sort
(`coverage-F-1`), et l'en-tête de `scripts/batir-site-jetable.mjs` resté en retard d'une construction.
