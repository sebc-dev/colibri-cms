/**
 * Ticket 01 du change 013 — chaque demande acceptée est gardée à sa réception, avant l'envoi de son
 * e-mail et quel qu'en soit le sort (FR-065, FR-066, ADR-0030).
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes` et la vraie D1 locale ; la liste se constate dans la table `demandes`
 * (aucun écran à ce ticket). Doubles : la liaison d'expédition (`EXPEDITEUR_CODE_CONNEXION`,
 * ADR-0002), `adresses_autorisees` vidée, et un déclencheur `raise(abort)` posé puis retiré. La part
 * navigateur du double actionnement se joue dans `tests/parcours/formulaire-echec.parcours.ts`.
 *
 * Ce que le visiteur lit quand sa demande est gardée sans que son e-mail parte relève du ticket 02 :
 * SC-01b et SC-01c n'attendent pas ici un statut de réponse.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach, vi } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const MOTIF_PLATEFORME = 'motif-plateforme-refus-42';
const ORIGINE_A = '203.0.113.7';
const ORIGINE_B = '203.0.113.8';
const SEUIL = 5;
const DELAI_TEST_MS = 60_000;

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
interface LigneDemande {
  id: string;
  formulaire_id: string;
  formulaire_nom: string;
  suite: string;
  etat: string;
  recue_le: number;
  page_titre: string;
  total: number | null;
  contact: string;
  detail: string;
  courriel: string;
}
interface LigneDeDetail {
  etiquette: string;
  options?: { libelle: string; prix?: number }[];
  valeur?: string;
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

async function tableExiste(db: DBLike, nom: string): Promise<boolean> {
  const { results } = await db.prepare(`select name from sqlite_master where type = 'table' and name = '${nom}'`).all();
  return results.length > 0;
}

async function viderDemandes(db: DBLike): Promise<void> {
  if (await tableExiste(db, 'demandes')) await db.prepare('delete from demandes').run();
}

/** La liste des demandes, lue dans la base : échoue tant que la table n'existe pas. */
async function lesDemandes(db: DBLike): Promise<LigneDemande[]> {
  return (await db.prepare('select * from demandes order by recue_le').all()).results as LigneDemande[];
}

const messages: MessageRemis[] = [];
let tentatives = 0;
let refuser = false;
let precedente: unknown;

beforeEach(async () => {
  messages.length = 0;
  tentatives = 0;
  refuser = false;
  const enveloppe = env as unknown as Record<string, unknown>;
  precedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      tentatives += 1;
      await Promise.resolve();
      if (refuser) throw new Error(MOTIF_PLATEFORME);
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
  await viderDemandes(db);
});

afterEach(async () => {
  vi.restoreAllMocks();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  const db = obtenirDB();
  await db.prepare('delete from adresses_autorisees').run();
  await viderDemandes(db);
});

const COMPLETE: Record<string, unknown> = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  occasion: ['anniversaire'],
  nom: 'Marie Dupont',
  courriel: 'marie@exemple.fr',
};

function envoyer(
  valeurs: Record<string, unknown> = COMPLETE,
  totalAffiche: unknown = 4000,
  origine: string = ORIGINE_A,
): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE, 'CF-Connecting-IP': origine },
      body: JSON.stringify({ formulaire: 'devis-gateau', page: 'contact', valeurs, totalAffiche }),
    }),
  );
}

function silencerLesTraces(): Record<'log' | 'info' | 'warn' | 'error' | 'debug', { mock: { calls: unknown[][] } }> {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
    info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
  };
}

function sortieConsole(espions: Record<string, { mock: { calls: unknown[][] } }>): string {
  return Object.values(espions)
    .flatMap((espion) => espion.mock.calls.flat())
    .map((x) => (x instanceof Error ? `${x.name} ${x.message} ${x.stack ?? ''}` : String(x)))
    .join('\n');
}

function detailDe(ligne: LigneDemande): LigneDeDetail[] {
  return JSON.parse(ligne.detail) as LigneDeDetail[];
}

