/**
 * Le texte de chaque geste de reprise après un refus de code — ticket 07
 * (specs/001-connexion-par-code/07-refus-de-code.md).
 *
 * Cinq causes de refus (`RaisonRefus`, `core/auth/verdict.ts`), trois
 * gestes : retaper, demander un nouveau code, revenir sur l'appareil
 * demandeur. Chaque cause appelle le geste qui la débloque réellement (SPEC.md
 * § Ce que ça livre) — jamais un texte générique qui les confondrait.
 *
 * Aucun terme de développeur n'y paraît (c7) : l'éditrice n'a aucune notion
 * technique (CLAUDE.md, FR-117).
 */
import type { RaisonRefus } from '../core/auth/verdict.ts';

/**
 * L'annonce de portée affichée à l'écran de saisie du code (c6) : seul le
 * dernier code demandé depuis l'appareil courant permet d'entrer — bornée à
 * l'appareil, jamais « le dernier message reçu », qui serait faux pour qui a
 * deux appareils en cours (SPEC.md § Ce que ça livre).
 */
export const TEXTE_ANNONCE_PORTEE_CODE =
  "Vous avez déjà reçu un code sur cet appareil ? Seul le dernier code demandé " +
  "depuis cet appareil permet d'entrer ; il reste valable quinze minutes, recopiez-le ci-dessous.";

const TEXTES_REFUS: Readonly<Record<RaisonRefus, string>> = {
  introuvable: "Ce code n'est pas reconnu. Vérifiez-le et retapez-le.",
  brule: 'Trop de tentatives avec ce code : demandez un nouveau code.',
  'deja-utilise': 'Ce code a déjà servi : demandez un nouveau code.',
  annule: "Ce code n'est plus valable : demandez un nouveau code.",
  expire: 'Ce code a expiré : demandez un nouveau code.',
  'mauvais-appareil':
    "Ce code a été demandé depuis un autre appareil : revenez sur l'appareil où vous l'avez demandé pour vous connecter.",
};

/** Le texte du geste à reprendre pour une raison de refus donnée (ticket 07). */
export function texteDuRefus(raison: RaisonRefus): string {
  return TEXTES_REFUS[raison];
}
