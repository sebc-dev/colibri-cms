/**
 * La logique pure de la liste des demandes (change 013, ticket 04) : bornage de la page, nombre
 * de pages, formulaire choisi, nom d'un formulaire. Sans framework ni plateforme (I2).
 */

export const DEMANDES_PAR_PAGE = 50;

export interface FormulairePresent {
  readonly id: string;
  readonly nom: string;
}

export interface NomGarde {
  readonly nom: string;
  readonly recueLe: number;
}

/** Le nombre de pages de 50 ; au moins une, même sans demande. */
export function nombreDePages(total: number): number {
  return Math.max(1, Math.ceil(total / DEMANDES_PAR_PAGE));
}

/** `?page=` converti en entier, borné entre 1 et la dernière page. */
export function bornerPage(brut: string | null | undefined, dernierePage: number): number {
  const texte = (brut ?? '').trim();
  if (!/^-?\d+$/.test(texte)) return 1;
  const page = Number.parseInt(texte, 10);
  if (!Number.isSafeInteger(page)) return texte.startsWith('-') ? 1 : dernierePage;
  if (page < 1) return 1;
  return Math.min(page, dernierePage);
}

/** Le formulaire choisi s'il désigne une demande présente (comparé à la liste lue), sinon `null`. */
export function choisirFormulaire(brut: string | null | undefined, presents: readonly FormulairePresent[]): string | null {
  if (brut === null || brut === undefined || brut === '') return null;
  return presents.find((f) => f.id === brut)?.id ?? null;
}

/** Le nom de la déclaration d'abord, sinon le nom gardé sur la demande la plus récente. */
export function nomDuFormulaire(
  id: string,
  declares: readonly FormulairePresent[],
  gardes: readonly NomGarde[],
): string {
  const declare = declares.find((f) => f.id === id);
  if (declare) return declare.nom;
  let recent: NomGarde | undefined;
  for (const garde of gardes) {
    if (recent === undefined || garde.recueLe > recent.recueLe) recent = garde;
  }
  return recent?.nom ?? id;
}
