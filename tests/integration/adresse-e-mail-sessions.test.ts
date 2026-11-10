/**
 * Ticket 06 (017) — Le remplacement ferme les autres sessions et annule les codes de connexion
 * en circulation (openspec/changes/017-remplacement-adresse-autorisee/tickets/06-la-bascule-ferme-les-autres-sessions.md),
 * ADR-0033, ADR-0001.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Le code de remplacement est semé par son empreinte salée
 * (SHA-256 de `sel:code`) pour connaître d'avance les signes. Doubles : l'API des adresses de
 * Cloudflare et l'espion de la liaison d'envoi (ADR-0002).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, beforeEach } from "vitest";
import {
  CLE_DE_TEST,
  installerDoubleApiAdresses,
  type DoubleApiAdresses,
} from "./double-api-adresses";

const NOM_COOKIE_SESSION = "__Host-session";
const CLE_LIAISON = "EXPEDITEUR_CODE_CONNEXION";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/adresse-e-mail";
const ANCIENNE = "editrice@exemple.fr";
const NOUVELLE = "nouvelle@exemple.fr";
// Huit signes de l'alphabet, avec 0, 1 et V pour éprouver les confusables.
const CODE = "01VMNPQR";
const CODE_CONNEXION = "23456789";

interface InstructionLike {
  bind(...valeurs: unknown[]): InstructionLike;
  run(): Promise<unknown>;
  all(): Promise<{ results: Record<string, unknown>[] }>;
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
    const adresses = await import("../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw");
    const sessions = await import("../../migrations/0003_sessions.sql?raw");
    const secours = await import("../../migrations/0016_code_de_secours.sql?raw");
    const remplacement = await import("../../migrations/0017_remplacement_adresse.sql?raw");
    for (const requete of [
      ...separerRequetes(adresses.default),
      ...separerRequetes(sessions.default),
      ...separerRequetes(secours.default),
      ...separerRequetes(remplacement.default),
    ]) {
      try {
        await db.prepare(requete).run();
      } catch {
        // déjà créée par un autre fichier de test : sans effet.
      }
    }
    try {
      await db.prepare("alter table sessions add column dernier_usage_le integer").run();
    } catch {
      // déjà ajoutée : sans effet.
    }
    await db
      .prepare(
        "create table if not exists comptes_seuil (surface text not null, empreinte blob not null, nombre integer not null, primary key (surface, empreinte))",
      )
      .run();
  })();
  await schemaPret;
  return db;
}

let double: DoubleApiAdresses;
let liaisonPrecedente: unknown;

const TABLES = [
  "sessions",
  "adresses_autorisees",
  "codes_connexion",
  "comptes_seuil",
  "remplacement_adresse",
  "codes_remplacement",
  "messages_remplacement",
  "code_de_secours",
];

async function vider(db: DBLike): Promise<void> {
  for (const table of TABLES) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch {
      // table pas encore créée : rien à vider.
    }
  }
}

beforeEach(async () => {
  double = installerDoubleApiAdresses();
  (env as unknown as { JETON_ADRESSES_EMAIL?: string }).JETON_ADRESSES_EMAIL = CLE_DE_TEST;
  const enveloppe = env as unknown as Record<string, unknown>;
  liaisonPrecedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(): Promise<void> {
      // le contenu des messages n'est pas observé ici : la remise réussit, sans plus.
      await Promise.resolve();
    },
  };
  const db = await assurerSchema();
  await vider(db);
  await db.prepare("insert into adresses_autorisees (adresse) values (?1)").bind(ANCIENNE).run();
});

afterEach(async () => {
  double.restaurer();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = liaisonPrecedente;
  await vider(obtenirDB());
});

function versHex(octets: ArrayBuffer): string {
  return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(texte: string): Promise<string> {
  return versHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)));
}

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-bascule-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

/** Session demandeuse, remplacement ouvert vers NOUVELLE, code CODE valable quinze minutes. */
async function preparerRemplacement(db: DBLike): Promise<string> {
  const cookie = await semerSession(db);
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into remplacement_adresse (id, adresse, session, ouvert_le) values (1, ?1, ?2, ?3)",
    )
    .bind(NOUVELLE, cookie, maintenant)
    .run();
  const sel = "sel-de-test-0123456789abcdef";
  await db
    .prepare(
      "insert into codes_remplacement (empreinte, sel, session, creee_le, expire_le) values (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(await sha256Hex(`${sel}:${CODE}`), sel, cookie, maintenant, maintenant + 15 * 60 * 1000)
    .run();
  return cookie;
}

