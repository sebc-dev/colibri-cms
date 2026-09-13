<!--
  EmplacementImage.svelte — la présentation d'un emplacement d'image dans
  l'`Écran : Éditeur de page` (ticket 06,
  openspec/changes/004-bibliotheque-de-medias/tickets/
  06-editeur-presente-natures-image.md, SC-06a/b).

  PRÉSENTATION SEULE : montre que l'emplacement porte une image, sans le
  moindre moyen de la choisir ou de la remplacer (SC-06c) — le sélecteur
  d'image vient avec sa pose (ticket 08). `mediaId` est l'identité stable de
  l'image posée, déjà lue par `core/pages/declaration.ts` et posée par le
  serveur en attribut `data-*` (`monter.ts`) : ce composant ne relit ni ne
  requiert rien de plus, aucun `fetch`. Aucun terme de développeur (SC-06d) :
  l'identité elle-même n'est jamais affichée, seule sa présence l'est.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres présentations
  d'emplacement.
-->
<script lang="ts">
  interface Props {
    mediaId: string;
  }

  const { mediaId }: Props = $props();
</script>

<div>
  {#if mediaId.length > 0}
    <p>Une image est posée à cet emplacement.</p>
  {:else}
    <p>Aucune image n'est posée à cet emplacement.</p>
  {/if}
</div>
