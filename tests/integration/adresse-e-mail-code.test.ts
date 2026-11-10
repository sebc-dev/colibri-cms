/**
 * Ticket 03 (017) — Le code de remplacement ne part qu'une fois la confirmation de Cloudflare
 * constatée (openspec/changes/017-remplacement-adresse-autorisee/tickets/03-le-code-part-apres-confirmation.md),
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
  type ModePanne,
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

const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/;
const OBJET_ATTENDU = "Confirmez votre nouvelle adresse";

function codeDuMessage(message: MessageRemis | undefined): string {
  return /^Code : (\S+)$/.exec(message?.text ?? "")?.[1] ?? "";
}

// --- SC-03a ---

it.each([
  ["en attente (clic pas encore fait)", false],
  ["absente chez Cloudflare", true],
])("SC-03a — adresse %s : aucun code écrit ni envoyé, l'écran redit de cliquer", async (_nom, retiree) => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  if (retiree) double.adresses.length = 0;
  messages.length = 0;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(
    "Le clic n'a pas encore été enregistré. Vérifiez vos courriers indésirables, cliquez sur le bouton du message, puis réessayez.",
  );
  expect(texte).toContain("J'ai cliqué sur le bouton");
  expect(await lignesDeCodes(db)).toEqual([]);
  await new Promise((r) => setTimeout(r, 50));
  expect(messages).toEqual([]);
});

// --- SC-03b ---

it("SC-03b — adresse vérifiée : un code est écrit, son envoi est demandé, l'écran invite à le recopier", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE);
  messages.length = 0;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBe(200);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(`Un code vient de partir vers ${NOUVELLE}.`);
  expect(texte).toContain("Recopiez-le ici. Il reste bon quinze minutes.");
  expect(texte).toContain("Code");
  expect(texte).toContain("Valider");
  expect(texte).toContain("Recevoir un nouveau code");
  const lignes = await lignesDeCodes(db);
  expect(lignes).toHaveLength(1);
  expect(lignes[0]?.session).toBe(cookie);
  expect(Number(lignes[0]?.expire_le) - Number(lignes[0]?.creee_le)).toBe(15 * 60 * 1000);
  await vi.waitFor(() => {
    expect(messages).toHaveLength(1);
  });
});

// --- SC-03c ---

it("SC-03c — le code fait huit signes de l'alphabet sans confusables, la base n'en garde qu'une empreinte salée", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE);
  messages.length = 0;

  await verifier(cookie);

  await vi.waitFor(() => {
    expect(messages).toHaveLength(1);
  });
  const code = codeDuMessage(messages[0]);
  expect(code).toMatch(CODE_RE);
  const lignes = await lignesDeCodes(db);
  expect(lignes).toHaveLength(1);
  const ligne = lignes[0] ?? {};
  expect(String(ligne.empreinte).length).toBeGreaterThan(0);
  expect(String(ligne.sel).length).toBeGreaterThan(0);
  for (const valeur of Object.values(ligne)) {
    expect(String(valeur)).not.toContain(code);
  }
});

// --- SC-03d ---

it("SC-03d — le message va à la nouvelle adresse, depuis l'expéditeur de l'instance, en texte seul, sous un objet fixe", async () => {
  const { default: instance } = (await import("../../instance.json")) as {
    default: { senderAddress: string };
  };
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE);
  messages.length = 0;

  await verifier(cookie);

  await vi.waitFor(() => {
    expect(messages).toHaveLength(1);
  });
  const message = messages[0] as MessageRemis & { from: string; html?: unknown };
  expect(message.to).toBe(NOUVELLE);
  expect(message.from).toBe(instance.senderAddress);
  expect(message.from).not.toBe(ADRESSE);
  expect(message.subject).toBe(OBJET_ATTENDU);
  expect(message.subject).not.toBe("Votre code de connexion");
  expect(message.html).toBeUndefined();
  expect(message.text).toMatch(/^Code : [0-9A-HJKMNP-TV-Z]{8}$/);
});

// --- SC-03e ---

it("SC-03e — un second code annule le premier", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementDeTest(db);
  double.verifier(NOUVELLE);

  await verifier(cookie);
  await verifier(cookie);

  const lignes = await lignesDeCodes(db);
  expect(lignes).toHaveLength(2);
  expect(lignes[0]?.annule_le).not.toBeNull();
  expect(lignes[1]?.annule_le).toBeNull();
});

// --- SC-03f ---

const PANNES_ETAT: [string, ModePanne][] = [
  ["success: false", "success-false"],
  ["5xx", "cinq-cent-deux"],
  ["délai dépassé", "delai"],
  ["réponse illisible", "illisible"],
];

it.each(PANNES_ETAT)(
  "SC-03f — %s à la demande d'état : aucun code écrit ni envoyé, l'écran invite à réessayer",
  async (_nom, mode) => {
    const db = await assurerSchema();
    const cookie = await ouvrirRemplacementDeTest(db);
    double.verifier(NOUVELLE);
    double.panne = { mode, methode: "GET" };
    messages.length = 0;

    const reponse = await verifier(cookie);

    expect(reponse.status).toBeLessThan(500);
    const texte = texteVisible(await reponse.text());
    expect(texte).toContain("Réessayez dans quelques minutes.");
    expect(texte).toContain(`votre adresse reste ${ADRESSE}`);
    expect(await lignesDeCodes(db)).toEqual([]);
    await new Promise((r) => setTimeout(r, 50));
    expect(messages).toEqual([]);
  },
);

// --- SC-03g ---

it("SC-03g — ni la réponse ni les journaux ne laissent paraître la clé (proposition, vérification, refus)", async () => {
  const db = await assurerSchema();
  const journal: string[] = [];
  const espions = (["log", "warn", "error", "info", "debug"] as const).map((niveau) =>
    vi.spyOn(console, niveau).mockImplementation((...args: unknown[]) => {
      journal.push(args.map(String).join(" "));
    }),
  );
  const corps: string[] = [];
  try {
    const cookie = await semerSession(db);
    corps.push(await (await proposer(cookie, NOUVELLE)).text());
    double.verifier(NOUVELLE);
    corps.push(await (await verifier(cookie)).text());
    for (const mode of ["success-false", "cinq-cent-deux", "delai", "illisible"] as const) {
      double.panne = { mode };
      corps.push(await (await verifier(cookie)).text());
      corps.push(await (await proposer(cookie, "autre@exemple.fr")).text());
    }
  } finally {
    for (const espion of espions) espion.mockRestore();
  }

  expect(double.appels.filter((a) => a.methode === "GET").length).toBeGreaterThan(1);
  expect(await lignesDeCodes(db)).not.toEqual([]);
  expect(corps.join("\n")).not.toContain(CLE_DE_TEST);
  expect(journal.join("\n")).not.toContain(CLE_DE_TEST);
});
