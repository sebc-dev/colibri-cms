/**
 * Le magasin des médias en brouillon — ticket 04
 * (openspec/changes/004-bibliotheque-de-medias/tickets/04-reserve-persister-servir.md),
 * candidat ADR `medias-deux-magasins-un-par-etat`.
 *
 * Zone `platform` (docs/architecture.md, I1) : n'importe que `core/`
 * (`FormatImageAdmis`, `DimensionsImage` de `core/medias/ingestion.ts`) —
 * jamais `admin/`, `render/`, `site/`, ni un autre fichier de `platform/`
 * (même matrice que `src/platform/auth/magasin.ts`/
 * `src/platform/brouillons/magasin.ts`). Ce magasin ne redécide jamais du
 * format : il persiste et relit ce que `core/medias/ingestion.ts` a déjà
 * déduit — jamais un `typeDeclare` ni une extension (SC-04d).
 *
 * Table `medias_brouillon` (`migrations/0005_medias_brouillon.sql`, SC-04a) :
 * une ligne par image en brouillon, clé `id` (identifiant opaque engendré
 * ici à la persistance). L'état publié n'a ici aucune représentation : ce
 * magasin ne connaît que la réserve brouillon.
 *
 * `assurerTableMedias` (même geste défensif que `assurerTableBrouillons`,
 * `src/platform/brouillons/magasin.ts`, et `assurerTableSessions`,
 * `src/platform/session/index.ts`) recrée cette table si elle est absente :
 * la couture de test de ce ticket rejoue la migration elle-même, mais ce
 * garde tient la même promesse que ses voisins sur une D1 où elle ne
 * l'aurait pas encore été.
 */
import type { DimensionsImage, FormatImageAdmis } from '../../core/medias/ingestion.ts';

const TABLE_MEDIAS = 'medias_brouillon';

/** Limite D1 « Maximum string, BLOB or table row size » (developers.cloudflare.com/d1/platform/limits) — plus basse que `POIDS_MAX_OCTETS_IMAGE` (2 × 1024 × 1024) de `core/`. */
export const CAPACITE_MAX_OCTETS_LIGNE_D1 = 2_000_000;

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé, cf. D1Database). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<unknown>;
      all(): Promise<{ results: unknown[] }>;
    };
  };
}

let schemaMediasAssure: Promise<void> | null = null;

/**
 * Crée `medias_brouillon` si elle n'existe pas encore — même définition que
 * `migrations/0005_medias_brouillon.sql` (voir son commentaire) : ce garde
 * défensif la rejoue pour rester fonctionnel sur une D1 où cette migration
 * n'a pas été rejouée par la couture de test courante.
 */
async function assurerTableMedias(db: DB): Promise<void> {
  schemaMediasAssure ??= db
    .prepare(
      `create table if not exists ${TABLE_MEDIAS} (
          id text primary key,
          nom_origine text not null,
          format text not null,
          largeur integer not null,
          hauteur integer not null,
          poids_octets integer not null,
          octets blob not null,
          creee_le integer not null
        )`,
    )
    .bind()
    .run()
    .then(() => undefined);
  await schemaMediasAssure;
}

/** Une image admise, prête à être persistée (SC-04a) — le format et les dimensions sont ceux déduits par `core/medias/ingestion.ts`, jamais recalculés ici. */
export interface MediaAdmisAPersister {
  readonly nomOrigine: string;
  readonly format: FormatImageAdmis;
  readonly dimensions: DimensionsImage;
  readonly octets: Uint8Array<ArrayBuffer>;
}

/** Une image en brouillon relue depuis le magasin (SC-04b) : le type déduit, jamais recopié du téléversement. */
export interface MediaBrouillon {
  readonly format: FormatImageAdmis;
  readonly octets: Uint8Array<ArrayBuffer>;
}

function engendrerIdentifiantMedia(): string {
  return crypto.randomUUID();
}

/** Les octets tels que D1 les rend (`ArrayBuffer`) convertis en `Uint8Array`, sans copie. */
function versOctets(valeur: unknown): Uint8Array<ArrayBuffer> {
  return new Uint8Array(valeur as ArrayBuffer);
}

/**
 * Persiste une image admise au magasin brouillon (SC-04a) : identité
 * engendrée ici (opaque, jamais devinable depuis l'extérieur), nom
 * d'origine, dimensions et type déduit tels que reçus — jamais recalculés.
 * L'état publié n'est jamais touché (aucune écriture hors de cette table).
 * Fonction totale : si les octets et le nom d'origine ne tiendraient pas
 * dans une ligne D1 (`CAPACITE_MAX_OCTETS_LIGNE_D1`), rend un refus au titre
 * du poids plutôt que de tenter l'INSERT. Sinon, rend l'identifiant engendré.
 */
export async function persisterMediaBrouillon(
  db: DB,
  media: MediaAdmisAPersister,
  maintenant: number,
): Promise<{ persiste: true; id: string } | { persiste: false; motif: 'poids' }> {
  const poidsLigne =
    media.octets.length + new TextEncoder().encode(media.nomOrigine).length + 256; // 256 = marge pour id, format et entiers de la ligne
  if (poidsLigne > CAPACITE_MAX_OCTETS_LIGNE_D1) {
    return { persiste: false, motif: 'poids' };
  }
  await assurerTableMedias(db);
  const id = engendrerIdentifiantMedia();
  await db
    .prepare(
      `insert into ${TABLE_MEDIAS} (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      id,
      media.nomOrigine,
      media.format,
      media.dimensions.largeur,
      media.dimensions.hauteur,
      media.octets.length,
      media.octets,
      maintenant,
    )
    .run();
  return { persiste: true, id };
}

interface LigneMediaBrute {
  readonly format: string;
  readonly octets: unknown;
}

/**
 * Relit une image en brouillon par son identifiant, ou `null` si aucune ne
 * correspond (SC-04c, à charge de l'appelant d'en faire un 404 après le
 * garde de session). Le `format` rendu est toujours celui déduit à
 * l'ingestion, stocké tel quel — jamais redécidé ici (SC-04d).
 */
export async function obtenirMediaBrouillon(db: DB, id: string): Promise<MediaBrouillon | null> {
  await assurerTableMedias(db);
  const resultat = await db
    .prepare(`select format, octets from ${TABLE_MEDIAS} where id = ?1`)
    .bind(id)
    .all();
  const ligne = (resultat.results as LigneMediaBrute[]).at(0);
  if (!ligne) return null;
  return { format: ligne.format as FormatImageAdmis, octets: versOctets(ligne.octets) };
}
