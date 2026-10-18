/**
 * Le magasin des demandes gardées (change 013, ticket 01, ADR-0030). Requêtes préparées seules.
 * La table se rejoue à l'identique de la migration 0013, comme `assurerSchema` du compteur.
 */
import { env } from 'cloudflare:workers';

type Base = typeof env.DB;

export interface DemandeAGarder {
  readonly formulaireId: string;
  readonly formulaireNom: string;
  readonly pageTitre: string;
  readonly total: number | null;
  readonly contact: string;
  readonly detail: string;
}

let schemaAssure: Promise<unknown> | null = null;

async function assurerSchema(db: Base): Promise<void> {
  schemaAssure ??= db.batch([
    db.prepare(
      `create table if not exists demandes (
  id text primary key,
  formulaire_id text not null,
  formulaire_nom text not null,
  suite text not null check (suite in ('a-renseigner', 'sans-suite', 'devis-envoye', 'commande')),
  etat text not null check (etat in ('presente', 'retiree')),
  recue_le integer,
  page_titre text,
  total integer,
  contact text,
  detail text,
  courriel text check (courriel in ('parti', 'non-parti')),
  check (
    etat = 'presente'
    or (recue_le is null and page_titre is null and total is null and contact is null and detail is null and courriel is null)
  )
)`,
    ),
    db.prepare('create index if not exists demandes_etat_recue_le on demandes (etat, recue_le desc)'),
  ]);
  try {
    await schemaAssure;
  } catch (erreur) {
    schemaAssure = null;
    throw erreur;
  }
}

/** Garde la demande (suite « à renseigner », e-mail « non parti ») et rend son identifiant. */
export async function garderDemande(db: Base, demande: DemandeAGarder, maintenant: number): Promise<string> {
  await assurerSchema(db);
  const id = crypto.randomUUID();
  await db
    .prepare(
      `insert into demandes (id, formulaire_id, formulaire_nom, suite, etat, recue_le, page_titre, total, contact, detail, courriel)
       values (?1, ?2, ?3, 'a-renseigner', 'presente', ?4, ?5, ?6, ?7, ?8, 'non-parti')`,
    )
    .bind(id, demande.formulaireId, demande.formulaireNom, maintenant, demande.pageTitre, demande.total, demande.contact, demande.detail)
    .run();
  return id;
}

/** Marque l'e-mail de la demande comme parti. */
export async function marquerCourrielParti(db: Base, id: string): Promise<void> {
  await assurerSchema(db);
  await db.prepare("update demandes set courriel = 'parti' where id = ?1").bind(id).run();
}

export interface LigneDemande {
  readonly id: string;
  readonly recueLe: number;
  readonly formulaireNom: string;
  readonly pageTitre: string;
  readonly contact: string;
  readonly total: number | null;
  readonly suite: 'a-renseigner' | 'sans-suite' | 'devis-envoye' | 'commande';
  readonly courriel: 'parti' | 'non-parti' | null;
}

const LIMITE_LISTE = 50;

interface LigneBrute {
  id: string;
  recue_le: number;
  formulaire_nom: string;
  page_titre: string | null;
  contact: string | null;
  total: number | null;
  suite: LigneDemande['suite'];
  courriel: LigneDemande['courriel'];
}

/** Les demandes présentes, la plus récente d'abord, 50 au plus (ordre stable à la milliseconde). */
export async function listerDemandes(db: Base): Promise<LigneDemande[]> {
  await assurerSchema(db);
  const resultat = await db
    .prepare(
      `select id, recue_le, formulaire_nom, page_titre, contact, total, suite, courriel
       from demandes where etat = 'presente' order by recue_le desc, rowid desc limit ?1`,
    )
    .bind(LIMITE_LISTE)
    .all();
  const lignes = resultat.results as LigneBrute[];
  return lignes.map((r) => ({
    id: r.id,
    recueLe: r.recue_le,
    formulaireNom: r.formulaire_nom,
    pageTitre: r.page_titre ?? '',
    contact: r.contact ?? '',
    total: r.total,
    suite: r.suite,
    courriel: r.courriel,
  }));
}
