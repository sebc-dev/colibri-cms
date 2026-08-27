/**
 * Déclaration ambiante minimale du module runtime `cloudflare:workers`.
 * `@cloudflare/workers-types` n'est pas une dépendance de ce lot (spec §
 * NON inclus) : un seul fichier ambiant type `env` pour tout le projet — un
 * second `declare module 'cloudflare:workers'` ailleurs entrerait en
 * conflit avec celui-ci (identifiant `env` redéclaré) plutôt que de le
 * compléter. `./sonde-dev.ts` (`env.DB.prepare(...).first(...)`) en fut le
 * premier lecteur (ticket 01) ; le ticket 03 (specs/001-connexion-par-code/
 * 03-code-vers-adresse-autorisee.md) y ajoute l'écriture D1
 * (`bind(...).run()`/`all()`, pour `src/platform/auth/magasin.ts`) et la
 * liaison d'expédition (`EXPEDITEUR_CODE_CONNEXION`, pour
 * `src/pages/admin/connexion.astro`) — sans rien emprunter d'ailleurs.
 *
 * Doit rester un fichier sans `import`/`export` de haut niveau : c'est ce
 * qui fait de ce `declare module` une *déclaration* du module (TypeScript
 * le traite comme un script global), et non une *augmentation* d'un module
 * déjà résolu — mesuré : la même déclaration, posée dans `sonde-dev.ts` qui
 * porte des imports, échoue en `TS2664`.
 */
declare module 'cloudflare:workers' {
  export const env: {
    DB: {
      exec(query: string): Promise<unknown>;
      prepare(query: string): {
        bind(...valeurs: unknown[]): {
          run(): Promise<unknown>;
          all<T = unknown>(): Promise<{ results: T[] }>;
          first<T = unknown>(column?: string): Promise<T | null>;
        };
        run(): Promise<unknown>;
        all<T = unknown>(): Promise<{ results: T[] }>;
        first<T = unknown>(column?: string): Promise<T | null>;
      };
    };
    // Liaison `send_email` (ADR-0002, wrangler.jsonc) : demande une
    // expédition, sans jamais attendre ni observer son aboutissement
    // (ticket 03 § Ce que ce ticket ne prouve pas) — d'où un message
    // volontairement non typé au-delà d'« un objet passé à `send` ».
    EXPEDITEUR_CODE_CONNEXION: {
      send(message: unknown): void | Promise<void>;
    };
  };
}
