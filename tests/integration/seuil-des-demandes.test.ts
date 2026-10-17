/**
 * Ticket 12 du change 012 — l'envoi des demandes refuse une origine au-delà de cinq par heure
 * (FR-062, ADR-0028) : 429 « seuil », sans cookie, sans e-mail, sans IP dans les traces.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre
 * `POST /api/public/demandes` et la vraie D1 locale. L'origine est posée par l'en-tête
 * `CF-Connecting-IP`. Le temps n'est jamais simulé : la bascule de fenêtre vieillit la ligne de
 * `fenetre_seuil` dans la vraie base. Seule la liaison d'expédition est espionnée. L'affichage du
 * message et la saisie conservée se jouent dans `tests/parcours/formulaire-seuil.parcours.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach, vi } from 'vitest';

const ORIGINE_SITE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const ADRESSE_AUTORISEE = 'editrice@example.com';
const NOM_COOKIE_APPAREIL = 'identifiant-appareil';
const SEUIL = 5;
const DEUX_HEURES_MS = 2 * 60 * 60 * 1000;
const DELAI_TEST_MS = 60_000;
const ORIGINE_A = '203.0.113.7';
const ORIGINE_B = '198.51.100.23';
const TEXTE_ANNONCE_CONNEXION =
  'Trop de tentatives de connexion depuis votre accès à internet. Merci de patienter une heure avant de réessayer.';

interface DBLike {
  prepare(requete: string): {
    bind(...valeurs: unknown[]): { run(): Promise<unknown> };
    run(): Promise<unknown>;
    all(): Promise<{ results: Record<string, unknown>[] }>;
  };
}
interface MessageRemis {
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
    const adresses = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    const seuil = await import('../../migrations/0012_seuil_par_origine.sql?raw');
    for (const module of [adresses, sessions, seuil]) {
      for (const requete of separerRequetes(module.default)) await db.prepare(requete).run();
    }
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
  for (const table of ['comptes_seuil', 'fenetre_seuil', 'codes_connexion', 'adresses_autorisees']) {
    await db.prepare(`delete from ${table}`).run();
  }
  await db.prepare('insert into adresses_autorisees (adresse) values (?1)').bind(ADRESSE_AUTORISEE).run();
});

afterEach(async () => {
  vi.restoreAllMocks();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = precedente;
  const db = obtenirDB();
  for (const table of ['comptes_seuil', 'fenetre_seuil', 'codes_connexion', 'adresses_autorisees']) {
    await db.prepare(`delete from ${table}`).run();
  }
});

const COMPLETE: Record<string, unknown> = {
  parfum: ['fraise'],
  'nombre-de-parts': ['dix-parts'],
  courriel: 'marie@exemple.fr',
};
const SANS_COURRIEL: Record<string, unknown> = { parfum: ['fraise'], 'nombre-de-parts': ['dix-parts'] };

function envoyer(origine: string, valeurs: Record<string, unknown> = COMPLETE): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE_SITE}/api/public/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGINE_SITE, 'CF-Connecting-IP': origine },
      body: JSON.stringify({ formulaire: 'devis-gateau', page: 'contact', valeurs, totalAffiche: 4000 }),
    }),
  );
}

/** L'identifiant d'appareil que l'écran de connexion pose à l'affichage, sous forme `nom=valeur`. */
async function cookieAppareil(): Promise<string> {
  const page = await exports.default.fetch(new Request(`${ORIGINE_SITE}/admin/connexion`));
  const cookie = page.headers
    .getSetCookie()
    .map((entete) => entete.split(';')[0].trim())
    .find((paire) => paire.startsWith(`${NOM_COOKIE_APPAREIL}=`));
  expect(cookie).toBeDefined();
  return cookie ?? '';
}

