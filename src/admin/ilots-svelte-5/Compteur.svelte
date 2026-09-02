<!--
  Compteur.svelte — l'îlot minimal du ticket 01
  (specs/002-socle-ilots-admin/01-ilot-svelte-sous-csp.md).

  Un seul état réactif (`$state`, Svelte 5) et un seul geste : la preuve que
  le point d'entrée externe monte réellement un composant interactif, sans
  qu'aucune directive `client:*` n'entre en jeu (ADR-0006 : l'administration
  se bâtit comme une application, pas comme des îlots hydratés dans une
  page). Aucun bloc `<style>` : ADR-0008 impose `style-src 'self'` sans
  `unsafe-inline`, et Astro sert les blocs `<style>` en ligne en
  développement — ce composant minimal n'a besoin d'aucun style pour
  prouver le montage.
-->
<script>
  let compte = $state(0);
</script>

<p>Ajouts : {compte}</p>
<button type="button" onclick={() => (compte += 1)}>Ajouter un</button>
