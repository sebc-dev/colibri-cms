/**
 * Ticket 09 du change 012 — une demande qui ne s'accorde plus au formulaire publié est refusée :
 * 409 « formulaire-change », aucun e-mail, aucune valeur renvoyée.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes` et la vraie D1 locale. Seule la liaison d'expédition
 * (`EXPEDITEUR_CODE_CONNEXION`, ADR-0002) est espionnée. Le message affiché et la saisie conservée
 * (côté navigateur) se jouent dans `tests/parcours/formulaire-change.parcours.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}
interface MessageRemis {
  from: string;
  to: string;
  subject: string;
  text: string;
}

function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schema: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schema ??= (async () => {
    const module = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    for (const requete of separerRequetes(module.default)) await db.prepare(requete).run();
  })();
  await schema;
  return db;
}

const messages: MessageRemis[] = [];
let precedente: unknown;

beforeEach(async () => {
  messages.length = 0;
  const enveloppe = env as unknown as Record<string, unknown>;
  precedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      await Promise.resolve();
      messages.push(message);
    },
  };
  const db = await assurerSchema();
  await db.prepare('delete from adresses_autorisees').run();
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  await obtenirDB().prepare('delete from adresses_autorisees').run();
});

const COMPLETE: Record<string, unknown> = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  courriel: 'marie@exemple.fr',
};

interface Surcharge {
  formulaire?: string;
  page?: string;
  valeurs?: Record<string, unknown>;
  totalAffiche?: unknown;
}

function envoyer(surcharge: Surcharge = {}): Promise<Response> {
  const corps = {
    formulaire: surcharge.formulaire ?? 'devis-gateau',
    page: surcharge.page ?? 'contact',
    valeurs: surcharge.valeurs ?? COMPLETE,
    totalAffiche: 'totalAffiche' in surcharge ? surcharge.totalAffiche : 4000,
  };
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE },
      body: JSON.stringify(corps),
    }),
  );
}

async function verifierRefusDesaccord(reponse: Response): Promise<void> {
  const corps = await reponse.text();
  expect(reponse.status).toBe(409);
  expect(JSON.parse(corps)).toEqual({ statut: 'formulaire-change' });
  expect(messages).toHaveLength(0);
}

it('SC-09a — « Fraise » ouverte à 10 € alors que le prix publié est 11 € : total annoncé périmé, refus 409, aucun e-mail, aucune valeur renvoyée', async () => {
  // Le formulaire publié met « Fraise » (1 000 c) et « 10 parts » (3 000 c) : 4 000 c.
  // Le visiteur a ouvert la page à 10 € ; son total annoncé ne s'accorde plus au prix publié.
  const reponse = await envoyer({ totalAffiche: 3900 });
  const corps = await reponse.text();

  expect(reponse.status).toBe(409);
  expect(JSON.parse(corps)).toEqual({ statut: 'formulaire-change' });
  expect(corps).not.toContain('fraise');
  expect(corps).not.toContain('marie@exemple.fr');
  expect(messages).toHaveLength(0);
});

it('SC-09b — une option de « Parfum » que le formulaire publié ne porte pas : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ valeurs: { ...COMPLETE, parfum: ['pistache'] }, totalAffiche: 3000 }));
});

it('SC-09b — une option envoyée pour un champ de texte (« Votre nom ») : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ valeurs: { ...COMPLETE, nom: ['fraise'] } }));
});

it('SC-09c — deux options dans « Parfum » (choix unique) : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(
    await envoyer({ valeurs: { ...COMPLETE, parfum: ['fraise', 'vanille'] }, totalAffiche: 4800 }),
  );
});

it('SC-09c — la même option deux fois dans « Occasion » (choix multiple) : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ valeurs: { ...COMPLETE, occasion: ['mariage', 'mariage'] } }));
});

it('SC-09d — une valeur pour un champ non déclaré par le formulaire publié : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ valeurs: { ...COMPLETE, glacage: ['miroir'] } }));
});

it('SC-09d — la clé « __proto__ » n’est pas un champ déclaré : refus 409, aucun e-mail', async () => {
  const brut = `{"formulaire":"devis-gateau","page":"contact","totalAffiche":4000,"valeurs":{"parfum":["fraise"],"nombre-de-parts":["dix-parts"],"courriel":"marie@exemple.fr","__proto__":{"x":"y"}}}`;
  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE },
      body: brut,
    }),
  );
  await verifierRefusDesaccord(reponse);
});

it('SC-09d — un champ non déclaré alors qu’un champ obligatoire manque (page ouverte avant un renommage) : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(
    await envoyer({
      valeurs: { parfum: ['fraise'], 'nombre-de-parts': ['dix-parts'], 'ancien-courriel': 'marie@exemple.fr' },
    }),
  );
});

it('SC-09e — « Devis gâteau » avec une page d’origine qui ne le pose pas : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ page: 'accueil' }));
});

it('SC-09e — un formulaire que la déclaration publiée ne porte pas : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ formulaire: 'devis-inexistant' }));
});

it('SC-09e — une page d’origine que le site publié ne porte pas : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ page: 'page-inexistante' }));
});

it('SC-09f — total annoncé de 1 € pour « Fraise » (10 €) et « 10 parts » (30 €) : refus 409, aucun e-mail', async () => {
  await verifierRefusDesaccord(await envoyer({ totalAffiche: 100 }));
});

it('SC-09f — un total annoncé absent, négatif, décimal ou textuel est refusé comme un désaccord', async () => {
  for (const totalAffiche of [undefined, -4000, 40.5, '4000']) {
    messages.length = 0;
    await verifierRefusDesaccord(await envoyer({ totalAffiche }));
  }
});

it('SC-09a — une demande accordée au formulaire publié reste acceptée (contrôle négatif)', async () => {
  const reponse = await envoyer();

  expect(reponse.status).toBe(200);
  expect(messages).toHaveLength(1);
});
