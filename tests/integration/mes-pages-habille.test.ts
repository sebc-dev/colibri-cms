/**
 * Ticket 07 — « Mes pages » habillé, avec l'adresse de chaque page
 * (openspec/changes/005-mise-en-page-administration/tickets/07-mes-pages-habille.md).
 *
 * Mode `test` (test-after) : `src/pages/admin/mes-pages.astro` et
 * `src/admin/navigation-liste-des-pages.ts` (`adresseDeLaPage`) sont déjà
 * réécrits — ce fichier ne fait qu'observer le comportement rendu, aucun
 * code de production n'est modifié ici. Ce ticket **n'ajoute que des
 * tests** (préalable du ticket) : `tests/integration/liste-des-pages.test.ts`
 * n'est pas touché.
 *
 * Couture retenue, même patron que `liste-des-pages.test.ts` (ticket 02) et
 * `marque-de-brouillon.test.ts` (ticket 05, SPEC.md § Décisions de test,
 * ADR-0003) : requête HTTP réelle via `exports.default.fetch` contre le
 * worker compilé, dans `workerd`, contre la vraie D1 locale — jamais de
 * double interne. Les trois `page.json` réels du dépôt
 * (`content/pages/{accueil,tarifs,contact}/page.json`, rangs 0/1/2) sont lus
 * tels quels (ADR-0012 : la déclaration est un geste d'intégration, jamais
 * un geste de test qui l'imiterait par un double) — leurs adresses attendues
 * sont `/`, `/tarifs` et `/contact` (`adresseDeLaPage`,
 * `src/admin/navigation-liste-des-pages.ts`).
 *
 * **Couverture volontairement partielle (cf. brief § gaps, même constat que
 * `connexion-habillee.test.ts`, ticket 06).** SC-07d (aucun défilement
 * horizontal ni contenu coupé à 360 px), SC-07e (zone de toucher réelle de
 * 44 × 44 px) et SC-07f (contraste réel de chaque texte sur son fond) ne se
 * jugent que sur l'artefact bâti (`npm run build` puis `wrangler dev`), à un
 * outillage de rendu ou un vrai téléphone — jamais par une assertion sur une
 * chaîne de classes, qui ne prouverait rien de plus que la présence de la
 * classe elle-même (tautologique, même doctrine que `connexion-habillee.
 * test.ts` § SC-06f/g/h). `docs/adr/0015-tokens-colibri-theme-de-l-
 * administration.md` § Vérifiable le dit explicitement : « le rendu — que
 * l'écran ressemble au canvas, contraste compris — relève de la recette
 * observée sur l'artefact bâti, les tests `workerd` n'appliquant ni feuille
 * ni politique de sécurité ». Ces trois critères restent donc **hors de ce
 * fichier**, par une limite du moyen de vérification et non par oubli — la
 * preuve correspondante est reportée au cahier de recette globale du change
 * 005 (comme les tickets 05/06 avant lui).
 *
 * SC-07a, SC-07b et SC-07c, en revanche, se lisent entièrement dans le
 * balisage rendu (ordre et texte des adresses, `<h1>` réel, classe
 * `font-mono` explicite sur l'adresse, absence de toute classe qui
 * écraserait l'héritage `font-sans`/`font-display` posé par `admin.css`
 * depuis le ticket 02, fond `bg-card` — jamais une couleur littérale) et
 * sont couverts ci-dessous.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';

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
    const module = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(module.default)) {
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
  const id = `session-mes-pages-habille-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function accederAMesPages(cookieSession: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(ROUTE_MES_PAGES, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
    }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

/** Les trois pages réelles déclarées (`content/pages/<slug>/page.json`), dans l'ordre de rang attendu. */
const PAGES_DECLAREES_DANS_LORDRE = [
  { titre: 'Accueil', adresse: '/' },
  { titre: 'Tarifs', adresse: '/tarifs' },
  { titre: 'Contact', adresse: '/contact' },
];

/** Extrait le fragment `<ul id="liste-des-pages" …>…</ul>` de la réponse, sans le reste du cadre. */
function extraireListe(corps: string): string {
  const correspondance = /<ul id="liste-des-pages"[^>]*>([\s\S]*?)<\/ul>/.exec(corps);
  expect(correspondance, 'la liste des pages (`<ul id="liste-des-pages">`) devrait être présente').not.toBeNull();
  if (correspondance === null) throw new Error('liste absente');
  return correspondance[0];
}