function soumettreConnexion(origine: string, cookie: string, corps: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE_SITE}/admin/connexion`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: ORIGINE_SITE,
        cookie,
        'cf-connecting-ip': origine,
      },
      body: corps,
    }),
  );
}

function pause(ms: number): Promise<void> {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}

async function epuiser(origine: string): Promise<void> {
  for (let i = 0; i < SEUIL; i += 1) {
    const reponse = await envoyer(origine);
    expect(reponse.status).toBe(200);
  }
}

async function vieillirLaFenetre(db: DBLike): Promise<void> {
  await db.prepare(`update fenetre_seuil set debut = debut - ${String(DEUX_HEURES_MS)}`).run();
}

function enHex(octets: Uint8Array): string {
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

async function secretsDeLaBase(db: DBLike): Promise<string[]> {
  const secrets: string[] = [];
  for (const table of ['fenetre_seuil', 'comptes_seuil']) {
    const { results } = await db.prepare(`select * from ${table}`).all();
    for (const ligne of results) {
      for (const [colonne, valeur] of Object.entries(ligne)) {
        if (colonne === 'surface' || !Array.isArray(valeur)) continue;
        secrets.push(enHex(Uint8Array.from(valeur as number[])));
      }
    }
  }
  return secrets.filter((s) => s.length >= 8);
}

it(
  'SC-12a — six demandes complètes d’une même origine : les cinq premières acceptées, la sixième refusée',
  async () => {
    await epuiser(ORIGINE_A);
    expect(messages).toHaveLength(SEUIL);

    const sixieme = await envoyer(ORIGINE_A);

    expect(sixieme.status).toBe(429);
    expect(await sixieme.json()).toEqual({ statut: 'seuil' });
    expect(messages).toHaveLength(SEUIL);
  },
  DELAI_TEST_MS,
);

it(
  'SC-12b — une autre origine envoie une demande complète dans la même fenêtre : acceptée',
  async () => {
    await epuiser(ORIGINE_A);
    expect((await envoyer(ORIGINE_A)).status).toBe(429);

    const autre = await envoyer(ORIGINE_B);

    expect(autre.status).toBe(200);
    expect(await autre.json()).toEqual({ statut: 'envoyee' });
    expect(messages).toHaveLength(SEUIL + 1);
  },
  DELAI_TEST_MS,
);

it(
  'SC-12c — une origine refusée pour seuil, à la fenêtre suivante : acceptée',
  async () => {
    const db = await assurerSchema();
    await epuiser(ORIGINE_A);
    expect((await envoyer(ORIGINE_A)).status).toBe(429);

    await vieillirLaFenetre(db);
    const reprise = await envoyer(ORIGINE_A);

    expect(reprise.status).toBe(200);
    expect(await reprise.json()).toEqual({ statut: 'envoyee' });
  },
  DELAI_TEST_MS,
);

it(
  'SC-12d — une origine au seuil des demandes soumet une adresse à l’écran de connexion : traitée comme sous son propre seuil',
  async () => {
    await epuiser(ORIGINE_A);
    expect((await envoyer(ORIGINE_A)).status).toBe(429);
    const cookie = await cookieAppareil();

    const reponse = await soumettreConnexion(
      ORIGINE_A,
      cookie,
      `adresse=${encodeURIComponent(ADRESSE_AUTORISEE)}`,
    );

    expect(reponse.status).toBe(200);
    expect(await reponse.text()).not.toContain(TEXTE_ANNONCE_CONNEXION);
    // Le code s'écrit avant la réponse : sa présence prouve que la soumission a été traitée.
    const { results } = await obtenirDB().prepare('select count(*) as n from codes_connexion').all();
    expect(results[0].n).toBe(1);
    // L'expédition part après la réponse : l'attendre ici, avant que l'espion ne soit retiré.
    for (let i = 0; i < 500 && messages.length === SEUIL; i += 1) await pause(10);
    expect(messages).toHaveLength(SEUIL + 1);
    expect(messages[SEUIL].to).toBe(ADRESSE_AUTORISEE);
  },
  DELAI_TEST_MS,
);

it(
  'SC-12d — cas limite : cinq tentatives de connexion n’entament pas le seuil des demandes de la même origine',
  async () => {
    const cookie = await cookieAppareil();
    for (let i = 0; i < SEUIL; i += 1) {
      const tentative = await soumettreConnexion(ORIGINE_A, cookie, `code=faux-${String(i)}`);
      expect(await tentative.text()).not.toContain(TEXTE_ANNONCE_CONNEXION);
    }

    // Avec un compte partagé, cette demande serait la sixième sollicitation de l'origine.
    const demande = await envoyer(ORIGINE_A);

    expect(demande.status).toBe(200);
    expect(await demande.json()).toEqual({ statut: 'envoyee' });
    expect(messages).toHaveLength(1);
  },
  DELAI_TEST_MS,
);

it(
  'SC-12e — cinq demandes refusées pour champ manquant puis une sixième complète : refusée pour seuil atteint',
  async () => {
    for (let i = 0; i < SEUIL; i += 1) {
      const incomplete = await envoyer(ORIGINE_A, SANS_COURRIEL);
      expect(incomplete.status).toBe(400);
    }

    const sixieme = await envoyer(ORIGINE_A);

    expect(sixieme.status).toBe(429);
    expect(await sixieme.json()).toEqual({ statut: 'seuil' });
    expect(messages).toHaveLength(0);
  },
  DELAI_TEST_MS,
);

it(
  'SC-12f — une sollicitation comptée, acceptée ou refusée, ne pose aucun cookie',
  async () => {
    const acceptee = await envoyer(ORIGINE_A);
    for (let i = 1; i < SEUIL; i += 1) await envoyer(ORIGINE_A);
    const refusee = await envoyer(ORIGINE_A);

    expect(acceptee.status).toBe(200);
    expect(refusee.status).toBe(429);
    expect(acceptee.headers.getSetCookie()).toEqual([]);
    expect(refusee.headers.getSetCookie()).toEqual([]);
    expect(refusee.headers.get('set-cookie')).toBeNull();
  },
  DELAI_TEST_MS,
);

it(
  'SC-12g — au-delà du seuil : réponse « seuil » sans détail, aucun e-mail envoyé',
  async () => {
    await epuiser(ORIGINE_A);
    messages.length = 0;

    const refusee = await envoyer(ORIGINE_A);
    const corps = await refusee.text();

    expect(refusee.status).toBe(429);
    expect(JSON.parse(corps)).toEqual({ statut: 'seuil' });
    expect(corps).not.toContain(ORIGINE_A);
    expect(messages).toHaveLength(0);
  },
  DELAI_TEST_MS,
);

it(
  'SC-12h — si la base refuse de compter : sollicitation refusée, rien envoyé, trace sans IP, clé de fenêtre ni empreinte',
  async () => {
    const db = await assurerSchema();
    // Une fenêtre et une clé en place : des secrets à chercher dans les traces.
    expect((await envoyer(ORIGINE_B)).status).toBe(200);
    messages.length = 0;
    const journaux = (['log', 'info', 'warn', 'error', 'debug'] as const).map((methode) =>
      vi.spyOn(console, methode).mockImplementation(() => undefined),
    );
    await db
      .prepare(
        "create trigger if not exists panne_seuil_demande_insertion before insert on comptes_seuil begin select raise(abort, 'panne'); end",
      )
      .run();
    await db
      .prepare(
        "create trigger if not exists panne_seuil_demande_maj before update on comptes_seuil begin select raise(abort, 'panne'); end",
      )
      .run();

    try {
      const reponse = await envoyer(ORIGINE_A);
      const corps = await reponse.text();

      expect(reponse.status).toBe(503);
      expect(JSON.parse(corps)).toEqual({ statut: 'indisponible' });
      expect(messages).toHaveLength(0);
      const traces = JSON.stringify(journaux.flatMap((espion) => espion.mock.calls));
      expect(traces).toContain('[seuil] comptage impossible');
      const secrets = await secretsDeLaBase(db);
      expect(secrets.length).toBeGreaterThan(0);
      for (const secret of [ORIGINE_A, ORIGINE_B, ...secrets]) {
        expect(traces).not.toContain(secret);
        expect(corps).not.toContain(secret);
      }
    } finally {
      await db.prepare('drop trigger if exists panne_seuil_demande_insertion').run();
      await db.prepare('drop trigger if exists panne_seuil_demande_maj').run();
    }
  },
  DELAI_TEST_MS,
);
