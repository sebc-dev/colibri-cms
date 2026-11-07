/**
 * Change 015, ticket 04 — Un formulaire revient à sa version publiée.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. Session, brouillons et état publié semés
 * directement ; la déclaration lue est celle du dépôt (`content/formulaires/`).
 * Le Dialog et l'événement `brouillon-enregistre` relèvent du navigateur.
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
  semerBrouillonFormulaire,
  semerBrouillonReglage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';
import { TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE } from '../../src/admin/textes.ts';

const MARQUE = 'data-pastille-brouillon';
const ORIGINE = 'https://example.com';

async function viderNumeros(): Promise<void> {
  try {
    await obtenirDB().prepare('delete from numeros_options').run();
  } catch {
    // table absente : rien à vider.
  }
}

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
  await viderNumeros();
});
afterEach(async () => {
  await nettoyer();
  await viderNumeros();
});

interface Option {
  id: string;
  libelle: string;
  prix?: number;
}

const DEPART: Option[] = [
  { id: 'vanille', libelle: 'Vanille', prix: 800 },
  { id: 'chocolat', libelle: 'Chocolat', prix: 900 },
  { id: 'fraise', libelle: 'Fraise', prix: 1000 },
];
const PISTACHE: Option = { id: 'o1', libelle: 'Pistache', prix: 1200 };
const NOMBRE_DE_PARTS = [
  { id: 'six-parts', libelle: '6 parts', prix: 1800 },
  { id: 'dix-parts', libelle: '10 parts', prix: 3000 },
  { id: 'vingt-parts', libelle: '20 parts', prix: 5500 },
];
const OCCASION = [
  { id: 'anniversaire', libelle: 'Anniversaire' },
  { id: 'mariage', libelle: 'Mariage' },
  { id: 'bapteme', libelle: 'Baptême & communion' },
];

function contenu(parfum: Option[], dernier: number): unknown {
  return {
    champs: { parfum, 'nombre-de-parts': NOMBRE_DE_PARTS, occasion: OCCASION },
    derniersNumeros: { parfum: dernier },
  };
}

async function semerPublie(db: DBLike, formulaire: string, valeur: unknown): Promise<void> {
  await db
    .prepare('insert into publies_formulaires (formulaire, contenu, publie_le) values (?1, ?2, ?3)')
    .bind(formulaire, JSON.stringify(valeur), Date.now())
    .run();
}

function revenir(formulaire: string, cookie?: string, origine = ORIGINE): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}/admin/formulaires/${formulaire}/revenir`, {
      method: 'POST',
      headers: { origin: origine, ...(cookie ? { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } : {}) },
    }),
  );
}

async function lireEcran(formulaire: string, cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/formulaires/${formulaire}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function zoneMarque(html: string): string {
  const zone = /<span data-zone-marque-brouillon>([\s\S]*?)<\/span>/.exec(html)?.[1];
  expect(zone, 'la zone de la marque dans le titre').toBeDefined();
  return zone ?? '';
}

async function ligneBrouillon(db: DBLike, formulaire: string): Promise<unknown[]> {
  return lireLignes(db, 'select formulaire, contenu, maj_le from brouillons_formulaires where formulaire = ?1', formulaire);
}

async function poserVerrou(db: DBLike, bailJusquA: number): Promise<void> {
  await db
    .prepare('update publication set jeton = ?1, bail_jusqu_a = ?2, instantane = ?3 where id = 1')
    .bind('jeton-de-test', bailJusquA, '{}')
    .run();
}

it('SC-04a — Devis gâteau publié puis une option retirée de Parfum, le formulaire revenu présente les options publiées, option retirée comprise, sans marque', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerPublie(db, 'devis-gateau', contenu([...DEPART, PISTACHE], 1));
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu(DEPART, 1));
  const avant = await lireEcran('devis-gateau', cookie);
  expect(avant).not.toContain('Pistache');
  expect(zoneMarque(avant)).toContain(MARQUE);

  // Act
  const reponse = await revenir('devis-gateau', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const apres = await lireEcran('devis-gateau', cookie);
  expect(apres).toContain('Pistache');
  expect(zoneMarque(apres)).not.toContain(MARQUE);
  expect(apres).not.toContain(TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE);
  expect(await compter(db, 'brouillons_formulaires', 'formulaire = ?1', 'devis-gateau')).toBe(0);
});

it('SC-04a — jamais publié, le formulaire revenu présente les options de départ, sans marque', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu([{ id: 'o1', libelle: 'Brouillon seul' }], 1));

  // Act
  const reponse = await revenir('devis-gateau', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const apres = await lireEcran('devis-gateau', cookie);
  expect(apres).toContain('Vanille');
  expect(apres).not.toContain('Brouillon seul');
  expect(zoneMarque(apres)).not.toContain(MARQUE);
});

it('SC-04a — le retour ne touche ni un autre formulaire ni un réglage', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu(DEPART, 0));
  await semerBrouillonFormulaire(db, 'devis-atelier', { champs: {}, derniersNumeros: {} });
  await semerBrouillonReglage(db, 'mention', 'Mention en brouillon.');
  const atelier = await ligneBrouillon(db, 'devis-atelier');
  const reglages = await lireLignes(db, 'select * from brouillons_reglages');

  // Act
  const reponse = await revenir('devis-gateau', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await ligneBrouillon(db, 'devis-atelier')).toEqual(atelier);
  expect(await lireLignes(db, 'select * from brouillons_reglages')).toEqual(reglages);
});

it('SC-04b — l’écran d’un formulaire n’offre le geste que s’il porte un brouillon', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu(DEPART, 0));

  // Act
  const gateau = await lireEcran('devis-gateau', cookie);
  const atelier = await lireEcran('devis-atelier', cookie);

  // Assert
  expect(gateau).toContain(TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE);
  expect(gateau).toContain('data-avec-brouillon');
  expect(atelier).not.toContain(TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE);
  expect(atelier).not.toContain('data-avec-brouillon');
});

it('SC-04a — sans brouillon, le retour réussit et ne change rien', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);

  // Act
  const reponse = await revenir('devis-gateau', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_formulaires')).toBe(0);
});

it('SC-04a — sans session ouverte, le retour est refusé (401) et le brouillon est intact', async () => {
  // Arrange
  const db = obtenirDB();
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu(DEPART, 0));
  const avant = await ligneBrouillon(db, 'devis-gateau');

  // Act
  const reponse = await revenir('devis-gateau');

  // Assert
  expect(reponse.status).toBe(401);
  expect(await ligneBrouillon(db, 'devis-gateau')).toEqual(avant);
});

it('SC-04a — depuis une autre origine, même avec cookie, le retour est refusé (403) et le brouillon est intact', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu(DEPART, 0));
  const avant = await ligneBrouillon(db, 'devis-gateau');

  // Act
  const reponse = await revenir('devis-gateau', cookie, 'https://pirate.example');

  // Assert
  expect(reponse.status).toBe(403);
  expect(await ligneBrouillon(db, 'devis-gateau')).toEqual(avant);
});

it.each([
  ['bail courant', () => Date.now() + 60_000],
  ['publication interrompue, bail dépassé de plus de 5 minutes', () => Date.now() - 6 * 60_000],
])('SC-04d — %s : le retour est refusé (409) avec le message de publication en cours, brouillon intact', async (_cas, bail) => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', contenu(DEPART, 0));
  const avant = await ligneBrouillon(db, 'devis-gateau');
  await poserVerrou(db, bail());

  // Act
  const reponse = await revenir('devis-gateau', cookie);

  // Assert
  expect(reponse.status).toBe(409);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'publication-en-cours' });
  expect(await ligneBrouillon(db, 'devis-gateau')).toEqual(avant);
});

function corpsParfums(parfums: unknown[]): string {
  return JSON.stringify({
    champs: [
      { id: 'parfum', options: parfums },
      {
        id: 'nombre-de-parts',
        options: [
          { id: 'six-parts', libelle: '6 parts', prix: '18' },
          { id: 'dix-parts', libelle: '10 parts', prix: '30' },
          { id: 'vingt-parts', libelle: '20 parts', prix: '55' },
        ],
      },
      { id: 'occasion', options: OCCASION.map((o) => ({ id: o.id, libelle: o.libelle })) },
    ],
  });
}

async function soumettre(cookie: string, parfums: unknown[]): Promise<Option[]> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/formulaires/devis-gateau/options`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
      body: corpsParfums(parfums),
    }),
  );
  expect(reponse.status).toBe(200);
  const json = (await reponse.json()) as { champs: { id: string; options: Option[] }[] };
  return json.champs.find((c) => c.id === 'parfum')?.options ?? [];
}

const DEPART_EN_EUROS = DEPART.map((o) => ({ id: o.id, libelle: o.libelle, prix: String((o.prix ?? 0) / 100) }));

it('SC-04f — deux options ajoutées à Parfum, le formulaire revenu, une option ajoutée reçoit un identifiant distinct des deux', async () => {
  // Arrange : deux options ajoutées reçoivent deux identifiants.
  const db = obtenirDB();
  const cookie = await semerSession(db);
  const apresDeuxAjouts = await soumettre(cookie, [
    ...DEPART_EN_EUROS,
    { libelle: 'Pistache', prix: '12' },
    { libelle: 'Citron', prix: '11' },
  ]);
  const ajoutees = apresDeuxAjouts.slice(3).map((o) => o.id);
  expect(new Set(ajoutees).size).toBe(2);

  // Act : le retour supprime le brouillon qui portait ces numéros.
  const reponse = await revenir('devis-gateau', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'brouillons_formulaires', 'formulaire = ?1', 'devis-gateau')).toBe(0);
  const apresRetour = await soumettre(cookie, [...DEPART_EN_EUROS, { libelle: 'Noisette', prix: '13' }]);
  const nouvelle = apresRetour.at(3)?.id;
  expect(nouvelle).toBeDefined();
  expect(ajoutees).not.toContain(nouvelle);
});

it('SC-04f — le retour retient le plus grand numéro de chaque champ dans la table des numéros', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', {
    champs: {
      parfum: [...DEPART, { id: 'o4', libelle: 'Café', prix: 1100 }],
      'nombre-de-parts': NOMBRE_DE_PARTS,
      occasion: OCCASION,
    },
    derniersNumeros: { parfum: 2 },
  });

  // Act
  const reponse = await revenir('devis-gateau', cookie);

  // Assert : 4 (suffixe de o4) l'emporte sur 2 (compteur).
  expect(reponse.status).toBe(200);
  const lignes = await lireLignes(
    db,
    "select dernier from numeros_options where formulaire = 'devis-gateau' and champ = 'parfum'",
  );
  expect(lignes).toEqual([{ dernier: 4 }]);
});
