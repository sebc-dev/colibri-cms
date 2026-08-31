/**
 * Le code de connexion — ticket 03 (specs/001-connexion-par-code/
 * 03-code-vers-adresse-autorisee.md), ADR-0001.
 *
 * Zone `core` (docs/archi.md, I1) : zéro dépendance, y compris vers un
 * autre fichier de `core/` (la matrice ne fait aucune exception). Ce module
 * n'importe rien — `crypto` est une API du moteur (Web Crypto), pas une
 * dépendance au sens de la matrice.
 *
 * Huit signes tirés d'un alphabet de trente-deux caractères posent
 * l'entropie que l'ADR retient : quarante bits, atteinte au signe près pour
 * rester recopiable à la main sans erreur (SPEC.md § Décisions
 * d'implémentation).
 */

// Crockford Base32 — trente-deux signes, sans confusable (ni I, L, O, ni U,
// que la recopie manuelle confondrait avec 1, 1, 0 et V).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LONGUEUR_CODE = 8;

/**
 * La durée de vie d'un code, en secondes (ADR-0001 : « expirant », quinze
 * minutes). Partagée avec la durée de vie minimale de l'identifiant
 * d'appareil (FR-120, SPEC.md) — un même nombre, pour que les deux ne
 * puissent pas diverger silencieusement.
 */
export const DUREE_DE_VIE_CODE_SECONDES = 15 * 60;

/**
 * Engendre un code de connexion : huit signes tirés, chacun indépendamment
 * et uniformément, de l'alphabet ci-dessus. 256 (l'espace d'un octet) est
 * un multiple de 32 : le modulo ne biaise aucun signe.
 */
export function engendrerCode(): string {
  const octets = new Uint8Array(LONGUEUR_CODE);
  crypto.getRandomValues(octets);
  let code = '';
  for (const octet of octets) {
    code += ALPHABET[octet % ALPHABET.length];
  }
  return code;
}

// Les quatre signes que l'alphabet ci-dessus exclut, ramenés au signe que la
// recopie manuelle leur substitue le plus souvent (ticket 06, c3).
const CONFUSABLES: Readonly<Record<string, string>> = {
  O: '0',
  I: '1',
  L: '1',
  U: 'V',
};

/**
 * Normalise une saisie avant de la comparer à un code engendré par
 * `engendrerCode` (ticket 06, c3, specs/001-connexion-par-code/
 * 06-code-ouvre-la-session.md) : casse indifférente, tout signe hors
 * chiffres/lettres ignoré (séparateurs), puis les confusables ci-dessus
 * ramenés à leur signe. N'importe rien : elle vit ici pour rester la seule
 * source de vérité sur ce que l'alphabet exclut, plutôt que de le dupliquer
 * là où une saisie doit être comparée.
 */
export function normaliserCode(saisie: string): string {
  const nettoyee = saisie.toUpperCase().replace(/[^0-9A-Z]/g, '');
  let normalisee = '';
  for (const caractere of nettoyee) {
    normalisee += CONFUSABLES[caractere] ?? caractere;
  }
  return normalisee;
}
