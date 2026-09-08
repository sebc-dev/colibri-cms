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
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import { afficherPastilleDeBrouillon } from '../pastille-brouillon.ts';

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
      const resultat = (await reponse.json()) as ReponseCorrection;
      if (!resultat.ok) {
        messageErreur = TEXTES_REFUS[resultat.raison ?? ''] ?? "La correction n'a pas pu être enregistrée.";
        return;
      }
      afficherPastilleDeBrouillon();
    } catch {
      messageErreur = "La correction n'a pas pu être enregistrée : vérifiez la connexion et réessayez.";
    } finally {
      enCours = false;
    }
  }
</script>

<form onsubmit={enregistrer}>
  <label>
    Lien de la vidéo
    <input type="text" bind:value={lien} required />
  </label>
  <Button type="submit" disabled={enCours}>Enregistrer</Button>
  {#if messageErreur}
    <p role="alert">{messageErreur}</p>
  {/if}
</form>
