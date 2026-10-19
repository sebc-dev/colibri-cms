/**
 * Change 013, ticket 05 — Les nombres du site et de chaque formulaire, en haut de l'écran Demandes.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale. Une retirée ordinaire est une ligne `etat = 'retiree'` aux colonnes visiteur nulles ;
 * une indésirable n'a aucune ligne.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const ROUTE = 'https://example.com/admin/demandes';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
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
  const id = `session-nombres-demandes-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

interface Formulaire {
  formulaireId: string;
  formulaireNom: string;
}
const GATEAU: Formulaire = { formulaireId: 'devis-gateau', formulaireNom: 'Devis gâteau' };
const ATELIER: Formulaire = { formulaireId: 'devis-atelier', formulaireNom: 'Devis atelier' };
const MARIAGE: Formulaire = { formulaireId: 'devis-mariage', formulaireNom: 'Devis mariage' };

let compteur = 0;

async function semerPresente(db: DBLike, f: Formulaire, suite = 'a-renseigner'): Promise<void> {
  compteur += 1;
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, ?2, ?3, ?4, 'presente', ?5, 'Contact', null, ?6, '[]', 'parti')`,
    )
    .bind(crypto.randomUUID(), f.formulaireId, f.formulaireNom, suite, Date.UTC(2026, 2, 1) + compteur * 60_000, `c-${String(compteur)}@exemple.fr`)
    .run();
}

async function semerRetiree(db: DBLike, f: Formulaire, suite = 'sans-suite'): Promise<void> {
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat)
       values (?1, ?2, ?3, ?4, 'retiree')`,
    )
    .bind(crypto.randomUUID(), f.formulaireId, f.formulaireNom, suite)
    .run();
}

async function semerNFois(n: number, semer: () => Promise<void>): Promise<void> {
  for (let i = 0; i < n; i++) await semer();
}

async function ouvrir(requete = ''): Promise<string> {
  const cookie = await semerSession(await assurerSchema());
  const reponse = await exports.default.fetch(
    new Request(`${ROUTE}${requete}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, 'le contenu de l’écran (<main>) devrait être présent').toBeDefined();
  return main ?? '';
}

function sansBalises(html: string): string {
  return html
    .split('<')
    .map((morceau, i) => (i === 0 ? morceau : morceau.slice(morceau.indexOf('>') + 1)))
    .join(' ')
    .replace(/\s+/g, ' ');
}

/** Les cellules (`th`/`td`) de chaque rangée du tableau des formulaires, sans balises. */
function rangeesDuTableau(principal: string): string[][] {
  const tableau = /<table[\s\S]*?<\/table>/.exec(principal)?.[0] ?? '';
  return [...tableau.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map((tr) =>
    [...tr[0].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => sansBalises(c[1]).trim()),
  );
}

async function semerJeuConnu(db: DBLike): Promise<void> {
  await semerNFois(8, () => semerPresente(db, GATEAU));
  await semerNFois(3, () => semerPresente(db, GATEAU, 'commande'));
  await semerNFois(3, () => semerPresente(db, ATELIER, 'sans-suite'));
}

it('SC-05a — onze demandes « Devis gâteau » dont trois commandes et trois « Devis atelier » : 14 demandes · 3 commandes, sans retirées', async () => {
  await semerJeuConnu(await assurerSchema());

  const principal = await ouvrir();

  expect(sansBalises(principal)).toContain('14 demandes · 3 commandes');
  expect(sansBalises(principal)).not.toContain('retirée');
  expect(rangeesDuTableau(principal)).toEqual([
    ['Formulaire', 'Demandes', 'Commandes'],
    ['Devis atelier', '3', '0'],
    ['Devis gâteau', '11', '3'],
  ]);
});

it('SC-05a — cas limite : sans demande, « 0 demande · 0 commande » et aucun tableau', async () => {
  await assurerSchema();

  const principal = await ouvrir();

  expect(sansBalises(principal)).toContain('0 demande · 0 commande');
  expect(principal).not.toContain('<table');
});

it('SC-05a — cas limite : accords au singulier jusqu’à 1, tableau même avec un seul formulaire', async () => {
  const db = await assurerSchema();
  await semerPresente(db, GATEAU, 'commande');

  const principal = await ouvrir();

  expect(sansBalises(principal)).toContain('1 demande · 1 commande');
  expect(sansBalises(principal)).not.toContain('1 demandes');
  expect(rangeesDuTableau(principal)).toEqual([
    ['Formulaire', 'Demandes', 'Commandes'],
    ['Devis gâteau', '1', '1'],
  ]);
});

it('SC-05a — cas limite : une retirée ordinaire fait paraître « · 1 retirée » et la colonne Retirées, et une commande retirée reste comptée', async () => {
  const db = await assurerSchema();
  await semerPresente(db, GATEAU);
  await semerRetiree(db, GATEAU, 'commande');

  const principal = await ouvrir();

  expect(sansBalises(principal)).toContain('1 demande · 1 commande · 1 retirée');
  expect(rangeesDuTableau(principal)).toEqual([
    ['Formulaire', 'Demandes', 'Commandes', 'Retirées'],
    ['Devis gâteau', '1', '1', '1'],
  ]);
});

it('SC-05a — cas limite : un formulaire qui n’a que des retirées est listé avec 0 demande', async () => {
  const db = await assurerSchema();
  await semerPresente(db, GATEAU);
  await semerRetiree(db, ATELIER);

  const principal = await ouvrir();

  expect(rangeesDuTableau(principal)).toEqual([
    ['Formulaire', 'Demandes', 'Commandes', 'Retirées'],
    ['Devis atelier', '0', '0', '1'],
    ['Devis gâteau', '1', '0', '0'],
  ]);
});

it('SC-05a — cas limite : une indésirable (aucune ligne) n’est comptée nulle part', async () => {
  const db = await assurerSchema();
  await semerPresente(db, GATEAU);

  const principal = await ouvrir();

  expect(sansBalises(principal)).toContain('1 demande · 0 commande');
  expect(sansBalises(principal)).not.toContain('retirée');
});

it('SC-05b — sur trois formulaires avec retraits, la somme des formulaires égale le nombre du site', async () => {
  const db = await assurerSchema();
  await semerNFois(5, () => semerPresente(db, GATEAU));
  await semerNFois(2, () => semerPresente(db, GATEAU, 'commande'));
  await semerNFois(4, () => semerPresente(db, ATELIER));
  await semerNFois(1, () => semerPresente(db, MARIAGE, 'commande'));
  await semerNFois(2, () => semerRetiree(db, GATEAU));
  await semerNFois(1, () => semerRetiree(db, ATELIER, 'commande'));
  await semerNFois(3, () => semerRetiree(db, MARIAGE));

  const principal = await ouvrir();

  const [entete, ...lignes] = rangeesDuTableau(principal);
  expect(entete).toEqual(['Formulaire', 'Demandes', 'Commandes', 'Retirées']);
  expect(lignes).toHaveLength(3);
  const somme = (colonne: number): number => lignes.reduce((total, l) => total + Number(l[colonne]), 0);
  expect(sansBalises(principal)).toContain(`${String(somme(1))} demandes · ${String(somme(2))} commandes · ${String(somme(3))} retirées`);
  expect(somme(1)).toBe(12);
  expect(somme(2)).toBe(4);
  expect(somme(3)).toBe(6);
});

it('SC-05c — filtrer sur « Devis atelier » laisse les nombres du site et de chaque formulaire', async () => {
  await semerJeuConnu(await assurerSchema());

  const principal = await ouvrir('?formulaire=devis-atelier');

  expect(sansBalises(principal)).toContain('14 demandes · 3 commandes');
  expect(rangeesDuTableau(principal)).toEqual([
    ['Formulaire', 'Demandes', 'Commandes'],
    ['Devis atelier', '3', '0'],
    ['Devis gâteau', '11', '3'],
  ]);
});

it('SC-05c — passer à la page suivante laisse les nombres de toutes les demandes', async () => {
  const db = await assurerSchema();
  await semerNFois(55, () => semerPresente(db, GATEAU));
  await semerNFois(2, () => semerPresente(db, ATELIER, 'commande'));

  const principal = await ouvrir('?page=2');

  expect(sansBalises(principal)).toContain('57 demandes · 2 commandes');
  expect(rangeesDuTableau(principal)).toEqual([
    ['Formulaire', 'Demandes', 'Commandes'],
    ['Devis atelier', '2', '2'],
    ['Devis gâteau', '55', '0'],
  ]);
});
