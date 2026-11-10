/**
 * Ticket 08 (017) — Au plus cinq messages par heure pour le remplacement de l'adresse autorisée
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/08-le-plafond-du-remplacement.md),
 * ADR-0028, ADR-0033.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Doubles : l'API des adresses de Cloudflare
 * (`double-api-adresses.ts`) et l'espion de la liaison d'envoi (ADR-0002). Les messages déjà
 * partis sont semés dans `messages_remplacement` (une ligne par message, `envoye_le` en ms).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  CLE_DE_TEST,
  installerDoubleApiAdresses,
  type DoubleApiAdresses,
} from "./double-api-adresses";

const NOM_COOKIE_SESSION = "__Host-session";
const NOM_COOKIE_APPAREIL = "identifiant-appareil";
const CLE_LIAISON = "EXPEDITEUR_CODE_CONNEXION";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/adresse-e-mail";
const ADRESSE = "editrice@exemple.fr";
const NOUVELLE = "nouvelle@exemple.fr";
const HEURE_MS = 60 * 60 * 1000;
const PHRASE_PLAFOND = "Trop de messages sont partis en peu de temps. Réessayez dans une heure.";

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
let liaisonPrecedente: unknown;

beforeEach(async () => {
  double = installerDoubleApiAdresses();
  (env as unknown as { JETON_ADRESSES_EMAIL?: string }).JETON_ADRESSES_EMAIL = CLE_DE_TEST;
  messages.length = 0;
  const enveloppe = env as unknown as Record<string, unknown>;
  liaisonPrecedente = enveloppe[CLE_LIAISON];
  enveloppe[CLE_LIAISON] = {
    async send(message: MessageRemis): Promise<void> {
      await Promise.resolve();
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

const CINQ_RECENTS = [1000, 2000, 3000, 4000, 5000];

// --- SC-08a ---

it("SC-08a — cinq messages dans l'heure, une adresse neuve proposée : rien n'est inscrit chez Cloudflare, l'écran dit d'attendre", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMessages(db, CINQ_RECENTS);

  const reponse = await proposer(cookie, NOUVELLE);

  expect(reponse.status).toBeLessThan(500);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(PHRASE_PLAFOND);
  expect(texte).toContain(ADRESSE);
  expect(double.appels).toEqual([]);
  expect(double.adresses).toEqual([]);
  expect(await compter(db, "remplacement_adresse")).toBe(0);
  expect(await compter(db, "messages_remplacement")).toBe(5);
});

it("SC-08a — cinq messages dans l'heure, un code demandé : aucun code écrit, rien envoyé, l'écran dit d'attendre", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await semerMessages(db, CINQ_RECENTS);

  const reponse = await verifier(cookie);

  expect(reponse.status).toBeLessThan(500);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(PHRASE_PLAFOND);
  expect(texte).not.toMatch(/\b(commit|branche|build|déploiement|quota|rate limit|429)\b/i);
  expect(await compter(db, "codes_remplacement")).toBe(0);
  await new Promise((r) => setTimeout(r, 50));
  expect(messages).toEqual([]);
});

// --- SC-08b ---

it("SC-08b — plafond du remplacement atteint, l'adresse autorisée reçoit son code de connexion comme d'habitude", async () => {
  const db = await assurerSchema();
  await semerMessages(db, CINQ_RECENTS);

  const ecran = await exports.default.fetch(new Request(`${ORIGINE}/admin/connexion`));
  const appareil = ecran.headers
    .getSetCookie()
    .map((c) => c.split(";")[0] ?? "")
    .find((c) => c.startsWith(`${NOM_COOKIE_APPAREIL}=`));
  expect(appareil).toBeTruthy();
  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/connexion`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: ORIGINE,
        cookie: appareil ?? "",
      },
      body: `adresse=${encodeURIComponent(ADRESSE)}`,
    }),
  );

  expect(reponse.status).toBeLessThan(500);
  expect(await compter(db, "codes_connexion")).toBe(1);
  await vi.waitFor(() => {
    expect(messages.map((m) => m.to)).toEqual([ADRESSE]);
  });
  expect(await compter(db, "messages_remplacement")).toBe(5);
});

// --- SC-08c ---

it("SC-08c — un message sorti de l'heure glissante : une nouvelle proposition redevient possible", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMessages(db, [HEURE_MS + 1000, 2000, 3000, 4000, 5000]);

  const reponse = await proposer(cookie, NOUVELLE);

  expect(reponse.status).toBe(200);
  const texte = texteVisible(await reponse.text());
  expect(texte).not.toContain(PHRASE_PLAFOND);
  expect(texte).toContain(`Un message va arriver à ${NOUVELLE}`);
  expect(double.adresses.map((a) => a.email)).toEqual([NOUVELLE]);
});

it("SC-08c — un message sorti de l'heure glissante : un nouveau code redevient possible", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await semerMessages(db, [HEURE_MS + 1000, 2000, 3000, 4000, 5000]);

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  expect(texteVisible(await reponse.text())).not.toContain(PHRASE_PLAFOND);
  expect(await compter(db, "codes_remplacement")).toBe(1);
  await vi.waitFor(() => {
    expect(messages.map((m) => m.to)).toEqual([NOUVELLE]);
  });
});

// --- SC-08d ---

it("SC-08d — deux demandes de code concurrentes avec quatre messages déjà partis : un seul code est écrit", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await semerMessages(db, [1000, 2000, 3000, 4000]);

  const [a, b] = await Promise.all([verifier(cookie), verifier(cookie)]);

  expect(a.status).toBeLessThan(500);
  expect(b.status).toBeLessThan(500);
  expect(await compter(db, "codes_remplacement")).toBe(1);
});

// --- Chemins sans critère propre, demandés par la review (architecture-F-1, coverage-F-1) ---

it("SC-08a — une adresse déjà inscrite chez Cloudflare ne compte pas dans le plafond", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await semerMessages(db, [1000, 2000, 3000, 4000]);
  double.inscrire(NOUVELLE);

  const dejaInscrite = await proposer(cookie, NOUVELLE);

  expect(texteVisible(await dejaInscrite.text())).not.toContain(PHRASE_PLAFOND);
  expect(await compter(db, "messages_remplacement")).toBe(4);

  const neuve = await proposer(cookie, "autre@exemple.fr");

  expect(texteVisible(await neuve.text())).not.toContain(PHRASE_PLAFOND);
  expect(await compter(db, "messages_remplacement")).toBe(5);
});

it("SC-08a — remplacement fermé avant la demande de code : aucun code écrit, rien envoyé, aucun message compté", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await db.prepare("delete from remplacement_adresse").run();
  const avant = await compter(db, "messages_remplacement");

  const reponse = await verifier(cookie);

  expect(reponse.status).toBeLessThan(500);
  expect(await compter(db, "codes_remplacement")).toBe(0);
  await new Promise((r) => setTimeout(r, 50));
  expect(messages).toEqual([]);
  expect(await compter(db, "messages_remplacement")).toBe(avant);
});
