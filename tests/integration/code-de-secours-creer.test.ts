/**
 * Ticket 01 (016) — Créer le code de secours depuis l'administration et le
 * voir une seule fois
 * (openspec/changes/016-moyen-de-reprise/tickets/01-creer-le-code-de-secours.md),
 * ADR-0032, ADR-0007, ADR-0011.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec une session semée en D1 et la vraie D1
 * locale (même patron que `ecran-reglages.test.ts`). La table
 * `code_de_secours` est créée par le module lui-même (création défensive).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const ORIGINE = "https://example.com";
const ROUTE = "/admin/code-de-secours";

interface ResultatLike {
  results: Record<string, unknown>[];
}
interface InstructionLike {
  bind(...valeurs: unknown[]): InstructionLike;
  run(): Promise<unknown>;
  all(): Promise<ResultatLike>;
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
    const module = await import("../../migrations/0003_sessions.sql?raw");
    for (const requete of separerRequetes(module.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db
        .prepare("alter table sessions add column dernier_usage_le integer")
        .run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

async function viderCode(db: DBLike): Promise<void> {
  try {
    await db.prepare("delete from code_de_secours").run();
  } catch {
    // table pas encore créée : rien à vider.
  }
}

afterEach(async () => {
  const db = obtenirDB();
  await db.prepare("delete from sessions").run();
  await viderCode(db);
});

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

function acceder(route: string, cookie?: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${route}`, {
      redirect: "manual",
      headers: cookie === undefined ? {} : { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

function creer(cookie?: string): Promise<Response> {
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
      body: "",
    }),
  );
}

async function lignesDuCode(db: DBLike): Promise<Record<string, unknown>[]> {
  try {
    return (await db.prepare("select * from code_de_secours").all()).results;
  } catch {
    return [];
  }
}

function extraireMain(corps: string): string {
  const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps);
  if (m === null) throw new Error("main absent");
  return m[1];
}

function texteVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^<>]*>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

/** Le code affiché : vingt-six signes en groupes de quatre séparés d'espaces. */
function extraireCodeAffiche(corps: string): string {
  const m = /((?:[0-9A-HJKMNP-TV-Z]{4}\s){6}[0-9A-HJKMNP-TV-Z]{2})/.exec(
    texteVisible(corps),
  );
  if (m === null) throw new Error("code affiché introuvable");
  return m[1];
}

// --- SC-01a ---

it("SC-01a — sans session, l'écran et le geste de création renvoient à la connexion et rien n'est mis en place", async () => {
  const db = await assurerSchema();

  const lecture = await acceder(ROUTE);
  expect(lecture.status).toBeGreaterThanOrEqual(300);
  expect(lecture.status).toBeLessThan(400);
  expect(lecture.headers.get("location")).toContain("/admin/connexion");

  const creation = await creer();
  expect(creation.status).toBeGreaterThanOrEqual(300);
  expect(creation.status).toBeLessThan(400);
  expect(creation.headers.get("location")).toContain("/admin/connexion");
  expect(await creation.text()).not.toMatch(/[0-9A-HJKMNP-TV-Z]{4} [0-9A-HJKMNP-TV-Z]{4}/);

  expect(await lignesDuCode(db)).toHaveLength(0);
});

// --- SC-01b ---

it("SC-01b — l'écran Réglages porte un lien vers l'écran « Code de secours »", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);

  const reponse = await acceder("/admin/reglages", cookie);
  expect(reponse.status).toBe(200);
  const main = extraireMain(await reponse.text());
  const lien = /<a[^>]*href="\/admin\/code-de-secours\/?"[^>]*>([\s\S]*?)<\/a>/.exec(main);
  expect(lien, "un lien vers l'écran du code de secours").not.toBeNull();
  expect(texteVisible(lien?.[1] ?? "")).toContain("Code de secours");
});

// --- SC-01c ---

it("SC-01c — sans code en place, l'écran dit qu'aucun code n'est en place et offre de le créer", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);

  const reponse = await acceder(ROUTE, cookie);
  expect(reponse.status).toBe(200);
  const main = extraireMain(await reponse.text());
  const texte = texteVisible(main);
  expect(texte).toContain("Aucun code de secours n'est en place.");
  expect(main).toMatch(/<form[^>]*method="post"/i);
  expect(texte).toContain("Créer le code de secours");
});

// --- SC-01d ---

