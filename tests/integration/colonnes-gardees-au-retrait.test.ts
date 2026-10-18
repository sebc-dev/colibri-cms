/**
 * Ticket 01 du change 013 — la base tient la règle du retrait (ADR-0030, points 5 et 6, I17).
 * Les colonnes de `demandes` sont lues dans la base elle-même (`PRAGMA table_info`) : hors la liste
 * fermée des cinq colonnes gardées, toute colonne non nulle sur une ligne `retiree` est refusée par
 * la base. Le test s'exerce deux fois : sur la table créée par le magasin seul (première requête
 * acceptée de la route), puis sur la table créée par la migration 0013. Les lignes s'écrivent en SQL
 * direct : le retrait n'existe pas encore (ticket 08).
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, beforeAll } from 'vitest';

const ORIGINE = 'https://example.com';
const CLE_LIAISON = 'EXPEDITEUR_CODE_CONNEXION';
const GARDEES = ['id', 'formulaire_id', 'formulaire_nom', 'suite', 'etat'];
const DELAI_TEST_MS = 60_000;

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}
interface Colonne {
  name: string;
  type: string;
}

const migrations = import.meta.glob('../../migrations/0013_demandes.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});

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

const VALEURS_CONNUES: Record<string, string | number> = {
  id: 'id-temoin',
  formulaire_id: 'devis-gateau',
  formulaire_nom: 'Devis gâteau',
  suite: 'a-renseigner',
  etat: 'presente',
  recue_le: 1_700_000_000_000,
  page_titre: 'Contact',
  total: 4000,
  contact: 'marie@exemple.fr',
  detail: '[]',
  courriel: 'non-parti',
};

function valeurDeLaColonne(colonne: Colonne): unknown {
  return VALEURS_CONNUES[colonne.name] ?? (/int/i.test(colonne.type) ? 1 : 'x');
}

async function lesColonnes(db: DBLike): Promise<Colonne[]> {
  return (await db.prepare('pragma table_info(demandes)').all()).results as Colonne[];
}

async function insererLigne(
  db: DBLike,
  id: string,
  etat: 'presente' | 'retiree',
  colonnes: Colonne[],
): Promise<void> {
  const noms = colonnes.map((c) => c.name);
  const valeurs = colonnes.map((c) => {
    if (c.name === 'id') return id;
    if (c.name === 'etat') return etat;
    return valeurDeLaColonne(c);
  });
  const marques = noms.map((_, i) => `?${String(i + 1)}`).join(', ');
  await db
    .prepare(`insert into demandes (${noms.join(', ')}) values (${marques})`)
    .bind(...valeurs)
    .run();
}

async function verifierLaRegleDuRetrait(db: DBLike): Promise<void> {
  const colonnes = await lesColonnes(db);
  const noms = colonnes.map((c) => c.name);
  for (const gardee of GARDEES) expect(noms, `colonne gardée ${gardee}`).toContain(gardee);
  const autres = colonnes.filter((c) => !GARDEES.includes(c.name));
  // Jamais de réussite à vide : la lecture doit rendre des colonnes hors des cinq.
  expect(autres.length).toBeGreaterThan(0);

  await db.prepare('delete from demandes').run();
  // Un témoin réduit aux cinq valeurs gardées est accepté.
  await db
    .prepare("insert into demandes (id, formulaire_id, formulaire_nom, suite, etat) values ('temoin', 'devis-gateau', 'Devis gâteau', 'commande', 'retiree')")
    .run();

  for (const colonne of autres) {
    // La colonne accepte sa valeur sur une demande présente…
    await insererLigne(db, `presente-${colonne.name}`, 'presente', colonnes);
    // …et la base la refuse sur une demande retirée.
    let refusee = false;
    try {
      await db
        .prepare(
          `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, ${colonne.name}) values (?1, 'devis-gateau', 'Devis gâteau', 'a-renseigner', 'retiree', ?2)`,
        )
        .bind(`retiree-${colonne.name}`, valeurDeLaColonne(colonne))
        .run();
    } catch {
      refusee = true;
    }
    expect(refusee, `colonne ${colonne.name} acceptée sur une demande retirée`).toBe(true);
  }
  await db.prepare('delete from demandes').run();
}

beforeAll(async () => {
  const db = obtenirDB();
  await db.prepare('create table if not exists comptes_seuil (surface text not null, empreinte blob not null, nombre integer not null, primary key (surface, empreinte))').run();
  const module = await import('../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw');
  for (const requete of separerRequetes(module.default)) await db.prepare(requete).run();
});

it(
  'SC-01a — table créée par le magasin seul : hors les cinq colonnes gardées, toute colonne non nulle d’une demande retirée est refusée par la base',
  async () => {
    const db = obtenirDB();
    await db.prepare('drop table if exists demandes').run();
    await db.prepare('delete from adresses_autorisees').run();
    await db.prepare('delete from comptes_seuil').run();
    await db.prepare("insert into adresses_autorisees (adresse) values ('editrice@example.com')").run();
    const enveloppe = env as unknown as Record<string, unknown>;
    const precedente = enveloppe[CLE_LIAISON];
    enveloppe[CLE_LIAISON] = { send: () => Promise.resolve() };
    try {
      const reponse = await exports.default.fetch(
        new Request(`${ORIGINE}/api/public/demandes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: ORIGINE },
          body: JSON.stringify({
            formulaire: 'devis-gateau',
            page: 'contact',
            valeurs: { parfum: ['fraise'], courriel: 'marie@exemple.fr' },
            totalAffiche: 1000,
          }),
        }),
      );
      expect(reponse.status).toBe(200);
    } finally {
      enveloppe[CLE_LIAISON] = precedente;
    }

    await verifierLaRegleDuRetrait(db);
  },
  DELAI_TEST_MS,
);

it(
  'SC-01a — table créée par la migration 0013 : hors les cinq colonnes gardées, toute colonne non nulle d’une demande retirée est refusée par la base',
  async () => {
    const db = obtenirDB();
    const sql: string | undefined = Object.values(migrations).at(0);
    expect(sql, 'migrations/0013_demandes.sql absente').toBeDefined();
    await db.prepare('drop table if exists demandes').run();
    for (const requete of separerRequetes(sql ?? '')) await db.prepare(requete).run();

    await verifierLaRegleDuRetrait(db);
  },
  DELAI_TEST_MS,
);
