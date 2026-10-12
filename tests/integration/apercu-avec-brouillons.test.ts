/**
 * Change 011, ticket 09 — L'aperçu montre les brouillons de la page et des
 * réglages, et mène d'une page à l'aperçu de l'autre.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale. Les brouillons, l'état publié et les images sont
 * semés directement dans les tables ; la page publique bâtie est lue par la
 * liaison ASSETS, telle qu'elle est servie.
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
  "medias",
];
const ORIGINE = "https://example.com";

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
      await import("../../migrations/0005_medias_brouillon.sql?raw"),
      await import("../../migrations/0006_medias_brouillon_affichage.sql?raw"),
      await import("../../migrations/0007_brouillons_reglages.sql?raw"),
      await import("../../migrations/0008_brouillons_formulaires.sql?raw"),
      await import("../../migrations/0009_medias.sql?raw"),
      await import("../../migrations/0010_etat_publie.sql?raw"),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà créée, renommée ou ajoutée (rejeu au sein du même run) : sans effet.
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
  const id = `session-apercu-brouillons-${crypto.randomUUID()}`;
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

async function semerBrouillonReglage(
  db: DBLike,
  reglage: string,
  contenu: unknown,
): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_reglages (reglage, contenu, maj_le) values (?1, ?2, ?3)",
    )
    .bind(reglage, JSON.stringify(contenu), Date.now())
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

/** Une image téléversée, décrite, que le site en service ne porte pas. */
async function semerImageDecrite(
  db: DBLike,
  id: string,
  description: string,
): Promise<void> {
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, description)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      id,
      "nouvelle.png",
      "png",
      800,
      400,
      4,
      new Uint8Array([1, 2, 3, 4]),
      Date.now(),
      description,
    )
    .run();
}

async function compter(db: DBLike, table: string): Promise<string> {
  const resultat = await db.prepare(`select * from ${table}`).bind().all();
  return JSON.stringify(resultat.results);
}

function liens(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);
}

function balise(html: string, motif: RegExp): string {
  return motif.exec(html)?.[0] ?? "";
}

const BANDEAU = "data-bandeau-apercu";

it("SC-09a — l'aperçu d'Accueil présente le texte du brouillon, la page publique le texte publié", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillon(db, "accueil", "presentation", {
    nature: "texte-riche",
    markdown: "Texte de présentation encore en brouillon.",
  });

  const corps = await (await apercu("", cookie)).text();
  const publiee = await (await publique("")).text();

  expect(corps).toContain("Texte de présentation encore en brouillon.");
  expect(corps).not.toContain("Bienvenue à la pâtisserie");
  expect(publiee).toContain("Bienvenue à la pâtisserie");
  expect(publiee).not.toContain("Texte de présentation encore en brouillon.");
});

it("SC-09b — l'aperçu de Contact présente ensemble le brouillon de la page et le nouveau téléphone dans le pied de page", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillon(db, "contact", "presentation", {
    nature: "texte-riche",
    markdown: "Venez nous voir, brouillon de contact.",
  });
  await semerBrouillonReglage(db, "coordonnees", {
    telephone: "06 11 22 33 44",
  });
  await semerPublieReglage(db, "coordonnees", { telephone: "09 87 65 43 21" });
  await semerPublieReglage(db, "reseaux", [
    { nom: "Mastodon", lien: "https://mastodon.example/@publie" },
  ]);
  await semerBrouillonReglage(db, "reseaux", [
    { nom: "Bluesky", lien: "https://bsky.example/brouillon" },
  ]);

  const corps = await (await apercu("contact", cookie)).text();
  const pied = corps.slice(corps.indexOf("<footer"));

  expect(corps).toContain("Venez nous voir, brouillon de contact.");
  expect(pied).toContain("06 11 22 33 44");
  expect(corps).not.toContain("01 23 45 67 89");
  expect(pied).toContain("Bluesky");
  expect(pied).toContain("https://bsky.example/brouillon");
  expect(pied).not.toContain("09 87 65 43 21");
  expect(pied).not.toContain("Mastodon");
  expect(pied).not.toContain("01 23 45 67 89");
});

it("SC-09c — une image téléversée, décrite et posée sans publier paraît dans l'aperçu de Tarifs avec sa description en texte de remplacement", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerImageDecrite(db, "media-nouvelle", "Un gâteau au chocolat");
  await semerBrouillon(db, "tarifs", "bandeau-tarifs", {
    nature: "image",
    mediaId: "media-nouvelle",
  });

  const reponse = await apercu("tarifs", cookie);
  const corps = await reponse.text();
  const image = balise(corps, /<img\b[^>]*media-nouvelle[^>]*>/);

  expect(reponse.status).toBe(200);
  expect(image).toContain('src="/admin/medias/media-nouvelle/octets"');
  expect(image).toContain('alt="Un gâteau au chocolat"');
});

