<!--
  EcranDemandes.svelte — l'îlot de l'`Écran : Demandes` (change 013, ticket 09) : la phrase et le
  tableau des nombres, le filtre, la liste (une case par demande), la barre de sélection et le
  retrait groupé (`POST /admin/demandes/retrait`, cookie `SameSite=Strict`, ADR-0011). Emboîte
  `ChoixSuite` (ticket 07, inchangé) et réemploie `DialogueRetrait` (ticket 08). La pagination est
  rendue par le serveur, hors de l'îlot. Après un retrait, l'écran se recharge
  sur le même filtre et la même page. Interpolation échappée seulement (I5). Aucune directive
  `client:*` (ADR-0006).
-->
<script lang="ts">
  import ChoixSuite from './ChoixSuite.svelte';
  import DialogueRetrait from './DialogueRetrait.svelte';
  import { demanderRetrait } from './demander-retrait.ts';
  import { Badge } from '../composants/ui/badge/index.ts';
  import type { DonneesEcranDemandes, Nombres } from './donnees-demandes.ts';
  import type { MotifDeRetrait } from '../../core/demandes/retrait.ts';
  import {
    TEXTE_AUCUNE_DEMANDE,
    TEXTES_SUITE_DEMANDE,
    TEXTE_EMAIL_NON_PARTI,
    TEXTE_FILTRE_FORMULAIRE,
    TEXTE_FILTRE_TOUS,
    TEXTE_COLONNE_FORMULAIRE,
    TEXTE_COLONNE_DEMANDES,
    TEXTE_COLONNE_COMMANDES,
    TEXTE_COLONNE_RETIREES,
    TEXTE_NOMBRES_PAR_FORMULAIRE,
    TEXTE_TOUT_SELECTIONNER,
    TEXTE_TOUT_DESELECTIONNER,
    TEXTE_BOUTON_RETIRER_SELECTION,
    TEXTE_RETRAIT_ECHEC,
    texteMotifOrdinaireGroupe,
    texteMotifIndesirableGroupe,
    texteNombresDuSite,
    texteDemandesSelectionnees,
    texteCaseDemande,
    texteTitreRetraitGroupe,
    texteCorpsRetraitGroupe,
  } from '../textes.ts';

  interface Props {
    donnees: DonneesEcranDemandes;
    apresRetrait: () => void;
  }

  const { donnees, apresRetrait }: Props = $props();

  let nombres = $state<Nombres>(donnees.nombres);
  let selection = $state<string[]>([]);
  let ouvert = $state(false);
  let enCours = $state(false);
  let echec = $state<string | null>(null);

  function majNombres(brut: unknown): void {
    const recus = brut as Nombres | undefined;
    if (recus === undefined || typeof recus.site !== 'object') return;
    nombres = { ...recus, montrerRetirees: recus.site.retirees > 0 };
  }

  function basculer(id: string, coche: boolean): void {
    selection = coche ? [...selection.filter((x) => x !== id), id] : selection.filter((x) => x !== id);
  }

  async function retirer(motif: MotifDeRetrait): Promise<void> {
    enCours = true;
    echec = null;
    try {
      await demanderRetrait(selection, motif);
      apresRetrait();
    } catch {
      echec = TEXTE_RETRAIT_ECHEC;
      enCours = false;
    }
  }
</script>

<p class="mt-4 font-medium" data-nombres-site>
  {texteNombresDuSite(nombres.site.demandes, nombres.site.commandes, nombres.site.retirees)}
