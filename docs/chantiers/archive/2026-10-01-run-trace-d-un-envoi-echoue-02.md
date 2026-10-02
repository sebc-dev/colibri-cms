# Run bloqué — ticket 02, trace d'un envoi échoué

Portée : 007-expediteur-code-connexion · ticket 02
Ouvert le 2026-10-01 · branche `impl/trace-d-un-envoi-echoue-02` · HEAD `f3ea071`

## Objectif
Mener le ticket 02 jusqu'à sa PR : un envoi du code de connexion qui échoue écrit une trace
`console.error` (sans le code ni l'adresse), un envoi qui aboutit n'en écrit aucune.

## Contexte à charger
à lire      `openspec/changes/007-expediteur-code-connexion/tickets/02-trace-d-un-envoi-echoue.md` — le contrat
à lire      `openspec/changes/007-expediteur-code-connexion/proposal.md` + `design.md` — le change

## Acquis
- Le run `wf_e25bb486-98b` s'est arrêté en `blocked-quality`, après la ceinture tdd et avant la
  review : le code et le fichier de test sont restés **non commités** sur la branche.
- Sorties des deux checks bloquants, non tronquées, toutes deux dans le test neuf
  `tests/integration/trace-envoi-echoue.test.ts` écrit par le test-writer :
  - `typecheck` : `tests/integration/trace-envoi-echoue.test.ts(97,29): error TS2345: Argument of type 'Uint8Array<ArrayBufferLike>' is not assignable to parameter of type 'ArrayBufferView<ArrayBuffer>'. Types of property 'buffer' are incompatible. Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'. Type 'SharedArrayBuffer' is missing the following properties from type 'ArrayBuffer': resizable, resize, detached, transfer, transferToFixedLength`
  - `analyse` : `147:71 and 170:71 error Unexpected empty arrow function @typescript-eslint/no-empty-function`
- Les agents `quality-typecheck` et `quality-analyse` ont proposé des corrections de forme, sans
  toucher à aucune assertion, qu'ils ont déclarées non applicables (aucun agent n'édite un test) :
  - l. ~93 : `(tableau: Uint8Array)` → `(tableau: Uint8Array<ArrayBuffer>)` dans
    `releverLesCodesEngendres` ;
  - l. 147 et 170 : `mockImplementation(() => {})` → `mockImplementation(() => undefined)`.
- `quality-analyse` a relevé que `no-empty-function` mord sur un idiome de test légitime (faire
  taire un espion) ; la portée de la règle sur `tests/**` est une question pour l'humain.

## Prochaine étape
J'allais faire trancher l'humain : appliquer à la main ces deux éditions de forme, puis reprendre
le run (`resumeFromRunId: wf_e25bb486-98b`) pour la review et la PR, comme pour le ticket 01.

## Écarté
- Laisser un agent du run corriger le test : le contrat l'interdit.
- `eslint-disable` / `@ts-expect-error` : escape-hatches.

## Issue
Le 2026-10-02, avec l'accord de l'humain, les trois lignes du test ont été corrigées à la main (`Uint8Array<ArrayBuffer>`, `() => undefined`). Une reprise nue a resservi l'échec depuis le cache du workflow (0 token, 37 ms) : défaut du plugin, corrigé en 0.17.0 par le jeton `rerun`. Le ticket a été terminé sur la copie 0.16.0, dont l'humain a modifié le prompt de la quality gate pour forcer son rejeu. Le run est allé jusqu'à la PR #156 (review : 0 appliqué, 9 rejetés) ; le test, oublié hors commit par le recorder, a été commité à part.
