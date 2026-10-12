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

/** La durée d'un bail de publication (ADR-0023) : au-delà, le verrou est repris par la suivante. */
export const BAIL = 5 * 60 * 1000;
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

export function enBase64(octets: Uint8Array): string {
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
  const publiees = cheminsImages(demande.publiees);
  const nouvelles = cheminsImages(demande.nouvelles);
  if (publiees === null || nouvelles === null) return { aboutie: false, raison: 'chemin-refuse' };

  const entrees: EntreeArbre[] = publiees.map(({ image, chemin }) => ({ chemin, sha: image.empreinte }));
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

  const issue = await placerBrancheImages(forge, commit.valeur.sha);
  if (issue !== null) return { aboutie: false, raison: issue };
  return { aboutie: true, commit: commit.valeur.sha, inventaire };
}

/** Le chemin de chaque image, ou `null` dès qu'une seule est hors forme ou hors de la branche des images. */
function cheminsImages<T extends { readonly id: string; readonly extension: string }>(
  images: readonly T[],
): { readonly image: T; readonly chemin: string }[] | null {
  const chemins: { readonly image: T; readonly chemin: string }[] = [];
  for (const image of images) {
    const chemin = cheminImage(image);
    if (chemin === null || !cheminAutorise(chemin, 'media')) return null;
    chemins.push({ image, chemin });
  }
  return chemins;
}

/** Déplace la branche des images en force sur `commit`, ou la crée si elle n'existe pas encore. */
async function placerBrancheImages(forge: Forge, commit: string): Promise<IssueForge | null> {
  const tete = await forge.lireRef(REF_MEDIA);
  if (tete.ok) {
    const deplacement = await forge.deplacerRef(REF_MEDIA, commit, true);
    return deplacement.ok ? null : deplacement.issue;
  }
  if (tete.issue !== 'introuvable') return tete.issue;
  const creation = await forge.creerRef(REF_MEDIA, commit);
  return creation.ok ? null : creation.issue;
}
