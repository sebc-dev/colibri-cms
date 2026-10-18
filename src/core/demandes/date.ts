/**
 * Date et heure de réception d'une demande, à l'heure de l'éditrice (change 013, ticket 03).
 * Pur (I2) : le fuseau est une constante, jamais celui de la machine.
 */
const FUSEAU = 'Europe/Paris';

const FORMAT = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, dateStyle: 'long', timeStyle: 'short' });

/** « 4 mars 2026 à 14:30 » pour des millisecondes depuis l'époque. */
export function formaterReception(recueLe: number): string {
  return FORMAT.format(new Date(recueLe));
}
