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
 * rend, une seule fois, à l'appelant. `sessionCourante` est la session qui
 * fait le geste : réservée à la fermeture des autres sessions (ticket 06).
 */
export async function mettreEnPlaceCodeDeSecours(
  db: Base,
  sessionCourante: unknown,
  maintenant: number,
): Promise<string> {
  await assurerSchema(db);
  const code = engendrerCodeDeSecours();
  const empreinte = await empreinteDuCode(code);
  await db
    .prepare(
      'insert into code_de_secours (id, empreinte, cree_le) values (1, ?1, ?2) on conflict(id) do update set empreinte = excluded.empreinte, cree_le = excluded.cree_le',
    )
    .bind(empreinte, maintenant)
    .run();
  return code;
}

/** L'état du code : en place depuis `depuis` (date de mise en place), ou absent. */
export async function lireEtatCodeDeSecours(db: Base): Promise<{ enPlace: false } | { enPlace: true; depuis: number }> {
  await assurerSchema(db);
  const ligne = await db.prepare('select cree_le from code_de_secours where id = 1').first<{ cree_le: number }>();
  return ligne ? { enPlace: true, depuis: ligne.cree_le } : { enPlace: false };
}
