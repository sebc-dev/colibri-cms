/**
 * Change 013, ticket 08 — Retirer une demande depuis son détail (`POST /admin/demandes/retrait`).
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale. Les demandes sont semées directement en table ; les nombres se lisent sur l'écran des
 * demandes, la liste et le détail se lisent comme l'éditrice les voit.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

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
  for (const table of ['sessions', 'demandes']) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn('nettoyage D1 ignoré (schéma absent) :', erreur);
    }
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-retrait-demande-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

interface Formulaire {
  id: string;
  nom: string;
}
const GATEAU: Formulaire = { id: 'devis-gateau', nom: 'Devis gâteau' };
const ATELIER: Formulaire = { id: 'devis-atelier', nom: 'Devis atelier' };

let compteur = 0;
async function semerPresente(db: DBLike, f: Formulaire, suite = 'a-renseigner', contact = ''): Promise<string> {
  compteur += 1;
  const id = crypto.randomUUID();
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, ?2, ?3, ?4, 'presente', ?5, 'Page de départ', 4500, ?6, '[]', 'parti')`,
    )
    .bind(id, f.id, f.nom, suite, Date.UTC(2026, 2, 1) + compteur * 60_000, contact === '' ? `c-${String(compteur)}@exemple.fr` : contact)
    .run();
  return id;
}

interface LigneBrute {
  formulaire_id: string;
  formulaire_nom: string;
  suite: string;
  etat: string;
  recue_le: number | null;
  page_titre: string | null;
  total: number | null;
  contact: string | null;
  detail: string | null;
  courriel: string | null;
}

async function ligne(db: DBLike, id: string): Promise<LigneBrute | null> {
  return (await db.prepare('select * from demandes where id = ?1').bind(id).first()) as LigneBrute | null;
}

async function poster(cookie: string | null, corps: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/demandes/retrait`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: ORIGINE,
        ...(cookie ? { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } : {}),
      },
      body: corps,
    }),
  );
}

async function lire(cookie: string, chemin: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${chemin}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
}

function sansBalises(html: string): string {
  return html
    .split('<')
    .map((morceau, i) => (i === 0 ? morceau : morceau.slice(morceau.indexOf('>') + 1)))
    .join(' ')
    .replace(/\s+/g, ' ');
}

async function ecranDesDemandes(cookie: string): Promise<string> {
  const reponse = await lire(cookie, '/admin/demandes');
  expect(reponse.status).toBe(200);
  return sansBalises(await reponse.text());
}

it('SC-08a — retrait ordinaire de la demande de Marie Dupont : elle ne paraît plus dans la liste, la base ne porte plus aucune valeur saisie, ni total, ni page d’origine', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, GATEAU, 'devis-envoye', 'Marie Dupont marie@exemple.fr');
  expect(await ecranDesDemandes(cookie)).toContain('Marie Dupont');

  const reponse = await poster(cookie, JSON.stringify({ ids: [id], motif: 'ordinaire' }));

  expect(reponse.status).toBe(200);
  expect(((await reponse.json()) as { ok: boolean }).ok).toBe(true);
  expect(await ecranDesDemandes(cookie)).not.toContain('Marie Dupont');
  const gardee = await ligne(db, id);
  expect(gardee).toMatchObject({
    etat: 'retiree',
    formulaire_id: 'devis-gateau',
    formulaire_nom: 'Devis gâteau',
    suite: 'devis-envoye',
    recue_le: null,
    page_titre: null,
    total: null,
    contact: null,
    detail: null,
    courriel: null,
  });
  const detail = await lire(cookie, `/admin/demandes/${id}`);
  expect(detail.status).toBe(404);
  expect(await detail.text()).not.toContain('Marie Dupont');
});

it('SC-08a — retrait indésirable : la demande entière est effacée, sans aucune ligne', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, GATEAU, 'commande', 'Pourriel');

  const reponse = await poster(cookie, JSON.stringify({ ids: [id], motif: 'indesirable' }));

  expect(reponse.status).toBe(200);
  expect(await ligne(db, id)).toBeNull();
});

it('SC-08a — cas limites : motif inconnu ou absent, ids vide, deux ids, non textuel : 400 et la demande est intacte', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, GATEAU);
  const autre = await semerPresente(db, GATEAU);
  const avant = await ligne(db, id);

  for (const corps of [
    { ids: [id], motif: 'autre' },
    { ids: [id] },
    { ids: [], motif: 'ordinaire' },
    { ids: [id, autre], motif: 'ordinaire' },
    { ids: [7], motif: 'ordinaire' },
    { ids: id, motif: 'ordinaire' },
  ]) {
    const reponse = await poster(cookie, JSON.stringify(corps));
    expect(reponse.status).toBe(400);
  }
  expect(await ligne(db, id)).toEqual(avant);
  expect((await ligne(db, autre))?.etat).toBe('presente');
});

it('SC-08a — cas limites : une demande déjà retirée ou inconnue est laissée telle quelle', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, GATEAU, 'commande');
  expect((await poster(cookie, JSON.stringify({ ids: [id], motif: 'ordinaire' }))).status).toBe(200);
  const retiree = await ligne(db, id);

  const encore = await poster(cookie, JSON.stringify({ ids: [id], motif: 'indesirable' }));
  const inconnue = await poster(cookie, JSON.stringify({ ids: ['n-existe-pas'], motif: 'ordinaire' }));

  expect(encore.status).toBeLessThan(500);
  expect(inconnue.status).toBeLessThan(500);
  expect(await ligne(db, id)).toEqual(retiree);
  expect(await ligne(db, 'n-existe-pas')).toBeNull();
});

it('SC-08b — renoncer au retrait : rien n’est envoyé, la demande reste dans la liste avec tout son détail et sa suite, et le détail offre « Retirer cette demande »', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, GATEAU, 'devis-envoye', 'Marie Dupont marie@exemple.fr');
  const avant = await ligne(db, id);

  const detail = await lire(cookie, `/admin/demandes/${id}`);

  expect(detail.status).toBe(200);
  const texte = sansBalises(await detail.text());
  expect(texte).toContain('Devis gâteau');
  expect(texte).toContain('Retirer cette demande');
  expect(await ligne(db, id)).toEqual(avant);
  expect(await ecranDesDemandes(cookie)).toContain('Marie Dupont');
});

it('SC-08c — 14 demandes (11 Devis gâteau dont 3 commandes, 3 Devis atelier), deux sans suite de Devis gâteau retirées en ordinaire : 12 demandes, 3 commandes, 2 retirées ; Devis gâteau 9, 3, 2', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const sansSuite: string[] = [];
  for (let i = 0; i < 8; i++) sansSuite.push(await semerPresente(db, GATEAU, 'sans-suite'));
  for (let i = 0; i < 3; i++) await semerPresente(db, GATEAU, 'commande');
  for (let i = 0; i < 3; i++) await semerPresente(db, ATELIER, 'sans-suite');
  expect(await ecranDesDemandes(cookie)).toContain('14 demandes · 3 commandes');

  for (const id of sansSuite.slice(0, 2)) {
    expect((await poster(cookie, JSON.stringify({ ids: [id], motif: 'ordinaire' }))).status).toBe(200);
  }

  const ecran = await ecranDesDemandes(cookie);
  expect(ecran).toContain('12 demandes · 3 commandes · 2 retirées');
  expect(ecran).toMatch(/Devis gâteau 9 3 2/);
  expect(ecran).toMatch(/Devis atelier 3 0 0/);
});

it('SC-08d — retrait ordinaire d’une demande de suite commande : demandes -1, retirées +1, commandes inchangé', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerPresente(db, GATEAU, 'sans-suite');
  const commande = await semerPresente(db, GATEAU, 'commande');
  await semerPresente(db, GATEAU, 'commande');
  expect(await ecranDesDemandes(cookie)).toContain('3 demandes · 2 commandes');
  expect(await ecranDesDemandes(cookie)).not.toContain('retirée');

  const reponse = await poster(cookie, JSON.stringify({ ids: [commande], motif: 'ordinaire' }));

  expect(reponse.status).toBe(200);
  expect(await ecranDesDemandes(cookie)).toContain('2 demandes · 2 commandes · 1 retirée');
  expect((await ligne(db, commande))?.suite).toBe('commande');
});

it('SC-08e — retrait envoyé sans session : refusé en 401, aucune demande ni aucun nombre ne change', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const id = await semerPresente(db, GATEAU, 'commande');
  const avant = await ligne(db, id);
  const nombresAvant = await ecranDesDemandes(cookie);

  const reponse = await poster(null, JSON.stringify({ ids: [id], motif: 'indesirable' }));

  expect(reponse.status).toBe(401);
  expect(await ligne(db, id)).toEqual(avant);
  expect(await ecranDesDemandes(cookie)).toBe(nombresAvant);
});
