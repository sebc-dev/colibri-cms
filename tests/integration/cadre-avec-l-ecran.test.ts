/**
 * Ticket 03 — Le cadre de l'administration arrive avec l'écran
 * (openspec/changes/005-mise-en-page-administration/tickets/03-cadre-avec-l-ecran.md).
 *
 * Couture retenue, même patron que `liste-des-pages.test.ts` (ticket 02) et
 * `politique-de-securite.test.ts` (ADR-0003/ADR-0014) : requête HTTP réelle
 * via `exports.default.fetch` contre le worker compilé, dans `workerd`,
 * contre la vraie D1 locale — jamais de double interne, jamais de lecture
 * du gabarit par import direct : on ne teste que ce qu'une vraie réponse
 * HTTP porte, avant toute exécution de script par un navigateur (`workerd`
 * n'en exécute aucun, ce qui rend SC-03b directement observable).
 *
 * Les migrations `0003_sessions.sql`, `0005_medias_brouillon.sql` et
 * `0006_medias_brouillon_affichage.sql` sont rejouées ici même (aucune
 * n'est jouée d'office). Une session valide est semée directement en D1
 * (même geste que les fichiers voisins), et une image en brouillon est
 * semée pour atteindre l'`Écran : Fiche d'une image`
 * (`/admin/medias/:id`). L'`Écran : Éditeur de page` est atteint via le
 * `page.json` réel `content/pages/accueil/page.json` (ADR-0012 : la
 * déclaration est un geste d'intégration, jamais un geste de test qui
 * l'imiterait par un double).
 *
 * Les quatre écrans cadrés par ce ticket, avec la rubrique et le libellé de
 * menu qu'ils doivent marquer active (SC-03a) :
 *   - `/admin/mes-pages`        → « mes-pages » / « Mes pages »
 *   - `/admin/pages/accueil`    → « mes-pages » / « Mes pages »
 *   - `/admin/medias`           → « medias »    / « Médias »
 *   - `/admin/medias/:id`       → « medias »    / « Médias »
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_SESSIONS = "sessions";
const TABLE_MEDIAS = "medias_brouillon";

interface InstructionLike {
  bind(...valeurs: unknown[]): {
    run(): Promise<unknown>;
    all(): Promise<{ results: unknown[] }>;
  };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
    for (const requete of separerRequetes(sessions.default)) {
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
    const medias =
      await import("../../migrations/0005_medias_brouillon.sql?raw");
    for (const requete of separerRequetes(medias.default)) {
      await db.prepare(requete).run();
    }
    const affichage =
      await import("../../migrations/0006_medias_brouillon_affichage.sql?raw");
    for (const requete of separerRequetes(affichage.default)) {
      try {
        await db.prepare(requete).run();
      } catch {
        // colonne déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
      }
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_MEDIAS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(
        `nettoyage D1 ignoré pour ${table} (schéma absent) :`,
        erreur,
      );
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-cadre-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "appareil-de-test", maintenant, maintenant)
    .run();
  return id;
}

/** Sème directement une image en brouillon, pour atteindre sa fiche. */
async function semerMediaBrouillon(db: DBLike): Promise<string> {
  const id = `media-cadre-${crypto.randomUUID()}`;
  const octets = new Uint8Array([1, 2, 3, 4]);
  await db
    .prepare(
      `insert into ${TABLE_MEDIAS} (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(id, "photo.png", "png", 10, 10, octets.length, octets, Date.now())
    .run();
  return id;
}

async function accederA(
  route: string,
  cookieSession: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request(`https://example.com${route}`, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
    }),
  );
}

interface EcranCadre {
  readonly nom: string;
  readonly route: string;
  readonly rubriqueAttendue: "mes-pages" | "medias";
  readonly libelleAttendu: "Mes pages" | "Médias";
  /** Un fragment qui prouve que le CONTENU propre de l'écran est bien présent. */
  readonly marqueurContenu: string;
}

/**
 * Prépare les quatre écrans cadrés pour un test donné : sème une image en
 * brouillon (fraîche à chaque appel, puisque `afterEach` vide
 * `medias_brouillon`) pour que l'`Écran : Fiche d'une image` reste
 * atteignable.
 */
