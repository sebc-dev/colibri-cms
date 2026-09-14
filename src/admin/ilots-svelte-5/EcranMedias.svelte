<!--
  EcranMedias.svelte — l'assemblage de l'`Écran : Médias` (ticket 05,
  openspec/changes/004-bibliotheque-de-medias/tickets/05-ecran-medias.md,
  SC-05c) : le cadre commun (`Cadre.svelte`, rubrique « Médias » marquée
  active) autour de la réserve (`BibliothequeMedias.svelte`). Un seul
  composant composé plutôt qu'un `<template>` inerte capturé (comme
  `monterCadreAvecContenu`) : cet écran n'a, au ticket 05, rien à rendre côté
  serveur qui doive rester observable sans JavaScript (motif du mode
  `observé`, voir le ticket) — la grille elle-même vient d'un `fetch` fait
  par aucun composant ici (`mediasInitiaux` posé par le serveur), donc rien
  n'impose de capturer un HTML déjà rendu.
-->
<script lang="ts">
  import Cadre from './Cadre.svelte';
  import BibliothequeMedias from './BibliothequeMedias.svelte';
  import type { MediaListe } from '../../platform/medias/magasin.ts';

  interface Props {
    mediasInitiaux: readonly MediaListe[];
  }

  const { mediasInitiaux }: Props = $props();
</script>

<Cadre rubriqueActive="medias">
  <BibliothequeMedias {mediasInitiaux} />
</Cadre>
