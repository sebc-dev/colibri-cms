<!--
  EcranFicheMedia.svelte — l'assemblage de l'`Écran : Fiche d'une image`
  (ticket 07, openspec/changes/004-bibliotheque-de-medias/tickets/
  07-fiche-renommer-decrire.md) : la fiche (`FicheMedia.svelte`).

  Ticket 11 (openspec/changes/004-bibliotheque-de-medias/tickets/
  11-ou-posee-et-supprimer.md, SC-11a/b) : `emplacements` (déjà composée par
  `src/pages/admin/medias/[id].astro`) traverse jusqu'à `FicheMedia.svelte`
  sans y toucher — c'est elle qui l'affiche et la réutilise pour la
  confirmation de suppression.

  Ticket 03 (openspec/changes/005-mise-en-page-administration/tickets/
  03-cadre-avec-l-ecran.md, SC-03b) : le cadre commun (logo, menu) n'est
  plus rendu ici — `Cadre.svelte` est supprimé, et `src/pages/admin/
  medias/[id].astro` enveloppe désormais cette route dans
  `GabaritCadre.astro`, rendu par le serveur. Ce composant ne rend plus que
  son contenu propre.
-->
<script lang="ts">
  import FicheMedia from './FicheMedia.svelte';
  import type { MediaFiche } from '../../platform/medias/magasin.ts';
  import type { EmplacementOuPoseeMedia } from './emplacements-media.ts';

  interface Props {
    media: MediaFiche;
    emplacements: readonly EmplacementOuPoseeMedia[];
  }

  const { media, emplacements }: Props = $props();
</script>

<FicheMedia {media} {emplacements} />
