/**
 * Les règles qui rendent les deux branches de connexion indiscernables —
 * ticket 04 (specs/001-connexion-par-code/04-branches-indiscernables.md),
 * SPEC.md § Décisions d'implémentation, ADR-0007 — et le plafond de la
 * fenêtre glissante — ticket 05 (specs/001-connexion-par-code/
 * 05-plafond-horaire.md).
 *
 * Zone `core` (docs/archi.md, I1) : zéro dépendance, y compris vers un
 * autre fichier de `core/` (la matrice ne fait aucune exception). `setTimeout`
 * est une API du moteur, pas une dépendance au sens de la matrice.
 *
 * Un inconnu qui soumet une adresse au hasard ne doit rien apprendre d'une
 * soumission — ni du corps, ni des en-têtes, ni du moment de la réponse.
 * Deux mécanismes le tiennent ensemble (`src/pages/admin/connexion.astro`
 * les assemble) : la réponse n'est jamais rendue avant ce plancher, et
 * l'expédition — seul travail dont la durée varierait selon l'adresse — est
 * remise à la plateforme après elle, jamais avant.
 *
 * Le plancher est **gelé ici**, en source, et jamais réglé par une mesure :
 * une valeur déduite d'une observation ferait du contrôle un jugement
 * circulaire. C'est le ticket 09 (le parcours joué contre le serveur local)
 * qui le juge, sur une campagne dédiée — jamais ce module.
 */

/**
 * Le délai plancher, en millisecondes : aucune réponse à une soumission de
 * l'écran de connexion n'est rendue avant lui, que l'adresse soumise soit
 * l'adresse autorisée, une autre, ou qu'aucune adresse autorisée ne soit
 * encore enregistrée.
 */
export const DELAI_PLANCHER_MS = 300;

/**
 * Attend `ms` millisecondes. Seule primitive temporelle de ce module — sert
 * à la fois à tenir le plancher, et, appelée avec `0`, à différer un appel
 * au-delà du tour de boucle courant (`src/pages/admin/connexion.astro` s'en
 * sert pour remettre l'expédition à la plateforme après que la réponse est
 * partie, jamais avant).
 */
export function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Le plafond de messages par fenêtre glissante (ticket 05) : au plus ce
 * nombre de codes peut être écrit dans `FENETRE_PLAFOND_MS` qui précède —
 * ce que ça protège d'abord, c'est la boîte de la cliente (un dommage
 * durable), pas la disponibilité de l'administration (SPEC.md § Ce que ça
 * livre).
 */
export const PLAFOND_CODES_PAR_HEURE = 5;

/**
 * La largeur de la fenêtre glissante, en millisecondes : une ligne écrite
 * avant `maintenant - FENETRE_PLAFOND_MS` cesse d'être comptée, qu'elle soit
 * saine, brûlée ou annulée (`src/platform/auth/magasin.ts` ne filtre ni
 * `essais` ni `annule_le` — une ligne morte reste comptée tant qu'elle n'est
 * pas sortie de la fenêtre, SPEC.md § Décisions d'implémentation).
 */
export const FENETRE_PLAFOND_MS = 60 * 60 * 1000;
