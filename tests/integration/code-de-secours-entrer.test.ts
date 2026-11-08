/**
 * Ticket 02 (016) — Entrer par le code de secours
 * (openspec/changes/016-moyen-de-reprise/tickets/02-entrer-par-le-code-de-secours.md),
 * ADR-0032, ADR-0007, ADR-0011.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec la vraie D1 locale. Le code de secours est
 * semé par son empreinte (SHA-256 hexadécimal du code normalisé, rejouée ici)
 * pour connaître d'avance les signes. Seule la liaison d'envoi est espionnée.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, assert, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const NOM_COOKIE_APPAREIL = "identifiant-appareil";
const CLE_LIAISON_EXPEDITION = "EXPEDITEUR_CODE_CONNEXION";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/reprise";
const UN_JOUR_MS = 24 * 60 * 60 * 1000;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

// Vingt-six signes de l'alphabet, avec 0, 1 et V pour éprouver les confusables.
const CODE = "0123456789ABCDEFGHJKMNPQRV";
const CODE_GROUPE = "0123-4567-89AB-CDEF-GHJK-MNPQ-RV";

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
    const sessions = await import("../../migrations/0003_sessions.sql?raw");
    const secours = await import("../../migrations/0016_code_de_secours.sql?raw");
    for (const requete of [
      ...separerRequetes(sessions.default),
      ...separerRequetes(secours.default),
    ]) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare("alter table sessions add column dernier_usage_le integer").run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  await db.prepare("delete from sessions").run();
  await db.prepare("delete from code_de_secours").run();
  Reflect.deleteProperty(env, CLE_LIAISON_EXPEDITION);
});

async function empreinte(code: string): Promise<string> {
  const condense = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(condense), (o) => o.toString(16).padStart(2, "0")).join("");
}

async function mettreCodeEnPlace(db: DBLike): Promise<void> {
  await db
    .prepare("insert into code_de_secours (id, empreinte, cree_le) values (1, ?1, ?2)")
    .bind(await empreinte(CODE), Date.now())
    .run();
}

function poserEspionDEnvoi(echec: boolean): { appels: () => number } {
  let appels = 0;
  (env as unknown as Record<string, unknown>)[CLE_LIAISON_EXPEDITION] = {
    send: async () => {
      appels += 1;
      if (echec) throw new Error("envoi impossible");
    },
  };
  return { appels: () => appels };
}

function presenter(saisie: string, cookieAppareil?: string): Promise<Response> {
  const headers: Record<string, string> = {
    origin: ORIGINE,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (cookieAppareil !== undefined) headers.cookie = `${NOM_COOKIE_APPAREIL}=${cookieAppareil}`;
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      method: "POST",
      redirect: "manual",
      headers,
      body: `code=${encodeURIComponent(saisie)}`,
    }),
  );
}

function enteteCookie(reponse: Response, nom: string): string | null {
  return reponse.headers.getSetCookie().find((e) => e.startsWith(`${nom}=`)) ?? null;
}

function valeurCookie(reponse: Response, nom: string): string | null {
  const entete = enteteCookie(reponse, nom);
  return entete === null ? null : (entete.split(";")[0].split("=")[1] ?? null);
}

function accederGarde(jeton: string | null): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/mes-pages`, {
      redirect: "manual",
      headers: jeton === null ? {} : { cookie: `${NOM_COOKIE_SESSION}=${jeton}` },
    }),
  );
}

async function ouvre(reponse: Response): Promise<string> {
  expect(reponse.status).toBe(200);
  const jeton = valeurCookie(reponse, NOM_COOKIE_SESSION);
  assert(jeton !== null, "aucun cookie de session posé");
  expect((await accederGarde(jeton)).status).toBe(200);
  return jeton;
}

const TERMES_DEVELOPPEUR = [
  "commit",
  "branche",
  "build",
  "déploiement",
  "déployer",
  "repository",
  "dépôt git",
  "endpoint",
  "webhook",
  "backend",
  "front-end",
  "framework",
  "token",
  "jeton",
  "session id",
  "cookie",
  "hash",
  "empreinte",
  "sha",
];

// --- SC-02a ---

it("SC-02a — le code de secours en place ouvre une session et la liaison d'envoi n'est jamais appelée", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const espion = poserEspionDEnvoi(false);

  const reponse = await presenter(CODE, "appareil-connu");

  await ouvre(reponse);
  expect(espion.appels()).toBe(0);
});

// --- SC-02b ---

it("SC-02b — depuis un appareil sans identifiant ni session, le code de secours ouvre une session", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const reponse = await presenter(CODE);

  await ouvre(reponse);
});

// --- SC-02c ---

it("SC-02c — liaison d'envoi en échec, le code de secours en place ouvre une session", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const espion = poserEspionDEnvoi(true);

  const reponse = await presenter(CODE, "appareil-connu");

  await ouvre(reponse);
  expect(espion.appels()).toBe(0);
});

// --- SC-02d ---

const SAISIES = [
  { forme: "en minuscules", saisie: CODE.toLowerCase() },
  { forme: "avec des espaces", saisie: CODE_GROUPE.replace(/-/g, " ") },
  { forme: "avec des tirets", saisie: CODE_GROUPE },
  { forme: "avec un O pour 0", saisie: CODE.replace("0", "O") },
  { forme: "avec un I pour 1", saisie: CODE.replace("1", "I") },
  { forme: "avec un L pour 1", saisie: CODE.replace("1", "L") },
  { forme: "avec un U pour V", saisie: CODE.replace("V", "U") },
];

it.each(SAISIES)("SC-02d — un code saisi $forme est reconnu", async ({ saisie }) => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const reponse = await presenter(saisie, "appareil-connu");

  await ouvre(reponse);
});

async function compterSessions(db: DBLike): Promise<number> {
  const { results } = await db.prepare("select count(*) as n from sessions").all();
  return Number(results[0].n);
}

async function verifierRefus(reponse: Response, db: DBLike): Promise<void> {
  expect(reponse.status).toBe(200);
  expect(enteteCookie(reponse, NOM_COOKIE_SESSION)).toBeNull();
  expect(await compterSessions(db)).toBe(0);
  expect(await reponse.text()).toMatch(/<form[^>]*method="post"/i);
}

it("SC-02d — un code faux d'un seul signe n'est pas reconnu : aucune session, écran de saisie", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const reponse = await presenter(CODE.replace("R", "S"), "appareil-connu");

  await verifierRefus(reponse, db);
});

it("SC-02d — sans code de secours en place, aucune saisie n'ouvre de session", async () => {
  const db = await assurerSchema();

  const reponse = await presenter(CODE, "appareil-connu");

  await verifierRefus(reponse, db);
});

// --- SC-02e ---

it("SC-02e — le cookie porte __Host-, HttpOnly, Secure, SameSite=Strict, Path=/ et une valeur opaque", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const reponse = await presenter(CODE, "appareil-connu");

  const entete = enteteCookie(reponse, NOM_COOKIE_SESSION);
  assert(entete !== null, "aucun cookie de session posé");
  const minuscules = entete.toLowerCase();
  expect(minuscules).toContain("httponly");
  expect(minuscules).toContain("secure");
  expect(minuscules).toContain("samesite=strict");
  expect(minuscules).toContain("path=/");
  expect(minuscules).not.toContain("domain=");
  const brut = valeurCookie(reponse, NOM_COOKIE_SESSION);
  assert(brut !== null, "aucune valeur de cookie");
  expect(brut).not.toContain("appareil-connu");
  expect(brut.toUpperCase()).not.toContain(CODE);
  expect(brut.length).toBeGreaterThanOrEqual(16);
  expect(() => JSON.parse(brut)).toThrow();
});

it("SC-02e — la session se ferme après sept jours sans usage", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const jeton = await ouvre(await presenter(CODE, "appareil-connu"));
  const maintenant = Date.now();

  await db
    .prepare("update sessions set creee_le = ?2, dernier_usage_le = ?3 where id = ?1")
    .bind(jeton, maintenant - 8 * UN_JOUR_MS, maintenant - 8 * UN_JOUR_MS)
    .run();

  const reponse = await accederGarde(jeton);
  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(reponse.headers.get("location")).toContain("/admin/connexion");
});

it("SC-02e — la session se ferme après trente jours quoi qu'il arrive", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const jeton = await ouvre(await presenter(CODE, "appareil-connu"));
  const maintenant = Date.now();

  await db
    .prepare("update sessions set creee_le = ?2, dernier_usage_le = ?3 where id = ?1")
    .bind(jeton, maintenant - 31 * UN_JOUR_MS, maintenant)
    .run();

  const reponse = await accederGarde(jeton);
  expect(REDIRECT_STATUSES).toContain(reponse.status);
  expect(reponse.headers.get("location")).toContain("/admin/connexion");
});

// --- SC-02f ---

it("SC-02f — l'écran de connexion porte un lien vers l'écran de saisie du code de secours", async () => {
  const reponse = await exports.default.fetch(new Request(`${ORIGINE}/admin/connexion`));
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  expect(corps).toMatch(/<a[^>]*href="\/admin\/reprise\/?"/);
});

it("SC-02f — aucun terme de développeur sur l'écran de connexion ni sur celui du code de secours", async () => {
  await assurerSchema();
  const connexion = await exports.default.fetch(new Request(`${ORIGINE}/admin/connexion`));
  const reprise = await exports.default.fetch(new Request(`${ORIGINE}${ROUTE}`));
  expect(reprise.status).toBe(200);
  expect(await reprise.clone().text()).toMatch(/<form[^>]*method="post"/i);

  for (const reponse of [connexion, reprise]) {
    const texte = (await reponse.text())
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^<>]*>/g, " ")
      .toLowerCase();
    for (const terme of TERMES_DEVELOPPEUR) {
      expect(texte, `ne devrait pas contenir « ${terme} »`).not.toContain(terme);
    }
  }
});
