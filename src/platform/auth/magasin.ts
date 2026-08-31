/**
 * Le magasin de connexion — ticket 03 (specs/001-connexion-par-code/
 * 03-code-vers-adresse-autorisee.md), ticket 05, le plafond de la fenêtre
 * glissante (specs/001-connexion-par-code/05-plafond-horaire.md), et ticket
 * 06, le code recopié ouvre la session (specs/001-connexion-par-code/
 * 06-code-ouvre-la-session.md).
 *
 * Zone `platform` (docs/archi.md, I1) : n'importe que `core/`
 * (`engendrerCode`, `normaliserCode`, `PLAFOND_CODES_PAR_HEURE`,
 * `FENETRE_PLAFOND_MS`) — jamais `admin/`, `render/`, `site/`, ni un autre
 * fichier de `platform/` (la matrice ne fait aucune exception :
 * `src/platform/session/index.ts` duplique donc son propre sous-ensemble de
 * D1 plutôt que d'importer celui-ci).
 *
 * Écrit l'empreinte salée d'un code (ADR-0001, ADR-0002 : « de chaque code
 * n'est conservée qu'une empreinte salée ») et l'identifiant d'appareil du
 * demandeur (FR-120) — jamais le code en clair, qui ne transite que dans la
 * valeur de retour d'`ecrireCodeSiPlafondNonAtteint`, à la charge de
 * l'appelant de le porter jusqu'à `demanderExpeditionDuCode` sans le
 * persister ailleurs.
 *
 * Ticket 06 — `ouvrirSessionSiCodeValide` ne filtre jamais les lignes
 * candidates par appareil à la lecture (ticket 07 § « le piège à ne pas
 * ouvrir ») : c'est `core/auth/verdict.ts`, à partir de l'état lu en entier,
 * qui tranche — un filtre SQL en amont renverrait l'éditrice sur un autre
 * appareil pour un code qu'elle a bien demandé sur le sien. La consommation
 * (poser `utilise_le`) est une seule requête conditionnelle, comme
 * `ecrireCodeSiPlafondNonAtteint` : deux soumissions concurrentes du même
 * code ne peuvent pas ouvrir deux sessions à elles deux.
 */
import { engendrerCode, normaliserCode, DUREE_DE_VIE_CODE_SECONDES } from '../../core/auth/code.ts';
import { PLAFOND_CODES_PAR_HEURE, FENETRE_PLAFOND_MS } from '../../core/auth/regles.ts';
import { rendreVerdict, SEUIL_ESSAIS_BRULAGE, type RaisonRefus } from '../../core/auth/verdict.ts';

const TABLE_ADRESSES = 'adresses_autorisees';
const TABLE_CODES = 'codes_connexion';
const TABLE_SESSIONS = 'sessions';
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
 *
 * Ticket 07 — l'annulation : si une ligne a bien été écrite, tout code
 * antérieur du même appareil, encore non annulé, est marqué `annule_le`
 * (`creee_le < maintenant` exclut naturellement la ligne qui vient d'être
 * insérée) — un code demandé depuis un autre appareil n'est jamais touché.
 * Rien n'est annulé si le plafond est atteint (aucune ligne écrite) : le
 * code précédent de l'appareil, seul recours de l'éditrice, doit rester
 * utilisable.
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

  if (resultat.meta.changes === 0) return null;

  await db
    .prepare(
      `update ${TABLE_CODES} set annule_le = ?1 where identifiant_appareil = ?2 and creee_le < ?1 and annule_le is null`,
    )
    .bind(maintenant, identifiantAppareil)
    .run();

  return code;
}

function jetonAleatoire(): string {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return octetsVersHex(octets);
}

let schemaSessionsAssure: Promise<void> | null = null;

/**
 * Crée `sessions` si elle n'existe pas encore — même définition que
 * `migrations/0003_sessions.sql` (voir son commentaire) : ce garde défensif
 * la rejoue pour rester fonctionnel sur une D1 où seule la migration 0002 a
 * été rejouée (couture de test du ticket 06).
 */
async function assurerTableSessions(db: DB): Promise<void> {
  if (!schemaSessionsAssure) {
    schemaSessionsAssure = db
      .prepare(
        `create table if not exists ${TABLE_SESSIONS} (id text primary key, identifiant_appareil text not null, creee_le integer not null)`,
      )
      .bind()
      .run()
      .then(() => undefined);
  }
  await schemaSessionsAssure;
}

interface LigneCodeBrute {
  id: number;
  identifiant_appareil: string;
  empreinte: string;
  sel: string;
  expire_le: number;
  utilise_le: number | null;
  annule_le: number | null;
  essais: number;
}

const COLONNES_LIGNE_CODE =
  'id, identifiant_appareil, empreinte, sel, expire_le, utilise_le, annule_le, essais';

/**
 * Rend la ligne de `codes_connexion` dont l'empreinte salée correspond au
 * code normalisé soumis, ou `null` si aucune ne correspond — sur tout
 * l'historique, jamais filtrée par appareil (ticket 07 § « le piège à ne
 * pas ouvrir ») : c'est `rendreVerdict` qui juge l'appareil (et le
 * brûlage), à partir de la ligne entière.
 */
async function trouverLigneParCode(db: DB, codeNormalise: string): Promise<LigneCodeBrute | null> {
  const resultat = await db
    .prepare(`select ${COLONNES_LIGNE_CODE} from ${TABLE_CODES} order by creee_le desc`)
    .bind()
    .all<LigneCodeBrute>();
  for (const ligne of resultat.results) {
    const empreinteCalculee = await empreinteSalee(ligne.sel, codeNormalise);
    if (empreinteCalculee === ligne.empreinte) return ligne;
  }
  return null;
}

