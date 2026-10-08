<!--
  CarteCoordonnees.svelte — l'îlot de la carte Coordonnées de l'`Écran :
  Réglages` (ticket 06,
  openspec/changes/008-reglages-transverses/tickets/06-carte-coordonnees.md).

  Soumet toutes les valeurs d'un coup à `POST /admin/reglages/coordonnees`
  (cookie `SameSite=Strict`, ADR-0011). Aucun geste d'ajout, de retrait, de
  renommage ni de déplacement : les champs viennent de la déclaration. Un
  refus marque le champ concerné d'un message qui dit ce qui est attendu (le
  code de raison est traduit, jamais affiché brut) ; la saisie est gardée.
  Aucune directive `client:*` (ADR-0006) ; interpolation échappée seulement.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import {
    TEXTE_BOUTON_ENREGISTRER,
    TEXTE_ENREGISTREMENT_EN_COURS,
    TEXTE_REFUS_COORDONNEE_INCONNU,
    TEXTES_REFUS_COORDONNEES,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';
  import type { CoordonneeCarte } from './coordonnees-carte.ts';

  interface Props {
    coordonnees: readonly CoordonneeCarte[];
    apresEnregistrement: () => void;
  }

  const { coordonnees, apresEnregistrement }: Props = $props();

  let valeurs = $state<Record<string, string>>(Object.fromEntries(coordonnees.map((c) => [c.id, c.valeur])));
  let erreurs = $state<Record<string, string>>({});
  let messageGeneral = $state<string | null>(null);
  let enCours = $state(false);

  const CLASSE_CHAMP =
    'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm';
  const INPUT_PAR_NATURE = {
    telephone: { type: 'tel', inputmode: 'tel' },
    email: { type: 'email', inputmode: 'email' },
    texte: { type: 'text', inputmode: 'text' },
    adresse: { type: 'text', inputmode: 'text' },
  } as const;

  interface RefusChamp {
    readonly champ: string;
    readonly raison: string;
  }
  interface Reponse {
    readonly ok: boolean;
    readonly raison?: string;
    readonly refus?: readonly RefusChamp[];
  }

  async function enregistrer(evenement: SubmitEvent): Promise<void> {
    evenement.preventDefault();
    enCours = true;
    erreurs = {};
    messageGeneral = null;
    try {
      const reponse = await fetch('/admin/reglages/coordonnees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ coordonnees: coordonnees.map((c) => ({ id: c.id, valeur: valeurs[c.id] ?? '' })) }),
      });
      if (reponse.status !== 200 && reponse.status !== 400) {
        messageGeneral = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as Reponse;
      if (resultat.ok) {
        apresEnregistrement();
        return;
      }
      if (resultat.refus === undefined) {
        messageGeneral = TEXTES_REFUS_COORDONNEES[resultat.raison ?? ''] ?? TEXTE_REFUS_COORDONNEE_INCONNU;
        return;
      }
      const marques: Record<string, string> = {};
      for (const { champ, raison } of resultat.refus) {
        marques[champ] = TEXTES_REFUS_COORDONNEES[raison] ?? TEXTE_REFUS_COORDONNEE_INCONNU;
      }
      erreurs = marques;
    } catch {
      messageGeneral = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<form onsubmit={enregistrer} novalidate class="flex flex-col gap-4">
  {#each coordonnees as c (c.id)}
    <div class="flex flex-col gap-1">
      <label for={`champ-coordonnee-${c.id}`} class="text-sm font-medium">{c.intitule}</label>
      {#if c.nature === 'adresse'}
        <textarea
          id={`champ-coordonnee-${c.id}`}
          rows="3"
          bind:value={valeurs[c.id]}
          aria-invalid={erreurs[c.id] !== undefined}
          aria-describedby={erreurs[c.id] !== undefined ? `erreur-coordonnee-${c.id}` : undefined}
          class={CLASSE_CHAMP}
        ></textarea>
      {:else}
        <input
          id={`champ-coordonnee-${c.id}`}
          type={INPUT_PAR_NATURE[c.nature].type}
          inputmode={INPUT_PAR_NATURE[c.nature].inputmode}
          bind:value={valeurs[c.id]}
          aria-invalid={erreurs[c.id] !== undefined}
          aria-describedby={erreurs[c.id] !== undefined ? `erreur-coordonnee-${c.id}` : undefined}
          class={CLASSE_CHAMP}
        />
      {/if}
      {#if erreurs[c.id] !== undefined}
        <p id={`erreur-coordonnee-${c.id}`} role="alert" class="text-sm text-danger">{erreurs[c.id]}</p>
      {/if}
    </div>
  {/each}
  <Button type="submit" disabled={enCours} class="h-auto self-start rounded-md border-0 px-3 py-2 max-md:min-h-11">
    {enCours ? TEXTE_ENREGISTREMENT_EN_COURS : TEXTE_BOUTON_ENREGISTRER}
  </Button>
  {#if messageGeneral}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageGeneral}</p>
  {/if}
</form>
