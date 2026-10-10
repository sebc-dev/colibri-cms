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

/**
 * Les libellés de l'`Écran : Médias` (ticket 05,
 * openspec/changes/004-bibliotheque-de-medias/tickets/05-ecran-medias.md).
 * Aucun terme de développeur (SC-05d) : ni « brouillon », ni « fichier »,
 * ni rien qui évoque l'implémentation.
 */
export const TEXTE_BOUTON_TELEVERSER = 'Téléverser une image';
export const TEXTE_LIBELLE_RECHERCHE_MEDIAS = 'Rechercher';
export const TEXTE_PLACEHOLDER_RECHERCHE_MEDIAS = 'Rechercher par nom ou description';

/** L'état vide de la bibliothèque elle-même, aucune image nulle part (SC-05b). */
export const TEXTE_BIBLIOTHEQUE_VIDE = "La bibliothèque ne contient encore aucune image.";

/** L'état vide propre à une recherche sans correspondance (SC-05g) — distinct du précédent : la réserve, elle, reste intacte. */
export const TEXTE_RECHERCHE_MEDIAS_SANS_RESULTAT = 'Aucune image ne correspond à cette recherche.';

/**
 * Les motifs de refus d'un téléversement, tels que rendus par la route
 * `src/pages/admin/medias/televerser.ts` (ticket 04) : `'format'` ou
 * `'poids'` (`ResultatIngestionImage`/`persisterMediaBrouillon`,
 * `src/core/medias/ingestion.ts` et `src/platform/medias/magasin.ts`), ou
 * `'forme-invalide'` (corps de requête mal formé, avant même l'analyse de
 * l'image). SC-05e n'exige de distinguer que le format et le poids ;
 * `'forme-invalide'` reste couvert pour rester total sur toute réponse de
 * la route, sans jamais nommer de terme de développeur.
 */
export type MotifRefusTeleversement = 'format' | 'poids' | 'forme-invalide';

const TEXTES_REFUS_TELEVERSEMENT: Readonly<Record<MotifRefusTeleversement, string>> = {
  format: "Cette image n'est pas dans un format accepté (JPEG, PNG ou WebP) : choisissez une autre image.",
  poids: 'Cette image est trop lourde : choisissez une image plus légère.',
  'forme-invalide': "Aucune image n'a été reçue : choisissez une image, puis réessayez.",
};

/** Le message d'échec générique, hors des motifs métier reconnus ci-dessus (réponse inattendue). */
export const TEXTE_ECHEC_TELEVERSEMENT_INATTENDU = 'Le téléversement a échoué. Réessayez dans un instant.';

/**
 * Le texte à afficher pour un téléversement refusé (SC-05e) : dit si c'est
 * le format ou le poids, sans terme de développeur. Un motif absent ou
 * inconnu retombe sur le message générique plutôt que d'afficher `undefined`
 * ou une clé technique.
 */
export function texteDuRefusTeleversement(motif: string | undefined): string {
  if (motif !== undefined && Object.hasOwn(TEXTES_REFUS_TELEVERSEMENT, motif)) {
    return TEXTES_REFUS_TELEVERSEMENT[motif as MotifRefusTeleversement];
  }
  return TEXTE_ECHEC_TELEVERSEMENT_INATTENDU;
}

/**
 * Les libellés de l'`Écran : Fiche d'une image` (ticket 07,
 * openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md,
 * SC-07c). Aucun terme de développeur : ni « brouillon », ni « base », ni
 * rien qui évoque l'implémentation ou le magasin.
 */
export const TEXTE_LIEN_RETOUR_MEDIAS = 'Médias';
export const TEXTE_LIBELLE_NOM_AFFICHAGE = 'Nom';
export const TEXTE_LIBELLE_DESCRIPTION = 'Description';
export const TEXTE_BOUTON_ENREGISTRER = 'Enregistrer';

/** Le refus d'un renommage (SC-07a) : un nom vide n'est jamais enregistré. */
export const TEXTE_REFUS_NOM_VIDE = 'Le nom ne peut pas être vide.';

/** Un échec inattendu en enregistrant le nom ou la description de la fiche (SC-07a/SC-07b). */
export const TEXTE_ECHEC_ENREGISTREMENT_FICHE = "L'enregistrement a échoué. Réessayez dans un instant.";

/**
 * La marque d'une image que plus aucun emplacement ne référence (ticket 10,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 10-signaler-images-orphelines.md, SC-10a, UX5) — posée sur la vignette de
 * la grille comme sur la fiche. Aucun terme de développeur : ni
 * « orpheline », ni « référence », ni « brouillon » (FR-117) — seule la
 * publication, mot du métier (glossaire), y paraît.
 */
export const TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT =
  "Cette image n'est posée dans aucun emplacement : elle sera effacée à la prochaine publication.";

/**
 * Les libellés de la liste des emplacements et de la suppression, sur
 * l'`Écran : Fiche d'une image` (ticket 11, openspec/changes/
 * 004-bibliotheque-de-medias/tickets/11-ou-posee-et-supprimer.md,
 * SC-11a/b/c/f). Aucun terme de développeur : la place d'un emplacement se
 * dit par sa nature en français, jamais son identifiant
 * (`placeEmplacement`, `src/admin/ilots-svelte-5/emplacements-media.ts`).
 */
export const TEXTE_TITRE_POSEE_DANS = 'Posée dans';

/** L'état d'une image posée dans aucun emplacement (SC-11b), sur la fiche comme dans la confirmation de suppression. */
export const TEXTE_POSEE_NULLE_PART = "Cette image n'est posée dans aucun emplacement.";

export const TEXTE_BOUTON_SUPPRIMER_MEDIA = 'Supprimer…';

