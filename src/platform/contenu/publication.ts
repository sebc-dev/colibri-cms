/**
 * La marque de publication empaquetée par le site en service (change 011, ticket 18 ; ADR-0023) :
 * `content/publication.json`, déposé par chaque publication et lu ici par `import.meta.glob`.
 * Absente, le site n'est né d'aucune publication. Zone `platform` (I1).
 */

// Stryker disable all
const MODULES_PUBLICATION = import.meta.glob('/content/publication.json', {
  eager: true,
  import: 'default',
});
// Stryker restore all

/** La marque du site en service, ou `null` s'il n'est né d'aucune publication. */
export function lireMarqueDuSite(): string | null {
  const valeur = MODULES_PUBLICATION['/content/publication.json'] as { publication?: unknown } | undefined;
  return typeof valeur?.publication === 'string' ? valeur.publication : null;
}
