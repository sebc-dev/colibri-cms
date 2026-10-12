/**
 * Change 011, ticket 15 — ce que la finalisation laisse après le dépôt : une correction
 * postérieure à la confirmation reste en brouillon, les écrans montrent aussitôt le publié,
 * une image effacée quitte la bibliothèque puis la branche des images.
 *
 * Couture : vraie D1 locale dans `workerd`, dépôt simulé en mémoire, écran par `exports.default.fetch`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire, REF_MEDIA, REF_PRINCIPALE } from '../unit/publication/forge-en-memoire.ts';
import type { Forge } from '../../src/core/publication/forge.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivrePublication,
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
  semerBrouillonEmplacement,
  semerImage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

async function confirmer(db: DBLike): Promise<string> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  return exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
}

async function publier(db: DBLike, forge: Forge): Promise<void> {
  const issue = await poursuivrePublication(db, await confirmer(db), Date.now(), forge, lecteurDesOriginales());
  expect(issue.ok).toBe(true);
}

async function contenuDuBrouillon(db: DBLike, slug: string, emplacement: string): Promise<unknown> {
  const lignes = (await lireLignes(
    db,
    'select contenu from brouillons_emplacements where page_slug = ?1 and id_emplacement = ?2',
    slug,
    emplacement,
  )) as { contenu: string }[];
  const ligne = lignes.at(0);
  return ligne === undefined ? undefined : JSON.parse(ligne.contenu);
}

it('SC-15c — Contact corrigée pendant le dépôt : après le dépôt, Contact garde un brouillon portant cette correction', async () => {
  // Arrange : Contact porte un brouillon, confirmé
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Avant.' }, 1000);
  const jeton = await confirmer(db);
  const forge = await ForgeEnMemoire.creer({});
  // La correction arrive pendant que la publication dépose (au premier appel au dépôt)
  const corrigeePendantLeDepot = new Proxy(forge, {
    get(cible, propriete, recepteur) {
      const valeur = Reflect.get(cible, propriete, recepteur) as unknown;
      if (propriete !== 'creerArbre' || typeof valeur !== 'function') return valeur;
      return async (...args: unknown[]) => {
        await semerBrouillonEmplacement(
          db,
          'contact',
          'presentation',
          { nature: 'texte-riche', markdown: 'Correction pendant le dépôt.' },
          2000,
        );
        return (valeur as (...a: unknown[]) => Promise<unknown>).apply(cible, args);
      };
    },
  }) as Forge;

  // Act
  const issue = await poursuivrePublication(db, jeton, Date.now(), corrigeePendantLeDepot, lecteurDesOriginales());

  // Assert
  expect(issue.ok).toBe(true);
  expect(await contenuDuBrouillon(db, 'contact', 'presentation')).toEqual({
    nature: 'texte-riche',
    markdown: 'Correction pendant le dépôt.',
  });
  const publie = (await lireLignes(
    db,
    "select contenu from publies_emplacements where page_slug = 'contact' and id_emplacement = 'presentation'",
  )) as { contenu: string }[];
  expect(JSON.parse(publie[0]?.contenu ?? 'null')).toEqual({ nature: 'texte-riche', markdown: 'Avant.' });
});

it("SC-15d — Tarifs venant d'être publiée, site pas reconstruit : l'éditeur présente le publié, sans marque de brouillon, non le départ", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', {
    nature: 'texte-riche',
    markdown: 'Tarifs publiés ce matin.',
  });
  await publier(db, await ForgeEnMemoire.creer({}));
  const session = await semerSession(db);

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/pages/tarifs`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` } }),
  );

  // Assert
  expect(reponse.status).toBe(200);
  const corps = /<main[^>]*>([\s\S]*?)<\/main>/.exec(await reponse.text())?.[1] ?? '';
  expect(corps, 'le contenu (<main>) devrait être présent').not.toBe('');
  expect(corps).toContain('Tarifs publiés ce matin.');
  expect(corps).not.toContain('Chaque création est réalisée sur mesure');
  expect(corps).not.toContain('data-pastille-brouillon');
});

it("SC-15e — une publication qui efface une image : elle quitte la bibliothèque et sa fiche le contenu déposé, ses octets quittent la branche des images à la publication suivante", async () => {
  // Arrange : l'image est posée sur Tarifs puis publiée (octets déposés sur la branche des images)
  const db = await assurerSchema();
  await semerImage(db, 'image-a-effacer', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-a-effacer' });
  const forge = await ForgeEnMemoire.creer({});
  await publier(db, forge);
  expect(forge.chemins(REF_MEDIA)).toContain('medias/image-a-effacer.png');
  expect(forge.chemins()).toContain('content/medias/image-a-effacer.json');

  // Act 1 : le bandeau change d'image, l'ancienne n'est plus posée nulle part
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'media-fixture-hero' });
  const etat = await calculerEtatPublication(db, Date.now());
  expect(etat.recapitulatif.imagesEffacees.map((i) => i.id)).toEqual(['image-a-effacer']);
  await publier(db, forge);

  // Assert 1 : hors bibliothèque, fiche retirée du contenu déposé
  expect(forge.chemins(REF_MEDIA), 'encore sur la branche des images à la publication qui l’efface').toContain('medias/image-a-effacer.png');
  expect(await compter(db, 'medias', 'id = ?1', 'image-a-effacer')).toBe(0);
  expect(forge.chemins()).not.toContain('content/medias/image-a-effacer.json');

  // Act 2 : la publication suivante
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Suite.' });
  await publier(db, forge);

  // Assert 2 : les octets ne sont plus sur la branche des images
  expect(forge.chemins(REF_MEDIA)).not.toContain('medias/image-a-effacer.png');
});

it("ticket 15 — une image effacée qu'une correction pose de nouveau pendant le dépôt reste dans la bibliothèque et repart à la publication suivante (FR-037)", async () => {
  // Arrange : l'image est publiée sur Tarifs, puis remplacée ; la publication qui l'efface est confirmée,
  // et une correction la pose de nouveau après la confirmation
  const db = await assurerSchema();
  await semerImage(db, 'image-reposee', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-reposee' }, 1000);
  const forge = await ForgeEnMemoire.creer({});
  await publier(db, forge);
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'media-fixture-hero' }, 2000);
  expect((await calculerEtatPublication(db, Date.now())).recapitulatif.imagesEffacees.map((i) => i.id)).toEqual([
    'image-reposee',
  ]);
  const jeton = await confirmer(db);
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-reposee' }, 3000);

  // Act
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());

  // Assert : gardée, redevenue non publiée, toujours posée par la correction
  expect(issue.ok).toBe(true);
  expect(await compter(db, 'medias', 'id = ?1', 'image-reposee')).toBe(1);
  expect(await lireLignes(db, "select publiee_le, empreinte_depot from medias where id = 'image-reposee'")).toEqual([
    { publiee_le: null, empreinte_depot: null },
  ]);
  expect(await contenuDuBrouillon(db, 'tarifs', 'bandeau-tarifs')).toEqual({ nature: 'image', mediaId: 'image-reposee' });
  // la publication suivante redépose sa fiche et ses octets
  await publier(db, forge);
  expect(forge.chemins()).toContain('content/medias/image-reposee.json');
  expect(forge.chemins(REF_MEDIA)).toContain('medias/image-reposee.png');
});

it("ticket 15 — au début d'une publication, seules les images publiées que le site empaquette perdent leurs octets (ADR-0020)", async () => {
  // Arrange : une image empaquetée, non publiée, avec octets ; une image hors paquet posée sur Tarifs
  const db = await assurerSchema();
  await semerImage(db, 'media-fixture-equipe', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerImage(db, 'image-hors-paquet', new Uint8Array([137, 80, 78, 71, 4, 5, 6]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-hors-paquet' });
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Première.' });
  const forge = await ForgeEnMemoire.creer({});
  const longueur = async (id: string): Promise<unknown> =>
    ((await lireLignes(db, 'select length(octets) as n from medias where id = ?1', id)) as { n: number }[])[0]?.n;

  // Act 1
  await publier(db, forge);

  // Assert 1 : aucune des deux n'était publiée au début de cette publication
  expect(await longueur('media-fixture-equipe'), 'empaquetée, pas encore publiée').toBe(7);
  expect(await longueur('image-hors-paquet'), 'hors paquet, pas encore publiée').toBe(7);

  // Act 2
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Seconde.' });
  await publier(db, forge);

  // Assert 2 : seule l'image publiée ET empaquetée a perdu ses octets
  expect(await longueur('media-fixture-equipe'), 'publiée et empaquetée').toBe(0);
  expect(await longueur('image-hors-paquet'), 'publiée, hors paquet').toBe(7);
});

it('ticket 15 — une image posée au départ reste sur la branche des images après une publication', async () => {
  // Arrange : une correction de texte sur Contact, sans toucher aux images posées au départ
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Première.' });
  const forge = await ForgeEnMemoire.creer({});
  const imagesDeDepart = ['medias/media-fixture-hero.png', 'medias/media-fixture-equipe.png'];

  // Act 1
  await publier(db, forge);

  // Assert 1 : les originales de départ sont déposées et leur empreinte est inscrite
  expect(forge.chemins(REF_MEDIA)).toEqual(expect.arrayContaining(imagesDeDepart));
  const empreinte = (await lireLignes(db, "select empreinte_depot from medias where id = 'media-fixture-hero'")) as {
    empreinte_depot: string | null;
  }[];
  expect(empreinte[0]?.empreinte_depot ?? null).not.toBeNull();

  // Act 2 : une seconde correction de Contact, publiée
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Seconde.' });
  await publier(db, forge);

  // Assert 2 : elles sont toujours sur la branche des images
  expect(forge.chemins(REF_MEDIA)).toEqual(expect.arrayContaining(imagesDeDepart));
});

it("ticket 15 — dépôt en panne : verrou libéré, rien d'autre ne change", async () => {
  // Arrange : Contact porte un brouillon, confirmé ; le dépôt ne répond plus
  const db = await assurerSchema();
  const brouillon = { nature: 'texte-riche', markdown: 'En attente.' };
  await semerBrouillonEmplacement(db, 'contact', 'presentation', brouillon);
  const jeton = await confirmer(db);
  const forge = await ForgeEnMemoire.creer({});
  const principaleAvant = forge.chemins();
  const imagesAvant = forge.chemins(REF_MEDIA);
  forge.tomberEnPanne('injoignable');

  // Act
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'echec' });
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
  expect(await compter(db, 'brouillons_emplacements')).toBe(1);
  expect(await contenuDuBrouillon(db, 'contact', 'presentation')).toEqual(brouillon);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
  expect(await compter(db, 'publication', 'derniere_marque is not null')).toBe(0);
  expect(forge.chemins()).toEqual(principaleAvant);
  expect(forge.chemins(REF_MEDIA)).toEqual(imagesAvant);
});

it("ticket 15 — échec après la branche des images, avant la branche principale : verrou libéré, rien d'autre ne change", async () => {
  // Arrange : une image téléversée, posée sur Tarifs et confirmée ; la branche principale refuse le dépôt
  const db = await assurerSchema();
  await semerImage(db, 'image-neuve', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-neuve' });
  const jeton = await confirmer(db);
  const forge = await ForgeEnMemoire.creer({});
  const principaleAvant = forge.chemins();
  const principaleRefusee = new Proxy(forge, {
    get(cible, propriete, recepteur) {
      const valeur = Reflect.get(cible, propriete, recepteur) as unknown;
      if (propriete !== 'deplacerRef' || typeof valeur !== 'function') return valeur;
      return (ref: string, ...reste: unknown[]) =>
        ref === REF_PRINCIPALE
          ? Promise.resolve({ ok: false, issue: 'acces-refuse' })
          : (valeur as (...a: unknown[]) => Promise<unknown>).apply(cible, [ref, ...reste]);
    },
  }) as Forge;

  // Act
  const issue = await poursuivrePublication(db, jeton, Date.now(), principaleRefusee, lecteurDesOriginales());

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'echec' });
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);
  expect(await lireLignes(db, "select publiee_le, empreinte_depot from medias where id = 'image-neuve'")).toEqual([
    { publiee_le: null, empreinte_depot: null },
  ]);
  expect(await contenuDuBrouillon(db, 'tarifs', 'bandeau-tarifs')).toEqual({ nature: 'image', mediaId: 'image-neuve' });
  expect(await compter(db, 'publies_emplacements')).toBe(0);
  expect(forge.chemins()).toEqual(principaleAvant);
  // le verrou est libre : confirmée à nouveau, la publication aboutit avec un dépôt sain
  const reprise = await poursuivrePublication(
    db,
    await confirmer(db),
    Date.now(),
    await ForgeEnMemoire.creer({}),
    lecteurDesOriginales(),
  );
  expect(reprise.ok).toBe(true);
});

it('ticket 15 — la finalisation échoue après le dépôt : verrou et instantané gardés, la même publication rejouée aboutit', async () => {
  // Arrange : Contact porte un brouillon, confirmé ; le premier lot D1 (la finalisation) est refusé
  const db = await assurerSchema();
  const brouillon = { nature: 'texte-riche', markdown: 'À finaliser.' };
  await semerBrouillonEmplacement(db, 'contact', 'presentation', brouillon);
  const jeton = await confirmer(db);
  const forge = await ForgeEnMemoire.creer({});
  let premierLot = true;
  const lotRefuseUneFois: DBLike = {
    prepare: (requete) => db.prepare(requete),
    batch: (instructions) => {
      if (premierLot) {
        premierLot = false;
        return Promise.reject(new Error('lot refusé'));
      }
      return db.batch(instructions);
    },
  };

  // Act 1
  const issue = await poursuivrePublication(lotRefuseUneFois, jeton, Date.now(), forge, lecteurDesOriginales());

  // Assert 1
  expect(issue).toEqual({ ok: false, raison: 'a-finaliser' });
  expect(
    await compter(db, 'publication', 'jeton is not null and instantane is not null and marque_en_cours is not null'),
  ).toBe(1);
  expect(await contenuDuBrouillon(db, 'contact', 'presentation')).toEqual(brouillon);
  expect(await compter(db, 'publies_emplacements')).toBe(0);
  const commitsApresLePremierPassage = forge.historique().length;

  // Act 2 : la même publication, rejouée avec le même jeton
  const rejouee = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());

  // Assert 2 : elle aboutit, et le dépôt déjà fait est reconnu
  expect(rejouee.ok).toBe(true);
  expect(await compter(db, 'brouillons_emplacements')).toBe(0);
  expect(await compter(db, 'publies_emplacements')).toBe(1);
  expect(await compter(db, 'publication', 'derniere_marque is not null')).toBe(1);
  expect(forge.historique()).toHaveLength(commitsApresLePremierPassage);
});
