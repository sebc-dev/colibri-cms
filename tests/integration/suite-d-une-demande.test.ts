/**
 * Change 013, ticket 07 — Noter la suite d'une demande (`POST /admin/demandes/<id>/suite`).
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale. Les demandes sont semées directement en table ; la panne D1 est un déclencheur
 * `raise(abort)` sur la mise à jour de `demandes`, posé puis retiré.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';
import { TEXTE_SUITE_DEMANDE, TEXTES_SUITE_DEMANDE, TEXTE_SUITE_NON_ENREGISTREE } from '../../src/admin/textes.ts';

const NOM_COOKIE_SESSION = '__Host-session';
const ORIGINE = 'https://example.com';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; first(): Promise<unknown> };
  run(): Promise<unknown>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
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

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare('alter table sessions add column dernier_usage_le integer').run();
    } catch {
      // déjà ajoutée : sans effet.
    }
    const demandes = await import('../../migrations/0013_demandes.sql?raw');
    for (const requete of separerRequetes(demandes.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  await db.prepare('drop trigger if exists panne_suite').run();
  for (const table of ['sessions', 'demandes']) {
    await db.prepare(`delete from ${table}`).run();
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-suite-demande-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

let compteur = 0;
async function semerPresente(db: DBLike, suite: string): Promise<string> {
  compteur += 1;
  const id = crypto.randomUUID();
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, 'devis-gateau', 'Devis gâteau', ?2, 'presente', ?3, 'Contact', null, ?4, '[]', 'parti')`,
    )
    .bind(id, suite, Date.UTC(2026, 9, 17, 12, 5) + compteur * 60_000, `c-${String(compteur)}@exemple.fr`)
    .run();
  return id;
}

async function semerRetiree(db: DBLike, suite = 'sans-suite'): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(`insert into demandes (id, formulaire_id, formulaire_nom, suite, etat) values (?1, 'devis-gateau', 'Devis gâteau', ?2, 'retiree')`)
    .bind(id, suite)
    .run();
  return id;
}

async function suiteDe(db: DBLike, id: string): Promise<string | undefined> {
  const ligne = (await db.prepare('select suite from demandes where id = ?1').bind(id).first()) as { suite: string } | null;
  return ligne?.suite;
}

async function toutesLesSuites(db: DBLike): Promise<string> {
  const r = (await (db.prepare('select id, suite, etat from demandes order by id') as unknown as { all(): Promise<{ results: unknown[] }> }).all()).results;
  return JSON.stringify(r);
}

async function poster(cookie: string | null, id: string, corps: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/demandes/${id}/suite`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } : {}),
      },
      body: corps,
    }),
  );
}

interface Reponse {
  ok: boolean;
  nombres: { site: { demandes: number; commandes: number; retirees: number } };
}

it('SC-07a — « devis envoyé » choisi : la demande le porte, et le porte toujours une fois l’écran rechargé', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, 'a-renseigner');

  const reponse = await poster(cookie, id, JSON.stringify({ suite: 'devis-envoye' }));

  expect(reponse.status).toBe(200);
  expect(((await reponse.json()) as Reponse).ok).toBe(true);
  expect(await suiteDe(db, id)).toBe('devis-envoye');
  const rechargee = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/demandes/${id}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(rechargee.status).toBe(200);
  const page = await rechargee.text();
  expect(page).toContain(`${TEXTE_SUITE_DEMANDE} : ${TEXTES_SUITE_DEMANDE['devis-envoye'] ?? ''}`);
  expect(page).not.toContain(`${TEXTE_SUITE_DEMANDE} : ${TEXTES_SUITE_DEMANDE['a-renseigner'] ?? ''}`);
});

it('SC-07a — « sans suite » se choisit aussi, et « à renseigner » est refusé', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, 'devis-envoye');

  expect((await poster(cookie, id, JSON.stringify({ suite: 'sans-suite' }))).status).toBe(200);
  expect(await suiteDe(db, id)).toBe('sans-suite');
  expect((await poster(cookie, id, JSON.stringify({ suite: 'a-renseigner' }))).status).toBe(400);
  expect(await suiteDe(db, id)).toBe('sans-suite');
});

it('SC-07a — valeur inconnue, absente, non textuelle ou corps illisible : refusés en 400, rien ne change', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, 'devis-envoye');

  for (const corps of [JSON.stringify({ suite: 'perdue' }), '{}', JSON.stringify({ suite: 3 }), JSON.stringify({ suite: null }), '{pas du json']) {
    expect((await poster(cookie, id, corps)).status).toBe(400);
  }
  expect(await suiteDe(db, id)).toBe('devis-envoye');
});

it('SC-07a — corps trop gros : 413, demande inconnue : 404', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, 'devis-envoye');

  expect((await poster(cookie, id, JSON.stringify({ suite: 'commande', bourrage: 'x'.repeat(200_000) }))).status).toBe(413);
  expect((await poster(cookie, 'demande-inconnue', JSON.stringify({ suite: 'commande' }))).status).toBe(404);
  expect(await suiteDe(db, id)).toBe('devis-envoye');
});

it('SC-07b — « commande » choisi après « devis envoyé » : la demande porte « commande », et le nombre de commandes la compte', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, 'a-renseigner');
  await semerPresente(db, 'commande');
  await poster(cookie, id, JSON.stringify({ suite: 'devis-envoye' }));

  const reponse = await poster(cookie, id, JSON.stringify({ suite: 'commande' }));

  expect(reponse.status).toBe(200);
  const json = (await reponse.json()) as Reponse;
  expect(await suiteDe(db, id)).toBe('commande');
  expect(json.nombres.site.commandes).toBe(2);
  expect(json.nombres.site.demandes).toBe(2);
});

it('SC-07c — l’enregistrement n’aboutit pas : la demande garde sa suite, et le message est sans terme de développeur', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, 'devis-envoye');
  await db
    .prepare("create trigger panne_suite before update on demandes begin select raise(abort, 'panne'); end")
    .run();

  let reponse: Response;
  try {
    reponse = await poster(cookie, id, JSON.stringify({ suite: 'commande' }));
  } finally {
    await db.prepare('drop trigger if exists panne_suite').run();
  }

  expect(reponse.status).toBe(500);
  const corps = await reponse.text();
  expect((JSON.parse(corps) as { ok: boolean }).ok).toBe(false);
  expect(corps).not.toMatch(/panne|abort|sqlite|d1_error|stack/i);
  expect(await suiteDe(db, id)).toBe('devis-envoye');
  expect(TEXTE_SUITE_NON_ENREGISTREE).toBe("La suite n'a pas pu être enregistrée. Réessayez dans quelques instants.");
  expect(TEXTE_SUITE_NON_ENREGISTREE).not.toMatch(/erreur|http|serveur|base de donn|500|d1|json|api/i);
});

it('SC-07d — suite envoyée pour une demande retirée : refusée en 404, rien ne change dans les nombres', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const retiree = await semerRetiree(db, 'sans-suite');
  const presente = await semerPresente(db, 'devis-envoye');
  const avant = await toutesLesSuites(db);

  const reponse = await poster(cookie, retiree, JSON.stringify({ suite: 'commande' }));

  expect(reponse.status).toBe(404);
  expect(await toutesLesSuites(db)).toBe(avant);
  const suivante = (await (await poster(cookie, presente, JSON.stringify({ suite: 'devis-envoye' }))).json()) as Reponse;
  expect(suivante.nombres.site).toEqual({ demandes: 1, commandes: 0, retirees: 1 });
});

it('SC-07e — suite envoyée sans session ouverte : refusée en 401, aucune demande ne change', async () => {
  const db = await assurerSchema();
  const id = await semerPresente(db, 'devis-envoye');
  const avant = await toutesLesSuites(db);

  const sansCookie = await poster(null, id, JSON.stringify({ suite: 'commande' }));
  const cookieInconnu = await poster('session-inconnue', id, JSON.stringify({ suite: 'commande' }));

  expect(sansCookie.status).toBe(401);
  expect(cookieInconnu.status).toBe(401);
  expect(await toutesLesSuites(db)).toBe(avant);
});
