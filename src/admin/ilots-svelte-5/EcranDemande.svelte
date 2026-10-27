<!--
  EcranDemande.svelte — l'îlot de l'`Écran : Demande` (change 013, ticket 08) : emboîte la suite
  (`ChoixSuite`, ticket 07, inchangé) et le retrait de la demande (`POST /admin/demandes/retrait`,
  cookie `SameSite=Strict`, ADR-0011). Après un retrait, l'écran mène à la liste à jour. Aucune
  directive `client:*` (ADR-0006).
-->
<script lang="ts">
  import ChoixSuite from './ChoixSuite.svelte';
  import DialogueRetrait from './DialogueRetrait.svelte';
  import { demanderRetrait } from './demander-retrait.ts';
  import { TEXTE_BOUTON_RETIRER_DEMANDE, TEXTE_RETRAIT_ECHEC } from '../textes.ts';
  import type { MotifDeRetrait } from '../../core/demandes/retrait.ts';

  interface Props {
    idDemande: string;
    suiteInitiale: string;
    libelle: string;
    apresRetrait: () => void;
  }

  const { idDemande, suiteInitiale, libelle, apresRetrait }: Props = $props();

  let ouvert = $state(false);
  let enCours = $state(false);
  let echec = $state<string | null>(null);

  async function retirer(motif: MotifDeRetrait): Promise<void> {
    enCours = true;
    echec = null;
    try {
      await demanderRetrait([idDemande], motif);
      apresRetrait();
    } catch {
      echec = TEXTE_RETRAIT_ECHEC;
      enCours = false;
    }
  }
</script>

<div class="space-y-6">
  <ChoixSuite {idDemande} {suiteInitiale} {libelle} apresEnregistrement={() => {}} />
  <button
    type="button"
    onclick={() => {
      echec = null;
      ouvert = true;
    }}
    class="min-h-11 rounded-md border border-destructive px-3 text-destructive md:min-h-9"
  >
    {TEXTE_BOUTON_RETIRER_DEMANDE}
  </button>
  <DialogueRetrait bind:ouvert {enCours} {echec} confirmer={retirer} />
</div>
