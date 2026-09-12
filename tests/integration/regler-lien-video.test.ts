/**
 * Ticket 05 — Régler un emplacement de lien de vidéo
 * (openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md).
 *
 * Couture retenue, même patron que `corriger-bouton-action.test.ts`
 * (ticket 04) :
 * - SC-05a est purement `core/` (`lienVideoAutorise`, `src/core/pages/
 *   lien-video.ts`) : instanciable sans D1 ni Worker (ARCH-5), exercée ici
 *   directement, sans requête.
 * - SC-05b/c passent par la couture HTTP réelle (`exports.default.fetch` contre le
 *   worker compilé, dans `workerd`, contre la vraie D1 locale, ADR-0003) —
 *   les migrations `0003_sessions.sql` et `0004_brouillons_emplacements.sql`
 *   sont rejouées ici même, une session valide est semée directement.
 *   `content/pages/accueil/page.json` (emplacement `video-presentation`,
 *   YouTube) et `content/pages/contact/page.json` (emplacement
 *   `video-acces`, Vimeo) portent déjà les fixtures réelles de ce ticket.
 * - SC-05d/e portent sur un état affiché après exécution du script client de
 *   l'îlot `ReglageLienVideo.svelte` : aucune infrastructure de test de
 *   composant Svelte ni Playwright n'existe encore dans ce dépôt
 *   (docs/test.md). Ils se vérifient donc, comme `tests/static/
 *   gabarits-admin.test.ts` le fait déjà pour un texte non observable par
 *   requête HTTP, en inspectant la SOURCE de l'îlot (`?raw`, Vite) : la
 *   présence du fil de wiring `rôle=alert`/`messageErreur` (SC-05d) et le
 *   contenu littéral des messages de refus (SC-05d/e), combinés à la preuve
 *   HTTP que l'`Écran : Éditeur de page` monte bien ce champ sur l'emplacement
 *   de lien de vidéo.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, describe } from 'vitest';
import { lienVideoAutorise } from '../../src/core/pages/lien-video.ts';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const ROUTE_ACCUEIL_VIDEO = 'https://example.com/admin/pages/accueil/emplacements/video-presentation';
const ROUTE_CONTACT_VIDEO = 'https://example.com/admin/pages/contact/emplacements/video-acces';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';
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
    const brouillons = await import('../../migrations/0004_brouillons_emplacements.sql?raw');
    for (const requete of separerRequetes(brouillons.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-regler-lien-video-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function reglerLeLien(route: string, cookieSession: string | null, corps: unknown): Promise<Response> {
  return exports.default.fetch(new Request(route, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
    },
    body: JSON.stringify(corps),
  }));
}

// --- SC-05a — la reconnaissance d'un lien de vidéo, en `core/`, est une
// liste blanche d'hébergeurs selon le motif propre à chacun ---

describe('SC-05a — un lien de vidéo est accepté ssi son hôte est sur la liste blanche (YouTube, Vimeo)', () => {
  it('SC-05a — un lien YouTube (forme longue, avec ou sans www) et un lien YouTube court (youtu.be) sont acceptés', () => {
    expect(lienVideoAutorise('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(lienVideoAutorise('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(lienVideoAutorise('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('SC-05a — un lien Vimeo est accepté', () => {
    expect(lienVideoAutorise('https://vimeo.com/76979871')).toBe(true);
  });

  it('SC-05a — un hôte hors liste blanche est rejeté', () => {
    expect(lienVideoAutorise('https://exemple.test/video')).toBe(false);
    expect(lienVideoAutorise('https://dailymotion.com/video/x123')).toBe(false);
  });

  it('SC-05a — un lien qui n’est pas en https est rejeté, même sur un hôte de la liste blanche', () => {
    expect(lienVideoAutorise('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  it('SC-05a — une chaîne qui n’est même pas une URL est rejetée', () => {
    expect(lienVideoAutorise('pas une url')).toBe(false);
  });
});

// --- SC-05b — un lien reconnu, collé par la couture HTTP, persiste le
// brouillon et fait basculer la page à « brouillon », l'état publié intact ---

it('SC-05b — coller un lien reconnu persiste le brouillon, bascule la page à « brouillon », et laisse l’état publié intact', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  const listeAvant = await exports.default.fetch(new Request(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const ligneAccueilAvant = /<li>Accueil[\s\S]*?<\/li>/.exec(await listeAvant.text())?.[0] ?? '';
  expect(ligneAccueilAvant).not.toMatch(/data-pastille-brouillon/);

  // Act : un lien reconnu (YouTube, forme courte), différent du lien publié.
  const reponse = await reglerLeLien(ROUTE_ACCUEIL_VIDEO, cookieSession, {
    lien: 'https://youtu.be/oHg5SJYRHA0',
  });

  // Assert : la réponse confirme l'enregistrement et le basculement au brouillon…
  expect(reponse.status).toBe(200);
  const corpsReponse = (await reponse.json()) as { ok: boolean; porteUnBrouillon: boolean };
  expect(corpsReponse.ok).toBe(true);
  expect(corpsReponse.porteUnBrouillon).toBe(true);

  // …la ligne existe bien en D1, sous l'identité stable (page, emplacement)…
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('accueil', 'video-presentation')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({
    nature: 'lien-video',
    lien: 'https://youtu.be/oHg5SJYRHA0',
  });

  // …la page « Accueil » porte désormais la pastille de brouillon, à la fois
  // sur la liste des pages et dans le fil de retour de l'éditeur…
  const listeApres = await exports.default.fetch(new Request(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const ligneAccueilApres = /<li>Accueil[\s\S]*?<\/li>/.exec(await listeApres.text())?.[0] ?? '';
  expect(ligneAccueilApres).toMatch(/data-pastille-brouillon/);

  const editeurApres = await exports.default.fetch(new Request(ROUTE_EDITEUR_ACCUEIL, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const zonePastilleEditeur =
    /<span id="zone-pastille-brouillon">[\s\S]*?<\/span>\s*<\/h1>/.exec(await editeurApres.text())?.[0] ?? '';
  expect(zonePastilleEditeur).toMatch(/data-pastille-brouillon/);

  // …et la déclaration versionnée (l'état publié) n'a pas bougé : lue depuis
  // `content/pages/accueil/page.json` (jamais depuis le brouillon), elle
  // porte toujours le lien d'origine de l'intégrateur.
  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const pageDeclaree = obtenirPageAvecEmplacements('accueil');
  const videoDeclaree = pageDeclaree?.emplacements.find((emplacement) => emplacement.id === 'video-presentation');
  expect(videoDeclaree).toMatchObject({ lien: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
});

// --- SC-05c — un lien non reconnu, collé par la couture HTTP, n'écrit aucun
// brouillon et ne fait pas basculer l'état de la page ---

it('SC-05c — coller un lien non reconnu n’écrit aucun brouillon et ne bascule pas l’état de la page', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  // Act : un hôte hors liste blanche.
  const reponse = await reglerLeLien(ROUTE_CONTACT_VIDEO, cookieSession, {
    lien: 'https://exemple.test/video',
  });

  // Assert : refusée, motif « lien-invalide »…
  expect(reponse.status).toBe(400);
  const corpsReponse = (await reponse.json()) as { ok: boolean; raison: string };
  expect(corpsReponse.ok).toBe(false);
  expect(corpsReponse.raison).toBe('lien-invalide');

  // …rien n'a été écrit en D1 pour ce couple (page, emplacement)…
  const lignes = await db
    .prepare(`select 1 from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('contact', 'video-acces')
    .all();
  expect(lignes.results).toHaveLength(0);

  // …et la page « Contact » ne porte aucune pastille de brouillon.
  const listeApres = await exports.default.fetch(new Request(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const ligneContactApres = /<li>Contact[\s\S]*?<\/li>/.exec(await listeApres.text())?.[0] ?? '';
  expect(ligneContactApres).not.toMatch(/data-pastille-brouillon/);
});

// --- SC-05d — un lien non reconnu est refusé au niveau du champ, à l'`Écran :
// Éditeur de page`, en disant ce qui est attendu ---

describe('SC-05d — un lien non reconnu est refusé au niveau du champ, en disant ce qui est attendu', () => {
  it('SC-05d — l’`Écran : Éditeur de page` monte le champ de réglage du lien sur l’emplacement de lien de vidéo', async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act
    const reponse = await exports.default.fetch(new Request(ROUTE_EDITEUR_ACCUEIL, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
    }));
    const corps = await reponse.text();

    // Assert : le point de montage du champ de réglage existe bien pour
    // l'emplacement de lien de vidéo « video-presentation » de cette page —
    // c'est ce nœud que `monterReglagesLienVideo` (src/admin/ilots-svelte-5/
    // monter.ts) remplace par l'îlot `ReglageLienVideo`, seul porteur de
    // l'état d'erreur au niveau du champ.
    expect(corps).toMatch(/data-emplacement-lien-video[\s\S]*?data-id-emplacement="video-presentation"/);
  });

  it('SC-05d — l’îlot `ReglageLienVideo` affiche le refus dans une alerte au niveau du champ, en disant ce qui est attendu', async () => {
    // Arrange / Act : la source du composant qui porte le seul moyen de
    // régler ce champ (aucune infrastructure de test de composant Svelte
    // n'existe dans ce dépôt, docs/test.md — la source est donc l'oracle,
    // même geste que `tests/static/gabarits-admin.test.ts`).
    const source = (
      await import('../../src/admin/ilots-svelte-5/ReglageLienVideo.svelte?raw')
    ).default;

    // Assert : un état d'erreur EST rendu au niveau du champ — une alerte
    // conditionnée à un message de refus tenu dans l'état local du champ, pas
    // une redirection ni un rechargement de l'écran.
    expect(source).toMatch(/role="alert"/);
    expect(source).toMatch(/\{#if\s+messageErreur\}/);
    expect(source).toMatch(/\{messageErreur\}/);

    // …et le message pour un lien hors liste blanche dit ce qui EST attendu
    // (un lien YouTube ou Vimeo), pas seulement que le lien est refusé.
    const motifLienInvalide = /'lien-invalide':\s*"([^"]+)"/.exec(source)?.[1] ?? '';
    expect(motifLienInvalide.length).toBeGreaterThan(0);
    expect(motifLienInvalide.toLowerCase()).toMatch(/youtube/);
    expect(motifLienInvalide.toLowerCase()).toMatch(/vimeo/);
  });
});

// --- SC-05e — aucun terme de développeur ne paraît dans le champ ni dans le
// message d'erreur ---

it('SC-05e — le champ de réglage du lien et ses messages de refus ne portent aucun terme de développeur', async () => {
  // Arrange
  const source = (
    await import('../../src/admin/ilots-svelte-5/ReglageLienVideo.svelte?raw')
  ).default.toLowerCase();

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
    'url',
    'hôte',
    'host',
    'validation',
    'regex',
  ];

  // Act / Assert : le texte réellement à l'écran — le libellé du champ et les
  // messages de refus (`TEXTES_REFUS`), pas les commentaires du fichier
  // source qui ne paraissent jamais à l'écran.
  const zoneTextesVisibles = /const textes_refus[\s\S]*?\};/.exec(source)?.[0] ?? '';
  const zoneLibelle = /<label>[\s\S]*?<\/label>/.exec(source)?.[0] ?? '';
  expect(zoneTextesVisibles.length, 'TEXTES_REFUS introuvable dans la source').toBeGreaterThan(0);
  expect(zoneLibelle.length, 'le libellé du champ est introuvable dans la source').toBeGreaterThan(0);

  for (const terme of TERMES_DEVELOPPEUR) {
    expect(zoneTextesVisibles, `les messages de refus ne devraient pas contenir « ${terme} »`).not.toContain(terme);
    expect(zoneLibelle, `le libellé du champ ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});
