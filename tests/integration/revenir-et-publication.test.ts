/**
 * Change 015, ticket 02 — Revenir à la version publiée respecte la publication.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` dans `workerd`, contre la vraie D1
 * locale ; la publication est jouée au niveau `platform/` contre le dépôt simulé en mémoire (le
 * seul double). Le verrou de la publication est celui que la confirmation prend réellement. Ce que
 * seul un navigateur montre (la confirmation qui reste ouverte sans bouton) vit dans les parcours.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach, vi } from 'vitest';
import textes from '../../src/admin/textes.ts?raw';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import { IMAGES_PAR_PASSE } from '../../src/core/publication/passes.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivrePublication,
  poursuivreUnePasse,
} from '../../src/platform/publication/publier.ts';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  exigerPresent,
  lecteurDesOriginales,
  lireLignes,
  nettoyer,
  obtenirDB,
  semerBrouillonEmplacement,
  semerImage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

const ORIGINE = 'https://example.com';
const PHRASE_REFUS =
  'Une publication est en cours. Vous pourrez revenir à la version publiée quand elle sera terminée.';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

function texte(markdown: string): Record<string, unknown> {
  return { nature: 'texte-riche', markdown };
}

function image(mediaId: string): Record<string, unknown> {
  return { nature: 'image', mediaId };
}

async function semerPublieEmplacement(
  db: DBLike,
  page: string,
  idEmplacement: string,
  contenu: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      'insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(page, idEmplacement, String(contenu.nature), JSON.stringify(contenu), Date.now())
    .run();
}

function post(chemin: string, cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}${chemin}`, {
      method: 'POST',
      headers: { origin: ORIGINE, 'content-type': 'application/json', cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

const revenir = (slug: string, cookie: string): Promise<Response> => post(`/admin/pages/${slug}/revenir`, cookie);

async function lire(route: string, cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}${route}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status, route).toBe(200);
  return reponse.text();
}

/** Les trois temps d'une publication : l'état affiché, la confirmation, le dépôt jusqu'au bout. */
async function publier(db: DBLike, forge: ForgeEnMemoire): Promise<void> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());
  expect(issue.ok).toBe(true);
}

async function confirmer(db: DBLike): Promise<string> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  return exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
}

/** Note les chemins que chaque écriture d'arbre du dépôt demande (le double reste le même objet). */
function espionnerLesEcritures(forge: ForgeEnMemoire): string[] {
  const chemins: string[] = [];
  const creerArbre = forge.creerArbre.bind(forge);
  forge.creerArbre = (demande) => {
    chemins.push(...demande.entrees.map((entree) => entree.chemin));
    return creerArbre(demande);
  };
  return chemins;
}

function fichiersDeLaPage(forge: ForgeEnMemoire, slug: string): [string, string][] {
  return [...forge.fichiers().entries()].filter(([chemin]) => chemin.startsWith(`content/pages/${slug}`));
}

function sansBalises(fragment: string): string {
  let sortie = '';
  let dansBalise = false;
  for (const caractere of fragment) {
    if (caractere === '<') dansBalise = true;
    else if (caractere === '>') dansBalise = false;
    else if (!dansBalise) sortie += caractere;
  }
  return sortie.trim();
}

function section(main: string, marque: string): string | null {
  const debut = main.indexOf(marque);
  if (debut === -1) return null;
  const fin = main.indexOf('</section>', debut);
  return fin === -1 ? main.slice(debut) : main.slice(debut, fin);
}

function elements(contenu: string | null): string[] {
  return (contenu ?? '')
    .split('<li')
    .slice(1)
    .map((li) => li.slice(li.indexOf('>') + 1, li.indexOf('</li>')))
    .map((interieur) => sansBalises(interieur.split('<a ')[0] ?? ''));
}

async function ouvrirPublier(cookie: string): Promise<string> {
  const corps = await lire('/admin/publier', cookie);
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, 'le contenu (<main>) devrait être présent').toBeDefined();
  return main ?? '';
}