function poster(cookie: string, corps: string, route = ROUTE): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${route}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: corps,
    }),
  );
}



function recopier(cookie: string, saisie: string): Promise<Response> {
  return poster(cookie, `etape=code&code=${encodeURIComponent(saisie)}`);
}

function lireAdresseEmail(cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, { redirect: "manual", headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
}

function estRenvoyeeVersConnexion(reponse: Response): boolean {
  return (
    reponse.status >= 300 &&
    reponse.status < 400 &&
    new URL(reponse.headers.get("location") ?? "", ORIGINE).pathname.startsWith("/admin/connexion")
  );
}

async function adressesEnPlace(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

async function compterSessions(db: DBLike): Promise<number> {
  const { results } = await db.prepare("select count(*) as n from sessions").all();
  return Number(results[0]?.n);
}

async function semerCodeDeConnexion(db: DBLike, appareil: string): Promise<void> {
  const sel = "sel-connexion-0123456789";
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into codes_connexion (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais) values (?1, ?2, ?3, ?4, ?5, 0)",
    )
    .bind(appareil, await sha256Hex(`${sel}:${CODE_CONNEXION}`), sel, maintenant, maintenant + 15 * 60 * 1000)
    .run();
}

// --- SC-06a ---

it("SC-06a — la session d'un autre appareil est renvoyée vers la connexion, celle de l'éditrice reste ouverte", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  const autre = await semerSession(db);
  expect((await lireAdresseEmail(autre)).status).toBe(200);

  const reponse = await recopier(cookie, CODE);

  expect(reponse.status).toBe(200);
  expect(estRenvoyeeVersConnexion(await lireAdresseEmail(autre))).toBe(true);
  expect((await lireAdresseEmail(cookie)).status).toBe(200);
});

// --- SC-06b ---

it("SC-06b — plusieurs sessions ouvertes : seule reste celle qui a fait le remplacement", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  const autres = [await semerSession(db), await semerSession(db), await semerSession(db)];
  expect(await compterSessions(db)).toBe(4);

  await recopier(cookie, CODE);

  const { results } = await db.prepare("select id from sessions").all();
  expect(results.map((ligne) => String(ligne.id))).toEqual([cookie]);
  for (const autre of autres) {
    expect(estRenvoyeeVersConnexion(await lireAdresseEmail(autre))).toBe(true);
  }
});

// --- SC-06c ---

it("SC-06c — remplacement proposé, code envoyé mais non recopié : toutes les sessions coexistent", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  const autre = await semerSession(db);
  const encore = await semerSession(db);

  // Un code erroné ne fait pas aboutir le remplacement.
  await recopier(cookie, "ZZZZZZZZ");

  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  expect(await compterSessions(db)).toBe(3);
  for (const session of [cookie, autre, encore]) {
    expect((await lireAdresseEmail(session)).status).toBe(200);
  }
});

// --- SC-06d ---

it("SC-06d — un code de connexion envoyé à l'ancienne adresse n'ouvre plus de session une fois l'adresse remplacée", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  const appareil = crypto.randomUUID();
  await semerCodeDeConnexion(db, appareil);

  await recopier(cookie, CODE);

  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/connexion`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `identifiant-appareil=${appareil}`,
      },
      body: `code=${encodeURIComponent(CODE_CONNEXION)}`,
    }),
  );
  const pose = reponse.headers.getSetCookie().find((e) => e.startsWith(`${NOM_COOKIE_SESSION}=`));
  expect(pose).toBeUndefined();
  const { results } = await db.prepare("select utilise_le, annule_le from codes_connexion").all();
  expect(results[0]?.utilise_le).toBeNull();
  expect(results[0]?.annule_le).not.toBeNull();
});
