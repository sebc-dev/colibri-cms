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
import { mount, createRawSnippet, type Component } from 'svelte';
import Compteur from './Compteur.svelte';
import ActionRapide from './ActionRapide.svelte';
import Cadre from './Cadre.svelte';
import CorrectionBoutonAction from './CorrectionBoutonAction.svelte';
import ReglageLienVideo from './ReglageLienVideo.svelte';
import TexteRiche from './TexteRiche.svelte';
import EmplacementImage from './EmplacementImage.svelte';
import EmplacementGalerie from './EmplacementGalerie.svelte';
import EmplacementCarrousel from './EmplacementCarrousel.svelte';
import EcranMedias from './EcranMedias.svelte';
import EcranFicheMedia from './EcranFicheMedia.svelte';
import type { MediaListe, MediaFiche } from '../../platform/medias/magasin.ts';

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
 * Monte l'îlot `Cadre` autour d'un contenu déjà rendu par Astro (ticket 02,
 * assemblage de l'`Écran : Liste des pages` dans l'`Écran : Cadre de
 * l'administration` ; arbitrage du chantier
 * docs/chantiers/en-cours/2026-09-07-run-liste-des-pages-02.md, point 3) :
 * `idCible` désigne un nœud déjà présent dans la réponse HTTP et déjà rempli
 * par Astro (titre, liste ou message d'état vide) — jamais un `<template>`
 * inerte, pour que ce contenu reste littéralement dans le DOM de la réponse,
 * observable sans exécuter ce script (SC-02a-d). Le contenu du nœud est
 * capturé avant montage, puis transporté tel quel dans le cadre via
 * `createRawSnippet` — l'API Svelte 5 dédiée au HTML déjà généré en dehors
 * d'un composant `.svelte` — jamais ré-interprété ni régénéré côté client :
 * seul son emplacement change, sous la barre latérale et le menu du cadre.
 * Ne fait rien si la cible est absente, même garde d'absence que les
 * fonctions ci-dessus.
 */
export function monterCadreAvecContenu(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  const html = cible.innerHTML;
  cible.innerHTML = '';
  // `createRawSnippet` (Svelte 5) ne conserve QUE le premier élément racine du
  // HTML rendu : il prend `get_first_child(fragment)` et jette ses frères, sans
  // erreur en production (l'avertissement `invalid_raw_snippet_render` est
  // `DEV`-only). Or le contenu capturé de `#ilot-cadre` a plusieurs racines
  // (le `<h1>` du titre PUIS la liste, ou le message d'état vide) : sans une
  // racine unique, tout ce qui suit le titre disparaîtrait à l'écran alors que
  // la réponse HTTP, elle, le porte toujours (invisible aux tests SSR). On
  // enveloppe donc dans un seul élément — NE PAS retirer cette enveloppe.
  const contenu = createRawSnippet(() => ({
    render: () => `<div>${html}</div>`,
  }));

  mount(Cadre, { target: cible, props: { children: contenu } });
}

/**
 * Monte l'îlot `CorrectionBoutonAction` (ticket 04,
 * openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md)
 * sur chaque emplacement de bouton d'action rendu par l'`Écran : Éditeur de
 * page` (`src/pages/admin/pages/[slug].astro`) — repérés par l'attribut
 * `data-emplacement-bouton-action`, un par emplacement de cette nature.
 * Chaque nœud porte ses propres `data-slug`/`data-id-emplacement`/
 * `data-libelle`/`data-destination`, posés côté serveur : aucune donnée
 * n'est redemandée au montage. La présentation statique (SC-03c) qu'il
 * contient est vidée avant montage — même geste que `monterCadreAvecContenu`
 * ci-dessus — pour être remplacée par le moyen d'édition réel. Ne fait rien
 * si aucun de ces nœuds n'est présent (écran sans emplacement de bouton
 * d'action) — même garde d'absence que les fonctions ci-dessus.
 */
export function monterCorrectionsBoutonAction(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-emplacement-bouton-action]');

  cibles.forEach((cible) => {
    const { slug, idEmplacement, libelle, destination } = cible.dataset;
    if (slug === undefined || idEmplacement === undefined || libelle === undefined || destination === undefined) {
      return;
    }

    cible.innerHTML = '';
    mount(CorrectionBoutonAction, {
      target: cible,
      props: {
        slug,
        idEmplacement,
        libelleInitial: libelle,
        destinationInitial: destination,
      },
    });
  });
}

