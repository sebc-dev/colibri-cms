/**
 * Ticket 04 (017) — Le code recopié dans la session demandeuse remplace l'adresse autorisée
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/04-le-code-recopie-remplace-l-adresse.md),
 * ADR-0033, ADR-0005, ADR-0032, ADR-0001.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Le code de remplacement est semé par son empreinte salée
 * (SHA-256 de `sel:code`) pour connaître d'avance les signes. Doubles : l'API des adresses de
 * Cloudflare et l'espion de la liaison d'envoi (ADR-0002).
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
const INCONNUE = "inconnue@exemple.fr";
// Huit signes de l'alphabet, avec 0, 1 et V pour éprouver les confusables.
const CODE = "01VMNPQR";
const CODE_DE_SECOURS = "0123456789ABCDEFGHJKMNPQRV";

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

async function adressesEnPlace(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

async function compter(db: DBLike, table: string): Promise<number> {
  const { results } = await db.prepare(`select count(*) as n from ${table}`).all();
  return Number(results[0]?.n);
}

function soumettreAdresse(adresse: string, appareil: string = crypto.randomUUID()): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/connexion`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `identifiant-appareil=${appareil}`,
      },
      body: `adresse=${encodeURIComponent(adresse)}`,
    }),
  );
}

const DEMANDE = {
  parfum: ["fraise"],
  "nombre-de-parts": ["dix-parts"],
  occasion: ["anniversaire"],
  nom: "Marie Dupont",
  courriel: "marie@exemple.fr",
};

function envoyerDemande(): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGINE },
      body: JSON.stringify({ formulaire: "devis-gateau", page: "contact", valeurs: DEMANDE, totalAffiche: 4000 }),
    }),
  );
}

// --- SC-04a ---

it("SC-04a — le code recopié dans la session demandeuse remplace l'adresse et l'écran confirme la nouvelle", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  const reponse = await recopier(cookie, CODE);

  expect(reponse.status).toBe(200);
  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(
    `C'est fait : votre adresse est désormais ${NOUVELLE}. Vos codes de connexion et vos demandes de devis y arriveront.`,
  );
  expect(texte).toContain("Revenir aux réglages");
});

// --- SC-04b ---

const SAISIES = [
  { forme: "en minuscules", saisie: CODE.toLowerCase() },
  { forme: "avec des espaces", saisie: "01VM NPQR" },
  { forme: "avec des tirets", saisie: "01VM-NPQR" },
  { forme: "avec des confusables (O, I, U)", saisie: "OIUMNPQR" },
  { forme: "avec un L pour 1", saisie: "0LVMNPQR" },
];

it.each(SAISIES)("SC-04b — un code saisi $forme remplace l'adresse", async ({ saisie }) => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  const reponse = await recopier(cookie, saisie);

  expect(reponse.status).toBe(200);
  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
});

// --- SC-04c ---

it("SC-04c — juste après le remplacement, la nouvelle adresse reçoit un code ; l'ancienne, rien, et la réponse est celle d'une inconnue", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  // Témoin : avant la bascule, ANCIENNE est l'adresse autorisée ; le montage doit
  // donc détecter un code écrit et un message envoyé.
  await soumettreAdresse(ANCIENNE);
  await vi.waitFor(
    () => {
      expect(messages.some((m) => m.to === ANCIENNE)).toBe(true);
    },
    { timeout: 5000 },
  );
  expect(await compter(db, "codes_connexion")).toBe(1);
  await db.prepare("delete from codes_connexion").run();

  await recopier(cookie, CODE);
  messages.length = 0;

  const reponseInconnue = await soumettreAdresse(INCONNUE);
  const texteInconnue = texteVisible(await reponseInconnue.text());
  await new Promise((r) => setTimeout(r, 100));
  expect(await compter(db, "codes_connexion")).toBe(0);
  expect(messages).toEqual([]);

  const reponseAncienne = await soumettreAdresse(ANCIENNE);
  const texteAncienne = texteVisible(await reponseAncienne.text());
  await new Promise((r) => setTimeout(r, 100));
  expect(await compter(db, "codes_connexion")).toBe(0);
  expect(messages).toEqual([]);
  expect(reponseAncienne.status).toBe(reponseInconnue.status);
  expect(texteAncienne).toBe(texteInconnue);

  await soumettreAdresse(NOUVELLE);
  await vi.waitFor(
    () => {
      expect(messages).toHaveLength(1);
    },
    { timeout: 5000 },
  );
  expect(messages[0]?.to).toBe(NOUVELLE);
  expect(await compter(db, "codes_connexion")).toBe(1);
}, 30_000);

// --- SC-04d ---

it("SC-04d — le code de secours en place ouvre toujours une session juste après le remplacement", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  await db
    .prepare("insert into code_de_secours (id, empreinte, cree_le) values (1, ?1, ?2)")
    .bind(await sha256Hex(CODE_DE_SECOURS), Date.now())
    .run();
  await recopier(cookie, CODE);
  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);

  const reponse = await poster("sans-session", `code=${encodeURIComponent(CODE_DE_SECOURS)}`, "/admin/reprise");

  expect(reponse.status).toBe(200);
  const pose = reponse.headers.getSetCookie().find((e) => e.startsWith(`${NOM_COOKIE_SESSION}=`));
  expect(pose).toBeDefined();
});

// --- SC-04e ---

it("SC-04e — juste après le remplacement, une demande complète va à la nouvelle adresse, aucun message à l'ancienne", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  await recopier(cookie, CODE);
  messages.length = 0;

  const reponse = await envoyerDemande();

  expect(reponse.status).toBe(200);
  expect(messages.map((m) => m.to)).toEqual([NOUVELLE]);
  expect(messages.some((m) => m.to === ANCIENNE)).toBe(false);
});

// --- SC-04f ---

it("SC-04f — pendant un remplacement non abouti, une demande complète va à l'adresse autorisée en place", async () => {
  const db = await assurerSchema();
  await preparerRemplacement(db);
  messages.length = 0;

  const reponse = await envoyerDemande();

  expect(reponse.status).toBe(200);
  expect(messages.map((m) => m.to)).toEqual([ANCIENNE]);
  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
});
