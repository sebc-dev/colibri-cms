/**
 * Change 013, ticket 04 — Filtrer la liste par formulaire d'origine, et la parcourir par pages de 50.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale. Session et demandes sont semées directement en table.
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
  const id = `session-filtre-demandes-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

interface Semence {
  formulaireId: string;
  formulaireNom: string;
  recueLe: number;
  contact: string;
}

async function semer(db: DBLike, s: Semence): Promise<void> {
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, ?2, ?3, 'a-renseigner', 'presente', ?4, 'Contact', null, ?5, '[]', 'parti')`,
    )
    .bind(crypto.randomUUID(), s.formulaireId, s.formulaireNom, s.recueLe, s.contact)
    .run();
}

async function semerRetiree(db: DBLike, formulaireId: string, formulaireNom: string): Promise<void> {
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat)
       values (?1, ?2, ?3, 'sans-suite', 'retiree')`,
    )
    .bind(crypto.randomUUID(), formulaireId, formulaireNom)
    .run();
}

const GATEAU = { formulaireId: 'devis-gateau', formulaireNom: 'Devis gâteau' };
const ATELIER = { formulaireId: 'devis-atelier', formulaireNom: 'Devis atelier' };

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

function liensVersLeDetail(principal: string): string[] {
  return [...principal.matchAll(/href="\/admin\/demandes\/[^"]+"/g)].map((m) => m[0]);
}

/** Les contacts « c-NNN@exemple.fr » listés, dans l'ordre de la page. */
function contactsListes(principal: string): string[] {
  return [...principal.matchAll(/c-(\d+)@exemple\.fr/g)].map((m) => m[0]);
}

/** Les balises `<a>` du texte, avec leur libellé. */
function liens(principal: string): { balise: string; libelle: string }[] {
  return [...principal.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    balise: m[1],
    libelle: sansBalises(m[2]).trim(),
  }));
}

function lienDe(principal: string, libelle: string): string {
  const lien = liens(principal).find((l) => l.libelle === libelle);
  expect(lien, `un lien « ${libelle} » devrait être présent`).toBeDefined();
  return lien?.balise ?? '';
}

function href(balise: string): string {
  return (/href="([^"]*)"/.exec(balise)?.[1] ?? '').replace(/&amp;/g, '&');
}

/** Le `<li>` qui contient le texte donné. */
function ligneDe(principal: string, texte: string): string {
  const ligne = [...principal.matchAll(/<li\b[\s\S]*?<\/li>/g)].map((m) => m[0]).find((l) => l.includes(texte));
  expect(ligne, `une ligne contenant ${texte} devrait être présente`).toBeDefined();
  return ligne ?? '';
}

async function semerDeuxFormulaires(db: DBLike): Promise<void> {
  await semer(db, { ...GATEAU, recueLe: Date.UTC(2026, 2, 1, 10), contact: 'c-001@exemple.fr' });
  await semer(db, { ...ATELIER, recueLe: Date.UTC(2026, 2, 2, 10), contact: 'c-002@exemple.fr' });
  await semer(db, { ...GATEAU, recueLe: Date.UTC(2026, 2, 3, 10), contact: 'c-003@exemple.fr' });
  await semer(db, { ...ATELIER, recueLe: Date.UTC(2026, 2, 4, 10), contact: 'c-004@exemple.fr' });
}

/** Sème `nombre` demandes, une par minute ; c-000 est la plus ancienne. */
async function semerEspacees(db: DBLike, nombre: number, base: Omit<Semence, 'recueLe' | 'contact'> = GATEAU): Promise<void> {
  for (let i = 0; i < nombre; i++) {
    await semer(db, {
      ...base,
      recueLe: Date.UTC(2026, 0, 1) + i * 60_000,
      contact: `c-${String(i).padStart(3, '0')}@exemple.fr`,
    });
  }
}

it('SC-04a — choisir « Devis atelier » ne montre que ses demandes, de la plus récente à la plus ancienne', async () => {
  await semerDeuxFormulaires(await assurerSchema());

  const principal = await ouvrir('?formulaire=devis-atelier');

  expect(contactsListes(principal)).toEqual(['c-004@exemple.fr', 'c-002@exemple.fr']);
  expect(liensVersLeDetail(principal)).toHaveLength(2);
});

