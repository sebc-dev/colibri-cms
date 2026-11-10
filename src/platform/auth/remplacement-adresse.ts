/**
 * Le remplacement de l'adresse autorisée en cours (change 017, ticket 02,
 * ADR-0033). Module autonome : il n'importe que `core/` (I1).
 */
import { env } from 'cloudflare:workers';

type Base = typeof env.DB;

let schemaAssure: Promise<unknown> | null = null;

/** Rejoue la définition de la migration 0017 (sans effet si elle est déjà là). */
async function assurerSchema(db: Base): Promise<void> {
  schemaAssure ??= db.batch([
    db.prepare(
      'create table if not exists remplacement_adresse (id integer primary key check (id = 1), adresse text not null, session text not null, ouvert_le integer not null)',
    ),
    db.prepare(
      'create table if not exists codes_remplacement (id integer primary key autoincrement, empreinte text not null, sel text not null, session text not null, creee_le integer not null, expire_le integer not null, essais integer not null default 0, utilise_le integer, annule_le integer)',
    ),
    db.prepare('create table if not exists messages_remplacement (envoye_le integer not null)'),
  ]);
  try {
    await schemaAssure;
  } catch (erreur) {
    schemaAssure = null;
    throw erreur;
  }
}

/** Ouvre (ou remplace) le remplacement en cours, rattaché à la session, et annule les codes vivants. */
export async function ouvrirRemplacement(
  db: Base,
  adresse: string,
  session: { readonly id: string },
  maintenant: number,
): Promise<void> {
  await assurerSchema(db);
  await db.batch([
    db
      .prepare(
        'insert into remplacement_adresse (id, adresse, session, ouvert_le) values (1, ?1, ?2, ?3) on conflict(id) do update set adresse = excluded.adresse, session = excluded.session, ouvert_le = excluded.ouvert_le',
      )
      .bind(adresse, session.id, maintenant),
    db.prepare('update codes_remplacement set annule_le = ?1 where annule_le is null').bind(maintenant),
  ]);
}

/** L'adresse vers laquelle un remplacement est en cours, ou `null`. */
export async function lireRemplacementEnCours(db: Base): Promise<string | null> {
  await assurerSchema(db);
  const ligne = await db.prepare('select adresse from remplacement_adresse where id = 1').first<{ adresse: string }>();
  return ligne ? ligne.adresse : null;
}