/**
 * Rend la ligne active (non annulée) la plus récente de l'appareil, ou
 * `null` s'il n'en a aucune — sert, ticket 07, à trouver la ligne contre
 * laquelle compter une saisie fautive qui ne correspond à aucun code connu
 * (T10) : le code soumis étant faux, il ne peut jamais désigner lui-même la
 * ligne à pénaliser.
 */
async function trouverLigneActiveDeLAppareil(db: DB, identifiantAppareil: string): Promise<LigneCodeBrute | null> {
  const resultat = await db
    .prepare(
      `select ${COLONNES_LIGNE_CODE} from ${TABLE_CODES} where identifiant_appareil = ?1 and annule_le is null order by creee_le desc limit 1`,
    )
    .bind(identifiantAppareil)
    .all<LigneCodeBrute>();
  return resultat.results[0] ?? null;
}

/**
 * Incrémente `essais` d'une ligne d'une unité et rend le compte qui en
 * résulte — appelée une fois par saisie fautive contre la ligne active de
 * l'appareil (ticket 07, T10). `rendreVerdict` (et non cette fonction) juge
 * si ce nouveau compte atteint le seuil de brûlage.
 */
async function incrementerEssais(db: DB, id: number): Promise<number> {
  await db.prepare(`update ${TABLE_CODES} set essais = essais + 1 where id = ?1`).bind(id).run();
  const resultat = await db
    .prepare(`select essais from ${TABLE_CODES} where id = ?1`)
    .bind(id)
    .all<{ essais: number }>();
  return resultat.results[0]?.essais ?? SEUIL_ESSAIS_BRULAGE;
}

/** Le résultat d'une soumission de code (ticket 07) : la session ouverte, ou la raison du refus. */
export type ResultatSoumissionCode =
  | { readonly reussi: true; readonly jeton: string }
  | { readonly reussi: false; readonly raison: RaisonRefus };

/**
 * Ouvre une session si le code soumis (normalisé, ticket 06 c3) correspond,
 * pour l'appareil courant, à une ligne non brûlée, non expirée, non déjà
 * utilisée, non annulée de `codes_connexion` (c1/c2/c4/c5) — sinon rend la
 * raison du refus (ticket 07), pour que l'écran dise quel geste reprendre.
 *
 * Ticket 07, T10 — quand le code soumis ne correspond à aucune ligne
 * connue, c'est une saisie fautive : elle est comptée contre la ligne
 * active de l'appareil (`trouverLigneActiveDeLAppareil`), jamais contre la
 * ligne que le code faux prétendrait désigner (il n'en désigne aucune). Si
 * ce compte atteint le seuil, la ligne est brûlée (`rendreVerdict` le juge
 * à la prochaine lecture, cette fonction ne filtre jamais à l'écriture) et
 * la raison rendue ici l'annonce immédiatement, sans attendre une relecture.
 *
 * La consommation (poser `utilise_le`) est une seule requête conditionnelle
 * (`update … where utilise_le is null and annule_le is null and expire_le >
 * ?`), à l'image d'`ecrireCodeSiPlafondNonAtteint` : deux soumissions
 * concurrentes du même code ne peuvent jamais ouvrir deux sessions à elles
 * deux.
 *
 * Rend le jeton de session (opaque, à poser tel quel dans le cookie
 * `__Host-session`) si une session a été ouverte.
 */
export async function ouvrirSessionSiCodeValide(
  db: DB,
  identifiantAppareilCourant: string,
  codeSaisi: string,
  maintenant: number,
): Promise<ResultatSoumissionCode> {
  const codeNormalise = normaliserCode(codeSaisi);
  const ligne = await trouverLigneParCode(db, codeNormalise);

  if (!ligne) {
    const ligneActive = await trouverLigneActiveDeLAppareil(db, identifiantAppareilCourant);
    if (ligneActive) {
      const essaisApres = await incrementerEssais(db, ligneActive.id);
      if (essaisApres >= SEUIL_ESSAIS_BRULAGE) {
        return { reussi: false, raison: 'brule' };
      }
    }
    return { reussi: false, raison: 'introuvable' };
  }

  const verdict = rendreVerdict({
    ligne: {
      identifiantAppareil: ligne.identifiant_appareil,
      expireLe: ligne.expire_le,
      utiliseLe: ligne.utilise_le,
      annuleLe: ligne.annule_le,
      essais: ligne.essais,
    },
    identifiantAppareilCourant,
    maintenant,
  });
  if (!verdict.valide) return { reussi: false, raison: verdict.raison };

  const consommation = await db
    .prepare(
      `update ${TABLE_CODES} set utilise_le = ?1 where id = ?2 and utilise_le is null and annule_le is null and expire_le > ?3 and essais < ?4`,
    )
    .bind(maintenant, ligne.id, maintenant, SEUIL_ESSAIS_BRULAGE)
    .run();
  if (consommation.meta.changes === 0) return { reussi: false, raison: 'introuvable' };

  await assurerTableSessions(db);
  const jeton = jetonAleatoire();
  await db
    .prepare(`insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le) values (?1, ?2, ?3)`)
    .bind(jeton, identifiantAppareilCourant, maintenant)
    .run();
  return { reussi: true, jeton };
}
