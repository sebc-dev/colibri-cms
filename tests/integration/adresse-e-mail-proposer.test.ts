/**
 * Ticket 02 (017) — Proposer une nouvelle adresse l'inscrit chez Cloudflare et ouvre un
 * remplacement en cours
 * (openspec/changes/017-remplacement-adresse-autorisee/tickets/02-proposer-une-nouvelle-adresse.md),
 * ADR-0033.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, avec la vraie D1 locale. Le seul double est l'API des adresses de Cloudflare
 * (`double-api-adresses.ts`, frontière hors process), plus l'espion de la liaison d'envoi
 * (ADR-0002) pour SC-02e. Les tables du remplacement sont créées par le module lui-même
 * (`create table if not exists`) ; le test ne les crée pas.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  CLE_DE_TEST,
  COMPTE_DE_TEST,
  installerDoubleApiAdresses,
  type DoubleApiAdresses,
  type ModePanne,
} from "./double-api-adresses";

const NOM_COOKIE_SESSION = "__Host-session";
const NOM_COOKIE_APPAREIL = "identifiant-appareil";
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

async function remplacements(db: DBLike): Promise<Record<string, unknown>[]> {
  try {
    return (await db.prepare("select adresse, session from remplacement_adresse").all()).results;
  } catch {
    return [];
  }
}

async function adressesEnBase(db: DBLike): Promise<string[]> {
  const { results } = await db.prepare("select adresse from adresses_autorisees").all();
  return results.map((ligne) => String(ligne.adresse));
}

function obtenir(cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}${ROUTE}`, {
      redirect: "manual",
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
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

// --- SC-02a ---

it.each([
  ["vide", ""],
  ["sans @", "pas-une-adresse"],
])("SC-02a — une saisie %s est refusée, rien n'est inscrit chez Cloudflare ni ouvert", async (_nom, saisie) => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);

  const reponse = await proposer(cookie, saisie);

  expect(reponse.status).toBeLessThan(500);
  expect(texteVisible(await reponse.text())).toContain(
    "Cette adresse ne semble pas complète. Exemple : prenom@exemple.fr",
  );
  expect(double.appels).toEqual([]);
  expect(await remplacements(db)).toEqual([]);
  expect(await adressesEnBase(db)).toEqual([ADRESSE]);
});

// --- SC-02b ---

it("SC-02b — l'adresse en place proposée, casse différente comprise, est refusée sans rien inscrire", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);

  const reponse = await proposer(cookie, "Editrice@Exemple.FR");

  expect(reponse.status).toBeLessThan(500);
  expect(texteVisible(await reponse.text())).toContain("C'est déjà votre adresse.");
  expect(double.appels).toEqual([]);
  expect(await remplacements(db)).toEqual([]);
});

// --- SC-02c ---

it("SC-02c — une adresse absente chez Cloudflare est lue (GET) puis inscrite (POST), l'écran annonce le message et le geste", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);

  const reponse = await proposer(cookie, NOUVELLE);

  expect(reponse.status).toBe(200);
  expect(double.appels.map((a) => a.methode)).toEqual(["GET", "POST"]);
  expect(double.appels[0]?.chemin).toBe(
    `/client/v4/accounts/${COMPTE_DE_TEST}/email/routing/addresses`,
  );
  expect(double.adresses.map((a) => a.email)).toEqual([NOUVELLE]);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(`Un message va arriver à ${NOUVELLE}`);
  expect(texte).toContain("Cloudflare");
  expect(texte).toContain("anglais");
  expect(texte).toContain("Verify email address");
  expect(texte).toContain("J'ai cliqué sur le bouton");
  expect(texte).toContain("Revenir aux réglages");
  expect(texte).toContain(`Tant que ce n'est pas terminé, votre adresse reste ${ADRESSE}.`);
  const ouverts = await remplacements(db);
  expect(ouverts).toHaveLength(1);
  expect(ouverts[0]?.adresse).toBe(NOUVELLE);
  expect(ouverts[0]?.session).toBe(cookie);
  expect(await adressesEnBase(db)).toEqual([ADRESSE]);
});

// --- SC-02d ---

it("SC-02d — une adresse déjà inscrite chez Cloudflare (casse différente) ne reçoit aucun POST et ouvre un remplacement", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  double.inscrire("Nouvelle@Exemple.fr");

  const reponse = await proposer(cookie, NOUVELLE);

  expect(reponse.status).toBe(200);
  expect(double.appels.map((a) => a.methode)).toEqual(["GET"]);
  expect(double.adresses).toHaveLength(1);
  const ouverts = await remplacements(db);
  expect(ouverts).toHaveLength(1);
  expect(String(ouverts[0]?.adresse).toLowerCase()).toBe(NOUVELLE);
  expect(texteVisible(await reponse.text())).toContain("Un message va arriver à");
});

// --- SC-02e ---

it("SC-02e — juste après une proposition, l'adresse en place reçoit toujours son code de connexion et ses demandes", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await proposer(cookie, NOUVELLE);
  expect(await remplacements(db)).toHaveLength(1);
  messages.length = 0;

  // Connexion : le code part vers l'adresse autorisée, pas vers la proposée.
  const ecran = await exports.default.fetch(new Request(`${ORIGINE}/admin/connexion`));
  const appareil = ecran.headers
    .getSetCookie()
    .map((c) => c.split(";")[0] ?? "")
    .find((c) => c.startsWith(`${NOM_COOKIE_APPAREIL}=`));
  expect(appareil).toBeTruthy();
  await exports.default.fetch(
    new Request(`${ORIGINE}/admin/connexion`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: ORIGINE,
        cookie: appareil ?? "",
      },
      body: `adresse=${encodeURIComponent(ADRESSE)}`,
    }),
  );
  const codes = await db.prepare("select count(*) as n from codes_connexion").all();
  expect(codes.results[0]?.n).toBe(1);
  await vi.waitFor(() => {
    expect(messages.map((m) => m.to)).toEqual([ADRESSE]);
  });

  // Demande de devis : acheminée à l'adresse autorisée.
  messages.length = 0;
  const demande = await exports.default.fetch(
    new Request(`${ORIGINE}/api/public/demandes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGINE },
      body: JSON.stringify({
        formulaire: "devis-gateau",
        page: "contact",
        valeurs: {
          parfum: ["fraise"],
          "nombre-de-parts": ["dix-parts"],
          occasion: ["anniversaire"],
          nom: "Marie Dupont",
          courriel: "marie@exemple.fr",
        },
        totalAffiche: 4000,
      }),
    }),
  );
  expect(demande.status).toBe(200);
  expect(await demande.json()).toEqual({ statut: "envoyee" });
  expect(messages.map((m) => m.to)).toEqual([ADRESSE]);
  expect(await adressesEnBase(db)).toEqual([ADRESSE]);
});

// --- SC-02f ---

const PHRASE_ECHEC = `Le changement n'a pas pu se faire. Rien n'a changé : votre adresse reste ${ADRESSE}. Réessayez dans quelques minutes.`;

const PANNES: [string, ModePanne, ("GET" | "POST")?][] = [
  ["success: false à la lecture", "success-false", "GET"],
  ["5xx à la lecture", "cinq-cent-deux", "GET"],
  ["délai dépassé à la lecture", "delai", "GET"],
  ["réponse illisible à la lecture", "illisible", "GET"],
  ["success: false à l'inscription", "success-false", "POST"],
  ["5xx à l'inscription", "cinq-cent-deux", "POST"],
  ["délai dépassé à l'inscription", "delai", "POST"],
  ["réponse illisible à l'inscription", "illisible", "POST"],
];

it.each(PANNES)(
  "SC-02f — %s : le remplacement n'a pas pu commencer, aucun n'est ouvert, l'adresse ne change pas",
  async (_nom, mode, methode) => {
    const db = await assurerSchema();
    const cookie = await semerSession(db);
    double.panne = { mode, methode };

    const reponse = await proposer(cookie, NOUVELLE);

    expect(reponse.status).toBeLessThan(500);
    expect(texteVisible(await reponse.text())).toContain(PHRASE_ECHEC);
    expect(await remplacements(db)).toEqual([]);
    expect(await adressesEnBase(db)).toEqual([ADRESSE]);
  },
);

// --- SC-02g ---

it("SC-02g — l'écran rendu avec un remplacement en cours dit vers quelle adresse et ce qui reste à faire", async () => {
  const db = await assurerSchema();
  const cookie = await semerSession(db);
  await proposer(cookie, NOUVELLE);
  const appelsAvant = double.appels.length;

  const reponse = await obtenir(cookie);

  expect(reponse.status).toBe(200);
  const texte = texteVisible(await reponse.text());
  expect(texte).toContain(`Un message va arriver à ${NOUVELLE}`);
  expect(texte).toContain("Verify email address");
  expect(texte).toContain("J'ai cliqué sur le bouton");
  expect(texte).toContain(`Tant que ce n'est pas terminé, votre adresse reste ${ADRESSE}.`);
  expect(double.appels).toHaveLength(appelsAvant);
});
