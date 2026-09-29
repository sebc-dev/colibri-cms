# Durcir le garde boundaries en fail-closed (`no-unknown`)

Portée : socle
Ouvert le 2026-09-02 · Actualisé le 2026-09-02 · branche `impl/socle-ilots-admin-03` · HEAD `d7ebf37`

## Objectif
Fermer le mode de défaillance *ouvert* du contrôle `boundaries` (`eslint.config.boundaries.js`) : un
import qu'un resolver n'arrive pas à résoudre n'est aujourd'hui ni classé ni flagué — l'arête passe
en silence. Ajouter un filet fail-closed pour que l'invariant I1 (ADR-0009/ADR-0021) reste falsifiable
même si un futur style d'import change.

## Contexte à charger
à lire  `eslint.config.boundaries.js` — const `RULES` (la matrice I1) et le bloc `import/resolver`
à situer `docs/adr/0009-base-de-composants-des-ilots-shadcn-svelte.md` — la frontière que le garde matérialise

## Acquis
- Révélé par la review 6-dimensions du ticket 002-03 (error-handling-F1), écarté au triage comme
  hors contrat du ticket — donc non traité, mais réel.
- `boundaries/dependencies` (default: `disallow`) ne juge QUE les imports **résolus ET classés** :
  un import non résolu (alias `$lib`/`@`, extension non mappée, `paths` tsconfig ne couvrant pas
  `.svelte`/`.astro`) est traité comme externe et laissé passer sans erreur.
- Piste concrète : ajouter `'boundaries/no-unknown': ['error']` dans `RULES` (fait échouer un import
  résolu vers un fichier hors des cinq zones). NE PAS ajouter `no-unknown-files` (bruit sur les
  fichiers hors zones).
- `boundaries` est **informatif** aujourd'hui (non-bloquant CI) — le gain est différé tant que le
  job ne bloque pas.

## Prochaine étape
En faire un ticket (ou un ADR si on tranche la politique fail-open/fail-closed du garde). L'édition
d'`eslint.config.boundaries.js` reste un geste humain (`chore(config):`). Vérif observée : un import
d'îlot au style non résolu doit désormais échouer bruyamment au lieu de passer vert.

## Écarté
- Le faire dans la PR #50 (ticket 03) — hors périmètre du ticket, dont le contrat est le seul scan
  `.svelte`/`.astro`, pas la politique de défaillance du garde.
- `boundaries/no-unknown-files` — génère du bruit sur tout fichier hors des cinq zones (ex. `src/pages`).
