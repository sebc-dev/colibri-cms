/**
 * Le modèle de lecture de la déclaration des formulaires de devis (ticket 01,
 * openspec/changes/010-reglage-des-formulaires/tickets/
 * 01-lire-la-declaration-des-formulaires.md ; ADR-0018 —
 * `content/formulaires/<id>/formulaire.json`, posé à la main par
 * l'intégrateur hors administration).
 *
 * Zone `core` (I1/I2) : fonction pure, sans base, HTTP ni framework. Le
 * chargement du contenu versionné vit dans `src/platform/contenu/formulaires.ts`.
 *
 * Une entrée mal formée est écartée sans faire échouer les autres. Aucun nom
 * ni libellé n'est fabriqué depuis un identifiant (FR-117).
 */

/** La nature d'un champ, posée par l'intégrateur (ADR-0018). */
export type NatureChamp =
  | 'choix-unique'
  | 'choix-multiple'
  | 'texte'
  | 'texte-long'
  | 'email'
  | 'telephone';

const NATURES_VALIDES: readonly NatureChamp[] = [
  'choix-unique',
  'choix-multiple',
  'texte',
  'texte-long',
  'email',
  'telephone',
];

const NATURES_A_CHOIX: readonly NatureChamp[] = ['choix-unique', 'choix-multiple'];

/** Le prix maximal d'une option, en centimes. */
export const PRIX_CENTIMES_MAX = 9_999_999;

/** Le nombre maximal d'options d'un champ à choix. */
export const OPTIONS_PAR_CHAMP_MAX = 30;

/** La longueur maximale (caractères) du libellé d'une option. */
export const LIBELLE_OPTION_LONGUEUR_MAX = 80;

/** Un fichier brut : identifiant = nom du répertoire, contenu = JSON lu. */
export interface FichierFormulaireBrut {
  readonly id: string;
  readonly contenu: unknown;
}

/** Une option d'un champ à choix ; `prix` (centimes) seulement en champ avec prix. */
export interface OptionDeclaree {
  readonly id: string;
  readonly libelle: string;
  readonly prix?: number;
}

/** Un champ lu. `options` n'existe que sur un champ à choix. */
export interface ChampDeclare {
  readonly id: string;
  readonly nature: NatureChamp;
  readonly libelle: string;
  readonly obligatoire: boolean;
  readonly avecPrix: boolean;
  readonly options?: readonly OptionDeclaree[];
}

/** Un formulaire lu. */
export interface FormulaireDeclare {
  readonly id: string;
  readonly nom: string;
  readonly champs: readonly ChampDeclare[];
}

function estNatureValide(valeur: unknown): valeur is NatureChamp {
  return typeof valeur === 'string' && (NATURES_VALIDES as readonly string[]).includes(valeur);
}

function texteNonVide(valeur: unknown): string | undefined {
  if (typeof valeur !== 'string') return undefined;
  return valeur.trim().length > 0 ? valeur : undefined;
}

function estPrixValide(valeur: unknown): valeur is number {
  return (
    typeof valeur === 'number' &&
    Number.isInteger(valeur) &&
    valeur >= 0 &&
    valeur <= PRIX_CENTIMES_MAX
  );
}

function lireOptions(brut: unknown, avecPrix: boolean): OptionDeclaree[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const lues: OptionDeclaree[] = [];
  for (const entree of brut as unknown[]) {
    if (typeof entree !== 'object' || entree === null) continue;
    const o = entree as Record<string, unknown>;
    const id = texteNonVide(o.id);
    const libelle = texteNonVide(o.libelle);
    if (id === undefined || libelle === undefined || vus.has(id)) continue;
    if (avecPrix) {
      if (!estPrixValide(o.prix)) continue;
      vus.add(id);
      lues.push({ id, libelle, prix: o.prix });
    } else {
      vus.add(id);
      lues.push({ id, libelle });
    }
  }
  return lues;
}

function lireChamps(brut: unknown): ChampDeclare[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const lus: ChampDeclare[] = [];
  for (const entree of brut as unknown[]) {
    if (typeof entree !== 'object' || entree === null) continue;
    const c = entree as Record<string, unknown>;
    const id = texteNonVide(c.id);
    const libelle = texteNonVide(c.libelle);
    if (id === undefined || libelle === undefined || vus.has(id)) continue;
    if (!estNatureValide(c.nature)) continue;
    const obligatoire = c.obligatoire === true;
    if (NATURES_A_CHOIX.includes(c.nature)) {
      const avecPrix = c.avecPrix === true;
      const options = lireOptions(c.options, avecPrix);
      if (options.length === 0) continue;
      vus.add(id);
      lus.push({ id, nature: c.nature, libelle, obligatoire, avecPrix, options });
    } else {
      vus.add(id);
      lus.push({ id, nature: c.nature, libelle, obligatoire, avecPrix: false });
    }
  }
  return lus;
}

/** Compare deux identifiants par unités de code, sans dépendre de la langue. */
function comparerIdentifiants(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Lit les fichiers bruts des formulaires : rend les formulaires lisibles,
 * triés par identifiant croissant. Ne lève jamais.
 */
export function lireFormulairesDeclares(
  fichiers: readonly FichierFormulaireBrut[],
): FormulaireDeclare[] {
  const vus = new Set<string>();
  const lus: FormulaireDeclare[] = [];
  for (const fichier of fichiers) {
    if (typeof fichier.id !== 'string' || fichier.id.length === 0 || vus.has(fichier.id)) continue;
    if (typeof fichier.contenu !== 'object' || fichier.contenu === null) continue;
    const racine = fichier.contenu as Record<string, unknown>;
    const nom = texteNonVide(racine.nom);
    if (nom === undefined) continue;
    const champs = lireChamps(racine.champs);
    if (champs.length === 0) continue;
    vus.add(fichier.id);
    lus.push({ id: fichier.id, nom: nom.trim(), champs });
  }
  return lus.sort((a, b) => comparerIdentifiants(a.id, b.id));
}
