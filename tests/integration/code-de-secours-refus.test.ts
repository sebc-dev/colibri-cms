/**
 * Ticket 04 (016) — Le refus du code de secours ne dit rien de la cause
 * (openspec/changes/016-moyen-de-reprise/tickets/04-le-refus-ne-dit-rien-de-la-cause.md),
 * ADR-0032, FR-117.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec la vraie D1 locale.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, assert, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const NOM_COOKIE_APPAREIL = "identifiant-appareil";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/reprise";
const ROUTE_CREATION = "/admin/code-de-secours";
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const TEXTE_REFUS = "Ce code n'a pas permis d'entrer. Vérifiez chaque signe, puis réessayez.";

// Vingt-six signes de l'alphabet de secours.
const CODE = "0123456789ABCDEFGHJKMNPQRV";
const CODE_FAUX = "ZZZZZZZZZZZZZZZZZZZZZZZZZZ";

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

async function empreinteEnBase(db: DBLike): Promise<string | null> {
  const { results } = await db.prepare("select empreinte from code_de_secours where id = 1").all();
  return results.length === 0 ? null : String(results[0].empreinte);
}

async function lireIdsDeSessions(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select id from sessions").all();
  return results.map((ligne) => String(ligne.id));
}

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-secours-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
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

/** Crée (ou remplace) le code par le geste de l'éditrice et rend le code affiché. */
async function creerParLeGeste(cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE_CREATION}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `${NOM_COOKIE_SESSION}=${cookie}`,
      },
      body: "",
    }),
  );
  expect(reponse.status).toBe(200);
  const m = /((?:[0-9A-HJKMNP-TV-Z]{4}\s){6}[0-9A-HJKMNP-TV-Z]{2})/.exec(
    texteVisible(await reponse.text()),
  );
  assert(m !== null, "code affiché introuvable");
  return m[1].replace(/\s/g, "");
}

function enteteCookie(reponse: Response, nom: string): string | null {
  return reponse.headers.getSetCookie().find((e) => e.startsWith(`${nom}=`)) ?? null;
}

function valeurCookie(reponse: Response, nom: string): string | null {
  const entete = enteteCookie(reponse, nom);
  return entete === null ? null : (entete.split(";")[0].split("=")[1] ?? null);
}

function texteVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^<>]*>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

/** Liste des en-têtes, cookies d'appareil et date exclus. */
function enTetes(reponse: Response): [string, string][] {
  const liste: [string, string][] = [];
  reponse.headers.forEach((valeur, nom) => {
    if (nom === "date" || nom === "set-cookie") return;
    liste.push([nom, valeur]);
  });
  for (const cookie of reponse.headers.getSetCookie()) {
    if (!cookie.startsWith(`${NOM_COOKIE_APPAREIL}=`)) liste.push(["set-cookie", cookie]);
  }
  return liste.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
}

async function sessionOuverte(jeton: string): Promise<boolean> {
  const reponse = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/mes-pages`, {
      redirect: "manual",
      headers: { cookie: `${NOM_COOKIE_SESSION}=${jeton}` },
    }),
  );
  return reponse.status === 200;
}

// --- SC-04a ---

it("SC-04a — un code qui n'est pas le code en place n'ouvre aucune session et l'écran invite à vérifier la recopie", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const avant = await empreinteEnBase(db);

  const reponse = await presenter(CODE_FAUX, "appareil-un");

  expect(enteteCookie(reponse, NOM_COOKIE_SESSION)).toBeNull();
  expect(REDIRECT_STATUSES).not.toContain(reponse.status);
  expect(await lireIdsDeSessions(db)).toEqual([]);
  expect(await empreinteEnBase(db)).toBe(avant);
  expect(texteVisible(await reponse.text())).toContain(TEXTE_REFUS);
});

// --- SC-04b ---

it("SC-04b — code faux, déjà servi, remplacé, ou sans code en place : même texte, même statut, mêmes en-têtes", async () => {
  const db = await assurerSchema();
  const reponses: { nom: string; reponse: Response }[] = [];

  // Sans code en place.
  reponses.push({ nom: "sans code", reponse: await presenter(CODE, "appareil-a") });

  // Code faux (un code est en place).
  await mettreCodeEnPlace(db);
  reponses.push({ nom: "faux", reponse: await presenter(CODE_FAUX, "appareil-a") });

  // Code déjà servi : il a ouvert une session, puis il est présenté de nouveau.
  const entree = await presenter(CODE, "appareil-a");
  expect(valeurCookie(entree, NOM_COOKIE_SESSION)).not.toBeNull();
  reponses.push({ nom: "déjà servi", reponse: await presenter(CODE, "appareil-a") });

  // Code remplacé : deux créations successives, le premier code est présenté.
  await db.prepare("delete from sessions").run();
  await db.prepare("delete from code_de_secours").run();
  const cookie = await semerSessionValide(db);
  const premier = await creerParLeGeste(cookie);
  const second = await creerParLeGeste(cookie);
  expect(second).not.toBe(premier);
  reponses.push({ nom: "remplacé", reponse: await presenter(premier, "appareil-a") });

  const references = reponses[0];
  const texteReference = texteVisible(await references.reponse.clone().text());
  expect(texteReference).toContain(TEXTE_REFUS);
  for (const { nom, reponse } of reponses) {
    expect(reponse.status, nom).toBe(references.reponse.status);
    expect(texteVisible(await reponse.text()), nom).toBe(texteReference);
    expect(enTetes(reponse), nom).toEqual(enTetes(references.reponse));
  }
});

// --- SC-04c ---

it("SC-04c — dix codes faux puis le code en place : le code en place ouvre une session", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  for (let i = 0; i < 10; i += 1) {
    const faux = `${String(i).padStart(2, "0")}${"Z".repeat(24)}`;
    const refus = await presenter(faux, "appareil-un");
    expect(enteteCookie(refus, NOM_COOKIE_SESSION)).toBeNull();
    expect(texteVisible(await refus.text())).toContain(TEXTE_REFUS);
  }
  expect(await empreinteEnBase(db)).toBe(await empreinte(CODE));

  const reponse = await presenter(CODE, "appareil-un");

  expect(reponse.status).toBe(200);
  const jeton = valeurCookie(reponse, NOM_COOKIE_SESSION);
  assert(jeton !== null, "aucun cookie de session posé");
  expect(await sessionOuverte(jeton)).toBe(true);
});

// --- SC-04d ---

it("SC-04d — l'écran du refus ne porte aucun terme de développeur (FR-117)", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const reponse = await presenter(CODE_FAUX, "appareil-un");
  const texte = texteVisible(await reponse.text()).toLowerCase();

  expect(texte).toContain("n'a pas permis d'entrer");
  const interdits = [
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
  ];
  for (const terme of interdits) {
    expect(new RegExp(`(^|[^\\p{L}\\d])${terme}([^\\p{L}\\d]|$)`, "u").test(texte), terme).toBe(false);
  }
});
