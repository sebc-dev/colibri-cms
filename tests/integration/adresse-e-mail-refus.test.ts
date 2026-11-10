/**
 * Ticket 05 (017) — Un code de remplacement refusé dit quel geste reprendre et ne change rien
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/05-les-refus-du-code-de-remplacement.md),
 * ADR-0033, ADR-0011, ADR-0032.
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
const SECONDE = "seconde@exemple.fr";
// Huit signes de l'alphabet, avec 0, 1 et V pour éprouver les confusables.
const CODE = "01VMNPQR";
const MESSAGE_RETAPER = "Ce code ne correspond pas. Vérifiez chaque signe, puis réessayez.";
const MESSAGE_NOUVEAU_CODE = "Ce code ne peut plus servir. Demandez-en un nouveau.";

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


function proposer(cookie: string, adresse: string): Promise<Response> {
  return poster(cookie, `etape=proposer&adresse=${encodeURIComponent(adresse)}`);
}

function verifier(cookie: string): Promise<Response> {
  return poster(cookie, "etape=verifier");
}

function lireEcran(cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      redirect: "manual",
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

function presenterALaConnexion(code: string, appareil: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/connexion`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `identifiant-appareil=${appareil}`,
      },
      body: `code=${encodeURIComponent(code)}`,
    }),
  );
}

const FAUTIFS = ["AAAAAAAA", "BBBBBBBB", "CCCCCCCC", "DDDDDDDD", "EEEEEEEE"];

// --- SC-05a ---

it("SC-05a — un code fautif : l'écran invite à retaper, redit l'adresse en place, et l'adresse ne change pas", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  const reponse = await recopier(cookie, FAUTIFS[0] ?? "");

  expect(reponse.status).toBe(200);
  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(MESSAGE_RETAPER);
  expect(texte).not.toContain(MESSAGE_NOUVEAU_CODE);
  expect(texte).toContain(`Tant que ce n'est pas terminé, votre adresse reste ${ANCIENNE}.`);
  expect(texte).toContain("Valider");
});

// --- SC-05b ---

it("SC-05b — cinq saisies fautives, puis le bon code : l'adresse ne change pas et l'écran invite à demander un nouveau code", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  for (const faute of FAUTIFS) {
    await recopier(cookie, faute);
  }

  const reponse = await recopier(cookie, CODE);

  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(MESSAGE_NOUVEAU_CODE);
  expect(texte).toContain("Recevoir un nouveau code");
  expect(texte).toContain(`Tant que ce n'est pas terminé, votre adresse reste ${ANCIENNE}.`);
});

it("SC-05b — borne : quatre saisies fautives, puis le bon code, remplacent l'adresse", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  for (const faute of FAUTIFS.slice(0, 4)) {
    await recopier(cookie, faute);
  }

  await recopier(cookie, CODE);

  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
});

// --- SC-05c ---

it.each([
  ["une milliseconde après l'échéance", -1],
  ["quinze minutes pile (échéance atteinte)", 0],
  ["bien après l'échéance", -60_000],
])("SC-05c — le code saisi %s : l'adresse ne change pas et l'écran invite à demander un nouveau code", async (_nom, decalage) => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  // L'échéance est déjà atteinte (ou dépassée) quand la requête arrive : le temps ne recule pas.
  await db
    .prepare("update codes_remplacement set expire_le = ?1")
    .bind(Date.now() + decalage)
    .run();

  const reponse = await recopier(cookie, CODE);

  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(MESSAGE_NOUVEAU_CODE);
  expect(texte).toContain(`Tant que ce n'est pas terminé, votre adresse reste ${ANCIENNE}.`);
});

// --- SC-05d ---

it("SC-05d — le bon code saisi depuis une autre session ne change pas l'adresse et n'est pas consommé", async () => {
  const db = await assurerSchema();
  const demandeuse = await preparerRemplacement(db);
  const autre = await semerSession(db);

  const reponse = await recopier(autre, CODE);

  expect(reponse.status).toBeLessThan(500);
  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  const { results } = await db.prepare("select utilise_le from codes_remplacement").all();
  expect(results.map((l) => l.utilise_le)).toEqual([null]);
  expect(texteVisible(await reponse.text())).toContain(MESSAGE_NOUVEAU_CODE);

  // Témoin : la session demandeuse, elle, peut encore le recopier.
  await recopier(demandeuse, CODE);
  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
});

// --- SC-05e ---

it("SC-05e — un code qui a déjà servi, saisi à nouveau, ne remplace rien", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);
  await recopier(cookie, CODE);
  expect(await adressesEnPlace(db)).toEqual([NOUVELLE]);
  // Une autre adresse prend la place : un code déjà servi ne doit pas la déloger.
  await db.prepare("delete from adresses_autorisees").run();
  await db.prepare("insert into adresses_autorisees (adresse) values (?1)").bind(ANCIENNE).run();

  const reponse = await recopier(cookie, CODE);

  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  expect(texteVisible(await reponse.text())).toContain(MESSAGE_NOUVEAU_CODE);
});

// --- SC-05f ---

it("SC-05f — un code de remplacement présenté sur l'écran de connexion n'ouvre aucune session", async () => {
  const db = await assurerSchema();
  await preparerRemplacement(db);
  const avant = await compter(db, "sessions");

  const reponse = await presenterALaConnexion(CODE, "appareil-de-connexion");

  const poses = reponse.headers.getSetCookie().filter((e) => e.startsWith(`${NOM_COOKIE_SESSION}=`));
  expect(poses).toEqual([]);
  expect(await compter(db, "sessions")).toBe(avant);
  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  const { results } = await db.prepare("select essais, utilise_le from codes_remplacement").all();
  expect(results).toEqual([{ essais: 0, utilise_le: null }]);
});

// --- SC-05g ---

it("SC-05g — une seconde adresse proposée annule le remplacement vers la première : son code ne remplace plus rien", async () => {
  const db = await assurerSchema();
  const cookie = await preparerRemplacement(db);

  const proposition = await proposer(cookie, SECONDE);
  expect(proposition.status).toBe(200);
  const ouverts = await db.prepare("select adresse from remplacement_adresse").all();
  expect(ouverts.results.map((l) => l.adresse)).toEqual([SECONDE]);

  const reponse = await recopier(cookie, CODE);

  expect(await adressesEnPlace(db)).toEqual([ANCIENNE]);
  expect(texteVisible(await reponse.text())).toContain(MESSAGE_NOUVEAU_CODE);
});

// --- SC-05h ---

const INTERDITS = [
  "commit",
  "branche",
  "build",
  "déploiement",
  "deploiement",
  "serveur",
  "token",
  "jeton",
  "hash",
  "empreinte",
  "sha",
  "http",
  "api",
  "json",
  "sql",
  "d1",
  "base de données",
  "cookie",
  "session",
  "erreur 4",
  "401",
  "403",
  "429",
  "exception",
  "stack",
  "worker",
  "repository",
  "pull request",
];

function termesInterdits(texte: string): string[] {
  const bas = texte.toLowerCase();
  return INTERDITS.filter((terme) => new RegExp(`(^|[^\\p{L}\\d])${terme}([^\\p{L}\\d]|$)`, "u").test(bas));
}

it("SC-05h — l'écran, chacune de ses étapes et chacun de ses refus ne portent aucun terme de développeur (FR-117)", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  const ecrans: { nom: string; texte: string }[] = [];
  const noter = async (nom: string, reponse: Response): Promise<string> => {
    const texte = texteVisible(await reponse.text());
    ecrans.push({ nom, texte });
    return texte;
  };

  await noter("repos", await lireEcran(cookie));
  await noter("refus : forme", await proposer(cookie, "pas-une-adresse"));
  await noter("refus : déjà en place", await proposer(cookie, ANCIENNE));
  await noter("proposition", await proposer(cookie, NOUVELLE));
  await noter("clic pas encore enregistré", await verifier(cookie));
  double.verifier(NOUVELLE);
  const etapeCode = await noter("étape du code", await verifier(cookie));
  // Le code engendré est aléatoire : on le remplace par CODE (même ligne, même session) pour le recopier.
  const sel = "sel-de-test-0123456789abcdef";
  await db
    .prepare("update codes_remplacement set empreinte = ?1, sel = ?2")
    .bind(await sha256Hex(`${sel}:${CODE}`), sel)
    .run();
  const retaper = await noter("refus : retaper", await recopier(cookie, FAUTIFS[0] ?? ""));
  for (const faute of FAUTIFS.slice(1)) {
    await recopier(cookie, faute);
  }
  const brule = await noter("refus : code brûlé", await recopier(cookie, CODE));
  const succes = await (async () => {
    await db.prepare("update codes_remplacement set essais = 0").run();
    return noter("remplacement abouti", await recopier(cookie, CODE));
  })();
  double.panne = { mode: "cinq-cent-deux" };
  await noter("changement échoué", await proposer(cookie, SECONDE));

  expect(etapeCode).toContain("Recopiez-le ici");
  expect(retaper).toContain(MESSAGE_RETAPER);
  expect(brule).toContain(MESSAGE_NOUVEAU_CODE);
  expect(succes).toContain("C'est fait");
  for (const { nom, texte } of ecrans) {
    expect(termesInterdits(texte), nom).toEqual([]);
  }
});
