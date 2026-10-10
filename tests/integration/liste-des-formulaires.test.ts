/**
 * Change 010, ticket 02 — La rubrique « Formulaires » ouvre la liste.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale ; une session est semée directement (même geste
 * que `liste-des-pages.test.ts`). Les deux formulaires lus sont ceux déclarés
 * au dépôt (`content/formulaires/*`). L'état vide et la source sont prouvés
 * dans `tests/static/liste-des-formulaires-statique.test.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const ROUTE = 'https://example.com/admin/formulaires';

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
    const module = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(module.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db
        .prepare(
          `alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`,
        )
        .run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  try {
    await obtenirDB().prepare(`delete from ${TABLE_SESSIONS}`).run();
  } catch (erreur) {
    console.warn('nettoyage D1 ignoré (schéma absent) :', erreur);
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-liste-des-formulaires-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function ouvrirEnSession(): Promise<string> {
  const cookie = await semerSession(await assurerSchema());
  const reponse = await exports.default.fetch(
    new Request(ROUTE, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

/** Même requête qu'`ouvrirEnSession`, pour lire les en-têtes de la réponse. */
async function ouvrirReponseEnSession(): Promise<Response> {
  const cookie = await semerSession(await assurerSchema());
  return exports.default.fetch(
    new Request(ROUTE, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

function sansBalises(html: string): string {
  return html
    .split('<')
    .map((morceau, i) =>
      i === 0 ? morceau : morceau.slice(morceau.indexOf('>') + 1),
    )
    .join(' ');
}

function contenuPrincipal(corps: string): string {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(
    main,
    'le contenu de l’écran (<main>) devrait être présent',
  ).toBeDefined();
  return main ?? '';
}

function menu(corps: string): string {
  const nav = /<nav[^>]*>([\s\S]*?)<\/nav>/.exec(corps)?.[1];
  expect(nav, 'le menu (<nav>) devrait être présent').toBeDefined();
  return nav ?? '';
}

it('SC-02a — en session, la liste présente « Devis atelier » puis « Devis gâteau », chacun menant à son écran', async () => {
  const corps = await ouvrirEnSession();
  const principal = contenuPrincipal(corps);

  expect(principal).toContain('<h1');
  const liens = [
    ...principal.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
  ].map((m) => ({
    href: m[1],
    nom: sansBalises(m[2]).trim(),
  }));
  expect(liens).toEqual([
    { href: '/admin/formulaires/devis-atelier', nom: 'Devis atelier' },
    { href: '/admin/formulaires/devis-gateau', nom: 'Devis gâteau' },
  ]);
  // « Formulaires » est la rubrique active du cadre.
  expect(menu(corps)).toMatch(
    /<a[^>]*href="\/admin\/formulaires"[^>]*aria-current="page"/,
  );
});

it('SC-02c — sans session, l’écran renvoie à la connexion sans rien montrer des formulaires', async () => {
  const reponse = await exports.default.fetch(
    new Request(ROUTE, { redirect: 'manual' }),
  );

  expect(reponse.status).toBeGreaterThanOrEqual(300);
  expect(reponse.status).toBeLessThan(400);
  expect(reponse.headers.get('location') ?? '').toContain('/admin/connexion');
  const corps = await reponse.text();
  expect(corps).not.toContain('Devis atelier');
  expect(corps).not.toContain('Devis gâteau');
});

it('SC-02d — la barre latérale montre les cinq rubriques, « Formulaires » seule marquée active', async () => {
  const nav = menu(await ouvrirEnSession());

  for (const libelle of [
    'Mes pages',
    'Médias',
    'Réglages',
    'Formulaires',
    'Demandes',
  ]) {
    expect(nav).toContain(libelle);
  }
  expect(nav.match(/aria-current="page"/g)).toHaveLength(1);
  expect(nav).toMatch(
    /<a[^>]*href="\/admin\/formulaires"[^>]*aria-current="page"/,
  );
});

it('SC-02e — seules quatre rubriques mènent à un écran servi, et aucun geste d’ajout, retrait, renommage ni déplacement n’est offert', async () => {
  const corps = await ouvrirEnSession();
  const nav = menu(corps);

  const hrefs = [...nav.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  expect(hrefs).toEqual([
    '/admin/mes-pages',
    '/admin/medias',
    '/admin/reglages',
    '/admin/formulaires',
  ]);
  expect(nav).toContain('Demandes');

  const principal = contenuPrincipal(corps);
  expect(principal).not.toMatch(/<form[\s>]/i);
  expect(principal).not.toMatch(/<button[\s>]/i);
  expect(principal).not.toMatch(/<input[\s>]/i);
  const bas = principal.toLowerCase();
  for (const geste of [
    'ajouter',
    'créer',
    'supprimer',
    'retirer',
    'renommer',
    'déplacer',
  ]) {
    expect(bas, `l’écran ne devrait pas offrir « ${geste} »`).not.toContain(
      geste,
    );
  }
});

it('SC-02f — l’écran est servi sous la politique de sécurité de l’administration, sans script en ligne ni directive client:*', async () => {
  const reponse = await ouvrirReponseEnSession();
  expect(reponse.status).toBe(200);
  const csp = reponse.headers.get('content-security-policy');
  expect(csp, 'une Content-Security-Policy devrait être posée').toBeTruthy();

  // La même politique que l'écran de connexion : l'écran ne l'assouplit pas.
  const connexion = await exports.default.fetch(
    new Request('https://example.com/admin/connexion'),
  );
  expect(csp).toBe(connexion.headers.get('content-security-policy'));
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(csp).not.toMatch(/unsafe-eval/);

  const corps = await reponse.text();
  expect(corps).not.toMatch(/client:(load|idle|visible|only|media)/);
  expect(contenuPrincipal(corps)).not.toMatch(/<script[\s>]/i);
});

it('SC-02g — l’écran ne porte aucun terme de développeur ni identifiant visible', async () => {
  const principal = contenuPrincipal(await ouvrirEnSession());

  const texteVisible = sansBalises(principal).toLowerCase();
  for (const terme of [
    'commit',
    'branche',
    'build',
    'déploiement',
    'déployer',
    'repository',
    'dépôt git',
    'endpoint',
    'webhook',
    'backend',
    'front-end',
    'framework',
    'slug',
    'json',
    'devis-atelier',
    'devis-gateau',
  ]) {
    expect(
      texteVisible,
      `l’écran ne devrait pas montrer « ${terme} »`,
    ).not.toContain(terme);
  }
});
