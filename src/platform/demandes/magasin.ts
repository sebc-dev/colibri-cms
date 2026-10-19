/**
 * Le magasin des demandes gardées (change 013, ticket 01, ADR-0030). Requêtes préparées seules.
 * La table se rejoue à l'identique de la migration 0013, comme `assurerSchema` du compteur.
 */
import { env } from 'cloudflare:workers';
import { DEMANDES_PAR_PAGE } from '../../core/demandes/liste.ts';
import type { ComptesFormulaire } from '../../core/demandes/nombres.ts';

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
  readonly formulaireId: string;
  readonly formulaireNom: string;
  readonly pageTitre: string;
  readonly contact: string;
  readonly total: number | null;
  readonly suite: 'a-renseigner' | 'sans-suite' | 'devis-envoye' | 'commande';
  readonly courriel: 'parti' | 'non-parti' | null;
}


interface LigneBrute {
  id: string;
  recue_le: number;
  formulaire_id: string;
  formulaire_nom: string;
  page_titre: string | null;
  contact: string | null;
  total: number | null;
  suite: LigneDemande['suite'];
  courriel: LigneDemande['courriel'];
}

/**
 * Une page de 50 demandes présentes, la plus récente d'abord (ordre stable à la milliseconde),
 * filtrée par formulaire si `formulaireId` est donné. `page` commence à 1.
 */
export async function listerDemandes(db: Base, page = 1, formulaireId: string | null = null): Promise<LigneDemande[]> {
  await assurerSchema(db);
  const decalage = (Math.max(1, page) - 1) * DEMANDES_PAR_PAGE;
  const colonnes = 'id, recue_le, formulaire_id, formulaire_nom, page_titre, contact, total, suite, courriel';
  const instruction =
    formulaireId === null
      ? db
          .prepare(
            `select ${colonnes} from demandes where etat = 'presente' order by recue_le desc, rowid desc limit ?1 offset ?2`,
          )
          .bind(DEMANDES_PAR_PAGE, decalage)
      : db
          .prepare(
            `select ${colonnes} from demandes where etat = 'presente' and formulaire_id = ?3 order by recue_le desc, rowid desc limit ?1 offset ?2`,
          )
          .bind(DEMANDES_PAR_PAGE, decalage, formulaireId);
  const resultat = await instruction.all();
  const lignes = resultat.results as LigneBrute[];
  return lignes.map((r) => ({
    id: r.id,
    recueLe: r.recue_le,
    formulaireId: r.formulaire_id,
    formulaireNom: r.formulaire_nom,
    pageTitre: r.page_titre ?? '',
    contact: r.contact ?? '',
    total: r.total,
    suite: r.suite,
    courriel: r.courriel,
  }));
}

/** Le nombre de demandes présentes, filtrées par formulaire ou non. */
export async function compterDemandes(db: Base, formulaireId: string | null = null): Promise<number> {
  await assurerSchema(db);
  const instruction =
    formulaireId === null
      ? db.prepare("select count(*) as n from demandes where etat = 'presente'")
      : db.prepare("select count(*) as n from demandes where etat = 'presente' and formulaire_id = ?1").bind(formulaireId);
  const ligne = await instruction.first<{ n: number }>();
  return ligne?.n ?? 0;
}

/** Les formulaires dont une demande est présente, avec le nom gardé sur la demande la plus récente. */
export async function listerFormulairesDeDemandes(db: Base): Promise<{ id: string; nom: string }[]> {
  await assurerSchema(db);
  const resultat = await db
    .prepare(
      `select formulaire_id, formulaire_nom from demandes d
       where etat = 'presente'
         and rowid = (select rowid from demandes e where e.etat = 'presente' and e.formulaire_id = d.formulaire_id
                      order by e.recue_le desc, e.rowid desc limit 1)
       order by formulaire_nom`,
    )
    .all();
  return (resultat.results as { formulaire_id: string; formulaire_nom: string }[]).map((r) => ({
    id: r.formulaire_id,
    nom: r.formulaire_nom,
  }));
}

/**
 * Les comptes de toutes les demandes, une ligne par formulaire, en une seule requête groupée :
 * présentes, commandes (présentes ou retirées) et retirées, avec le nom gardé le plus récent.
 */
export async function compterParFormulaire(db: Base): Promise<ComptesFormulaire[]> {
  await assurerSchema(db);
  const resultat = await db
    .prepare(
      `select formulaire_id,
              (select e.formulaire_nom from demandes e where e.formulaire_id = d.formulaire_id
                 order by e.recue_le desc, e.rowid desc limit 1) as nom,
              sum(etat = 'presente') as presentes,
              sum(suite = 'commande') as commandes,
              sum(etat = 'retiree') as retirees
       from demandes d group by formulaire_id`,
    )
    .all();
  return (
    resultat.results as { formulaire_id: string; nom: string; presentes: number; commandes: number; retirees: number }[]
  ).map((r) => ({
    formulaireId: r.formulaire_id,
    nom: r.nom,
    presentes: r.presentes,
    commandes: r.commandes,
    retirees: r.retirees,
  }));
}
