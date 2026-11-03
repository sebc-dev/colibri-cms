/**
 * Une pose d'image qui vise une image absente de la bibliothèque est refusée, sans rien écrire.
 *
 * Défaut constaté en recette le 2026-11-03 (bilan de `docs/cahier-de-test.md`) : la route d'un
 * emplacement acceptait n'importe quelle identité d'image — depuis un onglet resté ouvert sur un
 * sélecteur périmé, ou par requête directe. La publication déposait alors une page qui pose une
 * image absente, la reconstruction du site échouait (`ImageManquanteError`) et l'aperçu de la page
 * répondait 500. La spec `pages-et-emplacements` ne fait poser qu'une image « déjà présente dans la
 * bibliothèque », et la spec `site-public` exige qu'une page publiée n'affiche jamais d'image manquante.
 *
 * Le refus répond 404 : l'îlot dit alors que l'écran n'est plus à jour et invite à le recharger.
 *
 * Couture : `exports.default.fetch` contre le worker compilé, vraie D1 locale dans `workerd`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  nettoyer,
  semerImage,
  semerSession,
} from './outils-publication.ts';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

const OCTETS = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

function poser(session: string, emplacement: string, corps: unknown): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}/admin/pages/accueil/emplacements/${emplacement}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${NOM_COOKIE_SESSION}=${session}` },
      body: JSON.stringify(corps),
    }),
  );
}

it("poser dans un emplacement d'image une image absente de la bibliothèque est refusé, et aucun brouillon n'est écrit", async () => {
  // Arrange
  const db = await assurerSchema();
  const session = await semerSession(db);

  // Act
  const reponse = await poser(session, 'image-hero', { mediaId: 'image-disparue' });

  // Assert
  expect(reponse.status).toBe(404);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'image-introuvable' });
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'accueil')).toBe(0);
});

it("composer une galerie dont une image est absente de la bibliothèque est refusé en entier, et aucun brouillon n'est écrit", async () => {
  // Arrange
  const db = await assurerSchema();
  const session = await semerSession(db);
  await semerImage(db, 'image-presente', OCTETS);

  // Act
  const reponse = await poser(session, 'galerie-realisations', { mediaIds: ['image-presente', 'image-disparue'] });

  // Assert
  expect(reponse.status).toBe(404);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'image-introuvable' });
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'accueil')).toBe(0);
});

it('poser une image présente dans la bibliothèque reste accepté', async () => {
  // Arrange
  const db = await assurerSchema();
  const session = await semerSession(db);
  await semerImage(db, 'image-presente', OCTETS);

  // Act
  const reponse = await poser(session, 'galerie-realisations', { mediaIds: ['image-presente'] });

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'accueil')).toBe(1);
});

it("une image posée au départ par l'intégrateur reste acceptée, même avant toute visite de l'écran Médias", async () => {
  // Arrange : base neuve, aucune image inscrite ; la fiche `media-fixture-hero` est empaquetée
  const db = await assurerSchema();
  const session = await semerSession(db);
  expect(await compter(db, 'medias', 'id = ?1', 'media-fixture-hero')).toBe(0);

  // Act
  const reponse = await poser(session, 'image-hero', { mediaId: 'media-fixture-hero' });

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'accueil')).toBe(1);
});
