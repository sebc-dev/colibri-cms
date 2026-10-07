/**
 * Ticket 06 (008) — La carte Coordonnées s'enregistre depuis l'écran et
 * porte sa marque de brouillon
 * (openspec/changes/008-reglages-transverses/tickets/06-carte-coordonnees.md).
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` contre le
 * worker compilé, dans `workerd`, contre la vraie D1 locale. La moitié
 * navigateur (îlot, textes) est couverte par
 * `tests/static/carte-coordonnees-statique.test.ts`.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, describe } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_BROUILLONS = "brouillons_reglages";

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
}

interface DBLike {
  prepare(query: string): InstructionLike;
}

function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

function separerRequetes(sql: string): string[] {
  return sql
    .split("\n")
    .map((ligne) => ligne.replace(/--.*/, ""))
    .join("\n")
    .split(";")
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const sessions = await import("../../migrations/0003_sessions.sql?raw");
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db
        .prepare(
          `alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`,
        )
        .run();
    } catch {
      // déjà ajoutée : sans effet.
    }
    const reglages =
      await import("../../migrations/0007_brouillons_reglages.sql?raw");
    for (const requete of separerRequetes(reglages.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-carte-coordonnees-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function semerBrouillon(
  db: DBLike,
  reglage: string,
  contenu: unknown,
): Promise<void> {
  await db
    .prepare(
      `insert into ${TABLE_BROUILLONS} (reglage, contenu, maj_le) values (?1, ?2, ?3)`,
    )
    .bind(reglage, JSON.stringify(contenu), Date.now())
    .run();
}

async function ouvrirReglages(cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request("https://example.com/admin/reglages", {
      redirect: "manual",
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

async function enregistrer(
  cookie: string,
  telephone: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request("https://example.com/admin/reglages/coordonnees", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: JSON.stringify({
        coordonnees: [
          { id: "telephone", valeur: telephone },
          { id: "courriel", valeur: "atelier@exemple.fr" },
          { id: "adresse", valeur: "12 rue des Tilleuls" },
        ],
      }),
    }),
  );
}

/** Le contenu de la zone de marque de la carte dont l'identifiant de titre est donné. */
function zoneMarque(corps: string, idTitre: string): string {
  const section = new RegExp(
    `<section[^>]*aria-labelledby="${idTitre}"[^>]*>([\\s\\S]*?)</section>`,
  ).exec(corps);
  expect(section, `la carte ${idTitre} devrait être présente`).not.toBeNull();
  if (section === null) throw new Error("carte absente");
  const zone =
    /<div[^>]*data-zone-marque-brouillon[^>]*>([\s\S]*?)<\/div>/.exec(
      section[1],
    );
  expect(zone, "la zone de marque devrait être présente").not.toBeNull();
  if (zone === null) throw new Error("zone absente");
  return zone[1];
}

function carteCoordonnees(corps: string): string {
  const m =
    /<section[^>]*aria-labelledby="carte-coordonnees"[^>]*>([\s\S]*?)<\/section>/.exec(
      corps,
    );
  if (m === null) throw new Error("carte Coordonnées absente");
  return m[1];
}

const MARQUE = "data-pastille-brouillon";

describe("carte Coordonnées", () => {
  it("SC-06a — la carte n'offre aucun geste d'ajout, de retrait, de renommage ni de déplacement", async () => {
    // Arrange
    const cookie = await semerSessionValide(await assurerSchema());

    // Act
    const carte = carteCoordonnees(await ouvrirReglages(cookie));

    // Assert : un seul bouton (Enregistrer), les trois coordonnées déclarées.
    const boutons = [...carte.matchAll(/<button[\s\S]*?<\/button>/g)].map(
      (m) => m[0],
    );
    expect(boutons).toHaveLength(1);
    expect(boutons[0]).toContain("Enregistrer");
    expect(carte).not.toMatch(
      /ajouter|supprimer|retirer|renommer|déplacer|monter|descendre/i,
    );
    expect(carte).not.toMatch(/draggable|aria-grabbed/i);
    const donnees =
      /data-coordonnees='([^']*)'|data-coordonnees="([^"]*)"/.exec(carte);
    expect(donnees).not.toBeNull();
    const ids = (
      JSON.parse(
        (donnees?.[1] ?? donnees?.[2] ?? "[]")
          .replaceAll("&quot;", '"')
          .replaceAll("&#34;", '"'),
      ) as { id: string }[]
    ).map((c) => c.id);
    expect(ids).toEqual(["telephone", "courriel", "adresse"]);
  });

  it("SC-06b — un téléphone mal formé est refusé avec le champ nommé, sans nouvelle marque de brouillon", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(cookie, "pas un numéro");

    // Assert : refus par champ, rien d'enregistré, aucune marque à l'écran.
    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as {
      ok: boolean;
      refus: { champ: string; raison: string }[];
    };
    expect(corps.ok).toBe(false);
    expect(corps.refus.map((r) => r.champ)).toEqual(["telephone"]);
    const { TEXTES_REFUS_COORDONNEES } =
      await import("../../src/admin/textes.ts");
    const message = TEXTES_REFUS_COORDONNEES[corps.refus[0].raison];
    expect(message, "le code de raison devrait être traduit").toBeDefined();
    expect(message).toMatch(/numéro de téléphone/);
    const page = await ouvrirReglages(cookie);
    expect(zoneMarque(page, "carte-coordonnees")).not.toContain(MARQUE);
  });

  it("SC-06c — après un enregistrement réussi, l'écran rechargé marque la seule carte Coordonnées et montre la valeur saisie", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);

    // Act
    const reponse = await enregistrer(cookie, "04 11 22 33 44");
    const page = await ouvrirReglages(cookie);

    // Assert
    expect(reponse.status).toBe(200);
    expect(zoneMarque(page, "carte-coordonnees")).toContain(MARQUE);
    expect(zoneMarque(page, "carte-reseaux")).not.toContain(MARQUE);
    expect(zoneMarque(page, "carte-mention")).not.toContain(MARQUE);
    expect(carteCoordonnees(page)).toContain("04 11 22 33 44");
  });

  it("SC-06d — sans aucun réglage enregistré, aucune des trois cartes ne porte la marque", async () => {
    // Arrange
    const cookie = await semerSessionValide(await assurerSchema());

    // Act
    const page = await ouvrirReglages(cookie);

    // Assert
    for (const id of ["carte-coordonnees", "carte-reseaux", "carte-mention"]) {
      expect(zoneMarque(page, id), id).not.toContain(MARQUE);
    }
    expect(page).not.toContain(MARQUE + "=");
  });

  it("SC-06e — avec le seul brouillon Réseaux, la liste du brouillon et le contenu de départ ailleurs", async () => {
    // Arrange
    const db = await assurerSchema();
    const cookie = await semerSessionValide(db);
    await semerBrouillon(db, "reseaux", [
      { nom: "Mastodon", lien: "https://mastodon.example/@atelier" },
    ]);

    // Act
    const page = await ouvrirReglages(cookie);

    // Assert
    expect(zoneMarque(page, "carte-reseaux")).toContain(MARQUE);
    expect(zoneMarque(page, "carte-coordonnees")).not.toContain(MARQUE);
    expect(zoneMarque(page, "carte-mention")).not.toContain(MARQUE);
    const reseaux =
      /<section[^>]*aria-labelledby="carte-reseaux"[^>]*>([\s\S]*?)<\/section>/.exec(
        page,
      )?.[1] ?? "";
    expect(reseaux).toContain("Mastodon");
    expect(reseaux).not.toContain("Instagram");
    const coordonnees = carteCoordonnees(page);
    expect(coordonnees).toContain("01 23 45 67 89");
    expect(coordonnees).toContain("atelier@example.org");
    const mention =
      /<section[^>]*aria-labelledby="carte-mention"[^>]*>([\s\S]*?)<\/section>/.exec(
        page,
      )?.[1] ?? "";
    expect(mention).toContain("servent uniquement à répondre à votre demande");
  });
});
