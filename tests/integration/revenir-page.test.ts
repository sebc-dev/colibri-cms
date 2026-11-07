/**
 * Change 015, ticket 01 — Une page revient à sa version publiée.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. Session valide, brouillons et état publié semés
 * directement ; la déclaration lue est celle du dépôt (`content/`). Ce que
 * seul un navigateur montre (Dialog, titre présenté comme texte SC-01e, événement `brouillon-enregistre`) vit
 * dans `tests/parcours/revenir-page.parcours.ts`.
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
  semerBrouillonEmplacement,
  semerBrouillonFormulaire,
  semerBrouillonReglage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

const MARQUE = 'data-pastille-brouillon';
const ORIGINE = 'https://example.com';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

async function semerPublie(db: DBLike, page: string, idEmplacement: string, contenu: Record<string, unknown>) {
  await db
    .prepare(
      'insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(page, idEmplacement, String(contenu.nature), JSON.stringify(contenu), Date.now())
    .run();
}

function texte(markdown: string): Record<string, unknown> {
  return { nature: 'texte-riche', markdown };
}
function bouton(libelle: string): Record<string, unknown> {
  return { nature: 'bouton-action', libelle, destination: '/contact' };
}

function revenir(slug: string, cookie?: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}/admin/pages/${slug}/revenir`, {
      method: 'POST',
      headers: {
        origin: ORIGINE,
        'content-type': 'application/json',
        ...(cookie ? { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } : {}),
      },
    }),
  );
}

async function lire(route: string, cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}${route}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function zoneMarqueEditeur(html: string): string {
  const zone = /<span id="zone-pastille-brouillon">([\s\S]*?)<\/span>\s*<\/h1>/.exec(html)?.[1];
  expect(zone, "la zone de la marque dans le titre de l'éditeur").toBeDefined();
  return zone ?? '';
}

function ligne(html: string, titre: string): string {
  return new RegExp(`<li>${titre}[\\s\\S]*?</li>`).exec(html)?.[0] ?? '';
}

it('SC-01a — Tarifs publiée puis corrigée revient à sa version publiée, sans marque, éditeur, liste et aperçu', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerPublie(db, 'tarifs', 'presentation', texte('Présentation publiée des tarifs.'));
  await semerPublie(db, 'tarifs', 'bouton-devis', bouton('Réserver ce gâteau'));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Présentation corrigée en brouillon.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'bouton-devis', bouton('Bouton corrigé en brouillon'));

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const editeur = await lire('/admin/pages/tarifs', cookie);
  expect(editeur).toContain('Présentation publiée des tarifs.');
  expect(editeur).toContain('Réserver ce gâteau');
  expect(editeur).not.toContain('corrigée en brouillon');
  expect(editeur).not.toContain('Bouton corrigé en brouillon');
  expect(zoneMarqueEditeur(editeur)).not.toContain(MARQUE);
  const liste = await lire('/admin/mes-pages', cookie);
  expect(ligne(liste, 'Tarifs')).not.toBe('');
  expect(ligne(liste, 'Tarifs')).not.toContain(MARQUE);
  const apercu = await lire('/admin/apercu/tarifs', cookie);
  expect(apercu).toContain('Présentation publiée des tarifs.');
  expect(apercu).toContain('Réserver ce gâteau');
  expect(apercu).not.toContain('corrigée en brouillon');
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(0);
});

it('SC-01b — Contact jamais publiée revient au texte de départ, sans marque', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'contact', 'presentation', texte('Texte corrigé puis revenu.'));

  // Act
  const reponse = await revenir('contact', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const editeur = await lire('/admin/pages/contact', cookie);
  expect(editeur).toContain("Pour toute demande, écrivez-nous ou appelez l'atelier");
  expect(editeur).not.toContain('Texte corrigé puis revenu.');
  expect(zoneMarqueEditeur(editeur)).not.toContain(MARQUE);
});

it("SC-01c — l'éditeur d'une page sans brouillon porte le modèle de marque et la zone où paraît l'offre de retour", async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);

  // Act
  const editeur = await lire('/admin/pages/tarifs', cookie);

  // Assert : l'offre est absente sans brouillon, et son îlot est monté pour la révéler.
  expect(editeur).not.toContain('Revenir à la version publiée');
  expect(editeur).toContain('id="zone-pastille-brouillon"');
  expect(editeur).toContain('id="modele-marque-brouillon"');
  // Avec un brouillon, l'offre est servie dans le fil de retour.
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Une première correction.'));
  const avecBrouillon = await lire('/admin/pages/tarifs', cookie);
  expect(avecBrouillon).toContain('Revenir à la version publiée');
});

it("SC-01d — se raviser garde le brouillon intact : aucune écriture sans le geste de confirmation", async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon à garder.'));

  // Act : l'éditeur est lu, la confirmation ne part jamais.
  const editeur = await lire('/admin/pages/tarifs', cookie);

  // Assert : l'offre est là, et sans geste confirmé le brouillon garde sa marque.
  expect(editeur).toContain('Revenir à la version publiée');
  expect(zoneMarqueEditeur(editeur)).toContain(MARQUE);
  expect(editeur).toContain('Brouillon à garder.');
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(1);
});

it('SC-01f — le retour confirmé depuis deux onglets, l’un après l’autre, aboutit deux fois', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerPublie(db, 'tarifs', 'presentation', texte('Publiée.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon.'));

  // Act
  const premier = await revenir('tarifs', cookie);
  const second = await revenir('tarifs', cookie);

  // Assert
  expect(premier.status).toBe(200);
  expect(second.status).toBe(200);
  const editeur = await lire('/admin/pages/tarifs', cookie);
  expect(editeur).toContain('Publiée.');
  expect(zoneMarqueEditeur(editeur)).not.toContain(MARQUE);
});

it('SC-01g — le retour de Tarifs ne touche ni Accueil, ni la mention, ni Devis gâteau', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'accueil', 'presentation', texte('Accueil en brouillon.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Tarifs en brouillon.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'bouton-devis', bouton('Autre bouton'));
  await semerBrouillonReglage(db, 'mention', 'Mention en brouillon.');
  await semerBrouillonFormulaire(db, 'devis-gateau', { champs: {} });
  const avant = {
    accueil: await lireLignes(db, 'select * from brouillons_emplacements where page_slug = ?1', 'accueil'),
    mention: await lireLignes(db, 'select * from brouillons_reglages'),
    gateau: await lireLignes(db, 'select * from brouillons_formulaires'),
  };

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(0);
  expect(await lireLignes(db, 'select * from brouillons_emplacements where page_slug = ?1', 'accueil')).toEqual(
    avant.accueil,
  );
  expect(await lireLignes(db, 'select * from brouillons_reglages')).toEqual(avant.mention);
  expect(await lireLignes(db, 'select * from brouillons_formulaires')).toEqual(avant.gateau);
  const liste = await lire('/admin/mes-pages', cookie);
  expect(ligne(liste, 'Accueil')).toContain(MARQUE);
  expect(ligne(liste, 'Tarifs')).not.toContain(MARQUE);
});

it("SC-01h — après le retour, aucun écran ne rend le brouillon abandonné", async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon abandonné unique.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'bouton-devis', bouton('Bouton abandonné unique'));

  // Act
  expect((await revenir('tarifs', cookie)).status).toBe(200);

  // Assert : plus aucune ligne, et aucun écran ne le présente.
  expect(await compter(db, 'brouillons_emplacements')).toBe(0);
  for (const route of ['/admin/pages/tarifs', '/admin/apercu/tarifs', '/admin/mes-pages', '/admin/publier']) {
    const corps = await lire(route, cookie);
    expect(corps, route).not.toContain('abandonné unique');
  }
});

it('SC-01i — sans session ouverte, le retour est refusé et le brouillon est intact', async () => {
  // Arrange
  const db = obtenirDB();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon protégé.'));

  // Act
  const reponse = await revenir('tarifs');

  // Assert
  expect(reponse.status).toBe(401);
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(1);
});

it("l'éditeur signale une page jamais publiée à la confirmation, et pas une page déjà publiée", async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'contact', 'presentation', texte('Brouillon de Contact.'));
  await semerPublie(db, 'tarifs', 'presentation', texte('Présentation publiée.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon de Tarifs.'));

  // Act
  const jamaisPubliee = await lire('/admin/pages/contact', cookie);
  const dejaPubliee = await lire('/admin/pages/tarifs', cookie);

  // Assert
  expect(jamaisPubliee).toContain('data-jamais-publiee');
  expect(dejaPubliee).not.toContain('data-jamais-publiee');
});

it('une page que la déclaration ne porte pas répond 404 et aucun brouillon ne bouge', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'page-inconnue', 'presentation', texte('Brouillon orphelin.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Tarifs en brouillon.'));

  // Act
  const reponse = await revenir('page-inconnue', cookie);

  // Assert
  expect(reponse.status).toBe(404);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'introuvable' });
  expect(await compter(db, 'brouillons_emplacements')).toBe(2);
});

it('le retour supprime aussi la ligne d’un emplacement que la déclaration ne porte plus', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'emplacement-retire', texte('Ligne sans déclaration.'));

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(0);
});
