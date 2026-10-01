<!--
  CorrectionBoutonAction.svelte — l'îlot de correction d'un emplacement de
  bouton d'action (ticket 04,
  openspec/changes/003-remplir-emplacements/tickets/04-corriger-bouton-action.md).

  Enregistre le libellé et la destination par la route générique d'écriture
  (`src/pages/admin/pages/[slug]/emplacements/[id].ts`) : un `POST` JSON,
  authentifié par le seul cookie de session `SameSite=Strict` déjà attaché
  par le navigateur (ADR-0011, SC-04g) — aucun jeton anti-forgerie dédié,
  aucun en-tête ni paramètre d'URL ne le remplace.

  Après un enregistrement accepté, révèle la pastille de brouillon du fil de
  retour sans recharger l'écran (`afficherPastilleDeBrouillon`,
  SC-04f) ; un refus (structure, forme, destination hors liste blanche,
  SC-04c/h) affiche le motif à l'écran, sans terme de développeur (FR-117),
  sans que rien n'ait été enregistré.

  Aucune directive `client:*` (ADR-0006) : monté par un point d'entrée
  externe (`monter.ts`), même patron que `ActionRapide.svelte`.

  Habillage : ticket 08 (005-mise-en-page-administration). Aucun test
  n'importe ce fichier en `?raw` : ses deux champs peuvent être composés
  autrement, pourvu que le geste (POST, libellé/destination) ne change pas.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import { afficherPastilleDeBrouillon } from '../pastille-brouillon.ts';
  import { messageErreurCorrection, MESSAGE_ECHEC, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    slug: string;
    idEmplacement: string;
    libelleInitial: string;
    destinationInitial: string;
  }

  const { slug, idEmplacement, libelleInitial, destinationInitial }: Props = $props();

  let libelle = $state(libelleInitial);
  let destination = $state(destinationInitial);
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);
  // CT-7.6 — une destination refusée se dit au champ « Va vers » (message
  // relié, `aria-invalid`), pas sous le bouton : l'éditrice voit quoi corriger.
  let destinationRefusee = $state(false);
  const idMessageDestination = `destination-refusee-${idEmplacement}`;

  const TEXTES_REFUS: Readonly<Record<string, string>> = {
    'emplacement-non-declare': "Cet emplacement n'existe plus dans la page : rechargez l'écran.",
    'nature-non-corrigible': "Cet emplacement ne se corrige pas comme un bouton d'action.",
    'forme-invalide': 'Le libellé et la destination sont requis.',
    'destination-invalide':
      "Cette destination n'est pas reconnue : utilisez une adresse web (commençant par https://), une adresse e-mail (mailto:), un numéro (tel:) ou un lien du site (commençant par /).",
  };

  interface ReponseCorrection {
    readonly ok: boolean;
    readonly raison?: string;
  }

  async function enregistrer(evenement: SubmitEvent): Promise<void> {
    evenement.preventDefault();
    enCours = true;
    messageErreur = null;
    destinationRefusee = false;
    try {
      const reponse = await fetch(`/admin/pages/${slug}/emplacements/${idEmplacement}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ libelle, destination }),
      });
      // Seuls 200 (accepté) et 400 (refus métier) portent un corps JSON ; les
      // autres statuts (401 accès expiré, 404 écran périmé, 5xx) ont un corps
      // vide dont la lecture JSON lèverait — on les traduit par le statut.
      if (reponse.status !== 200 && reponse.status !== 400) {
        messageErreur = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as ReponseCorrection;
      if (resultat.raison === 'destination-invalide') {
        destinationRefusee = true;
        return;
      }
      if (!resultat.ok) {
        messageErreur = TEXTES_REFUS[resultat.raison ?? ''] ?? MESSAGE_ECHEC;
        return;
      }
      afficherPastilleDeBrouillon();
    } catch {
      messageErreur = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<form onsubmit={enregistrer} class="flex flex-col gap-3">
  <label>
    <span class="mb-1 block text-sm font-medium text-ink">Libellé</span>
    <input
      type="text"
      bind:value={libelle}
      required
      class="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm"
    />
  </label>
  <label>
    <span class="mb-1 block text-sm font-medium text-ink">Va vers</span>
    <input
      type="text"
      bind:value={destination}
      required
      aria-invalid={destinationRefusee}
      aria-describedby={destinationRefusee ? idMessageDestination : undefined}
      class="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring aria-invalid:border-danger max-md:min-h-11 md:text-sm"
    />
  </label>
  {#if destinationRefusee}
    <p id={idMessageDestination} role="alert" class="-mt-2 text-sm text-danger">{TEXTES_REFUS['destination-invalide']}</p>
  {/if}
  <Button type="submit" disabled={enCours} class="w-full max-md:min-h-11 md:w-auto">Enregistrer</Button>
  {#if messageErreur}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
  {/if}
</form>
