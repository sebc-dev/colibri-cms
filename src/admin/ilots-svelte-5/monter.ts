/**
 * Le point d'entrée externe candidat `ilots-svelte-5` (ticket 01,
 * specs/002-socle-ilots-admin/01-ilot-svelte-sous-csp.md ; ADR-0006, ADR-0009).
 *
 * Ce fichier n'est jamais importé par un gabarit `.astro` avec une directive
 * `client:*` : il est importé depuis un `<script>` de module d'une page
 * (jamais `is:inline`) — Astro/Vite le bundle alors lui-même en un fichier
 * externe, référencé par `<script src>` dans la réponse. C'est ce montage,
 * et non l'hydratation en ligne d'Astro, qui rend `script-src 'self'`
 * tenable sans nonce ni empreinte (ADR-0006).
 *
 * `mount` (API cliente de Svelte 5, `import('svelte').mount`) remplace ici
 * le constructeur `new Component(...)` de Svelte 4 : c'est l'appel qui monte
 * réellement un composant sur un nœud du DOM déjà présent dans la réponse.
 */
import { mount } from 'svelte';
import Compteur from './Compteur.svelte';
import ActionRapide from './ActionRapide.svelte';
import Cadre from './Cadre.svelte';

/**
 * Monte l'îlot `Compteur` sur le premier élément portant l'identifiant donné.
 * Ne fait rien si l'élément est absent (l'écran qui n'embarque pas cet îlot
 * charge quand même ce module sans erreur).
 */
export function monterCompteur(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  mount(Compteur, { target: cible });
}

/**
 * Monte l'îlot `ActionRapide` (ticket 02) — premier îlot bâti sur un
 * composant de la base shadcn-svelte. Même garde d'absence que
 * `monterCompteur` ci-dessus.
 */
export function monterActionRapide(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  mount(ActionRapide, { target: cible });
}

/**
 * Monte l'îlot `Cadre` (ticket 01,
 * specs/003-remplir-emplacements/01-cadre-administration.md) — le cadre
 * commun à tous les écrans d'administration, monté en application (pas une
 * hydratation par page, SPEC.md § Décisions d'implémentation). Même garde
 * d'absence que les fonctions ci-dessus.
 */
export function monterCadre(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  mount(Cadre, { target: cible });
}
