/**
 * Les options courantes d'un formulaire (change 010, ticket 06, ADR-0018) :
 * pour chaque champ à choix, les options du brouillon s'il en porte pour ce
 * champ et qu'elles s'accordent encore à la déclaration, sinon celles de la
 * déclaration. Fonction pure (I2), rapprochement par identifiants stables :
 * un brouillon qui ne s'accorde plus ne fait jamais échouer l'écran.
 */
import type { FormulaireDeclare } from './declaration.ts';
import type { OptionBrouillon } from './options.ts';

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Une option du brouillon lisible, avec ou sans prix selon le champ déclaré. */
function lireOption(brut: unknown, avecPrix: boolean): OptionBrouillon | undefined {
  if (!estObjet(brut)) return undefined;
  const { id, libelle, prix } = brut;
  if (typeof id !== 'string' || id.length === 0) return undefined;
  if (typeof libelle !== 'string' || libelle.length === 0) return undefined;
  if (avecPrix) {
    if (typeof prix !== 'number' || !Number.isInteger(prix) || prix < 0) return undefined;
    return { id, libelle, prix };
  }
  if (prix !== undefined) return undefined;
  return { id, libelle };
}

/** Les options d'un champ dans le brouillon, ou `undefined` si absentes ou en désaccord. */
function optionsDuBrouillon(
  brouillon: unknown,
  idChamp: string,
  avecPrix: boolean,
): OptionBrouillon[] | undefined {
  if (!estObjet(brouillon) || !estObjet(brouillon.champs)) return undefined;
  if (!Object.hasOwn(brouillon.champs, idChamp)) return undefined;
  const brutes = brouillon.champs[idChamp];
  if (!Array.isArray(brutes) || brutes.length === 0) return undefined;
  const lues: OptionBrouillon[] = [];
  for (const brute of brutes as unknown[]) {
    const lue = lireOption(brute, avecPrix);
    if (lue === undefined) return undefined;
    lues.push(lue);
  }
  return lues;
}

/**
 * Les options à montrer par champ à choix (identifiant du champ), dans l'ordre
 * de la déclaration. `brouillon` est tenu pour absent s'il n'a pas la forme
 * attendue ; `derniersNumeros` n'entre pas dans l'affichage.
 */
export function optionsCourantes(
  formulaireDeclare: FormulaireDeclare,
  brouillon: unknown,
): Map<string, readonly OptionBrouillon[]> {
  const courantes = new Map<string, readonly OptionBrouillon[]>();
  for (const champ of formulaireDeclare.champs) {
    if (champ.options === undefined) continue;
    courantes.set(
      champ.id,
      optionsDuBrouillon(brouillon, champ.id, champ.avecPrix) ?? champ.options,
    );
  }
  return courantes;
}
