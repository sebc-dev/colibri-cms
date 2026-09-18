<!--
  EcranFicheMedia.svelte — l'assemblage de l'`Écran : Fiche d'une image`
  (ticket 07, openspec/changes/004-bibliotheque-de-medias/tickets/
  07-fiche-renommer-decrire.md) : le cadre commun (`Cadre.svelte`, rubrique
  « Médias » marquée active, même patron que `EcranMedias.svelte` du ticket
  05) autour de la fiche (`FicheMedia.svelte`).
-->
<script lang="ts">
  import Cadre from './Cadre.svelte';
  import FicheMedia from './FicheMedia.svelte';
  import type { MediaFiche } from '../../platform/medias/magasin.ts';

  interface Props {
    media: MediaFiche;
  }

  const { media }: Props = $props();
</script>

<Cadre rubriqueActive="medias">
  <FicheMedia {media} />
</Cadre>
