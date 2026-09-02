# arch-invariants : apprendre l'exception ADR-0010 au tripwire unsafe-inline

Portée : socle
Ouvert le 2026-09-02 · Actualisé le 2026-09-02 · branche `main` · HEAD `ff7685f`

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

## Prochaine étape
Éditer `.github/scripts/arch-invariants.sh` (commit humain `chore(ci):`). Deux voies — j'allais
proposer la seconde :
1. exclure du grep la directive précise `style-src-attr 'unsafe-inline'` (ADR-0010) ;
2. plus robuste — restreindre le grep aux `.ts` de politique et n'admettre la forme apostrophée que
   dans le tableau `POLITIQUE_DE_SECURITE`, jamais en commentaire/test → l'exclusion redevient vraie.

## Écarté
- Retirer/affaiblir la directive du middleware — casserait C4 du ticket 02, contredirait ADR-0010.
- Éditer le script en session — refusé par le garde config-qualité, soupape humaine par scope.
- Se contenter du rouge — possible (ne bloque pas), mais laisse un tripwire bruité qui criera sur
  toute admin future.
