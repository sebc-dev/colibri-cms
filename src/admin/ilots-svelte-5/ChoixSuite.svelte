<!--
  ChoixSuite.svelte — la suite d'une demande, choisie dans une liste déroulante enregistrée dès
  le choix (change 013, ticket 07 ; `POST /admin/demandes/<id>/suite`, cookie `SameSite=Strict`,
  ADR-0011). En cas d'échec la liste revient à la suite d'avant et le message est annoncé sous la
  ligne. Interpolation échappée seulement (I5). Aucune directive `client:*` (ADR-0006).
-->
<script lang="ts">
  import { TEXTES_SUITE_DEMANDE, TEXTE_SUITE_NON_ENREGISTREE } from '../textes.ts';
  import { SUITES_CHOISISSABLES } from '../../core/demandes/suite.ts';

  interface Props {
    idDemande: string;
    suiteInitiale: string;
    libelle: string;
    apresEnregistrement: (nombres: unknown) => void;
  }

  const { idDemande, suiteInitiale, libelle, apresEnregistrement }: Props = $props();

  let suite = $state(suiteInitiale);
  let echec = $state(false);
  let enCours = false;
  // Dernier choix fait pendant un envoi : enregistré à la suite, il n'est jamais perdu.
  let enAttente: string | null = null;

  async function enregistrer(choix: string, liste: HTMLSelectElement): Promise<boolean> {
    const avant = suite;
    enCours = true;
    echec = false;
    suite = choix;
    try {
      const reponse = await fetch(`/admin/demandes/${encodeURIComponent(idDemande)}/suite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suite: choix }),
      });
      const json = (await reponse.json()) as { ok?: boolean; nombres?: unknown };
      if (!reponse.ok || json.ok !== true) throw new Error('refus');
      apresEnregistrement(json.nombres);
      return true;
    } catch {
      suite = avant;
      liste.value = avant;
      echec = true;
      return false;
    } finally {
      enCours = false;
    }
  }

  async function choisir(evenement: Event): Promise<void> {
    // `currentTarget` vaut null après le premier `await` : la liste est lue avant.
    const liste = evenement.currentTarget as HTMLSelectElement;
    const choix = liste.value;
    if (enCours) {
      enAttente = choix === suite ? null : choix;
      return;
    }
    if (choix === suite) return;
    let prochain: string | null = choix;
    while (prochain !== null) {
      const reussi = await enregistrer(prochain, liste);
      prochain = reussi && enAttente !== null && enAttente !== suite ? enAttente : null;
      enAttente = null;
    }
  }
</script>

<div>
  <select
    aria-label={libelle}
    value={suite}
    onchange={choisir}
    class="min-h-11 rounded-md border border-border bg-card px-2 text-ink"
  >
    {#if suiteInitiale === 'a-renseigner'}
      <option value="a-renseigner" disabled>{TEXTES_SUITE_DEMANDE['a-renseigner']}</option>
    {/if}
    {#each SUITES_CHOISISSABLES as valeur (valeur)}
      <option value={valeur}>{TEXTES_SUITE_DEMANDE[valeur]}</option>
    {/each}
  </select>
  <p aria-live="polite" class="text-sm">{echec ? TEXTE_SUITE_NON_ENREGISTREE : ''}</p>
</div>