it(
  'SC-01a — « Devis gâteau » depuis « Contact », Fraise (10 €) et 10 parts (30 €) : la liste porte la demande, avec date et heure de réception et un total de 40 €',
  async () => {
    const db = await assurerSchema();
    const avant = Date.now();

    const reponse = await envoyer();
    const apres = Date.now();
    const liste = await lesDemandes(db);

    expect(reponse.status).toBe(200);
    expect(liste).toHaveLength(1);
    const demande = liste[0];
    expect(demande.formulaire_id).toBe('devis-gateau');
    expect(demande.formulaire_nom).toBe('Devis gâteau');
    expect(demande.page_titre).toBe('Contact');
    expect(demande.total).toBe(4000);
    expect(demande.recue_le).toBeGreaterThanOrEqual(avant);
    expect(demande.recue_le).toBeLessThanOrEqual(apres);
    expect(demande.contact).toBe('marie@exemple.fr');
    expect(demande.etat).toBe('presente');
    expect(demande.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  },
  DELAI_TEST_MS,
);

it(
  'SC-01b — la plateforme refuse l’e-mail : la demande figure avec tout son détail et la mention que son e-mail n’a pas pu partir',
  async () => {
    const db = await assurerSchema();
    refuser = true;
    silencerLesTraces();

    await envoyer();
    const liste = await lesDemandes(db);

    expect(tentatives).toBe(1);
    expect(liste).toHaveLength(1);
    expect(liste[0].courriel).toBe('non-parti');
    expect(detailDe(liste[0])).toEqual([
      { etiquette: 'Parfum', options: [{ libelle: 'Fraise', prix: 1000 }] },
      { etiquette: 'Nombre de parts', options: [{ libelle: '10 parts', prix: 3000 }] },
      { etiquette: 'Occasion', options: [{ libelle: 'Anniversaire' }] },
      { etiquette: 'Votre nom', valeur: 'Marie Dupont' },
      { etiquette: 'Votre adresse e-mail', valeur: 'marie@exemple.fr' },
    ]);
  },
  DELAI_TEST_MS,
);

it(
  'SC-01c — sans adresse autorisée enregistrée : la demande complète figure avec la mention que son e-mail n’a pas pu partir',
  async () => {
    const db = await assurerSchema();
    await db.prepare('delete from adresses_autorisees').run();

    await envoyer();
    const liste = await lesDemandes(db);

    expect(tentatives).toBe(0);
    expect(liste).toHaveLength(1);
    expect(liste[0].courriel).toBe('non-parti');
    expect(liste[0].formulaire_nom).toBe('Devis gâteau');
    expect(liste[0].total).toBe(4000);
    expect(detailDe(liste[0])).toHaveLength(5);
  },
  DELAI_TEST_MS,
);

it(
  'SC-01d — e-mail remis à la plateforme : la demande figure sans la mention d’e-mail non parti',
  async () => {
    const db = await assurerSchema();

    const reponse = await envoyer();
    const liste = await lesDemandes(db);

    expect(reponse.status).toBe(200);
    expect(messages).toHaveLength(1);
    expect(liste).toHaveLength(1);
    expect(liste[0].courriel).toBe('parti');
  },
  DELAI_TEST_MS,
);

it(
  'SC-01d — cas limite : la marque « parti » échoue après un e-mail parti, la réponse reste 200 et la mention « non-parti » reste, sans donnée du visiteur dans le journal',
  async () => {
    const db = await assurerSchema();
    const traces = silencerLesTraces();
    // La table naît à la première garde : un envoi préalable la pose, puis la panne est provoquée.
    await envoyer(COMPLETE, 4000, ORIGINE_B);
    await viderDemandes(db);
    messages.length = 0;
    await db
      .prepare(
        "create trigger if not exists panne_marque_parti before update on demandes begin select raise(abort, 'panne'); end",
      )
      .run();

    try {
      const reponse = await envoyer();
      const liste = await lesDemandes(db);

      expect(reponse.status).toBe(200);
      expect(await reponse.json()).toEqual({ statut: 'envoyee' });
      expect(messages).toHaveLength(1);
      expect(liste).toHaveLength(1);
      expect(liste[0].courriel).toBe('non-parti');
      const sortie = sortieConsole(traces);
      for (const secret of ['Marie', 'marie@exemple.fr', ADRESSE_AUTORISEE, liste[0].id]) {
        expect(sortie).not.toContain(secret);
      }
    } finally {
      await db.prepare('drop trigger if exists panne_marque_parti').run();
    }
  },
  DELAI_TEST_MS,
);

it(
  'SC-01e — demande gardée avec « Fraise » à 10 € puis publication de « Fraise des bois » à 11 € : la demande porte toujours « Fraise » à 10 € et un total de 40 €',
  async () => {
    const db = await assurerSchema();
    await envoyer();
    await db
      .prepare(
        'create table if not exists publies_formulaires (formulaire text primary key, contenu text not null, publie_le integer not null)',
      )
      .run();

    try {
      const publie = {
        champs: { parfum: [{ id: 'fraise', libelle: 'Fraise des bois', prix: 1100 }] },
        derniersNumeros: {},
      };
      await db
        .prepare('insert or replace into publies_formulaires (formulaire, contenu, publie_le) values (?1, ?2, ?3)')
        .bind('devis-gateau', JSON.stringify(publie), Date.now())
        .run();

      const liste = await lesDemandes(db);

      expect(liste).toHaveLength(1);
      expect(liste[0].total).toBe(4000);
      expect(detailDe(liste[0])[0]).toEqual({
        etiquette: 'Parfum',
        options: [{ libelle: 'Fraise', prix: 1000 }],
      });
      expect(liste[0].detail).not.toContain('Fraise des bois');
    } finally {
      await db.prepare("delete from publies_formulaires where formulaire = 'devis-gateau'").run();
    }
  },
  DELAI_TEST_MS,
);

/** Une demande de contrôle acceptée pose la table et la garde : la liste ne se lit plus à vide. */
async function accepterUneDemandeDeControle(db: DBLike): Promise<void> {
  const controle = await envoyer(COMPLETE, 4000, ORIGINE_B);
  expect(controle.status).toBe(200);
  expect(await lesDemandes(db)).toHaveLength(1);
}

it(
  'SC-01f — champ obligatoire manquant : refusée (400), la liste n’en porte aucune trace',
  async () => {
    const db = await assurerSchema();
    await accepterUneDemandeDeControle(db);

    const reponse = await envoyer({ parfum: ['fraise'], nom: 'Intrus Sansmail' });
    const liste = await lesDemandes(db);

    expect(reponse.status).toBe(400);
    expect(liste).toHaveLength(1);
    expect(JSON.stringify(liste)).not.toContain('Intrus');
  },
  DELAI_TEST_MS,
);

it(
  'SC-01f — total désaccordé : refusée (409), la liste n’en porte aucune trace',
  async () => {
    const db = await assurerSchema();
    await accepterUneDemandeDeControle(db);

    const reponse = await envoyer({ ...COMPLETE, nom: 'Intrus Desaccord' }, 3900);
    const liste = await lesDemandes(db);

    expect(reponse.status).toBe(409);
    expect(liste).toHaveLength(1);
    expect(JSON.stringify(liste)).not.toContain('Intrus');
  },
  DELAI_TEST_MS,
);

it(
  'SC-01f — seuil de l’origine atteint : refusée (429), la liste n’en porte aucune trace',
  async () => {
    const db = await assurerSchema();
    await accepterUneDemandeDeControle(db);
    for (let i = 0; i < SEUIL; i += 1) {
      expect((await envoyer({ parfum: ['fraise'] })).status).toBe(400);
    }

    const reponse = await envoyer({ ...COMPLETE, nom: 'Intrus Seuil' });
    const liste = await lesDemandes(db);

    expect(reponse.status).toBe(429);
    expect(liste).toHaveLength(1);
    expect(JSON.stringify(liste)).not.toContain('Intrus');
  },
  DELAI_TEST_MS,
);

it(
  'SC-01g — une demande qui vient d’arriver a pour suite « à renseigner »',
  async () => {
    const db = await assurerSchema();

    await envoyer();
    const liste = await lesDemandes(db);

    expect(liste).toHaveLength(1);
    expect(liste[0].suite).toBe('a-renseigner');
  },
  DELAI_TEST_MS,
);

it(
  'SC-01h — un envoi accepté produit exactement une demande gardée et un seul e-mail à l’adresse autorisée',
  async () => {
    const db = await assurerSchema();

    const reponse = await envoyer();
    const liste = await lesDemandes(db);

    expect(reponse.status).toBe(200);
    expect(liste).toHaveLength(1);
    expect(tentatives).toBe(1);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.to).toBe(ADRESSE_AUTORISEE);
  },
  DELAI_TEST_MS,
);

