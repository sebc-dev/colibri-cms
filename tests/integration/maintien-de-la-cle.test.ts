/**
 * Change 020, ticket 10 — l'instance maintient la clé d'écriture en vie chaque semaine.
 *
 * Couture : vraie D1 locale dans `workerd` ; le seul double est `globalThis.fetch`, limité à
 * `api.github.com` (tout autre appel passe au vrai `fetch`). Le passage hebdomadaire est joué par
 * la fonction du maintien, telle que l'échéance l'appelle.
 */
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import wranglerAstro from '../../wrangler.astro.jsonc?raw';
import wranglerTest from '../../wrangler.jsonc?raw';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import { maintenirLaCle } from '../../src/platform/publication/maintien-de-la-cle.ts';
import entree from '../../src/entree-worker.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivrePublication,
} from '../../src/platform/publication/publier.ts';
import {
  assurerSchema,
  exigerPresent,
  lecteurDesOriginales,
  lireLignes,
  nettoyer,
  obtenirDB,
  semerBrouillonEmplacement,
  semerSession,
} from './outils-publication.ts';

// Le `fetch` d'Astro dépend de modules virtuels que seul le bâtiment fournit : hors sujet ici.
vi.mock('@astrojs/cloudflare/handler', () => ({ handle: () => new Response(null, { status: 204 }) }));

const CLE = 'ghp_cle-secrete-du-depot-0123456789';
const DEPOT = 'cliente/site-vitrine';
const MESSAGE = '[maintien] clé du dépôt';
const TABLES = [
  'sessions',
  'brouillons_emplacements',
  'brouillons_reglages',
  'brouillons_formulaires',
  'publies_emplacements',
  'publies_reglages',
  'publies_formulaires',
  'publication',
];

interface AppelGithub {
  methode: string;
  url: string;
  autorisation: string | null;
}

type Reponse = { statut: number } | 'delai' | 'coupure';

let appels: AppelGithub[];
let journal: unknown[][];
let fetchOrigine: typeof globalThis.fetch;

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
  appels = [];
  journal = [];
  fetchOrigine = globalThis.fetch;
  for (const methode of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, methode).mockImplementation((...args: unknown[]) => {
      journal.push(args);
    });
  }
});
afterEach(async () => {
  globalThis.fetch = fetchOrigine;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await nettoyer();
});

