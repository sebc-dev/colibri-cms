# Run bloqué — 01 Créer le code de secours

Portée : 016-moyen-de-reprise · ticket 01
Ouvert le 2026-11-08 · branche `impl/creer-le-code-de-secours-01` · HEAD `eab79d7`

## Objectif
J'allais mener le ticket 01 au bout du workflow `implement-ticket` (mode `tdd`) jusqu'à la PR.

## Contexte à charger
à lire      `openspec/changes/016-moyen-de-reprise/tickets/01-creer-le-code-de-secours.md` — le contrat du ticket
à lire      `openspec/changes/016-moyen-de-reprise/` (proposal, design, specs/) — le change honoré

## Acquis
- Statut rendu : `blocked-red`, run `wf_7d48fc4f-db2`, copie du script
  `/home/negus/projets/colibri-cms/.git/implement-ticket.706123.js`.
- Le workflow s'est arrêté avant tout commit : le code et les deux tests sont restés non commités
  sur la branche (les tests indexés, les fichiers neufs de production non suivis).
- Sortie de l'implémenteur, non tronquée :
  « Tests 1 failed | 8 passed (9). Seul échec : SC-01g 'Test timed out in 5000ms'. Le générateur
  engendrerCodeDeSecours produit 32 000 codes en ~72 ms (mesuré à part) ; les ~8 s viennent des
  ~1,7 million d'appels expect() dans la boucle du test. typecheck : 0 erreur ; lint : propre. »
- Test suspect désigné : `tests/unit/code-de-secours.test.ts`, SC-01g — un `expect()` par signe et
  par code (32 000 × 26 × 2), au-delà du délai par défaut de 5 s alors que le code est correct.

- À la demande de l'humain, j'ai ajouté `30_000` en dernier argument du `it()` de SC-01g (seule
  retouche, assertions inchangées) ; les 9 tests sont passés en 9,1 s.

- La reprise `rerun: "2"` s'est arrêtée en `blocked-verify` : le code cassait deux tests existants
  (`gabarits-admin` : un `<style>` dans `NouveauCodeDeSecours.astro` ; `ecran-reglages` SC-04c : la
  balise `a` du lien hors de la liste permise). J'ai déplacé le style d'impression dans `admin.css`
  et ajouté `a` à la liste de SC-04c (commit `6374cb2`), puis relancé avec `rerun: "3"`.

## Prochaine étape
J'allais retoucher SC-01g en ajoutant un délai explicite en
dernier argument de `it()` (assertions inchangées), puis `git add` de la retouche, puis la reprise :
`Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.706123.js",
resumeFromRunId: "wf_7d48fc4f-db2", args: { changeDir: "openspec/changes/016-moyen-de-reprise",
ticket: "01", rerun: "2" })` — jouable dans la session qui a lancé le run seulement.

## Écarté
- Sortir les `expect()` de la boucle : cela change les assertions validées par `Validate` (en
  cache), donc imposerait une relance complète au lieu d'une reprise.
- Toucher au code de production : rien n'y est à corriger.
