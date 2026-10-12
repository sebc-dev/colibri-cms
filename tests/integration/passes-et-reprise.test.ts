/**
 * Change 011, ticket 17 — beaucoup d'images partent en plusieurs passes, et une publication
 * interrompue reprend après le bail (5 min), sans doublon ni manque.
 *
 * Couture : vraie D1 locale dans `workerd`, dépôt simulé en mémoire, horloge passée en paramètre.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire, REF_MEDIA } from '../unit/publication/forge-en-memoire.ts';
import { BAIL } from '../../src/core/publication/depot.ts';
import { IMAGES_PAR_PASSE } from '../../src/core/publication/passes.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivreUnePasse,
} from '../../src/platform/publication/publier.ts';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  exigerPresent,
  lecteurDesOriginales,
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

const TOTAL = IMAGES_PAR_PASSE + 5;

/** `TOTAL` images aux octets distincts, toutes posées dans la galerie d'Accueil. */
async function semerGalerie(db: DBLike): Promise<string[]> {
  const ids = Array.from({ length: TOTAL }, (_v, i) => `image-passe-${String(i).padStart(2, '0')}`);
  for (const [i, id] of ids.entries()) await semerImage(db, id, new Uint8Array([137, 80, 78, 71, i, i + 1, 200 - i]));
  await semerBrouillonEmplacement(db, 'accueil', 'galerie-realisations', { nature: 'galerie', mediaIds: ids });
  return ids;
}

async function confirmer(db: DBLike, maintenant: number): Promise<{ ok: true; jeton: string } | { ok: false; raison: string }> {
  const etat = await calculerEtatPublication(db, maintenant);
  const issue = await confirmerPublication(db, etat.empreinte, maintenant);
  return issue.ok ? { ok: true, jeton: issue.jeton } : { ok: false, raison: issue.raison };
}

async function jeton(db: DBLike, maintenant: number): Promise<string> {
  const c = await confirmer(db, maintenant);
  return exigerPresent(c.ok ? c.jeton : null, 'la confirmation doit aboutir');
}

function cheminsDesImages(forge: ForgeEnMemoire): string[] {
  return forge.chemins(REF_MEDIA).filter((c) => c.startsWith('medias/'));
}

it("SC-17a — plus d'images qu'une passe n'en porte : les passes s'enchaînent, l'avancement croît, toutes les images sont déposées", async () => {
  // Arrange
  const db = await assurerSchema();
  const ids = await semerGalerie(db);
  const forge = await ForgeEnMemoire.creer({});
  const t0 = Date.now();
  const total = (await calculerEtatPublication(db, t0)).instantane.totalADeposer;
  const cle = await jeton(db, t0);

  // Act
  const premiere = await poursuivreUnePasse(db, cle, t0 + 1, forge, lecteurDesOriginales());
  const seconde = await poursuivreUnePasse(db, cle, t0 + 2, forge, lecteurDesOriginales());
  const finale = await poursuivreUnePasse(db, cle, t0 + 3, forge, lecteurDesOriginales());

  // Assert
  // le site empaquette aussi des images d'exemple, déjà posées : elles partent avec les nôtres
  expect(total).toBeGreaterThan(IMAGES_PAR_PASSE);
  expect(premiere).toEqual({ ok: true, fini: false, parties: IMAGES_PAR_PASSE, total });
  expect(seconde).toEqual({ ok: true, fini: false, parties: total, total });
  expect(finale.ok && finale.fini).toBe(true);
  const deposees = cheminsDesImages(forge);
  expect(deposees).toHaveLength(total);
  expect(deposees).toEqual(expect.arrayContaining(ids.map((id) => `medias/${id}.png`)));
});

it("SC-17a — la route de la suite, sans dépôt configuré, échoue proprement au lieu d'enchaîner les passes", async () => {
  // Arrange : la route sans dépôt configuré échoue ; on vérifie la forme de l'issue d'une passe par la plateforme
  const db = await assurerSchema();
  await semerGalerie(db);
  const t0 = Date.now();
  const cle = await jeton(db, t0);
  const session = await semerSession(db);

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/publication/suite`, {
      method: 'POST',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json' },
      body: JSON.stringify({ jeton: cle }),
    }),
  );

  // Assert : sans dépôt de publication configuré, la suite échoue sans rien changer (pas de fuite)
  expect(reponse.status).toBeGreaterThanOrEqual(400);
  expect(((await reponse.json()) as { ok: boolean }).ok).toBe(false);
});

it("SC-17b — interrompue après une partie de ses images, 5 minutes sans signe de vie : une nouvelle publication est acceptée et dépose tout, sans doublon", async () => {
  // Arrange : une première passe a déposé 40 images, puis plus rien
  const db = await assurerSchema();
  const ids = await semerGalerie(db);
  const forge = await ForgeEnMemoire.creer({});
  const t0 = Date.now();
  const total = (await calculerEtatPublication(db, t0)).instantane.totalADeposer;
  const ancienne = await jeton(db, t0);
  await poursuivreUnePasse(db, ancienne, t0, forge, lecteurDesOriginales());
  expect(cheminsDesImages(forge)).toHaveLength(0); // les blobs sont déposés, pas encore la branche des images

  // Act : 5 minutes pile après le dernier signe de vie
  const reprise = await confirmer(db, t0 + BAIL);
  const nouvelle = exigerPresent(reprise.ok ? reprise.jeton : null, 'la reprise doit être acceptée');
  let issue = await poursuivreUnePasse(db, nouvelle, t0 + BAIL, forge, lecteurDesOriginales());
  while (issue.ok && !issue.fini) issue = await poursuivreUnePasse(db, nouvelle, t0 + BAIL, forge, lecteurDesOriginales());

  // Assert
  expect(issue.ok).toBe(true);
  const chemins = cheminsDesImages(forge);
  expect(chemins).toHaveLength(total);
  expect(new Set(chemins).size).toBe(total);
  expect(chemins).toEqual(expect.arrayContaining(ids.map((id) => `medias/${id}.png`)));
  expect(forge.chemins().some((c) => c.startsWith('content/pages/accueil'))).toBe(true);
  // l'ancienne publication ne tient plus le verrou
  expect(await poursuivreUnePasse(db, ancienne, t0 + BAIL, forge, lecteurDesOriginales())).toEqual({
    ok: false,
    raison: 'verrou-perdu',
  });
});

it("SC-17c — interrompue depuis moins de 5 minutes (4 min 59 s) : une nouvelle publication est refusée, une publication est déjà en cours", async () => {
  // Arrange
  const db = await assurerSchema();
  await semerGalerie(db);
  const forge = await ForgeEnMemoire.creer({});
  const t0 = Date.now();
  const ancienne = await jeton(db, t0);
  await poursuivreUnePasse(db, ancienne, t0, forge, lecteurDesOriginales());
  const session = await semerSession(db);

  // Act
  const trop_tot = await confirmer(db, t0 + BAIL - 1000);
  const etat = await calculerEtatPublication(db, Date.now());
  const route = await exports.default.fetch(
    new Request(`${BASE}/admin/publication`, {
      method: 'POST',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json' },
      body: JSON.stringify({ empreinte: etat.empreinte }),
    }),
  );

  // Assert
  expect(trop_tot).toEqual({ ok: false, raison: 'en-cours' });
  expect(route.status).toBe(409);
  expect(((await route.json()) as { raison: string }).raison).toBe('en-cours');
});
