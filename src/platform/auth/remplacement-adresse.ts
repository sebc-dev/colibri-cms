/**
 * Le remplacement de l'adresse autorisée en cours (change 017, ticket 02,
 * ADR-0033). Module autonome : il n'importe que `core/` (I1).
 */
import { env } from 'cloudflare:workers';
import { engendrerCode, normaliserCode, DUREE_DE_VIE_CODE_SECONDES } from '../../core/auth/code.ts';
import { PLAFOND_MESSAGES_REMPLACEMENT_PAR_HEURE, FENETRE_PLAFOND_MS } from '../../core/auth/regles.ts';
import { rendreVerdict, SEUIL_ESSAIS_BRULAGE, type RaisonRefus } from '../../core/auth/verdict.ts';

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

/**
 * Réserve un message du remplacement dans l'heure glissante : épreuve et écriture en une seule
 * requête. Rend `false` si le plafond est atteint.
 */
export async function reserverMessageRemplacement(db: Base, maintenant: number): Promise<boolean> {
  await assurerSchema(db);
  const resultat = await db
    .prepare(
      'insert into messages_remplacement (envoye_le) select ?1 where (select count(*) from messages_remplacement where envoye_le > ?2) < ?3',
    )
    .bind(maintenant, maintenant - FENETRE_PLAFOND_MS, PLAFOND_MESSAGES_REMPLACEMENT_PAR_HEURE)
    .run();
  return resultat.meta.changes === 1;
}

/** Rend une réservation (adresse déjà inscrite chez Cloudflare : aucun message n'est parti). */
export async function libererMessageRemplacement(db: Base, maintenant: number): Promise<void> {
  await assurerSchema(db);
  await db
    .prepare('delete from messages_remplacement where rowid = (select max(rowid) from messages_remplacement where envoye_le = ?1)')
    .bind(maintenant)
    .run();
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

function versHex(octets: Uint8Array): string {
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

/**
 * Engendre un code de remplacement, n'en écrit que l'empreinte salée, rattachée à la session.
 * L'épreuve du plafond des messages, l'écriture du code et l'annulation des codes antérieurs
 * forment une seule requête groupée (une transaction). `null` si le plafond est atteint ou si
 * aucun remplacement n'est ouvert : rien n'est écrit.
 */
export async function ecrireCodeDeRemplacement(
  db: Base,
  session: { readonly id: string },
  maintenant: number,
): Promise<string | null> {
  await assurerSchema(db);
  const code = engendrerCode();
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  const sel = versHex(octets);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sel}:${code}`));
  const empreinte = versHex(new Uint8Array(digest));
  const resultats = await db.batch([
    db
      .prepare(
        'insert into messages_remplacement (envoye_le) select ?1 where (select count(*) from messages_remplacement where envoye_le > ?2) < ?3 and exists (select 1 from remplacement_adresse where id = 1)',
      )
      .bind(maintenant, maintenant - FENETRE_PLAFOND_MS, PLAFOND_MESSAGES_REMPLACEMENT_PAR_HEURE),
    db
      .prepare(
        'insert into codes_remplacement (empreinte, sel, session, creee_le, expire_le) select ?1, ?2, ?3, ?4, ?5 where changes() = 1',
      )
      .bind(empreinte, sel, session.id, maintenant, maintenant + DUREE_DE_VIE_CODE_SECONDES * 1000),
    db
      .prepare(
        'update codes_remplacement set annule_le = ?1 where annule_le is null and id <> last_insert_rowid() and changes() = 1',
      )
      .bind(maintenant),
  ]);
  const ecriture = resultats[1] as { meta?: { changes?: number } } | undefined;
  return ecriture?.meta?.changes === 1 ? code : null;
}

interface LigneRemplacement {
  id: number;
  empreinte: string;
  sel: string;
  session: string;
  expire_le: number;
  essais: number;
  utilise_le: number | null;
  annule_le: number | null;
}

export type IssueBascule =
  | { readonly reussi: true; readonly ancienne: string | null; readonly nouvelle: string }
  | { readonly reussi: false; readonly raison: RaisonRefus };

/**
 * Le code recopié, reconnu par empreinte salée sur toutes les lignes, fait de la nouvelle adresse
 * l'adresse autorisée — en un seul lot atomique, dont le succès se lit à la consommation du code.
 */
export async function basculerSiCodeValide(
  db: Base,
  session: { readonly id: string },
  saisie: string,
  maintenant: number,
): Promise<IssueBascule> {
  await assurerSchema(db);
  const normalise = normaliserCode(saisie);
  const lues = await db
    .prepare(
      'select id, empreinte, sel, session, expire_le, essais, utilise_le, annule_le from codes_remplacement order by creee_le desc',
    )
    .all();
  const results = lues.results as LigneRemplacement[];
  let trouvee: LigneRemplacement | null = null;
  for (const ligne of results) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ligne.sel}:${normalise}`));
    if (versHex(new Uint8Array(digest)) === ligne.empreinte) {
      trouvee = ligne;
      break;
    }
  }
  const verdict = rendreVerdict({
    ligne: trouvee
      ? {
          identifiantAppareil: trouvee.session,
          expireLe: trouvee.expire_le,
          utiliseLe: trouvee.utilise_le,
          annuleLe: trouvee.annule_le,
          essais: trouvee.essais,
        }
      : null,
    identifiantAppareilCourant: session.id,
    maintenant,
  });
  if (trouvee === null) {
    // Saisie sans ligne correspondante : une faute de plus sur le code actif de la session.
    await db
      .prepare(
        'update codes_remplacement set essais = essais + 1 where session = ?1 and utilise_le is null and annule_le is null',
      )
      .bind(session.id)
      .run();
  }
  if (!verdict.valide || trouvee === null) {
    return { reussi: false, raison: verdict.valide ? 'introuvable' : verdict.raison };
  }
  const id = trouvee.id;
  const consomme = 'exists (select 1 from codes_remplacement where id = ?1 and utilise_le = ?2)';
  const lot = await db.batch([
    db.prepare('select adresse from adresses_autorisees limit 1'),
    db
      .prepare(
        'update codes_remplacement set utilise_le = ?2 where id = ?1 and session = ?3 and utilise_le is null and annule_le is null and expire_le > ?2 and essais < ?4',
      )
      .bind(id, maintenant, session.id, SEUIL_ESSAIS_BRULAGE),
    db.prepare(`delete from adresses_autorisees where ${consomme}`).bind(id, maintenant),
    db
      .prepare(
        `insert into adresses_autorisees (adresse) select adresse from remplacement_adresse where id = 1 and ${consomme}`,
      )
      .bind(id, maintenant),
    db.prepare(`delete from remplacement_adresse where id = 1 and ${consomme}`).bind(id, maintenant),
    db
      .prepare(
        `update codes_connexion set annule_le = ?3 where annule_le is null and utilise_le is null and ${consomme}`,
      )
      .bind(id, maintenant, maintenant),
    db.prepare(`delete from sessions where id <> ?3 and ${consomme}`).bind(id, maintenant, session.id),
  ]);
  const consommation = lot[1] as { meta?: { changes?: number } } | undefined;
  if (consommation?.meta?.changes !== 1) return { reussi: false, raison: 'introuvable' };
  const anciennes = ((lot[0] as { results?: unknown } | undefined)?.results ?? []) as { adresse: string }[];
  const nouvelle = await db.prepare('select adresse from adresses_autorisees limit 1').first<{ adresse: string }>();
  return { reussi: true, ancienne: anciennes[0]?.adresse ?? null, nouvelle: nouvelle?.adresse ?? '' };
}
