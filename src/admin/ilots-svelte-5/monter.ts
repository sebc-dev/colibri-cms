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
import CorrectionBoutonAction from './CorrectionBoutonAction.svelte';
import ReglageLienVideo from './ReglageLienVideo.svelte';
import TexteRiche from './TexteRiche.svelte';
import { afficherPastilleDeBrouillon, afficherPastilleDansLaZone } from '../pastille-brouillon.ts';
import { TEXTE_CARTE_MENTION } from '../textes.ts';
import EmplacementImage from './EmplacementImage.svelte';
import EmplacementComposition from './EmplacementComposition.svelte';
import EcranMedias from './EcranMedias.svelte';
import CarteCoordonnees from './CarteCoordonnees.svelte';
import CarteReseaux from './CarteReseaux.svelte';
import EcranFicheMedia from './EcranFicheMedia.svelte';
import EcranFormulaire from './EcranFormulaire.svelte';
import type { ChampCarte } from './formulaire-carte.ts';
import { lirePrixSaisi } from '../../core/formulaires/prix.ts';
import type { OptionBrouillon } from '../../core/formulaires/options.ts';
import type { CoordonneeCarte } from './coordonnees-carte.ts';
import type { ReseauCarte } from './reseaux-carte.ts';
import type { MediaListe, MediaFiche } from '../../platform/medias/magasin.ts';
import type { EmplacementOuPoseeMedia } from './emplacements-media.ts';

/**
 * Monte l'îlot `CorrectionBoutonAction` (ticket 04,
 * openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md)
 * sur chaque emplacement de bouton d'action rendu par l'`Écran : Éditeur de
 * page` (`src/pages/admin/pages/[slug].astro`) — repérés par l'attribut
 * `data-emplacement-bouton-action`, un par emplacement de cette nature.
 * Chaque nœud porte ses propres `data-slug`/`data-id-emplacement`/
 * `data-libelle`/`data-destination`, posés côté serveur : aucune donnée
 * n'est redemandée au montage. La présentation statique (SC-03c) qu'il
 * contient est vidée avant montage, pour être remplacée par le moyen
 * d'édition réel. Ne fait rien
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
        adresse: `/admin/pages/${slug}/emplacements/${idEmplacement}`,
        markdownInitial: markdown,
        apresEnregistrement: afficherPastilleDeBrouillon,
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
 * 06-editeur-presente-natures-image.md ; ticket 08,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 08-poser-remplacer-image.md) sur chaque emplacement d'image rendu par
 * l'`Écran : Éditeur de page` — repérés par l'attribut
 * `data-emplacement-image`, un par emplacement de cette nature. Depuis le
 * ticket 08, ce n'est plus une présentation seule : le sélecteur ouvre sur
 * la réserve déjà posée côté serveur en `data-medias` (JSON, même patron
 * que `data-media-ids` des emplacements de galerie et de carrousel) — `[]`
 * si l'attribut est absent ou mal formé, plutôt que de ne pas monter du
 * tout (l'emplacement reste alors présenté, seul le sélecteur ressort
 * vide). Même patron par ailleurs (donnée déjà posée côté serveur,
 * présentation statique vidée avant montage, garde d'absence) que
 * `monterCorrectionsTexteRiche` ci-dessus.
 */
export function monterEmplacementsImage(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-emplacement-image]');

  cibles.forEach((cible) => {
    const { slug, idEmplacement, mediaId, medias } = cible.dataset;
    if (slug === undefined || idEmplacement === undefined || mediaId === undefined) return;
    const mediasInitiaux = medias === undefined ? [] : (analyserMediasInitiaux(medias) ?? []);

    cible.innerHTML = '';
    mount(EmplacementImage, {
      target: cible,
      props: { slug, idEmplacement, mediaIdInitial: mediaId, mediasInitiaux },
    });
  });
}

/**
 * Geste commun aux natures d'emplacement qui composent un ensemble ordonné
 * d'identités d'images (`data-media-ids`, sérialisé en JSON) : galerie et
 * carrousel (ticket 09, openspec/changes/004-bibliotheque-de-medias/
 * tickets/09-composer-galerie-carrousel.md). Monte l'îlot `EmplacementComposition`
 * avec la nature sur chaque élément répondant à `selecteur`, avec le même
 * patron (données posées côté serveur, garde d'absence ou de forme
 * inattendue, présentation statique vidée avant montage) que
 * `monterEmplacementsImage` — `data-medias` porte la même réserve que celle
 * du sélecteur d'image (`[]` si absente ou mal formée, plutôt que de ne pas
 * monter du tout).
 */
