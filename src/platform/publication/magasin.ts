/**
 * Le magasin de la publication (change 011-apercu-et-publication, ticket 15 ;
 * migration 0011, ADR-0019, ADR-0023) : le verrou à bail, l'instantané confirmé
 * et la finalisation en un seul lot D1. Même patron que `magasin-publie.ts` :
 * table recréée défensivement au premier accès, requêtes préparées exclusivement.
 *
 * Zone `platform` : n'importe que `core/` et les magasins voisins (I1).
 */
import { listerSlugsAvecBrouillon } from '../brouillons/magasin.ts';
import { obtenirBrouillonsFormulaires } from '../formulaires/magasin.ts';
import { obtenirBrouillonsReglages } from '../reglages/magasin.ts';
import { obtenirPubliesReglages, obtenirPublieEmplacements, obtenirPublieFormulaire } from './magasin-publie.ts';

interface Liee {
  run(): Promise<{ meta: { changes: number } }>;
  all(): Promise<{ results: unknown[] }>;
}

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé). */
export interface DB {
  prepare(query: string): { bind(...valeurs: unknown[]): Liee };
  batch(instructions: readonly unknown[]): Promise<unknown[]>;
}

/** Un emplacement de page en brouillon, tel que D1 le garde. */
export interface LignePage {
  readonly slug: string;
  readonly idEmplacement: string;
  readonly nature: string;
  readonly contenu: string;
  readonly majLe: number;
}

/** Un réglage ou un formulaire en brouillon, tel que D1 le garde. */
export interface LigneObjet {
  readonly id: string;
  readonly contenu: string;
  readonly majLe: number;
}

export interface ObjetsABrouillon {
  readonly pages: readonly LignePage[];
  readonly reglages: readonly LigneObjet[];
  readonly formulaires: readonly LigneObjet[];
}

const DEFINITIONS = [
  `create table if not exists publication (
      id integer primary key check (id = 1),
      jeton text,
      bail_jusqu_a integer,
      instantane text,
      marque_en_cours text,
      derniere_marque text,
      depose_le integer
    )`,
  'insert or ignore into publication (id) values (1)',
];

let schemaAssure: Promise<void> | null = null;

/** Recrée la table de la publication et sa ligne unique si absentes — mêmes définitions que la migration 0011. */
async function assurerTablePublication(db: DB): Promise<void> {
  schemaAssure ??= (async () => {
    for (const definition of DEFINITIONS) {
      await db.prepare(definition).bind().run();
    }
  })().then(
    () => undefined,
    (erreur: unknown) => {
      schemaAssure = null;
      throw erreur;
    },
  );
  await schemaAssure;
}

interface LignePageBrute {
  readonly page_slug: string;
  readonly id_emplacement: string;
  readonly nature: string;
  readonly contenu: string;
  readonly maj_le: number;
}

interface LigneObjetBrute {
  readonly id: string;
  readonly contenu: string;
  readonly maj_le: number;
}

/** Tous les objets qui portent un brouillon, avec leur `maj_le` (la date de la dernière correction). */
export async function lireObjetsABrouillon(db: DB): Promise<ObjetsABrouillon> {
  // Les lectures des magasins voisins recréent leurs tables si besoin.
  await listerSlugsAvecBrouillon(db);
  await obtenirBrouillonsReglages(db);
  await obtenirBrouillonsFormulaires(db);
  const pages = await db
    .prepare('select page_slug, id_emplacement, nature, contenu, maj_le from brouillons_emplacements')
    .bind()
    .all();
  const reglages = await db.prepare('select reglage as id, contenu, maj_le from brouillons_reglages').bind().all();
  const formulaires = await db
    .prepare('select formulaire as id, contenu, maj_le from brouillons_formulaires')
    .bind()
    .all();
  return {
    pages: (pages.results as LignePageBrute[]).map((l) => ({
      slug: l.page_slug,
      idEmplacement: l.id_emplacement,
      nature: l.nature,
      contenu: l.contenu,
      majLe: l.maj_le,
    })),
    reglages: (reglages.results as LigneObjetBrute[]).map((l) => ({ id: l.id, contenu: l.contenu, majLe: l.maj_le })),
    formulaires: (formulaires.results as LigneObjetBrute[]).map((l) => ({
      id: l.id,
      contenu: l.contenu,
      majLe: l.maj_le,
    })),
  };
}

