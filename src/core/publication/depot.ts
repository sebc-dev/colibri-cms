/**
 * Le dépôt du contenu publié sur la branche principale (ADR-0021) : un arbre
 * inline sur la tête courante, un commit à un parent, la branche déplacée
 * sans force. Refus d'avance rapide : relecture et rebâtissage (deux
 * nouveaux essais au plus). Réponse perdue : reconnue si l'arbre bâti est
 * déjà celui de la tête.
 */
import type { IssueForge, Forge, EntreeArbre } from './forge.ts';
import type { PlanDepot } from './plan.ts';
import { cheminAutorise, identifiantValide } from './prefixes.ts';

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

const REF_MEDIA = 'refs/heads/media';

export interface ImagePubliee {
  readonly id: string;
  readonly extension: string;
  readonly empreinte: string;
}

export interface ImageNouvelle {
  readonly id: string;
  readonly extension: string;
  readonly octets: Uint8Array;
}

export interface DemandeImages {
  readonly publiees: readonly ImagePubliee[];
  readonly nouvelles: readonly ImageNouvelle[];
}

export type ResultatImages =
  | { readonly aboutie: true; readonly commit: string; readonly inventaire: readonly ImagePubliee[] }
  | { readonly aboutie: false; readonly raison: IssueForge | 'chemin-refuse' };

// L'ensemble que lit le glob du build (src/platform/contenu/medias.ts).
const EXTENSIONS_IMAGE: readonly string[] = ['jpg', 'jpeg', 'png', 'webp'];

function cheminImage(image: { readonly id: string; readonly extension: string }): string | null {
  if (!identifiantValide(image.id) || !EXTENSIONS_IMAGE.includes(image.extension)) return null;
  return `medias/${image.id}.${image.extension}`;
}

const TAILLE_BLOC_BASE64 = 0x8000;

function enBase64(octets: Uint8Array): string {
  // La concaténation octet par octet coûte plusieurs dizaines de Mo pour une image de 2 Mo.
  const morceaux: string[] = [];
  for (let i = 0; i < octets.length; i += TAILLE_BLOC_BASE64) {
    morceaux.push(String.fromCharCode(...octets.subarray(i, i + TAILLE_BLOC_BASE64)));
  }
  return btoa(morceaux.join(''));
}

/**
 * Dépose les images sur la branche des images (ADR-0020/0021) : arbre calculé depuis
 * l'inventaire seul, sans base ; commit sans parent ; référence déplacée en force ou créée.
 * L'état de la branche n'est jamais lu pour construire l'arbre.
 */
export async function deposerImages(
  forge: Forge,
  demande: DemandeImages,
  message: string,
): Promise<ResultatImages> {
  const entrees: EntreeArbre[] = [];
  for (const image of demande.publiees) {
    const c = cheminImage(image);
    if (c === null || !cheminAutorise(c, 'media')) return { aboutie: false, raison: 'chemin-refuse' };
    entrees.push({ chemin: c, sha: image.empreinte });
  }
  const nouvelles: { readonly image: ImageNouvelle; readonly chemin: string }[] = [];
  for (const image of demande.nouvelles) {
    const c = cheminImage(image);
    if (c === null || !cheminAutorise(c, 'media')) return { aboutie: false, raison: 'chemin-refuse' };
    nouvelles.push({ image, chemin: c });
  }

  const inventaire: ImagePubliee[] = [...demande.publiees];
  for (const { image, chemin } of nouvelles) {
    const blob = await forge.creerBlob(enBase64(image.octets));
    if (!blob.ok) return { aboutie: false, raison: blob.issue };
    inventaire.push({ id: image.id, extension: image.extension, empreinte: blob.valeur.sha });
    entrees.push({ chemin, sha: blob.valeur.sha });
  }

  const arbre = await forge.creerArbre({ entrees });
  if (!arbre.ok) return { aboutie: false, raison: arbre.issue };
  const commit = await forge.creerCommit({ message, arbre: arbre.valeur.sha, parents: [] });
  if (!commit.ok) return { aboutie: false, raison: commit.issue };

  const tete = await forge.lireRef(REF_MEDIA);
  let issue: IssueForge | null = null;
  if (tete.ok) {
    const deplacement = await forge.deplacerRef(REF_MEDIA, commit.valeur.sha, true);
    if (!deplacement.ok) issue = deplacement.issue;
  } else if (tete.issue === 'introuvable') {
    const creation = await forge.creerRef(REF_MEDIA, commit.valeur.sha);
    if (!creation.ok) issue = creation.issue;
  } else {
    issue = tete.issue;
  }
  if (issue !== null) return { aboutie: false, raison: issue };
  return { aboutie: true, commit: commit.valeur.sha, inventaire };
}
