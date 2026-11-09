/**
 * Ticket 06 (016) — Remplacer le code de secours
 * (openspec/changes/016-moyen-de-reprise/tickets/06-remplacer-le-code-de-secours.md),
 * ADR-0001, ADR-0011, ADR-0032.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec la vraie D1 locale et des sessions semées.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, assert, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/code-de-secours";
const ROUTE_REPRISE = "/admin/reprise";
const DEVELOPPEUR =
  /\b(commit|branche|build|déploiement|deploiement|github|dépôt|depot|token|jeton|api|git|session|sessions|hash|haché|sha|base de données)\b/i;

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

async function semerSession(db: DBLike, appareil = "appareil-de-test"): Promise<string> {
  const id = `session-remplacer-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, appareil, maintenant, maintenant)
    .run();
  return id;
}

async function empreinte(code: string): Promise<string> {
  const condense = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(condense), (o) => o.toString(16).padStart(2, "0")).join("");
}

async function empreinteEnBase(db: DBLike): Promise<string | null> {
  const { results } = await db.prepare("select empreinte from code_de_secours where id = 1").all();
  return results.length === 0 ? null : String(results[0].empreinte);
}

async function idsDeSessions(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select id from sessions").all();
  return results.map((ligne) => String(ligne.id)).sort((a, b) => a.localeCompare(b));
}

function acceder(chemin: string, jeton: string | null): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${chemin}`, {
      redirect: "manual",
      headers: jeton === null ? {} : { cookie: `${NOM_COOKIE_SESSION}=${jeton}` },
    }),
  );
}

function poster(jeton: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: ORIGINE,
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `${NOM_COOKIE_SESSION}=${jeton}`,
      },
      body: "",
    }),
  );
}

function presenter(saisie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE_REPRISE}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        origin: ORIGINE,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `code=${encodeURIComponent(saisie)}`,
    }),
  );
}

function valeurCookie(reponse: Response, nom: string): string | null {
  const entete = reponse.headers.getSetCookie().find((e) => e.startsWith(`${nom}=`));
  return entete === undefined ? null : (entete.split(";")[0].split("=")[1] ?? null);
}

async function sessionOuverte(jeton: string): Promise<boolean> {
  return (await acceder("/admin/mes-pages", jeton)).status === 200;
}

function extraireMain(corps: string): string {
  const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps);
  if (m === null) throw new Error("main absent");
  return m[1];
}

function texteVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^<>]*>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

/** Le code affiché, sans espaces : vingt-six signes. */
function extraireCode(corps: string): string {
  const m = /((?:[0-9A-HJKMNP-TV-Z]{4}\s){6}[0-9A-HJKMNP-TV-Z]{2})/.exec(texteVisible(corps));
  if (m === null) throw new Error("code affiché introuvable");
  return m[1].replace(/\s/g, "");
}

/** Crée un code via l'écran, depuis la session donnée, et le rend. */
async function creerCode(jeton: string): Promise<string> {
  const reponse = await poster(jeton);
  expect(reponse.status).toBe(200);
  return extraireCode(await reponse.text());
}

// --- SC-06a ---

it("SC-06a — la demande de remplacement affiche une confirmation et ne change rien tant qu'elle n'est pas confirmée", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  const ancien = await creerCode(courante);
  // Semée après la création : créer le code ferme les autres sessions (SC-06g).
  const autre = await semerSession(db, "autre-appareil");
  const avant = await empreinteEnBase(db);
  const sessionsAvant = await idsDeSessions(db);

  const reponse = await acceder(`${ROUTE}?remplacer`, courante);

  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const main = extraireMain(corps);
  const texte = texteVisible(main);
  expect(texte).toContain("Remplacer le code de secours ?");
  expect(texte).toMatch(/ancien code/i);
  expect(texte).toMatch(/ne (?:permettra|servira) plus|cessera/i);
  expect(texte).toContain("Les autres appareils connectés devront se reconnecter.");
  expect(main).toMatch(/<form[^>]*method="post"/i);
  expect(texte).toContain("Remplacer");
  expect(main).toMatch(/<a[^>]*>\s*Annuler\s*<\/a>/);
  expect(corps).not.toContain(ancien);

  expect(await empreinteEnBase(db)).toBe(avant);
  expect(await idsDeSessions(db)).toEqual(sessionsAvant);
  expect(await sessionOuverte(autre)).toBe(true);
});

// --- SC-06b ---

it("SC-06b — après confirmation, l'ancien code n'ouvre pas de session et le nouveau en ouvre une", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  const ancien = await creerCode(courante);
  const nouveau = await creerCode(courante);
  expect(nouveau).not.toBe(ancien);
  const avant = await idsDeSessions(db);

  const refus = await presenter(ancien);
  expect(valeurCookie(refus, NOM_COOKIE_SESSION)).toBeNull();
  expect(await idsDeSessions(db)).toEqual(avant);
  expect(await empreinteEnBase(db)).toBe(await empreinte(nouveau));

  const accepte = await presenter(nouveau);
  expect(accepte.status).toBe(200);
  const jeton = valeurCookie(accepte, NOM_COOKIE_SESSION);
  assert(jeton !== null, "le nouveau code devait ouvrir une session");
  expect(await sessionOuverte(jeton)).toBe(true);
});

