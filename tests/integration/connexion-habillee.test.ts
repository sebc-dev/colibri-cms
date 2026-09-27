/**
 * Ticket 06 — L'écran de connexion habillé (openspec/changes/
 * 005-mise-en-page-administration/tickets/06-connexion-habillee.md).
 *
 * Mode `test` (test-after) : `src/pages/admin/connexion.astro` est déjà
 * réécrit avec les composants `card`/`input`/`label`/`alert`/`button` de
 * `src/admin/composants/ui/` (SSR pur, sans `client:*`, `I4`/ADR-0006). Ce
 * fichier ne fait qu'observer le comportement rendu — aucun code de
 * production n'est modifié ici.
 *
 * Couture retenue (héritée des tickets 03-07, SPEC.md § Décisions de test,
 * ADR-0003) : requête HTTP réelle via `exports.default.fetch` contre le
 * worker compilé, dans `workerd`, contre la vraie D1 locale — jamais de
 * double interne. La migration
 * `migrations/0002_adresses_autorisees_et_codes_connexion.sql` est rejouée
 * et des lignes de `codes_connexion` sont semées directement (comme aux
 * tickets 05/07) pour construire, sans attendre une heure réelle, un
 * plafond atteint.
 *
 * **Couverture volontairement partielle (cf. brief § gaps).** Le ticket
 * distingue lui-même, dans sa section « Preuve attendue (partie aspect) »,
 * ce qu'une requête HTTP en `workerd` ne peut pas trancher : la largeur
 * réelle de la carte et l'absence de défilement horizontal à 360 px
 * (SC-06f), la zone de toucher effective de 44 × 44 px (SC-06g) et le
 * contraste réel des textes (SC-06h) ne se jugent que sur l'artefact bâti
 * (`npm run build` puis `wrangler dev`), à l'outillage d'accessibilité du
 * navigateur ou sur un vrai téléphone — jamais par une assertion sur une
 * chaîne de classes, qui ne prouverait rien de plus que la présence de la
 * classe elle-même (tautologique). Ces trois critères restent donc **hors
 * de ce fichier**, par une limite du moyen de vérification et non par
 * oubli — la preuve correspondante est apportée ailleurs, sur l'artefact
 * bâti. SC-06a à SC-06e, en revanche, se lisent entièrement dans le
 * balisage rendu et sont couverts ci-dessous.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach } from "vitest";

const NOM_COOKIE_APPAREIL = "identifiant-appareil";
const NOM_COOKIE_SESSION = "__Host-session";
const TABLE_CODES = "codes_connexion";
const PLAFOND = 5;

interface DBLike {
  exec(query: string): Promise<unknown>;
  prepare(query: string): {
    bind(...valeurs: unknown[]): { run(): Promise<unknown> };
    run(): Promise<unknown>;
    all(): Promise<{ results: unknown[] }>;
  };
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

let migrationAppliquee: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  migrationAppliquee ??= (async () => {
    const module =
      await import("../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw");
    for (const requete of separerRequetes(module.default)) {
      await db.prepare(requete).run();
    }
  })();
  await migrationAppliquee;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  try {
    await db.prepare(`delete from ${TABLE_CODES}`).run();
  } catch (erreur) {
    console.warn("nettoyage D1 ignoré (schéma absent) :", erreur);
  }
});

/** Sème une ligne « saine » de `codes_connexion`, écrite à l'instant (héritée du ticket 05). */
async function semerLigneSaine(db: DBLike): Promise<void> {
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le, essais, annule_le) values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      `appareil-de-semis-${crypto.randomUUID()}`,
      "empreinte-de-semis",
      "sel-de-semis",
      maintenant,
      maintenant + 15 * 60 * 1000,
      0,
      null,
    )
    .run();
}

async function semerLignesSaines(db: DBLike, n: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await semerLigneSaine(db);
  }
}

function extraireCookieValeur(reponse: Response, nom: string): string | null {
  for (const entete of reponse.headers.getSetCookie()) {
    const [paire] = entete.split(";").map((s) => s.trim());
    const [cle, valeur] = paire.split("=");
    if (cle === nom) return valeur;
  }
  return null;
}

