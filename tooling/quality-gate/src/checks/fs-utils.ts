/**
 * Utilitaires de parcours de fichiers partagés par les contrôles d'analyse
 * statique (boundaries, read-sql-in-apps, write-handler). Aucune I/O réseau,
 * lecture synchrone d'une arborescence locale uniquement.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** Répertoires jamais parcourus (bruit, pas de code source pertinent). */
const DOSSIERS_IGNORES = new Set(["node_modules", ".git", "dist", "build"]);

/**
 * Retourne la liste des fichiers `.ts`/`.tsx` sous `dir`, récursivement.
 * Tolère un dossier absent (retourne un tableau vide) : un contrôle peut
 * s'exécuter sur une arborescence qui ne contient pas le sous-dossier visé.
 */
export function listerFichiersSource(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const resultats: string[] = [];
  const pile: string[] = [dir];

  while (pile.length > 0) {
    const courant = pile.pop() as string;
    const entrees = readdirSync(courant, { withFileTypes: true });

    for (const entree of entrees) {
      if (DOSSIERS_IGNORES.has(entree.name)) {
        continue;
      }

      const chemin = path.join(courant, entree.name);

      if (entree.isDirectory()) {
        pile.push(chemin);
      } else if (entree.isFile() && /\.tsx?$/.test(entree.name)) {
        resultats.push(chemin);
      }
    }
  }

  return resultats;
}

/** Lit le contenu d'un fichier, ou une chaîne vide s'il n'existe pas (garde-fou). */
export function lireFichier(chemin: string): string {
  if (!existsSync(chemin) || !statSync(chemin).isFile()) {
    return "";
  }
  return readFileSync(chemin, "utf-8");
}
