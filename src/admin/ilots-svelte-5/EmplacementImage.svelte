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
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
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

  // SC-08c — aucun terme de développeur : le motif du refus dit ce qui
  // manque, jamais « ID », « payload » ou « requête ».
  const TEXTES_REFUS: Readonly<Record<string, string>> = {
    'emplacement-non-declare': "Cet emplacement n'existe plus dans la page : rechargez l'écran.",
    'nature-non-corrigible': "Cet emplacement ne se corrige pas comme une image.",
    'forme-invalide': "Choisissez une image dans la réserve.",
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

<div>
  {#if mediaId.length > 0}
    <p>Une image est posée à cet emplacement.</p>
  {:else}
    <p>Aucune image n'est posée à cet emplacement.</p>
  {/if}

  <Button type="button" onclick={() => (ouvert = !ouvert)} disabled={enCours}>
    {mediaId.length > 0 ? "Remplacer l'image" : 'Choisir une image'}
  </Button>

  {#if messageErreur}
    <p role="alert">{messageErreur}</p>
  {/if}

  {#if ouvert}
    <div>
      {#if mediasInitiaux.length === 0}
        <p>La bibliothèque ne contient encore aucune image.</p>
      {:else}
        <ul class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
          {#each mediasInitiaux as media (media.id)}
            <li>
              <button
                type="button"
                onclick={() => poser(media.id)}
                disabled={enCours}
                aria-label={`Poser l'image ${media.nomOrigine}`}
              >
                <img
                  src={`/admin/medias/${media.id}/octets`}
                  alt={media.nomOrigine}
                  loading="lazy"
                  class="aspect-square w-full object-cover"
                />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
