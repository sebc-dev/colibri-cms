/**
 * Ticket 06 du change 012 — l'aperçu montre le formulaire avec son brouillon, et n'envoie rien.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre la vraie D1
 * locale. Les brouillons sont semés directement dans les tables ; la page publique est lue telle
 * qu'elle est servie. Le comportement au clic (SC-06c, SC-06e) se joue au navigateur, dans
 * `tests/parcours/apercu-formulaire.parcours.ts` ; ici, la structure qui le garantit.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLES = [
  "sessions",
  "brouillons_emplacements",
  "brouillons_reglages",
  "brouillons_formulaires",
  "publies_emplacements",
  "publies_reglages",
  "publies_formulaires",
];
const ORIGINE = "https://example.com";
const TEXTE_AVIS = "Dans l'aperçu, l'envoi est désactivé : rien ne part d'ici.";

interface ResultatLike {
  results: unknown[];
}
interface InstructionLike {
  bind(...valeurs: unknown[]): {
    run(): Promise<unknown>;
    all(): Promise<ResultatLike>;
  };
  run(): Promise<unknown>;
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
    const modules = [
      await import("../../migrations/0003_sessions.sql?raw"),
      await import("../../migrations/0004_brouillons_emplacements.sql?raw"),
      await import("../../migrations/0007_brouillons_reglages.sql?raw"),
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
      await import("../../migrations/0010_etat_publie.sql?raw"),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà créée (rejeu au sein du même run) : sans effet.
        }
      }
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

afterEach(async () => {
  for (const table of TABLES) {
    try {
      await obtenirDB().prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
});

async function ouvrirSession(db: DBLike): Promise<string> {
  const id = `session-apercu-formulaires-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return `${NOM_COOKIE_SESSION}=${id}`;
}

function apercu(chemin: string, cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/apercu/${chemin}`, {
      redirect: "manual",
      headers: { cookie },
    }),
  );
}

function publique(chemin: string): Promise<Response> {
  return exports.default.fetch(new Request(`${ORIGINE}/${chemin}`));
}

const PARFUMS_DU_BROUILLON = [
  { id: "vanille", libelle: "Vanille", prix: 800 },
  { id: "chocolat", libelle: "Chocolat", prix: 900 },
  { id: "fraise", libelle: "Fraise", prix: 1000 },
  { id: "pistache", libelle: "Pistache", prix: 1200 },
];

async function semerBrouillonFormulaire(db: DBLike): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_formulaires (formulaire, contenu, maj_le) values (?1, ?2, ?3)",
    )
    .bind(
      "devis-gateau",
      JSON.stringify({
        champs: { parfum: PARFUMS_DU_BROUILLON },
        derniersNumeros: {},
      }),
      Date.now(),
    )
    .run();
}

async function semerBrouillonMention(db: DBLike, texte: string): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)",
    )
    .bind("mention", JSON.stringify(texte), Date.now())
    .run();
}

async function compter(db: DBLike, table: string): Promise<string> {
  const resultat = await db.prepare(`select * from ${table}`).bind().all();
  return JSON.stringify(resultat.results);
}

const BANDEAU = /<div[^>]*data-bandeau-apercu[\s\S]*?<\/div>/;
const AVIS =
  /<([a-z]+)\b[^>]*\bdata-avis-envoi-desactive\b[^>]*>[\s\S]*?<\/\1>/g;

/** Ramène un document d'aperçu à ce que porte la page publique : hors bandeau, avis et mode d'envoi. */
function normalise(html: string, apercuAvecAvis: boolean): string {
  const base = apercuAvecAvis
    ? html.replaceAll('href="/admin/apercu/', 'href="/')
    : html;
  return base
    .replace(BANDEAU, "")
    .replace(/<link rel="stylesheet" href="[^"]*">/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(AVIS, "")
    .replaceAll('data-mode="desactive"', 'data-mode="actif"')
    .replace(/<button\b([^>]*?)\sdisabled(="")?([^>]*)>/g, "<button$1$3>")
    .replace(/<button\b([^>]*)>/g, (_, attrs: string) => `<button${attrs.trim() ? " " + attrs.trim() : ""}>`)
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

function texteVisible(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^<>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replace(/&#39;|&apos;/g, "'")
    .replaceAll("&quot;", '"')
    .replace(/\s+/g, " ");
}

function formulaireDe(corps: string): string {
  const debut = corps.indexOf("<form");
  const fin = corps.indexOf("</form>");
  expect(debut, "aucun <form> dans la page").toBeGreaterThanOrEqual(0);
  expect(fin).toBeGreaterThan(debut);
  return corps.slice(debut, fin + "</form>".length);
}

function groupe(formulaire: string, libelle: string): string {
  const trouve = [...formulaire.matchAll(/<fieldset\b[\s\S]*?<\/fieldset>/g)]
    .map((m) => m[0])
    .find((f) => /<legend\b[\s\S]*?<\/legend>/.exec(f)?.[0].includes(libelle));
  expect(trouve, `aucun groupe titré « ${libelle} »`).toBeDefined();
  return trouve ?? "";
}

it("SC-06a — sans aucun brouillon, l'aperçu et la page publique ont le même contenu, élément par élément", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  for (const chemin of ["contact", "tarifs", ""]) {
    const reponse = await apercu(chemin, cookie);
    const attendue = await publique(chemin);

    expect(reponse.status).toBe(200);
    expect(attendue.status).toBe(200);
    const obtenu = normalise(await reponse.text(), true);
    const attendu = normalise(await attendue.text(), false);
    expect(obtenu).toBe(attendu);
  }
  const contact = await (await apercu("contact", cookie)).text();
  expect(contact).toContain("<form");
  expect(contact).toContain('data-mode="desactive"');
});

it("SC-06b — « Pistache — 12 € » ajoutée en brouillon : l'aperçu de Contact la présente, la page publique non", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillonFormulaire(db);

  const corpsApercu = await (await apercu("contact", cookie)).text();
  const corpsPublic = await (await publique("contact")).text();

  const parfum = texteVisible(groupe(formulaireDe(corpsApercu), "Parfum"));
  expect(parfum).toMatch(/Pistache\W{0,6}12 €/);
  expect(texteVisible(corpsPublic)).not.toContain("Pistache");
});

