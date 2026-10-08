# Run bloqué — ticket 07, composer les réseaux sociaux

Portée : 008-reglages-transverses · ticket 07
Ouvert le 2026-10-08 · branche `impl/composer-les-reseaux-sociaux-07` · HEAD `3d44363`

## Objectif
Faire aboutir le run du ticket 07 (mode `test`) jusqu'à la PR, après une correction humaine des
seuls tests neufs.

## Contexte à charger
à lire      `openspec/changes/008-reglages-transverses/tickets/07-composer-les-reseaux-sociaux.md` — le ticket
à lire      `openspec/changes/008-reglages-transverses/` — le change (proposal, specs, design)

## Acquis
- Le run `wf_67a7aa46-a85` s'est arrêté en `blocked-quality-fix`. Le code, les trois tests neufs et
  le § 25 du cahier de recette sont restés **non commités** dans l'arbre de la branche : rien n'est perdu.
- La quality gate a vu le check bloquant `analyse` en échec (7 erreurs). La correction a résorbé les
  deux de `src/core/reglages/reseaux.ts` (`String(i)`) ; les 5 restantes sont dans les tests neufs,
  qu'aucun agent n'a le droit de toucher. Sortie rejouée à la main après le run :

```
tests/integration/composer-reseaux.test.ts
  165:30  error  Using http protocol is insecure. Use https instead  sonarjs/no-clear-text-protocols
  198:38  error  Using http protocol is insecure. Use https instead  sonarjs/no-clear-text-protocols
tests/unit/reglages/reseaux.test.ts
   9:25  error  Invalid type "number" of template literal expression  @typescript-eslint/restrict-template-expressions
   9:58  error  Invalid type "number" of template literal expression  @typescript-eslint/restrict-template-expressions
  58:6   error  Using http protocol is insecure. Use https instead    sonarjs/no-clear-text-protocols
✖ 5 problems (5 errors, 0 warnings)
```

- Les `http://` sont la donnée d'épreuve du refus non-https (SC-07d, SC-07e) : les passer en https
  rendrait les tests tautologiques. Précédent : `eslint.config.analyse.js` éteint déjà la règle pour
  le seul `tests/integration/regler-lien-video.test.ts`, par fichier et avec son motif.
- Le check `dup` (advisory) a aussi relevé 4 clones entre la carte Coordonnées et la carte Réseaux :
  ça ne bloque pas.

## Prochaine étape
J'allais proposer à l'humain : `${i}` → `${String(i)}` ligne 9 du test unitaire, puis les deux
fichiers de test ajoutés à l'extinction `no-clear-text-protocols` d'`eslint.config.analyse.js`, sur
le modèle du précédent. Ensuite, reprise dans la session de lancement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.3727475.js",
         resumeFromRunId: "wf_67a7aa46-a85",
         args: { changeDir: "openspec/changes/008-reglages-transverses", ticket: "07",
                 oldBase: "impl/carte-coordonnees-06", rerun: "2" })
```

Hors de cette session, la reprise n'existe plus : commiter le travail et relancer
`/scd-spec-dev:run 008-reglages-transverses 07`.

## Écarté
- Empiler sur `impl/carte-coordonnees-06` : ses deux commits restants sont arrivés dans `main` à
  l'identique par la PR #181 (`git cherry` → `-`).
- Remplacer les `http://` des tests par `https://` : le refus testé ne serait plus éprouvé.

## Issue
Corrections faites le 2026-10-08 (`String(i)` ; extinction bornée, `c51e44f`), reprise avec
`rerun: "2"` : le run a abouti à la PR #182. J'ai ensuite ajouté le test du remplacement complet de
la liste, que la review avait retenu sans pouvoir l'écrire, et vérifié qu'il rougit quand l'upsert
devient `do nothing`.
