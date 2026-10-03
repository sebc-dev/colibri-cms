/**
 * Le chargement de la déclaration des réglages posée par l'intégrateur
 * (ADR-0017) — `content/reglages/reglages.json` et `mention.md`, versionnés
 * au dépôt, jamais écrits depuis l'administration. Empaquetés au build par
 * `import.meta.glob` (comme `pages.ts`). Zone `platform` : n'importe que
 * `core/` (I1).
 */
import { lireReglagesDeclares, type ReglagesDeclares } from '../../core/reglages/declaration.ts';

// Stryker disable all
const MODULES_REGLAGES_JSON = import.meta.glob('/content/reglages/reglages.json', {
  eager: true,
  import: 'default',
});

const MODULES_MENTION = import.meta.glob('/content/reglages/mention.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
// Stryker restore all

/** Le contenu de départ des trois réglages, tel que déclaré par l'intégrateur. */
export function lireReglagesDeLaDeclaration(): ReglagesDeclares {
  const mention = MODULES_MENTION['/content/reglages/mention.md'];
  return lireReglagesDeclares(
    MODULES_REGLAGES_JSON['/content/reglages/reglages.json'],
    typeof mention === 'string' ? mention : '',
  );
}
