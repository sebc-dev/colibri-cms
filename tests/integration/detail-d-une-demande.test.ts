/**
 * Change 013, ticket 06 — Le détail d'une demande (`/admin/demandes/<id>`).
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale. Session et demandes sont semées directement en table. Le seul double de SC-06h est le
 * dépôt simulé en mémoire de la publication.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import { calculerEtatPublication, confirmerPublication, poursuivrePublication } from '../../src/platform/publication/publier.ts';
import { NOM_COOKIE_SESSION, assurerSchema as assurerSchemaPublication, exigerPresent, lecteurDesOriginales, nettoyer, semerBrouillonReglage, semerSession, type DBLike } from './outils-publication.ts';

const ORIGINE = 'https://example.com';
const RUBRIQUES = ['/admin/mes-pages', '/admin/medias', '/admin/reglages', '/admin/formulaires', '/admin/demandes'];

interface Semence {
  id?: string;
  recueLe?: number;
  formulaireNom?: string;
  pageTitre?: string;
  total?: number | null;
  contact?: string;
  suite?: 'a-renseigner' | 'sans-suite' | 'devis-envoye' | 'commande';
  courriel?: 'parti' | 'non-parti';
  detail?: string;
}

const DETAIL_MARIE = JSON.stringify([
  { etiquette: 'Parfum', options: [{ libelle: 'Fraise', prix: 1000 }] },
  { etiquette: 'Nombre de parts', options: [{ libelle: '10 parts', prix: 3000 }] },
  { etiquette: 'Occasion', options: [{ libelle: 'Anniversaire' }] },
  { etiquette: 'Votre nom', valeur: 'Marie Dupont' },
  { etiquette: 'Votre adresse e-mail', valeur: 'marie@exemple.fr' },
]);

function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let demandesPretes: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = await assurerSchemaPublication();
  demandesPretes ??= (async () => {
    const demandes = await import('../../migrations/0013_demandes.sql?raw');
    for (const requete of separerRequetes(demandes.default)) {
      await db.prepare(requete).run();
    }
  })();
  await demandesPretes;
  return db;
}

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(async () => {
  await nettoyer();
  await (env as unknown as { DB: DBLike }).DB.prepare('delete from demandes').run();
});

async function semerDemande(db: DBLike, s: Semence): Promise<string> {
  const id = s.id ?? crypto.randomUUID();
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, 'devis-gateau', ?2, ?7, 'presente', ?3, ?4, ?5, ?6, ?9, ?8)`,
    )
    .bind(
      id,
      s.formulaireNom ?? 'Devis gâteau',
      s.recueLe ?? Date.UTC(2026, 9, 17, 12, 5),
      s.pageTitre ?? 'Contact',
      s.total === undefined ? 4000 : s.total,
      s.contact ?? 'marie@exemple.fr',
      s.suite ?? 'a-renseigner',
      s.courriel ?? 'parti',
      s.detail ?? DETAIL_MARIE,
    )
    .run();
  return id;
}

async function semerDemandeRetiree(db: DBLike, id: string, formulaireNom: string): Promise<void> {
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat)
       values (?1, 'devis-atelier', ?2, 'sans-suite', 'retiree')`,
    )
    .bind(id, formulaireNom)
    .run();
}

async function ouvrir(chemin: string): Promise<Response> {
  const cookie = await semerSession(await assurerSchema());
  return exports.default.fetch(new Request(`${ORIGINE}${chemin}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }));
}

async function ouvrirLeDetail(id: string): Promise<string> {
  const reponse = await ouvrir(`/admin/demandes/${id}`);
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

function texteDe(html: string): string {
  return sansBalises(html).replace(/\s+/g, ' ');
}

function menus(corps: string): string[] {
  const navs = [...corps.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/g)].map((m) => m[1]);
  expect(navs.length, 'la barre et le tiroir devraient porter chacun le menu').toBeGreaterThanOrEqual(2);
  return navs;
}

it('SC-06a — la demande de Marie Dupont porte date, formulaire, page, choix, total indicatif, nom et e-mail', async () => {
  const id = await semerDemande(await assurerSchema(), { id: 'demande-marie-detail' });

  const texte = texteDe(contenuPrincipal(await ouvrirLeDetail(id)));

  expect(texte).toContain('17 octobre 2026');
  expect(texte).toContain('14:05');
  expect(texte).toContain('Devis gâteau');
  expect(texte).toContain('Contact');
  expect(texte).toContain('Parfum : Fraise (10 €)');
  expect(texte).toContain('Nombre de parts : 10 parts (30 €)');
  expect(texte).toContain('Occasion : Anniversaire');
  expect(texte).toMatch(/Total indicatif : 40 €/);
  expect(texte).toContain('Votre nom : Marie Dupont');
  expect(texte).toContain('Votre adresse e-mail : marie@exemple.fr');
  expect(texte).toContain('Demande du 17 octobre 2026 à 14:05');
  expect(texte).toContain('← Toutes les demandes');
});

it('SC-06a — cas limite : un formulaire sans prix ne montre aucune ligne de total', async () => {
  const detail = JSON.stringify([{ etiquette: 'Votre nom', valeur: 'Paul' }]);
  const id = await semerDemande(await assurerSchema(), { total: null, detail });

  const texte = texteDe(contenuPrincipal(await ouvrirLeDetail(id)));

  expect(texte).toContain('Votre nom : Paul');
  expect(texte).not.toContain('Total indicatif');
});

it('SC-06a — cas limite : un choix multiple à plusieurs options les montre toutes', async () => {
  const detail = JSON.stringify([{ etiquette: 'Occasion', options: [{ libelle: 'Anniversaire' }, { libelle: 'Mariage' }] }]);
  const id = await semerDemande(await assurerSchema(), { total: null, detail });

  const texte = texteDe(contenuPrincipal(await ouvrirLeDetail(id)));

  expect(texte).toContain('Anniversaire');
  expect(texte).toContain('Mariage');
});

it('SC-06a — cas limite : un détail corrompu en base s’affiche vide, sans erreur', async () => {
  const db = await assurerSchema();
  for (const detail of ['{pas du json', '{"etiquette":"x"}', '[{"etiquette":1}]']) {
    const id = await semerDemande(db, { detail, total: null, contact: 'corrompu@exemple.fr' });

    const reponse = await ouvrir(`/admin/demandes/${id}`);

    expect(reponse.status, `détail « ${detail} »`).toBe(200);
    const texte = texteDe(contenuPrincipal(await reponse.text()));
    expect(texte).toContain('Demande du 17 octobre 2026 à 14:05');
  }
});

it('SC-06b — un texte de trois lignes est présenté en trois lignes l’une sous l’autre, sous « Votre message »', async () => {
  const detail = JSON.stringify([{ etiquette: 'Votre message', lignes: ['Première ligne', 'Deuxième ligne', 'Troisième ligne'] }]);
  const id = await semerDemande(await assurerSchema(), { total: null, detail });

  const principal = contenuPrincipal(await ouvrirLeDetail(id));

  const libelle = principal.indexOf('Votre message');
  expect(libelle).toBeGreaterThanOrEqual(0);
  const premiere = principal.indexOf('Première ligne');
  const deuxieme = principal.indexOf('Deuxième ligne');
  const troisieme = principal.indexOf('Troisième ligne');
  expect(libelle).toBeLessThan(premiere);
  expect(premiere).toBeLessThan(deuxieme);
  expect(deuxieme).toBeLessThan(troisieme);
  for (const ligne of ['Première ligne', 'Deuxième ligne', 'Troisième ligne']) {
    expect(principal, `« ${ligne} » devrait avoir son propre élément`).toMatch(new RegExp(`<(p|div|li|span)[^>]*>\\s*${ligne}\\s*</(p|div|li|span)>`));
  }
});

it('SC-06b — cas limite : une ligne vide au milieu du texte est gardée', async () => {
  const detail = JSON.stringify([{ etiquette: 'Votre message', lignes: ['Avant', '', 'Après'] }]);
  const id = await semerDemande(await assurerSchema(), { total: null, detail });

  const principal = contenuPrincipal(await ouvrirLeDetail(id));

  expect(principal.indexOf('Avant')).toBeLessThan(principal.indexOf('Après'));
  const entre = principal.slice(principal.indexOf('Avant'), principal.indexOf('Après'));
  expect(entre.match(/<(p|div|li|span|br)[\s>/]/g)?.length ?? 0, 'la ligne vide devrait garder sa place').toBeGreaterThanOrEqual(2);
});

it('SC-06c — une demande dont l’e-mail n’a pas pu partir porte la mention', async () => {
  const id = await semerDemande(await assurerSchema(), { courriel: 'non-parti' });

  const texte = texteDe(contenuPrincipal(await ouvrirLeDetail(id)));

  expect(texte).toContain('E-mail non parti');
  expect(texte).toContain('L’e-mail de cette demande n’a pas pu partir');
});

it('SC-06c — cas limite : une demande dont l’e-mail est parti ne porte aucune mention', async () => {
  const id = await semerDemande(await assurerSchema(), { courriel: 'parti' });

  const texte = texteDe(contenuPrincipal(await ouvrirLeDetail(id)));

  expect(texte).not.toContain('E-mail non parti');
  expect(texte).not.toContain('n’a pas pu partir');
});

it('SC-06d — l’adresse d’une demande retirée dit qu’elle n’est plus dans la liste, sans donnée, et mène à la liste', async () => {
  const db = await assurerSchema();
  await semerDemandeRetiree(db, 'demande-retiree-detail', 'Devis atelier secret');

  const reponse = await ouvrir('/admin/demandes/demande-retiree-detail');

  expect(reponse.status).toBe(404);
  const corps = await reponse.text();
  const principal = contenuPrincipal(corps);
  expect(texteDe(principal)).toContain('Cette demande n’est plus dans la liste');
  expect(corps).not.toContain('Devis atelier secret');
  expect(principal).not.toContain('Devis atelier');
  expect(principal).toMatch(/<a[^>]*href="\/admin\/demandes"[^>]*>\s*Revenir aux demandes/);
});

it('SC-06d — cas limite : un identifiant inconnu rend la même réponse 404 que celle d’une demande retirée', async () => {
  const reponse = await ouvrir('/admin/demandes/identifiant-qui-n-existe-pas');

  expect(reponse.status).toBe(404);
  const principal = contenuPrincipal(await reponse.text());
  expect(texteDe(principal)).toContain('Cette demande n’est plus dans la liste');
  expect(principal).toMatch(/href="\/admin\/demandes"/);
});

it('SC-06e — <, >, & et guillemets dans l’e-mail ou « Votre nom » sont du texte, aucun balisage interprété', async () => {
  const detail = JSON.stringify([
    { etiquette: 'Votre nom', valeur: '<b>Marie</b> & "Paul"' },
    { etiquette: 'Votre adresse e-mail', valeur: 'a<i>&"c"@exemple.fr' },
  ]);
  const id = await semerDemande(await assurerSchema(), { detail, contact: 'a<i>&"c"@exemple.fr' });

  const principal = contenuPrincipal(await ouvrirLeDetail(id));

  expect(principal).not.toContain('<b>');
  expect(principal).not.toContain('<i>');
  expect(principal).toContain('&lt;b&gt;Marie&lt;/b&gt; &amp; &quot;Paul&quot;');
  expect(principal).toContain('a&lt;i&gt;&amp;&quot;c&quot;@exemple.fr');
});

it('SC-06e — cas limite : le balisage d’une ligne d’un texte long est affiché comme du texte', async () => {
  const detail = JSON.stringify([{ etiquette: 'Votre message', lignes: ['<script>alert(1)</script>', 'fin'] }]);
  const id = await semerDemande(await assurerSchema(), { detail, total: null });

  const principal = contenuPrincipal(await ouvrirLeDetail(id));

  expect(principal).not.toContain('<script>alert');
  expect(principal).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
});

it('SC-06f — sans session, l’écran renvoie à la connexion sans aucune donnée de demande', async () => {
  const db = await assurerSchema();
  const id = await semerDemande(db, { contact: 'secret-visiteur@exemple.fr', formulaireNom: 'Devis secret' });

  const reponse = await exports.default.fetch(new Request(`${ORIGINE}/admin/demandes/${id}`, { redirect: 'manual' }));

  expect(reponse.status).toBeGreaterThanOrEqual(300);
  expect(reponse.status).toBeLessThan(400);
  expect(reponse.headers.get('location') ?? '').toContain('/admin/connexion');
  const corps = await reponse.text();
  expect(corps).not.toContain('secret-visiteur@exemple.fr');
  expect(corps).not.toContain('Devis secret');
  expect(corps).not.toContain('Marie Dupont');
});

it('SC-06g — sur le détail d’une demande, la barre et le tiroir montrent les cinq rubriques, « Demandes » active', async () => {
  const id = await semerDemande(await assurerSchema(), {});

  const corps = await ouvrirLeDetail(id);

  for (const nav of menus(corps)) {
    const hrefs = [...nav.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(RUBRIQUES);
    expect(nav.match(/aria-current="page"/g)).toHaveLength(1);
    expect(nav).toMatch(/<a[^>]*href="\/admin\/demandes"[^>]*aria-current="page"/);
  }
});

it('SC-06g — cas limite : sur une demande retirée (404), le cadre marque encore « Demandes »', async () => {
  await semerDemandeRetiree(await assurerSchema(), 'demande-retiree-cadre', 'Devis atelier');

  const corps = await (await ouvrir('/admin/demandes/demande-retiree-cadre')).text();

  for (const nav of menus(corps)) {
    expect(nav).toMatch(/<a[^>]*href="\/admin\/demandes"[^>]*aria-current="page"/);
  }
});

it('SC-06g — chaque rubrique marquée active sur son propre écran, la liste des demandes comprise', async () => {
  for (const rubrique of RUBRIQUES) {
    const corps = await (await ouvrir(rubrique)).text();
    for (const nav of menus(corps)) {
      expect(nav.match(/aria-current="page"/g), `${rubrique} : une seule rubrique active`).toHaveLength(1);
      expect(nav).toMatch(new RegExp(`<a[^>]*href="${rubrique}"[^>]*aria-current="page"`));
    }
  }
});

it('SC-06h — des demandes de plus d’un an figurent toujours dans la liste et le détail après une nouvelle demande et une publication', async () => {
  const db = await assurerSchema();
  const ancienne = await semerDemande(db, {
    id: 'demande-ancienne-detail',
    recueLe: Date.now() - 2 * 365 * 24 * 3600 * 1000,
    contact: 'ancienne@exemple.fr',
  });
  const nouvelle = await semerDemande(db, { contact: 'nouvelle@exemple.fr', recueLe: Date.now() });
  const avant = texteDe(contenuPrincipal(await ouvrirLeDetail(ancienne)));

  await semerBrouillonReglage(db, 'coordonnees', { telephone: '04 11 22 33 44' });
  const forge = await ForgeEnMemoire.creer({});
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());
  expect(issue.ok).toBe(true);

  const liste = contenuPrincipal(await (await ouvrir('/admin/demandes')).text());
  expect(liste).toContain('ancienne@exemple.fr');
  expect(liste).toContain('nouvelle@exemple.fr');
  expect(liste).toContain(`href="/admin/demandes/${ancienne}"`);
  expect(liste).toContain(`href="/admin/demandes/${nouvelle}"`);
  const apres = texteDe(contenuPrincipal(await ouvrirLeDetail(ancienne)));
  expect(apres).toBe(avant);
  expect(apres).toContain('Parfum : Fraise (10 €)');
  expect(apres).toContain('Votre nom : Marie Dupont');
});