it(
  'SC-01i — garde puis refus de l’e-mail : les valeurs saisies ne figurent que dans la demande gardée, ni ailleurs dans la base, ni dans les journaux, ni dans la réponse',
  async () => {
    const db = await assurerSchema();
    refuser = true;
    const traces = silencerLesTraces();

    const reponse = await envoyer();
    const corps = await reponse.text();
    const liste = await lesDemandes(db);

    expect(liste).toHaveLength(1);
    expect(liste[0].detail).toContain('Marie Dupont');
    const saisies = ['Marie', 'Dupont', 'marie@exemple.fr'];
    for (const saisie of saisies) expect(corps).not.toContain(saisie);
    const sortie = sortieConsole(traces);
    for (const secret of [...saisies, ADRESSE_AUTORISEE, liste[0].id]) {
      expect(sortie).not.toContain(secret);
    }
    const tables = (
      await db
        .prepare(
          "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%' and name <> 'demandes'",
        )
        .all()
    ).results as { name: string }[];
    expect(tables.length).toBeGreaterThan(0);
    for (const { name } of tables) {
      const contenu = JSON.stringify((await db.prepare(`select * from "${name}"`).all()).results);
      for (const saisie of saisies) expect(contenu, `table ${name}`).not.toContain(saisie);
    }
  },
  DELAI_TEST_MS,
);
