<!--
  VignetteMedia.svelte — la vignette carrée d'une image de la réserve, servie
  par ses octets de brouillon (`/admin/medias/[id]/octets`). Partagée par les
  grilles de l'éditeur qui montrent une image de la réserve.

  Ticket 10 (openspec/changes/005-mise-en-page-administration/tickets/
  10-medias-habille.md, SC-10c) : coins tenus (`rounded-lg`, tokens/shape.css)
  et fond neutre (`bg-muted`) le temps du chargement — tokens seuls (`I14`),
  aucune couleur littérale. `VignetteMedia` est habillée ici une fois pour
  toutes ses grilles (bibliothèque, éditeur de page) ; ce ticket ne change
  ni ses props ni son comportement.
-->
<script lang="ts">
  interface Props {
    id: string;
    alt: string;
  }

  const { id, alt }: Props = $props();
</script>

<img
  src={`/admin/medias/${id}/octets`}
  {alt}
  loading="lazy"
  class="aspect-square w-full rounded-lg border border-border bg-muted object-cover"
/>
