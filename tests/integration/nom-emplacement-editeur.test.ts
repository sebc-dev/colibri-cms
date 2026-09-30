/**
 * Ticket 03 — L'éditeur présente chaque emplacement par sa nature et son nom
 * (openspec/changes/006-nom-des-emplacements/tickets/
 * 03-editeur-presente-nature-et-nom.md).
 *
 * Couture retenue, même patron que `tests/integration/liste-des-pages.test.ts`
 * (ticket 02 du change 003) et `tests/integration/cadre-avec-l-ecran.test.ts`
 * (ticket 03 du change 005) : requête HTTP réelle via `exports.default.fetch`
 * contre le worker compilé, dans `workerd`, contre la vraie D1 locale —
 * jamais de double interne. La table `sessions` n'a besoin d'aucun parcours
 * de connexion complet : une ligne y est semée directement, ce qui suffit à
 * `verifierSession` pour ouvrir l'accès à la route gardée. `obtenirBrouillon`
 * et les magasins de médias créent eux-mêmes leurs tables si elles sont
 * absentes (`assurerTableBrouillons`/`assurerTableMedias`, mêmes gestes
 * défensifs que `assurerTableSessions`) : aucune autre migration n'est
 * nécessaire pour cette seule lecture (GET, sans écriture de brouillon).
 *
 * `content/pages/accueil/page.json` porte déjà les deux cas exigés par le
 * ticket (« ce sont les deux emplacements à cibler par les tests
 * d'intégration ») :
 * - l'emplacement `presentation` (texte riche), nommé « Présentation » ;
 * - l'emplacement `bouton-devis` (bouton d'action), sans nom.
 *
 * SC-03c (l'échappement du nom face à un balisage) est hors de portée d'une
 * requête HTTP ici : aucune page de démonstration ne porte un nom avec des
 * caractères de balisage — voir `tests/static/
 * nom-emplacement-editeur-statique.test.ts`, qui le prouve par lecture de la
 * source (patron documenté par le ticket lui-même).
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, describe } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const ROUTE_EDITEUR_ACCUEIL = 'https://example.com/admin/pages/accueil';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
      await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  try {
    await db.prepare(`delete from ${TABLE_SESSIONS}`).run();
  } catch (erreur) {
    console.warn('nettoyage D1 ignoré (schéma absent) :', erreur);
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-nom-emplacement-editeur-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function accederAEditeurAccueil(cookieSession: string): Promise<Response> {
  return exports.default.fetch(new Request(ROUTE_EDITEUR_ACCUEIL, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
}

/**
 * Isole le balisage d'un seul emplacement (un seul `<li>`, pas de `<li>`
 * imbriqué dans ce gabarit) — pour ne jamais lire, par accident, le titre
 * d'une autre carte que celle visée.
 */
function extraireBlocEmplacement(corps: string, idEmplacement: string): string {
  const blocs = [...corps.matchAll(/<li>[\s\S]*?<\/li>/g)].map((correspondance) => correspondance[0]);
  return blocs.find((bloc) => bloc.includes(`data-id-emplacement="${idEmplacement}"`)) ?? '';
}

/**
 * Le texte du `CardTitle` rendu (`<div data-slot="card-title">…</div>`),
 * débarrassé des marqueurs de bornes de `{@render}` (`<!---->`) que
 * `card-title.svelte` pose autour de tout enfant rendu — un artefact du
 * moteur de rendu, sans rapport avec le nom de l'emplacement.
 */
function extraireTitreCarte(bloc: string): string {
  const brut = /<div data-slot="card-title"[^>]*>([\s\S]*?)<\/div>/.exec(bloc)?.[1] ?? '';
  return brut.replace(/<!--.*?-->/g, '').trim();
}

/** Le texte réellement visible d'un extrait — hors balises et attributs. */
function texteVisible(extrait: string): string {
  return extrait.replace(/<[^<>]*>/g, ' ');
}

// --- SC-03a — un emplacement nommé se présente par sa nature suivie de son
// nom, au-dessus de son contenu ---

