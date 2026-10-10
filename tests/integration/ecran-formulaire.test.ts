/**
 * Change 010, ticket 04 — L'écran d'un formulaire montre ses champs à choix.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale ; une session est semée directement (même geste
 * que `liste-des-pages.test.ts`). Les deux formulaires lus sont ceux déclarés
 * au dépôt (`content/formulaires/*`). Les contrôles de la source (import `?raw`
 * de `[id].astro`) vivent dans ce fichier même (SC-04e, politique de sécurité).
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";
import source from "../../src/pages/admin/formulaires/[id].astro?raw";
import textes from "../../src/admin/textes.ts?raw";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const BASE = "https://example.com/admin/formulaires/";
const ROUTE = `${BASE}devis-gateau`;

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
      // déjà ajoutée : sans effet.
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

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-ecran-formulaire-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

async function ouvrirEnSession(route: string = ROUTE): Promise<string> {
  const cookie = await semerSession(await assurerSchema());
  const reponse = await exports.default.fetch(
    new Request(route, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function sansBalises(html: string): string {
  return html
    .split("<")
    .map((morceau, i) =>
      i === 0 ? morceau : morceau.slice(morceau.indexOf(">") + 1),
    )
    .join(" ");
}

function contenuPrincipal(corps: string): string {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(
    main,
    "le contenu de l’écran (<main>) devrait être présent",
  ).toBeDefined();
  return main ?? "";
}

function menu(corps: string): string {
  const nav = /<nav[^>]*>([\s\S]*?)<\/nav>/.exec(corps)?.[1];
  expect(nav, "le menu (<nav>) devrait être présent").toBeDefined();
  return nav ?? "";
}

function valeurs(principal: string): string[] {
  return [...principal.matchAll(/<input[^>]*value="([^"]*)"/g)].map(
    (m) => m[1],
  );
}

it("SC-04a — « Devis gâteau » montre Parfum et ses trois options dans l’ordre avec prix, puis Occasion sans prix, rien pour l’adresse e-mail", async () => {
  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(principal)?.[1].trim()).toBe(
    "Devis gâteau",
  );
  const cartes = [...principal.matchAll(/<section[\s\S]*?<\/section>/g)].map(
    (m) => m[0],
  );
  const titres = cartes.map((c) =>
    sansBalises(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(c)?.[1] ?? "").trim(),
  );
  expect(titres).toEqual(["Parfum", "Nombre de parts", "Occasion"]);

  expect(valeurs(cartes[0])).toEqual([
    "Vanille",
    "8",
    "Chocolat",
    "9",
    "Fraise",
    "10",
  ]);
  expect(sansBalises(cartes[0])).toContain("Un seul choix");
  expect(valeurs(cartes[2])).toEqual([
    "Anniversaire",
    "Mariage",
    "Baptême &amp; communion",
  ]);
  expect(sansBalises(cartes[2])).toContain("Plusieurs choix possibles");
  expect(cartes[2]).not.toContain("€");
  expect(principal).not.toContain("Votre adresse e-mail");
});

it("SC-04b — aucun moyen d’ajouter, retirer, renommer ou réordonner un champ", async () => {
  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(principal).not.toMatch(/<form[\s>]/i);
  const boutons = [
    ...principal.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g),
  ].map((m) => m[1].trim());
  expect(boutons).toEqual(["Enregistrer"]);
  const bas = sansBalises(principal).toLowerCase();
  for (const geste of [
    "ajouter un champ",
    "supprimer",
    "retirer",
    "renommer",
    "déplacer",
    "monter",
    "descendre",
  ]) {
    expect(bas, `l’écran ne devrait pas offrir « ${geste} »`).not.toContain(
      geste,
    );
  }
  // Les libellés de champ sont des titres, jamais des zones de saisie.
  expect(valeurs(principal)).not.toContain("Parfum");
  expect(valeurs(principal)).not.toContain("Occasion");
});

it("SC-04c — en session, un identifiant non déclaré répond « introuvable » sans rien montrer d’autre", async () => {
  const cookie = await semerSession(await assurerSchema());
  const reponse = await exports.default.fetch(
    new Request(`${BASE}n-existe-pas`, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );

  expect(reponse.status).toBe(404);
  const corps = await reponse.text();
  expect(corps).toContain("introuvable");
  expect(corps).not.toContain("Devis gâteau");
  expect(corps).not.toContain("Parfum");
  expect(corps).not.toContain("Enregistrer");
});

it("SC-04d — sans session, l’écran d’un formulaire déclaré renvoie à la connexion sans rien en montrer", async () => {
  const reponse = await exports.default.fetch(
    new Request(ROUTE, { redirect: "manual" }),
  );

  expect(reponse.status).toBeGreaterThanOrEqual(300);
  expect(reponse.status).toBeLessThan(400);
  expect(reponse.headers.get("location") ?? "").toContain("/admin/connexion");
  const corps = await reponse.text();
  expect(corps).not.toContain("Devis gâteau");
  expect(corps).not.toContain("Parfum");
});

it("SC-04d — sans session, un identifiant non déclaré renvoie aussi à la connexion, jamais à « introuvable »", async () => {
  // La garde de session passe avant la recherche du formulaire.
  const reponse = await exports.default.fetch(
    new Request(`${BASE}n-existe-pas`, { redirect: "manual" }),
  );

  expect(reponse.status).toBeGreaterThanOrEqual(300);
  expect(reponse.status).toBeLessThan(400);
  expect(reponse.headers.get("location") ?? "").toContain("/admin/connexion");
  expect(await reponse.text()).not.toContain("introuvable");
});

it("SC-04e — les libellés avec esperluette paraissent comme du texte, et la page n’injecte aucun balisage issu des données", async () => {
  const principal = contenuPrincipal(await ouvrirEnSession());

  expect(principal).toContain('value="Baptême &amp; communion"');
  expect(principal).not.toContain("Baptême & communion");
  // La source n'a aucun moyen d'interpréter du balisage (I5).
  expect(source).not.toMatch(/set:html|innerHTML|<Fragment|set:text/);
  expect(source).not.toMatch(/client:/);
  expect(source).not.toMatch(/<script/);
});

// La preuve à l'exécution avec un guillemet double ou des chevrons dans les
// données attend une déclaration de test (arbitrage humain) ou le ticket 06.
it("SC-04e — nom, libellés de champ et d’option avec apostrophe paraissent comme du texte, par l’interpolation échappée seule", async () => {
  const principal = contenuPrincipal(
    await ouvrirEnSession(`${BASE}devis-atelier`),
  );

  expect(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(principal)?.[1].trim()).toBe(
    "Devis atelier",
  );
  const titre = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(principal)?.[1] ?? "";
  // L'apostrophe arrive échappée par Astro, jamais brute dans la balise.
  expect(titre).toContain("Type d&#39;atelier");
  expect(titre).not.toContain("'");
  const decode = titre
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
  expect(decode).toBe("Type d'atelier");

  // Les trois lieux du critère passent par l'interpolation échappée d'Astro.
  expect(source).toContain("<h1>{formulaire.nom}</h1>");
  expect(source).toContain(">{champ.libelle}</h2>");
  expect(source).toContain("value={option.libelle}");
});

it("SC-04a — la carte Parfum porte « € » une fois par option à prix", async () => {
  const principal = contenuPrincipal(await ouvrirEnSession());
  const parfum =
    [...principal.matchAll(/<section[\s\S]*?<\/section>/g)].at(0)?.[0] ?? "";

  expect(sansBalises(parfum)).toContain("Parfum");
  expect(sansBalises(parfum).match(/€/g)).toHaveLength(3);
});

it("décision du ticket 04 — l’écran d’un formulaire est servi sous la politique de sécurité de l’administration, sans bloc <style> ni script", async () => {
  const cookie = await semerSession(await assurerSchema());
  const reponse = await exports.default.fetch(
    new Request(ROUTE, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
  expect(reponse.status).toBe(200);
  const csp = reponse.headers.get("content-security-policy");
  expect(csp, "une Content-Security-Policy devrait être posée").toBeTruthy();

  // La même politique que l'écran de connexion : l'écran ne l'assouplit pas.
  const connexion = await exports.default.fetch(
    new Request("https://example.com/admin/connexion"),
  );
  expect(csp).toBe(connexion.headers.get("content-security-policy"));
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(csp).not.toMatch(/unsafe-eval/);

  const corps = await reponse.text();
  expect(corps).not.toMatch(/client:(load|idle|visible|only|media)/);
  expect(contenuPrincipal(corps)).not.toMatch(/<script[\s>]/i);
  // Le glob de tests/static/politique-de-securite-statique.test.ts
  // n'atteint pas src/pages/admin/formulaires/ : la source se vérifie ici.
  expect(source).not.toMatch(/<style[\s>]/i);
});

it("SC-04f — aucun terme de développeur ni identifiant, aucun prix en centimes", async () => {
  const principal = contenuPrincipal(await ouvrirEnSession());
  const texteVisible = sansBalises(principal).toLowerCase();
  const valeursSaisies = valeurs(principal).join(" ").toLowerCase();

  for (const terme of [
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
    "slug",
    "json",
    "devis-gateau",
    "choix-unique",
    "choix-multiple",
    "nombre-de-parts",
    "six-parts",
    "courriel",
  ]) {
    expect(texteVisible, `« ${terme} » ne devrait pas paraître`).not.toContain(
      terme,
    );
    expect(
      valeursSaisies,
      `« ${terme} » ne devrait pas paraître`,
    ).not.toContain(terme);
  }
  expect(valeurs(principal)).not.toEqual(
    expect.arrayContaining(["800", "900", "1000"]),
  );
  for (const centimes of ["800", "900", "1000", "1800", "3000", "5500"]) {
    expect(valeurs(principal)).not.toContain(centimes);
  }
  expect(textes).not.toMatch(/centime/i);
});

it("SC-04g — la barre latérale montre les cinq rubriques, « Formulaires » seule marquée active", async () => {
  const nav = menu(await ouvrirEnSession());

  for (const libelle of [
    "Mes pages",
    "Médias",
    "Réglages",
    "Formulaires",
    "Demandes",
  ]) {
    expect(nav).toContain(libelle);
  }
  expect(nav.match(/aria-current="page"/g)).toHaveLength(1);
  expect(nav).toMatch(
    /<a[^>]*href="\/admin\/formulaires"[^>]*aria-current="page"/,
  );
});
