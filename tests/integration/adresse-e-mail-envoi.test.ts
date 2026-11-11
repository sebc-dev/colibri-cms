/**
 * Ticket 02 (018) — L'écran n'annonce le code qu'une fois l'envoi accepté
 * (openspec/changes/018-envoi-du-code-de-remplacement-fiable/tickets/02-le-code-n-est-annonce-qu-une-fois-parti.md),
 * ADR-0033, ADR-0028.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Doubles : l'API des adresses de Cloudflare
 * (`double-api-adresses.ts`, adresse vérifiée depuis plus d'une minute) et un espion de la liaison
 * d'envoi (ADR-0002) qui refuse N fois puis accepte. Les tentatives espacées de 1 s puis 2 s
 * prennent leur temps réel : chaque test borne donc son délai à 20 s.
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
const ADRESSE = "editrice@exemple.fr";
const NOUVELLE = "nouvelle@exemple.fr";

interface InstructionLike {
  bind(...valeurs: unknown[]): InstructionLike;
  run(): Promise<unknown>;
  all(): Promise<{ results: Record<string, unknown>[] }>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}
interface MessageRemis {
  to: string;
  subject: string;
  text: string;
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
    for (const requete of [
      ...separerRequetes(adresses.default),
      ...separerRequetes(sessions.default),
    ]) {
      await db.prepare(requete).run();
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
    await db
      .prepare("create table if not exists messages_remplacement (envoye_le integer not null)")
      .run();
  })();
  await schemaPret;
  return db;
}

let double: DoubleApiAdresses;
const messages: MessageRemis[] = [];
const tentatives: MessageRemis[] = [];
let refusRestants = 0;
let liaisonPrecedente: unknown;

beforeEach(async () => {
  double = installerDoubleApiAdresses();
  (env as unknown as { JETON_ADRESSES_EMAIL?: string }).JETON_ADRESSES_EMAIL = CLE_DE_TEST;
  messages.length = 0;
  const enveloppe = env as unknown as Record<string, unknown>;
  liaisonPrecedente = enveloppe[CLE_LIAISON];
  refusRestants = 0;
  tentatives.length = 0;
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      await Promise.resolve();
      tentatives.push(message);
      if (refusRestants > 0) {
        refusRestants -= 1;
        throw new Error("envoi refusé");
      }
      messages.push(message);
    },
  };
  const db = await assurerSchema();
  await vider(db);
  await db.prepare("insert into adresses_autorisees (adresse) values (?1)").bind(ADRESSE).run();
});

afterEach(async () => {
  double.restaurer();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = liaisonPrecedente;
  await vider(obtenirDB());
});

async function vider(db: DBLike): Promise<void> {
  for (const table of [
    "sessions",
    "adresses_autorisees",
    "codes_connexion",
    "comptes_seuil",
    "remplacement_adresse",
    "codes_remplacement",
    "messages_remplacement",
  ]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch {
      // table pas encore créée : rien à vider.
    }
  }
}

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-plafond-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

/** Remplace les messages du remplacement déjà partis : un par âge donné (ms avant maintenant). */
async function semerMessages(db: DBLike, agesMs: number[]): Promise<void> {
  await db.prepare("delete from messages_remplacement").run();
  const maintenant = Date.now();
  for (const age of agesMs) {
    await db
      .prepare("insert into messages_remplacement (envoye_le) values (?1)")
      .bind(maintenant - age)
      .run();
  }
}