it("SC-09d — demander l'aperçu laisse le brouillon inchangé, la marque de brouillon présente et le site public inchangé", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillon(db, "accueil", "presentation", {
    nature: "texte-riche",
    markdown: "Brouillon à ne pas toucher.",
  });
  await semerBrouillonReglage(db, "coordonnees", { telephone: "06 11 22 33 44" });
  const brouillonsAvant = await compter(db, "brouillons_emplacements");
  const reglagesAvant = await compter(db, "brouillons_reglages");
  const publiesAvant = await compter(db, "publies_emplacements");
  const publiesReglagesAvant = await compter(db, "publies_reglages");
  const publiqueAvant = await (await publique("")).text();

  const reponse = await apercu("", cookie);
  await reponse.text();

  expect(reponse.status).toBe(200);
  expect(await compter(db, "brouillons_emplacements")).toBe(brouillonsAvant);
  expect(await compter(db, "brouillons_reglages")).toBe(reglagesAvant);
  expect(await compter(db, "publies_emplacements")).toBe(publiesAvant);
  expect(await compter(db, "publies_reglages")).toBe(publiesReglagesAvant);
  const listeDesPages = await exports.default.fetch(
    new Request(`${ORIGINE}/admin/mes-pages`, { headers: { cookie } }),
  );
  expect(
    /<li>Accueil[\s\S]*?<\/li>/.exec(await listeDesPages.text())?.[0] ?? "",
  ).toMatch(/data-pastille-brouillon/);
  expect(await (await publique("")).text()).toBe(publiqueAvant);
});

it("SC-09e — dans l'aperçu d'Accueil, le menu, le bouton d'action et un lien de texte riche mènent à l'aperçu des pages, qui présentent leurs brouillons sous le bandeau", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillon(db, "accueil", "presentation", {
    nature: "texte-riche",
    markdown: "Écrivez-nous : [Contact](/contact?sujet=devis#formulaire)",
  });
  await semerBrouillon(db, "contact", "presentation", {
    nature: "texte-riche",
    markdown: "Brouillon de la page Contact.",
  });
  await semerBrouillon(db, "tarifs", "presentation", {
    nature: "texte-riche",
    markdown: "Brouillon de la page Tarifs.",
  });

  const corps = await (await apercu("", cookie)).text();
  const trouves = liens(corps);

  expect(trouves).toContain("/admin/apercu/tarifs");
  expect(trouves).toContain("/admin/apercu/contact");
  expect(trouves).toContain("/admin/apercu/contact?sujet=devis#formulaire");
  expect(
    balise(corps, /<a class="bouton-action"[^>]*>/),
  ).toContain('href="/admin/apercu/contact"');
  expect(trouves).not.toContain("/tarifs");
  expect(trouves).not.toContain("/contact");

  const tarifs = await apercu("tarifs", cookie);
  const contact = await apercu("contact", cookie);
  const corpsTarifs = await tarifs.text();
  const corpsContact = await contact.text();
  expect(tarifs.status).toBe(200);
  expect(contact.status).toBe(200);
  expect(corpsTarifs).toContain(BANDEAU);
  expect(corpsTarifs).toContain("Brouillon de la page Tarifs.");
  expect(corpsContact).toContain(BANDEAU);
  expect(corpsContact).toContain("Brouillon de la page Contact.");
  expect(liens(corps)).toContain("/admin/apercu/");
});

it("SC-09f — dans l'aperçu, les liens vers réseau, vidéo, téléphone, e-mail et adresse non déclarée sont ceux de la page publique", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerBrouillon(db, "accueil", "presentation", {
    nature: "texte-riche",
    markdown:
      "[Ailleurs](https://exemple.org/page) [Sans page](/page-non-declaree) [Écrire](mailto:a@example.org)",
  });

  const corps = await (await apercu("", cookie)).text();
  const publiee = await (await publique("")).text();
  const externes = (html: string): string[] =>
    liens(html).filter((l) => /^(https?:|mailto:|tel:)/.test(l));

  const attendus = externes(publiee);
  expect(attendus.some((l) => l.startsWith("https://www.instagram.com"))).toBe(
    true,
  );
  expect(attendus.some((l) => l.includes("youtube"))).toBe(true);
  expect(attendus.some((l) => l.startsWith("tel:"))).toBe(true);
  expect(attendus.some((l) => l.startsWith("mailto:"))).toBe(true);
  for (const lien of attendus) {
    expect(liens(corps)).toContain(lien);
  }
  expect(liens(corps)).toContain("https://exemple.org/page");
  expect(liens(corps)).toContain("/page-non-declaree");
  expect(liens(corps)).toContain("mailto:a@example.org");
});