/**
 * Monte l'îlot `ReglageLienVideo` (ticket 05,
 * openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md)
 * sur chaque emplacement de lien de vidéo rendu par l'`Écran : Éditeur de
 * page` — repérés par l'attribut `data-emplacement-lien-video`, un par
 * emplacement de cette nature. Même patron (données déjà posées côté
 * serveur, présentation statique vidée avant montage, garde d'absence) que
 * `monterCorrectionsBoutonAction` ci-dessus.
 */
export function monterReglagesLienVideo(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-emplacement-lien-video]');

  cibles.forEach((cible) => {
    const { slug, idEmplacement, lien } = cible.dataset;
    if (slug === undefined || idEmplacement === undefined || lien === undefined) {
      return;
    }

    cible.innerHTML = '';
    mount(ReglageLienVideo, {
      target: cible,
      props: {
        slug,
        idEmplacement,
        lienInitial: lien,
      },
    });
  });
}

/**
 * Monte l'îlot `TexteRiche` (ticket 06,
 * openspec/changes/003-remplir-emplacements/tickets/06-corriger-texte-riche.md)
 * sur chaque emplacement de texte riche rendu par l'`Écran : Éditeur de
 * page` — repérés par l'attribut `data-emplacement-texte-riche`, un par
 * emplacement de cette nature. Même patron (données déjà posées côté
 * serveur, présentation statique vidée avant montage, garde d'absence) que
 * `monterReglagesLienVideo`/`monterCorrectionsBoutonAction` ci-dessus.
 */
export function monterCorrectionsTexteRiche(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-emplacement-texte-riche]');

  cibles.forEach((cible) => {
    const { slug, idEmplacement, markdown } = cible.dataset;
    if (slug === undefined || idEmplacement === undefined || markdown === undefined) {
      return;
    }

    cible.innerHTML = '';
    mount(TexteRiche, {
      target: cible,
      props: {
        slug,
        idEmplacement,
        markdownInitial: markdown,
      },
    });
  });
}

/**
 * Une liste d'identités d'images (`mediaIds`), telle que sérialisée en JSON
 * par le serveur (`[slug].astro`) dans l'attribut `data-media-ids` d'un
 * emplacement de galerie ou de carrousel — `null` si la valeur ne
 * correspond pas à un tableau de chaînes (attribut absent, corrompu, ou
 * d'une autre forme) : le même geste de garde que les fonctions
 * `monterCorrections*`/`monterReglages*` ci-dessus, qui ne montent rien
 * plutôt que de planter sur une donnée serveur inattendue.
 */
function analyserMediaIds(valeurBrute: string): readonly string[] | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (!Array.isArray(valeur) || !valeur.every((element) => typeof element === 'string')) return null;
  return valeur;
}

/**
 * Monte l'îlot `EmplacementImage` (ticket 06,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 06-editeur-presente-natures-image.md) sur chaque emplacement d'image
 * rendu par l'`Écran : Éditeur de page` — repérés par l'attribut
 * `data-emplacement-image`, un par emplacement de cette nature. Présentation
 * SEULE (SC-06c) : aucun moyen de choisir ou de remplacer l'image, qui vient
 * avec sa pose (ticket 08). Même patron (donnée déjà posée côté serveur,
 * présentation statique vidée avant montage, garde d'absence) que
 * `monterCorrectionsTexteRiche` ci-dessus.
 */
export function monterEmplacementsImage(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-emplacement-image]');

  cibles.forEach((cible) => {
    const { mediaId } = cible.dataset;
    if (mediaId === undefined) return;

    cible.innerHTML = '';
    mount(EmplacementImage, { target: cible, props: { mediaId } });
  });
}

/**
 * Geste commun aux natures d'emplacement qui portent un ensemble d'identités
 * d'images (`data-media-ids`, sérialisé en JSON) : galerie et carrousel.
 * Monte `Ilot` sur chaque élément répondant à `selecteur`, avec le même
 * patron (donnée posée côté serveur, garde d'absence ou de forme inattendue,
 * présentation statique vidée avant montage) que `monterEmplacementsImage`.
 */
function monterEmplacementsAvecMediaIds(
  selecteur: string,
  Ilot: Component<{ mediaIds: readonly string[] }>,
): void {
  const cibles = document.querySelectorAll<HTMLElement>(selecteur);

  cibles.forEach((cible) => {
    const { mediaIds } = cible.dataset;
    if (mediaIds === undefined) return;
    const liste = analyserMediaIds(mediaIds);
    if (liste === null) return;

    cible.innerHTML = '';
    mount(Ilot, { target: cible, props: { mediaIds: liste } });
  });
}

