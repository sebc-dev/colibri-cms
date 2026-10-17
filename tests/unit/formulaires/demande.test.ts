/**
 * Ticket 09 du change 012 — une demande qui ne s'accorde plus au formulaire publié est refusée (SC-09d).
 * Couture : `verifierDemande(formulaire, recues)` de `src/core/formulaires/demande.ts`. Les valeurs
 * reçues ne se lisent que sur leurs clés propres : un membre hérité d'`Object.prototype` n'est jamais
 * pris pour une saisie du visiteur.
 */
import { it, expect } from 'vitest';
import type { FormulaireDeclare } from '../../../src/core/formulaires/declaration.ts';
import { verifierDemande } from '../../../src/core/formulaires/demande.ts';

const ESSAI: FormulaireDeclare = {
  id: 'essai',
  nom: 'Essai',
  champs: [{ id: 'constructor', nature: 'texte', libelle: 'Constructeur', obligatoire: false, avecPrix: false }],
};

it('SC-09d — un champ déclaré nommé comme un membre d’Object.prototype (« constructor »), facultatif et omis, est lu vide et la demande reste accordée', () => {
  const recues: unknown = JSON.parse('{}');

  expect(verifierDemande(ESSAI, recues)).toEqual({ ok: true, valeurs: { constructor: '' } });
});
