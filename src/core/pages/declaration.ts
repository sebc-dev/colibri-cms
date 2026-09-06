/**
 * Le modèle de lecture de la déclaration des pages (ticket 02,
 * openspec/changes/003-remplir-emplacements/tickets/02-liste-des-pages.md ;
 * ADR-0012 — la déclaration des pages et emplacements, un `page.json` par
 * page, posé par l'intégrateur hors administration).
 *
 * Zone `core` (docs/architecture.md, I1/I2) : zéro dépendance, ni framework
 * ni plateforme — ce fichier ne lit aucun fichier lui-même. Le chargement du
 * contenu versionné (`content/pages/`, empaqueté au build par Vite) vit dans
 * `src/platform/contenu/pages.ts`, qui appelle ce module avec le contenu déjà
 * lu (I1 : `platform → core`, jamais l'inverse). Fonctions pures,
 * instanciables sans D1 ni Worker (ARCH-5, ADR-0012 § Vérifiable).
 *
 * SC-02a : l'ordre rendu est celui du **rang** posé dans chaque `page.json`
 * — jamais un tri recalculé sur le slug ou le titre.
 */

/** La forme attendue d'un `page.json` — seuls les champs lus par ce ticket. */
export interface PageJson {
  readonly titre: string;
  readonly rang: number;
}

/** Une page déclarée, telle qu'affichée par l'`Écran : Liste des pages`. */
export interface PageDeclaree {
  readonly slug: string;
  readonly titre: string;
}

/** Un fichier `page.json` brut, avant validation de sa forme. */
export interface FichierDeclarationBrut {
  readonly slug: string;
  readonly contenu: unknown;
}

function estPageJsonValide(valeur: unknown): valeur is PageJson {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const candidat = valeur as Record<string, unknown>;
  return typeof candidat.titre === 'string' && typeof candidat.rang === 'number';
}

/**
 * Ordonne les pages déclarées selon le rang posé par l'intégrateur (SC-02a).
 * Une entrée dont le contenu ne correspond pas à la forme attendue est
 * ignorée plutôt que de faire échouer tout l'écran : une faute de forme de
 * l'intégrateur se constate à la lecture (ADR-0012 § Négatives), jamais en
 * panne pour l'éditrice. Un répertoire vide rend un tableau vide — l'état
 * vide de l'écran (SC-02b) en découle sans branche dédiée ici.
 */
export function trierPagesDeclarees(fichiers: readonly FichierDeclarationBrut[]): PageDeclaree[] {
  return fichiers
    .map((fichier) => ({ slug: fichier.slug, contenu: fichier.contenu }))
    .filter(
      (fichier): fichier is { slug: string; contenu: PageJson } => estPageJsonValide(fichier.contenu),
    )
    .sort((a, b) => a.contenu.rang - b.contenu.rang)
    .map((fichier) => ({ slug: fichier.slug, titre: fichier.contenu.titre }));
}
