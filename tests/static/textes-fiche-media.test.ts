/**
 * Ticket 07 — La fiche d'une image : renommer et décrire
 * (openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md,
 * SC-07c).
 *
 * `FicheMedia.svelte` est monté côté client sans directive `client:*`
 * (ADR-0006) : le worker ne rend jamais son balisage en réponse à une
 * requête HTTP (le `<script>` de module qui le monte s'exécute dans un
 * navigateur, jamais dans `workerd` au moment du test). L'absence de terme
 * de développeur dans son texte (SC-07c) ne se prouve donc pas par une
 * requête HTTP — même geste que `tests/static/gabarits-admin.test.ts` pour
 * l'écran d'accueil, ou `tests/static/message-erreur-correction.test.ts`
 * pour les messages d'erreur des îlots de correction — mais en éprouvant
 * directement les CONSTANTES de texte que la fiche affiche (`../../src/
 * admin/textes.ts`), littéralement les seules chaînes visibles par
 * l'éditrice que `FicheMedia.svelte` pose à l'écran (lien de retour,
 * libellés des deux champs, bouton, message de refus, échec
 * d'enregistrement).
 */
import { describe, it, expect } from 'vitest';
import {
  TEXTE_LIEN_RETOUR_MEDIAS,
  TEXTE_LIBELLE_NOM_AFFICHAGE,
  TEXTE_LIBELLE_DESCRIPTION,
  TEXTE_BOUTON_ENREGISTRER,
  TEXTE_REFUS_NOM_VIDE,
  TEXTE_ECHEC_ENREGISTREMENT_FICHE,
} from '../../src/admin/textes.ts';

describe("la fiche d'une image (ticket 07)", () => {
  // FR-117 — la liste est une DONNÉE, pas une alternance : chaque terme est
  // éprouvé séparément, si bien qu'un échec nomme celui qui a fuité au lieu
  // de signaler qu'« une » regex de plusieurs branches a mordu (même geste
  // que `tests/static/message-erreur-correction.test.ts`).
  const TERMES_DEVELOPPEUR = [
    'brouillon',
    'base',
    'magasin',
    'commit',
    'branche',
    'build',
    'déploiement',
    'serveur',
    'http',
    'json',
    'api',
    'url',
    'endpoint',
    'token',
    'cookie',
    'session',
    'statut',
    'status',
    'fetch',
    'requête',
    'id',
    'identifiant',
  ];

  it("SC-07c — aucun texte de la fiche d'une image ne porte de terme de développeur", () => {
    const textesDeLaFiche = [
      TEXTE_LIEN_RETOUR_MEDIAS,
      TEXTE_LIBELLE_NOM_AFFICHAGE,
      TEXTE_LIBELLE_DESCRIPTION,
      TEXTE_BOUTON_ENREGISTRER,
      TEXTE_REFUS_NOM_VIDE,
      TEXTE_ECHEC_ENREGISTREMENT_FICHE,
    ];

    for (const texte of textesDeLaFiche) {
      for (const terme of TERMES_DEVELOPPEUR) {
        expect(texte, `« ${terme} » est un terme de développeur (FR-117) dans « ${texte} »`).not.toMatch(
          new RegExp(`\\b${terme}\\b`, 'i'),
        );
      }
    }
  });
});
