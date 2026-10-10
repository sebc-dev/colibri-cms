/**
 * Vérifier une correction des options d'un formulaire (ticket 03, ADR-0018).
 * Fonction pure (I2) : la déclaration dit quels champs sont à choix et s'ils
 * portent un prix ; un seul refus refuse toute la soumission.
 */
import {
  LIBELLE_OPTION_LONGUEUR_MAX,
  OPTIONS_PAR_CHAMP_MAX,
  type ChampDeclare,
  type FormulaireDeclare,
} from "./declaration.ts";
import { lirePrixSaisi } from "./prix.ts";

export interface OptionBrouillon {
  readonly id: string;
  readonly libelle: string;
  readonly prix?: number;
}

export interface ContenuOptions {
  readonly champs: Readonly<Record<string, readonly OptionBrouillon[]>>;
  readonly derniersNumeros: Readonly<Record<string, number>>;
}

export interface Refus {
  readonly champ: string;
  readonly raison: string;
}

export type ResultatOptions =
  | { readonly ok: true; readonly contenu: ContenuOptions }
  | { readonly ok: false; readonly erreur: "forme-invalide" }
  | {
      readonly ok: false;
      readonly erreur: "valeur-refusee";
      readonly refus: Refus[];
    };

/** Une option soumise dont la forme est vérifiée ; `prix` reste le texte saisi. */
interface OptionSoumise {
  readonly id: string | undefined;
  readonly libelle: string;
  readonly prix: string | undefined;
}

/** Une option soumise qui porte son identifiant, gardé ou attribué. */
interface OptionIdentifiee extends OptionSoumise {
  readonly id: string;
}

/** Le prix d'une option en centimes (`undefined` sans prix), ou la raison du refus. */
type PrixOption =
  | { readonly ok: true; readonly centimes: number | undefined }
  | { readonly ok: false; readonly raison: string };

const FORME_ID = /^o(\d+)$/u;
const SAUT_DE_LIGNE = /[\n\r\u2028\u2029]/u;

const FORME_INVALIDE: ResultatOptions = { ok: false, erreur: "forme-invalide" };

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function suffixe(id: string): number {
  const m = FORME_ID.exec(id);
  return m === null ? 0 : Number(m[1]);
}

function estChampAChoix(c: ChampDeclare): boolean {
  return c.options !== undefined;
}

/** Lit `{ champs: [{ id, options }] }` : les options brutes par champ, ou `null` (forme invalide). */
function lireChampsSoumis(corpsBrut: unknown): Map<string, unknown[]> | null {
  if (!estObjet(corpsBrut) || !Array.isArray(corpsBrut.champs)) return null;
  const soumis = new Map<string, unknown[]>();
  for (const entree of corpsBrut.champs as unknown[]) {
    if (
      !estObjet(entree) ||
      typeof entree.id !== "string" ||
      !Array.isArray(entree.options)
    ) {
      return null;
    }
    if (soumis.has(entree.id)) return null;
    soumis.set(entree.id, entree.options as unknown[]);
  }
  return soumis;
}

/**
 * Rapproche les champs soumis de la déclaration : chacun doit y être un champ à
 * choix, et chaque champ à choix déclaré doit être soumis. Rend les champs à
 * choix dans l'ordre de la déclaration, ou `null` (forme invalide).
 */
function rapprocherDeclaration(
  formulaireDeclare: FormulaireDeclare,
  soumis: ReadonlyMap<string, unknown[]>,
): ChampDeclare[] | null {
  const declares = new Map(formulaireDeclare.champs.map((c) => [c.id, c]));
  for (const id of soumis.keys()) {
    const declare = declares.get(id);
    if (declare === undefined || !estChampAChoix(declare)) return null;
  }
  const champsAChoix = formulaireDeclare.champs.filter(estChampAChoix);
  for (const c of champsAChoix) {
    if (!soumis.has(c.id)) return null;
  }
  return champsAChoix;
}

