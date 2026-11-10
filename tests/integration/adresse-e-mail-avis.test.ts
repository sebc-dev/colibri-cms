/**
 * Ticket 07 (017) — L'ancienne adresse est prévenue du remplacement
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/07-l-ancienne-adresse-est-prevenue.md),
 * ADR-0002, ADR-0033.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Doubles : l'API des adresses de Cloudflare et l'espion de la
 * liaison d'envoi (ADR-0002), qui enregistre chaque message remis.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, beforeEach, vi } from "vitest";
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
let remis: { from: string; to: string; subject: string; text: string }[] = [];
let echecDeLEnvoi = false;

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
  remis = [];
  echecDeLEnvoi = false;
  enveloppe[CLE_LIAISON] = {
    async send(message: { from: string; to: string; subject: string; text: string }): Promise<void> {
      await Promise.resolve();
      if (echecDeLEnvoi && message.to === ANCIENNE) throw new Error("refus de la plateforme");
      remis.push(message);
    },
  };
  const db = await assurerSchema();
  await vider(db);
  await db.prepare("insert into adresses_autorisees (adresse) values (?1)").bind(ANCIENNE).run();
});

afterEach(async () => {
  vi.restoreAllMocks();
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

async function adressesEnPlace(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

const attendre = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** L'envoi part par `waitUntil` : on laisse à la plateforme le temps de le remettre. */
async function avisRemis(): Promise<typeof remis> {
  for (let i = 0; i < 40 && !remis.some((m) => m.to === ANCIENNE); i += 1) await attendre(50);
  await attendre(150);
  return remis.filter((m) => m.to === ANCIENNE);
}

// --- SC-07a ---

it("SC-07a — l'adresse est remplacée : un avis texte seul part vers l'ancienne adresse, nomme la nouvelle et la date, renvoie au code de secours", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  await recopier(cookie, CODE);

  const avis = await avisRemis();
  expect(avis).toHaveLength(1);
  const message = avis[0];
  expect(message.subject).toBe("L'adresse de votre administration a changé");
  expect(Object.keys(message).sort((a, b) => a.localeCompare(b))).toEqual(["from", "subject", "text", "to"]);
  expect(message.text).toContain(NOUVELLE);
  expect(message.text).toMatch(new RegExp(String(new Date().getFullYear())));
  expect(message.text).toMatch(/secours/i);
  expect(message.text).not.toMatch(/<[a-z!/]/i);
  expect(message.from).not.toBe(ANCIENNE);
  expect(message.from).not.toBe(NOUVELLE);
});

// --- SC-07b ---

it("SC-07b — l'avis ne porte ni code de connexion, ni code de remplacement, ni code de secours", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  const sel = "sel-secours-0123456789";
  try {
    await db
      .prepare("insert into code_de_secours (empreinte, sel) values (?1, ?2)")
      .bind(await sha256Hex(`${sel}:ABCD2345EFGH6789`), sel)
      .run();
  } catch {
    // forme de la table propre au ticket du code de secours : sans effet sur l'assertion.
  }

  await recopier(cookie, CODE);

  const avis = await avisRemis();
  expect(avis).toHaveLength(1);
  const texte = avis[0].text;
  expect(texte).not.toContain(CODE);
  expect(texte).not.toContain("ABCD2345EFGH6789");
  expect(texte).not.toMatch(/Code\s*:/i);
  expect(texte).not.toMatch(/\b[0-9A-Z]{8}\b/);
});

// --- SC-07c ---

it("SC-07c — l'envoi de l'avis échoue : la nouvelle adresse reste autorisée, l'échec est tracé sans code", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  echecDeLEnvoi = true;
  const journal = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const reponse = await recopier(cookie, CODE);
  for (let i = 0; i < 40 && journal.mock.calls.length === 0; i += 1) await attendre(50);

  expect(reponse.status).toBe(200);
  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
  expect(journal).toHaveBeenCalled();
  const trace = journal.mock.calls.map((appel) => appel.map(String).join(" ")).join("\n");
  expect(trace).toMatch(/avis/i);
  expect(trace).not.toContain(CODE);
  expect(trace).not.toContain(CLE_DE_TEST);
});

// --- SC-07d ---

it("SC-07d — le même code saisi deux fois en même temps : une seule bascule, un seul avis", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  await Promise.all([recopier(cookie, CODE), recopier(cookie, CODE)]);

  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
  const avis = await avisRemis();
  expect(avis).toHaveLength(1);
});
