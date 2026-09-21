<!--
  VignetteMedia.svelte — la vignette carrée d'une image de la réserve, servie
  par ses octets de brouillon (`/admin/medias/[id]/octets`). Partagée par les
  grilles de l'éditeur qui montrent une image de la réserve.
-->
<script lang="ts">
  interface Props {
    id: string;
    alt: string;
  }

  const { id, alt }: Props = $props();
</script>

<img src={`/admin/medias/${id}/octets`} {alt} loading="lazy" class="aspect-square w-full object-cover" />
