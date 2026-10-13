/**
 * Les passes de dépôt des images (change 011, ticket 17 ; ADR-0023) : une passe crée au plus
 * `IMAGES_PAR_PASSE` blobs et `OCTETS_PAR_PASSE` octets (base64 compris), pour tenir dans les
 * limites d'une invocation. Les passes s'enchaînent ; la dernière seule bâtit les branches.
 *
 * Zone `core` (I1) : pur hormis les appels au port `Forge`.
 */
import { enBase64, type ImageNouvelle, type ImagePubliee } from './depot.ts';
import type { IssueForge, Forge } from './forge.ts';

export const IMAGES_PAR_PASSE = 40;
export const OCTETS_PAR_PASSE = 10 * 1024 * 1024;

/** La taille d'un contenu une fois en base64 (ce que la forge reçoit). */
export function tailleBase64(octets: number): number {
  return 4 * Math.ceil(octets / 3);
}

/** Une image de plus tient-elle dans la passe, sachant ce qu'elle porte déjà ? La première y entre toujours. */
export function tientDansLaPasse(deja: { readonly nombre: number; readonly octets: number }, octets: number): boolean {
  if (deja.nombre === 0) return true;
  return deja.nombre < IMAGES_PAR_PASSE && deja.octets + tailleBase64(octets) <= OCTETS_PAR_PASSE;
}

export interface ImageADeposer {
  readonly id: string;
  readonly extension: string;
}

export type ResultatPasse =
  | { readonly aboutie: true; readonly deposees: readonly ImagePubliee[]; readonly restantes: readonly ImageADeposer[] }
  | { readonly aboutie: false; readonly raison: IssueForge | 'octets-manquants' };

/** Dépose une passe de blobs : les images qui ne tiennent pas restent à déposer à la passe suivante. */
export async function deposerUnePasse(
  forge: Forge,
  aDeposer: readonly ImageADeposer[],
  lire: (id: string) => Promise<Uint8Array | null>,
): Promise<ResultatPasse> {
  const deposees: ImagePubliee[] = [];
  let octets = 0;
  let index = 0;
  for (; index < aDeposer.length; index += 1) {
    const image = aDeposer[index];
    const lues = await lire(image.id);
    if (lues === null || lues.length === 0) return { aboutie: false, raison: 'octets-manquants' };
    if (!tientDansLaPasse({ nombre: deposees.length, octets }, lues.length)) break;
    const nouvelle: ImageNouvelle = { ...image, octets: lues };
    const blob = await forge.creerBlob(enBase64(nouvelle.octets));
    if (!blob.ok) return { aboutie: false, raison: blob.issue };
    octets += tailleBase64(lues.length);
    deposees.push({ id: image.id, extension: image.extension, empreinte: blob.valeur.sha });
  }
  return { aboutie: true, deposees, restantes: aDeposer.slice(index) };
}
