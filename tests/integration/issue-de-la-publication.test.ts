/**
 * Change 011, ticket 18 — l'éditrice sait si sa publication est en ligne, et peut la relancer.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd`, contre la vraie D1 locale ;
 * la ligne d'état de la publication est semée directement (dernière marque, instant du dépôt). Le site
 * construit pour les tests n'empaquette aucune marque : il n'est né d'aucune publication. « En ligne »
 * se lit donc par la plateforme, à qui l'on passe la marque du site et l'horloge ; la relance se joue
 * contre le dépôt simulé en mémoire (seul double du change).
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import { BAIL } from '../../src/core/publication/depot.ts';
import { BORNE_MISE_EN_LIGNE } from '../../src/core/publication/etat.ts';
import { reprendreVerrou } from '../../src/platform/publication/magasin.ts';
import { lireEtatDeLaPublication, relancerLaMiseEnLigne } from '../../src/platform/publication/publier.ts';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  exigerPresent,
  lireLignes,
  nettoyer,
  semerImage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

const MINUTE = 60 * 1000;
const APOSTROPHE = "(?:'|’|&#39;|&#x27;)";

const TERMES_DEVELOPPEUR = [
  'commit',
  'branche',
  'build',
  'déploiement',
  'déployer',
  'repository',
  'endpoint',
  'webhook',
  'backend',
  'framework',
  'json',
  'sha',
  'blob',
  'octets',
  'base de données',
  'token',
  'api',
  'dépôt',
  'github',
  'push',
  'serveur',
  'worker',
  'cloudflare',
];

async function semerDepot(db: DBLike, derniereMarque: string | null, deposeLe: number | null): Promise<void> {
  await db
    .prepare('update publication set derniere_marque = ?1, depose_le = ?2 where id = 1')
    .bind(derniereMarque, deposeLe)
    .run();
}

async function ouvrir(db: DBLike, route: string): Promise<{ reponse: Response; corps: string }> {
  const session = await semerSession(db);
  const reponse = await exports.default.fetch(
    new Request(`${BASE}${route}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` } }),
  );
  return { reponse, corps: await reponse.text() };
}

function mainDe(corps: string): string {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  return exigerPresent(main, 'le contenu (<main>) doit être présent');
}

function texteVisible(html: string): string {
  return html
    .replaceAll(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replaceAll(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replaceAll(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replaceAll(/<[^<>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .toLowerCase();
}

function contientLeMot(texte: string, mot: string): boolean {
  return texte.split(/[^\p{L}\p{N}]+/u).includes(mot) || (mot.includes(' ') && texte.includes(mot));
}

const ECRANS_GARDES = ['/admin/mes-pages', '/admin/reglages', '/admin/medias', '/admin/formulaires'];

it("SC-18a — contenu tout juste déposé, site pas encore né de cette publication : l'écran Publier et le cadre disent « en cours de mise en ligne »", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 30 * 1000);

  // Act
  const { reponse, corps } = await ouvrir(db, '/admin/publier');

  // Assert
  expect(reponse.status).toBe(200);
  expect(corps).toMatch(/Mise en ligne en cours/);
  expect(mainDe(corps)).toMatch(/en cours/i);
  expect(corps).not.toMatch(new RegExp(`n${APOSTROPHE}a pas abouti`));
});

it('SC-18a — la lecture de l’état, gardée, dit « en cours » pour un dépôt tout frais', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 30 * 1000);

  // Act
  const { reponse, corps } = await ouvrir(db, '/admin/publication/etat');

  // Assert
  expect(reponse.status).toBe(200);
  expect((JSON.parse(corps) as { etat: string }).etat).toBe('en-cours');
});

it('SC-18a — la lecture de l’état est refusée sans session', async () => {
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now());

  const reponse = await exports.default.fetch(new Request(`${BASE}/admin/publication/etat`));

  expect(reponse.status).not.toBe(200);
  expect(await reponse.text()).not.toContain('en-cours');
});

it("SC-18b — le site en service est né de la dernière publication déposée : « en ligne »", async () => {
  // Arrange
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerDepot(db, 'marque-neuve', t0 - 2 * MINUTE);

  // Act
  const etat = await lireEtatDeLaPublication(db, t0, 'marque-neuve');

  // Assert
  expect(etat).toBe('en-ligne');
});

it("SC-18c — à 29 min 59 s du dépôt, site non né de la publication : « en cours » ; à 30 min : « n'a pas abouti »", async () => {
  // Arrange
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerDepot(db, 'marque-neuve', t0);

  // Act
  const avant = await lireEtatDeLaPublication(db, t0 + BORNE_MISE_EN_LIGNE - 1000, 'ancienne');
  const apres = await lireEtatDeLaPublication(db, t0 + BORNE_MISE_EN_LIGNE, 'ancienne');

  // Assert
  expect(avant).toBe('en-cours');
  expect(apres).toBe('pas-abouti');
});

it("SC-18c — 31 min après le dépôt, l'écran Publier et le cadre disent que la mise en ligne n'a pas abouti, site resté tel qu'il était, modifications gardées", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 31 * MINUTE);

  // Act
  const { corps } = await ouvrir(db, '/admin/publier');

  // Assert
  expect(corps).toMatch(new RegExp(`La dernière mise en ligne n${APOSTROPHE}a pas abouti`));
  expect(mainDe(corps)).toMatch(
    new RegExp(
      `La mise en ligne n${APOSTROPHE}a pas abouti\\. Votre site est resté tel qu${APOSTROPHE}il était, et vos modifications sont gardées\\.`,
    ),
  );
  expect(corps).not.toMatch(/Mise en ligne en cours/);
});

it("SC-18d — après « n'a pas abouti », le site en service naît de cette publication : « en ligne »", async () => {
  // Arrange
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerDepot(db, 'marque-neuve', t0 - 40 * MINUTE);
  expect(await lireEtatDeLaPublication(db, t0, 'ancienne')).toBe('pas-abouti');

  // Act : la mise en ligne arrive, tardive
  const etat = await lireEtatDeLaPublication(db, t0, 'marque-neuve');

  // Assert
  expect(etat).toBe('en-ligne');
});

it("SC-18e — dernière mise en ligne non aboutie, aucun brouillon, relance : une marque neuve est déposée sans changer le contenu, l'état repasse à « en cours »", async () => {
  // Arrange
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerDepot(db, 'marque-ancienne', t0 - 40 * MINUTE);
  const forge = await ForgeEnMemoire.creer({
    'content/publication.json': JSON.stringify({ publication: 'marque-ancienne' }),
    'content/pages/accueil/page.json': '{"titre":"Accueil"}',
  });
  const avant = new Map(forge.fichiers());
  const commitsAvant = forge.historique().length;
  expect(await lireEtatDeLaPublication(db, t0, null)).toBe('pas-abouti');

  // Act
  const issue = await relancerLaMiseEnLigne(db, forge, t0, (n) => new Uint8Array(n).fill(7));

  // Assert : un seul nouveau commit, seule la marque change
  expect(issue.ok).toBe(true);
  expect(forge.historique()).toHaveLength(commitsAvant + 1);
  const apres = new Map(forge.fichiers());
  const modifies = [...apres.keys()].filter((chemin) => apres.get(chemin) !== avant.get(chemin));
  expect(modifies).toEqual(['content/publication.json']);
  expect([...apres.keys()].sort((a, b) => a.localeCompare(b))).toEqual([...avant.keys()].sort((a, b) => a.localeCompare(b)));
  const nouvelle = (JSON.parse(exigerPresent(apres.get('content/publication.json'), 'la marque')) as {
    publication: string;
  }).publication;
  expect(nouvelle).not.toBe('marque-ancienne');
  // l'état repasse à « en cours », rattaché à la marque neuve
  expect(await lireEtatDeLaPublication(db, t0 + 1000, null)).toBe('en-cours');
  expect(await lireEtatDeLaPublication(db, t0 + 1000, nouvelle)).toBe('en-ligne');
  const lignes = (await lireLignes(db, 'select derniere_marque, jeton from publication where id = 1')) as {
    derniere_marque: string;
    jeton: string | null;
  }[];
  expect(lignes[0]?.derniere_marque).toBe(nouvelle);
  expect(lignes[0]?.jeton).toBeNull();
});

it("SC-18e — l'écran Publier offre « Relancer la mise en ligne » quand elle n'a pas abouti, même sans rien à publier", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 31 * MINUTE);

  // Act
  const { corps } = await ouvrir(db, '/admin/publier');

  // Assert
  expect(mainDe(corps)).toContain('Relancer la mise en ligne');
});

it('SC-18e — la relance est gardée : sans session, rien n’est déposé', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-ancienne', Date.now() - 40 * MINUTE);

  // Act
  const reponse = await exports.default.fetch(new Request(`${BASE}/admin/publication/relancer`, { method: 'POST', headers: { 'content-type': 'application/json' } }));

  // Assert
  expect(reponse.status).toBe(401);
  const lignes = (await lireLignes(db, 'select derniere_marque from publication where id = 1')) as {
    derniere_marque: string;
  }[];
  expect(lignes[0]?.derniere_marque).toBe('marque-ancienne');
});

it("SC-18f — aucun terme de développeur dans l'état d'une publication, en cours comme sans aboutissement", async () => {
  // Arrange / Act
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 30 * 1000);
  const enCours = texteVisible(mainDe((await ouvrir(db, '/admin/publier')).corps));
  await semerDepot(db, 'marque-neuve', Date.now() - 31 * MINUTE);
  const sansAboutissement = texteVisible(mainDe((await ouvrir(db, '/admin/publier')).corps));

  // Assert : l'état est bien dit, et dit sans jargon
  expect(enCours).toMatch(/en cours/);
  expect(sansAboutissement).toMatch(/pas abouti/);
  for (const terme of TERMES_DEVELOPPEUR) {
    expect(contientLeMot(enCours, terme), `en cours — ${terme}`).toBe(false);
    expect(contientLeMot(sansAboutissement, terme), `sans aboutissement — ${terme}`).toBe(false);
  }
});

it("SC-18g — publication déposée : n'importe quel écran gardé dit, dans le cadre, qu'elle est en cours", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 30 * 1000);

  for (const ecran of ECRANS_GARDES) {
    // Act
    const { reponse, corps } = await ouvrir(db, ecran);

    // Assert
    expect(reponse.status, ecran).toBe(200);
    expect(corps, ecran).toMatch(/Mise en ligne en cours/);
  }
});

it("SC-18g — publication déposée il y a plus de 30 minutes : n'importe quel écran gardé dit qu'elle n'a pas abouti, et le cadre mène à l'écran Publier", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-neuve', Date.now() - 31 * MINUTE);

  for (const ecran of ECRANS_GARDES) {
    // Act
    const { corps } = await ouvrir(db, ecran);

    // Assert
    expect(corps, ecran).toMatch(new RegExp(`La dernière mise en ligne n${APOSTROPHE}a pas abouti`));
    expect(corps, ecran).toMatch(/<a[^>]*href="\/admin\/publier[^"]*"[^>]*>[\s\S]{0,300}?n(?:'|’|&#39;)a pas abouti/);
  }
});

it('SC-18g — cas limite : aucune publication déposée, aucune pastille dans le cadre', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, null, null);

  // Act
  const { corps } = await ouvrir(db, '/admin/mes-pages');

  // Assert
  expect(corps).not.toMatch(/Mise en ligne en cours/);
  expect(corps).not.toMatch(/Site à jour/);
  expect(corps).not.toMatch(new RegExp(`n${APOSTROPHE}a pas abouti`));
});

it('SC-18h — aucun terme de développeur dans le menu, le geste « Publier », l’état de la dernière publication et les libellés du cadre', async () => {
  // Arrange
  const db = await assurerSchema();
  const etats = [Date.now() - 30 * 1000, Date.now() - 31 * MINUTE];

  for (const deposeLe of etats) {
    await semerDepot(db, 'marque-neuve', deposeLe);
    for (const ecran of ECRANS_GARDES) {
      // Act
      const { corps } = await ouvrir(db, ecran);
      const cadre = texteVisible(corps.replace(/<main[^>]*>[\s\S]*?<\/main>/, ' '));

      // Assert : le cadre porte bien l'état, sans jargon
      expect(cadre, ecran).toMatch(/mise en ligne/);
      for (const terme of TERMES_DEVELOPPEUR) {
        expect(contientLeMot(cadre, terme), `${ecran} — ${terme}`).toBe(false);
      }
    }
  }
});

// --- Tests retenus par la review du ticket 18 ---

interface LignePublication {
  derniere_marque: string | null;
  jeton: string | null;
  bail_jusqu_a: number | null;
  instantane: string | null;
  marque_en_cours: string | null;
}

async function lirePublication(db: DBLike): Promise<LignePublication> {
  const lignes = (await lireLignes(
    db,
    'select derniere_marque, jeton, bail_jusqu_a, instantane, marque_en_cours from publication where id = 1',
  )) as LignePublication[];
  return exigerPresent(lignes[0], 'la ligne de la publication');
}

async function depotPortantLaMarque(marque: string): Promise<ForgeEnMemoire> {
  return ForgeEnMemoire.creer({ 'content/publication.json': JSON.stringify({ publication: marque }) });
}

it("SC-18e — une relance qui échoue au dépôt n'enregistre rien et libère le verrou : la mise en ligne reste sans aboutissement", async () => {
  const db = await assurerSchema();
  const t0 = Date.now();
  const pannes: [string, (forge: ForgeEnMemoire) => void][] = [
    [
      'dépôt injoignable',
      (forge) => {
        forge.tomberEnPanne('injoignable');
      },
    ],
    [
      'écritures refusées',
      (forge) => {
        forge.refuserLesProchainesEcritures(3);
      },
    ],
  ];

  for (const [cas, provoquer] of pannes) {
    // Arrange
    await semerDepot(db, 'marque-ancienne', t0 - 40 * MINUTE);
    const forge = await depotPortantLaMarque('marque-ancienne');
    provoquer(forge);
    const commitsAvant = forge.historique().length;

    // Act
    const issue = await relancerLaMiseEnLigne(db, forge, t0);

    // Assert
    expect(issue, cas).toEqual({ ok: false, raison: 'echec' });
    expect(forge.historique(), cas).toHaveLength(commitsAvant);
    expect(await lirePublication(db), cas).toEqual({
      derniere_marque: 'marque-ancienne',
      jeton: null,
      bail_jusqu_a: null,
      instantane: null,
      marque_en_cours: null,
    });
    expect(await lireEtatDeLaPublication(db, t0, null), cas).toBe('pas-abouti');
  }
});

it('SC-18e — une relance demandée pendant qu’une publication tient le verrou est refusée, sans rien déposer', async () => {
  // Arrange
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerDepot(db, 'marque-ancienne', t0 - 40 * MINUTE);
  await db.prepare("update publication set jeton = 'j-tenu', bail_jusqu_a = ?1 where id = 1").bind(t0 + MINUTE).run();
  const forge = await depotPortantLaMarque('marque-ancienne');
  const commitsAvant = forge.historique().length;

  // Act
  const issue = await relancerLaMiseEnLigne(db, forge, t0);

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'en-cours' });
  expect(forge.historique()).toHaveLength(commitsAvant);
  const ligne = await lirePublication(db);
  expect(ligne.jeton).toBe('j-tenu');
  expect(ligne.derniere_marque).toBe('marque-ancienne');
});

it('SC-18e — sur une instance sans dépôt raccordé, la route de relance échoue proprement : 502, verrou libéré, marque inchangée', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerDepot(db, 'marque-ancienne', Date.now() - 40 * MINUTE);
  const session = await semerSession(db);

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/publication/relancer`, {
      method: 'POST',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json', origin: BASE },
    }),
  );

  // Assert
  expect(reponse.status).toBe(502);
  expect((await lirePublication(db)).derniere_marque).toBe('marque-ancienne');
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
});

it('SC-18e — une relance coupée avant de libérer le verrou ne bloque ni la relance suivante ni une publication en suspens', async () => {
  // Arrange : toute écriture qui libère le verrou est coupée
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerDepot(db, 'marque-ancienne', t0 - 40 * MINUTE);
  const coupure = (): Promise<never> => Promise.reject(new Error('coupure'));
  const dbCoupee: DBLike = {
    prepare: (requete) =>
      requete.includes('jeton = null') ? { bind: () => ({ run: coupure, all: coupure }), run: coupure } : db.prepare(requete),
    batch: (instructions) => db.batch(instructions),
  };
  const forgeEnPanne = await depotPortantLaMarque('marque-ancienne');
  forgeEnPanne.tomberEnPanne('injoignable');

  // Act 1
  await expect(relancerLaMiseEnLigne(dbCoupee, forgeEnPanne, t0)).rejects.toThrow('coupure');

  // Assert 1 : le verrou de la relance est resté pris, sans instantané
  expect(await compter(db, 'publication', 'jeton is not null and instantane is null')).toBe(1);

  // Act 2 : une fois le bail expiré
  const apresLeBail = t0 + BAIL + 1;
  const repris = await reprendreVerrou(db, 'autre', apresLeBail, BAIL);
  const relance = await relancerLaMiseEnLigne(db, await depotPortantLaMarque('marque-ancienne'), apresLeBail);

  // Assert 2 : aucune publication en suspens à reprendre ; la relance suivante aboutit et libère le verrou
  expect(repris).toBe(false);
  expect(relance).toEqual({ ok: true });
  const ligne = await lirePublication(db);
  expect(ligne.derniere_marque).not.toBe('marque-ancienne');
  expect(ligne.jeton).toBeNull();
  expect(ligne.instantane).toBeNull();
  expect(ligne.marque_en_cours).toBeNull();
});

it("ticket 18 — lire l'état « en ligne » vide les octets des images publiées que le site empaquette, et seulement elles (ADR-0020)", async () => {
  // Arrange : trois images publiées avec leurs octets, deux empaquetées par le site, une hors paquet
  const db = await assurerSchema();
  const t0 = Date.now();
  await semerImage(db, 'media-fixture-equipe', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerImage(db, 'media-fixture-hero', new Uint8Array([137, 80, 78, 71, 4, 5, 6]));
  await semerImage(db, 'image-hors-paquet', new Uint8Array([137, 80, 78, 71, 7, 8, 9]));
  await db.prepare('update medias set publiee_le = ?1').bind(t0).run();
  await semerDepot(db, 'marque-neuve', t0 - 2 * MINUTE);
  const longueur = async (id: string): Promise<unknown> =>
    ((await lireLignes(db, 'select length(octets) as n from medias where id = ?1', id)) as { n: number }[])[0]?.n;

  // Act 1 : le site n'est pas encore né de cette publication
  const enCours = await lireEtatDeLaPublication(db, t0, 'ancienne');

  // Assert 1 : rien n'est vidé
  expect(enCours).toBe('en-cours');
  expect(await longueur('media-fixture-equipe')).toBe(7);
  expect(await longueur('media-fixture-hero')).toBe(7);
  expect(await longueur('image-hors-paquet')).toBe(7);

  // Act 2 : le site est né de cette publication
  const enLigne = await lireEtatDeLaPublication(db, t0, 'marque-neuve');

  // Assert 2 : seules les images publiées ET empaquetées ont perdu leurs octets
  expect(enLigne).toBe('en-ligne');
  expect(await longueur('media-fixture-equipe'), 'publiée et empaquetée').toBe(0);
  expect(await longueur('media-fixture-hero'), 'publiée et empaquetée').toBe(0);
  expect(await longueur('image-hors-paquet'), 'publiée, hors paquet').toBe(7);
});
