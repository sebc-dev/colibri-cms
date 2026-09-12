/**
 * Le chargement de la déclaration des pages posée par l'intégrateur
 * (ADR-0012) — un `page.json` par répertoire sous `content/pages/`,
 * versionné au dépôt, jamais écrit depuis l'administration (ticket 02,
 * openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md ;
 * ticket 03, openspec/changes/003-remplir-emplacements/tickets/
 * 03-editeur-emplacements.md).
 *
 * `import.meta.glob({ eager: true })` empaquette ce contenu au build (Vite) :
 * aucun accès disque au moment de la requête, indisponible en Worker
 * (`astro.config.ts` lit déjà `instance.json` selon le même principe, mais
 * au moment de la configuration plutôt que dans le graphe applicatif). Le
 * contenu initial d'un emplacement de texte riche vit dans un `.md` du même
 * répertoire (`/content/pages/<slug>/<id-emplacement>.md`, ADR-0012 §
 * Décision) ; il est lu ici, en texte brut (`?raw`), au même titre que le
 * `page.json`.
 *
 * Zone `platform` (docs/architecture.md, I1) : n'importe que `core/`, jamais
 * l'inverse — `src/core/pages/declaration.ts` ordonne et valide, ce fichier
 * ne fait que rassembler le contenu brut par page.
 */
import {
  trierPagesDeclarees,
  construirePageAvecEmplacements,
  type PageDeclaree,
  type PageAvecEmplacements,
} from '../../core/pages/declaration.ts';

/**
 * Les `page.json` déclarés, indexés par chemin résolu. Une `Map` et non
 * l'objet rendu par `import.meta.glob` : `.get` dit qu'un slug inconnu ne
 * désigne aucun module, là où l'indexation d'un `Record` rend un type qui
 * ne l'avoue jamais.
 */
const MODULES_PAGE_JSON: ReadonlyMap<string, { default: unknown }> = new Map(
  Object.entries(
    import.meta.glob('/content/pages/*/page.json', {
      eager: true,
    }),
  ),
);

const MODULES_TEXTE_RICHE = import.meta.glob('/content/pages/*/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

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
  const fichiers = Array.from(MODULES_PAGE_JSON, ([chemin, module]) => ({
    slug: slugDepuisChemin(chemin),
    contenu: module.default,
  }));
  return trierPagesDeclarees(fichiers);
}

/**
 * Les `.md` d'emplacement de texte riche déclarés pour une page donnée,
 * indexés par identifiant d'emplacement (ticket 03).
 */
function contenusTexteRichePourSlug(slug: string): Map<string, string> {
  const prefixe = `/content/pages/${slug}/`;
  const carte = new Map<string, string>();
  for (const [chemin, contenu] of Object.entries(MODULES_TEXTE_RICHE)) {
    if (!chemin.startsWith(prefixe)) continue;
    const id = chemin.slice(prefixe.length).replace(/\.md$/, '');
    carte.set(id, contenu);
  }
  return carte;
}

/**
 * La page déclarée pour un slug donné, avec ses emplacements dans l'ordre
 * posé (ticket 03, SC-03b/SC-03c) — `null` si aucune page n'est déclarée
 * sous ce slug.
 */
export function obtenirPageAvecEmplacements(slug: string): PageAvecEmplacements | null {
  const module = MODULES_PAGE_JSON.get(`/content/pages/${slug}/page.json`);
  if (!module) return null;
  return construirePageAvecEmplacements(module.default, contenusTexteRichePourSlug(slug));
}
