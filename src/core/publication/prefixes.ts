/**
 * Les préfixes que la publication a le droit d'écrire (I9, ADR-0025) —
 * seul porteur de la constante. Zone `core` (I2) : aucune dépendance.
 */

export type BrancheDepot = 'principale' | 'media';

export const PREFIXES_AUTORISES: Readonly<Record<BrancheDepot, readonly string[]>> = {
  principale: [
    'content/pages/',
    'content/reglages/',
    'content/formulaires/',
    'content/medias/',
    'content/publication.json',
  ],
  media: ['medias/'],
};

const FORME_IDENTIFIANT = /^[a-z0-9][a-z0-9-]*$/;

/** Un identifiant admis dans un chemin : minuscules, chiffres, tirets, jamais de tiret de tête. */
export function identifiantValide(identifiant: string): boolean {
  return FORME_IDENTIFIANT.test(identifiant);
}

/**
 * Le chemin appartient-il aux préfixes de la branche ? Refuse chemin vide ou
 * absolu, segment vide, `.` et `..`.
 */
export function cheminAutorise(chemin: string, branche: BrancheDepot = 'principale'): boolean {
  if (chemin === '' || chemin.startsWith('/')) return false;
  const segments = chemin.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  return PREFIXES_AUTORISES[branche].some((prefixe) =>
    prefixe.endsWith('/') ? chemin.startsWith(prefixe) : chemin === prefixe,
  );
}
