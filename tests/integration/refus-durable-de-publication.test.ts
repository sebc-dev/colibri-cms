/**
 * Change 019, ticket 02 — un refus durable de la publication se dit à l'éditrice (FR-091, FR-117),
 * et tout échec de dépôt se consigne dans les journaux, sans jamais la clé d'écriture.
 *
 * Couture : vraie D1 locale dans `workerd` ; le dépôt est simulé en mémoire (ou un `fetch` de
 * substitution devant l'adaptateur GitHub) ; les routes sont jouées par `exports.default.fetch`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForgeEnMemoire, REF_PRINCIPALE } from '../unit/publication/forge-en-memoire.ts';
import type { Forge } from '../../src/core/publication/forge.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  obtenirForge,
  poursuivrePublication,
  relancerLaMiseEnLigne,
} from '../../src/platform/publication/publier.ts';
import {
  TEXTE_PUBLICATION_ECHEC,
  TEXTE_PUBLICATION_REFUS_DURABLE,
  TEXTE_PUBLICATION_RELANCE_ECHEC,
} from '../../src/admin/textes.ts';
import ilot from '../../src/admin/ilots-svelte-5/EcranPublier.svelte?raw';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  exigerPresent,
  lecteurDesOriginales,
  nettoyer,
  semerBrouillonEmplacement,
  semerImage,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

const CLE = 'ghp_cle-secrete-de-test-9876543210';
const MESSAGE_JOURNAL = '[publication] dépôt non abouti';

const DEVELOPPEUR =
  /\b(commit|branche|build|déploiement|deploiement|déployer|github|dépôt|depot|repository|endpoint|webhook|backend|framework|token|jeton|api|git|clé|cle)\b/i;

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await nettoyer();
});

function espionnerLeJournal(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

function lignesDeDepot(espion: ReturnType<typeof vi.spyOn>): unknown[][] {
  return (espion.mock.calls as unknown[][]).filter((appel) => appel[0] === MESSAGE_JOURNAL);
}

async function confirmer(db: DBLike): Promise<string> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  return exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
}

async function publierAvec(db: DBLike, forge: Forge | null): ReturnType<typeof poursuivrePublication> {
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Nouveaux tarifs.' }, 1000);
  return poursuivrePublication(db, await confirmer(db), Date.now(), forge, lecteurDesOriginales());
}

async function depotEnPanne(issue: 'acces-refuse' | 'introuvable' | 'injoignable'): Promise<ForgeEnMemoire> {
  const forge = await ForgeEnMemoire.creer({});
  forge.tomberEnPanne(issue);
  return forge;
}

async function appelerRoute(db: DBLike, chemin: string, corps: unknown): Promise<Response> {
  const session = await semerSession(db);
  return exports.default.fetch(
    new Request(`${BASE}${chemin}`, {
      method: 'POST',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify(corps),
    }),
  );
}

it("SC-02a — dépôt injoignable : la raison reste « echec » et le texte dit que rien n'a changé et invite à réessayer dans quelques minutes", async () => {
  // Arrange
  const db = await assurerSchema();
  const forge = await depotEnPanne('injoignable');

  // Act
  const issue = await publierAvec(db, forge);

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'echec' });
  expect(TEXTE_PUBLICATION_ECHEC).toContain("n'a pas pu se faire");
  expect(TEXTE_PUBLICATION_ECHEC).toContain("Rien n'a changé");
  expect(TEXTE_PUBLICATION_ECHEC).toContain('Réessayez dans quelques minutes');
});

it("SC-02b — accès refusé au dépôt : refus durable ; le texte dit que rien n'a changé et invite à prévenir, sans réessayer", async () => {
  // Arrange
  const db = await assurerSchema();
  const forge = await depotEnPanne('acces-refuse');

  // Act
  const issue = await publierAvec(db, forge);

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'refus-durable' });
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).toContain("Rien n'a changé");
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).toContain('Prévenez la personne qui s\'occupe de votre site');
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).not.toMatch(/réessayez dans quelques minutes/i);
  expect(ilot).toContain('refus-durable');
  expect(ilot).toContain('TEXTE_PUBLICATION_REFUS_DURABLE');
});

it('SC-02c — dépôt introuvable : même issue et même message que le refus d\'accès', async () => {
  // Arrange
  const db = await assurerSchema();
  const forge = await depotEnPanne('introuvable');

  // Act
  const issue = await publierAvec(db, forge);

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'refus-durable' });
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).toContain('Prévenez la personne qui s\'occupe de votre site');
});

it("SC-02d — instance sans dépôt ou sans clé : /suite répond 502 « refus-durable » et le texte n'invite pas à réessayer", async () => {
  // Arrange : l'instance de test n'a ni dépôt ni clé
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Pas de dépôt.' }, 1000);
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await appelerRoute(db, '/admin/publication', { empreinte: etat.empreinte });
  const { jeton } = (await confirmation.json()) as { jeton: string };

  // Act
  const reponse = await appelerRoute(db, '/admin/publication/suite', { jeton });

  // Assert
  expect(reponse.status).toBe(502);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('refus-durable');
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).not.toMatch(/réessayez/i);
  // sans dépôt (obtenirForge nul), l'issue de la fonction est la même
  expect(obtenirForge(null, CLE)).toBeNull();
  expect(obtenirForge('cliente/son-site', undefined)).toBeNull();
});

it("SC-02e — relance d'une mise en ligne non aboutie, accès refusé : refus durable, texte qui invite à prévenir sans réessayer", async () => {
  // Arrange
  const db = await assurerSchema();
  const forge = await depotEnPanne('acces-refuse');

  // Act
  const issue = await relancerLaMiseEnLigne(db, forge, Date.now());

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'refus-durable' });
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).toContain('Prévenez la personne');
  expect(TEXTE_PUBLICATION_RELANCE_ECHEC).toContain('Réessayez');
  const reponse = await appelerRoute(db, '/admin/publication/relancer', {});
  expect(reponse.status).toBe(502);
  expect(((await reponse.json()) as { raison: string }).raison).toBe('refus-durable');
});

it("SC-02f — après un refus durable, une nouvelle publication n'est pas refusée au motif qu'une autre est en cours", async () => {
  // Arrange
  const db = await assurerSchema();
  const refus = await publierAvec(db, await depotEnPanne('acces-refuse'));
  expect(refus).toEqual({ ok: false, raison: 'refus-durable' });
  expect(await compter(db, 'publication', 'jeton is not null')).toBe(0);

  // Act
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const reprise = await poursuivrePublication(
    db,
    exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation ne doit pas être refusée'),
    Date.now(),
    await ForgeEnMemoire.creer({}),
    lecteurDesOriginales(),
  );

  // Assert
  expect(confirmation.ok).toBe(true);
  expect(reprise.ok).toBe(true);
});

it("SC-02g — le message d'un refus durable ne contient aucun terme de développeur", () => {
  expect(TEXTE_PUBLICATION_REFUS_DURABLE).not.toMatch(DEVELOPPEUR);
});

it("SC-02h — accès refusé au dépôt du contenu : le journal dit l'étape contenu et accès refusé", async () => {
  // Arrange : la branche des images passe, le déplacement de la branche principale est refusé
  const journal = espionnerLeJournal();
  const db = await assurerSchema();
  const forge = await ForgeEnMemoire.creer({});
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
  const issue = await publierAvec(db, principaleRefusee);

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'refus-durable' });
  expect(lignesDeDepot(journal)).toEqual([[MESSAGE_JOURNAL, { etape: 'contenu', nature: 'acces-refuse' }]]);
});

it("SC-02i — accès refusé dès le dépôt des images : refus durable, et le journal dit l'étape images et accès refusé", async () => {
  // Arrange : tout le dépôt refuse l'accès ; la branche des images échoue avant le contenu
  const journal = espionnerLeJournal();
  const db = await assurerSchema();

  // Act
  const issue = await publierAvec(db, await depotEnPanne('acces-refuse'));

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'refus-durable' });
  expect(lignesDeDepot(journal)).toEqual([[MESSAGE_JOURNAL, { etape: 'images', nature: 'acces-refuse' }]]);
});

it("SC-02i — échec pendant le dépôt des images : le journal dit l'étape images et la nature de l'échec", async () => {
  // Arrange : une image à déposer ; le dépôt des blobs échoue
  const journal = espionnerLeJournal();
  const db = await assurerSchema();
  await semerImage(db, 'image-neuve', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await semerBrouillonEmplacement(db, 'tarifs', 'bandeau-tarifs', { nature: 'image', mediaId: 'image-neuve' });
  const jeton = await confirmer(db);
  const forge = await ForgeEnMemoire.creer({});
  const blobsRefuses = new Proxy(forge, {
    get(cible, propriete, recepteur) {
      const valeur = Reflect.get(cible, propriete, recepteur) as unknown;
      if (propriete !== 'creerBlob') return valeur;
      return () => Promise.resolve({ ok: false, issue: 'injoignable' });
    },
  }) as Forge;

  // Act
  const issue = await poursuivrePublication(db, jeton, Date.now(), blobsRefuses, lecteurDesOriginales());

  // Assert
  expect(issue.ok).toBe(false);
  expect(lignesDeDepot(journal)).toContainEqual([MESSAGE_JOURNAL, { etape: 'images', nature: 'injoignable' }]);
});

it("SC-02j — dépôt non configuré ou clé absente : le journal dit que le dépôt n'est pas configuré", async () => {
  // Arrange
  const journal = espionnerLeJournal();
  const db = await assurerSchema();

  // Act
  const issue = await publierAvec(db, null);

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'refus-durable' });
  const lignes = lignesDeDepot(journal);
  expect(lignes).toHaveLength(1);
  expect(lignes[0]?.[1]).toMatchObject({ nature: 'depot-non-configure' });
});

it("SC-02k — échec de relance : le journal dit l'étape relance et la nature de l'échec", async () => {
  // Arrange
  const journal = espionnerLeJournal();
  const db = await assurerSchema();

  // Act
  const issue = await relancerLaMiseEnLigne(db, await depotEnPanne('injoignable'), Date.now());

  // Assert
  expect(issue).toEqual({ ok: false, raison: 'echec' });
  expect(lignesDeDepot(journal)).toContainEqual([MESSAGE_JOURNAL, { etape: 'relance', nature: 'injoignable' }]);
});

it("SC-02l — la clé d'écriture n'apparaît dans aucune trace d'échec, ni en entier ni en partie", async () => {
  // Arrange
  const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => undefined),
  );
  const db = await assurerSchema();
  const refus = (requete: Request): Promise<Response> => {
    expect(requete.headers.get('Authorization')).toBe(`Bearer ${CLE}`);
    return Promise.resolve(Response.json({ message: 'Bad credentials' }, { status: 401 }));
  };
  const forge = exigerPresent(obtenirForge('cliente/son-site', CLE, refus), 'adaptateur attendu');

  // Act
  await publierAvec(db, forge);
  await relancerLaMiseEnLigne(db, forge, Date.now());

  // Assert
  const journal = espions.flatMap((e) => e.mock.calls).map((appel) => JSON.stringify(appel)).join('\n');
  expect(journal).toContain(MESSAGE_JOURNAL);
  expect(journal).not.toContain(CLE);
  expect(journal).not.toContain(CLE.slice(0, 12));
  expect(journal).not.toContain(CLE.slice(-12));
});

it("SC-02m — une publication qui aboutit n'écrit aucune trace d'échec de dépôt", async () => {
  // Arrange
  const journal = espionnerLeJournal();
  const db = await assurerSchema();

  // Act
  const issue = await publierAvec(db, await ForgeEnMemoire.creer({}));

  // Assert
  expect(issue.ok).toBe(true);
  expect(lignesDeDepot(journal)).toEqual([]);
});