function monterEmplacementsAvecComposition(selecteur: string, nature: 'galerie' | 'carrousel'): void {
  const cibles = document.querySelectorAll<HTMLElement>(selecteur);

  cibles.forEach((cible) => {
    const { slug, idEmplacement, mediaIds, medias } = cible.dataset;
    if (slug === undefined || idEmplacement === undefined || mediaIds === undefined) return;
    const mediaIdsInitial = analyserMediaIds(mediaIds);
    if (mediaIdsInitial === null) return;
    const mediasInitiaux = medias === undefined ? [] : (analyserMediasInitiaux(medias) ?? []);

    cible.innerHTML = '';
    mount(EmplacementComposition, {
      target: cible,
      props: { slug, idEmplacement, mediaIdsInitial, mediasInitiaux, nature },
    });
  });
}

/**
 * Monte l'îlot `EmplacementComposition` (nature galerie / carrousel) (ticket
 * 06, présentation ; ticket 09, composition) sur chaque emplacement de
 * galerie — repérés par `data-emplacement-galerie`, un par emplacement de
 * cette nature ; `data-media-ids` porte les identités posées, sérialisées en
 * JSON. Même patron que `monterEmplacementsImage` ci-dessus.
 */
export function monterEmplacementsGalerie(): void {
  monterEmplacementsAvecComposition('[data-emplacement-galerie]', 'galerie');
}

/**
 * Monte l'îlot `EmplacementComposition` (nature galerie / carrousel) (ticket
 * 06, présentation ; ticket 09, composition) — même patron que
 * `monterEmplacementsGalerie` ci-dessus, repérés par
 * `data-emplacement-carrousel`.
 */
export function monterEmplacementsCarrousel(): void {
  monterEmplacementsAvecComposition('[data-emplacement-carrousel]', 'carrousel');
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
        typeof (element as MediaListe).nomAffichage === 'string' &&
        typeof (element as MediaListe).description === 'string',
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
 * `emplacements` telle que sérialisée en JSON par le serveur (`[id].astro`,
 * ticket 11, openspec/changes/004-bibliotheque-de-medias/tickets/
 * 11-ou-posee-et-supprimer.md, SC-11a) dans l'attribut `data-emplacements`
 * du point de montage — `null` si la valeur ne correspond pas à un tableau
 * d'`EmplacementOuPoseeMedia`, même geste de garde qu'`analyserMediasInitiaux`
 * ci-dessus.
 */
function analyserEmplacementsPosant(valeurBrute: string): readonly EmplacementOuPoseeMedia[] | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (
    !Array.isArray(valeur) ||
    !valeur.every(
      (element): element is EmplacementOuPoseeMedia =>
        typeof element === 'object' &&
        element !== null &&
        typeof (element as EmplacementOuPoseeMedia).pageTitre === 'string' &&
        typeof (element as EmplacementOuPoseeMedia).place === 'string',
    )
  ) {
    return null;
  }
  return valeur;
}

/**
 * Monte l'`Écran : Fiche d'une image` (ticket 07,
 * openspec/changes/004-bibliotheque-de-medias/tickets/
 * 07-fiche-renommer-decrire.md) — `EcranFicheMedia` (le cadre + la fiche)
 * sur le premier élément portant l'identifiant donné, avec la fiche déjà
 * lue côté serveur (`obtenirFicheMediaBrouillon`,
 * `src/platform/medias/magasin.ts`) posée en attribut `data-media`. Même
 * garde d'absence que `monterEcranMedias` ci-dessus.
 *
 * Ticket 11 (SC-11a/b) : `data-emplacements` porte la liste des emplacements
 * qui posent l'image, déjà composée côté serveur — un attribut absent ou
 * mal formé retombe sur un tableau vide (même geste que `mediasInitiaux` de
 * `monterEmplacementsImage` ci-dessus) plutôt que de ne pas monter du tout :
 * une fiche sans cette liste reste consultable.
 */