async function afficherEcranDeConnexion(
  cookieExistant?: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request("https://example.com/admin/connexion", {
      headers: cookieExistant
        ? { cookie: `${NOM_COOKIE_APPAREIL}=${cookieExistant}` }
        : {},
    }),
  );
}

async function obtenirIdentifiantAppareil(): Promise<string> {
  const reponse = await afficherEcranDeConnexion();
  const cookie = extraireCookieValeur(reponse, NOM_COOKIE_APPAREIL);
  if (!cookie) {
    throw new Error(
      `l'écran de connexion n'a posé aucun cookie « ${NOM_COOKIE_APPAREIL} » — impossible d'obtenir un identifiant d'appareil pour préparer ce test`,
    );
  }
  return cookie;
}

async function soumettreCode(
  saisie: string,
  identifiantAppareil: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request("https://example.com/admin/connexion", {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://example.com",
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
      },
      body: `code=${encodeURIComponent(saisie)}`,
    }),
  );
}

async function soumettreAdresse(
  adresse: string,
  identifiantAppareil: string,
): Promise<Response> {
  return exports.default.fetch(
    new Request("https://example.com/admin/connexion", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://example.com",
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiantAppareil}`,
      },
      body: `adresse=${encodeURIComponent(adresse)}`,
    }),
  );
}

/** Extrait la balise `<input …>` portant `id="idRecherche"`, quel que soit l'ordre de ses attributs. */
function extraireBaliseInput(corps: string, idRecherche: string): string {
  const motif = new RegExp(`<input\\b[^>]*\\bid="${idRecherche}"[^>]*>`);
  const trouve = motif.exec(corps);
  if (!trouve) {
    throw new Error(
      `aucune balise <input id="${idRecherche}"> trouvée dans le corps rendu`,
    );
  }
  return trouve[0];
}

// --- SC-06a — logo, titre, deux étapes, chacune avec libellé visible et bouton ---

it("SC-06a — l’écran de connexion présente le logo, le titre « Connexion », l’étape d’adresse et l’étape de code, chacune avec son libellé visible et son bouton", async () => {
  const reponse = await afficherEcranDeConnexion();
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();

  // Le logo, sous forme de SVG inerte (ticket 02).
  expect(corps).toContain('aria-label="Colibri CMS"');

  // Le titre.
  expect(corps).toContain("<h1>Connexion</h1>");

  // L'étape d'adresse : libellé visible puis bouton.
  expect(corps).toMatch(/<label[^>]*for="adresse"[^>]*>Adresse/);
  expect(corps).toContain('id="adresse"');
  expect(corps).toContain("Recevoir un code");

  // L'étape de code : libellé visible puis bouton.
  expect(corps).toMatch(/<label[^>]*for="code"[^>]*>Code/);
  expect(corps).toContain('id="code"');
  expect(corps).toContain("Se connecter");

  // Chaque étape est bien un formulaire distinct, toutes deux affichées ensemble.
  expect(corps.match(/<form method="post"/g)?.length).toBe(2);
});

// --- SC-06b — plafond atteint : message d'attente seul, en ton d'avertissement, sans champ ni bouton ---

it("SC-06b — quand le plafond de demandes est atteint, le message d’attente s’affiche dans la carte, en ton d’avertissement, sans champ ni bouton", async () => {
  const db = await assurerSchema();
  await semerLignesSaines(db, PLAFOND);
  const identifiantAppareil = await obtenirIdentifiantAppareil();

  const reponse = await soumettreAdresse(
    "quelquun-dautre@example.com",
    identifiantAppareil,
  );
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();

  // Le message d'attente, en ton d'avertissement (ambre).
  expect(corps).toContain(
    "Trop de demandes de connexion ont déjà été envoyées récemment",
  );
  expect(corps).toMatch(/data-slot="alert"[^>]*class="[^"]*bg-ambre-soft/);
  expect(corps).toMatch(
    /data-slot="alert-description"[^>]*class="[^"]*text-ambre/,
  );

  // Rien d'autre dans la carte : ni champ, ni bouton, ni formulaire.
  expect(corps).not.toContain("<form");
  expect(corps).not.toContain("<input");
  expect(corps).not.toContain("<button");
});

// --- SC-06c — attributs de clavier/suggestion sur les deux champs ---

it('SC-06c — le champ d’adresse appelle un clavier d’adresse e-mail (type="email", autocomplete="email") et le champ de code propose le code reçu en suggestion (autocomplete="one-time-code")', async () => {
  const reponse = await afficherEcranDeConnexion();
  const corps = await reponse.text();

  const baliseAdresse = extraireBaliseInput(corps, "adresse");
  expect(baliseAdresse).toContain('type="email"');
  expect(baliseAdresse).toContain('autocomplete="email"');

  const baliseCode = extraireBaliseInput(corps, "code");
  expect(baliseCode).toContain('inputmode="text"');
  expect(baliseCode).toContain('autocomplete="one-time-code"');
});

// --- SC-06d — un code refusé s'affiche en danger, sous l'étape de code, avec son texte ---

it("SC-06d — un code refusé s’affiche en danger, sous l’étape de code, avec son texte", async () => {
  const identifiantAppareil = await obtenirIdentifiantAppareil();

  // Aucune ligne semée pour cet appareil : le verdict est « introuvable » (déjà couvert
  // structurellement au ticket 07) — ce test-ci porte sur l'habillage du refus, pas sur
  // la nature du refus.
  const reponse = await soumettreCode("99999999", identifiantAppareil);
  expect(reponse.status).toBe(200);
  expect(extraireCookieValeur(reponse, NOM_COOKIE_SESSION)).toBeNull();
  const corps = await reponse.text();

  // Le rendu échappe l'apostrophe droite en entité HTML (`&#39;`) — l'ancre reste le
  // texte du geste (`src/admin/textes.ts`), sans dépendre de cet échappement.
  const texteRefusAttendu =
    "Ce code n&#39;est pas reconnu. Vérifiez-le et retapez-le.";
  expect(corps).toContain(texteRefusAttendu);
  // En ton « danger » (destructive) : c'est ce mappage de classe qui distingue le refus
  // du reste de l'écran (I14 — jamais de couleur littérale, seul le token compte).
  expect(corps).toMatch(/data-slot="alert"[^>]*class="[^"]*text-destructive/);

  // Sous l'étape de code : après l'annonce de portée du code (propre à cette étape),
  // avant le libellé/champ du code lui-même.
  const indexAnnonceEtapeCode = corps.indexOf("Seul le dernier code demandé");
  const indexRefus = corps.indexOf(texteRefusAttendu);
  const indexLibelleCode = corps.search(/<label[^>]*for="code"/);
  expect(indexAnnonceEtapeCode).toBeGreaterThan(-1);
  expect(indexRefus).toBeGreaterThan(indexAnnonceEtapeCode);
  expect(indexRefus).toBeLessThan(indexLibelleCode);
});