/** Prend le verrou si personne ne le tient ou si son bail est dépassé sans instantané en suspens ; garde l'instantané confirmé. */
export async function prendreVerrou(
  db: DB,
  jeton: string,
  instantane: string,
  marque: string,
  maintenant: number,
  bail: number,
): Promise<boolean> {
  await assurerTablePublication(db);
  const resultat = await db
    .prepare(
      `update publication set jeton = ?1, bail_jusqu_a = ?2, instantane = ?3, marque_en_cours = ?4
       where id = 1 and (bail_jusqu_a is null or (bail_jusqu_a <= ?5 and instantane is null))`,
    )
    .bind(jeton, maintenant + bail, instantane, marque, maintenant)
    .run();
  return resultat.meta.changes === 1;
}

/** Reprend une publication en suspens dont le bail a expiré, sans toucher à son instantané ni à sa marque (ADR-0023). */
export async function reprendreVerrou(db: DB, jeton: string, maintenant: number, bail: number): Promise<boolean> {
  await assurerTablePublication(db);
  const resultat = await db
    .prepare(
      `update publication set jeton = ?1, bail_jusqu_a = ?2
       where id = 1 and instantane is not null and marque_en_cours is not null
         and bail_jusqu_a is not null and bail_jusqu_a <= ?3`,
    )
    .bind(jeton, maintenant + bail, maintenant)
    .run();
  return resultat.meta.changes === 1;
}

export interface VerrouTenu {
  readonly instantane: string;
  readonly marque: string;
}

/** Ce que garde le verrou si `jeton` le tient encore, sinon `null`. */
export async function lireVerrou(db: DB, jeton: string): Promise<VerrouTenu | null> {
  await assurerTablePublication(db);
  const resultat = await db
    .prepare('select instantane, marque_en_cours from publication where id = 1 and jeton = ?1')
    .bind(jeton)
    .all();
  const ligne = (resultat.results as { instantane: string | null; marque_en_cours: string | null }[]).at(0);
  const instantane = ligne?.instantane ?? null;
  const marque = ligne?.marque_en_cours ?? null;
  if (instantane === null || marque === null) return null;
  return { instantane, marque };
}

/**
 * Garde la progression d'une passe et renouvelle le bail : tant que les passes avancent, la
 * publication donne signe de vie. Sans effet si `jeton` ne tient plus le verrou.
 */
export async function avancerPasse(
  db: DB,
  jeton: string,
  instantane: string,
  maintenant: number,
  bail: number,
): Promise<boolean> {
  await assurerTablePublication(db);
  const resultat = await db
    .prepare('update publication set instantane = ?1, bail_jusqu_a = ?2 where id = 1 and jeton = ?3')
    .bind(instantane, maintenant + bail, jeton)
    .run();
  return resultat.meta.changes === 1;
}

const LIBERER_VERROU = `update publication set jeton = null, bail_jusqu_a = null, instantane = null, marque_en_cours = null
       where id = 1 and jeton = ?1`;

/** Libère le verrou sans rien écrire d'autre (échec avant le dépôt de la branche principale). */
export async function libererVerrou(db: DB, jeton: string): Promise<void> {
  await assurerTablePublication(db);
  await db.prepare(LIBERER_VERROU).bind(jeton).run();
}

