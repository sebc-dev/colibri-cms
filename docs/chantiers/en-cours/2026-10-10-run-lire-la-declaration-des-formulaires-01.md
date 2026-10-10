# Run bloqué — ticket 01, lire la déclaration des formulaires

Portée : 010-reglage-des-formulaires · ticket 01
Ouvert le 2026-10-10 · branche `impl/lire-la-declaration-des-formulaires-01` · HEAD `b4de63c`

## Objectif
Faire aboutir le run du ticket 01 (mode `tdd`) jusqu'à la PR, une fois levé un défaut de lint
antérieur au ticket et étranger à son diff.

## Contexte à charger
à lire      `openspec/changes/010-reglage-des-formulaires/tickets/01-lire-la-declaration-des-formulaires.md` — le ticket
à lire      `openspec/changes/010-reglage-des-formulaires/` — le change (proposal, specs, design)

## Acquis
- Le run `wf_426c20d8-20c` s'est arrêté en `blocked-quality`. Le code, le test neuf, les deux
  `formulaire.json` et les retouches des `.c4` sont restés **non commités** dans l'arbre de la
  branche : rien n'est perdu.
- Le check bloquant `lint` (`npm run lint` = `eslint .`) est tombé sur le seul
  `.claude/scripts/scd-arch-conformance.mjs`, script copié par le plugin (commit `8a95c17`, le
  2026-10-09), identique à `main` : le défaut était déjà sur `main`, le ticket n'y est pour rien.
  Sortie rejouée à la main après le run, sur ce seul fichier :

```
/home/negus/projets/colibri-cms/.claude/scripts/scd-arch-conformance.mjs
   72:7   error  'process' is not defined                                     no-undef
   73:7   error  'process' is not defined                                     no-undef
   89:3   error  'process' is not defined                                     no-undef
   90:3   error  'process' is not defined                                     no-undef
   97:14  error  'process' is not defined                                     no-undef
  176:66  error  Unexpected control character(s) in regular expression: \x1b  no-control-regex
  468:26  error  'process' is not defined                                     no-undef
  528:3   error  'process' is not defined                                     no-undef
  529:3   error  'process' is not defined                                     no-undef

✖ 9 problems (9 errors, 0 warnings)
```

- Le check `knip` (advisory) a signalé deux fichiers inutilisés : ce même script, et
  `src/platform/contenu/formulaires.ts`, que les tickets suivants importeront.

## Prochaine étape
J'allais faire ignorer `.claude/scripts/**` par `eslint.config.js` (comme `.claude/skills/**`), dans
une PR directe vers `main`, puis reporter ce commit sur la branche du ticket (commit séparé, arbre
propre hors travail du ticket) et reprendre — même session seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.904704.js",
         resumeFromRunId: "wf_426c20d8-20c",
         args: { changeDir: "openspec/changes/010-reglage-des-formulaires", ticket: "01", rerun: "2" })
```

Hors de cette session : commiter la correction, puis relancer `/scd-spec-dev:run 01` (le run repart
du début, écriture des tests comprise).

## Écarté
- Corriger le script lui-même : il appartient au plugin, `/scd-spec-dev:setup` le récrirait.
- Reprendre sans corriger : le cache resservirait le même échec.
- Corriger la config sur la seule branche du ticket : hors périmètre du ticket, et le défaut
  bloquerait encore tous les tickets suivants.