/** Lit une propriété propre uniquement (jamais héritée d'Object). */
function propre<T>(r: Readonly<Record<string, T>>, cle: string): T | undefined {
  return Object.hasOwn(r, cle) ? r[cle] : undefined;
}

/** Les identifiants d'option que la déclaration et le brouillon courant connaissent pour ce champ. */
function idsConnus(
  champ: ChampDeclare,
  brouillonCourant: ContenuOptions,
): Set<string> {
  const connus = new Set<string>();
  for (const o of champ.options ?? []) connus.add(o.id);
  for (const o of propre(brouillonCourant.champs, champ.id) ?? [])
    connus.add(o.id);
  return connus;
}

/**
 * Vérifie la forme des options soumises d'un champ : un objet, un libellé
 * texte, un prix texte s'il est là, un `id` éventuel connu et non répété.
 * Rend les options lues, ou `null` (forme invalide).
 */
function lireOptionsSoumises(
  brutes: readonly unknown[],
  connus: ReadonlySet<string>,
): OptionSoumise[] | null {
  const vus = new Set<string>();
  const lues: OptionSoumise[] = [];
  for (const o of brutes) {
    if (!estObjet(o)) return null;
    const { id, libelle, prix } = o;
    if (id !== undefined) {
      if (typeof id !== "string" || !connus.has(id) || vus.has(id)) return null;
      vus.add(id);
    }
    if (typeof libelle !== "string") return null;
    if (prix !== undefined && typeof prix !== "string") return null;
    lues.push({ id, libelle, prix });
  }
  return lues;
}

/**
 * Le plus grand numéro `o<n>` que le champ a connu : déclaration, brouillon
 * courant et soumission, et le dernier numéro que le brouillon courant retient
 * — jamais la soumission. Un numéro attribué ne revient jamais (ADR-0018).
 */
function plafondDesNumeros(
  champ: ChampDeclare,
  brouillonCourant: ContenuOptions,
  options: readonly OptionSoumise[],
): number {
  let max = propre(brouillonCourant.derniersNumeros, champ.id) ?? 0;
  for (const o of champ.options ?? []) max = Math.max(max, suffixe(o.id));
  for (const o of propre(brouillonCourant.champs, champ.id) ?? [])
    max = Math.max(max, suffixe(o.id));
  for (const o of options) {
    if (o.id !== undefined) max = Math.max(max, suffixe(o.id));
  }
  return max;
}

/**
 * Garde l'`id` d'une option qui en porte un ; attribue `o<n>`, au-delà du
 * plafond et dans l'ordre de la soumission, à chaque option ajoutée.
 */
function attribuerIdentifiants(
  options: readonly OptionSoumise[],
  plafond: number,
): {
  readonly identifiees: OptionIdentifiee[];
  readonly dernierNumero: number;
} {
  let dernierNumero = plafond;
  const identifiees: OptionIdentifiee[] = [];
  for (const o of options) {
    let id = o.id;
    if (id === undefined) {
      dernierNumero += 1;
      id = `o${String(dernierNumero)}`;
    }
    identifiees.push({ ...o, id });
  }
  return { identifiees, dernierNumero };
}

/** La raison de refuser un libellé, ou `undefined` s'il convient ; `brut` est le libellé soumis. */
function raisonDuLibelle(
  brut: string,
  libelle: string,
  libellesVus: ReadonlySet<string>,
): string | undefined {
  if (libelle.length === 0) return "libelle-vide";
  if (SAUT_DE_LIGNE.test(brut)) return "libelle-saut-de-ligne";
  if (Array.from(libelle).length > LIBELLE_OPTION_LONGUEUR_MAX)
    return "libelle-trop-long";
  if (libellesVus.has(libelle.toLowerCase())) return "libelle-en-double";
  return undefined;
}