/** Le titre de la confirmation de suppression (SC-11c), avec le nom d'affichage courant de l'image. */
export function texteConfirmationSuppression(nomAffichage: string): string {
  return `Supprimer « ${nomAffichage} » ?`;
}

/** L'introduction de la liste, dans la confirmation de suppression, quand l'image est posée quelque part (SC-11c). */
export const TEXTE_INTRO_EMPLACEMENTS_CONFIRMATION = 'Elle est posée dans :';

export const TEXTE_BOUTON_ANNULER_SUPPRESSION = 'Annuler';
export const TEXTE_BOUTON_CONFIRMER_SUPPRESSION = 'Supprimer';

/** Un échec inattendu en supprimant l'image (SC-11d/e). */
export const TEXTE_ECHEC_SUPPRESSION = "La suppression a échoué. Réessayez dans un instant.";

/**
 * Les libellés de l'`Écran : Réglages` (ticket 04,
 * openspec/changes/008-reglages-transverses/tickets/04-ecran-des-reglages.md).
 * Aucun terme de développeur (SC-04d, FR-117).
 */
export const TEXTE_TITRE_REGLAGES = 'Réglages';
export const TEXTE_CARTE_COORDONNEES = 'Coordonnées';
export const TEXTE_CARTE_RESEAUX = 'Réseaux sociaux';
export const TEXTE_CARTE_MENTION = "Mention d'information";
export const TEXTE_AIDE_MENTION = 'Ce texte accompagne chaque formulaire de votre site.';
export const TEXTE_COORDONNEES_VIDES = "Aucune coordonnée n'est prévue pour votre site.";
export const TEXTE_RESEAUX_VIDES = "Aucun réseau social n'est prévu pour votre site.";

/** L'intitulé d'un champ sans nom déclaré : le libellé de sa nature, jamais l'identifiant. */
export const LIBELLES_NATURE_COORDONNEE: Readonly<Record<'texte' | 'telephone' | 'email' | 'adresse', string>> = {
  texte: 'Texte',
  telephone: 'Numéro de téléphone',
  email: 'Adresse e-mail',
  adresse: 'Adresse postale',
};

/**
 * Les textes de la carte Coordonnées (ticket 06,
 * openspec/changes/008-reglages-transverses/tickets/06-carte-coordonnees.md).
 * Chaque code de raison d'un refus est traduit ici, jamais affiché brut ;
 * aucun terme de développeur (FR-117).
 */
export const TEXTE_ENREGISTREMENT_EN_COURS = 'Enregistrement…';

export const TEXTES_REFUS_COORDONNEES: Readonly<Record<string, string>> = {
  'texte-trop-long': 'Un texte de 120 signes au plus.',
  'texte-plusieurs-lignes': 'Un texte sur une seule ligne.',
  'telephone-caracteres': 'Un numéro de téléphone, de 6 à 15 chiffres.',
  'telephone-chiffres': 'Un numéro de téléphone, de 6 à 15 chiffres.',
  'email-forme': 'Une adresse e-mail, par exemple nom@exemple.fr.',
  'email-trop-long': 'Une adresse e-mail de 254 signes au plus.',
  'adresse-trop-de-lignes': 'Une adresse de 5 lignes au plus.',
  'adresse-trop-longue': 'Une adresse de 300 signes au plus.',
  'non-declaree': "Ce champ n'existe plus : rechargez l'écran.",
  'forme-invalide': "L'enregistrement a échoué. Réessayez dans un instant.",
};

/** Un refus dont le code est inconnu : jamais le code brut. */
export const TEXTE_REFUS_COORDONNEE_INCONNU = "Cette valeur n'est pas acceptée.";

/**
 * Les textes de la carte Réseaux sociaux (ticket 07,
 * openspec/changes/008-reglages-transverses/tickets/07-composer-les-reseaux-sociaux.md).
 * Chaque code de raison est traduit ici, jamais affiché brut (FR-117).
 */
export const TEXTE_RESEAUX_AUCUN_LIEN = "Aucun lien pour l'instant.";
export const TEXTE_RESEAUX_AJOUTER = 'Ajouter un lien';
export const TEXTE_RESEAUX_LISTE_COMPLETE = 'La liste est complète (12 liens au plus).';
export const TEXTE_RESEAUX_NOM = 'Nom affiché';
export const TEXTE_RESEAUX_ADRESSE = 'Adresse de la page';
export const TEXTE_RESEAUX_RETIRER = 'Retirer';
export const TEXTE_RESEAUX_MONTER = 'Monter';
export const TEXTE_RESEAUX_DESCENDRE = 'Descendre';

export const TEXTES_REFUS_RESEAUX: Readonly<Record<string, string>> = {
  'nom-vide': 'Un nom, de 40 caractères au plus.',
  'nom-trop-long': 'Un nom de 40 caractères au plus.',
  'nom-plusieurs-lignes': 'Un nom sur une seule ligne.',
  'adresse-forme': 'Une adresse qui commence par https://',
  'adresse-pas-https': 'Une adresse qui commence par https://',
  'adresse-trop-longue': 'Une adresse de 2048 caractères au plus.',
  'trop-de-liens': 'La liste est complète (12 liens au plus).',
  'forme-invalide': "L'enregistrement a échoué. Réessayez dans un instant.",
};

export const TEXTE_REFUS_RESEAU_INCONNU = "Cette valeur n'est pas acceptée.";

/** L'écran « Formulaires » : titre et état vide (aucun geste de création, FR-117). */
export const TEXTE_TITRE_FORMULAIRES = 'Formulaires';
export const TEXTE_AUCUN_FORMULAIRE = 'Aucun formulaire n’est prévu pour votre site.';
