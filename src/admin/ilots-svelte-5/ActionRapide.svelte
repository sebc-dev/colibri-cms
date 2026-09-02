<!--
  ActionRapide.svelte — le premier îlot bâti sur des composants de la base
  shadcn-svelte (ticket 02,
  specs/002-socle-ilots-admin/02-composant-shadcn-sous-csp.md, ADR-0009,
  ADR-0010).

  `TooltipContent` (bits-ui, via Floating UI) est le composant qui exerce
  réellement ADR-0010 : à l'ouverture, il pose un attribut `style="…"` en
  ligne, calculé à l'exécution (position du survol), sur l'élément
  positionné — le cas précis que `style-src-attr 'unsafe-inline'`
  réconcilie avec la CSP stricte de l'administration (`Button`, lui, n'émet
  aucun style en ligne : il ne suffit pas seul à exercer ADR-0010).
  Aucune directive `client:*` (ADR-0006) : ce composant se monte par le même
  point d'entrée externe que `Compteur.svelte` (ticket 01), jamais par
  hydratation en ligne d'Astro.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../composants/ui/tooltip/index.ts';

  let dernierAjout = $state<number | null>(null);
</script>

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Button {...props} type="button" onclick={() => (dernierAjout = Date.now())}>
          Enregistrer un brouillon
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>Enregistre l'état actuel sans le publier</TooltipContent>
  </Tooltip>
</TooltipProvider>
{#if dernierAjout !== null}
  <p>Dernier geste : {new Date(dernierAjout).toLocaleTimeString('fr-FR')}</p>
{/if}