</p>
{#if nombres.formulaires.length > 0}
  <table class="mt-4 w-full text-left" aria-label={TEXTE_NOMBRES_PAR_FORMULAIRE}>
    <thead>
      <tr>
        <th scope="col">{TEXTE_COLONNE_FORMULAIRE}</th>
        <th scope="col">{TEXTE_COLONNE_DEMANDES}</th>
        <th scope="col">{TEXTE_COLONNE_COMMANDES}</th>
        {#if nombres.montrerRetirees}<th scope="col">{TEXTE_COLONNE_RETIREES}</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each nombres.formulaires as f (f.id)}
        <tr data-nombres-formulaire={f.id}>
          <th scope="row" class="break-words font-normal">{f.nom}</th>
          <td data-nombre-demandes>{f.demandes}</td>
          <td data-nombre-commandes>{f.commandes}</td>
          {#if nombres.montrerRetirees}<td>{f.retirees}</td>{/if}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
{#if donnees.filtres.length > 0}
  <nav aria-label={TEXTE_FILTRE_FORMULAIRE} class="mt-6 flex flex-wrap items-center gap-2">
    <span>{TEXTE_FILTRE_FORMULAIRE}</span>
    <a
      href={donnees.adresseTous}
      aria-current={donnees.formulaire === null ? 'true' : undefined}
      class="min-h-11 underline md:min-h-0">{TEXTE_FILTRE_TOUS}</a
    >
    {#each donnees.filtres as f (f.id)}
      <a
        href={f.adresse}
        aria-current={donnees.formulaire === f.id ? 'true' : undefined}
        class="min-h-11 underline md:min-h-0">{f.nom}</a
      >
    {/each}
  </nav>
{/if}
{#if donnees.demandes.length === 0}
  <div class="mt-6 rounded-lg border border-border bg-card p-4 text-ink-muted">
    <p>{TEXTE_AUCUNE_DEMANDE}</p>
  </div>
{:else}
  <div class="mt-6">
    <button
      type="button"
      onclick={() => (selection = donnees.demandes.map((d) => d.id))}
      class="min-h-11 rounded-md border border-border bg-card px-3 text-ink md:min-h-9"
    >
      {TEXTE_TOUT_SELECTIONNER}
    </button>
  </div>
  <ul class="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
    {#each donnees.demandes as d (d.id)}
      <li class="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:gap-4">
        <input
          type="checkbox"
          aria-label={texteCaseDemande(d.reception, d.contact)}
          checked={selection.includes(d.id)}
          onchange={(e) => basculer(d.id, e.currentTarget.checked)}
          class="size-11 shrink-0 accent-primary md:size-5"
        />
        <a href={`/admin/demandes/${d.id}`} class="min-h-11 break-words font-medium md:min-h-0">{d.reception}</a>
        <span class="break-words">{d.formulaire}</span>
        <span class="break-words text-ink-muted">{d.page}</span>
        <span class="break-all">{d.contact}</span>
        {#if d.prix !== null}<span>{d.prix}</span>{/if}
        <div>
          <ChoixSuite idDemande={d.id} suiteInitiale={d.suite} libelle={d.libelle} apresEnregistrement={majNombres} />
        </div>
        {#if d.courrielNonParti}<Badge variant="outline">{TEXTE_EMAIL_NON_PARTI}</Badge>{/if}
      </li>
    {/each}
  </ul>
{/if}
{#if selection.length > 0}
  <div
    data-barre-selection
    class="flex flex-wrap items-center gap-3 border-border bg-card p-3 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:border-t md:mt-4 md:rounded-lg md:border"
  >
    <p aria-live="polite" class="font-medium">{texteDemandesSelectionnees(selection.length)}</p>
    <button
      type="button"
      onclick={() => (selection = [])}
      class="min-h-11 rounded-md border border-border bg-card px-3 text-ink md:min-h-9"
    >
      {TEXTE_TOUT_DESELECTIONNER}
    </button>
    <button
      type="button"
      onclick={() => {
        echec = null;
        ouvert = true;
      }}
      class="min-h-11 rounded-md border border-destructive px-3 text-destructive md:min-h-9"
    >
      {TEXTE_BOUTON_RETIRER_SELECTION}
    </button>
  </div>
{/if}
<DialogueRetrait
  bind:ouvert
  {enCours}
  {echec}
  titre={texteTitreRetraitGroupe(selection.length)}
  corps={texteCorpsRetraitGroupe(selection.length)}
  motifOrdinaire={texteMotifOrdinaireGroupe(selection.length)}
  motifIndesirable={texteMotifIndesirableGroupe(selection.length)}
  confirmer={retirer}
/>
