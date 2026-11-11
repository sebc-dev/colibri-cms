/**
 * Ticket 03 (018) — Le refus du plafond garde l'étape du code
 * (openspec/changes/018-envoi-du-code-de-remplacement-fiable/tickets/03-le-refus-du-plafond-garde-l-etape-du-code.md),
 * ADR-0028, ADR-0033.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Doubles : l'API des adresses de Cloudflare
 * (`double-api-adresses.ts`) et l'espion de la liaison d'envoi (ADR-0002). Le code en circulation
 * est obtenu par le vrai parcours (message espionné) ; les messages déjà partis sont semés.
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
const PHRASE_PLAFOND = "Trop de messages sont partis en peu de temps. Réessayez dans une heure.";
const CINQ_RECENTS = [1000, 2000, 3000, 4000, 5000];

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
  await db.prepare("insert into adresses_autorisees (adresse) values (?1)").bind(ANCIENNE).run();
});

afterEach(async () => {
  double.restaurer();
  (env as unknown as Record<string, unknown>)[CLE_LIAISON] = liaisonPrecedente;
  await vider(obtenirDB());
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-plafond-code-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

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

function verifier(cookie: string): Promise<Response> {
  return poster(cookie, "etape=verifier");
}

/** Session avec un remplacement ouvert vers NOUVELLE, adresse cliquée chez Cloudflare. */
async function ouvrirRemplacementVerifie(db: DBLike): Promise<string> {
  const cookie = await semerSession(db);
  await poster(cookie, `etape=proposer&adresse=${encodeURIComponent(NOUVELLE)}`);
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
    .replace(/[\u{a0}\u{202f}]/gu, " ")
    .replace(/\s+/g, " ");
}

function codeRecu(): string {
  const message = messages.at(-1);
  return /^Code : (\S+)$/.exec(message?.text ?? "")?.[1] ?? "";
}

async function lireAdresseEnPlace(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

it("SC-03a — code bon en circulation, nouveau code refusé par le plafond : l'écran dit d'attendre et garde le champ du code", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  const premiere = await verifier(cookie);
  expect(premiere.status).toBe(200);
  expect(codeRecu()).not.toBe("");
  await semerMessages(db, CINQ_RECENTS);
  const envoyesAvant = messages.length;

  const reponse = await verifier(cookie);

  expect(reponse.status).toBeLessThan(500);
  const html = await reponse.text();
  expect(texteVisible(html)).toContain(PHRASE_PLAFOND);
  expect(html).toMatch(/<input[^>]*name="code"/);
  expect(messages).toHaveLength(envoyesAvant);
});

it("SC-03a — le code déjà parti permet toujours de remplacer l'adresse après le refus du plafond", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await verifier(cookie);
  const code = codeRecu();
  expect(code).not.toBe("");
  await semerMessages(db, CINQ_RECENTS);
  await verifier(cookie);

  const bascule = await poster(cookie, `etape=code&code=${encodeURIComponent(code)}`);

  expect(bascule.status).toBeLessThan(500);
  expect(texteVisible(await bascule.text())).toContain(
    `C'est fait : votre adresse est désormais ${NOUVELLE}.`,
  );
  expect(await lireAdresseEnPlace(db)).toEqual([NOUVELLE]);
});

it("SC-03a — cinq messages partis sans code en circulation : l'écran dit d'attendre sans champ de code", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirRemplacementVerifie(db);
  await semerMessages(db, CINQ_RECENTS);

  const reponse = await verifier(cookie);

  expect(reponse.status).toBeLessThan(500);
  const html = await reponse.text();
  expect(texteVisible(html)).toContain(PHRASE_PLAFOND);
  expect(html).not.toMatch(/<input[^>]*name="code"/);
  expect(messages).toEqual([]);
});