export function monterEcranFicheMedia(idCible: string): void {
  const cible = document.getElementById(idCible);
  if (!cible) return;

  const donnees = cible.dataset.media;
  if (donnees === undefined) return;
  const media = analyserMediaFiche(donnees);
  if (media === null) return;

  const donneesEmplacements = cible.dataset.emplacements;
  const emplacements = donneesEmplacements === undefined ? [] : (analyserEmplacementsPosant(donneesEmplacements) ?? []);

  cible.innerHTML = '';
  mount(EcranFicheMedia, { target: cible, props: { media, emplacements } });
}

/**
 * Monte l'îlot `CarteCoordonnees` (ticket 06,
 * openspec/changes/008-reglages-transverses/tickets/06-carte-coordonnees.md)
 * sur la carte Coordonnées de l'`Écran : Réglages` — repérée par
 * `data-carte-coordonnees`, les coordonnées courantes en JSON dans
 * `data-coordonnees`. La zone de marque de la carte est celle de sa
 * section. Même garde d'absence ou de forme inattendue que ci-dessus.
 */
export function monterCarteCoordonnees(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-carte-coordonnees]');

  cibles.forEach((cible) => {
    const brut = cible.dataset.coordonnees;
    if (brut === undefined) return;
    const coordonnees = analyserCoordonnees(brut);
    if (coordonnees === null) return;
    const zoneMarque = cible.closest('section')?.querySelector('[data-zone-marque-brouillon]') ?? null;

    cible.innerHTML = '';
    mount(CarteCoordonnees, {
      target: cible,
      props: {
        coordonnees,
        apresEnregistrement: () => {
          afficherPastilleDansLaZone(zoneMarque);
        },
      },
    });
  });
}

function analyserCoordonnees(valeurBrute: string): readonly CoordonneeCarte[] | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (
    !Array.isArray(valeur) ||
    !valeur.every(
      (element): element is CoordonneeCarte =>
        typeof element === 'object' &&
        element !== null &&
        typeof (element as CoordonneeCarte).id === 'string' &&
        typeof (element as CoordonneeCarte).intitule === 'string' &&
        typeof (element as CoordonneeCarte).valeur === 'string' &&
        ['texte', 'telephone', 'email', 'adresse'].includes((element as CoordonneeCarte).nature),
    )
  ) {
    return null;
  }
  return valeur;
}

/**
 * Monte l'îlot `CarteReseaux` (ticket 07,
 * openspec/changes/008-reglages-transverses/tickets/07-composer-les-reseaux-sociaux.md)
 * sur la carte Réseaux sociaux — repérée par `data-carte-reseaux`, la liste
 * courante en JSON dans `data-reseaux`. Même garde que ci-dessus.
 */
export function monterCarteReseaux(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-carte-reseaux]');

  cibles.forEach((cible) => {
    const brut = cible.dataset.reseaux;
    if (brut === undefined) return;
    const reseaux = analyserReseaux(brut);
    if (reseaux === null) return;
    const zoneMarque = cible.closest('section')?.querySelector('[data-zone-marque-brouillon]') ?? null;

    cible.innerHTML = '';
    mount(CarteReseaux, {
      target: cible,
      props: {
        reseaux,
        apresEnregistrement: () => {
          afficherPastilleDansLaZone(zoneMarque);
        },
      },
    });
  });
}

function analyserReseaux(valeurBrute: string): readonly ReseauCarte[] | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (
    !Array.isArray(valeur) ||
    !valeur.every(
      (element): element is ReseauCarte =>
        typeof element === 'object' &&
        element !== null &&
        typeof (element as ReseauCarte).nom === 'string' &&
        typeof (element as ReseauCarte).lien === 'string',
    )
  ) {
    return null;
  }
  return valeur;
}

/**
 * Monte l'îlot `TexteRiche` sur la carte Mention d'information (ticket 08,
 * openspec/changes/008-reglages-transverses/tickets/08-corriger-la-mention.md)
 * — repérée par `data-carte-mention`, le Markdown courant en `data-markdown`
 * (donnée, jamais HTML injecté, I5). Même éditeur que les emplacements.
 */