async function obtenirEcrans(db: DBLike): Promise<readonly EcranCadre[]> {
  const idMedia = await semerMediaBrouillon(db);
  return [
    {
      nom: "Mes pages",
      route: "/admin/mes-pages",
      rubriqueAttendue: "mes-pages",
      libelleAttendu: "Mes pages",
      marqueurContenu: "<h1>Mes pages</h1>",
    },
    {
      nom: "Éditeur de page",
      route: "/admin/pages/accueil",
      rubriqueAttendue: "mes-pages",
      libelleAttendu: "Mes pages",
      marqueurContenu: "Accueil",
    },
    {
      nom: "Médias",
      route: "/admin/medias",
      rubriqueAttendue: "medias",
      libelleAttendu: "Médias",
      marqueurContenu: 'id="ilot-medias"',
    },
    {
      nom: "Fiche d’une image",
      route: `/admin/medias/${idMedia}`,
      rubriqueAttendue: "medias",
      libelleAttendu: "Médias",
      marqueurContenu: 'id="ilot-fiche-media"',
    },
  ];
}

const RUBRIQUES_DU_MENU = [
  "Mes pages",
  "Médias",
  "Réglages",
  "Formulaires",
  "Demandes",
];
const RUBRIQUES_SANS_ECRAN = ["Réglages", "Formulaires", "Demandes"];

const REGEX_ASIDE =
  /<aside[^>]*aria-label="Menu de l'administration"[^>]*>([\s\S]*?)<\/aside>/;

function extraireMenu(corps: string): string {
  const correspondance = REGEX_ASIDE.exec(corps);
  expect(
    correspondance,
    'le menu (`<aside aria-label="Menu de l\'administration">`) devrait être présent',
  ).not.toBeNull();
  if (correspondance === null) throw new Error("menu absent");
  return correspondance[1];
}

function extraireLibelleActif(menu: string): string {
  const correspondance = /<a[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/.exec(
    menu,
  );
  expect(
    correspondance,
    'un lien du menu devrait porter aria-current="page"',
  ).not.toBeNull();
  if (correspondance === null) throw new Error("aucun lien actif");
  return correspondance[1];
}

function retirerLesScripts(corps: string): string {
  return corps.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");
}

// --- SC-03a — le menu marque active la rubrique de l'écran courant ---

it("SC-03a — sur chacun des quatre écrans cadrés, le menu porte les cinq rubriques et marque active la rubrique courante", async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  for (const ecran of await obtenirEcrans(db)) {
    const reponse = await accederA(ecran.route, cookieSession);
    expect(reponse.status, `${ecran.nom} devrait répondre 200`).toBe(200);
    const corps = await reponse.text();

    const menu = extraireMenu(corps);
    for (const libelle of RUBRIQUES_DU_MENU) {
      expect(
        menu,
        `${ecran.nom} : le menu devrait porter « ${libelle} »`,
      ).toContain(libelle);
    }

    // Une seule marque active, portée par le libellé attendu pour cet écran.
    const nombreDeMarques = (menu.match(/aria-current="page"/g) ?? []).length;
    expect(
      nombreDeMarques,
      `${ecran.nom} : une seule rubrique devrait être marquée active`,
    ).toBe(1);
    const libelleActif = extraireLibelleActif(menu);
    expect(
      libelleActif,
      `${ecran.nom} : la rubrique active devrait être « ${ecran.libelleAttendu} »`,
    ).toContain(ecran.libelleAttendu);
  }
});

// --- SC-03b — le logo, le menu et le contenu de l'écran arrivent dans la même réponse ---

it("SC-03b — la réponse du serveur porte déjà le logo, le menu marqué et le contenu de l’écran, sans attendre l’exécution d’un script", async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  for (const ecran of await obtenirEcrans(db)) {
    const reponse = await accederA(ecran.route, cookieSession);
    const corps = await reponse.text();

    // Retirer tout `<script>` de la réponse ne devrait rien changer à ce
    // qu'on y trouve : logo, menu et contenu sont posés dans le balisage
    // lui-même, jamais générés par un script exécuté après coup.
    const corpsSansScript = retirerLesScripts(corps);

    expect(
      corpsSansScript,
      `${ecran.nom} : le logo devrait être présent`,
    ).toContain('aria-label="Colibri CMS"');

    const menu = extraireMenu(corpsSansScript);
    expect(
      (menu.match(/aria-current="page"/g) ?? []).length,
      `${ecran.nom} : le menu devrait rester marqué sans script`,
    ).toBe(1);

    expect(
      corpsSansScript,
      `${ecran.nom} : le contenu propre de l’écran devrait être présent`,
    ).toContain(ecran.marqueurContenu);
  }
});

// --- SC-03c — seules « Mes pages » et « Médias » mènent à un écran, sans geste de structure ---