it('SC-04a — la rangée « Formulaire : » propose « Tous » et un lien par formulaire, le courant marqué aria-current', async () => {
  await semerDeuxFormulaires(await assurerSchema());

  const principal = await ouvrir('?formulaire=devis-atelier');

  expect(sansBalises(principal)).toContain('Formulaire :');
  expect(href(lienDe(principal, 'Devis gâteau'))).toContain('formulaire=devis-gateau');
  const atelier = lienDe(principal, 'Devis atelier');
  expect(href(atelier)).toContain('formulaire=devis-atelier');
  expect(atelier).toContain('aria-current');
  expect(lienDe(principal, 'Tous')).not.toContain('aria-current');
  expect(lienDe(principal, 'Devis gâteau')).not.toContain('aria-current');
});

it('SC-04b — depuis « Devis atelier », le lien « Tous » rend de nouveau les demandes de tous les formulaires', async () => {
  await semerDeuxFormulaires(await assurerSchema());
  const filtree = await ouvrir('?formulaire=devis-atelier');
  expect(liensVersLeDetail(filtree)).toHaveLength(2);

  const lienTous = href(lienDe(filtree, 'Tous'));
  expect(lienTous).not.toContain('formulaire=');
  const principal = await ouvrir(lienTous.includes("?") ? lienTous.slice(lienTous.indexOf("?")) : "");

  expect(contactsListes(principal)).toEqual(['c-004@exemple.fr', 'c-003@exemple.fr', 'c-002@exemple.fr', 'c-001@exemple.fr']);
  expect(lienDe(principal, 'Tous')).toContain('aria-current');
});

it('SC-04c — 120 demandes : 50 plus récentes en page 1, des liens vers la suite, 20 plus anciennes en page 3', async () => {
  await semerEspacees(await assurerSchema(), 120);

  const page1 = await ouvrir();
  const contacts1 = contactsListes(page1);
  expect(contacts1).toHaveLength(50);
  expect(contacts1[0]).toBe('c-119@exemple.fr');
  expect(contacts1[49]).toBe('c-070@exemple.fr');
  expect(sansBalises(page1)).toContain('Page 1 sur 3');
  expect(href(lienDe(page1, 'Demandes plus anciennes'))).toContain('page=2');
  expect(liens(page1).some((l) => l.libelle === 'Demandes plus récentes')).toBe(false);

  const page2 = await ouvrir('?page=2');
  expect(contactsListes(page2)[0]).toBe('c-069@exemple.fr');
  expect(sansBalises(page2)).toContain('Page 2 sur 3');
  expect(href(lienDe(page2, 'Demandes plus récentes'))).toBe('/admin/demandes');
  expect(href(lienDe(page2, 'Demandes plus anciennes'))).toBe('/admin/demandes?page=3');

  const page3 = await ouvrir('?page=3');
  expect(href(lienDe(page3, 'Demandes plus récentes'))).toBe('/admin/demandes?page=2');
  const contacts3 = contactsListes(page3);
  expect(contacts3).toHaveLength(20);
  expect(contacts3[0]).toBe('c-019@exemple.fr');
  expect(contacts3[19]).toBe('c-000@exemple.fr');
  expect(sansBalises(page3)).toContain('Page 3 sur 3');
  expect(liens(page3).some((l) => l.libelle === 'Demandes plus anciennes')).toBe(false);
});

it('SC-04d — un formulaire que le site ne porte plus : ses demandes restent listées sous son nom et le filtre le propose', async () => {
  const db = await assurerSchema();
  await semer(db, { ...GATEAU, recueLe: Date.UTC(2026, 2, 1, 10), contact: 'c-001@exemple.fr' });
  await semer(db, { formulaireId: 'ancien-devis', formulaireNom: 'Ancien devis', recueLe: Date.UTC(2026, 2, 2, 10), contact: 'c-002@exemple.fr' });

  const toutes = await ouvrir();
  const ligne = ligneDe(toutes, 'c-002@exemple.fr');
  expect(contactsListes(toutes)).toContain('c-002@exemple.fr');
  expect(sansBalises(ligne)).toContain('Ancien devis');
  expect(href(lienDe(toutes, 'Ancien devis'))).toContain('formulaire=ancien-devis');

  const filtree = await ouvrir('?formulaire=ancien-devis');
  expect(contactsListes(filtree)).toEqual(['c-002@exemple.fr']);
});

