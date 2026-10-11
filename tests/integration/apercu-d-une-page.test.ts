/**
 * Change 011, ticket 08 — Voir l'aperçu d'une page depuis son éditeur,
 * réservé à la session.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. L'état publié est semé directement dans les
 * tables de la migration 0010 ; la page publique bâtie (`dist/client`) est lue
 * par la liaison ASSETS, telle qu'elle est servie.
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
    const modules = [
      await import("../../migrations/0003_sessions.sql?raw"),
      await import("../../migrations/0004_brouillons_emplacements.sql?raw"),
      await import("../../migrations/0007_brouillons_reglages.sql?raw"),
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
      await import("../../migrations/0010_etat_publie.sql?raw"),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        await db.prepare(requete).run();
      }
      if (module === modules[0]) {
        try {
          await db
            .prepare("alter table sessions add column dernier_usage_le integer")
            .run();
        } catch {
          // déjà ajoutée : sans effet.
        }
      }
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
  const id = `session-apercu-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      "insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)",
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return `${NOM_COOKIE_SESSION}=${id}`;
}

function apercu(chemin: string, cookie?: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGINE}/admin/apercu/${chemin}`, {
      redirect: "manual",
      headers: cookie ? { cookie } : {},
    }),
  );
}

async function semerPublie(
  db: DBLike,
  page: string,
  idEmplacement: string,
  contenu: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      "insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(
      page,
      idEmplacement,
      String(contenu.nature),
      JSON.stringify(contenu),
      Date.now(),
    )
    .run();
}

async function semerBrouillon(
  db: DBLike,
  page: string,
  idEmplacement: string,
  contenu: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(
      page,
      idEmplacement,
      String(contenu.nature),
      JSON.stringify(contenu),
      Date.now(),
    )
    .run();
}

async function semerPublieReglage(
  db: DBLike,
  reglage: string,
  contenu: unknown,
): Promise<void> {
  await db
    .prepare(
      "insert into publies_reglages (reglage, contenu, publie_le) values (?1, ?2, ?3)",
    )
    .bind(reglage, JSON.stringify(contenu), Date.now())
    .run();
}

const BANDEAU = /<div[^>]*data-bandeau-apercu[\s\S]*?<\/div>/;

// Le nom haché de la feuille de style dépend du lot de construction (page bâtie
// ou route de l'administration) : ce n'est pas du contenu de la page.
function sansBandeau(html: string): string {
  return html
    .replace(BANDEAU, "")
    .replace(/<link rel="stylesheet" href="[^"]*">/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

it("SC-08a — l'aperçu d'une page sans brouillon présente la dernière version publiée", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerPublie(db, "tarifs", "bouton-devis", {
    nature: "bouton-action",
    libelle: "Libellé publié",
    destination: "/contact",
  });

  const reponse = await apercu("tarifs", cookie);
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(corps).toContain("Libellé publié");
  expect(corps).not.toContain("Demander un devis");
});

it("SC-08b — l'aperçu a le même contenu que la page publique, élément par élément, hors bandeau", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  for (const slug of ["tarifs", "contact"]) {
    const publique = await exports.default.fetch(
      new Request(`${ORIGINE}/${slug}`),
    );
    const reponse = await apercu(slug, cookie);

    expect(publique.status).toBe(200);
    expect(reponse.status).toBe(200);
    const attendu = sansBandeau(await publique.text());
    const obtenu = sansBandeau(await reponse.text());
    expect(obtenu).toBe(attendu);
  }
});

it("SC-08c — sans session, l'aperçu renvoie à la connexion sans rien montrer du contenu", async () => {
  const db = await assurerSchema();
  await semerPublie(db, "tarifs", "bouton-devis", {
    nature: "bouton-action",
    libelle: "Libellé secret",
    destination: "/contact",
  });
  await semerBrouillon(db, "tarifs", "bouton-devis", {
    nature: "bouton-action",
    libelle: "Brouillon secret",
    destination: "/contact",
  });

  const reponse = await apercu("tarifs");
  const corps = await reponse.text();

  expect([301, 302, 303, 307, 308]).toContain(reponse.status);
  expect(reponse.headers.get("location")).toMatch(/\/admin\/connexion\/?$/);
  expect(corps).not.toContain("secret");
  expect(corps).not.toContain("Tarifs");
});

it("SC-08d — en session, un identifiant sans page déclarée est « introuvable », rien d'autre montré", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const reponse = await apercu("page-qui-n-existe-pas", cookie);
  const corps = await reponse.text();

  expect(reponse.status).toBe(404);
  expect(corps).toContain("introuvable");
  expect(corps).not.toContain("Tarifs");
  expect(corps).not.toContain("data-bandeau-apercu");
});

it("SC-08e — en session, l'aperçu porte la politique stricte de l'administration et no-store", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const reponse = await apercu("tarifs", cookie);

  expect(reponse.status).toBe(200);
  expect(reponse.headers.get("cache-control")).toContain("no-store");
  const csp = reponse.headers.get("content-security-policy") ?? "";
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("default-src 'none'");
});

it("SC-08f — un bandeau, hors de la page, dit que l'aperçu n'est pas encore en ligne", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const corps = await (await apercu("tarifs", cookie)).text();
  const bandeau = BANDEAU.exec(corps)?.[0] ?? "";

  expect(bandeau).toContain("Aperçu — cette page n’est pas encore en ligne.");
  const avantEnTete = corps.indexOf("<header");
  expect(corps.indexOf("data-bandeau-apercu")).toBeLessThan(avantEnTete);
  expect(bandeau).not.toContain("<header");
  expect(bandeau).not.toContain("<main");
});

it("SC-08g — le retour à l'édition depuis l'aperçu ouvre l'éditeur de cette page", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const corps = await (await apercu("tarifs", cookie)).text();
  const bandeau = BANDEAU.exec(corps)?.[0] ?? "";
  const href = /<a href="([^"]*)"[^>]*>Revenir à la page<\/a>/.exec(
    bandeau,
  )?.[1];
  expect(href).toBe("/admin/pages/tarifs");
  if (href === undefined) throw new Error("lien de retour absent");

  const editeur = await exports.default.fetch(
    new Request(`${ORIGINE}${href}`, { headers: { cookie } }),
  );
  expect(editeur.status).toBe(200);
  expect(await editeur.text()).toContain("Tarifs");
});

it("SC-08i — « Voir l'aperçu » depuis l'éditeur ouvre l'aperçu de cette page avec son contenu courant", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerPublie(db, "tarifs", "bouton-devis", {
    nature: "bouton-action",
    libelle: "Contenu courant publié",
    destination: "/contact",
  });

  const editeur = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/pages/tarifs`, { headers: { cookie } }),
  );
  const html = await editeur.text();
  const lien =
    /<a[^>]*id="voir-apercu"[^>]*href="([^"]*)"[^>]*>\s*Voir l’aperçu\s*<\/a>/.exec(
      html,
    ) ??
    /<a[^>]*href="([^"]*)"[^>]*id="voir-apercu"[^>]*>\s*Voir l’aperçu\s*<\/a>/.exec(
      html,
    );
  expect(lien?.[1]).toBe("/admin/apercu/tarifs");

  const cible = await exports.default.fetch(
    new Request(`${ORIGINE}${lien?.[1] ?? ""}`, { headers: { cookie } }),
  );
  expect(cible.status).toBe(200);
  const corps = await cible.text();
  expect(corps).toContain("<h1>Tarifs</h1>");
  expect(corps).toContain("Contenu courant publié");
});

it("SC-08b — l'aperçu de la page d'accueil a le même contenu que la page publique /", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const publique = await exports.default.fetch(new Request(`${ORIGINE}/`));
  const reponse = await apercu("", cookie);

  expect(publique.status).toBe(200);
  expect(reponse.status).toBe(200);
  const attendu = sansBandeau(await publique.text());
  const obtenu = sansBandeau(await reponse.text());
  expect(obtenu).toBe(attendu);
});

it("SC-08i — « Voir l'aperçu » depuis l'éditeur de l'accueil ouvre l'aperçu de l'accueil", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const editeur = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/pages/accueil`, { headers: { cookie } }),
  );
  const html = await editeur.text();
  const lien =
    /<a[^>]*id="voir-apercu"[^>]*href="([^"]*)"[^>]*>\s*Voir l’aperçu\s*<\/a>/.exec(
      html,
    ) ??
    /<a[^>]*href="([^"]*)"[^>]*id="voir-apercu"[^>]*>\s*Voir l’aperçu\s*<\/a>/.exec(
      html,
    );
  expect(lien?.[1]).toBe("/admin/apercu/");

  const cible = await exports.default.fetch(
    new Request(`${ORIGINE}${lien?.[1] ?? ""}`, { headers: { cookie } }),
  );
  expect(cible.status).toBe(200);
  expect(await cible.text()).toContain("<h1>Accueil</h1>");
});

it("SC-08d — l'identifiant de l'accueil n'est pas une adresse publique : /admin/apercu/accueil est introuvable", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);

  const reponse = await apercu("accueil", cookie);
  const corps = await reponse.text();

  expect(reponse.status).toBe(404);
  expect(corps).toContain("introuvable");
  expect(corps).not.toContain("data-bandeau-apercu");
});

it("SC-08a — l'aperçu présente aussi la dernière version publiée des réglages, dans le pied de page", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerPublieReglage(db, "coordonnees", { telephone: "09 87 65 43 21" });
  await semerPublieReglage(db, "reseaux", [
    { nom: "Mastodon", lien: "https://mastodon.example/@atelier" },
  ]);

  const reponse = await apercu("tarifs", cookie);
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(corps).toContain("09 87 65 43 21");
  expect(corps).toContain("Mastodon");
  expect(corps).toContain("https://mastodon.example/@atelier");
  expect(corps).not.toContain("01 23 45 67 89");
  expect(corps).not.toContain("Instagram");
  expect(corps).toContain("12 rue des Tilleuls");
});

it("SC-08a — des réseaux publiés de forme inattendue laissent l'aperçu sur les réseaux déclarés", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerPublieReglage(db, "reseaux", [{ nom: 1 }]);

  const reponse = await apercu("tarifs", cookie);
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  expect(corps).toContain("Instagram");
});

it("SC-08h — le bandeau rendu de l'aperçu ne porte aucun terme de développeur", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  const termesDeveloppeur = [
    /\b(commit|branche|branch|build)\b/i,
    /\b(d[ée]ploiement|d[ée]ployer|deploy)\b/i,
    /\b(github|git|json|html|css|api)\b/i,
    /\b(cache|serveur|server|draft|preview|merge|pull)\b/i,
    /\b(d[ée]p[ôo]t|push|404|422)\b/i,
  ];

  const corps = await (await apercu("tarifs", cookie)).text();
  const texte = (BANDEAU.exec(corps)?.[0] ?? "").replace(/<[^<>]*>/g, " ");

  expect(texte.trim()).not.toBe("");
  for (const termes of termesDeveloppeur) {
    expect(texte).not.toMatch(termes);
  }
});
