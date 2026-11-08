/**
 * Ticket 03 (016) — Le code de secours ne sert qu'une fois et se renouvelle à
 * l'emploi
 * (openspec/changes/016-moyen-de-reprise/tickets/03-le-code-ne-sert-qu-une-fois.md),
 * ADR-0032, ADR-0004, ADR-0011.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec la vraie D1 locale. Le code de secours est
 * semé par son empreinte (SHA-256 hexadécimal du code normalisé, rejouée ici).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, assert, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const NOM_COOKIE_APPAREIL = "identifiant-appareil";
const CLE_LIAISON_EXPEDITION = "EXPEDITEUR_CODE_CONNEXION";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/reprise";
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

// Vingt-six signes de l'alphabet de secours.
const CODE = "0123456789ABCDEFGHJKMNPQRV";

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

async function empreinteEnBase(db: DBLike): Promise<string | null> {
  const { results } = await db.prepare("select empreinte from code_de_secours where id = 1").all();
  return results.length === 0 ? null : String(results[0].empreinte);
}

async function lireIdsDeSessions(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select id from sessions").all();
  return results.map((ligne) => String(ligne.id));
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

function acceder(chemin: string, jeton: string | null): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${chemin}`, {
      redirect: "manual",
      headers: jeton === null ? {} : { cookie: `${NOM_COOKIE_SESSION}=${jeton}` },
    }),
  );
}

async function sessionOuverte(jeton: string): Promise<boolean> {
  return (await acceder("/admin/mes-pages", jeton)).status === 200;
}

function texteVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^<>]*>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

/** Le code affiché : vingt-six signes en groupes de quatre séparés d'espaces. */
function extraireCodeAffiche(corps: string): string {
  const m = /((?:[0-9A-HJKMNP-TV-Z]{4}\s){6}[0-9A-HJKMNP-TV-Z]{2})/.exec(texteVisible(corps));
  if (m === null) throw new Error("code affiché introuvable");
  return m[1];
}

/** Entre avec le code et rend jeton, nouveau code (sans espaces) et corps HTML. */
async function entrer(saisie: string, cookieAppareil?: string) {
  const reponse = await presenter(saisie, cookieAppareil);
  expect(reponse.status).toBe(200);
  const jeton = valeurCookie(reponse, NOM_COOKIE_SESSION);
  assert(jeton !== null, "aucun cookie de session posé");
  const corps = await reponse.text();
  return { reponse, jeton, corps, nouveauCode: extraireCodeAffiche(corps).replace(/\s/g, "") };
}

// --- SC-03a ---

it("SC-03a — un code de secours qui a ouvert une session, présenté une seconde fois, n'ouvre aucune session", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  await entrer(CODE, "appareil-un");
  const avant = await lireIdsDeSessions(db);

  const seconde = await presenter(CODE, "appareil-deux");

  expect(enteteCookie(seconde, NOM_COOKIE_SESSION)).toBeNull();
  expect(REDIRECT_STATUSES).not.toContain(seconde.status);
  expect(await lireIdsDeSessions(db)).toEqual(avant);
});

// --- SC-03b ---

it("SC-03b — l'écran affiche un nouveau code, invite à le recopier ou l'imprimer, et le lien d'accueil mène à « Mes pages »", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const { jeton, corps, nouveauCode } = await entrer(CODE, "appareil-un");

  expect(nouveauCode).toHaveLength(26);
  expect(nouveauCode).not.toBe(CODE);
  const texte = texteVisible(corps);
  expect(texte).toContain("Votre nouveau code de secours");
  expect(texte).toContain("Recopiez-le ou imprimez cette page");
  expect(texte).toContain("Les autres appareils connectés devront se reconnecter.");
  const lien = /<a[^>]*href="(\/admin\/?)"[^>]*>/.exec(corps);
  assert(lien !== null, "aucun lien vers l'accueil de l'administration");
  const accueil = await acceder(lien[1], jeton);
  expect(REDIRECT_STATUSES).toContain(accueil.status);
  expect(accueil.headers.get("location")).toContain("/admin/mes-pages");
});

