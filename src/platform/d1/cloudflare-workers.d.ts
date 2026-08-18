/**
 * Déclaration ambiante minimale du module runtime `cloudflare:workers`, pour
 * `./sonde-dev.ts` seul. `@cloudflare/workers-types` n'est pas une
 * dépendance de ce lot (spec § NON inclus) : ce fichier type le seul
 * binding et le seul geste dont la sonde a besoin
 * (`env.DB.prepare(...).first(...)`), sans rien emprunter d'ailleurs.
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
      prepare(query: string): {
        first<T = unknown>(column?: string): Promise<T | null>;
      };
    };
  };
}