it('SC-02a — pendant qu’une publication confirmée dépose ses images, le retour est refusé (publication en cours) et le brouillon est intact', async () => {
  // Arrange : une galerie plus longue qu'une passe, une seule passe jouée, puis plus rien
  const db = obtenirDB();
  const cookie = await semerSession(db);
  const ids = Array.from({ length: IMAGES_PAR_PASSE + 5 }, (_v, i) => `image-galerie-${String(i).padStart(2, '0')}`);
  for (const [i, id] of ids.entries()) await semerImage(db, id, new Uint8Array([137, 80, 78, 71, i, i + 1, 200 - i]));
  await semerBrouillonEmplacement(db, 'accueil', 'galerie-realisations', { nature: 'galerie', mediaIds: ids });
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon à ne pas perdre.'));
  const forge = await ForgeEnMemoire.creer({});
  const jeton = await confirmer(db);
  const passe = await poursuivreUnePasse(db, jeton, Date.now(), forge, lecteurDesOriginales());
  expect(passe.ok && !passe.fini).toBe(true);
  const avant = await lireLignes(db, 'select * from brouillons_emplacements where page_slug = ?1', 'tarifs');

  // Act : depuis un autre onglet, le retour est confirmé
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(409);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'publication-en-cours' });
  expect(await lireLignes(db, 'select * from brouillons_emplacements where page_slug = ?1', 'tarifs')).toEqual(avant);
  expect(avant).toHaveLength(1);
  expect(textes).toContain(PHRASE_REFUS);
});

it('SC-02a — une publication interrompue, en attente de reprise, refuse aussi le retour', async () => {
  // Arrange : confirmée, jamais poursuivie (le verrou garde l'instantané)
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Brouillon gardé pendant la reprise.'));
  await confirmer(db);

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(409);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('publication-en-cours');
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(1);
});

it('SC-02b — après la fin du dépôt, corriger puis revenir aboutit, et la page présente la version qui vient d’être publiée', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Version tout juste publiée.'));
  await publier(db, await ForgeEnMemoire.creer({}));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Correction à abandonner.'));

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const editeur = await lire('/admin/pages/tarifs', cookie);
  expect(editeur).toContain('Version tout juste publiée.');
  expect(editeur).not.toContain('Correction à abandonner.');
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(0);
});

it('SC-02c — Accueil et Tarifs en brouillon : après le retour de Tarifs, Publier présente Accueil et pas Tarifs', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'accueil', 'presentation', texte('Accueil en brouillon.'));
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Tarifs en brouillon.'));
  expect(elements(section(await ouvrirPublier(cookie), 'data-recap-pages')).sort((a, b) => a.localeCompare(b))).toEqual(['Accueil', 'Tarifs']);

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(elements(section(await ouvrirPublier(cookie), 'data-recap-pages'))).toEqual(['Accueil']);
});

it('SC-02d — texte de Tarifs écrasé puis revenu, Accueil corrigée et publiée : aucun fichier de Tarifs réécrit, page identique', async () => {
  // Arrange : Tarifs et Accueil publiées une première fois
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Tarifs de référence.'));
  await semerBrouillonEmplacement(db, 'accueil', 'presentation', texte('Accueil de départ.'));
  const forge = await ForgeEnMemoire.creer({});
  await publier(db, forge);
  const tarifsAvantErreur = fichiersDeLaPage(forge, 'tarifs');
  expect(tarifsAvantErreur.length).toBeGreaterThan(0);
  const ecritures = espionnerLesEcritures(forge);

  // Act : l'erreur, le retour, la correction d'Accueil, la publication
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Texte écrasé par erreur.'));
  expect((await revenir('tarifs', cookie)).status).toBe(200);
  await semerBrouillonEmplacement(db, 'accueil', 'presentation', texte('Accueil corrigée.'));
  await publier(db, forge);

  // Assert
  expect(ecritures.filter((chemin) => chemin.startsWith('content/pages/accueil')).length).toBeGreaterThan(0);
  expect(ecritures.filter((chemin) => chemin.startsWith('content/pages/tarifs'))).toEqual([]);
  expect(fichiersDeLaPage(forge, 'tarifs')).toEqual(tarifsAvantErreur);
  expect(forge.fichiers().get('content/pages/accueil/presentation.md')).toContain('Accueil corrigée.');
});