/** Un champ avec prix exige un prix lisible ; un champ sans prix n'en admet aucun. */
function lirePrixOption(
  avecPrix: boolean,
  saisi: string | undefined,
): PrixOption {
  if (!avecPrix) {
    if (saisi !== undefined) return { ok: false, raison: "prix-interdit" };
    return { ok: true, centimes: undefined };
  }
  if (saisi === undefined) return { ok: false, raison: "prix-manquant" };
  const lu = lirePrixSaisi(saisi);
  if (!lu.ok) return { ok: false, raison: lu.raison };
  return { ok: true, centimes: lu.centimes };
}

/**
 * Vérifie une option au rang `rang` de la soumission — son libellé, puis son
 * prix — et rend ses refus avec l'option telle que le brouillon la retiendra.
 */
function verifierOption(
  champ: ChampDeclare,
  option: OptionIdentifiee,
  rang: number,
  libellesVus: ReadonlySet<string>,
): { readonly lue: OptionBrouillon; readonly refus: Refus[] } {
  const base = `${champ.id}.${String(rang)}`;
  const libelle = option.libelle.trim();
  const refus: Refus[] = [];
  const raisonLibelle = raisonDuLibelle(option.libelle, libelle, libellesVus);
  if (raisonLibelle !== undefined)
    refus.push({ champ: `${base}.libelle`, raison: raisonLibelle });
  const prix = lirePrixOption(champ.avecPrix, option.prix);
  if (!prix.ok) refus.push({ champ: `${base}.prix`, raison: prix.raison });
  const centimes = prix.ok ? prix.centimes : undefined;
  const lue =
    centimes === undefined
      ? { id: option.id, libelle }
      : { id: option.id, libelle, prix: centimes };
  return { lue, refus };
}

/** Vérifie les options d'un champ — leur nombre, puis chacune dans l'ordre. */
function verifierChamp(
  champ: ChampDeclare,
  options: readonly OptionIdentifiee[],
): { readonly lues: OptionBrouillon[]; readonly refus: Refus[] } {
  const refus: Refus[] = [];
  if (options.length < 1 || options.length > OPTIONS_PAR_CHAMP_MAX) {
    refus.push({ champ: champ.id, raison: "nombre-options" });
  }
  const libellesVus = new Set<string>();
  const lues = options.map((option, rang) => {
    const verifiee = verifierOption(champ, option, rang, libellesVus);
    refus.push(...verifiee.refus);
    libellesVus.add(verifiee.lue.libelle.toLowerCase());
    return verifiee.lue;
  });
  return { lues, refus };
}

export function appliquerOptions(
  formulaireDeclare: FormulaireDeclare,
  brouillonCourant: ContenuOptions,
  corpsBrut: unknown,
): ResultatOptions {
  const soumis = lireChampsSoumis(corpsBrut);
  if (soumis === null) return FORME_INVALIDE;
  const champsAChoix = rapprocherDeclaration(formulaireDeclare, soumis);
  if (champsAChoix === null) return FORME_INVALIDE;

  const refus: Refus[] = [];
  const entreesChamps: [string, OptionBrouillon[]][] = [];
  const entreesNumeros: [string, number][] = [];

  for (const champ of champsAChoix) {
    const brutes = soumis.get(champ.id) ?? [];
    const options = lireOptionsSoumises(
      brutes,
      idsConnus(champ, brouillonCourant),
    );
    if (options === null) return FORME_INVALIDE;
    const plafond = plafondDesNumeros(champ, brouillonCourant, options);
    const { identifiees, dernierNumero } = attribuerIdentifiants(
      options,
      plafond,
    );
    const verifie = verifierChamp(champ, identifiees);
    refus.push(...verifie.refus);
    entreesChamps.push([champ.id, verifie.lues]);
    entreesNumeros.push([champ.id, dernierNumero]);
  }

  if (refus.length > 0) return { ok: false, erreur: "valeur-refusee", refus };
  return {
    ok: true,
    contenu: {
      champs: Object.fromEntries(entreesChamps),
      derniersNumeros: Object.fromEntries(entreesNumeros),
    },
  };
}
