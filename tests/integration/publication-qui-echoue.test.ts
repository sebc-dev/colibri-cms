/**
 * Change 011, ticket 16 — une publication qui échoue avant le dépôt ne change rien (FR-091),
 * et la clé d'écriture ne paraît jamais.
 *
 * Couture : vraie D1 locale dans `workerd` ; le dépôt est simulé (en mémoire, ou un `fetch` de
 * substitution devant l'adaptateur GitHub) ; la route est jouée par `exports.default.fetch`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  obtenirForge,
  poursuivrePublication,
} from '../../src/platform/publication/publier.ts';
import { TEXTE_PUBLICATION_ECHEC, TEXTE_PUBLICATION_PAS_POSSIBLE } from '../../src/admin/textes.ts';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  exigerPresent,
  lecteurDesOriginales,
  lireLignes,
  nettoyer,
  semerBrouillonEmplacement,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

const CLE = 'ghp_cle-secrete-de-test-9876543210';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await nettoyer();
});

async function confirmer(db: DBLike): Promise<string> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  return exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
}

async function brouillons(db: DBLike): Promise<unknown[]> {
  return lireLignes(db, 'select page_slug, id_emplacement, contenu, maj_le from brouillons_emplacements order by 1, 2');
}

const DEVELOPPEUR = /\b(commit|branche|build|déploiement|deploiement|github|dépôt|depot|token|jeton|api|git)\b/i;

it("SC-16a — le dépôt refuse l'écriture : brouillons intacts avec leur marque, publié inchangé, le texte dit que rien n'a changé", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Nouveaux tarifs.' }, 1000);
  const avant = await brouillons(db);
  const jeton = await confirmer(db);
  const forge = await ForgeEnMemoire.creer({});
  forge.tomberEnPanne('acces-refuse');

  // Act
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());

  // Assert
  expect(issue.ok).toBe(false);
  expect(await brouillons(db)).toEqual(avant);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
  expect(forge.chemins()).toEqual([]);
  // la marque de brouillon : l'éditeur montre toujours le brouillon, marqué
  const session = await semerSession(db);
  const page = await exports.default.fetch(
    new Request(`${BASE}/admin/pages/tarifs`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` } }),
  );
  const html = await page.text();
  expect(html).toContain('Nouveaux tarifs.');
  expect(html).toContain('data-pastille-brouillon');
  // l'écran dit que la publication n'a pas pu se faire et que rien n'a changé
  expect(TEXTE_PUBLICATION_ECHEC).toContain("n'a pas pu se faire");
  expect(TEXTE_PUBLICATION_ECHEC).toContain("Rien n'a changé");
});

it("SC-16b — instance sans dépôt ou sans clé : aucun adaptateur, rien n'est déposé, brouillons intacts (/suite répond l'échec)", async () => {
  // Arrange
  const appels: Request[] = [];
  const traceur = (requete: Request): Promise<Response> => {
    appels.push(requete);
    return Promise.resolve(Response.json({}));
  };
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Pas encore.' }, 1000);
  const avant = await brouillons(db);

  // Act / Assert : dépôt ou clé absents (ou vides) -> pas de dépôt distant, aucun appel réseau
  expect(obtenirForge(null, CLE, traceur)).toBeNull();
  expect(obtenirForge('cliente/son-site', undefined, traceur)).toBeNull();
  expect(obtenirForge('cliente/son-site', '', traceur)).toBeNull();
  expect(obtenirForge('pas un depot', CLE, traceur)).toBeNull();
  expect(obtenirForge('cliente/son-site', CLE, traceur)).not.toBeNull();
  expect(appels).toEqual([]);

  // La route, sur l'instance de test (sans dépôt) : échec, rien n'a changé
  const session = await semerSession(db);
  const etat = await calculerEtatPublication(db, Date.now());
  const entetes = { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json', origin: BASE };
  const confirmation = await exports.default.fetch(
    new Request(`${BASE}/admin/publication`, { method: 'POST', headers: entetes, body: JSON.stringify({ empreinte: etat.empreinte }) }),
  );
  const { jeton } = (await confirmation.json()) as { jeton: string };
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/publication/suite`, { method: 'POST', headers: entetes, body: JSON.stringify({ jeton }) }),
  );
  expect(reponse.status).toBe(502);
  expect(await brouillons(db)).toEqual(avant);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);

  // Les textes montrés : la publication n'a pas pu se faire, sans terme de développeur
  expect(TEXTE_PUBLICATION_ECHEC).toContain("n'a pas pu se faire");
  expect(TEXTE_PUBLICATION_ECHEC).not.toMatch(DEVELOPPEUR);
  expect(TEXTE_PUBLICATION_PAS_POSSIBLE).toContain("Rien n'a changé");
  expect(TEXTE_PUBLICATION_PAS_POSSIBLE).not.toMatch(DEVELOPPEUR);
});

it("SC-16c — une publication aboutit puis une autre échoue : la clé n'est dans aucune réponse, aucun écran, aucune ligne de journal", async () => {
  // Arrange
  const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => undefined),
  );
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Première.' }, 1000);
  const reussie = await poursuivrePublication(db, await confirmer(db), Date.now(), await ForgeEnMemoire.creer({}), lecteurDesOriginales());
  expect(reussie.ok).toBe(true);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Seconde.' }, 2000);
  const refus = (requete: Request): Promise<Response> => {
    expect(requete.headers.get('Authorization')).toBe(`Bearer ${CLE}`);
    return Promise.resolve(Response.json({ message: 'Bad credentials' }, { status: 401 }));
  };
  const forge = exigerPresent(obtenirForge('cliente/son-site', CLE, refus), 'adaptateur attendu');

  // Act
  const echouee = await poursuivrePublication(db, await confirmer(db), Date.now(), forge, lecteurDesOriginales());

  // Assert
  expect(echouee.ok).toBe(false);
  expect(JSON.stringify(echouee)).not.toContain(CLE);
  expect(JSON.stringify(reussie)).not.toContain(CLE);
  const session = await semerSession(db);
  const ecran = await exports.default.fetch(
    new Request(`${BASE}/admin/publication`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` } }),
  );
  expect(await ecran.text()).not.toContain(CLE);
  const journal = espions.flatMap((e) => e.mock.calls).map((appel) => JSON.stringify(appel)).join('\n');
  expect(journal).not.toContain(CLE);
});