/** Extrait chaque `<li>…</li>` de la liste, dans l'ordre où ils apparaissent. */
function extraireLignes(listeComplete: string): string[] {
  return [...listeComplete.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((correspondance) => correspondance[0]);
}

// --- SC-07a — chaque ligne porte, sous le titre, son adresse sur le site, dans l'ordre posé ---

it(
  'SC-07a — chaque ligne de « Mes pages » porte, sous le titre, son adresse sur le site, en JetBrains Mono, et les lignes suivent l’ordre posé',
  async () => {
    // Arrange : une session valide, les trois pages réelles déjà déclarées.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act.
    const corps = await accederAMesPages(cookieSession);
    const lignes = extraireLignes(extraireListe(corps));

    // Assert : trois lignes, dans l'ordre de rang, chacune commençant par son titre puis
    // portant son adresse dans un `<span class="…font-mono…">` juste en dessous.
    expect(lignes).toHaveLength(PAGES_DECLAREES_DANS_LORDRE.length);
    PAGES_DECLAREES_DANS_LORDRE.forEach((page, index) => {
      const ligne = lignes[index];
      expect(ligne, `la ligne ${String(index)} devrait exister`).toBeDefined();
      // Le `<li>` commence directement par le titre (pas d'espace ni de balise avant) —
      // ce qui garde `<li>Accueil…</li>` vrai pour les tests existants.
      expect(ligne.startsWith(`<li>${page.titre}`)).toBe(true);

      const motifAdresse = new RegExp(
        `<span class="[^"]*font-mono[^"]*">${page.adresse.replace('/', '\\/')}<\\/span>`,
      );
      expect(ligne, `la ligne « ${page.titre} » devrait porter l’adresse « ${page.adresse} » en font-mono`).toMatch(
        motifAdresse,
      );

      // L'adresse arrive après le titre dans le texte de la ligne (sous lui), jamais avant.
      const indexTitre = ligne.indexOf(page.titre);
      const indexAdresse = ligne.indexOf(page.adresse, indexTitre + page.titre.length);
      expect(indexAdresse).toBeGreaterThan(indexTitre);
    });
  },
);

// --- SC-07b — titre en Fraunces, lignes en Instrument Sans, adresse en JetBrains Mono ---

it(
  'SC-07b — le navigateur rend le titre de l’écran en Fraunces, le texte des lignes en Instrument Sans et l’adresse en JetBrains Mono',
  async () => {
    // Arrange.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act.
    const corps = await accederAMesPages(cookieSession);

    // Assert : le titre est un véritable `<h1>`, sans attribut — c'est le sélecteur `h1`
    // d'admin.css (en place depuis le ticket 02) qui lui applique `--font-display`
    // (Fraunces) ; un titre rendu dans un `<div>` ou un `<p>` y échapperait.
    expect(corps).toMatch(/<h1>Mes pages<\/h1>/);

    const listeComplete = extraireListe(corps);

    // L'adresse porte explicitement `font-mono` (JetBrains Mono) sur chaque ligne.
    const adresses = [...listeComplete.matchAll(/<span class="([^"]*)">\/[^<]*<\/span>/g)];
    expect(adresses.length).toBeGreaterThan(0);
    for (const adresse of adresses) {
      expect(adresse[1]).toContain('font-mono');
    }

    // Le texte du titre de chaque ligne (dans le `<li>`, hors adresse et marque) ne porte
    // aucune classe qui écraserait l'héritage `font-sans` (Instrument Sans) posé par le
    // sélecteur `body` d'admin.css : ni le `<li>` lui-même, ni le conteneur `<ul>`
    // n'appliquent `font-mono` ni `font-serif` à l'ensemble de la ligne.
    const lignes = extraireLignes(listeComplete);
    for (const ligne of lignes) {
      expect(ligne).not.toMatch(/<li[^>]*class=/);
    }
    const ouvertureListe = /<ul id="liste-des-pages"[^>]*>/.exec(corps)?.[0] ?? '';
    expect(ouvertureListe).not.toMatch(/\[&>li\]:font-(mono|serif)\b/);
  },
);

// --- SC-07c — thème Colibri : fond neutre chaud, titre en Fraunces, texte en Instrument Sans ---

it(
  'SC-07c — « Mes pages » porte le thème Colibri : fond neutre chaud (jamais une couleur littérale), titre en Fraunces, texte en Instrument Sans',
  async () => {
    // Arrange.
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act.
    const corps = await accederAMesPages(cookieSession);

    // Assert : le titre reste le même `<h1>` réel (Fraunces, cf. SC-07b).
    expect(corps).toMatch(/<h1>Mes pages<\/h1>/);

    // La carte qui porte la liste utilise le token de fond neutre chaud du thème Colibri
    // (`bg-card`, admin.css/ADR-0015), jamais une valeur blanche ou grise posée à la main.
    const ouvertureListe = /<ul id="liste-des-pages"[^>]*>/.exec(corps)?.[0] ?? '';
    expect(ouvertureListe).toContain('bg-card');

    // Tokens seulement (I14) : aucune couleur littérale (hex ou rgb()) dans tout le corps
    // rendu par cet écran — même vérification que `connexion-habillee.test.ts` § SC-06e.
    expect(corps).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(corps).not.toMatch(/rgb\(/);
  },
);
