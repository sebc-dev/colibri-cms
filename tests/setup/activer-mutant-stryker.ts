// Fait entrer le mutant actif de Stryker dans l'isolat workerd.
//
// Stryker (testRunner `command`) pose `__STRYKER_ACTIVE_MUTANT__` dans
// l'environnement du processus qui lance `npm test`. Nos tests ne tournent pas
// dans ce processus : ils tournent dans workerd, dont l'environnement est monté
// par le pool depuis `wrangler.jsonc` et n'hérite jamais de l'hôte. Sans pont,
// AUCUN mutant ne s'active et le score ne mesure rien (docs/ci.md, ADR-0013).
//
// Le pont est `define` (`vitest.config.ts`) : la valeur est lue côté Node au
// démarrage de vitest et substituée littéralement ici, dans un module que le
// pool exécute à l'intérieur de l'isolat. Deux dépôts, car l'ordre de
// chargement du worker bâti n'est pas garanti :
//   - `process.env`, que le préambule instrumenté lit au PREMIER chargement
//     d'un module muté (l'objet existe : le bundle Astro pose lui-même
//     `globalThis.process.env ??= {}` en tête de `entry.mjs`) ;
//   - `__stryker__.activeMutant`, relu à CHAQUE test de mutant, qui couvre le
//     cas où le module muté s'est chargé avant ce fichier.
// Le worker bâti et les tests partagent le même `globalThis` — c'est déjà ce
// dont dépend `ignorer-rejet-wasm-lexer.ts`, qui patche `WebAssembly.compile`
// pour le compte du bundle SSR.
//
// Hors rejeu de mutation, la valeur est `null` et ce fichier ne fait rien.
declare const __MUTANT_ACTIF_HOTE__: string | null;

const mutantActif = __MUTANT_ACTIF_HOTE__;

// L'isolat décrit par ce qu'il porte RÉELLEMENT : les libs typent `process`
// comme le `Process` complet de Node, alors que le bundle n'en fournit que
// `{ env: {} }` — d'où la description locale plutôt qu'un typage global faux.
interface IsolatInstrumente {
  process?: { env?: Record<string, string> };
  __stryker__?: { activeMutant?: string };
}

if (mutantActif !== null) {
  const isolat = globalThis as unknown as IsolatInstrumente;

  const processus = (isolat.process ??= {});
  const environnement = (processus.env ??= {});
  environnement.__STRYKER_ACTIVE_MUTANT__ = mutantActif;

  const espaceStryker = (isolat.__stryker__ ??= {});
  espaceStryker.activeMutant = mutantActif;
}
