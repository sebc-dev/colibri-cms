/**
 * Les règles pures du seuil par origine (ADR-0028, FR-007) : zone `core`
 * (I1/I2), aucun accès à une horloge ni à une base, l'instant est un paramètre.
 */

export type Surface = 'demande' | 'connexion';
export type Verdict = 'traitee' | 'refusee';

/** Sollicitations tolérées par heure et par origine, surface par surface. */
export const SEUIL_PAR_SURFACE: Readonly<Record<Surface, number>> = {
  demande: 5,
  connexion: 20,
};

/** Une fenêtre dure une heure d'horloge. */
export const DUREE_FENETRE_MS = 60 * 60 * 1000;

/** Début de l'heure d'horloge de l'instant. */
export function debutDeFenetre(instant: number): number {
  return instant - (((instant % DUREE_FENETRE_MS) + DUREE_FENETRE_MS) % DUREE_FENETRE_MS);
}

/** Vrai dès que l'instant sort de la fenêtre commencée à `debut`. */
export function fenetreEstEchue(debut: number, instant: number): boolean {
  return instant >= debut + DUREE_FENETRE_MS;
}

/** `rang` : rang de la sollicitation dans la fenêtre (1 pour la première). */
export function jugerSollicitation(surface: Surface, rang: number): Verdict {
  return rang <= SEUIL_PAR_SURFACE[surface] ? 'traitee' : 'refusee';
}
