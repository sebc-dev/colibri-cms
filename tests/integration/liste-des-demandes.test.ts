/**
 * Change 013, ticket 03 — La rubrique « Demandes » mène à la liste des demandes.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale. Session et demandes sont semées directement en table (jamais par horloge simulée).
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const ORIGINE = 'https://example.com';
const ROUTE = `${ORIGINE}/admin/demandes`;
const RUBRIQUES = [
  '/admin/mes-pages',
  '/admin/medias',
  '/admin/reglages',
  '/admin/formulaires',
  '/admin/demandes',
];

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}

interface Semence {
  id?: string;
  recueLe?: number;
  formulaireNom?: string;
  pageTitre?: string;
  total?: number | null;
  contact?: string;
  suite?: 'a-renseigner' | 'sans-suite' | 'devis-envoye' | 'commande';
  courriel?: 'parti' | 'non-parti';
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
  const id = `session-liste-des-demandes-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      'insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)',
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function semerDemande(db: DBLike, s: Semence): Promise<string> {
  const id = s.id ?? crypto.randomUUID();
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, 'devis-gateau', ?2, ?7, 'presente', ?3, ?4, ?5, ?6, '[]', ?8)`,
    )
    .bind(
      id,
      s.formulaireNom ?? 'Devis gâteau',
      s.recueLe ?? Date.UTC(2026, 2, 4, 13, 30),
      s.pageTitre ?? 'Contact',
      s.total ?? null,
      s.contact ?? 'marie@exemple.fr',
      s.suite ?? 'a-renseigner',
      s.courriel ?? 'parti',
    )
    .run();
  return id;
}

/** Une demande retirée : seules les colonnes qui survivent au retrait restent (migration 0013). */
async function semerDemandeRetiree(db: DBLike, id: string, formulaireNom: string): Promise<void> {
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat)
       values (?1, 'devis-atelier', ?2, 'sans-suite', 'retiree')`,
    )
    .bind(id, formulaireNom)
    .run();
}

async function ouvrir(route = ROUTE): Promise<Response> {
  const cookie = await semerSession(await assurerSchema());
  return exports.default.fetch(
    new Request(route, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
}

async function ouvrirEnSession(): Promise<string> {
  const reponse = await ouvrir();
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function sansBalises(html: string): string {
  return html
    .split('<')
    .map((morceau, i) => (i === 0 ? morceau : morceau.slice(morceau.indexOf('>') + 1)))
    .join(' ');
}

function contenuPrincipal(corps: string): string {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, 'le contenu de l’écran (<main>) devrait être présent').toBeDefined();
  return main ?? '';
}

/** Tous les menus du cadre : la barre latérale puis le tiroir. */
function menus(corps: string): string[] {
  const navs = [...corps.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/g)].map((m) => m[1]);
  expect(navs.length, 'la barre et le tiroir devraient porter chacun le menu').toBeGreaterThanOrEqual(2);
  return navs;
}

/** Les liens vers le détail d'une demande ; celui du menu (`/admin/demandes`) est hors de `<main>`. */
function liensVersLeDetail(principal: string): string[] {
  return [...principal.matchAll(/href="\/admin\/demandes\/[^"]+"/g)].map((m) => m[0]);
}

/** Le texte de la ligne de la liste qui porte cette coordonnée. */
function ligneDe(principal: string, contact: string): string {
  const ligne = principal.split('<li').find((morceau) => morceau.includes(contact));
  expect(ligne, `une ligne devrait porter « ${contact} »`).toBeDefined();
  return sansBalises(ligne ?? '').replace(/\s+/g, ' ');
}

it('SC-03a — trois demandes arrivées lundi, mardi, mercredi : mercredi, puis mardi, puis lundi', async () => {
  const db = await assurerSchema();
  await semerDemande(db, { recueLe: Date.UTC(2026, 2, 2, 10, 0), contact: 'lundi@exemple.fr' });
  await semerDemande(db, { recueLe: Date.UTC(2026, 2, 4, 10, 0), contact: 'mercredi@exemple.fr' });
  await semerDemande(db, { recueLe: Date.UTC(2026, 2, 3, 10, 0), contact: 'mardi@exemple.fr' });

  const principal = contenuPrincipal(await ouvrirEnSession());

  const mercredi = principal.indexOf('mercredi@exemple.fr');
  const mardi = principal.indexOf('mardi@exemple.fr');
  const lundi = principal.indexOf('lundi@exemple.fr');
  expect(mercredi).toBeGreaterThanOrEqual(0);
  expect(mercredi).toBeLessThan(mardi);
  expect(mardi).toBeLessThan(lundi);
});

it('SC-03b — la ligne de Marie Dupont porte date, formulaire, page, e-mail, 40 € et « à renseigner », et mène au détail', async () => {
  const db = await assurerSchema();
  const id = await semerDemande(db, {
    id: 'demande-marie-dupont',
    recueLe: Date.UTC(2026, 2, 4, 13, 30),
    formulaireNom: 'Devis gâteau',
    pageTitre: 'Contact',
    total: 4000,
    contact: 'marie@exemple.fr',
  });

  const principal = contenuPrincipal(await ouvrirEnSession());
  const texte = sansBalises(principal).replace(/\s+/g, ' ');

  expect(texte).toContain('4 mars 2026');
  expect(texte).toContain('14:30');
  expect(texte).toContain('Devis gâteau');
  expect(texte).toContain('Contact');
  expect(texte).toContain('marie@exemple.fr');
  expect(texte).toMatch(/40 €/);
  expect(texte).toMatch(/à renseigner/i);
  expect(principal).toMatch(new RegExp(`<a[^>]*href="/admin/demandes/${id}"`));
});

it('SC-03c — sans demande, l’écran dit qu’aucune demande n’est arrivée, sans terme de développeur', async () => {
  await assurerSchema();

  const principal = contenuPrincipal(await ouvrirEnSession());
  const texte = sansBalises(principal).replace(/\s+/g, ' ');

  expect(texte).toMatch(/Aucune demande n(?:'|’|&#39;|&#x27;)est encore arrivée/);
  const bas = texte.toLowerCase();
  for (const terme of [
    'commit',
    'branche',
    'build',
    'déploiement',
    'endpoint',
    'webhook',
    'backend',
    'framework',
    'slug',
    'json',
    'base de données',
    'table',
    'sql',
  ]) {
    expect(bas, `l’écran ne devrait pas montrer « ${terme} »`).not.toContain(terme);
  }
});

it('SC-03d — une adresse avec <, >, & ou guillemets est affichée comme du texte, sans balisage interprété', async () => {
  const db = await assurerSchema();
  await semerDemande(db, { contact: 'a<b>&"c"@exemple.fr' });

  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(principal).not.toContain('<b>');
  expect(principal).not.toContain('a<b');
  expect(principal).toContain('a&lt;b&gt;&amp;&quot;c&quot;@exemple.fr');
});

it('SC-03e — « Demandes », en barre comme en tiroir, ouvre l’écran Demandes, rubrique marquée active', async () => {
  const corps = await ouvrirEnSession();

  for (const nav of menus(corps)) {
    expect(nav).toMatch(/<a[^>]*href="\/admin\/demandes"/);
    expect(nav.match(/aria-current="page"/g)).toHaveLength(1);
    expect(nav).toMatch(/<a[^>]*href="\/admin\/demandes"[^>]*aria-current="page"/);
  }
  expect(contenuPrincipal(corps)).toContain('<h1');
});

it('SC-03f — chacune des cinq rubriques mène à son écran, aucune autre entrée, aucun geste sur les rubriques', async () => {
  const corps = await ouvrirEnSession();

  for (const nav of menus(corps)) {
    const hrefs = [...nav.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(RUBRIQUES);
    expect(nav).not.toMatch(/<(button|form|input)[\s>]/i);
    const bas = sansBalises(nav).toLowerCase();
    for (const geste of ['ajouter', 'créer', 'supprimer', 'retirer', 'renommer', 'déplacer']) {
      expect(bas, `le menu ne devrait pas offrir « ${geste} »`).not.toContain(geste);
    }
  }
  for (const rubrique of RUBRIQUES) {
    const reponse = await ouvrir(`${ORIGINE}${rubrique}`);
    expect(reponse.status, `${rubrique} devrait ouvrir son écran`).toBe(200);
  }
});

it('SC-03g — sans session, l’écran renvoie à la connexion sans aucune donnée de demande', async () => {
  const db = await assurerSchema();
  await semerDemande(db, { contact: 'secret-visiteur@exemple.fr', formulaireNom: 'Devis secret' });

  const reponse = await exports.default.fetch(new Request(ROUTE, { redirect: 'manual' }));

  expect(reponse.status).toBeGreaterThanOrEqual(300);
  expect(reponse.status).toBeLessThan(400);
  expect(reponse.headers.get('location') ?? '').toContain('/admin/connexion');
  const corps = await reponse.text();
  expect(corps).not.toContain('secret-visiteur@exemple.fr');
  expect(corps).not.toContain('Devis secret');
});

/** Sème `nombre` demandes, une par minute ; la plus récente est la dernière, `demande-<nombre - 1>`. */
async function semerDemandesEspacees(db: DBLike, nombre: number): Promise<void> {
  for (let i = 0; i < nombre; i++) {
    await semerDemande(db, {
      recueLe: Date.UTC(2026, 0, 1) + i * 60_000,
      contact: `demande-${String(i).padStart(2, '0')}@exemple.fr`,
    });
  }
}

it('SC-03a — cas limite : une demande retirée n’apparaît pas dans la liste', async () => {
  const db = await assurerSchema();
  await semerDemande(db, { contact: 'presente@exemple.fr' });
  await semerDemandeRetiree(db, 'demande-retiree', 'Devis atelier');

  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(principal).toContain('presente@exemple.fr');
  expect(principal).not.toContain('Devis atelier');
  expect(principal).not.toContain('href="/admin/demandes/demande-retiree"');
  expect(liensVersLeDetail(principal)).toHaveLength(1);
});

it('SC-03a — cas limite : 50 demandes présentes paraissent toutes', async () => {
  await semerDemandesEspacees(await assurerSchema(), 50);

  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(liensVersLeDetail(principal)).toHaveLength(50);
  expect(principal).toContain('demande-00@exemple.fr');
  expect(principal).toContain('demande-49@exemple.fr');
});

it('SC-03a — cas limite : 51 demandes présentes, les 50 plus récentes paraissent et la plus ancienne non', async () => {
  await semerDemandesEspacees(await assurerSchema(), 51);

  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(liensVersLeDetail(principal)).toHaveLength(50);
  expect(principal).toContain('demande-50@exemple.fr');
  expect(principal).toContain('demande-01@exemple.fr');
  expect(principal).not.toContain('demande-00@exemple.fr');
});

it('SC-03a — cas limite : deux demandes de la même milliseconde gardent leur ordre, la dernière gardée d’abord', async () => {
  const db = await assurerSchema();
  const recueLe = Date.UTC(2026, 2, 4, 10, 0);
  await semerDemande(db, { recueLe, contact: 'premiere@exemple.fr' });
  await semerDemande(db, { recueLe, contact: 'seconde@exemple.fr' });

  for (let ouverture = 0; ouverture < 2; ouverture++) {
    const principal = contenuPrincipal(await ouvrirEnSession());
    const seconde = principal.indexOf('seconde@exemple.fr');
    expect(seconde).toBeGreaterThanOrEqual(0);
    expect(seconde).toBeLessThan(principal.indexOf('premiere@exemple.fr'));
  }
});

it('SC-03b — cas limite : une demande sans prix n’affiche aucun total', async () => {
  const db = await assurerSchema();
  await semerDemande(db, { total: null, contact: 'sans-prix@exemple.fr' });

  const ligne = ligneDe(contenuPrincipal(await ouvrirEnSession()), 'sans-prix@exemple.fr');

  expect(ligne).not.toContain('€');
});

it('SC-03b — cas limite : la pastille « E-mail non parti » ne marque que la demande dont l’e-mail n’est pas parti', async () => {
  const db = await assurerSchema();
  await semerDemande(db, { courriel: 'non-parti', contact: 'en-attente@exemple.fr', recueLe: Date.UTC(2026, 2, 4, 10, 0) });
  await semerDemande(db, { courriel: 'parti', contact: 'envoye@exemple.fr', recueLe: Date.UTC(2026, 2, 3, 10, 0) });

  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(ligneDe(principal, 'en-attente@exemple.fr')).toContain('E-mail non parti');
  expect(ligneDe(principal, 'envoye@exemple.fr')).not.toContain('E-mail non parti');
  expect(sansBalises(principal).split('E-mail non parti')).toHaveLength(2);
});

it('SC-03b — cas limite : une coordonnée par téléphone, et chaque suite dite en texte sur sa ligne', async () => {
  const db = await assurerSchema();
  const lignes = [
    { suite: 'sans-suite', contact: '06 12 34 56 78', texte: 'Sans suite' },
    { suite: 'devis-envoye', contact: 'b@exemple.fr', texte: 'Devis envoyé' },
    { suite: 'commande', contact: 'c@exemple.fr', texte: 'Commande' },
    { suite: 'a-renseigner', contact: 'd@exemple.fr', texte: 'À renseigner' },
  ] as const;
  for (const [i, l] of lignes.entries()) {
    await semerDemande(db, { suite: l.suite, contact: l.contact, recueLe: Date.UTC(2026, 2, 4 - i, 10, 0) });
  }

  const principal = contenuPrincipal(await ouvrirEnSession());

  for (const l of lignes) {
    expect(ligneDe(principal, l.contact), `la ligne de ${l.contact} devrait dire « ${l.texte} »`).toContain(l.texte);
  }
});
