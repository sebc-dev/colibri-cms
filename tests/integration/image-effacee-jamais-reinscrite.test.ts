/**
 * Une image effacée par une publication n'est jamais réinscrite dans la bibliothèque.
 *
 * Défaut reproduit sur la recette le 2026-11-03 (bilan de `docs/cahier-de-test.md`) : entre le dépôt
 * d'une publication qui efface une image et la reconstruction du site, le site en service empaquette
 * encore la fiche de cette image. Ouvrir l'écran Médias, la fiche d'une image ou l'écran Publier
 * (`inscrireImagesDeDepart`) la réinscrivait comme publiée ; la publication suivante demandait au
 * dépôt de supprimer une fiche qu'il n'a plus, et GitHub refusait l'écriture entière, à chaque essai.
 * La spec `publication` exige qu'une image effacée disparaisse de la bibliothèque.
 *
 * Couture : vraie D1 locale dans `workerd`, dépôt simulé en mémoire.
 */
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import type { Forge } from '../../src/core/publication/forge.ts';
import type { FicheMedia } from '../../src/core/medias/fiche.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivrePublication,
} from '../../src/platform/publication/publier.ts';
import { inscrireImagesDeDepart } from '../../src/platform/medias/magasin.ts';
import {
  assurerSchema,
  compter,
  exigerPresent,
  lecteurDesOriginales,
  nettoyer,
  semerBrouillonEmplacement,
  semerImage,
  type DBLike,
} from './outils-publication.ts';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

async function publier(db: DBLike, forge: Forge): Promise<void> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());
  expect(issue.ok).toBe(true);
}

/** La fiche que le site en service empaquette encore, tant qu'il n'est pas reconstruit. */
const FICHE_ENCORE_EMPAQUETEE: FicheMedia = {
  id: 'image-effacee',
  nomOrigine: 'image-effacee.png',
  format: 'png',
  largeur: 1,
  hauteur: 1,
  description: '',
};

it("une image effacée par une publication n'est pas réinscrite par la fiche que le site en service empaquette encore", async () => {
  // Arrange : l'image est publiée sur Tarifs, puis remplacée et effacée par une seconde publication
  const db = await assurerSchema();
  await semerImage(db, 'image-effacee', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-effacee' });
  const forge = await ForgeEnMemoire.creer({});
  await publier(db, forge);
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'media-fixture-hero' });
  await publier(db, forge);
  expect(await compter(db, 'medias', 'id = ?1', 'image-effacee')).toBe(0);

  // Act : avant la reconstruction, un écran réinscrit les images que le site en service empaquette
  await inscrireImagesDeDepart(db, [FICHE_ENCORE_EMPAQUETEE], Date.now());

  // Assert : l'image reste hors de la bibliothèque, et la publication suivante n'a rien à effacer
  expect(await compter(db, 'medias', 'id = ?1', 'image-effacee')).toBe(0);
  const etat = await calculerEtatPublication(db, Date.now());
  expect(etat.recapitulatif.imagesEffacees.map((i) => i.id)).not.toContain('image-effacee');
});

it('une image effacée puis publiée de nouveau sous la même identité redevient réinscriptible', async () => {
  // Arrange : l'image est publiée, effacée, puis téléversée et publiée de nouveau sous la même identité
  const db = await assurerSchema();
  const octets = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  await semerImage(db, 'image-effacee', octets);
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-effacee' });
  const forge = await ForgeEnMemoire.creer({});
  await publier(db, forge);
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'media-fixture-hero' });
  await publier(db, forge);
  await semerImage(db, 'image-effacee', octets);
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-effacee' });
  await publier(db, forge);
  await db.prepare('delete from medias where id = ?1').bind('image-effacee').run();

  // Act : un écran réinscrit les images empaquetées
  await inscrireImagesDeDepart(db, [FICHE_ENCORE_EMPAQUETEE], Date.now());

  // Assert : l'image publiée est de nouveau inscrite
  expect(await compter(db, 'medias', 'id = ?1', 'image-effacee')).toBe(1);
});
