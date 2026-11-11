/**
 * Ticket 01 (018) — Une confirmation de moins d'une minute fait patienter
 * (openspec/changes/018-envoi-du-code-de-remplacement-fiable/tickets/01-une-confirmation-recente-fait-patienter.md),
 * ADR-0033.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Doubles : l'API des adresses de Cloudflare
 * (`double-api-adresses.ts`) et l'espion de la liaison d'envoi (ADR-0002).
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
  const id = `session-proposer-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

function proposer(cookie: string, adresse: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: `etape=proposer&adresse=${encodeURIComponent(adresse)}`,
    }),
  );
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

function verifier(cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: "etape=verifier",
    }),
  );
}

async function lignesDeCodes(db: DBLike): Promise<Record<string, unknown>[]> {
  try {
    return (await db.prepare("select * from codes_remplacement order by id").all()).results;
  } catch {
    return [];
  }
}

/** Session avec un remplacement ouvert vers NOUVELLE (l'adresse est inscrite, pas encore cliquée). */
async function ouvrirRemplacementDeTest(db: DBLike): Promise<string> {
  const cookie = await semerSession(db);
  await proposer(cookie, NOUVELLE);
  return cookie;
}

async function compterMessages(db: DBLike): Promise<number> {
  try {
    const { results } = await db.prepare("select count(*) as n from messages_remplacement").all();
    return Number(results[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

const ATTENTE =
  "Votre clic est bien enregistré. Il faut encore un instant avant que le code puisse partir. Patientez une minute, puis appuyez de nouveau sur « J'ai cliqué sur le bouton ».";

function ilYa(secondes: number): string {
  return new Date(Date.now() - secondes * 1000).toISOString();
}

async function laisserPasserLesEnvois(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50));
}

// --- SC-01a ---

it.each([
  ["59 s", () => ilYa(59)],
  ["à l'instant", () => ilYa(0)],
  ["dans le futur (horloges décalées)", () => new Date(Date.now() + 30_000).toISOString()],
])("SC-01a — adresse vérifiée %s : rien n'est écrit, envoyé ni compté, l'écran dit d'attendre", async (_nom, quand) => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE, quand());
  messages.length = 0;
  const avant = await compterMessages(db);

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(ATTENTE);
  expect(texte).not.toContain("Un code vient de partir");
  expect(texte).toContain(`votre adresse reste ${ADRESSE}`);
  expect(await lignesDeCodes(db)).toEqual([]);
  expect(await compterMessages(db)).toBe(avant);
  await laisserPasserLesEnvois();
  expect(messages).toEqual([]);
});

it("SC-01a — « Recevoir un nouveau code » pressé pendant la minute : aucun nouveau code, aucun message de plus, l'attente est dite, le champ Code reste", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE);
  await verifier(cookie);
  await vi.waitFor(() => {
    expect(messages).toHaveLength(1);
  });
  const codesAvant = await lignesDeCodes(db);
  const comptesAvant = await compterMessages(db);
  double.verifier(NOUVELLE, ilYa(10));

  const reponse = await verifier(cookie);

  const texte = texteVisible(await reponse.text());
  expect(texte).toContain("Votre clic est bien enregistré");
  expect(texte).toContain(`votre adresse reste ${ADRESSE}`);
  expect(texte).toContain("Code");
  expect(await lignesDeCodes(db)).toEqual(codesAvant);
  expect(await compterMessages(db)).toBe(comptesAvant);
  await laisserPasserLesEnvois();
  expect(messages).toHaveLength(1);
});

// --- SC-01b ---

it.each([
  ["60 s", () => ilYa(60)],
  ["61 s", () => ilYa(61)],
  ["à une date ancienne", () => "2026-01-01T00:00:00Z"],
  ["non datée", () => "oui"],
])("SC-01b — adresse vérifiée %s : un code est écrit et envoyé vers la nouvelle adresse, l'écran invite à le recopier", async (_nom, quand) => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE, quand());
  messages.length = 0;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(`Un code vient de partir vers ${NOUVELLE}.`);
  expect(texte).toContain("Recopiez-le ici.");
  expect(texte).not.toContain("Votre clic est bien enregistré");
  expect(await lignesDeCodes(db)).toHaveLength(1);
  await vi.waitFor(() => {
    expect(messages).toHaveLength(1);
  });
  expect(messages[0]?.to).toBe(NOUVELLE);
});