// --- SC-06e — thème Colibri : titre en famille d'affichage, action principale en plumage ---

it("SC-06e — l’écran de connexion porte le thème Colibri : titre dans un véritable <h1> (famille d’affichage Fraunces posée par admin.css), action principale en plumage, aucune couleur littérale dans le balisage", async () => {
  const reponse = await afficherEcranDeConnexion();
  const corps = await reponse.text();

  // Le titre est un véritable élément de titrage — c'est le sélecteur `h1` d'admin.css
  // (déjà en place, ticket 02) qui lui applique la famille d'affichage Fraunces ; un
  // titre rendu dans un `<div>` ou un `<p>` échapperait à cette règle.
  expect(corps).toMatch(/<h1>Connexion<\/h1>/);

  // Les deux actions principales utilisent la variante par défaut du bouton, mappée sur
  // le token `--primary` (== `--plumage`, admin.css) — jamais une variante secondaire ou
  // destructive pour un geste qui fait avancer l'étape.
  const balisesOuvrantesBoutons = [...corps.matchAll(/<button\b[^>]*>/g)];
  expect(balisesOuvrantesBoutons).toHaveLength(2);
  for (const balise of balisesOuvrantesBoutons) {
    expect(balise[0]).toContain("bg-primary");
  }

  // Tokens seulement (I14) : aucune couleur littérale (hex ou rgb()) dans le balisage
  // rendu par cet écran — seule référence de couleur admise, une variable CSS (le logo).
  expect(corps).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  expect(corps).not.toMatch(/rgb\(/);
});