it('SC-02e — le retour d’une page ne dépose rien et laisse son contenu publié inchangé', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Publiée, inchangée.'));
  const forge = await ForgeEnMemoire.creer({});
  await publier(db, forge);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Correction abandonnée.'));
  const publieAvant = await lireLignes(db, 'select * from publies_emplacements order by page_slug, id_emplacement');
  const publicationAvant = await lireLignes(db, 'select * from publication');
  expect(publieAvant.length).toBeGreaterThan(0);
  // Le dépôt simulé n'est pas atteignable par la route : le témoin est le `fetch` global,
  // par lequel passerait tout dépôt vers la forge (le worker de test et la route partagent l'isolat).
  const appelsSortants: string[] = [];
  const vrai = globalThis.fetch;
  const espion = vi.spyOn(globalThis, 'fetch').mockImplementation((entree, init) => {
    appelsSortants.push(entree instanceof Request ? entree.url : String(entree));
    return vrai(entree, init);
  });

  // Act
  let reponse: Response;
  try {
    reponse = await revenir('tarifs', cookie);
  } finally {
    espion.mockRestore();
  }

  // Assert
  expect(reponse.status).toBe(200);
  expect(await lireLignes(db, 'select * from publies_emplacements order by page_slug, id_emplacement')).toEqual(
    publieAvant,
  );
  expect(await lireLignes(db, 'select * from publication')).toEqual(publicationAvant);
  expect(appelsSortants.filter((url) => url.includes('github'))).toEqual([]);
  expect(await compter(db, 'brouillons_emplacements', 'page_slug = ?1', 'tarifs')).toBe(0);
});

it('SC-02f — publiée deux fois puis corrigée et revenue : l’éditeur présente la seconde, aucun écran n’offre la première', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  const forge = await ForgeEnMemoire.creer({});
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Premier texte publié.'));
  await publier(db, forge);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Second texte publié.'));
  await publier(db, forge);
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', texte('Correction abandonnée.'));

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  const editeur = await lire('/admin/pages/tarifs', cookie);
  expect(editeur).toContain('Second texte publié.');
  for (const route of ['/admin/pages/tarifs', '/admin/apercu/tarifs', '/admin/mes-pages', '/admin/publier']) {
    const corps = await lire(route, cookie);
    expect(corps, route).not.toContain('Premier texte publié.');
    expect(corps, route).not.toContain('Correction abandonnée.');
  }
  expect(await compter(db, 'publies_emplacements', 'page_slug = ?1 and id_emplacement = ?2', 'tarifs', 'presentation')).toBe(1);
});

it('SC-02g — une image posée par le brouillon abandonné reste en bibliothèque et paraît parmi les images à effacer', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerImage(db, 'image-abandonnee', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', image('image-abandonnee'));
  expect(elements(section(await ouvrirPublier(cookie), 'data-recap-images-effacees'))).not.toContain('image-abandonnee');

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await compter(db, 'medias', 'id = ?1', 'image-abandonnee')).toBe(1);
  expect(await lire('/admin/medias/image-abandonnee', cookie)).toContain('image-abandonnee');
  const effacees = section(await ouvrirPublier(cookie), 'data-recap-images-effacees');
  expect(elements(effacees)).toContain('image-abandonnee');
});

it('SC-02h — une image que seule la version publiée pose, supprimée depuis Médias puis Tarifs revenue : de nouveau posée, plus à effacer', async () => {
  // Arrange : l'image n'est posée que par l'état publié ; la suppression l'inscrit au brouillon
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerImage(db, 'image-publiee-seule', new Uint8Array([137, 80, 78, 71, 9, 8, 7]));
  await semerPublieEmplacement(db, 'tarifs', 'bandeau-tarifs', image('image-publiee-seule'));
  expect((await post('/admin/medias/image-publiee-seule/supprimer', cookie)).status).toBe(200);
  expect(elements(section(await ouvrirPublier(cookie), 'data-recap-images-effacees'))).toContain(
    'image-publiee-seule',
  );

  // Act
  const reponse = await revenir('tarifs', cookie);

  // Assert
  expect(reponse.status).toBe(200);
  expect(await lire('/admin/medias/image-publiee-seule', cookie)).toContain('Bandeau des tarifs');
  const effacees = section(await ouvrirPublier(cookie), 'data-recap-images-effacees');
  expect(elements(effacees)).not.toContain('image-publiee-seule');
  expect(await compter(db, 'medias', 'id = ?1', 'image-publiee-seule')).toBe(1);
});
