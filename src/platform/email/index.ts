/**
 * L'expédition du code de connexion — ticket 03 (specs/001-connexion-par-
 * code/03-code-vers-adresse-autorisee.md), ticket 09 (specs/001-connexion-
 * par-code/09-parcours-local.md), ADR-0002.
 *
 * Zone `platform` (docs/archi.md, I1) : zéro import vers `admin/`,
 * `render/` ni `site/`.
 *
 * Le ticket 03 avait borné sa preuve à la *demande* d'expédition — jamais à
 * l'envoi réel, à son destinataire véritable ni à sa forme MIME définitive
 * (§ Ce que ce ticket ne prouve pas), en laissant le message volontairement
 * non typé (`message: unknown`, cf. `src/platform/d1/cloudflare-workers.d.ts`).
 * C'est le ticket 09 qui les établit : le message posé ici (`from`, `to`,
 * `subject`, `text`) est la forme que la liaison `send_email` reconnaît
 * réellement (mesuré contre le binding local, `scripts/verif-connexion.sh`)
 * — les champs en français du brouillon initial (`a`/`objet`/`corps`)
 * n'étaient jamais atteints par la plateforme, qui les rejette avant tout
 * envoi (aucun champ `from` ni `to` reconnu). `from` reprend le destinataire
 * lui-même : la seule adresse que ce module connaît est celle que
 * l'appelant lui transmet (I8 — le domaine de l'instance ne vit que dans
 * `instance.json`, hors de portée de cette zone), et l'e-mail est de toute
 * façon à destination de cette même boîte. `expediteur` est lu par
 * l'appelant depuis la liaison `EXPEDITEUR_CODE_CONNEXION`
 * (`send_email`, wrangler.jsonc) et seulement transmis ici.
 */

/** Le message tel que la liaison `send_email` locale le reconnaît (mesuré, ticket 09). */
export interface MessageEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** Ce que ce module attend de la liaison d'expédition (duck-typé sur `send_email`). */
export interface ExpediteurEmail {
  send(message: MessageEmail): void | Promise<void>;
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
    from: destinataire,
    to: destinataire,
    subject: OBJET,
    // Inerte et étiqueté (ADR-0002) : texte seul, jamais de HTML — la seule
    // donnée variable (le code) rendue derrière son étiquette, jamais en
    // position de titre ni de phrase du produit.
    text: `Code : ${code}`,
  });
}
