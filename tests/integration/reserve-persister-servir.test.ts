/**
 * Ticket 04 — La réserve : téléverser une image, la persister, en resservir
 * les octets
 * (openspec/changes/004-bibliotheque-de-medias/tickets/04-reserve-persister-servir.md).
 *
 * Couture retenue, même patron que `regler-lien-video.test.ts`/
 * `code-vers-adresse-autorisee.test.ts` : requête HTTP réelle via
 * `exports.default.fetch` contre le worker compilé, dans `workerd`, contre la
 * vraie D1 locale (ADR-0014) — jamais de simulacre. Les migrations
 * `0003_sessions.sql` et `0005_medias_brouillon.sql` sont rejouées ici même,
 * une session valide est semée directement en D1 (même geste que les
 * fichiers voisins).
 *
 * Les en-têtes construits ci-dessous (JPEG `FF D8 FF` + SOF0, PNG
 * `89 50 4E 47…` + `IHDR`) sont le même patron minimal que
 * `tests/unit/medias/ingestion.test.ts` : seul l'en-tête compte pour la
 * reconnaissance de format, jamais un fichier binaire versionné.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_MEDIAS = 'medias_brouillon';
const ROUTE_TELEVERSER = 'https://example.com/admin/medias/televerser';
const ROUTE_OCTETS = (id: string) => `https://example.com/admin/medias/${id}/octets`;

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
}

interface DBLike {
  prepare(query: string): InstructionLike;
}

function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
    const medias = await import('../../migrations/0005_medias_brouillon.sql?raw');
    for (const requete of separerRequetes(medias.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_MEDIAS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-reserve-medias-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

/** Signature PNG + chunk IHDR minimal (même patron que `tests/unit/medias/ingestion.test.ts`). */
function construireEnTetePng(largeur: number, hauteur: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature PNG
    0x00, 0x00, 0x00, 0x0d, // longueur du chunk IHDR (13)
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    (largeur >>> 24) & 0xff,
    (largeur >>> 16) & 0xff,
    (largeur >>> 8) & 0xff,
    largeur & 0xff,
    (hauteur >>> 24) & 0xff,
    (hauteur >>> 16) & 0xff,
    (hauteur >>> 8) & 0xff,
    hauteur & 0xff,
    0x08, // profondeur de bits
    0x06, // type de couleur (RGBA)
    0x00, // méthode de compression
    0x00, // méthode de filtre
    0x00, // entrelacement
    0x00, 0x00, 0x00, 0x00, // CRC (non vérifié par ce module)
  ]);
}

/** SOI + segment SOF0 minimal — même patron que `tests/unit/medias/ingestion.test.ts`. */
function construireEnTeteJpeg(largeur: number, hauteur: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x11, // longueur du segment (17, elle-même incluse)
    0x08, // précision (8 bits)
    (hauteur >> 8) & 0xff,
    hauteur & 0xff,
    (largeur >> 8) & 0xff,
    largeur & 0xff,
    0x03, // 3 composantes
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x01,
    0x03, 0x11, 0x01,
  ]);
}

async function televerser(
  cookieSession: string | null,
  fichier: File | null,
): Promise<Response> {
  const donnees = new FormData();
  if (fichier) {
    donnees.set('fichier', fichier);
  }
  return exports.default.fetch(
    new Request(ROUTE_TELEVERSER, {
      method: 'POST',
      headers: {
        // Garde CSRF natif d'Astro (`origin-check`) : un corps `multipart`
        // sans `Origin` de même origine que la requête est un envoi
        // interdit (403) avant même d'atteindre la route — un vrai
        // navigateur pose cet en-tête lui-même sur un envoi de formulaire.
        origin: 'https://example.com',
        ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
      },
      body: donnees,
    }),
  );
}

function lireOctets(cookieSession: string | null, id: string): Promise<Response> {
  return exports.default.fetch(
    new Request(ROUTE_OCTETS(id), {
      headers: cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {},
    }),
  );
}

// --- SC-04a — le téléversement persiste l'identité, le nom d'origine, les
// dimensions et le type déduit, sans jamais toucher l'état publié ---