/** Ce que la finalisation écrit en D1 une fois la branche principale déposée. */
export interface Finalisation {
  readonly jeton: string;
  readonly marque: string;
  readonly maintenant: number;
  readonly objets: ObjetsABrouillon;
  /** Les images publiées : leur description publiée et, pour celles tout juste déposées, leur empreinte. */
  readonly imagesPubliees: readonly { readonly id: string; readonly description: string; readonly empreinte: string | null }[];
  readonly imagesEffacees: readonly string[];
}

/** Finalise en un seul lot : les tables `publies_*`, les brouillons à `maj_le` égal, les images, la marque, le verrou. */
export async function finaliser(db: DB, finalisation: Finalisation): Promise<void> {
  await assurerTablePublication(db);
  // Les tables publiées sont recréées si absentes par leurs lectures.
  await obtenirPublieEmplacements(db, '');
  await obtenirPubliesReglages(db);
  await obtenirPublieFormulaire(db, '');
  const { maintenant, objets } = finalisation;
  const instructions: unknown[] = [];
  for (const l of objets.pages) {
    instructions.push(
      db
        .prepare(
          `insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le)
           values (?1, ?2, ?3, ?4, ?5)
           on conflict(page_slug, id_emplacement) do update set
             nature = excluded.nature, contenu = excluded.contenu, publie_le = excluded.publie_le`,
        )
        .bind(l.slug, l.idEmplacement, l.nature, l.contenu, maintenant),
      db
        .prepare('delete from brouillons_emplacements where page_slug = ?1 and id_emplacement = ?2 and maj_le = ?3')
        .bind(l.slug, l.idEmplacement, l.majLe),
    );
  }
  for (const l of objets.reglages) {
    instructions.push(
      db
        .prepare(
          `insert into publies_reglages (reglage, contenu, publie_le) values (?1, ?2, ?3)
           on conflict(reglage) do update set contenu = excluded.contenu, publie_le = excluded.publie_le`,
        )
        .bind(l.id, l.contenu, maintenant),
      db.prepare('delete from brouillons_reglages where reglage = ?1 and maj_le = ?2').bind(l.id, l.majLe),
    );
  }
  for (const l of objets.formulaires) {
    instructions.push(
      db
        .prepare(
          `insert into publies_formulaires (formulaire, contenu, publie_le) values (?1, ?2, ?3)
           on conflict(formulaire) do update set contenu = excluded.contenu, publie_le = excluded.publie_le`,
        )
        .bind(l.id, l.contenu, maintenant),
      db.prepare('delete from brouillons_formulaires where formulaire = ?1 and maj_le = ?2').bind(l.id, l.majLe),
    );
  }
  for (const image of finalisation.imagesPubliees) {
    instructions.push(
      db
        .prepare(
          `update medias set publiee_le = ?1, description_publiee = ?2, empreinte_depot = coalesce(?3, empreinte_depot)
           where id = ?4`,
        )
        .bind(maintenant, image.description, image.empreinte, image.id),
    );
  }
  for (const id of finalisation.imagesEffacees) {
    // FR-037 : une image n'est effacée que si plus aucun emplacement, publié ou brouillon, ne la référence.
    const reposee = `exists (select 1 from brouillons_emplacements b where json_extract(b.contenu, '$.mediaId') = ?1
        or exists (select 1 from json_each(b.contenu, '$.mediaIds') where value = ?1))`;
    instructions.push(
      db.prepare(`delete from medias where id = ?1 and not ${reposee}`).bind(id),
      db
        .prepare(
          `update medias set publiee_le = null, description_publiee = null, empreinte_depot = null
           where id = ?1 and ${reposee}`,
        )
        .bind(id),
    );
  }
  instructions.push(
    db
      .prepare(
        `update publication set derniere_marque = ?1, depose_le = ?2, jeton = null, bail_jusqu_a = null,
           instantane = null, marque_en_cours = null
         where id = 1 and jeton = ?3`,
      )
      .bind(finalisation.marque, maintenant, finalisation.jeton),
  );
  await db.batch(instructions);
}