/**
 * Monte l'îlot `EmplacementGalerie` (ticket 06) sur chaque emplacement de
 * galerie — repérés par `data-emplacement-galerie`, un par emplacement de
 * cette nature ; `data-media-ids` porte les identités posées, sérialisées en
 * JSON. Présentation SEULE (SC-06c) : aucun moyen de composer la galerie,
 * qui vient avec sa pose (ticket 09). Même patron que
 * `monterEmplacementsImage` ci-dessus.
 */
export function monterEmplacementsGalerie(): void {
  monterEmplacementsAvecMediaIds('[data-emplacement-galerie]', EmplacementGalerie);
}

/**
 * Monte l'îlot `EmplacementCarrousel` (ticket 06) sur chaque emplacement de
 * carrousel — même patron que `monterEmplacementsGalerie` ci-dessus,
 * repérés par `data-emplacement-carrousel`.
 */
export function monterEmplacementsCarrousel(): void {
  monterEmplacementsAvecMediaIds('[data-emplacement-carrousel]', EmplacementCarrousel);
}

/**
 * `mediasInitiaux` telle que sérialisée en JSON par le serveur
 * (`medias.astro`) dans l'attribut `data-medias` du point de montage —
 * `null` si la valeur ne correspond pas à un tableau de `MediaListe` (attribut
 * absent, corrompu, ou d'une autre forme) : même geste de garde
 * qu'`analyserMediaIds` ci-dessus, qui ne monte rien plutôt que de planter
 * sur une donnée serveur inattendue.
 */
function analyserMediasInitiaux(valeurBrute: string): readonly MediaListe[] | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (
    !Array.isArray(valeur) ||
    !valeur.every(
      (element): element is MediaListe =>
        typeof element === 'object' &&
        element !== null &&
        typeof (element as MediaListe).id === 'string' &&
        typeof (element as MediaListe).nomOrigine === 'string',
    )
  ) {
    return null;
  }
  return valeur;
}

/**
 * Monte l'`Écran : Médias` (ticket 05,
 * openspec/changes/004-bibliotheque-de-medias/tickets/05-ecran-medias.md) —
 * `EcranMedias` (le cadre + la réserve) sur le premier élément portant
 * l'identifiant donné, avec la liste déjà lue côté serveur
 * (`listerMediasBrouillon`, `src/platform/medias/magasin.ts`) posée en
 * attribut `data-medias`. Même garde d'absence que les fonctions
 * `monter*` ci-dessus ; ne monte rien non plus si l'attribut est absent ou
 * mal formé.
 */
export function monterEcranMedias(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  const donnees = cible.dataset.medias;
  if (donnees === undefined) return;
  const mediasInitiaux = analyserMediasInitiaux(donnees);
  if (mediasInitiaux === null) return;

  cible.innerHTML = '';
  mount(EcranMedias, { target: cible, props: { mediasInitiaux } });
}

/**
 * `media` telle que sérialisée en JSON par le serveur
 * (`src/pages/admin/medias/[id].astro`) dans l'attribut `data-media` du
 * point de montage — `null` si la valeur ne correspond pas à une
 * `MediaFiche` (attribut absent, corrompu, ou d'une autre forme) : même
 * geste de garde qu'`analyserMediasInitiaux` ci-dessus.
 */
function analyserMediaFiche(valeurBrute: string): MediaFiche | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (
    typeof valeur !== 'object' ||
    valeur === null ||
    typeof (valeur as MediaFiche).id !== 'string' ||
    typeof (valeur as MediaFiche).nomOrigine !== 'string' ||
    typeof (valeur as MediaFiche).nomAffichage !== 'string' ||
    typeof (valeur as MediaFiche).description !== 'string' ||
    typeof (valeur as MediaFiche).format !== 'string'
  ) {
    return null;
  }
  return valeur as MediaFiche;
}

/**
 * Monte l'`Écran : Fiche d'une image` (ticket 07,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 07-fiche-renommer-decrire.md) — `EcranFicheMedia` (le cadre + la fiche)
 * sur le premier élément portant l'identifiant donné, avec la fiche déjà
 * lue côté serveur (`obtenirFicheMediaBrouillon`,
 * `src/platform/medias/magasin.ts`) posée en attribut `data-media`. Même
 * garde d'absence que `monterEcranMedias` ci-dessus.
 */
export function monterEcranFicheMedia(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  const donnees = cible.dataset.media;
  if (donnees === undefined) return;
  const media = analyserMediaFiche(donnees);
  if (media === null) return;

  cible.innerHTML = '';
  mount(EcranFicheMedia, { target: cible, props: { media } });
}
