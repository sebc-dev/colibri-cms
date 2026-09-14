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
 * `src/platform/session/index.ts`) crée cette table si elle est absente —
 * en rejouant la migration elle-même, lue à la construction, pour que le
 * schéma n'ait qu'une définition. Ticket 07
 * (openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md,
 * SC-07a/SC-07b) y ajoute deux colonnes NULLABLES, `nom_affichage` et
 * `description` — `migrations/0006_medias_brouillon_affichage.sql` en reste
 * la seule définition, rejouée ici énoncé par énoncé (D1 n'exécute qu'un
 * énoncé par `prepare`, et la migration porte deux `alter table` distincts,
 * d'où le découpage par `separerRequetes`).
 */
import type { DimensionsImage, FormatImageAdmis } from '../../core/medias/ingestion.ts';
import ddlMediasBrouillon from '../../../migrations/0005_medias_brouillon.sql?raw';
import ddlMediasBrouillonAffichage from '../../../migrations/0006_medias_brouillon_affichage.sql?raw';

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
 * Découpe un fichier `.sql` en énoncés individuels (commentaires `--`
 * retirés) : D1 n'exécute qu'un énoncé par `prepare`, d'où ce découpage
 * (même geste que `separerRequetes` de
 * `tests/integration/fiche-renommer-decrire.test.ts`).
 */
function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

/**
 * Rejoue `migrations/0005_medias_brouillon.sql` — lue telle quelle, jamais
 * recopiée : la migration est la seule définition de la table (son `create
 * table if not exists` rend le rejeu inoffensif). Même promesse défensive
 * que `assurerTableBrouillons`/`assurerTableSessions` sur une D1 où elle
 * n'aurait pas encore été appliquée. Rejoue ensuite, énoncé par énoncé,
 * `migrations/0006_medias_brouillon_affichage.sql` (ticket 07) qui ajoute
 * `nom_affichage` puis `description` — cette migration est la seule
 * définition de ces deux colonnes, jamais recopiée ici. `alter table` échoue
 * sans effet observable sur une D1 qui les porte déjà, l'échec est donc
 * avalé (même geste que `dernier_usage_le` dans `assurerTableSessions`,
 * `src/platform/session/index.ts`).
 */
async function assurerTableMedias(db: DB): Promise<void> {
  schemaMediasAssure ??= (async () => {
    await db.prepare(ddlMediasBrouillon).bind().run();
    for (const requete of separerRequetes(ddlMediasBrouillonAffichage)) {
      try {
        await db.prepare(requete).bind().run();
      } catch {
        // colonne déjà ajoutée : sans effet.
      }
    }
  })();
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

/**
 * Une image en brouillon relue pour la grille de l'`Écran : Médias`
 * (ticket 05, openspec/changes/004-bibliotheque-de-medias/tickets/
 * 05-ecran-medias.md, SC-05a) : seule l'identité et le nom d'origine, JAMAIS
 * les octets (poids d'une ligne entière, servis à part par la route dédiée
 * `src/pages/admin/medias/[id]/octets.ts`). Le nom d'AFFICHAGE et la
 * description existent désormais dans ce magasin (ticket 07,
 * `MediaFiche`/`obtenirFicheMediaBrouillon` plus bas) mais la grille ni sa
 * recherche n'en tiennent compte ici : étendre la liste et son filtre à la
 * description est hors périmètre du ticket 07 (porté par la grille/recherche
 * du ticket 05, déjà livrées) — ce ticket ne recherche donc encore que sur
 * le nom d'origine, sans changement de forme.
 */
export interface MediaListe {
  readonly id: string;
  readonly nomOrigine: string;
}

interface LigneMediaListeBrute {
  readonly id: string;
  readonly nom_origine: string;
}

/**
 * Liste toutes les images de la réserve brouillon, la plus récente en tête
 * (SC-05a). Une réserve vide rend un tableau vide (SC-05b), sans branche
 * dédiée : la table nouvellement créée par `assurerTableMedias` n'a
 * simplement aucune ligne. La recherche elle-même (SC-05f/g) est un filtre
 * en mémoire côté `admin/` sur ce résultat, jamais un second lieu de
 * requête — ce magasin n'a donc qu'une seule fonction de lecture de liste.
 */
export async function listerMediasBrouillon(db: DB): Promise<MediaListe[]> {
  await assurerTableMedias(db);
  const resultat = await db
    .prepare(`select id, nom_origine from ${TABLE_MEDIAS} order by creee_le desc`)
    .bind()
    .all();
  return (resultat.results as LigneMediaListeBrute[]).map((ligne) => ({
    id: ligne.id,
    nomOrigine: ligne.nom_origine,
  }));
}

/**
 * Une image en brouillon relue pour l'`Écran : Fiche d'une image` (ticket
 * 07, SC-07a/SC-07b) : l'identité, le nom d'ORIGINE (jamais modifié par le
 * renommage, SC-07a), le nom d'AFFICHAGE et la description tels que
 * l'éditrice les a saisis. `nomAffichage` retombe sur `nomOrigine` tant que
 * l'éditrice n'a jamais renommé l'image (colonne NULLABLE, `migrations/
 * 0006_medias_brouillon_affichage.sql`) ; `description` retombe sur la
 * chaîne vide tant qu'elle n'a jamais été saisie — jamais `null` rendu à
 * l'appelant, qui n'a pas à distinguer les deux cas. Le format déduit est
 * rendu pour composer, côté appelant, le `Content-Type`/`alt` de l'aperçu
 * sans une seconde lecture.
 */
export interface MediaFiche {
  readonly id: string;
  readonly nomOrigine: string;
  readonly nomAffichage: string;
  readonly description: string;
  readonly format: FormatImageAdmis;
}

interface LigneFicheMediaBrute {
  readonly nom_origine: string;
  readonly nom_affichage: string | null;
  readonly description: string | null;
  readonly format: string;
}

/**
 * Relit la fiche d'une image en brouillon par son identifiant, ou `null` si
 * aucune ne correspond (même contrat que `obtenirMediaBrouillon` : à charge
 * de l'appelant d'en faire un 404 après le garde de session).
 */
export async function obtenirFicheMediaBrouillon(db: DB, id: string): Promise<MediaFiche | null> {
  await assurerTableMedias(db);
  const resultat = await db
    .prepare(`select nom_origine, nom_affichage, description, format from ${TABLE_MEDIAS} where id = ?1`)
    .bind(id)
    .all();
  const ligne = (resultat.results as LigneFicheMediaBrute[]).at(0);
  if (!ligne) return null;
  return {
    id,
    nomOrigine: ligne.nom_origine,
    nomAffichage: ligne.nom_affichage ?? ligne.nom_origine,
    description: ligne.description ?? '',
    format: ligne.format as FormatImageAdmis,
  };
}

/**
 * Une image en brouillon existe-t-elle encore (par son identifiant) ? Geste
 * partagé par `renommerMediaBrouillon`/`decrireMediaBrouillon` pour rendre
 * un refus `'introuvable'` plutôt que d'exécuter une écriture sans effet sur
 * un identifiant inconnu (même garde que `obtenirMediaBrouillon`/
 * `obtenirFicheMediaBrouillon`, sans en payer la lecture complète).
 */
async function existeMediaBrouillon(db: DB, id: string): Promise<boolean> {
  await assurerTableMedias(db);
  const resultat = await db.prepare(`select id from ${TABLE_MEDIAS} where id = ?1`).bind(id).all();
  return resultat.results.length > 0;
}

/**
 * Renomme une image en brouillon (SC-07a) : écrit SEULEMENT `nom_affichage`
 * — `nom_origine` n'est jamais touché ici (SC-04d/SC-07a, nom d'origine
 * conservé à part). Fonction totale : rend `{ renomme: false, motif:
 * 'introuvable' }` plutôt que d'exécuter une écriture sur un identifiant
 * inconnu (à charge de l'appelant d'en faire un 404 après le garde de
 * session), `{ renomme: true }` sinon.
 */
export async function renommerMediaBrouillon(
  db: DB,
  id: string,
  nomAffichage: string,
): Promise<{ renomme: true } | { renomme: false; motif: 'introuvable' }> {
  const existe = await existeMediaBrouillon(db, id);
  if (!existe) {
    return { renomme: false, motif: 'introuvable' };
  }
  await db.prepare(`update ${TABLE_MEDIAS} set nom_affichage = ?1 where id = ?2`).bind(nomAffichage, id).run();
  return { renomme: true };
}

/**
 * Décrit une image en brouillon (SC-07b) : écrit `description`, rangée
 * telle quelle — jamais rendue en HTML ici, ce magasin ne fait aucun rendu
 * (le service en page publiée, FR-039, est hors périmètre du ticket 07).
 * Même contrat total que `renommerMediaBrouillon` ci-dessus (refus
 * `'introuvable'` plutôt qu'une écriture sans effet).
 */
export async function decrireMediaBrouillon(
  db: DB,
  id: string,
  description: string,
): Promise<{ decrite: true } | { decrite: false; motif: 'introuvable' }> {
  const existe = await existeMediaBrouillon(db, id);
  if (!existe) {
    return { decrite: false, motif: 'introuvable' };
  }
  await db.prepare(`update ${TABLE_MEDIAS} set description = ?1 where id = ?2`).bind(description, id).run();
  return { decrite: true };
}
