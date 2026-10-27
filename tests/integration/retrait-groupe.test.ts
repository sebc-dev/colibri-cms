/**
 * Change 013, ticket 09 — Retirer plusieurs demandes en un geste (`POST /admin/demandes/retrait`, 1 à 50 identifiants).
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
  const id = `session-retrait-groupe-${crypto.randomUUID()}`;
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


async function semerPlusieurs(db: DBLike, f: Formulaire, nombre: number, suite = 'a-renseigner'): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < nombre; i++) ids.push(await semerPresente(db, f, suite));
  return ids;
}

async function poserPanne(db: DBLike, evenement: 'update' | 'delete', id: string): Promise<void> {
  await db
    .prepare(
      `create trigger panne_retrait_groupe before ${evenement} on demandes when old.id = '${id}'
       begin select raise(abort, 'panne simulée'); end`,
    )
    .run();
}

async function leverPanne(db: DBLike): Promise<void> {
  await db.prepare('drop trigger if exists panne_retrait_groupe').run();
}

it('SC-09a — trois demandes sélectionnées, motif indésirable : elles ne paraissent plus dans la liste, la base n’en porte plus rien', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const ids = [
    await semerPresente(db, GATEAU, 'sans-suite', 'Pourriel Un un@exemple.fr'),
    await semerPresente(db, GATEAU, 'sans-suite', 'Pourriel Deux deux@exemple.fr'),
    await semerPresente(db, GATEAU, 'commande', 'Pourriel Trois trois@exemple.fr'),
  ];
  const ecranAvant = await ecranDesDemandes(cookie);
  expect(ecranAvant).toContain('Pourriel Un');

  const reponse = await poster(cookie, JSON.stringify({ ids, motif: 'indesirable' }));

  expect(reponse.status).toBe(200);
  expect(((await reponse.json()) as { ok: boolean }).ok).toBe(true);
  const ecran = await ecranDesDemandes(cookie);
  for (const nom of ['Pourriel Un', 'Pourriel Deux', 'Pourriel Trois']) expect(ecran).not.toContain(nom);
  for (const id of ids) expect(await ligne(db, id)).toBeNull();
});

it('SC-09a — retrait ordinaire groupé : chaque demande ne garde que son formulaire d’origine et sa suite', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const ids = await semerPlusieurs(db, GATEAU, 3, 'devis-envoye');

  const reponse = await poster(cookie, JSON.stringify({ ids, motif: 'ordinaire' }));

  expect(reponse.status).toBe(200);
  for (const id of ids) {
    expect(await ligne(db, id)).toMatchObject({
      etat: 'retiree',
      formulaire_id: 'devis-gateau',
      suite: 'devis-envoye',
      recue_le: null,
      page_titre: null,
      total: null,
      contact: null,
      detail: null,
      courriel: null,
    });
  }
});

it('SC-09a — bornes : 1 et 50 identifiants sont retirés, 0 et 51 sont refusés en 400 sans rien toucher', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const cinquanteEtUne = await semerPlusieurs(db, GATEAU, 51);

  for (const ids of [[], cinquanteEtUne]) {
    expect((await poster(cookie, JSON.stringify({ ids, motif: 'indesirable' }))).status).toBe(400);
  }
  for (const id of cinquanteEtUne) expect((await ligne(db, id))?.etat).toBe('presente');

  expect((await poster(cookie, JSON.stringify({ ids: cinquanteEtUne.slice(0, 50), motif: 'indesirable' }))).status).toBe(200);
  expect(await ligne(db, cinquanteEtUne[0] ?? '')).toBeNull();
  expect((await ligne(db, cinquanteEtUne[50] ?? ''))?.etat).toBe('presente');
  expect((await poster(cookie, JSON.stringify({ ids: [cinquanteEtUne[50]], motif: 'indesirable' }))).status).toBe(200);
  expect(await ligne(db, cinquanteEtUne[50] ?? '')).toBeNull();
});

it('SC-09a — cas limite : un identifiant répété dans le lot : 400, aucune demande n’est touchée', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const [a = '', b = ''] = await semerPlusieurs(db, GATEAU, 2);

  const reponse = await poster(cookie, JSON.stringify({ ids: [a, b, a], motif: 'indesirable' }));

  expect(reponse.status).toBe(400);
  expect((await ligne(db, a))?.etat).toBe('presente');
  expect((await ligne(db, b))?.etat).toBe('presente');
});

it('SC-09a — cas limites : un identifiant inconnu mêlé aux connus n’empêche pas les autres ; une demande déjà retirée reste telle quelle', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const [a = '', b = '', deja = ''] = await semerPlusieurs(db, GATEAU, 3, 'commande');
  expect((await poster(cookie, JSON.stringify({ ids: [deja], motif: 'ordinaire' }))).status).toBe(200);
  const retiree = await ligne(db, deja);

  const reponse = await poster(cookie, JSON.stringify({ ids: [a, 'n-existe-pas', deja, b], motif: 'ordinaire' }));

  expect(reponse.status).toBe(200);
  expect((await ligne(db, a))?.etat).toBe('retiree');
  expect((await ligne(db, b))?.etat).toBe('retiree');
  expect(await ligne(db, deja)).toEqual(retiree);
  expect(await ligne(db, 'n-existe-pas')).toBeNull();
  expect(await ecranDesDemandes(cookie)).toContain('0 demande · 3 commandes · 3 retirées');
});

it('SC-09c — 14 demandes dont deux retirées en un geste : les douze autres restent dans la liste, détail et suite inchangés', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const gardees: string[] = [];
  const suites = ['sans-suite', 'devis-envoye', 'commande', 'a-renseigner'];
  for (let i = 0; i < 14; i++) {
    gardees.push(await semerPresente(db, i % 2 === 0 ? GATEAU : ATELIER, suites[i % 4] ?? 'sans-suite', `Client ${String(i)} c${String(i)}@exemple.fr`));
  }
  const retirees = gardees.splice(0, 2);
  const avant = await Promise.all(gardees.map((id) => ligne(db, id)));

  const reponse = await poster(cookie, JSON.stringify({ ids: retirees, motif: 'indesirable' }));

  expect(reponse.status).toBe(200);
  expect(await Promise.all(gardees.map((id) => ligne(db, id)))).toEqual(avant);
  const ecran = await ecranDesDemandes(cookie);
  expect(ecran).toContain('12 demandes');
  for (let i = 2; i < 14; i++) expect(ecran).toContain(`Client ${String(i)} `);
  for (const id of gardees) {
    const detail = await lire(cookie, `/admin/demandes/${id}`);
    expect(detail.status).toBe(200);
  }
});

it('SC-09d — l’effacement échoue en milieu de lot : 500, aucune des trois n’est retirée, le corps ne porte aucun détail technique', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const ids = await semerPlusieurs(db, GATEAU, 3, 'devis-envoye');
  const avant = await Promise.all(ids.map((id) => ligne(db, id)));

  for (const motif of ['indesirable', 'ordinaire'] as const) {
    await poserPanne(db, motif === 'indesirable' ? 'delete' : 'update', ids[2] ?? '');
    try {
      const reponse = await poster(cookie, JSON.stringify({ ids, motif }));

      expect(reponse.status).toBe(500);
      const texte = await reponse.text();
      expect(texte).not.toMatch(/panne|abort|sqlite|trigger|D1_/i);
    } finally {
      await leverPanne(db);
    }
    expect(await Promise.all(ids.map((id) => ligne(db, id)))).toEqual(avant);
  }
  expect(await ecranDesDemandes(cookie)).toContain('3 demandes');
});

it('SC-09e — 12 demandes, 3 commandes, 2 retirées ; 40 demandes automatisées de Devis gâteau font lire 52 ; retirées en un geste comme indésirables : mêmes nombres qu’avant, pour le site et chaque formulaire', async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const sansSuite = await semerPlusieurs(db, GATEAU, 8, 'sans-suite');
  await semerPlusieurs(db, GATEAU, 3, 'commande');
  await semerPlusieurs(db, ATELIER, 3, 'sans-suite');
  for (const id of sansSuite.slice(0, 2)) {
    expect((await poster(cookie, JSON.stringify({ ids: [id], motif: 'ordinaire' }))).status).toBe(200);
  }
  const avant = await ecranDesDemandes(cookie);
  expect(avant).toContain('12 demandes · 3 commandes · 2 retirées');
  expect(avant).toMatch(/Devis gâteau 9 3 2/);
  expect(avant).toMatch(/Devis atelier 3 0 0/);
  const automatisees = await semerPlusieurs(db, GATEAU, 40);
  expect(await ecranDesDemandes(cookie)).toContain('52 demandes · 3 commandes · 2 retirées');

  const reponse = await poster(cookie, JSON.stringify({ ids: automatisees, motif: 'indesirable' }));

  expect(reponse.status).toBe(200);
  const apres = await ecranDesDemandes(cookie);
  expect(apres).toContain('12 demandes · 3 commandes · 2 retirées');
  expect(apres).toMatch(/Devis gâteau 9 3 2/);
  expect(apres).toMatch(/Devis atelier 3 0 0/);
});

it('SC-09a — retrait envoyé sans session : refusé en 401, aucune des demandes ne change', async () => {
  const db = await assurerSchema();
  const ids = await semerPlusieurs(db, GATEAU, 3);
  const avant = await Promise.all(ids.map((id) => ligne(db, id)));

  const reponse = await poster(null, JSON.stringify({ ids, motif: 'indesirable' }));

  expect(reponse.status).toBe(401);
  expect(await Promise.all(ids.map((id) => ligne(db, id)))).toEqual(avant);
});