async function compter(db: DBLike, table: string): Promise<number> {
  try {
    const { results } = await db.prepare(`select count(*) as n from ${table}`).all();
    return Number(results[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

function poster(cookie: string, corps: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
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

function proposer(cookie: string, adresse: string): Promise<Response> {
  return poster(cookie, `etape=proposer&adresse=${encodeURIComponent(adresse)}`);
}

function verifier(cookie: string): Promise<Response> {
  return poster(cookie, "etape=verifier");
}

/** Session avec un remplacement ouvert vers NOUVELLE, adresse cliquée chez Cloudflare. */
async function ouvrirRemplacementVerifie(db: DBLike): Promise<string> {
  const cookie = await semerSession(db);
  await proposer(cookie, NOUVELLE);
  double.verifier(NOUVELLE);
  messages.length = 0;
  return cookie;
}

function texteVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^<>]*>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\s+/g, " ");
}


const DELAI_TEST = 20_000;
const PHRASE_REFUS = `Le code n'a pas pu partir vers ${NOUVELLE}. Patientez une minute, puis appuyez de nouveau sur « J'ai cliqué sur le bouton ».`;

async function codesEcrits(db: DBLike): Promise<Record<string, unknown>[]> {
  try {
    return (await db.prepare("select annule_le, utilise_le from codes_remplacement order by id").all()).results;
  } catch {
    return [];
  }
}

async function adressesAutorisees(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

function codeDe(message: MessageRemis | undefined): string {
  return /Code : (\S+)/.exec(message?.text ?? "")?.[1] ?? "";
}

// --- SC-02a ---

it("SC-02a — un refus puis un envoi accepté : un seul message part, avec le code écrit, et l'écran invite à le recopier", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  refusRestants = 1;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  expect(messages.map((m) => m.to)).toEqual([NOUVELLE]);
  const code = codeDe(messages[0]);
  expect(code).not.toBe("");
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(`Un code vient de partir vers ${NOUVELLE}`);
  expect(texte).toMatch(/Recopiez-le/);
  expect(texte).not.toContain("n'a pas pu partir");
  expect(await codesEcrits(db)).toHaveLength(1);
  const validation = await poster(cookie, `etape=code&code=${encodeURIComponent(code)}`);
  expect(await adressesAutorisees(db)).toEqual([NOUVELLE]);
  expect(validation.status).toBeLessThan(500);
}, DELAI_TEST);

it("SC-02a — deux refus puis un envoi accepté : un seul message part et le code est annoncé", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  refusRestants = 2;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  expect(messages).toHaveLength(1);
  expect(tentatives).toHaveLength(3);
  expect(codeDe(messages[0])).toBe(codeDe(tentatives[0]));
  expect(texteVisible(await reponse.text())).toContain(`Un code vient de partir vers ${NOUVELLE}`);
}, DELAI_TEST);

// --- SC-02b ---

it("SC-02b — trois refus : l'écran dit que le code n'a pas pu partir, redit l'adresse en place, le code écrit ne remplace rien", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  refusRestants = 3;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  expect(messages).toEqual([]);
  expect(tentatives).toHaveLength(3);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(PHRASE_REFUS);
  expect(texte).not.toContain("vient de partir");
  expect(texte).toContain(ADRESSE);
  expect(texte).not.toMatch(/\b(commit|branche|build|déploiement|quota|rate limit|429)\b/i);
  const code = codeDe(tentatives[0]);
  expect(code).not.toBe("");
  await poster(cookie, `etape=code&code=${encodeURIComponent(code)}`);
  expect(await adressesAutorisees(db)).toEqual([ADRESSE]);
}, DELAI_TEST);

// --- SC-02c ---

it("SC-02c — quatre messages déjà partis puis un envoi refusé : le plafond compte toujours quatre, une nouvelle demande est acceptée", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await semerMessages(db, [1000, 2000, 3000, 4000]);
  refusRestants = 3;

  const refusee = await verifier(cookie);

  expect(refusee.status).toBe(200);
  expect(texteVisible(await refusee.text())).toContain(PHRASE_REFUS);
  expect(await compter(db, "messages_remplacement")).toBe(4);

  tentatives.length = 0;
  const acceptee = await verifier(cookie);

  expect(acceptee.status).toBe(200);
  const texte = texteVisible(await acceptee.text());
  expect(texte).not.toContain("Trop de messages sont partis");
  expect(texte).toContain(`Un code vient de partir vers ${NOUVELLE}`);
  expect(messages).toHaveLength(1);
  expect(await compter(db, "messages_remplacement")).toBe(5);
}, DELAI_TEST);