it("SC-03c — aucune rubrique autre que « Mes pages » et « Médias » ne mène à un écran, et le menu n’offre aucun geste de structure", async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  // Les trois autres rubriques ne mènent à aucun écran.
  for (const route of [
    "/admin/reglages",
    "/admin/formulaires",
    "/admin/demandes",
  ]) {
    const reponse = await accederA(route, cookieSession);
    expect(reponse.status, `${route} ne devrait mener à aucun écran`).not.toBe(
      200,
    );
  }

  for (const ecran of await obtenirEcrans(db)) {
    const reponse = await accederA(ecran.route, cookieSession);
    const corps = await reponse.text();
    const menu = extraireMenu(corps);

    // Les trois rubriques sans écran ne portent aucun lien.
    for (const libelle of RUBRIQUES_SANS_ECRAN) {
      const correspondance = new RegExp(
        `<a[^>]*>\\s*(?:<[^>]+>\\s*)*${libelle}`,
      ).exec(menu);
      expect(
        correspondance,
        `${ecran.nom} : « ${libelle} » ne devrait porter aucun lien`,
      ).toBeNull();
    }

    // Aucun geste d'ajout, de retrait, de déplacement ni de renommage.
    expect(
      menu,
      `${ecran.nom} : le menu ne devrait porter aucun <form>`,
    ).not.toMatch(/<form[\s>]/i);
    expect(
      menu,
      `${ecran.nom} : le menu ne devrait porter aucun <button>`,
    ).not.toMatch(/<button[\s>]/i);
    expect(
      menu,
      `${ecran.nom} : le menu ne devrait porter aucun <input>`,
    ).not.toMatch(/<input[\s>]/i);
    const menuMinuscule = menu.toLowerCase();
    for (const geste of [
      "ajouter une rubrique",
      "créer une rubrique",
      "supprimer",
      "renommer",
      "déplacer",
      "ajouter une page",
      "créer une page",
    ]) {
      expect(
        menuMinuscule,
        `${ecran.nom} : le menu ne devrait pas offrir « ${geste} »`,
      ).not.toContain(geste);
    }
  }
});

// --- SC-03d — aucun terme de développeur dans le menu ni les libellés du cadre ---

it("SC-03d — aucun terme de développeur ne paraît dans le menu ni dans les libellés du cadre", async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  const termesDeveloppeur = [
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
    "route",
    "slug",
    "props",
    "composant",
  ];

  for (const ecran of await obtenirEcrans(db)) {
    const reponse = await accederA(ecran.route, cookieSession);
    const corps = await reponse.text();
    const menu = extraireMenu(corps).toLowerCase();

    for (const terme of termesDeveloppeur) {
      expect(
        menu,
        `${ecran.nom} : le menu ne devrait pas contenir « ${terme} »`,
      ).not.toContain(terme);
    }
  }
});

// --- SC-03e — le cadre est servi sous la politique de sécurité stricte, sans script en ligne ni client:* ---

it("SC-03e — le cadre est servi sous la politique de sécurité stricte de l’administration, sans script en ligne ni directive client:*", async () => {
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  for (const ecran of await obtenirEcrans(db)) {
    const reponse = await accederA(ecran.route, cookieSession);
    const csp = reponse.headers.get("content-security-policy");

    expect(
      csp,
      `${ecran.nom} : une Content-Security-Policy devrait être posée`,
    ).toBeTruthy();
    expect(
      csp,
      `${ecran.nom} : script-src ne devrait pas porter unsafe-inline`,
    ).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(
      csp,
      `${ecran.nom} : la CSP ne devrait pas porter unsafe-eval`,
    ).not.toMatch(/unsafe-eval/);

    const corps = await reponse.text();

    // Le cadre lui-même (GabaritCadre.astro/MenuRubriques.astro, ce que ce
    // ticket ajoute) ne porte aucun `<script>` : à ce ticket, la barre
    // latérale n'a encore aucun comportement propre (le repli et le tiroir
    // arrivent au ticket suivant, 04). Un `<script>` de montage peut
    // subsister ailleurs dans la réponse (contenu de l'écran, hérité de
    // tickets antérieurs) — seul le cadre est sous la responsabilité de ce
    // ticket.
    const menu = extraireMenu(corps);
    expect(
      menu,
      `${ecran.nom} : le cadre ne devrait porter aucun <script>`,
    ).not.toMatch(/<script[\s>]/i);

    // Aucune directive `client:*` (Astro l'aurait consommée à la
    // compilation ; si elle fuitait dans le HTML servi, ce serait un signal
    // qu'un îlot est monté avec une directive d'hydratation, invariant
    // `I4`/ADR-0006).
    expect(
      corps,
      `${ecran.nom} : aucune directive client:* ne devrait fuiter dans la réponse`,
    ).not.toMatch(/client:(load|idle|visible|only|media)/);
  }
});
