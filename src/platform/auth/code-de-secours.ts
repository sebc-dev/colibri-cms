/**
 * Le code de secours (change 016, ticket 01, ADR-0032) : seule l'empreinte
 * SHA-256 du code normalisé est conservée, sur une ligne unique. Module
 * autonome : il n'importe que `core/` (I1, I2).
 */
import { env } from 'cloudflare:workers';
import { engendrerCodeDeSecours, normaliserCode } from '../../core/auth/code.ts';

type Base = typeof env.DB;

let schemaAssure: Promise<unknown> | null = null;

/** Rejoue la définition de la migration 0016 (sans effet si elle est déjà là). */
async function assurerSchema(db: Base): Promise<void> {
  schemaAssure ??= db
    .prepare('create table if not exists code_de_secours (id integer primary key check (id = 1), empreinte text not null, cree_le integer not null)')
    .run();
  try {
    await schemaAssure;
  } catch (erreur) {
    schemaAssure = null;
    throw erreur;
  }
}

/** SHA-256 hexadécimal du code normalisé. */
async function empreinteDuCode(code: string): Promise<string> {
  const condense = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normaliserCode(code)));
  return Array.from(new Uint8Array(condense), (o) => o.toString(16).padStart(2, '0')).join('');
}

/**
 * Met en place un code de secours neuf (remplace l'éventuel précédent) et le
 * rend, une seule fois, à l'appelant. Dans le même lot atomique, toute session
 * autre que `sessionCourante` est fermée : la validité d'une session est la
 * présence de sa ligne (ADR-0001).
 */
export async function mettreEnPlaceCodeDeSecours(
  db: Base,
  sessionCourante: { readonly id: string },
  maintenant: number,
): Promise<string> {
  await assurerSchema(db);
  await assurerTableSessions(db);
  const code = engendrerCodeDeSecours();
  const empreinte = await empreinteDuCode(code);
  await db.batch([
    db
      .prepare(
        'insert into code_de_secours (id, empreinte, cree_le) values (1, ?1, ?2) on conflict(id) do update set empreinte = excluded.empreinte, cree_le = excluded.cree_le',
      )
      .bind(empreinte, maintenant),
    db.prepare('delete from sessions where id <> ?1').bind(sessionCourante.id),
  ]);
  return code;
}

/** L'état du code : en place depuis `depuis` (date de mise en place), ou absent. */
export async function lireEtatCodeDeSecours(db: Base): Promise<{ enPlace: false } | { enPlace: true; depuis: number }> {
  await assurerSchema(db);
  const ligne = await db.prepare('select cree_le from code_de_secours where id = 1').first<{ cree_le: number }>();
  return ligne ? { enPlace: true, depuis: ligne.cree_le } : { enPlace: false };
}

let schemaSessionsAssure: Promise<unknown> | null = null;

/** Même garde défensif que `magasin.ts` (I1 interdit de l'importer). */
async function assurerTableSessions(db: Base): Promise<void> {
  schemaSessionsAssure ??= db
    .prepare('create table if not exists sessions (id text primary key, identifiant_appareil text not null, creee_le integer not null)')
    .run();
  try {
    await schemaSessionsAssure;
  } catch (erreur) {
    schemaSessionsAssure = null;
    throw erreur;
  }
}

function jetonAleatoire(): string {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

/**
 * Ouvre une session si la saisie est le code de secours en place (ADR-0032),
 * ferme les autres sessions et met un nouveau code en place, en un seul lot
 * atomique. Le succès se lit au nombre de lignes changées par l'insertion.
 */
export async function ouvrirSessionParCodeDeSecours(
  db: Base,
  saisie: string,
  identifiantAppareil: string | undefined,
  maintenant: number,
): Promise<{ reussi: true; jeton: string; nouveauCode: string } | { reussi: false }> {
  await assurerSchema(db);
  await assurerTableSessions(db);
  const ancienne = await empreinteDuCode(saisie);
  const jeton = jetonAleatoire();
  const nouveauCode = engendrerCodeDeSecours();
  const nouvelle = await empreinteDuCode(nouveauCode);
  const appareil = identifiantAppareil !== undefined && identifiantAppareil !== '' ? identifiantAppareil : crypto.randomUUID();
  const lot = await db.batch([
    db
      .prepare(
        'insert into sessions (id, identifiant_appareil, creee_le) select ?1, ?2, ?3 where exists (select 1 from code_de_secours where id = 1 and empreinte = ?4)',
      )
      .bind(jeton, appareil, maintenant, ancienne),
    db
      .prepare('delete from sessions where id <> ?1 and exists (select 1 from sessions where id = ?1)')
      .bind(jeton),
    db
      .prepare('update code_de_secours set empreinte = ?1, cree_le = ?2 where id = 1 and empreinte = ?3')
      .bind(nouvelle, maintenant, ancienne),
  ]);
  const ouverture = lot[0] as { meta?: { changes?: number } } | undefined;
  return ouverture?.meta?.changes === 1 ? { reussi: true, jeton, nouveauCode } : { reussi: false };
}