it('SC-04d — cas limite : un formulaire dont il ne reste que des demandes retirées n’est pas proposé', async () => {
  const db = await assurerSchema();
  await semer(db, { ...GATEAU, recueLe: Date.UTC(2026, 2, 1, 10), contact: 'c-001@exemple.fr' });
  await semerRetiree(db, 'devis-atelier', 'Devis atelier');

  const principal = await ouvrir();

  expect(liens(principal).some((l) => l.libelle === 'Devis atelier')).toBe(false);
  expect(principal).not.toContain('formulaire=devis-atelier');
});

it('SC-04a — cas limite : sans aucune demande, le filtre est absent', async () => {
  await assurerSchema();

  const principal = await ouvrir();

  expect(sansBalises(principal)).not.toContain('Formulaire :');
  expect(liens(principal).some((l) => l.libelle === 'Tous')).toBe(false);
});

it('SC-04a — cas limite : un formulaire inconnu est ignoré, toutes les demandes sont listées', async () => {
  await semerDeuxFormulaires(await assurerSchema());

  for (const inconnu of ['?formulaire=n-existe-pas', "?formulaire=x'%20or%201=1%20--"]) {
    const principal = await ouvrir(inconnu);
    expect(liensVersLeDetail(principal), inconnu).toHaveLength(4);
    expect(lienDe(principal, 'Tous'), inconnu).toContain('aria-current');
  }
});

it('SC-04c — cas limite : 50 demandes tiennent sur une page, sans lien vers d’autres pages', async () => {
  await semerEspacees(await assurerSchema(), 50);

  const principal = await ouvrir();

  expect(liensVersLeDetail(principal)).toHaveLength(50);
  expect(liens(principal).some((l) => l.libelle === 'Demandes plus anciennes')).toBe(false);
  expect(liens(principal).some((l) => l.libelle === 'Demandes plus récentes')).toBe(false);
});

it('SC-04c — cas limite : 51 demandes, la plus ancienne seule en page 2', async () => {
  await semerEspacees(await assurerSchema(), 51);

  const page1 = await ouvrir();
  expect(liensVersLeDetail(page1)).toHaveLength(50);
  expect(sansBalises(page1)).toContain('Page 1 sur 2');
  expect(href(lienDe(page1, 'Demandes plus anciennes'))).toContain('page=2');

  const page2 = await ouvrir('?page=2');
  expect(contactsListes(page2)).toEqual(['c-000@exemple.fr']);
});

it('SC-04c — cas limite : page 0, -1 ou abc mène à la première, au-delà de la fin à la dernière', async () => {
  await semerEspacees(await assurerSchema(), 120);

  for (const invalide of ['0', '-1', 'abc']) {
    const principal = await ouvrir(`?page=${invalide}`);
    expect(contactsListes(principal)[0], `page=${invalide}`).toBe('c-119@exemple.fr');
    expect(sansBalises(principal)).toContain('Page 1 sur 3');
  }
  const audela = await ouvrir('?page=99');
  expect(contactsListes(audela)).toHaveLength(20);
  expect(sansBalises(audela)).toContain('Page 3 sur 3');
});