// --- SC-03c ---

it("SC-03c — le nouveau code relevé dans le HTML, présenté plus tard, ouvre une session", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const { nouveauCode } = await entrer(CODE, "appareil-un");

  const plus_tard = await entrer(nouveauCode, "appareil-deux");

  expect(await sessionOuverte(plus_tard.jeton)).toBe(true);
});

// --- SC-03d ---

it("SC-03d — après avoir quitté l'écran du nouveau code, l'écran « Code de secours » ne le montre pas", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const { jeton, nouveauCode } = await entrer(CODE, "appareil-un");

  const ecran = await acceder("/admin/code-de-secours", jeton);

  expect(ecran.status).toBe(200);
  const corps = await ecran.text();
  expect(corps).not.toContain(nouveauCode);
  expect(texteVisible(corps).replace(/\s/g, "")).not.toContain(nouveauCode);
});

// --- SC-03e ---

it("SC-03e — le code ouvre une session sur un second appareil : celle du premier ne donne plus accès, celle du second reste ouverte", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  await db
    .prepare("insert into sessions (id, identifiant_appareil, creee_le) values (?1, ?2, ?3)")
    .bind("a".repeat(64), "appareil-un", Date.now())
    .run();
  expect(await sessionOuverte("a".repeat(64))).toBe(true);

  const { jeton } = await entrer(CODE, "appareil-deux");

  expect(await sessionOuverte("a".repeat(64))).toBe(false);
  expect(await sessionOuverte(jeton)).toBe(true);
});

// --- SC-03f ---

it("SC-03f — la réponse qui affiche le nouveau code porte Cache-Control: no-store et l'adresse ne porte pas le code", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);

  const { reponse, nouveauCode } = await entrer(CODE, "appareil-un");

  expect(reponse.headers.get("cache-control")).toContain("no-store");
  expect(reponse.headers.get("location")).toBeNull();
  expect(reponse.url).not.toContain(nouveauCode);
  expect(reponse.url).not.toContain(CODE);
  expect(new URL(reponse.url, ORIGINE).search).toBe("");
});

// --- SC-03g ---

it("SC-03g — le même code présenté deux fois en même temps : une seule session s'ouvre et un seul nouveau code est mis en place", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  const ancienne = await empreinte(CODE);

  const reponses = await Promise.all([presenter(CODE, "appareil-un"), presenter(CODE, "appareil-deux")]);

  const ouvertes = reponses.filter((r) => enteteCookie(r, NOM_COOKIE_SESSION) !== null);
  expect(ouvertes).toHaveLength(1);
  expect(await lireIdsDeSessions(db)).toHaveLength(1);
  const corps = await ouvertes[0].text();
  const nouveauCode = extraireCodeAffiche(corps).replace(/\s/g, "");
  const enBase = await empreinteEnBase(db);
  expect(enBase).not.toBe(ancienne);
  expect(enBase).toBe(await empreinte(nouveauCode));
  const refusee = reponses.find((r) => r !== ouvertes[0]);
  assert(refusee !== undefined, "une réponse refusée attendue");
  expect(texteVisible(await refusee.text())).not.toContain("Votre nouveau code de secours");
});

// --- SC-03h ---

it("SC-03h — SC-020 : adresse autorisée muette, appareil neuf : session ouverte, nouveau code affiché une fois, accès à la liste des demandes", async () => {
  const db = await assurerSchema();
  await mettreCodeEnPlace(db);
  Reflect.set(env, CLE_LIAISON_EXPEDITION, {
    send: async () => {
      throw new Error("aucun message ne part");
    },
  });

  const { jeton, corps, nouveauCode } = await entrer(CODE);

  expect(texteVisible(corps)).toContain("Votre nouveau code de secours");
  expect(await sessionOuverte(jeton)).toBe(true);
  const demandes = await acceder("/admin/demandes", jeton);
  expect(demandes.status).toBe(200);
  const retour = await acceder("/admin/code-de-secours", jeton);
  expect(await retour.text()).not.toContain(nouveauCode);
});