// --- SC-06c ---

it("SC-06c — remplacer le code ferme la session d'un autre appareil et garde celle de l'éditrice", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  await creerCode(courante);
  // Semée après la création : créer le code ferme les autres sessions (SC-06g).
  const autre = await semerSession(db, "autre-appareil");
  expect(await sessionOuverte(autre)).toBe(true);

  await creerCode(courante);

  expect(await sessionOuverte(autre)).toBe(false);
  expect(await sessionOuverte(courante)).toBe(true);
});

// --- SC-06d ---

it("SC-06d — quand un code en remplace un autre, seul le dernier ouvre une session", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  const premier = await creerCode(courante);
  const second = await creerCode(courante);
  const troisieme = await creerCode(courante);

  for (const perime of [premier, second]) {
    expect(valeurCookie(await presenter(perime), NOM_COOKIE_SESSION)).toBeNull();
  }
  expect(valeurCookie(await presenter(troisieme), NOM_COOKIE_SESSION)).not.toBeNull();
});

// --- SC-06e ---

it("SC-06e — l'écran, la confirmation et l'affichage du nouveau code ne portent aucun terme de développeur", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);

  const vide = await acceder(ROUTE, courante);
  const creation = await poster(courante);
  const enPlace = await acceder(ROUTE, courante);
  const confirmation = await acceder(`${ROUTE}?remplacer`, courante);
  const remplacement = await poster(courante);

  const pages = [vide, creation, enPlace, confirmation, remplacement];
  for (const page of pages) expect(page.status).toBe(200);
  const confirmationTexte = texteVisible(extraireMain(await confirmation.text()));
  expect(confirmationTexte).toContain("Remplacer le code de secours ?");
  for (const page of [vide, creation, enPlace, remplacement]) {
    const texte = texteVisible(extraireMain(await page.text()));
    expect(texte).not.toMatch(DEVELOPPEUR);
  }
  expect(confirmationTexte).not.toMatch(DEVELOPPEUR);
});

// --- SC-06f ---

it("SC-06f — sans création, remplacement ni emploi du code, les sessions coexistent sans être comptées ni fermées", async () => {
  const db = await assurerSchema();
  const sessions = [
    await semerSession(db, "appareil-un"),
    await semerSession(db, "appareil-deux"),
    await semerSession(db, "appareil-trois"),
  ];
  await db
    .prepare("insert into code_de_secours (id, empreinte, cree_le) values (1, ?1, ?2)")
    .bind(await empreinte("0123456789ABCDEFGHJKMNPQRV"), Date.now())
    .run();
  const avant = await idsDeSessions(db);

  for (const jeton of sessions) {
    expect((await acceder(ROUTE, jeton)).status).toBe(200);
    expect((await acceder(`${ROUTE}?remplacer`, jeton)).status).toBe(200);
    expect(await sessionOuverte(jeton)).toBe(true);
  }
  await presenter("ZZZZZZZZZZZZZZZZZZZZZZZZZZ");

  expect(await idsDeSessions(db)).toEqual(avant);
  for (const jeton of sessions) expect(await sessionOuverte(jeton)).toBe(true);
});

// --- SC-06g ---

it("SC-06g — créer le code ferme les autres sessions et garde celle qui a fait le geste", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  const autres = [await semerSession(db, "a"), await semerSession(db, "b")];

  await creerCode(courante);

  expect(await idsDeSessions(db)).toEqual([courante]);
  expect(await sessionOuverte(courante)).toBe(true);
  for (const jeton of autres) expect(await sessionOuverte(jeton)).toBe(false);
});

it("SC-06g — remplacer le code ferme les autres sessions et garde celle qui a fait le geste", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  await creerCode(courante);
  const autres = [await semerSession(db, "a"), await semerSession(db, "b")];

  await creerCode(courante);

  expect(await idsDeSessions(db)).toEqual([courante]);
  expect(await sessionOuverte(courante)).toBe(true);
  for (const jeton of autres) expect(await sessionOuverte(jeton)).toBe(false);
});

it("SC-06g — employer le code ferme les autres sessions et ne garde que celle qu'il vient d'ouvrir", async () => {
  const db = await assurerSchema();
  const courante = await semerSession(db);
  const code = await creerCode(courante);
  const autres = [courante, await semerSession(db, "a"), await semerSession(db, "b")];

  const reponse = await presenter(code);
  expect(reponse.status).toBe(200);
  const jeton = valeurCookie(reponse, NOM_COOKIE_SESSION);
  assert(jeton !== null, "le code devait ouvrir une session");

  expect(await idsDeSessions(db)).toEqual([jeton]);
  expect(await sessionOuverte(jeton)).toBe(true);
  for (const ancienne of autres) expect(await sessionOuverte(ancienne)).toBe(false);
});
