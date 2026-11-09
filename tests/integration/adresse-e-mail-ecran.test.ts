/**
 * Ticket 01 (017) — L'écran « Adresse e-mail » montre l'adresse en place et
 * dit quand le remplacement n'est pas possible
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/01-ecran-adresse-e-mail.md),
 * ADR-0033.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec la vraie D1 locale.
 *
 * Configuration « remplacement possible » (SC-01c) : le test pose lui-même la
 * clé `JETON_ADRESSES_EMAIL` dans l'objet `env` partagé de `cloudflare:workers`
 * (la page doit la lire à la requête, depuis `env`). L'identifiant de compte
 * est une valeur de construction (`compteCloudflare` d'`instance.json`, injecté
 * en `__COMPTE_CLOUDFLARE__`) : l'implémenteur doit donc renseigner un
 * `compteCloudflare` de test (32 hex) dans `instance.json`. Configuration
 * « impossible » (SC-01d) : le test retire la clé. Le cas « sans compte » ne
 * varie pas à l'exécution ; il est couvert à l'unité
 * (`remplacement-possible.test.ts`).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, beforeEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/adresse-e-mail";
const ADRESSE = "editrice@exemple.fr";
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

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
  })();
  await schemaPret;
  return db;
}

const CLE_DE_TEST = "jeton-adresses-de-test";

function cleDeLEnv(): { JETON_ADRESSES_EMAIL?: string } {
  return env;
}

function poserLaCle(): void {
  cleDeLEnv().JETON_ADRESSES_EMAIL = CLE_DE_TEST;
}

function retirerLaCle(): void {
  delete cleDeLEnv().JETON_ADRESSES_EMAIL;
}

// Par défaut : remplacement possible (clé posée) ; SC-01d la retire.
beforeEach(poserLaCle);

afterEach(async () => {
  poserLaCle();
  const db = obtenirDB();
  await db.prepare("delete from sessions").run();
  await db.prepare("delete from adresses_autorisees").run();
});

async function semerAdresse(db: DBLike): Promise<void> {
  await db.prepare("insert into adresses_autorisees (adresse) values (?1)").bind(ADRESSE).run();
}

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-adresse-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function adressesEnBase(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

function obtenir(route: string, cookie?: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${route}`, {
      redirect: "manual",
      headers: cookie === undefined ? {} : { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

function proposer(cookie: string | undefined, adresse: string): Promise<Response> {
  const headers: Record<string, string> = {
    Origin: ORIGINE,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (cookie !== undefined) headers.cookie = `${NOM_COOKIE_SESSION}=${cookie}`;
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      method: "POST",
      redirect: "manual",
      headers,
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
    .replace(/\s+/g, " ");
}

// --- SC-01a ---

it("SC-01a — l'écran demandé sans session, en GET comme en POST, renvoie vers la connexion et n'écrit rien", async () => {
  const db = await assurerSchema();
  await semerAdresse(db);

  const get = await obtenir(ROUTE);
  const post = await proposer(undefined, "nouvelle@exemple.fr");

  for (const reponse of [get, post]) {
    expect(REDIRECT_STATUSES).toContain(reponse.status);
    expect(reponse.headers.get("location")).toContain("/admin/connexion");
  }
  expect(await adressesEnBase(db)).toEqual([ADRESSE]);
});

// --- SC-01b ---

it("SC-01b — l'écran Réglages porte un lien vers l'écran « Adresse e-mail »", async () => {
  const db = await assurerSchema();
  await semerAdresse(db);
  const cookie = await semerSessionValide(db);

  const reponse = await obtenir("/admin/reglages", cookie);

  expect(reponse.status).toBe(200);
  expect(await reponse.text()).toMatch(/<a [^>]*href="\/admin\/adresse-e-mail"/);
});

// --- SC-01c ---

it("SC-01c — avec une session, l'écran montre l'adresse en place et un champ pour proposer une nouvelle adresse", async () => {
  const db = await assurerSchema();
  await semerAdresse(db);
  const cookie = await semerSessionValide(db);

  const reponse = await obtenir(ROUTE, cookie);

  expect(reponse.status).toBe(200);
  const html = await reponse.text();
  const texte = texteVisible(html);
  expect(texte).toContain(ADRESSE);
  expect(texte).toContain("Nouvelle adresse");
  expect(texte).toContain("Changer d'adresse");
  expect(html).toMatch(/<input[^>]*name="adresse"/);
  expect(texte.toLowerCase()).not.toContain("adresse autorisée");
});

// --- SC-01d ---

it("SC-01d — sans clé, l'écran montre l'adresse en place et dit que le remplacement n'est pas possible, sans formulaire", async () => {
  const db = await assurerSchema();
  await semerAdresse(db);
  const cookie = await semerSessionValide(db);
  retirerLaCle();

  const reponse = await obtenir(ROUTE, cookie);

  expect(reponse.status).toBe(200);
  const html = await reponse.text();
  expect(texteVisible(html)).toContain(
    `Le changement d'adresse n'est pas possible pour le moment. Votre adresse reste ${ADRESSE}.`,
  );
  expect(html).not.toMatch(/<input[^>]*name="adresse"/);
  expect(texteVisible(html)).not.toContain("Changer d'adresse");
});

it("SC-01d — sans clé, une proposition d'adresse est refusée sans rien écrire", async () => {
  const db = await assurerSchema();
  await semerAdresse(db);
  const cookie = await semerSessionValide(db);
  retirerLaCle();

  const reponse = await proposer(cookie, "nouvelle@exemple.fr");

  expect(reponse.status).toBeLessThan(500);
  expect(await adressesEnBase(db)).toEqual([ADRESSE]);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain("n'est pas possible pour le moment");
  expect(texte).toContain(ADRESSE);
});

it("SC-01d — avec la clé, une proposition ne produit encore ni inscription ni changement d'adresse en place", async () => {
  const db = await assurerSchema();
  await semerAdresse(db);
  const cookie = await semerSessionValide(db);

  const reponse = await proposer(cookie, "nouvelle@exemple.fr");

  expect(reponse.status).toBeLessThan(500);
  expect(await adressesEnBase(db)).toEqual([ADRESSE]);
  expect(texteVisible(await reponse.text())).toContain(ADRESSE);
});
