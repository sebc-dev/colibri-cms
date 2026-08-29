/**
 * Le magasin de connexion — ticket 03 (specs/001-connexion-par-code/
 * 03-code-vers-adresse-autorisee.md).
 *
 * Zone `platform` (docs/archi.md, I1) : n'importe que `core/`
 * (`engendrerCode`) — jamais `admin/`, `render/` ni `site/`.
 *
 * Écrit l'empreinte salée d'un code (ADR-0001, ADR-0002 : « de chaque code
 * n'est conservée qu'une empreinte salée ») et l'identifiant d'appareil du
 * demandeur (FR-120) — jamais le code en clair, qui ne transite que dans la
 * valeur de retour d'`ecrireCode`, à la charge de l'appelant de le porter
 * jusqu'à `demanderExpeditionDuCode` sans le persister ailleurs.
 */
import { engendrerCode, DUREE_DE_VIE_CODE_SECONDES } from '../../core/auth/code.ts';

const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const DUREE_DE_VIE_CODE_MS = DUREE_DE_VIE_CODE_SECONDES * 1000; // ADR-0001 — dérivé de core/auth/code.ts (source unique).

/** Le sous-ensemble de D1 dont ce magasin a besoin (duck-typé, cf. D1Database). */
export interface DB {
  prepare(query: string): {
    bind(...valeurs: unknown[]): {
      run(): Promise<unknown>;
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
 * Engendre un code, écrit sa seule empreinte salée liée à l'appareil
 * demandeur, et rend le code en clair — à charge pour l'appelant de le
 * transmettre à l'expédition sans le conserver.
 */
export async function ecrireCode(db: DB, identifiantAppareil: string): Promise<string> {
  const code = engendrerCode();
  const sel = selAleatoire();
  const empreinte = await empreinteSalee(sel, code);
  const creeeLe = Date.now();

  await db
    .prepare(
      `insert into ${TABLE_CODES} (identifiant_appareil, empreinte, sel, creee_le, expire_le) values (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(identifiantAppareil, empreinte, sel, creeeLe, creeeLe + DUREE_DE_VIE_CODE_MS)
    .run();

  return code;
}
