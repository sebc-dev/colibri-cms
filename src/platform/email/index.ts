/**
 * L'expédition du code de connexion — ticket 03 (specs/001-connexion-par-
 * code/03-code-vers-adresse-autorisee.md), ADR-0002.
 *
 * Zone `platform` (docs/archi.md, I1) : zéro import vers `admin/`,
 * `render/` ni `site/`.
 *
 * Ce ticket borne lui-même sa preuve à la *demande* d'expédition — jamais à
 * l'envoi réel, à son destinataire véritable ni à sa forme MIME définitive
 * (§ Ce que ce ticket ne prouve pas) : c'est le ticket 09 (le parcours joué
 * contre le serveur local) qui les établit. `expediteur` est donc lu par
 * l'appelant depuis la liaison `EXPEDITEUR_CODE_CONNEXION`
 * (`send_email`, wrangler.jsonc) et seulement transmis ici.
 */

/** Ce que ce module attend de la liaison d'expédition (duck-typé sur `send_email`). */
export interface ExpediteurEmail {
  send(message: unknown): void | Promise<void>;
}

const OBJET = 'Votre code de connexion';

/**
 * Demande à la plateforme d'expédier le code au destinataire — sans
 * attendre ni observer l'aboutissement de cet envoi (SPEC.md § Décisions
 * d'implémentation : la réponse part avant que l'expédition se résolve).
 */
export async function demanderExpeditionDuCode(
  expediteur: ExpediteurEmail,
  destinataire: string,
  code: string,
): Promise<void> {
  await expediteur.send({
    a: destinataire,
    objet: OBJET,
    // Inerte et étiqueté (ADR-0002) : texte seul, la seule donnée variable
    // (le code) rendue derrière son étiquette, jamais en position de titre
    // ni de phrase du produit.
    corps: `Code : ${code}`,
  });
}