describe('SC-03a — un emplacement nommé se présente par sa nature suivie de son nom, au-dessus de son contenu', () => {
  it('SC-03a — l’emplacement « presentation » (texte riche, nommé « Présentation ») affiche le titre « Texte riche — Présentation », avant son contenu', async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act
    const reponse = await accederAEditeurAccueil(cookieSession);
    const corps = await reponse.text();
    const bloc = extraireBlocEmplacement(corps, 'presentation');

    // Assert : la nature, un tiret cadratin entouré d'espaces, puis le nom —
    // jamais l'inverse, jamais un autre séparateur.
    expect(bloc, 'l’emplacement « presentation » devrait être présent dans la réponse').not.toBe('');
    const titre = extraireTitreCarte(bloc);
    expect(titre).toBe('Texte riche — Présentation');

    // Assert : le titre précède le contenu courant de l'emplacement dans le
    // balisage (« au-dessus de son contenu »).
    const indexTitre = bloc.indexOf(titre);
    const indexContenu = bloc.indexOf('data-emplacement-texte-riche');
    expect(indexTitre).toBeGreaterThanOrEqual(0);
    expect(indexContenu).toBeGreaterThan(indexTitre);
  });
});

// --- SC-03b — un emplacement sans nom se présente par sa nature seule, et
// son identifiant n'apparaît nulle part à l'écran ---

describe('SC-03b — un emplacement sans nom se présente par sa nature seule, sans que son identifiant apparaisse à l’écran', () => {
  it('SC-03b — l’emplacement « bouton-devis » (bouton d’action, sans nom) affiche le seul titre « Bouton d’action », sans tiret ni identifiant visible', async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act
    const reponse = await accederAEditeurAccueil(cookieSession);
    const corps = await reponse.text();
    const bloc = extraireBlocEmplacement(corps, 'bouton-devis');

    // Assert : la nature seule, exactement comme avant l'introduction du nom
    // — pas de tiret cadratin, donc pas de nom accolé.
    expect(bloc, 'l’emplacement « bouton-devis » devrait être présent dans la réponse').not.toBe('');
    const titre = extraireTitreCarte(bloc);
    expect(titre).toBe('Bouton d’action');
    expect(titre).not.toContain('—');

    // Assert : l'identifiant technique de l'emplacement (FR-117) n'apparaît
    // nulle part dans le texte réellement visible de sa carte — seul un
    // attribut `data-*`, jamais lu à l'écran, peut le porter.
    expect(texteVisible(bloc)).not.toContain('bouton-devis');
  });
});

// --- SC-03d — aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un
// emplacement, ni ne change son nom ---

describe('SC-03d — aucun geste n’ajoute, ne retire, ne déplace ni ne renomme un emplacement, ni ne change son nom', () => {
  it('SC-03d — l’éditeur d’une page dont des emplacements sont nommés n’offre ni champ, ni bouton, ni formulaire pour agir sur la structure ou le nom', async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act
    const reponse = await accederAEditeurAccueil(cookieSession);
    const corps = await reponse.text();
    const zoneEcran = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];

    // Assert : la zone d'écran est bien présente, et rendu avant toute
    // exécution de script client (`workerd` n'en exécute aucun) — les seuls
    // moyens d'édition fonctionnels (barre de mise en forme, champs de
    // correction) sont montés plus tard, par les îlots, jamais posés ici.
    expect(zoneEcran, 'le contenu de l’écran (<main>) devrait être présent').toBeDefined();
    expect(zoneEcran).not.toMatch(/<form[\s>]/i);
    expect(zoneEcran).not.toMatch(/<input[\s>]/i);

    const texte = texteVisible(zoneEcran ?? '').toLowerCase();
    for (const geste of [
      'ajouter un emplacement',
      'supprimer un emplacement',
      'retirer un emplacement',
      'déplacer',
      'renommer',
      'changer le nom',
      'modifier le nom',
      'éditer le nom',
    ]) {
      expect(texte, `l’écran ne devrait pas offrir « ${geste} »`).not.toContain(geste);
    }
  });
});

// --- SC-03e — aucun terme de développeur ne paraît dans l'éditeur d'une
// page dont des emplacements sont nommés ---

describe('SC-03e — aucun terme de développeur ne paraît dans l’éditeur d’une page dont des emplacements sont nommés', () => {
  it('SC-03e — le texte visible de l’éditeur (page « Accueil », emplacement « presentation » nommé) ne porte aucun terme de développeur', async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act
    const reponse = await accederAEditeurAccueil(cookieSession);
    const corps = await reponse.text();

    // Assert : seul le texte réellement à l'écran (hors balises et
    // attributs, ex. `data-slug`, qui ne sont jamais lus par l'éditrice).
    const texte = texteVisible(corps).toLowerCase();
    const TERMES_DEVELOPPEUR = [
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
    ];
    for (const terme of TERMES_DEVELOPPEUR) {
      expect(texte, `l’éditeur ne devrait pas contenir « ${terme} »`).not.toContain(terme);
    }
  });
});
