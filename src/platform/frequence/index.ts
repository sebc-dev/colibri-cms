/**
 * Le compteur par origine (ADR-0028) : une empreinte HMAC-SHA-256 de
 * l'adresse d'origine, avec une clé aléatoire valable une heure. Aucune
 * adresse IP n'est jamais écrite ni journalisée. Toute erreur refuse la
 * sollicitation (fail-closed), en verdict « indisponible » (jamais « refusée »).
 */
import { env } from 'cloudflare:workers';
import {
  debutDeFenetre,
  fenetreEstEchue,
  jugerSollicitation,
  type Surface,
  type Verdict,
} from '../../core/frequence/regles.ts';

type Base = typeof env.DB;

const ORIGINE_INCONNUE = 'inconnue';
const TAILLE_CLE = 32;

let schemaAssure: Promise<unknown> | null = null;

/** Rejoue la définition de la migration 0012 (sans effet si elle est déjà là), comme `assurerTableSessions`. */
async function assurerSchema(db: Base): Promise<void> {
  schemaAssure ??= db.batch([
    db.prepare('create table if not exists fenetre_seuil (id integer primary key check (id = 1), debut integer not null, cle blob not null)'),
    db.prepare(
      'create table if not exists comptes_seuil (surface text not null, empreinte blob not null, nombre integer not null, primary key (surface, empreinte))',
    ),
  ]);
  try {
    await schemaAssure;
  } catch (erreur) {
    schemaAssure = null;
    throw erreur;
  }
}

interface Fenetre {
  debut: number;
  cle: ArrayBuffer;
}

function enArrayBuffer(valeur: unknown): ArrayBuffer {
  const octets = Uint8Array.from(valeur as ArrayLike<number>);
  return octets.buffer;
}

async function lireFenetre(db: Base): Promise<Fenetre | null> {
  const ligne = await db
    .prepare('select debut, cle from fenetre_seuil where id = 1')
    .first<{ debut: number; cle: unknown }>();
  return ligne ? { debut: ligne.debut, cle: enArrayBuffer(ligne.cle) } : null;
}

async function empreinteDe(cle: ArrayBuffer, origine: string): Promise<ArrayBuffer> {
  const cleHmac = await crypto.subtle.importKey('raw', cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cleHmac, new TextEncoder().encode(origine));
}

/** Bascule indivisible : efface les empreintes et pose une clé neuve, si la fenêtre lue est toujours celle en place. */
async function basculer(db: Base, ancienDebut: number | null, maintenant: number): Promise<void> {
  const cle = crypto.getRandomValues(new Uint8Array(TAILLE_CLE)).buffer;
  const encoreEnPlace = '(select debut from fenetre_seuil where id = 1) is ?1';
  await db.batch([
    db.prepare(`delete from comptes_seuil where ${encoreEnPlace}`).bind(ancienDebut),
    db
      .prepare(
        `insert into fenetre_seuil (id, debut, cle) select 1, ?2, ?3 where ${encoreEnPlace} on conflict (id) do update set debut = excluded.debut, cle = excluded.cle`,
      )
      .bind(ancienDebut, debutDeFenetre(maintenant), cle),
  ]);
}

async function incrementer(db: Base, surface: Surface, origine: string, fenetre: Fenetre): Promise<number | null> {
  const empreinte = await empreinteDe(fenetre.cle, origine);
  const cleToujoursEnPlace = '(select cle from fenetre_seuil where id = 1) = ?3';
  const ligne = await db
    .prepare(
      `insert into comptes_seuil (surface, empreinte, nombre) select ?1, ?2, 1 where ${cleToujoursEnPlace} on conflict (surface, empreinte) do update set nombre = nombre + 1 where ${cleToujoursEnPlace} returning nombre`,
    )
    .bind(surface, empreinte, fenetre.cle)
    .first<{ nombre: number }>();
  return ligne ? ligne.nombre : null;
}

export async function compterEtJuger(
  db: Base,
  surface: Surface,
  origine: string | null | undefined,
  maintenant: number,
): Promise<Verdict> {
  try {
    await assurerSchema(db);
    const nom = origine && origine.length > 0 ? origine : ORIGINE_INCONNUE;
    for (let essai = 0; essai < 2; essai += 1) {
      let fenetre = await lireFenetre(db);
      if (!fenetre || fenetreEstEchue(fenetre.debut, maintenant)) {
        await basculer(db, fenetre ? fenetre.debut : null, maintenant);
        fenetre = await lireFenetre(db);
      }
      if (!fenetre) continue;
      const rang = await incrementer(db, surface, nom, fenetre);
      if (rang !== null) return jugerSollicitation(surface, rang);
    }
    console.error('[seuil] comptage impossible (fenêtre instable)');
    return 'indisponible';
  } catch (erreur) {
    tracerLaPanne(erreur);
    return 'indisponible';
  }
}

/**
 * Trace d'un comptage impossible, à motif fixe : le seul nom de l'erreur, jamais
 * son message, l'origine, la clé ni l'empreinte (SC-02i, ADR-0028).
 */
function tracerLaPanne(erreur: unknown): void {
  const motif = erreur instanceof Error ? erreur.name : 'inconnu';
  console.error(`[seuil] comptage impossible (${motif})`);
}