it(
  "SC-04a — une image admise téléversée est persistée au magasin brouillon avec son identité, son nom d'origine, ses dimensions et son type déduit ; l'état publié reste intact",
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    const octetsPng = construireEnTetePng(200, 80);
    const fichier = new File([octetsPng], 'photo-de-couverture.png', { type: 'image/png' });

    // Act
    const reponse = await televerser(cookieSession, fichier);

    // Assert : la réponse confirme l'admission et rend une identité opaque…
    expect(reponse.status).toBe(201);
    const corps = (await reponse.json()) as {
      ok: boolean;
      id: string;
      format: string;
      dimensions: { largeur: number; hauteur: number };
    };
    expect(corps.ok).toBe(true);
    expect(corps.id).toBeTruthy();
    expect(corps.format).toBe('png');
    expect(corps.dimensions).toEqual({ largeur: 200, hauteur: 80 });

    // …la ligne existe bien en D1, sous cette identité, avec le nom
    // d'origine, les dimensions et le type déduit tels que reçus…
    const resultat = await db
      .prepare(
        `select id, nom_origine, format, largeur, hauteur, poids_octets from ${TABLE_MEDIAS} where id = ?1`,
      )
      .bind(corps.id)
      .all();
    const lignes = resultat.results as {
      id: string;
      nom_origine: string;
      format: string;
      largeur: number;
      hauteur: number;
      poids_octets: number;
    }[];
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toEqual({
      id: corps.id,
      nom_origine: 'photo-de-couverture.png',
      format: 'png',
      largeur: 200,
      hauteur: 80,
      poids_octets: octetsPng.length,
    });

    // …et c'est la SEULE ligne de la réserve brouillon : aucune écriture
    // annexe n'a eu lieu — l'état publié, qui n'a ici aucune représentation
    // propre (aucune table dédiée), n'a donc reçu aucune conséquence de ce
    // téléversement.
    const total = await db.prepare(`select id from ${TABLE_MEDIAS}`).all();
    expect(total.results).toHaveLength(1);
  },
);

// --- SC-04b — une session ouverte obtient les octets, avec le type déduit
// et la protection anti-réinterprétation posée par le middleware ---

it(
  'SC-04b — une session ouverte obtient les octets d’un média avec le type déduit et la protection contre la réinterprétation du contenu',
  async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    const octetsWebp = (() => {
      // RIFF…WEBP + chunk VP8X — dimensions en clair (largeur/hauteur − 1, LE, 24 bits).
      const largeurMoins1 = 63;
      const hauteurMoins1 = 31;
      return new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // taille (non vérifiée)
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x58, // VP8X
        0x0a, 0x00, 0x00, 0x00, // taille du chunk VP8X
        0x00, // drapeaux
        0x00, 0x00, 0x00, // réservé
        largeurMoins1 & 0xff,
        (largeurMoins1 >> 8) & 0xff,
        (largeurMoins1 >> 16) & 0xff,
        hauteurMoins1 & 0xff,
        (hauteurMoins1 >> 8) & 0xff,
        (hauteurMoins1 >> 16) & 0xff,
      ]);
    })();
    const fichier = new File([octetsWebp], 'bandeau.webp', { type: 'image/webp' });
    const reponseTeleversement = await televerser(cookieSession, fichier);
    const { id } = (await reponseTeleversement.json()) as { id: string };

    // Act
    const reponse = await lireOctets(cookieSession, id);

    // Assert : le type déduit (l'un des trois seuls formats admis)…
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get('content-type')).toBe('image/webp');
    // …les octets rendus sont bien ceux téléversés…
    const corpsRendu = new Uint8Array(await reponse.arrayBuffer());
    expect(corpsRendu).toEqual(octetsWebp);
    // …et la protection contre la réinterprétation, posée par le middleware
    // d'en-têtes d'administration (ADR-0008/ADR-0004), est bien présente sur
    // cette réponse.
    expect(reponse.headers.get('x-content-type-options')).toBe('nosniff');
  },
);

// --- SC-04c — sans session valide, aucun octet n'est rendu ---

it("SC-04c — une demande sans session valide n'obtient aucun octet", async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  const octetsPng = construireEnTetePng(50, 50);
  const fichier = new File([octetsPng], 'secret.png', { type: 'image/png' });
  const reponseTeleversement = await televerser(cookieSession, fichier);
  const { id } = (await reponseTeleversement.json()) as { id: string };

  // Act : aucun cookie de session sur la demande.
  const reponse = await lireOctets(null, id);

  // Assert : aucun octet — ni le corps de l'image, ni un statut de succès.
  expect(reponse.status).not.toBe(200);
  const corps = await reponse.arrayBuffer();
  expect(corps.byteLength).toBe(0);
});

// --- SC-04d — le type servi est celui déduit des octets, jamais celui
// annoncé au téléversement ---

it(
  'SC-04d — le type servi est toujours celui déduit de la liste, jamais celui annoncé au téléversement',
  async () => {
    // Arrange : les octets sont ceux d'un JPEG, mais le fichier soumis
    // ANNONCE un PNG (type MIME et extension du nom, les deux mensongers).
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);
    const octetsJpeg = construireEnTeteJpeg(64, 48);
    const fichier = new File([octetsJpeg], 'menteur.png', { type: 'image/png' });

    // Act
    const reponseTeleversement = await televerser(cookieSession, fichier);
    const corpsTeleversement = (await reponseTeleversement.json()) as { id: string; format: string };
    const reponseOctets = await lireOctets(cookieSession, corpsTeleversement.id);

    // Assert : le format persisté et le `Content-Type` servi sont celui
    // déduit des octets (JPEG), jamais celui annoncé (PNG).
    expect(corpsTeleversement.format).toBe('jpeg');
    expect(reponseOctets.headers.get('content-type')).toBe('image/jpeg');
    expect(reponseOctets.headers.get('content-type')).not.toBe('image/png');
  },
);