it("SC-01d — avec un code en place, l'écran dit la date de mise en place sans montrer la valeur", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);
  const creation = await creer(cookie);
  expect(creation.status).toBe(200);
  const code = extraireCodeAffiche(await creation.text());

  const reponse = await acceder(ROUTE, cookie);
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const texte = texteVisible(extraireMain(corps));
  expect(texte).toMatch(/Un code de secours est en place depuis le \d{1,2}(?:er)? [a-zéûè]+ \d{4}\./);
  expect(texte).not.toContain("Aucun code de secours n'est en place");
  const brut = code.replace(/\s/g, "");
  expect(corps).not.toContain(code);
  expect(corps).not.toContain(brut);
  expect(corps).not.toMatch(/(?:[0-9A-HJKMNP-TV-Z]{4} ){6}[0-9A-HJKMNP-TV-Z]{2}/);
});

// --- SC-01e ---

it("SC-01e — la création affiche le code, invite à le recopier ou l'imprimer, interdit la conservation, et le retour à l'écran ne le montre plus", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);

  const reponse = await creer(cookie);
  expect(reponse.status).toBe(200);
  expect(reponse.headers.get("cache-control")).toMatch(/no-store/i);
  const corps = await reponse.text();
  const code = extraireCodeAffiche(corps);
  const texte = texteVisible(corps);
  expect(texte).toContain("Votre nouveau code de secours");
  expect(texte).toContain("Recopiez-le ou imprimez cette page");
  expect(texte).toContain("Ce code ne s'affichera plus.");
  expect(texte).toContain("Imprimer");
  expect(texte).toContain("Continuer");

  const retour = await acceder(ROUTE, cookie);
  expect(retour.status).toBe(200);
  const corpsRetour = await retour.text();
  expect(corpsRetour).not.toContain(code);
  expect(corpsRetour).not.toContain(code.replace(/\s/g, ""));
});

// --- SC-01h ---

it("SC-01h — la valeur du code, affichée comme normalisée, ne se trouve dans aucune colonne texte de la base", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);
  const reponse = await creer(cookie);
  expect(reponse.status).toBe(200);
  const affiche = extraireCodeAffiche(await reponse.text());
  const normalise = affiche.replace(/\s/g, "");
  expect(normalise).toHaveLength(26);

  // La ligne existe bien : sinon l'absence de la valeur ne prouve rien.
  expect(await lignesDuCode(db)).toHaveLength(1);

  const tables = (
    await db
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%'",
      )
      .all()
  ).results.map((l) => String(l.name));
  expect(tables).toContain("code_de_secours");

  for (const table of tables) {
    const lignes = (await db.prepare(`select * from "${table}"`).all()).results;
    for (const ligne of lignes) {
      for (const [colonne, valeur] of Object.entries(ligne)) {
        if (typeof valeur !== "string") continue;
        const ou = `${table}.${colonne}`;
        expect(valeur.includes(affiche), ou).toBe(false);
        expect(valeur.includes(normalise), ou).toBe(false);
      }
    }
  }
});

// --- SC-01i ---

it("SC-01i — la création n'écrit que la ligne de code_de_secours et ne touche à aucune autre liaison", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);

  const enveloppe = env as unknown as Record<string, unknown>;
  const avant = Object.entries(enveloppe).filter(([cle]) => cle !== "DB");
  const requetes: string[] = [];
  const original = enveloppe.DB as DBLike & { batch?: unknown };
  enveloppe.DB = new Proxy(original, {
    get(cible, propriete) {
      if (propriete === "prepare") {
        return (query: string) => {
          requetes.push(query);
          return cible.prepare(query);
        };
      }
      const valeur = Reflect.get(cible, propriete) as unknown;
      return typeof valeur === "function" ? valeur.bind(cible) : valeur;
    },
  });
  let reponse: Response;
  try {
    reponse = await creer(cookie);
  } finally {
    enveloppe.DB = original;
  }
  expect(reponse.status).toBe(200);

  const ecritures = requetes.filter((q) => /^\s*(insert|update|delete|replace|create|alter|drop)\b/i.test(q));
  const surLeCode = ecritures.filter((q) => /code_de_secours/i.test(q));
  expect(surLeCode.length).toBeGreaterThan(0);
  const hors = ecritures.filter(
    (q) => !/code_de_secours/i.test(q) && !/\bsessions\b/i.test(q),
  );
  expect(hors).toEqual([]);

  const apres = Object.entries(enveloppe).filter(([cle]) => cle !== "DB");
  expect(apres).toEqual(avant);
  expect(await lignesDuCode(db)).toHaveLength(1);
});