it("SC-09g — une image publiée, téléversée et décrite, que le site en service ne porte pas encore, paraît avec sa description, sans erreur", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerImageDecrite(db, "media-publiee-recente", "Tarte aux fraises");
  await semerPublie(db, "tarifs", "bandeau-tarifs", {
    nature: "image",
    mediaId: "media-publiee-recente",
  });

  const reponse = await apercu("tarifs", cookie);
  const corps = await reponse.text();
  const image = balise(corps, /<img\b[^>]*media-publiee-recente[^>]*>/);

  expect(reponse.status).toBe(200);
  expect(corps).not.toContain("ImageManquanteError");
  expect(image).toContain('src="/admin/medias/media-publiee-recente/octets"');
  expect(image).toContain('alt="Tarte aux fraises"');
});

it("une galerie en brouillon qui pose 60 images décrites paraît en entier dans l'aperçu d'Accueil", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  const ids = Array.from(
    { length: 60 },
    (_, n) => `media-lot-${String(n).padStart(2, "0")}`,
  );
  for (const [n, id] of ids.entries()) {
    await semerImageDecrite(db, id, `Réalisation ${String(n)}`);
  }
  await semerBrouillon(db, "accueil", "galerie-realisations", {
    nature: "galerie",
    mediaIds: ids,
  });

  const reponse = await apercu("", cookie);
  const corps = await reponse.text();

  expect(reponse.status).toBe(200);
  for (const [n, id] of ids.entries()) {
    const image = balise(corps, new RegExp(`<img\\b[^>]*${id}[^>]*>`));
    expect(image, id).toContain(`src="/admin/medias/${id}/octets"`);
    expect(image, id).toContain(`alt="Réalisation ${String(n)}"`);
  }
});

it("SC-09g — une image que le site en service porte déjà garde son adresse statique dans l'aperçu, avec sa description courante", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, publiee_le, description, description_publiee)
       values ('media-fixture-hero', 'media-fixture-hero.png', 'png', 1280, 640, 0, x'', ?1, ?2, ?3, ?4)`,
    )
    .bind(
      Date.now(),
      Date.now(),
      "Description courante en base",
      "Image d'accueil du site de démonstration",
    )
    .run();

  const publiee = await (await publique("tarifs")).text();
  const adresseStatique = /\bsrc="([^"]*)"/.exec(
    balise(publiee, /<img\b[^>]*media-fixture-hero[^>]*>/),
  )?.[1];
  const reponse = await apercu("tarifs", cookie);
  const corps = await reponse.text();
  const image = balise(corps, /<img\b[^>]*media-fixture-hero[^>]*>/);

  expect(adresseStatique, "adresse statique de la page publique").toMatch(
    /media-fixture-hero/,
  );
  expect(reponse.status).toBe(200);
  expect(image).toContain(`src="${adresseStatique ?? ""}"`);
  expect(adresseStatique).not.toBe("/admin/medias/media-fixture-hero/octets");
  expect(image).toContain('alt="Description courante en base"');
});

it("SC-09c — une image téléversée et décrite, posée sans publier dans une galerie, paraît dans l'aperçu avec sa description", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerImageDecrite(db, "media-galerie", "Pièce montée");
  await semerBrouillon(db, "accueil", "galerie-realisations", {
    nature: "galerie",
    mediaIds: ["media-galerie"],
  });

  const reponse = await apercu("", cookie);
  const corps = await reponse.text();
  const image = balise(corps, /<img\b[^>]*media-galerie[^>]*>/);

  expect(reponse.status).toBe(200);
  expect(corps).not.toContain("ImageManquanteError");
  expect(image).toContain('src="/admin/medias/media-galerie/octets"');
  expect(image).toContain('alt="Pièce montée"');
});

it("SC-09c — une image téléversée et décrite, posée sans publier dans un carrousel, paraît dans l'aperçu avec sa description", async () => {
  const db = await assurerSchema();
  const cookie = await ouvrirSession(db);
  await semerImageDecrite(db, "media-carrousel", "Logo d'un client");
  await semerBrouillon(db, "contact", "carrousel-clients", {
    nature: "carrousel",
    mediaIds: ["media-carrousel"],
  });

  const reponse = await apercu("contact", cookie);
  const corps = await reponse.text();
  const image = balise(corps, /<img\b[^>]*media-carrousel[^>]*>/);

  expect(reponse.status).toBe(200);
  expect(corps).not.toContain("ImageManquanteError");
  expect(image).toContain('src="/admin/medias/media-carrousel/octets"');
  expect(image).toContain(`alt="Logo d'un client"`);
});
