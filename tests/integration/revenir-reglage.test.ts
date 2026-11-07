/**
 * Change 015, ticket 03 — Un réglage revient à sa version publiée.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. Session, brouillons et état publié semés
 * directement. Le Dialog et l'événement `brouillon-enregistre` relèvent du
 * navigateur, hors de cette couture.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach } from 'vitest';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  lireLignes,
  nettoyer,
  obtenirDB,
  semerBrouillonReglage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';
import { TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE } from '../../src/admin/textes.ts';

const MARQUE = 'data-pastille-brouillon';
const ORIGINE = 'https://example.com';
const TELEPHONE_PUBLIE = '04 99 88 77 66';
const TELEPHONE_BROUILLON = '04 11 22 33 44';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

async function semerPublie(db: DBLike, reglage: string, contenu: unknown): Promise<void> {
  await db
    .prepare('insert into publies_reglages (reglage, contenu, publie_le) values (?1, ?2, ?3)')
    .bind(reglage, JSON.stringify(contenu), Date.now())
    .run();
}

function revenir(reglage: string, cookie: string, origine = ORIGINE): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}/admin/reglages/${reglage}/revenir`, {
      method: 'POST',
      headers: { origin: origine, cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

async function lireReglages(cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/reglages`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function carte(html: string, id: string): string {
  const section = new RegExp(`<section[^>]*aria-labelledby="${id}"[\\s\\S]*?</section>`).exec(html)?.[0];
  expect(section, `la carte ${id}`).toBeDefined();
  return section ?? '';
}

async function brouillonsPresents(db: DBLike): Promise<string[]> {
  const lignes = (await lireLignes(db, 'select reglage from brouillons_reglages order by reglage')) as {
    reglage: string;
  }[];
  return lignes.map((l) => l.reglage);
}

it('SC-03a — les coordonnées publiées puis le téléphone modifié : la carte revenue présente le téléphone publié, sans marque', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerPublie(db, 'coordonnees', { telephone: TELEPHONE_PUBLIE });
  await semerBrouillonReglage(db, 'coordonnees', { telephone: TELEPHONE_BROUILLON });
  expect(carte(await lireReglages(cookie), 'carte-coordonnees')).toContain(MARQUE);

  // Act
  const reponse = await revenir('coordonnees', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const apres = carte(await lireReglages(cookie), 'carte-coordonnees');
  expect(apres).toContain(TELEPHONE_PUBLIE);
  expect(apres).not.toContain(TELEPHONE_BROUILLON);
  expect(apres).not.toContain(MARQUE);
  expect(await compter(db, 'brouillons_reglages', 'reglage = ?1', 'coordonnees')).toBe(0);
});

it('SC-03b — après le retour des réseaux sociaux, les coordonnées et la mention portent toujours leur brouillon inchangé', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  const reseaux = [{ nom: 'Instagram', lien: 'https://instagram.com/brouillon' }];
  await semerBrouillonReglage(db, 'coordonnees', { telephone: TELEPHONE_BROUILLON });
  await semerBrouillonReglage(db, 'reseaux', reseaux);
  await semerBrouillonReglage(db, 'mention', 'Mention corrigée en brouillon.');
  const avant = await lireLignes(
    db,
    "select reglage, contenu, maj_le from brouillons_reglages where reglage in ('coordonnees', 'mention') order by reglage",
  );

  // Act
  const reponse = await revenir('reseaux', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await brouillonsPresents(db)).toEqual(['coordonnees', 'mention']);
  const apres = await lireLignes(
    db,
    "select reglage, contenu, maj_le from brouillons_reglages where reglage in ('coordonnees', 'mention') order by reglage",
  );
  expect(apres).toEqual(avant);
  const html = await lireReglages(cookie);
  expect(carte(html, 'carte-coordonnees')).toContain(MARQUE);
  expect(carte(html, 'carte-reseaux')).not.toContain(MARQUE);
});

it("SC-03c — le geste de retour forgé, sans cookie de session, atteint la route, est refusé (401) et le brouillon est intact", async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerPublie(db, 'coordonnees', { telephone: TELEPHONE_PUBLIE });
  await semerBrouillonReglage(db, 'coordonnees', { telephone: TELEPHONE_BROUILLON });
  const avant = await lireLignes(db, 'select reglage, contenu, maj_le from brouillons_reglages');

  // Act : le navigateur n'attache jamais le cookie SameSite=Strict à une
  // requête inter-sites (ADR-0011). Origin de l'application pour franchir
  // checkOrigin d'Astro et atteindre la route elle-même.
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/reglages/coordonnees/revenir`, {
      method: 'POST',
      headers: { origin: ORIGINE },
    }),
  );

  // Assert
  expect(reponse.status).toBe(401);
  expect(await lireLignes(db, 'select reglage, contenu, maj_le from brouillons_reglages')).toEqual(avant);
  expect(carte(await lireReglages(cookie), 'carte-coordonnees')).toContain(TELEPHONE_BROUILLON);
});

it("SC-03c — depuis une autre origine, même avec cookie, le geste est refusé (403) et le brouillon est intact", async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerPublie(db, 'coordonnees', { telephone: TELEPHONE_PUBLIE });
  await semerBrouillonReglage(db, 'coordonnees', { telephone: TELEPHONE_BROUILLON });
  const avant = await lireLignes(db, 'select reglage, contenu, maj_le from brouillons_reglages');

  // Act
  const reponse = await revenir('coordonnees', cookie, 'https://pirate.example');

  // Assert
  expect(reponse.status).toBe(403);
  expect(await lireLignes(db, 'select reglage, contenu, maj_le from brouillons_reglages')).toEqual(avant);
  expect(carte(await lireReglages(cookie), 'carte-coordonnees')).toContain(TELEPHONE_BROUILLON);
});

async function poserVerrou(db: DBLike, bailJusquA: number): Promise<void> {
  await db
    .prepare('update publication set jeton = ?1, bail_jusqu_a = ?2, instantane = ?3 where id = 1')
    .bind('jeton-de-test', bailJusquA, '{}')
    .run();
}

async function brouillonCoordonnees(db: DBLike): Promise<unknown[]> {
  return lireLignes(db, "select reglage, contenu, maj_le from brouillons_reglages where reglage = 'coordonnees'");
}

it.each([
  ['bail courant', () => Date.now() + 60_000],
  ['bail dépassé', () => Date.now() - 600_000],
])('le geste est refusé (409) pendant une publication, %s, et le brouillon est intact', async (_cas, bail) => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonReglage(db, 'coordonnees', { telephone: TELEPHONE_BROUILLON });
  const avant = await brouillonCoordonnees(db);
  await poserVerrou(db, bail());

  // Act
  const reponse = await revenir('coordonnees', cookie);

  // Assert
  expect(reponse.status).toBe(409);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'publication-en-cours' });
  expect(await brouillonCoordonnees(db)).toEqual(avant);
});

it('une fois la publication terminée, le geste refusé aboutit', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonReglage(db, 'coordonnees', { telephone: TELEPHONE_BROUILLON });
  await poserVerrou(db, Date.now() + 60_000);
  expect((await revenir('coordonnees', cookie)).status).toBe(409);
  await db.prepare('update publication set instantane = null, jeton = null, bail_jusqu_a = null where id = 1').run();

  // Act
  const reponse = await revenir('coordonnees', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_reglages', 'reglage = ?1', 'coordonnees')).toBe(0);
});

const BROUILLONS_PAR_REGLAGE: Record<string, unknown> = {
  coordonnees: { telephone: TELEPHONE_BROUILLON },
  reseaux: [{ nom: 'Instagram', lien: 'https://instagram.com/brouillon' }],
  mention: 'Mention corrigée en brouillon.',
};

it.each(Object.keys(BROUILLONS_PAR_REGLAGE))(
  'le geste n’est offert que sur la carte %s qui porte un brouillon, et disparaît après le retour',
  async (reglage) => {
    // Arrange
    const db = obtenirDB();
    const cookie = await semerSession(db);
    await semerBrouillonReglage(db, reglage, BROUILLONS_PAR_REGLAGE[reglage]);
    const autres = Object.keys(BROUILLONS_PAR_REGLAGE).filter((r) => r !== reglage);

    // Act
    const html = await lireReglages(cookie);

    // Assert
    const concernee = carte(html, `carte-${reglage}`);
    expect(concernee).toContain(`data-reglage="${reglage}"`);
    expect(concernee).toContain('data-avec-brouillon');
    expect(concernee).toContain(TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE);
    for (const autre of autres) {
      const voisine = carte(html, `carte-${autre}`);
      expect(voisine).toContain(`data-reglage="${autre}"`);
      expect(voisine).not.toContain('data-avec-brouillon');
      expect(voisine).not.toContain(TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE);
    }

    // Act
    expect((await revenir(reglage, cookie)).status).toBe(200);

    // Assert
    const apres = carte(await lireReglages(cookie), `carte-${reglage}`);
    expect(apres).not.toContain('data-avec-brouillon');
    expect(apres).not.toContain(TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE);
  },
);
