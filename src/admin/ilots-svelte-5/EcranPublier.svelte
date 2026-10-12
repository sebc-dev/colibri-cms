<!--
  EcranPublier.svelte — l'îlot de l'`Écran : Publier` (change 011, ticket 15). « Publier maintenant »
  confirme le récapitulatif affiché (`POST /admin/publication`, avec son empreinte), puis enchaîne
  `POST /admin/publication/suite` jusqu'à la fin. Cookie `SameSite=Strict` (ADR-0011). Si le
  récapitulatif a changé, l'écran se recharge pour présenter la liste à jour. Aucune directive
  `client:*` (ADR-0006).
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import {
    TEXTE_BOUTON_PUBLIER_MAINTENANT,
    TEXTE_PUBLICATION_DEJA_EN_COURS,
    TEXTE_PUBLICATION_ECHEC,
    TEXTE_PUBLICATION_EN_COURS,
    TEXTE_PUBLICATION_INACHEVEE,
    TEXTE_PUBLICATION_TERMINEE,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    empreinte: string;
    apresChangement: () => void;
  }

  const { empreinte, apresChangement }: Props = $props();

  let enCours = $state(false);
  let termine = $state(false);
  let message = $state<string | null>(null);

  interface Reponse {
    readonly ok: boolean;
    readonly raison?: string;
    readonly jeton?: string;
    readonly fini?: boolean;
  }

  async function poster(adresse: string, corps: unknown): Promise<{ statut: number; json: Reponse | null }> {
    const reponse = await fetch(adresse, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    });
    let json: Reponse | null = null;
    try {
      json = (await reponse.json()) as Reponse;
    } catch {
      json = null;
    }
    return { statut: reponse.status, json };
  }

  async function publier(): Promise<void> {
    enCours = true;
    message = null;
    try {
      const confirmation = await poster('/admin/publication', { empreinte });
      if (confirmation.statut === 409 && confirmation.json?.raison === 'en-cours') {
        message = TEXTE_PUBLICATION_DEJA_EN_COURS;
        enCours = false;
        return;
      }
      if (confirmation.statut === 409) {
        apresChangement();
        return;
      }
      if (confirmation.statut !== 200 || confirmation.json?.jeton === undefined) {
        message = confirmation.statut === 401 ? messageErreurCorrection(401) : TEXTE_PUBLICATION_ECHEC;
        enCours = false;
        return;
      }
      let reprises = 0;
      for (;;) {
        const suite = await poster('/admin/publication/suite', { jeton: confirmation.json.jeton });
        if (suite.json?.raison === 'a-finaliser' && reprises < 2) {
          reprises += 1;
          continue;
        }
        if (suite.statut !== 200 || suite.json?.ok !== true) {
          if (suite.json?.raison === 'a-finaliser') {
            message = TEXTE_PUBLICATION_INACHEVEE;
          } else {
            message = suite.statut === 401 ? messageErreurCorrection(401) : TEXTE_PUBLICATION_ECHEC;
          }
          enCours = false;
          return;
        }
        if (suite.json.fini === true) break;
      }
      termine = true;
      enCours = false;
    } catch {
      message = MESSAGE_RESEAU;
      enCours = false;
    }
  }
</script>

{#if termine}
  <p class="mt-6 rounded-lg border border-border bg-card p-4" role="status" data-publie>{TEXTE_PUBLICATION_TERMINEE}</p>
{:else}
  <div class="mt-6">
    <Button
      type="button"
      id="bouton-publier-maintenant"
      class="h-auto rounded-md px-4 py-2 max-md:min-h-11"
      disabled={enCours}
      onclick={publier}
    >
      {enCours ? TEXTE_PUBLICATION_EN_COURS : TEXTE_BOUTON_PUBLIER_MAINTENANT}
    </Button>
    {#if message !== null}
      <p class="mt-3 text-sm text-danger" role="alert">{message}</p>
    {/if}
  </div>
{/if}
