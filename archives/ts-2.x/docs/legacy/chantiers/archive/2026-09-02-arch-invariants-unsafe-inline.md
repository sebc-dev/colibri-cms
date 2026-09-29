# arch-invariants : apprendre l'exception ADR-0010 au tripwire unsafe-inline

Portée : socle
Ouvert le 2026-09-02 · Actualisé le 2026-09-03 · branche `main` · HEAD `e5b7c43`

## Objectif
Faire passer le contrôle `arch-invariants` (informatif) au vert — sur PR #49 et toute admin
future — en apprenant au tripwire CSP l'exception `style-src-attr 'unsafe-inline'` autorisée par
ADR-0010, sans toucher au code de la politique, qui est correct.

## Contexte à charger
à extraire  `.github/scripts/arch-invariants.sh` › L232-L250 — le grep unsafe-inline à corriger (277 l.)
à lire      `src/platform/entetes/middleware.ts` — politique CSP réelle, directive relâchée L59 (83 l.)
à situer    `docs/adr/0010-csp-admin-styles-inline-style-src-attr.md` — autorise la directive ; conclusion dans Acquis
à situer    ADR-0015 / ADR-0024 (`docs/1.x/adr/`, hérités) — interdisent tout unsafe-inline dans les sources
à situer    PR #49 — la PR où le rouge apparaît, ne pas relire

## Acquis
- Le rouge n'est PAS un défaut d'impl. `style-src-attr 'unsafe-inline'` (middleware.ts:59) est
  correct/minimal/sûr : `script-src` reste strict ; `<style>`/`<link>` sous `style-src 'self'`
  inchangés ; nonce/hash inapplicables à un attribut dynamique ; exfiltration CSS fermée par
  `default-src 'none'` + `img-src 'self'`. Vérifié en lisant le middleware.
- Le tripwire (L242-247) grep toute forme apostrophée `'unsafe-inline'` dans les sources : il matche
  la vraie directive (middleware.ts:59) ET 5 échos non-relâchants — commentaires (tooltip-content
  .svelte:8, ActionRapide.svelte:10, ilots.astro:25, middleware.ts:41) + test (politique-de
  -securite.test.ts:119-120). Son exclusion « backticks/regex » (L238-241) échoue car ces échos
  écrivent la forme apostrophée.
- `.github/scripts/**` = config-qualité : édition refusée en session (garde), exige un commit humain
  `chore(ci):` (ou label `config-change`).
- `arch-invariants` informatif/non-requis : PR #49 MERGEABLE (UNSTABLE), ne bloque pas le merge. Le
  vrai bloquant `dependency-review` est déjà réglé (label `deps`).

## Prochaine étape — correctif TESTÉ (2026-09-03), commit humain `chore(ci):`
Reproduction complète du script en scratchpad : **ADR-0024 est la SEULE violation** (fail=1
n'en vient que d'elle ; ADR-0006 est OK, le reste OK/AILLEURS/HORS). Le corriger verdit tout
le job (reproduction : fail=0). Remplacer le bloc `arch-invariants.sh:242-250` par **deux
règles** — validées sur 5 cas (arbre réel vert ; violation code double-quote signalée ;
violation `_headers` token nu signalée ; sanctionnée seule ignorée ; sanctionnée+violation sur
une ligne → la partie relâchée survit) :
```
# Règle A — sources : la directive réelle est une chaîne en guillemets doubles ;
# on retire l'exception ADR-0010 exacte, ce qui reste est une violation.
code=$(files "${SRC_EXT[@]}" \
       | xargs -r grep -nE "\"[^\"]*'unsafe-(inline|eval)'[^\"]*\"" 2>/dev/null \
       | sed -E "s/\"style-src-attr 'unsafe-inline'\"//g" \
       | grep -E "'unsafe-(inline|eval)'") || true
# Règle B — public/_headers : CSP brute, tokens nus, aucune exception.
headers=$(files 'public/_headers' | xargs -r grep -nE "'unsafe-inline'|'unsafe-eval'" 2>/dev/null) || true
[ -n "$code$headers" ] && ko ADR-0024 "..." "${code}"$'\n'"${headers}" || ok "ADR-0024"
```
Pourquoi robuste : backticks (commentaires, même enroulés comme `ilots.astro:25`) et regex
(test:120) ne sont pas en guillemets doubles → ignorés sans les énumérer.

## Écarté
- Retirer/affaiblir la directive du middleware — casserait C4 du ticket 02, contredirait ADR-0010.
- Éditer le script en session — refusé par le garde config-qualité, soupape humaine par scope.
- Se contenter du rouge — possible (ne bloque pas), mais laisse un tripwire bruité qui criera sur
  toute admin future.

## Issue
Résolu, commit humain `5af9fa4` (`chore(ci):`) sur `main` (2026-09-03). Bloc ADR-0024 remplacé par
les deux règles ci-dessus. Vérifié par reproduction complète du script : ADR-0024 était la SEULE
violation → `fail=0`, job arch-invariants au vert.