function simulerGithub(reponse: Reponse): void {
  globalThis.fetch = async (entree: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requete = new Request(entree, init);
    if (new URL(requete.url).hostname !== 'api.github.com') return fetchOrigine(entree, init);
    appels.push({
      methode: requete.method.toUpperCase(),
      url: requete.url,
      autorisation: requete.headers.get('authorization'),
    });
    if (reponse === 'delai') throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    if (reponse === 'coupure') throw new TypeError('Network connection lost');
    if (reponse.statut !== 200) return new Response('{"message":"refus"}', { status: reponse.statut });
    return new Response(JSON.stringify({ ref: 'refs/heads/main', object: { sha: 'abc123' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

function lignesDuMaintien(): unknown[][] {
  return journal.filter((appel) => appel[0] === MESSAGE);
}

function toutLeJournal(): string {
  return JSON.stringify(journal);
}

async function photographie(): Promise<unknown[]> {
  const db = obtenirDB();
  const instantane: unknown[] = [];
  for (const table of TABLES) instantane.push(await lireLignes(db, `select * from ${table}`));
  return instantane;
}

it('SC-10a — dépôt et clé configurés : une lecture part vers le dépôt avec la clé, et une trace dit que la clé a été acceptée', async () => {
  // Arrange
  simulerGithub({ statut: 200 });

  // Act
  await maintenirLaCle(DEPOT, CLE);

  // Assert
  expect(appels).toHaveLength(1);
  expect(appels[0]?.methode).toBe('GET');
  expect(appels[0]?.url).toContain(`/repos/${DEPOT}/`);
  expect(appels[0]?.autorisation).toBe(`Bearer ${CLE}`);
  const lignes = lignesDuMaintien();
  expect(lignes).toHaveLength(1);
  expect(JSON.stringify(lignes[0])).toContain('acceptee');
});

it('SC-10a — l’échéance est hebdomadaire (lundi 4 h 17 UTC), identique dans les deux configurations', () => {
  // Assert
  expect(wranglerAstro).toContain('"17 4 * * 1"');
  expect(wranglerTest).toContain('"17 4 * * 1"');
});

it('SC-10b — aucune écriture ne part vers le dépôt, ni brouillons, ni publication, ni sessions ne changent', async () => {
  // Arrange
  const db = obtenirDB();
  await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Brouillon.' });
  const avant = await photographie();
  simulerGithub({ statut: 200 });

  // Act
  await maintenirLaCle(DEPOT, CLE);

  // Assert
  expect(appels.length).toBeGreaterThan(0);
  expect(appels.every((appel) => appel.methode === 'GET')).toBe(true);
  expect(await photographie()).toEqual(avant);
});

it.each([401, 403])(
  'SC-10c — le dépôt refuse la clé (%i) : trace « accès refusé », sans la clé ni aucune partie d’elle',
  async (statut) => {
    // Arrange
    simulerGithub({ statut });

    // Act
    await maintenirLaCle(DEPOT, CLE);

    // Assert
    const lignes = lignesDuMaintien();
    expect(lignes).toHaveLength(1);
    expect(JSON.stringify(lignes[0])).toContain('acces-refuse');
    const trace = toutLeJournal();
    expect(trace).not.toContain(CLE);
    for (let debut = 0; debut + 8 <= CLE.length; debut += 1) {
      expect(trace, `fragment de la clé à ${String(debut)}`).not.toContain(CLE.slice(debut, debut + 8));
    }
  },
);

it('SC-10c — dépôt introuvable (404) : trace « dépôt introuvable », sans la clé', async () => {
  // Arrange
  simulerGithub({ statut: 404 });

  // Act
  await maintenirLaCle(DEPOT, CLE);

  // Assert
  expect(JSON.stringify(lignesDuMaintien()[0])).toContain('depot-introuvable');
  expect(toutLeJournal()).not.toContain(CLE);
});

it.each<[string, Reponse]>([
  ['erreur serveur 503', { statut: 503 }],
  ['délai dépassé', 'delai'],
  ['coupure réseau', 'coupure'],
])('SC-10d — dépôt qui ne répond pas (%s) : trace « dépôt injoignable », passage terminé sans autre effet', async (_nom, reponse) => {
  // Arrange
  const avant = await photographie();
  simulerGithub(reponse);

  // Act
  await expect(maintenirLaCle(DEPOT, CLE)).resolves.toBeUndefined();

  // Assert
  expect(appels.every((appel) => appel.methode === 'GET')).toBe(true);
  const lignes = lignesDuMaintien();
  expect(lignes).toHaveLength(1);
  expect(JSON.stringify(lignes[0])).toContain('depot-injoignable');
  expect(toutLeJournal()).not.toContain(CLE);
  expect(await photographie()).toEqual(avant);
});

it.each<[string, unknown, unknown]>([
  ['sans dépôt', null, CLE],
  ['sans clé', DEPOT, undefined],
  ['clé vide', DEPOT, ''],
])('SC-10e — %s : aucun appel ne part, trace « dépôt non configuré »', async (_nom, depot, cle) => {
  // Arrange
  simulerGithub({ statut: 200 });

  // Act
  await maintenirLaCle(depot, cle);

  // Assert
  expect(appels).toEqual([]);
  const lignes = lignesDuMaintien();
  expect(lignes).toHaveLength(1);
  expect(JSON.stringify(lignes[0])).toContain('depot-non-configure');
});

it('SC-10f — échéance pendant une publication en cours : la publication se poursuit et aboutit comme sans cet appel', async () => {
  // Arrange
  const db = obtenirDB();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Nouveaux tarifs.' }, 1000);
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
  const verrouAvant = await lireLignes(db, 'select * from publication');
  const forge = await ForgeEnMemoire.creer({});
  simulerGithub({ statut: 200 });

  // Act
  await maintenirLaCle(DEPOT, CLE);
  const verrouPendant = await lireLignes(db, 'select * from publication');
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());

  // Assert
  expect(verrouPendant).toEqual(verrouAvant);
  expect(issue.ok).toBe(true);
  expect([...forge.fichiers().keys()].filter((chemin) => chemin.startsWith('content/pages/tarifs')).length).toBeGreaterThan(0);
});

async function jouerLEcheance(env: { JETON_DEPOT?: string }): Promise<number> {
  const promesses: Promise<unknown>[] = [];
  entree.scheduled({}, env, {
    waitUntil(promesse: Promise<unknown>): void {
      promesses.push(promesse);
    },
  });
  await Promise.all(promesses);
  return promesses.length;
}

it('SC-10a — le vrai point d’entrée `scheduled` remet le passage à waitUntil : une lecture part avec la clé, une trace est consignée', async () => {
  // Arrange
  vi.stubGlobal('__DEPOT_DE_PUBLICATION__', DEPOT);
  simulerGithub({ statut: 200 });

  // Act
  const remises = await jouerLEcheance({ JETON_DEPOT: CLE });

  // Assert
  expect(remises).toBe(1);
  expect(appels).toHaveLength(1);
  expect(appels[0]?.methode).toBe('GET');
  expect(appels[0]?.autorisation).toBe(`Bearer ${CLE}`);
  expect(lignesDuMaintien()).toHaveLength(1);
});

it('SC-10e — l’échéance sans clé configurée consigne dépôt non configuré, sans aucun appel vers le dépôt', async () => {
  // Arrange
  vi.stubGlobal('__DEPOT_DE_PUBLICATION__', DEPOT);
  simulerGithub({ statut: 200 });

  // Act
  const remises = await jouerLEcheance({});

  // Assert
  expect(remises).toBe(1);
  expect(appels).toEqual([]);
  const lignes = lignesDuMaintien();
  expect(lignes).toHaveLength(1);
  expect(JSON.stringify(lignes[0])).toContain('depot-non-configure');
});
