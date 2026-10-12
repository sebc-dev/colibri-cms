/**
 * Change 011, ticket 15 — « Publier maintenant » met en ligne tous les brouillons ensemble.
 *
 * Couture : la vraie D1 locale dans `workerd` ; le dépôt distant est le dépôt simulé en mémoire
 * (le seul double du change). Les routes sont jouées par `exports.default.fetch` sur les chemins
 * qui n'atteignent pas le dépôt (409) ; l'enchaînement complet l'est au niveau `platform/`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivrePublication,
} from '../../src/platform/publication/publier.ts';
import { TEXTE_PUBLICATION_CHANGEMENT, TEXTE_PUBLICATION_DEJA_EN_COURS } from '../../src/admin/textes.ts';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  exigerPresent,
  lecteurDesOriginales,
  nettoyer,
  semerBrouillonEmplacement,
  semerBrouillonFormulaire,
  semerBrouillonReglage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

const FORMULAIRE_BROUILLON = {
  champs: { parfum: [{ id: 'pistache', libelle: 'Pistache', prix: 1200 }] },
  derniersNumeros: {},
};

async function semerTroisBrouillons(db: DBLike): Promise<void> {
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', {
    nature: 'texte-riche',
    markdown: 'Nos nouveaux tarifs.',
  });
  await semerBrouillonReglage(db, 'coordonnees', { telephone: '04 11 22 33 44' });
  await semerBrouillonFormulaire(db, 'devis-gateau', FORMULAIRE_BROUILLON);
}

async function publier(db: DBLike, forge: ForgeEnMemoire): Promise<void> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());
  expect(issue.ok).toBe(true);
}

async function post(chemin: string, session: string, corps: unknown): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}${chemin}`, {
      method: 'POST',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    }),
  );
}

it('SC-15a — Tarifs, coordonnées et Devis gâteau en brouillon : après le dépôt, plus aucun brouillon, chacun devient la dernière version publiée', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerTroisBrouillons(db);
  const forge = await ForgeEnMemoire.creer({});

  // Act
  await publier(db, forge);

  // Assert
  expect(await compter(db, 'brouillons_emplacements')).toBe(0);
  expect(await compter(db, 'brouillons_reglages')).toBe(0);
  expect(await compter(db, 'brouillons_formulaires')).toBe(0);
  const page = (await db
    .prepare("select contenu from publies_emplacements where page_slug = 'tarifs' and id_emplacement = 'presentation'")
    .bind()
    .all()) as { results: { contenu: string }[] };
  expect(JSON.parse(page.results[0]?.contenu ?? 'null')).toEqual({
    nature: 'texte-riche',
    markdown: 'Nos nouveaux tarifs.',
  });
  const reglage = (await db
    .prepare("select contenu from publies_reglages where reglage = 'coordonnees'")
    .bind()
    .all()) as { results: { contenu: string }[] };
  expect(JSON.parse(reglage.results[0]?.contenu ?? 'null')).toEqual({ telephone: '04 11 22 33 44' });
  const formulaire = (await db
    .prepare("select contenu from publies_formulaires where formulaire = 'devis-gateau'")
    .bind()
    .all()) as { results: { contenu: string }[] };
  expect(JSON.parse(formulaire.results[0]?.contenu ?? 'null')).toEqual(FORMULAIRE_BROUILLON);
  expect(forge.chemins().length).toBeGreaterThan(0);
});

it("SC-15b — une correction d'Accueil enregistrée après l'affichage : la confirmation ne dépose rien, le récapitulatif à jour compte Accueil", async () => {
  // Arrange : le récapitulatif est affiché avec Tarifs seul
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Tarifs.' });
  const affiche = await calculerEtatPublication(db, Date.now());
  expect(affiche.recapitulatif.pages.map((p) => p.slug)).toEqual(['tarifs']);
  const session = await semerSession(db);
  // Un autre onglet corrige Accueil
  await semerBrouillonEmplacement(db, 'accueil', 'presentation', { nature: 'texte-riche', markdown: 'Accueil.' });

  // Act
  const reponse = await post('/admin/publication', session, { empreinte: affiche.empreinte });

  // Assert : rien n'est pris ni déposé, et l'état à jour présente Accueil
  expect(reponse.status).toBe(409);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('changement');
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
  expect(await compter(db, 'brouillons_emplacements')).toBe(2);
  const apres = await calculerEtatPublication(db, Date.now());
  expect(apres.recapitulatif.pages.map((p) => p.slug).sort((a, b) => a.localeCompare(b))).toEqual(['accueil', 'tarifs']);
  expect(apres.empreinte).not.toBe(affiche.empreinte);
  expect(TEXTE_PUBLICATION_CHANGEMENT).toContain('Vérifiez-la à nouveau avant de publier.');
  // L'écran rechargé avec message=changement présente le récapitulatif à jour
  const recharge = await exports.default.fetch(
    new Request(`${BASE}/admin/publier?message=changement`, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` },
    }),
  );
  expect(recharge.status).toBe(200);
  const ecran = await recharge.text();
  expect(ecran).toContain('data-publication-changee');
  expect(ecran).toContain(TEXTE_PUBLICATION_CHANGEMENT.replaceAll("'", '&#39;'));
  expect(ecran).toMatch(/<li>Accueil </);
  expect(ecran).toContain(`data-empreinte="${apres.empreinte}"`);
});

it("SC-15f — pendant qu'une publication dépose, une seconde confirmée depuis un autre onglet est refusée : une publication est déjà en cours", async () => {
  // Arrange : la première a confirmé et tient le verrou, sans avoir fini
  const db = await assurerSchema();
  await semerTroisBrouillons(db);
  const session = await semerSession(db);
  const etat = await calculerEtatPublication(db, Date.now());
  const premiere = await confirmerPublication(db, etat.empreinte, Date.now());
  expect(premiere.ok).toBe(true);

  // Act
  const reponse = await post('/admin/publication', session, { empreinte: etat.empreinte });

  // Assert
  expect(reponse.status).toBe(409);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('en-cours');
  expect(TEXTE_PUBLICATION_DEJA_EN_COURS).toContain('Une publication est déjà en cours.');
  // la première garde son verrou et peut encore aboutir
  const jeton = exigerPresent(premiere.ok ? premiere.jeton : null, 'jeton de la première');
  const issue = await poursuivrePublication(db, jeton, Date.now(), await ForgeEnMemoire.creer({}), lecteurDesOriginales());
  expect(issue.ok).toBe(true);
});

async function postSansSessionValide(chemin: string, corps: unknown, cookie?: string): Promise<Response> {
  const entetes: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie !== undefined) entetes.cookie = cookie;
  return exports.default.fetch(
    new Request(`${BASE}${chemin}`, { method: 'POST', headers: entetes, body: JSON.stringify(corps) }),
  );
}

it('ticket 15 — garde : sans session, /admin/publication répond 401 sans prendre le verrou', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerTroisBrouillons(db);
  const { empreinte } = await calculerEtatPublication(db, Date.now());

  for (const cookie of [undefined, `${NOM_COOKIE_SESSION}=inconnu`]) {
    // Act
    const reponse = await postSansSessionValide('/admin/publication', { empreinte }, cookie);

    // Assert
    expect(reponse.status, cookie ?? 'sans cookie').toBe(401);
    expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
    expect(await compter(db, 'brouillons_emplacements')).toBe(1);
    expect(await compter(db, 'brouillons_reglages')).toBe(1);
    expect(await compter(db, 'brouillons_formulaires')).toBe(1);
  }
});

it('ticket 15 — garde : sans session, /admin/publication/suite répond 401 et la publication confirmée garde son verrou', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerTroisBrouillons(db);
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');

  // Act
  const reponse = await postSansSessionValide('/admin/publication/suite', { jeton });

  // Assert
  expect(reponse.status).toBe(401);
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(1);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
});

it('ticket 15 — /suite sans jeton : 400', async () => {
  // Arrange
  const db = await assurerSchema();
  const session = await semerSession(db);

  // Act
  const reponse = await post('/admin/publication/suite', session, {});

  // Assert
  expect(reponse.status).toBe(400);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('forme-invalide');
});

it('ticket 15 — /suite avec un jeton qui ne tient pas le verrou : 409 verrou-perdu', async () => {
  // Arrange
  const db = await assurerSchema();
  const session = await semerSession(db);

  // Act
  const reponse = await post('/admin/publication/suite', session, { jeton: 'inconnu' });

  // Assert
  expect(reponse.status).toBe(409);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('verrou-perdu');
});

it('ticket 15 — sans dépôt raccordé, /suite répond 502 et libère le verrou sans rien changer', async () => {
  // Arrange : Tarifs en brouillon, confirmée par la route
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Pas encore en ligne.' });
  const session = await semerSession(db);
  const { empreinte } = await calculerEtatPublication(db, Date.now());
  const confirmation = await post('/admin/publication', session, { empreinte });
  expect(confirmation.status).toBe(200);
  const { jeton } = (await confirmation.json()) as { jeton: string };

  // Act
  const reponse = await post('/admin/publication/suite', session, { jeton });

  // Assert
  expect(reponse.status).toBe(502);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('echec');
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
  expect(await compter(db, 'brouillons_emplacements')).toBe(1);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
});