it('SC-04c — cas limite : filtre et page ensemble, le comptage suit le filtre et les liens de pages le gardent', async () => {
  const db = await assurerSchema();
  await semerEspacees(db, 60, ATELIER);
  for (let i = 0; i < 50; i++) {
    await semer(db, { ...GATEAU, recueLe: Date.UTC(2026, 5, 1) + i * 60_000, contact: `g-${String(i)}@exemple.fr` });
  }

  const page1 = await ouvrir('?formulaire=devis-atelier');
  expect(liensVersLeDetail(page1)).toHaveLength(50);
  expect(page1).not.toContain('g-0@exemple.fr');
  expect(sansBalises(page1)).toContain('Page 1 sur 2');
  const suivante = href(lienDe(page1, 'Demandes plus anciennes'));
  expect(suivante).toContain('formulaire=devis-atelier');
  expect(suivante).toContain('page=2');

  const page2 = await ouvrir('?formulaire=devis-atelier&page=2');
  expect(liensVersLeDetail(page2)).toHaveLength(10);
  expect(href(lienDe(page2, 'Demandes plus récentes'))).toBe('/admin/demandes?formulaire=devis-atelier');

  const audela = await ouvrir('?formulaire=devis-atelier&page=99');
  expect(liensVersLeDetail(audela)).toHaveLength(10);
  expect(sansBalises(audela)).toContain('Page 2 sur 2');
});

it('SC-04c — cas limite : sous un filtre qui tient sur une page, aucune pagination ne paraît', async () => {
  const db = await assurerSchema();
  await semerEspacees(db, 10, ATELIER);
  for (let i = 0; i < 120; i++) {
    await semer(db, { ...GATEAU, recueLe: Date.UTC(2026, 5, 1) + i * 60_000, contact: `g-${String(i)}@exemple.fr` });
  }

  const principal = await ouvrir('?formulaire=devis-atelier');

  expect(liensVersLeDetail(principal)).toHaveLength(10);
  expect(sansBalises(principal)).not.toContain('Page 1 sur');
  expect(liens(principal).some((l) => l.libelle === 'Demandes plus anciennes')).toBe(false);
});

it('SC-04d — le nom d’un formulaire déclaré vient de la déclaration, celui d’un formulaire retiré de sa demande la plus récente', async () => {
  const db = await assurerSchema();
  await semer(db, { formulaireId: 'devis-atelier', formulaireNom: 'Atelier (ancien nom)', recueLe: Date.UTC(2026, 2, 1, 10), contact: 'c-001@exemple.fr' });
  await semer(db, { formulaireId: 'ancien-devis', formulaireNom: 'Ancien devis v1', recueLe: Date.UTC(2026, 2, 2, 10), contact: 'c-002@exemple.fr' });
  await semer(db, { formulaireId: 'ancien-devis', formulaireNom: 'Ancien devis', recueLe: Date.UTC(2026, 2, 3, 10), contact: 'c-003@exemple.fr' });

  const principal = await ouvrir();

  expect(href(lienDe(principal, 'Devis atelier'))).toContain('formulaire=devis-atelier');
  expect(liens(principal).some((l) => l.libelle === 'Atelier (ancien nom)')).toBe(false);
  expect(href(lienDe(principal, 'Ancien devis'))).toContain('formulaire=ancien-devis');
  expect(liens(principal).some((l) => l.libelle === 'Ancien devis v1')).toBe(false);
});

it('SC-04d — cas limite : sur chaque ligne, un formulaire se lit sous le même nom que dans le filtre', async () => {
  const db = await assurerSchema();
  await semer(db, { formulaireId: 'devis-atelier', formulaireNom: 'Atelier (ancien nom)', recueLe: Date.UTC(2026, 2, 1, 10), contact: 'c-001@exemple.fr' });
  await semer(db, { formulaireId: 'ancien-devis', formulaireNom: 'Ancien devis v1', recueLe: Date.UTC(2026, 2, 2, 10), contact: 'c-002@exemple.fr' });
  await semer(db, { formulaireId: 'ancien-devis', formulaireNom: 'Ancien devis', recueLe: Date.UTC(2026, 2, 3, 10), contact: 'c-003@exemple.fr' });

  const principal = await ouvrir();

  const declare = sansBalises(ligneDe(principal, 'c-001@exemple.fr'));
  expect(declare).toContain('Devis atelier');
  expect(declare).not.toContain('Atelier (ancien nom)');
  const retire = sansBalises(ligneDe(principal, 'c-002@exemple.fr'));
  expect(retire).toContain('Ancien devis');
  expect(retire).not.toContain('Ancien devis v1');
});
