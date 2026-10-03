/**
 * Le modèle de lecture de la déclaration des réglages transverses (ticket 02,
 * openspec/changes/008-reglages-transverses/tickets/
 * 02-lire-la-declaration-des-reglages.md ; ADR-0017 — `content/reglages/`,
 * posé à la main par l'intégrateur hors administration).
 *
 * Zone `core` (I1/I2) : fonction pure, sans base, HTTP ni framework. Le
 * chargement du contenu versionné vit dans `src/platform/contenu/reglages.ts`.
 *
 * Une entrée mal formée est écartée sans faire échouer les autres : la
 * première coordonnée d'un identifiant l'emporte, une nature inconnue ou un
 * identifiant absent l'écarte. Un nom absent ou fait d'espaces est lu sans
 * nom — jamais fabriqué depuis l'identifiant (FR-117).
 */

/** La nature d'une coordonnée, posée par l'intégrateur (ADR-0017). */
export type NatureCoordonnee = 'texte' | 'telephone' | 'email' | 'adresse';

const NATURES_VALIDES: readonly NatureCoordonnee[] = ['texte', 'telephone', 'email', 'adresse'];

/** Une coordonnée lue, avec sa valeur de départ. */
export interface CoordonneeDeclaree {
  readonly id: string;
  readonly nature: NatureCoordonnee;
  readonly nom?: string;
  readonly valeur: string;
}

/** Un réseau social lu : un nom et un lien. */
export interface ReseauDeclare {
  readonly nom: string;
  readonly lien: string;
}

/** Le contenu de départ des trois réglages. */
export interface ReglagesDeclares {
  readonly coordonnees: readonly CoordonneeDeclaree[];
  readonly reseaux: readonly ReseauDeclare[];
  readonly mention: string;
}

function estNatureValide(valeur: unknown): valeur is NatureCoordonnee {
  return typeof valeur === 'string' && (NATURES_VALIDES as readonly string[]).includes(valeur);
}

function normaliserNom(valeur: unknown): string | undefined {
  if (typeof valeur !== 'string') return undefined;
  const nom = valeur.trim();
  return nom.length > 0 ? nom : undefined;
}

function lireCoordonnees(brut: unknown): CoordonneeDeclaree[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const lues: CoordonneeDeclaree[] = [];
  for (const entree of brut as unknown[]) {
    if (typeof entree !== 'object' || entree === null) continue;
    const c = entree as Record<string, unknown>;
    if (typeof c.id !== 'string' || c.id.length === 0 || vus.has(c.id)) continue;
    if (!estNatureValide(c.nature) || typeof c.valeur !== 'string') continue;
    vus.add(c.id);
    const nom = normaliserNom(c.nom);
    lues.push({ id: c.id, nature: c.nature, ...(nom !== undefined ? { nom } : {}), valeur: c.valeur });
  }
  return lues;
}

function lireReseaux(brut: unknown): ReseauDeclare[] {
  if (!Array.isArray(brut)) return [];
  const lus: ReseauDeclare[] = [];
  for (const entree of brut as unknown[]) {
    if (typeof entree !== 'object' || entree === null) continue;
    const r = entree as Record<string, unknown>;
    if (typeof r.nom !== 'string' || typeof r.lien !== 'string') continue;
    lus.push({ nom: r.nom, lien: r.lien });
  }
  return lus;
}

/**
 * Lit le contenu brut de `reglages.json` et le texte de `mention.md` : rend
 * le contenu de départ des trois réglages. Ne lève jamais.
 */
export function lireReglagesDeclares(reglagesJson: unknown, mention: string): ReglagesDeclares {
  const racine =
    typeof reglagesJson === 'object' && reglagesJson !== null
      ? (reglagesJson as Record<string, unknown>)
      : {};
  return {
    coordonnees: lireCoordonnees(racine.coordonnees),
    reseaux: lireReseaux(racine.reseaux),
    mention,
  };
}
