/**
 * La reconnaissance d'un lien de vidéo — ticket 05
 * (openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md),
 * ADR-0012.
 *
 * Zone `core` (docs/architecture.md, I1/I2) : fonction pure, zéro dépendance,
 * ni framework ni plateforme — instanciable sans D1 ni Worker (ARCH-5).
 *
 * SC-05a : un lien de vidéo est accepté ssi son hôte appartient à la liste
 * blanche d'hébergeurs (YouTube, Vimeo), selon le motif propre à cet
 * hébergeur — jamais « tout `https` externe » (design.md § Decisions,
 * explicitement écarté), ni une heuristique d'« embarquabilité ». Un hôte
 * hors liste, un lien qui n'est pas `https`, ou une chaîne qui n'est même
 * pas une URL, sont rejetés.
 *
 * Motifs retenus :
 * - YouTube : `https://www.youtube.com/watch?v=…` (ou sans `www.`), avec un
 *   paramètre `v` — le chemin `/watch` sans identifiant de vidéo ne suffit
 *   pas.
 * - YouTube (lien court) : `https://youtu.be/…`, avec un identifiant après
 *   la barre.
 * - Vimeo : `https://vimeo.com/…`, avec un identifiant après la barre.
 */

const HOTES_YOUTUBE_LONG: ReadonlySet<string> = new Set(['youtube.com', 'www.youtube.com']);

/**
 * SC-05a — vrai ssi `lien` est une URL `https` dont l'hôte et la forme
 * correspondent au motif d'un hébergeur de la liste blanche (YouTube,
 * Vimeo). Le refus est rendu par valeur (un simple booléen) : cette
 * fonction ne lance jamais d'exception pour une chaîne qui n'est pas une
 * URL, elle la traite comme n'importe quel autre lien non reconnu.
 */
export function lienVideoAutorise(lien: string): boolean {
  let url: URL;
  try {
    url = new URL(lien);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;

  if (HOTES_YOUTUBE_LONG.has(url.hostname)) {
    return url.pathname === '/watch' && url.searchParams.get('v') !== null && url.searchParams.get('v') !== '';
  }

  if (url.hostname === 'youtu.be') {
    return url.pathname.length > 1;
  }

  if (url.hostname === 'vimeo.com') {
    return url.pathname.length > 1;
  }

  return false;
}