it("SC-06c — le prix du brouillon est porté par l'option de l'aperçu, que le total additionne (12 € + 30 € = 42 €)", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillonFormulaire(db);

  const formulaire = formulaireDe(await (await apercu("contact", cookie)).text());

  const pistache = [...groupe(formulaire, "Parfum").matchAll(/<input\b[^>]*>/g)]
    .map((m) => m[0])
    .find((i) => i.includes('value="pistache"'));
  expect(pistache, "option pistache absente").toBeDefined();
  expect(pistache).toContain('data-prix="1200"');
  const dixParts = [...groupe(formulaire, "Nombre de parts").matchAll(/<input\b[^>]*>/g)]
    .map((m) => m[0])
    .find((i) => i.includes('value="dix-parts"'));
  expect(dixParts).toContain('data-prix="3000"');
  expect(formulaire).toContain("data-total");
});

it("SC-06d — la mention d'information en brouillon est celle du formulaire de l'aperçu, pas celui du public", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillonMention(db, "Mention du brouillon, pas encore publiée.");

  const corpsApercu = await (await apercu("contact", cookie)).text();
  const corpsPublic = await (await publique("contact")).text();

  const mention = /<div class="mention">[\s\S]*?<\/div>/.exec(formulaireDe(corpsApercu))?.[0] ?? "";
  expect(texteVisible(mention)).toContain("Mention du brouillon, pas encore publiée.");
  expect(corpsPublic).not.toContain("Mention du brouillon");
});

it("SC-06e — l'aperçu porte l'avis d'envoi désactivé, un bouton d'envoi actionnable, et ne change rien en base", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillonFormulaire(db);
  const avant = [];
  for (const table of TABLES.filter((t) => t !== "sessions")) avant.push(await compter(db, table));

  const reponse = await apercu("contact", cookie);
  const corps = await reponse.text();
  const formulaire = formulaireDe(corps);

  expect(reponse.status).toBe(200);
  expect(formulaire).toContain('data-mode="desactive"');
  const avis = /<([a-z]+)\b[^>]*\bdata-avis-envoi-desactive\b[^>]*>[\s\S]*?<\/\1>/.exec(corps)?.[0] ?? "";
  expect(texteVisible(avis).trim()).toBe(TEXTE_AVIS);
  const bouton = /<button\b[^>]*\btype="submit"[^>]*>/.exec(formulaire)?.[0] ?? "";
  expect(bouton).not.toBe("");
  expect(formulaire).not.toMatch(/<form\b[^>]*\baction=/);

  const apres = [];
  for (const table of TABLES.filter((t) => t !== "sessions")) apres.push(await compter(db, table));
  expect(apres).toEqual(avant);
});

const TERMES_DE_DEVELOPPEUR = [
  "commit",
  "branche",
  "build",
  "déploiement",
  "requête",
  "serveur",
  "API",
  "JSON",
  "HTTP",
  "script",
  "code",
  "cache",
  "SMTP",
  "worker",
];

it("SC-06f — l'avis d'envoi désactivé ne contient aucun terme de développeur", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const corps = await (await apercu("contact", cookie)).text();
  const avis = /<([a-z]+)\b[^>]*\bdata-avis-envoi-desactive\b[^>]*>[\s\S]*?<\/\1>/.exec(corps)?.[0] ?? "";

  const texte = texteVisible(avis).trim();
  expect(texte).not.toBe("");
  for (const terme of TERMES_DE_DEVELOPPEUR) {
    expect(texte, `terme « ${terme} »`).not.toMatch(new RegExp(`\\b${terme}\\b`, "i"));
  }
});
