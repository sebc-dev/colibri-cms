/**
 * Ticket 04 (008) — L'écran Réglages s'ouvre depuis le menu et montre le
 * contenu de départ
 * (openspec/changes/008-reglages-transverses/tickets/04-ecran-des-reglages.md).
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` contre le worker
 * compilé, dans `workerd`, avec une session semée en D1 (même patron que
 * `cadre-avec-l-ecran.test.ts`). Le contenu de départ est la déclaration
 * réelle `content/reglages/` (ADR-0017) : un téléphone nommé « Téléphone de
 * l'atelier », un e-mail sans nom, une adresse nommée, trois réseaux.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
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
    const module = await import("../../migrations/0003_sessions.sql?raw");
    for (const requete of separerRequetes(module.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db
        .prepare(
          `alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`,
        )
        .run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  try {
    await obtenirDB().prepare(`delete from ${TABLE_SESSIONS}`).run();
  } catch (erreur) {
    console.warn("nettoyage D1 ignoré (schéma absent) :", erreur);
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-reglages-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function accederA(
  route: string,
  cookieSession?: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request(`https://example.com${route}`, {
      redirect: "manual",
      headers:
        cookieSession === undefined
          ? {}
          : { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
    }),
  );
}

async function ouvrirReglages(): Promise<string> {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);
  const reponse = await accederA("/admin/reglages", cookie);
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function extraireMain(corps: string): string {
  const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps);
  expect(m, "le contenu (<main>) devrait être présent").not.toBeNull();
  if (m === null) throw new Error("main absent");
  return m[1];
}

function extraireMenu(corps: string): string {
  const m =
    /<aside[^>]*aria-label="Menu de l'administration"[^>]*>([\s\S]*?)<\/aside>/.exec(
      corps,
    );
  expect(m, "le menu devrait être présent").not.toBeNull();
  if (m === null) throw new Error("menu absent");
  return m[1];
}

function texteVisible(html: string): string {
  return html.replace(/<[^<>]*>/g, " ");
}

// --- SC-04a ---

it("SC-04a — « Réglages » ouvre l’écran dans le cadre, rubrique active, avec les trois cartes dans l’ordre", async () => {
  const corps = await ouvrirReglages();

  const menu = extraireMenu(corps);
  expect(menu).toMatch(/<a[^>]*href="\/admin\/reglages"[^>]*>/);
  const actif = /<a[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/.exec(menu);
  expect(actif?.[1]).toContain("Réglages");
  expect(menu.match(/aria-current="page"/g) ?? []).toHaveLength(1);

  const main = extraireMain(corps);
  expect(main).toMatch(/<h1>Réglages<\/h1>/);
  const titres = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
    m[1].replace(/&#39;/g, "'").trim(),
  );
  expect(titres).toEqual([
    "Coordonnées",
    "Réseaux sociaux",
    "Mention d'information",
  ]);
  expect(main).toContain("01 23 45 67 89");
  expect(main).toContain("atelier@example.org");
  expect(main).toContain("instagram.com/atelier-exemple");
  expect(main).toContain("ne sont ni revendues ni transmises à des tiers");
});

// --- SC-04b ---

it("SC-04b — sans session, l’écran renvoie à la connexion sans rien montrer des réglages", async () => {
  await assurerSchema();
  const reponse = await accederA("/admin/reglages");

  expect(reponse.status).toBeGreaterThanOrEqual(300);
  expect(reponse.status).toBeLessThan(400);
  expect(reponse.headers.get("location")).toContain("/admin/connexion");
  const corps = await reponse.text();
  for (const secret of [
    "01 23 45 67 89",
    "atelier@example.org",
    "instagram.com",
    "Coordonnées",
    "ni revendues",
  ]) {
    expect(corps).not.toContain(secret);
  }
});

// --- SC-04c ---
// La déclaration réelle ne porte aucun chevron : l'échappement s'observe sur
// ce qu'elle porte (l'apostrophe de « Téléphone de l'atelier », « Mention
// d'information »), et par la source de l'écran (aucune injection de balisage).

it("SC-04c — les textes de la déclaration sont affichés comme texte, échappés, aucun balisage interprété", async () => {
  const corps = await ouvrirReglages();
  const main = extraireMain(corps);

  expect(main).not.toContain("Téléphone de l'atelier");
  expect(main).toMatch(/Téléphone de l(?:&#39;|&apos;|&#x27;)atelier/);
  expect(main).toMatch(/Mention d(?:&#39;|&apos;|&#x27;)information/);
  // Aucun balisage issu des données : seules les balises de l'écran existent.
  const balises = new Set(
    [...main.matchAll(/<([a-z][a-z0-9]*)/gi)].map((m) => m[1].toLowerCase()),
  );
  for (const balise of balises) {
    expect([
      "h1",
      "h2",
      "div",
      "section",
      "label",
      "input",
      "textarea",
      "p",
      "ul",
      "li",
      "span",
      "button",
    ]).toContain(balise);
  }
});

it("SC-04c — la source de l’écran n’injecte aucune donnée comme balisage (ni set:html ni innerHTML)", async () => {
  const source = (await import("../../src/pages/admin/reglages.astro?raw"))
    .default;

  expect(source).not.toMatch(/set:html\s*=/);
  expect(source).not.toMatch(/innerHTML\s*=/);
  expect(source).not.toMatch(/Fragment/);
  expect(source).not.toMatch(/<[A-Za-z][^>]*\sclient:[a-z]+/);
});

// --- SC-04d ---

it("SC-04d — aucun terme de développeur sur l’écran, ses cartes, champs et libellés", async () => {
  const corps = await ouvrirReglages();
  const visible = texteVisible(extraireMain(corps)).toLowerCase();
  const termes = [
    "commit",
    "branche",
    "build",
    "déploiement",
    "déployer",
    "repository",
    "dépôt",
    "endpoint",
    "webhook",
    "backend",
    "front-end",
    "framework",
    "route",
    "slug",
    "props",
    "composant",
    "json",
    "markdown",
    "github",
    "identifiant",
    "declaration",
    "déclaration",
  ];
  for (const terme of termes) {
    expect(
      visible,
      `l’écran ne devrait pas contenir « ${terme} »`,
    ).not.toContain(terme);
  }
});

// --- SC-04e ---

it("SC-04e — deux champs dans l’ordre, « Téléphone de l’atelier » puis « Adresse e-mail », aucun identifiant à l’écran", async () => {
  const corps = await ouvrirReglages();
  const main = extraireMain(corps);

  const coordonnees =
    /<section[^>]*aria-labelledby="carte-coordonnees"[^>]*>([\s\S]*?)<\/section>/.exec(
      main,
    )?.[1];
  expect(coordonnees).toBeDefined();
  const intitules = [
    ...(coordonnees ?? "").matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g),
  ].map((m) => m[1].replace(/&#39;/g, "'").trim());
  expect(intitules).toEqual([
    "Téléphone de l'atelier",
    "Adresse e-mail",
    "Adresse",
  ]);

  const champs = [
    ...(coordonnees ?? "").matchAll(/<(input|textarea)\b[^>]*>/g),
  ].map((m) => m[0]);
  expect(champs[0]).toMatch(/type="tel"/);
  expect(champs[1]).toMatch(/type="email"/);
  expect(champs[2]).toMatch(/^<textarea/);

  const visible = texteVisible(main);
  expect(visible).not.toMatch(/\bcourriel\b/i);
  expect(visible).not.toMatch(/\btelephone\b/i);
});

// --- SC-04g ---

it("SC-04g — seules trois rubriques mènent à un écran servi, et l’écran n’offre aucun geste de structure", async () => {
  const db = await assurerSchema();
  const cookie = await semerSessionValide(db);

  for (const route of ["/admin/formulaires", "/admin/demandes"]) {
    const reponse = await accederA(route, cookie);
    expect(reponse.status, `${route} ne devrait mener à aucun écran`).not.toBe(
      200,
    );
  }

  const corps = await (await accederA("/admin/reglages", cookie)).text();
  const menu = extraireMenu(corps);
  const liens = [...menu.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  expect(liens).toEqual([
    "/admin/mes-pages",
    "/admin/medias",
    "/admin/reglages",
  ]);
  expect(menu).not.toMatch(/<(form|button|input)[\s>]/i);

  const visible = (
    texteVisible(menu) + texteVisible(extraireMain(corps))
  ).toLowerCase();
  for (const geste of [
    "ajouter une rubrique",
    "créer une rubrique",
    "ajouter une page",
    "créer une page",
    "supprimer",
    "renommer",
    "déplacer",
  ]) {
    expect(visible, `aucun geste « ${geste} » attendu`).not.toContain(geste);
  }
});
