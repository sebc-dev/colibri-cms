/**
 * Le chargement de la déclaration des pages posée par l'intégrateur
 * (ADR-0012) — un `page.json` par répertoire sous `content/pages/`,
 * versionné au dépôt, jamais écrit depuis l'administration (ticket 02,
 * openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md).
 *
 * `import.meta.glob({ eager: true })` empaquette ce contenu au build (Vite) :
 * aucun accès disque au moment de la requête, indisponible en Worker
 * (`astro.config.ts` lit déjà `instance.json` selon le même principe, mais
 * au moment de la configuration plutôt que dans le graphe applicatif).
 *
 * Zone `platform` (docs/architecture.md, I1) : n'importe que `core/`, jamais
 * l'inverse — `src/core/pages/declaration.ts` ordonne et valide, ce fichier
 * ne fait que rassembler le contenu brut par page.
 */
import { trierPagesDeclarees, type PageDeclaree } from '../../core/pages/declaration.ts';

const MODULES_PAGE_JSON = import.meta.glob('/content/pages/*/page.json', {
  eager: true,
}) as Record<string, { default: unknown }>;

/**
 * Extrait le slug (nom du répertoire posé par l'intégrateur) depuis le
 * chemin résolu par `import.meta.glob` (`/content/pages/<slug>/page.json`).
 */
function slugDepuisChemin(chemin: string): string {
  const segments = chemin.split('/');
  return segments.at(-2) ?? chemin;
}

/** Les pages déclarées par l'intégrateur, dans l'ordre posé (SC-02a). */
export function listerPagesDeclarees(): PageDeclaree[] {
  const fichiers = Object.entries(MODULES_PAGE_JSON).map(([chemin, module]) => ({
    slug: slugDepuisChemin(chemin),
    contenu: module.default,
  }));
  return trierPagesDeclarees(fichiers);
}
