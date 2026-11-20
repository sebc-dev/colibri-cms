/**
 * Point d'entrée du Worker (change 020, ticket 10 ; ADR-0021) : réexporte le `fetch` d'Astro
 * et ajoute l'échéance hebdomadaire qui maintient la clé d'écriture du dépôt en vie.
 * Aucune route ajoutée : le site public reste statique.
 */
import { handle } from '@astrojs/cloudflare/handler';
import { maintenirLaCle } from './platform/publication/maintien-de-la-cle.ts';

interface EnvDuMaintien {
  JETON_DEPOT?: string;
}

export default {
  fetch: handle,
  scheduled(_evenement: unknown, env: EnvDuMaintien, contexte: { waitUntil(promesse: Promise<unknown>): void }): void {
    contexte.waitUntil(maintenirLaCle(__DEPOT_DE_PUBLICATION__, env.JETON_DEPOT));
  },
};
