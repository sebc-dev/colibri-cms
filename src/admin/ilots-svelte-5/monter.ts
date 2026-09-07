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
import { mount, createRawSnippet } from 'svelte';
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

/**
 * Monte l'îlot `Cadre` en lui donnant, comme contenu, du HTML déjà rendu par
 * Astro (ticket 02, assemblage de l'`Écran : Liste des pages` dans
 * l'`Écran : Cadre de l'administration`) : `idContenuTemplate` désigne un
 * `<template>` déjà présent dans la réponse HTTP, dont le texte reste
 * littéralement vérifiable sans exécuter ce script (SC-02a/b). Le contenu
 * est transporté tel quel dans le cadre via `createRawSnippet` — l'API
 * Svelte 5 dédiée au HTML déjà généré en dehors d'un composant `.svelte` —
 * jamais ré-interprété ni régénéré côté client. Ne fait rien si l'une des
 * deux cibles est absente, même garde d'absence que les fonctions ci-dessus.
 */
export function monterCadreAvecContenu(idCible: string, idContenuTemplate: string): void {
  const cible = document.getElementById(idCible);
  const modele = document.getElementById(idContenuTemplate);
  if (!cible || !(modele instanceof HTMLTemplateElement)) return;

  const html = modele.innerHTML;
  const contenu = createRawSnippet(() => ({
    render: () => html,
  }));

  mount(Cadre, { target: cible, props: { children: contenu } });
}
