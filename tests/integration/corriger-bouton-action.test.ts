/**
 * Ticket 04 — Corriger un emplacement de bouton d'action
 * (openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md).
 *
 * Couture retenue, à l'image de `liste-des-pages.test.ts` (ticket 02) :
 * requête HTTP réelle via `exports.default.fetch` contre le worker compilé, dans
 * `workerd`, contre la vraie D1 locale (ADR-0003) — jamais de double
 * interne. Les migrations `0003_sessions.sql` et
 * `0004_brouillons_emplacements.sql` sont rejouées ici même (aucune n'est
 * jouée d'office, docs/test.md § Écrire un test d'intégration), une session
 * valide est semée directement (même geste que `fin-de-session.test.ts`).
 *
 * `content/pages/accueil/page.json` porte un emplacement de bouton d'action
 * réel (`bouton-devis`) : ce fichier ne sème aucune fixture de déclaration,
 * il s'appuie sur celle déjà posée (ADR-0012), comme `liste-des-pages.test.ts`.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach, describe } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const ROUTE_ACCUEIL_BOUTON = 'https://example.com/admin/pages/accueil/emplacements/bouton-devis';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';
const ROUTE_EDITEUR_ACCUEIL = 'https://example.com/admin/pages/accueil';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
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
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const sessions = await import('../../migrations/0003_sessions.sql?raw');
    for (const requete of separerRequetes(sessions.default)) {
      await db.prepare(requete).run();
    }
    try {
      await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
    } catch {
      // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
    }
    const brouillons = await import('../../migrations/0004_brouillons_emplacements.sql?raw');
    for (const requete of separerRequetes(brouillons.default)) {
      await db.prepare(requete).run();
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-corriger-bouton-action-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function corrigerLeBouton(
  cookieSession: string | null,
  corps: unknown,
): Promise<Response> {
  return exports.default.fetch(new Request(ROUTE_ACCUEIL_BOUTON, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
    },
    body: JSON.stringify(corps),
  }));
}

// --- SC-04d — la migration crée une table qui lie le brouillon à l'emplacement
// déclaré par son identité stable (page_slug, id_emplacement) ---

describe('SC-04d — la table des brouillons, créée par la migration 0004, lie le brouillon à l’identité stable (page, emplacement)', () => {
  it('SC-04d — la migration 0004 crée une table dont la clé (page_slug, id_emplacement) est unique', async () => {
    // Arrange
    const db = await assurerSchema();

    // Act : une première ligne pour ce couple (page, emplacement) s'insère…
    await db
      .prepare(
        `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind('accueil', 'bouton-devis', 'bouton-action', '{"libelle":"A"}', 1)
      .run();

    // …mais une seconde ligne pour le MÊME couple, sans upsert, viole la clé —
    // c'est ce qui prouve que la table lie le brouillon à cette identité stable,
    // et non à une clé générée séparément.
    await expect(
      db
        .prepare(
          `insert into ${TABLE_BROUILLONS} (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind('accueil', 'bouton-devis', 'bouton-action', '{"libelle":"B"}', 2)
        .run(),
    ).rejects.toBeTruthy();

    // Assert : une seule ligne existe bien pour ce couple, portant la première valeur.
    const resultat = await db
      .prepare(`select contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
      .bind('accueil', 'bouton-devis')
      .all();
    expect(resultat.results).toHaveLength(1);
    expect((resultat.results as { contenu: string }[]).at(0)?.contenu).toBe('{"libelle":"A"}');
  });
});

// --- SC-04e — enregistrer une correction persiste le brouillon et laisse
// l'état publié intact, par la couture HTTP réelle ---

it('SC-04e — enregistrer une correction de bouton la persiste en D1 et laisse la déclaration publiée intacte', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);

  // Act
  const reponse = await corrigerLeBouton(cookieSession, {
    libelle: 'Obtenir un devis gratuit',
    destination: 'https://exemple.test/devis',
  });

  // Assert : la réponse confirme l'enregistrement…
  expect(reponse.status).toBe(200);
  const corpsReponse = (await reponse.json()) as { ok: boolean };
  expect(corpsReponse.ok).toBe(true);

  // …la ligne existe bien en D1, sous l'identité stable (page, emplacement)…
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('accueil', 'bouton-devis')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({
    nature: 'bouton-action',
    libelle: 'Obtenir un devis gratuit',
    destination: 'https://exemple.test/devis',
  });

  // …et la déclaration versionnée (l'état publié) n'a pas bougé : lue depuis
  // `content/pages/accueil/page.json` (jamais depuis le brouillon), elle
  // porte toujours le libellé et la destination d'origine de l'intégrateur.
  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const pageDeclaree = obtenirPageAvecEmplacements('accueil');
  const boutonDeclare = pageDeclaree?.emplacements.find((emplacement) => emplacement.id === 'bouton-devis');
  expect(boutonDeclare).toMatchObject({ libelle: 'Demander un devis', destination: '/contact' });
});

// --- SC-04f — après enregistrement, la pastille apparaît sur la liste des
// pages et dans le fil de retour de l'éditeur ---

it('SC-04f — après enregistrement, la pastille de brouillon apparaît sur la liste des pages et dans le fil de retour de l’éditeur', async () => {
  // Arrange : avant toute correction, aucune pastille pour « accueil ».
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  const listeAvant = await exports.default.fetch(new Request(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const corpsListeAvant = await listeAvant.text();
  const ligneAccueilAvant = /<li>Accueil[\s\S]*?<\/li>/.exec(corpsListeAvant)?.[0] ?? '';
  expect(ligneAccueilAvant).not.toMatch(/data-pastille-brouillon/);

  // Act : la correction s'enregistre…
  const reponseCorrection = await corrigerLeBouton(cookieSession, {
    libelle: 'Obtenir un devis gratuit',
    destination: '/contact',
  });
  expect(reponseCorrection.status).toBe(200);

  // Assert : … la ligne « Accueil » de la liste porte désormais la pastille…
  const listeApres = await exports.default.fetch(new Request(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const corpsListeApres = await listeApres.text();
  const ligneAccueilApres = /<li>Accueil[\s\S]*?<\/li>/.exec(corpsListeApres)?.[0] ?? '';
  expect(ligneAccueilApres).toMatch(/data-pastille-brouillon/);

  // …et le fil de retour de l'`Écran : Éditeur de page` la porte aussi, sans
  // qu'aucune autre page non corrigée n'en porte une.
  const editeurApres = await exports.default.fetch(new Request(ROUTE_EDITEUR_ACCUEIL, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  }));
  const corpsEditeurApres = await editeurApres.text();
  const zonePastilleEditeur =
    /<span id="zone-pastille-brouillon">[\s\S]*?<\/span>\s*<\/h1>/.exec(corpsEditeurApres)?.[0] ?? '';
  expect(zonePastilleEditeur).toMatch(/data-pastille-brouillon/);

  const ligneContactApres = /<li>Contact[\s\S]*?<\/li>/.exec(corpsListeApres)?.[0] ?? '';
  expect(ligneContactApres).not.toMatch(/data-pastille-brouillon/);
});

// --- SC-04g — une écriture forgée depuis une autre origine n'aboutit pas :
// seul le cookie de session valide ouvre l'accès, aucun repli n'existe ---

describe('SC-04g — une écriture sans le cookie de session valide n’aboutit jamais', () => {
  it('SC-04g — une requête sans cookie de session est rejetée avant toute écriture', async () => {
    // Arrange
    const db = await assurerSchema();

    // Act : aucun cookie du tout — le cas d'une requête forgée depuis une
    // autre origine, que le navigateur n'attache jamais à ce cookie
    // `SameSite=Strict` (ADR-0011).
    const reponse = await corrigerLeBouton(null, { libelle: 'Forgé', destination: '/forge' });

    // Assert : refusée, et rien n'a été écrit.
    expect(reponse.status).toBe(401);
    const lignes = await db
      .prepare(`select 1 from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
      .bind('accueil', 'bouton-devis')
      .all();
    expect(lignes.results).toHaveLength(0);
  });

  it('SC-04g — un cookie de session inconnu (jeton forgé) est rejeté, sans aucun repli sur un autre en-tête ou paramètre', async () => {
    // Arrange
    const db = await assurerSchema();

    // Act : un jeton qui ne correspond à aucune ligne de `sessions`, tenté
    // à la fois comme cookie ET comme en-tête/paramètre d'URL — aucun de ces
    // replis n'est jamais lu par la route (ADR-0011, aucun jeton dédié).
    const reponse = await exports.default.fetch(new Request(`${ROUTE_ACCUEIL_BOUTON}?session=jeton-invente`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${NOM_COOKIE_SESSION}=jeton-invente-aussi`,
        'x-session-id': 'jeton-invente-encore',
      },
      body: JSON.stringify({ libelle: 'Forgé', destination: '/forge' }),
    }));

    // Assert : refusée, et rien n'a été écrit.
    expect(reponse.status).toBe(401);
    const lignes = await db
      .prepare(`select 1 from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
      .bind('accueil', 'bouton-devis')
      .all();
    expect(lignes.results).toHaveLength(0);
  });
});
