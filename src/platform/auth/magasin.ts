/**
 * Le magasin de connexion — ticket 03 (specs/001-connexion-par-code/
 * 03-code-vers-adresse-autorisee.md) et ticket 05, le plafond de la fenêtre
 * glissante (specs/001-connexion-par-code/05-plafond-horaire.md).
 *
 * Zone `platform` (docs/archi.md, I1) : n'importe que `core/`
 * (`engendrerCode`, `PLAFOND_CODES_PAR_HEURE`, `FENETRE_PLAFOND_MS`) —
 * jamais `admin/`, `render/` ni `site/`.
 *
 * Écrit l'empreinte salée d'un code (ADR-0001, ADR-0002 : « de chaque code
 * n'est conservée qu'une empreinte salée ») et l'identifiant d'appareil du
 * demandeur (FR-120) — jamais le code en clair, qui ne transite que dans la
 * valeur de retour d'`ecrireCodeSiPlafondNonAtteint`, à la charge de
 * l'appelant de le porter jusqu'à `demanderExpeditionDuCode` sans le
 * persister ailleurs.
 */
import { engendrerCode, DUREE_DE_VIE_CODE_SECONDES } from '../../core/auth/code.ts';
import { PLAFOND_CODES_PAR_HEURE, FENETRE_PLAFOND_MS } from '../../core/auth/regles.ts';

const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const DUREE_DE_VIE_CODE_MS = DUREE_DE_VIE_CODE_SECONDES * 1000; // ADR-0001 — dérivé de core/auth/code.ts (source unique).

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé, cf. D1Database). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
    all<T = unknown>(): Promise<{ results: T[] }>;
  };
}

function octetsVersHex(octets: Uint8Array): string {
  return Array.from(octets)
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

function selAleatoire(): string {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return octetsVersHex(octets);
}

async function empreinteSalee(sel: string, code: string): Promise<string> {
  const donnees = new TextEncoder().encode(`${sel}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', donnees);
  return octetsVersHex(new Uint8Array(digest));
}

/** L'adresse soumise est-elle l'adresse autorisée enregistrée en base (FR-005) ? */
export async function estAdresseAutorisee(db: DB, adresse: string): Promise<boolean> {
  const resultat = await db
    .prepare(`select 1 as trouve from ${TABLE_ADRESSES} where adresse = ?1 limit 1`)
    .bind(adresse)
    .all<{ trouve: number }>();
  return resultat.results.length > 0;
}

/**
 * Compte les codes écrits dans la fenêtre glissante qui précède `maintenant`
 * (ticket 05, c3) — ni `essais` (brûlage) ni `annule_le` (annulation) ne
 * filtrent ce compte : une ligne morte reste comptée tant qu'elle n'est pas
 * sortie de la fenêtre, sinon l'effacer libérerait une place que le message
 * déjà parti occupe toujours dans la boîte (SPEC.md § Ce que ça livre).
 *
 * Lecture seule — sert à décider l'écran quand l'adresse soumise n'est pas
 * l'adresse autorisée, cas où rien ne s'écrit jamais (l'épreuve n'a donc
 * pas besoin d'être indivisible de l'écriture ici, `ecrireCodeSiPlafondNonAtteint`
 * en porte seule la responsabilité).
 */
export async function compterCodesDansLaFenetre(db: DB, maintenant: number): Promise<number> {
  const debutFenetre = maintenant - FENETRE_PLAFOND_MS;
  const resultat = await db
    .prepare(`select count(*) as n from ${TABLE_CODES} where creee_le > ?1`)
    .bind(debutFenetre)
    .all<{ n: number }>();
  return resultat.results[0]?.n ?? 0;
}

/**
 * Engendre un code et écrit sa seule empreinte salée liée à l'appareil
 * demandeur — sauf si le plafond de la fenêtre glissante est déjà atteint
 * (ticket 05), auquel cas rien ne s'écrit et `null` est rendu.
 *
 * L'épreuve du plafond et l'écriture sont une seule requête SQL
 * (`insert … select … where`) plutôt qu'un « compter puis écrire » : c'est
 * ce qui rend l'épreuve indivisible de l'écriture (c5) — deux soumissions
 * concurrentes ne peuvent jamais faire franchir le plafond à elles deux,
 * D1 n'exécutant qu'une requête à la fois sur une même base.
 *
 * Rend le code en clair si la ligne a été écrite — à charge pour l'appelant
 * de le transmettre à l'expédition sans le conserver.
 */
export async function ecrireCodeSiPlafondNonAtteint(
  db: DB,
  identifiantAppareil: string,
  maintenant: number,
): Promise<string | null> {
  const code = engendrerCode();
  const sel = selAleatoire();
  const empreinte = await empreinteSalee(sel, code);
  const debutFenetre = maintenant - FENETRE_PLAFOND_MS;

  const resultat = await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le)
       select ?1, ?2, ?3, ?4, ?5
       where (select count(*) from ${TABLE_CODES} where creee_le > ?6) < ?7`,
    )
    .bind(
      identifiantAppareil,
      empreinte,
      sel,
      maintenant,
      maintenant + DUREE_DE_VIE_CODE_MS,
      debutFenetre,
      PLAFOND_CODES_PAR_HEURE,
    )
    .run();

  return resultat.meta.changes > 0 ? code : null;
}