export function monterCarteMention(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-carte-mention]');

  cibles.forEach((cible) => {
    const markdown = cible.dataset.markdown;
    if (markdown === undefined) return;
    const zoneMarque = cible.closest('section')?.querySelector('[data-zone-marque-brouillon]') ?? null;

    cible.innerHTML = '';
    mount(TexteRiche, {
      target: cible,
      props: {
        adresse: '/admin/reglages/mention',
        markdownInitial: markdown,
        apresEnregistrement: () => {
          afficherPastilleDansLaZone(zoneMarque);
        },
        libelle: TEXTE_CARTE_MENTION,
        // Même bouton que les cartes Coordonnées et Réseaux sociaux.
        classeEnregistrer: 'h-auto self-start rounded-md border-0 px-3 py-2 max-md:min-h-11',
      },
    });
  });
}

/** Un élément de `data-champs` : la structure d'un champ à choix, identifiants seuls. */
interface ChampBrut {
  readonly id: string;
  readonly libelle: string;
  readonly avecPrix: boolean;
  readonly nature: ChampCarte['nature'];
  readonly ids: unknown[];
}

function estChampBrut(element: unknown): element is ChampBrut {
  return (
    typeof element === 'object' &&
    element !== null &&
    typeof (element as { id?: unknown }).id === 'string' &&
    typeof (element as { libelle?: unknown }).libelle === 'string' &&
    typeof (element as { avecPrix?: unknown }).avecPrix === 'boolean' &&
    ['choix-unique', 'choix-multiple'].includes((element as { nature?: string }).nature ?? '') &&
    Array.isArray((element as { ids?: unknown }).ids)
  );
}

function lireOptionsChamp(ids: readonly unknown[], c: number, racine: ParentNode): OptionBrouillon[] | null {
  const options: OptionBrouillon[] = [];
  for (const [j, id] of ids.entries()) {
    if (typeof id !== 'string') return null;
    const saisieLibelle = racine.querySelector<HTMLInputElement>(`#option-${String(c)}-${String(j)}`);
    if (saisieLibelle === null) return null;
    const saisiePrix = racine.querySelector<HTMLInputElement>(`#prix-${String(c)}-${String(j)}`);
    const prix = saisiePrix === null ? null : lirePrixSaisi(saisiePrix.value);
    options.push(
      prix?.ok === true
        ? { id, libelle: saisieLibelle.value, prix: prix.centimes }
        : { id, libelle: saisieLibelle.value },
    );
  }
  return options;
}

/**
 * Les champs à choix de l'écran : la structure vient de `data-champs` (JSON,
 * identifiants seuls), libellés et prix sont relus des zones de saisie déjà
 * rendues par le serveur (`option-<champ>-<rang>`, `prix-<champ>-<rang>`) —
 * `null` si la structure est absente ou d'une autre forme.
 */
function lireChampsFormulaire(valeurBrute: string, racine: ParentNode): readonly ChampCarte[] | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(valeurBrute);
  } catch {
    return null;
  }
  if (!Array.isArray(valeur)) return null;
  const champs: ChampCarte[] = [];
  for (const [c, element] of valeur.entries()) {
    if (!estChampBrut(element)) return null;
    const options = lireOptionsChamp(element.ids, c, racine);
    if (options === null) return null;
    champs.push({ id: element.id, libelle: element.libelle, nature: element.nature, avecPrix: element.avecPrix, options });
  }
  return champs;
}

/**
 * Monte l'îlot `EcranFormulaire` (change 010, ticket 07) sur l'écran d'un
 * formulaire — repéré par `data-ecran-formulaire`, l'identifiant du
 * formulaire en `data-id-formulaire`, les champs à choix et leurs options
 * courantes (identifiants) en JSON dans `data-champs`. La marque de brouillon se révèle dans
 * la zone `data-zone-marque-brouillon` de l'écran. Même garde que ci-dessus.
 */
export function monterEcranFormulaire(): void {
  const cibles = document.querySelectorAll<HTMLElement>('[data-ecran-formulaire]');

  cibles.forEach((cible) => {
    const { idFormulaire, champs: brut } = cible.dataset;
    if (idFormulaire === undefined || brut === undefined) return;
    const champs = lireChampsFormulaire(brut, cible);
    if (champs === null) return;
    const zoneMarque = document.querySelector('[data-zone-marque-brouillon]');

    cible.innerHTML = '';
    mount(EcranFormulaire, {
      target: cible,
      props: {
        idFormulaire,
        champs,
        apresEnregistrement: () => {
          afficherPastilleDansLaZone(zoneMarque);
        },
      },
    });
  });
}
