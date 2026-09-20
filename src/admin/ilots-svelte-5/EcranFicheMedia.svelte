<!--
  EcranFicheMedia.svelte — l'assemblage de l'`Écran : Fiche d'une image`
  (ticket 07, openspec/changes/004-bibliotheque-de-medias/tickets/
  07-fiche-renommer-decrire.md) : le cadre commun (`Cadre.svelte`, rubrique
  « Médias » marquée active, même patron que `EcranMedias.svelte` du ticket
  05) autour de la fiche (`FicheMedia.svelte`).

  Ticket 11 (openspec/changes/004-bibliotheque-de-medias/tickets/
  11-ou-posee-et-supprimer.md, SC-11a/b) : `emplacements` (déjà composée par
  `src/pages/admin/medias/[id].astro`) traverse jusqu'à `FicheMedia.svelte`
  sans y toucher — c'est elle qui l'affiche et la réutilise pour la
  confirmation de suppression.
-->
<script lang="ts">
  import Cadre from './Cadre.svelte';
  import FicheMedia from './FicheMedia.svelte';
  import type { MediaFiche } from '../../platform/medias/magasin.ts';
  import type { EmplacementOuPoseeMedia } from './emplacements-media.ts';

  interface Props {
    media: MediaFiche;
    emplacements: readonly EmplacementOuPoseeMedia[];
  }

  const { media, emplacements }: Props = $props();
</script>

<Cadre rubriqueActive="medias">
  <FicheMedia {media} {emplacements} />
</Cadre>
