/**
 * Les textes que le visiteur lit dans le formulaire de devis (change 012,
 * ticket 03) — centralisés ici, jamais dispersés dans le gabarit. Écrits par
 * interpolation seulement (I5) ; aucun terme technique (FR-117).
 */
export const TEXTES_FORMULAIRE = {
  obligatoire: 'obligatoire',
  totalEstime: 'Total estimé :',
  totalInitial: '0 €',
  estimationIndicative: 'Estimation indicative, non engageante.',
  boutonEnvoi: 'Envoyer ma demande',
  envoiEnCours: 'Envoi en cours…',
  confirmation: 'Merci, votre demande a été envoyée.',
  echecEnvoi: "Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants.",
  echecLimite:
    'Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure.',
  echecFormulaireModifie:
    "Ce formulaire vient d'être mis à jour. Rechargez la page pour voir les prix à jour, puis refaites votre demande.",
  avisEnvoiDesactive: "Dans l'aperçu, l'envoi est désactivé : rien ne part d'ici.",
  sansScript:
    "Le total et l'envoi de ce formulaire ont besoin de JavaScript, désactivé dans votre navigateur. Vous pouvez nous écrire avec les coordonnées en bas de page.",
} as const;
