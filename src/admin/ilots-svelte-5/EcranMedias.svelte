<!--
  EcranMedias.svelte — l'assemblage de l'`Écran : Médias` (ticket 05,
  openspec/changes/004-bibliotheque-de-medias/tickets/05-ecran-medias.md,
  SC-05c) : la réserve (`BibliothequeMedias.svelte`).

  Ticket 03 (openspec/changes/005-mise-en-page-administration/tickets/
  03-cadre-avec-l-ecran.md, SC-03b) : le cadre commun (logo, menu) n'est
  plus rendu ici — `Cadre.svelte` est supprimé, et `src/pages/admin/
  medias.astro` enveloppe désormais cette route dans `GabaritCadre.astro`,
  rendu par le serveur. Ce composant ne rend plus que son contenu propre.
-->
<script lang="ts">
  import BibliothequeMedias from './BibliothequeMedias.svelte';
  import type { MediaListe } from '../../platform/medias/magasin.ts';

  interface Props {
    mediasInitiaux: readonly MediaListe[];
  }

  const { mediasInitiaux }: Props = $props();
</script>

<BibliothequeMedias {mediasInitiaux} />
