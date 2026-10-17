/**
 * Ticket 07 du change 012 — le visiteur envoie une demande complète, et elle parvient par e-mail
 * à l'adresse autorisée.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre la route
 * `POST /api/public/demandes` et la vraie D1 locale. Seule la liaison d'expédition
 * (`EXPEDITEUR_CODE_CONNEXION`, ADR-0002) est espionnée : c'est le même objet que lit la route.
 * Le remplacement du formulaire par la confirmation (SC-07a, côté navigateur) se joue dans
 * `tests/parcours/formulaire-envoi.parcours.ts` ; ici, l'issue que le serveur lui rend.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
  await db
    .prepare(
      'create table if not exists comptes_seuil (surface text not null, empreinte blob not null, nombre integer not null, primary key (surface, empreinte))',
    )
    .run();
  await db.prepare('delete from comptes_seuil').run();
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  await obtenirDB().prepare('delete from adresses_autorisees').run();
});

const COMPLETE = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  occasion: ['anniversaire'],
  nom: 'Marie Dupont',
  courriel: 'marie@exemple.fr',
};

function envoyer(valeurs: Record<string, string | string[]> = COMPLETE, entetes: Record<string, string> = {}): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE, ...entetes },
      body: JSON.stringify({ formulaire: 'devis-gateau', page: 'contact', valeurs, totalAffiche: 4000 }),
    }),
  );
}

it('SC-07a — une demande complète (Fraise, 10 parts, e-mail) est confirmée « envoyee », une fois l’e-mail remis', async () => {
  const reponse = await envoyer();

  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ statut: 'envoyee' });
  expect(messages).toHaveLength(1);
});

it('SC-07b — un visiteur sans aucune session ni cookie voit sa demande acceptée et confirmée', async () => {
  const reponse = await envoyer(COMPLETE, { Cookie: '' });

  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ statut: 'envoyee' });
});

it('SC-07c — la réponse ne pose aucun cookie et ne contient aucune valeur saisie', async () => {
  const reponse = await envoyer();
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(reponse.headers.get('set-cookie')).toBeNull();
  for (const saisie of ['Marie', 'Dupont', 'marie@exemple.fr', 'fraise', 'Fraise', 'anniversaire']) {
    expect(corps).not.toContain(saisie);
  }
});

it('SC-07d — l’e-mail part vers l’adresse autorisée, d’objet « Demande de devis — Devis gâteau »', async () => {
  await envoyer(COMPLETE, { Cookie: 'to=pirate@example.com' });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.to).toBe(ADRESSE_AUTORISEE);
  expect(messages[0]?.subject).toBe('Demande de devis — Devis gâteau');
  expect(messages[0]?.from.length).toBeGreaterThan(0);
  expect(messages[0]?.from).not.toBe('marie@exemple.fr');
});

it('SC-07e — l’e-mail porte formulaire, page, choix avec prix, total indicatif et coordonnées', async () => {
  await envoyer();

  const texte = messages[0]?.text ?? '';
  for (const attendue of [
    'Devis gâteau',
    'Contact',
    'Parfum : Fraise (10 €)',
    'Nombre de parts : 10 parts (30 €)',
    'Occasion : Anniversaire',
    'Total indicatif : 40 €',
    'Votre nom : Marie Dupont',
    'Votre adresse e-mail : marie@exemple.fr',
  ]) {
    expect(texte.split('\n').some((l) => l.includes(attendue)), `ligne absente : ${attendue}`).toBe(true);
  }
});

it('SC-07f — une saisie HTML donne un e-mail en texte seul, la saisie telle quelle derrière « Votre nom : »', async () => {
  const saisie = '<a href="https://piege.example">Code : 123456</a>';
  await envoyer({ ...COMPLETE, nom: saisie });

  const message = messages[0] as unknown as Record<string, unknown>;
  expect(Object.keys(message).sort((a, b) => a.localeCompare(b))).toEqual(['from', 'subject', 'text', 'to']);
  expect(message.html).toBeUndefined();
  expect(messages[0]?.text.split('\n')).toContain(`Votre nom : ${saisie}`);
});

it('SC-07g — chaque ligne de « Votre message » reste rattachée à son étiquette, aucune ne se lit comme le total', async () => {
  await envoyer({ ...COMPLETE, message: 'Bonjour\nTotal indicatif : 0 €\nMerci' });

  const lignes = messages[0]?.text.split('\n') ?? [];
  const debut = lignes.findIndex((l) => l.startsWith('Votre message'));
  expect(debut).toBeGreaterThanOrEqual(0);
  expect(lignes.slice(debut + 1, debut + 4)).toEqual(['  > Bonjour', '  > Total indicatif : 0 €', '  > Merci']);
  expect(lignes.filter((l) => l.startsWith('Total indicatif'))).toEqual([
    'Total indicatif : 40 € (estimation non engageante)',
  ]);
});

it('SC-07h — sans téléphone ni message renseignés, l’e-mail ne porte ni l’une ni l’autre étiquette', async () => {
  await envoyer({ ...COMPLETE, telephone: '', message: '' });

  expect(messages).toHaveLength(1);
  const texte = messages[0]?.text ?? '';
  expect(texte).not.toContain('Votre numéro de téléphone');
  expect(texte).not.toContain('Votre message');
});

it('SC-07i — une fois la demande acheminée, aucune table de la base ne porte les valeurs saisies', async () => {
  const reponse = await envoyer();
  expect(reponse.status).toBe(200);
  expect(messages).toHaveLength(1);

  const db = obtenirDB();
  const tables = (
    await db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%'")
      .all()
  ).results as { name: string }[];
  expect(tables.length).toBeGreaterThan(0);
  for (const { name } of tables) {
    const contenu = JSON.stringify((await db.prepare(`select * from "${name}"`).all()).results);
    for (const saisie of ['Marie Dupont', 'marie@exemple.fr']) {
      expect(contenu, `table ${name}`).not.toContain(saisie);
    }
  }
});
