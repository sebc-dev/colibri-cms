/**
 * Ticket 08 du change 012 — une demande qui parvient au serveur sans passer par le formulaire de la
 * page est soumise aux mêmes règles de saisie : refusée en désignant le champ, sans e-mail.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes`. Seule la liaison d'expédition (ADR-0002) est espionnée.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';

interface MessageRemis {
  from: string;
  to: string;
  subject: string;
  text: string;
}

const messages: MessageRemis[] = [];
let precedente: unknown;

beforeEach(() => {
  messages.length = 0;
  const enveloppe = env as unknown as Record<string, unknown>;
  precedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      await Promise.resolve();
      messages.push(message);
    },
  };
});

afterEach(() => {
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
});

function envoyer(valeurs: Record<string, string | string[]>): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE },
      body: JSON.stringify({ formulaire: 'devis-gateau', page: 'contact', valeurs, totalAffiche: 1000 }),
    }),
  );
}

it('SC-08f — sans valeur pour « courriel » (obligatoire), refus 400 « champs » désignant ce champ, aucun e-mail', async () => {
  const reponse = await envoyer({ parfum: ['fraise'] });

  expect(reponse.status).toBe(400);
  expect(await reponse.json()).toEqual({ statut: 'champs', champs: [{ champ: 'courriel', motif: 'vide' }] });
  expect(messages).toHaveLength(0);
});

it('SC-08f — sans parfum choisi, le champ « parfum » est désigné, aucun e-mail', async () => {
  const reponse = await envoyer({ parfum: [], courriel: 'marie@exemple.fr' });

  expect(reponse.status).toBe(400);
  expect(await reponse.json()).toEqual({ statut: 'champs', champs: [{ champ: 'parfum', motif: 'vide' }] });
  expect(messages).toHaveLength(0);
});

it('SC-08f — une adresse mal formée est désignée pour sa forme, sans reprendre la valeur saisie', async () => {
  const reponse = await envoyer({ parfum: ['fraise'], courriel: 'marie.exemple.fr' });
  const corps = await reponse.text();

  expect(reponse.status).toBe(400);
  expect(JSON.parse(corps)).toEqual({ statut: 'champs', champs: [{ champ: 'courriel', motif: 'forme' }] });
  expect(corps).not.toContain('marie.exemple.fr');
  expect(messages).toHaveLength(0);
});

it('SC-08f — un message de 2 001 caractères est désigné pour sa longueur, aucun e-mail', async () => {
  const reponse = await envoyer({ parfum: ['fraise'], courriel: 'marie@exemple.fr', message: 'a'.repeat(2001) });

  expect(reponse.status).toBe(400);
  expect(await reponse.json()).toEqual({ statut: 'champs', champs: [{ champ: 'message', motif: 'longueur' }] });
  expect(messages).toHaveLength(0);
});
