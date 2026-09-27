<!--
  ReglageLienVideo.svelte — l'îlot de réglage d'un emplacement de lien de
  vidéo (ticket 05,
  openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md).

  Enregistre le lien par la route générique d'écriture
  (`src/pages/admin/pages/[slug]/emplacements/[id].ts`) : un `POST` JSON,
  authentifié par le seul cookie de session `SameSite=Strict` déjà attaché
  par le navigateur (ADR-0011) — aucun jeton anti-forgerie dédié, aucun
  en-tête ni paramètre d'URL ne le remplace.

  Après un enregistrement accepté, révèle la pastille de brouillon du fil de
  retour sans recharger l'écran (`afficherPastilleDeBrouillon`, SC-05b) ; un
  refus (structure, forme, lien hors liste blanche d'hébergeurs, SC-05c/d)
  affiche le motif à l'écran, sans terme de développeur (FR-117, SC-05e),
  sans que rien n'ait été enregistré.

  Aucune directive `client:*` (ADR-0006) : monté par un point d'entrée
  externe (`monter.ts`), même patron que `CorrectionBoutonAction.svelte`.

  Habillage : ticket 08 (005-mise-en-page-administration). L'étiquette du
  champ reste une balise label nue, sans attribut : SC-05e la repère telle
  quelle dans la source (`tests/integration/regler-lien-video.test.ts`).
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import { afficherPastilleDeBrouillon } from '../pastille-brouillon.ts';
  import { messageErreurCorrection, MESSAGE_ECHEC, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    slug: string;
    idEmplacement: string;
    lienInitial: string;
  }

  const { slug, idEmplacement, lienInitial }: Props = $props();

  let lien = $state(lienInitial);
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);

  // SC-05e — aucun terme de développeur : le motif du refus dit ce qui est
  // attendu (un lien YouTube ou Vimeo), jamais « URL », « hôte » ou
  // « validation ».
  const TEXTES_REFUS: Readonly<Record<string, string>> = {
    'emplacement-non-declare': "Cet emplacement n'existe plus dans la page : rechargez l'écran.",
    'nature-non-corrigible': "Cet emplacement ne se corrige pas comme un lien de vidéo.",
    'forme-invalide': 'Le lien de la vidéo est requis.',
    'lien-invalide':
      "Ce lien n'est pas reconnu : collez un lien YouTube (par exemple https://www.youtube.com/watch?v=… ou https://youtu.be/…) ou Vimeo (par exemple https://vimeo.com/…).",
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
        body: JSON.stringify({ lien }),
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
    <span class="mb-1 block text-sm font-medium text-ink">Lien de la vidéo</span>
    <input
      type="text"
      bind:value={lien}
      required
      class="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm"
    />
  </label>
  <Button type="submit" disabled={enCours} class="w-full max-md:min-h-11 md:w-auto">Enregistrer</Button>
  {#if messageErreur}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
  {/if}
</form>
