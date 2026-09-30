<!--
  EmplacementImage.svelte — poser et remplacer une image dans un emplacement
  d'image, à l'`Écran : Éditeur de page` (ticket 08,
  openspec/changes/004-bibliotheque-de-medias/tickets/
  08-poser-remplacer-image.md, SC-08a/b/c).

  Ticket 06 (openspec/changes/004-bibliotheque-de-medias/tickets/
  06-editeur-presente-natures-image.md) posait ici une PRÉSENTATION SEULE,
  sans moyen de choisir ou de remplacer l'image. Ce ticket y ajoute le
  sélecteur : un bouton ouvre la réserve déjà connue (`mediasInitiaux`, lue
  côté serveur par `listerMediasBrouillon`, `src/platform/medias/
  magasin.ts`, servie par `[slug].astro` en attribut `data-*` — même patron
  que `BibliothequeMedias.svelte`, ticket 05) ; choisir une vignette POSTE
  `{ mediaId }` à la route générique d'écriture (`src/pages/admin/pages/
  [slug]/emplacements/[id].ts`), authentifiée par le seul cookie de session
  `SameSite=Strict` déjà attaché par le navigateur (ADR-0011) — aucun jeton
  anti-forgerie dédié. Poser une image dans un emplacement qui n'en porte
  aucune, ou remplacer celle déjà posée, sont le MÊME geste (SC-08a/b) :
  cet îlot ne distingue pas les deux, seul le libellé du bouton change selon
  qu'une image est déjà posée. Aucun octet n'est relu ni retéléversé ici :
  l'image est référencée par son identité seule (`mediaId`).

  Après une pose acceptée, révèle la pastille de brouillon du fil de retour
  sans recharger l'écran (`afficherPastilleDeBrouillon`, même geste que
  `CorrectionBoutonAction.svelte`/`ReglageLienVideo.svelte`) ; un refus
  (structure, forme) affiche le motif à l'écran, sans terme de développeur
  (FR-117, SC-08c), sans que rien n'ait été enregistré.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres présentations
  d'emplacement.

  Habillage : ticket 09 (005-mise-en-page-administration, SC-09a à SC-09f).
  Aucun geste ne change (même route, mêmes textes de refus) — seule la
  présentation :
  - L'image posée se montre elle-même (aspect large, coins tenus,
    `VignetteMedia`-like), plutôt que la seule phrase « une image est
    posée ». « Choisir une image »/« Remplacer l'image » reste l'action
    principale, en `plumage` (`Button` par défaut), pleine largeur sur
    écran étroit (`max-md:min-h-11`, cible ≥44 px, SC-09e).
  - La sur-couche de choix devient une vraie boîte de dialogue (`Dialog`,
    `bits-ui`, ADR-0009), même patron que la confirmation de suppression de
    `FicheMedia.svelte` (ticket 11) : en-tête non déroulant (titre + bouton
    de fermeture, toujours visible, SC-09b) et corps déroulant seul
    (`overflow-y-auto`), largeur pleine moins 16 px de chaque côté sous
    `sm` (`w-[calc(100%-2rem)]`, SC-09b), deux vignettes par rangée sur
    écran étroit (`grid-cols-2`, davantage au-delà). Animations sous
    `motion-safe:` (SC-09c) : sans mouvement quand l'appareil demande de
    réduire les animations.
  - Un refus s'affiche en `danger` (`bg-danger-soft`/`text-danger`,
    SC-09d) : dans la carte, hors sur-couche, quand elle est fermée ; dans
    le corps de la sur-couche (même geste, même texte) le temps qu'elle
    reste ouverte après un refus de pose — la pose ne ferme la sur-couche
    que sur un succès (aucun geste ne change).
  - Vignettes de la réserve : `VignetteMedia.svelte`, telle qu'habillée par
    le ticket 10 (écran Médias), sans modification ici. Chaque vignette et
    chaque contrôle offre une cible d'au moins 44 × 44 px sur écran étroit
    (SC-09e). Tokens seuls (`I14`) ; noms et descriptions rendus échappés
    (interpolation Svelte, jamais `{@html}`).
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import SurCoucheChoixImage from './SurCoucheChoixImage.svelte';
  import type { MediaListe } from '../../platform/medias/magasin.ts';
  import { afficherPastilleDeBrouillon } from '../pastille-brouillon.ts';
  import { messageErreurCorrection, MESSAGE_ECHEC, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    slug: string;
    idEmplacement: string;
    mediaIdInitial: string;
    mediasInitiaux: readonly MediaListe[];
  }

  const { slug, idEmplacement, mediaIdInitial, mediasInitiaux }: Props = $props();

  let mediaId = $state(mediaIdInitial);
  let ouvert = $state(false);
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);

  const nomImagePosee = $derived(mediasInitiaux.find((media) => media.id === mediaId)?.nomAffichage);

  // SC-08c — aucun terme de développeur : le motif du refus dit ce qui
  // manque, jamais « ID », « payload » ou « requête ».
  const TEXTES_REFUS: Readonly<Record<string, string>> = {
    'emplacement-non-declare': "Cet emplacement n'existe plus dans la page : rechargez l'écran.",
    'nature-non-corrigible': "Cet emplacement ne se corrige pas comme une image.",
    'forme-invalide': 'Choisissez une image dans la réserve.',
  };

  interface ReponseCorrection {
    readonly ok: boolean;
    readonly raison?: string;
  }

  async function poser(idMediaChoisi: string): Promise<void> {
    enCours = true;
    messageErreur = null;
    try {
      const reponse = await fetch(`/admin/pages/${slug}/emplacements/${idEmplacement}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mediaId: idMediaChoisi }),
      });
      // Seuls 200 (accepté) et 400 (refus métier) portent un corps JSON —
      // même distinction que `ReglageLienVideo.svelte`/`CorrectionBoutonAction.svelte`.
      if (reponse.status !== 200 && reponse.status !== 400) {
        messageErreur = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as ReponseCorrection;
      if (!resultat.ok) {
        messageErreur = TEXTES_REFUS[resultat.raison ?? ''] ?? MESSAGE_ECHEC;
        return;
      }
      mediaId = idMediaChoisi;
      ouvert = false;
      afficherPastilleDeBrouillon();
    } catch {
      messageErreur = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<div class="flex flex-col gap-3">
  {#if mediaId.length > 0}
    <img
      src={`/admin/medias/${mediaId}/octets`}
      alt={nomImagePosee ?? 'Image posée à cet emplacement'}
      loading="lazy"
      class="aspect-video w-full rounded-lg border border-border bg-muted object-cover"
    />
  {:else}
    <p class="text-sm text-ink-muted">Aucune image n'est posée à cet emplacement.</p>
  {/if}

  <div>
    <Button type="button" onclick={() => (ouvert = true)} disabled={enCours} class="w-full max-md:min-h-11 md:w-auto">
      {mediaId.length > 0 ? "Remplacer l'image" : 'Choisir une image'}
    </Button>
  </div>

  {#if messageErreur && !ouvert}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
  {/if}

  {#if ouvert}
    <SurCoucheChoixImage
      bind:ouvert
      titre="Choisir une image"
      medias={mediasInitiaux}
      messageVide="La bibliothèque ne contient encore aucune image."
      libelleChoix={(nom) => `Poser l'image ${nom}`}
      onChoisir={poser}
      {enCours}
      {messageErreur}
    />
  {/if}
</div>
