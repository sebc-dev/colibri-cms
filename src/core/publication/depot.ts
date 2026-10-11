/**
 * Le dépôt du contenu publié sur la branche principale (ADR-0021) : un arbre
 * inline sur la tête courante, un commit à un parent, la branche déplacée
 * sans force. Refus d'avance rapide : relecture et rebâtissage (deux
 * nouveaux essais au plus). Réponse perdue : reconnue si l'arbre bâti est
 * déjà celui de la tête.
 */
import type { IssueForge, Forge, EntreeArbre } from './forge.ts';
import type { PlanDepot } from './plan.ts';
import { cheminAutorise } from './prefixes.ts';

const REF_PRINCIPALE = 'refs/heads/main';
const ESSAIS_MAX = 3;

export type ResultatDepot =
  | { readonly aboutie: true; readonly reconnue: boolean; readonly commit: string; readonly essais: number }
  | { readonly aboutie: false; readonly raison: IssueForge | 'chemin-refuse' };

export async function deposerContenu(
  forge: Forge,
  plan: PlanDepot,
  message: string,
): Promise<ResultatDepot> {
  const chemins = [...plan.ecritures.map((e) => e.chemin), ...plan.suppressions];
  if (!chemins.every((chemin) => cheminAutorise(chemin))) {
    return { aboutie: false, raison: 'chemin-refuse' };
  }
  const entrees: EntreeArbre[] = [
    ...plan.ecritures.map((e) => ({ chemin: e.chemin, contenu: e.contenu })),
    ...plan.suppressions.map((chemin) => ({ chemin, sha: null })),
  ];

  let derniere: IssueForge = 'refusee-pas-avance-rapide';
  for (let essai = 1; essai <= ESSAIS_MAX; essai += 1) {
    const issue = await tenterUneFois(forge, entrees, message, essai);
    if (!('rejouer' in issue)) return issue;
    derniere = issue.rejouer;
  }
  return { aboutie: false, raison: derniere };
}

/**
 * Un essai sur la tête courante ; `{ rejouer }` porte l'issue quand le déplacement est refusé
 * faute d'avance rapide ou injoignable (la requête a pu aboutir : le nouvel essai relit la tête).
 */
async function tenterUneFois(
  forge: Forge,
  entrees: readonly EntreeArbre[],
  message: string,
  essai: number,
): Promise<ResultatDepot | { readonly rejouer: IssueForge }> {
  const tete = await forge.lireRef(REF_PRINCIPALE);
  if (!tete.ok) return { aboutie: false, raison: tete.issue };
  const commitTete = await forge.lireCommit(tete.valeur.sha);
  if (!commitTete.ok) return { aboutie: false, raison: commitTete.issue };
  const arbre = await forge.creerArbre({ baseArbre: commitTete.valeur.arbre, entrees });
  if (!arbre.ok) return { aboutie: false, raison: arbre.issue };

  if (arbre.valeur.sha === commitTete.valeur.arbre) {
    return { aboutie: true, reconnue: true, commit: tete.valeur.sha, essais: essai };
  }

  const commit = await forge.creerCommit({
    message,
    arbre: arbre.valeur.sha,
    parents: [tete.valeur.sha],
  });
  if (!commit.ok) return { aboutie: false, raison: commit.issue };
  const deplacement = await forge.deplacerRef(REF_PRINCIPALE, commit.valeur.sha, false);
  if (deplacement.ok) {
    return { aboutie: true, reconnue: false, commit: commit.valeur.sha, essais: essai };
  }
  if (deplacement.issue !== 'refusee-pas-avance-rapide' && deplacement.issue !== 'injoignable') {
    return { aboutie: false, raison: deplacement.issue };
  }
  return { rejouer: deplacement.issue };
}
