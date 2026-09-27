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

  Ticket 08 (openspec/changes/005-mise-en-page-administration/tickets/
  08-editeur-emplacements-texte.md, SC-08a/b/c/e/f) : la carte qui héberge
  cet îlot vit dans `[slug].astro` (inchangée ici) ; ce fichier n'habille
  que son propre contenu (champs, bouton `plumage`, refus en `danger`).
  Cibles de 44 px sur écran étroit, bouton en pleine largeur sous `md`
  (SC-08a/e). Aucune contrainte de test ne porte sur ce balisage (aucun
  import `?raw` de ce fichier) : libre de composer les champs autrement,
  pourvu que le geste (POST, libellé/destination) ne change pas.
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
      class="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm"
    />
  </label>
  <Button type="submit" disabled={enCours} class="w-full max-md:min-h-11 md:w-auto">Enregistrer</Button>
  {#if messageErreur}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
  {/if}
</form>
