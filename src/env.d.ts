/// <reference types="astro/client" />

/** Adresse d'expéditeur de l'instance, injectée au build par astro.config.ts (I10). */
declare const __ADRESSE_EXPEDITEUR__: string;

/** Un composant `.astro` importé depuis un module `.ts` (baril `src/render/index.ts`, I3). */
declare module '*.astro' {
  const composant: (props: Record<string, unknown>) => unknown;
  export default composant;
}
