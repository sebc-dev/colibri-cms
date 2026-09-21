<!--
  FicheMedia.svelte — la fiche d'une image (ticket 07,
  openspec/changes/004-bibliotheque-de-medias/tickets/07-fiche-renommer-decrire.md,
  SC-07a/SC-07b/SC-07c).

  Reçoit la fiche déjà lue côté serveur (`obtenirFicheMediaBrouillon`,
  `src/platform/medias/magasin.ts`, servie par `src/pages/admin/medias/
  [id].astro` en attribut `data-media`) : aucun `fetch` de lecture au
  montage, même patron que `mediasInitiaux` de `BibliothequeMedias.svelte`.

  L'aperçu est le même `<img>` que la grille, servi par la route déjà livrée
  au ticket 04 (`src/pages/admin/medias/[id]/octets.ts`), sur l'origine
  commune (`img-src 'self'`).

  Renommer poste vers `src/pages/admin/medias/[id]/renommer.ts` (ticket 07)
  — le nom d'origine n'est jamais montré comme éditable (SC-07a, il n'est
  d'ailleurs même pas transmis à cet îlot). Décrire poste vers `src/pages/
  admin/medias/[id]/decrire.ts` — chaque champ a son propre bouton
  d'enregistrement et son propre état d'erreur : renommer sans décrire (et
  réciproquement) n'écrit qu'un seul champ, jamais les deux (le corps de
  chaque route ne porte que le sien).

  Aucun terme de développeur nulle part sur cette fiche (SC-07c) : ni
  « brouillon », ni « ID », ni rien qui évoque l'implémentation — les seuls
  textes viennent de `../textes.ts`.

  Ticket 10 (openspec/changes/004-bibliotheque-de-medias/tickets/
  10-signaler-images-orphelines.md, SC-10a/b, UX5) : un bandeau signale
  l'image quand `media.effacable` (posé côté serveur par
  `obtenirFicheMediaBrouillon`, `src/platform/medias/magasin.ts`), sans
  terme de développeur — même texte, `TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT`,
  que la marque de la grille (`BibliothequeMedias.svelte`).

  Ticket 11 (openspec/changes/004-bibliotheque-de-medias/tickets/
  11-ou-posee-et-supprimer.md, SC-11a/b/c/d/e/f) : `emplacements` (déjà
  composée côté serveur par `src/pages/admin/medias/[id].astro`, jamais
  relue ici) liste les emplacements qui posent l'image — désignés par leur
  page et leur place (SC-11a), ou l'état « posée nulle part » quand le
  tableau est vide (SC-11b). Le bouton « Supprimer… » ouvre une
  confirmation qui REPREND cette même liste (SC-11c, aucune seconde lecture)
  avant de poster vers `src/pages/admin/medias/[id]/supprimer.ts`, qui
  retire l'image de tous ses emplacements à la fois (SC-11d) ; elle devient
  orpheline, vouée à l'effacement à la publication ; une image posée dans
  aucun emplacement ne touche aucun brouillon (SC-11e). Aucun terme de
  développeur nulle part (SC-11f) : les seuls textes viennent, comme le
  reste de cette fiche, de `../textes.ts`.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres îlots.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import type { MediaFiche } from '../../platform/medias/magasin.ts';
  import type { EmplacementOuPoseeMedia } from './emplacements-media.ts';
  import {
    TEXTE_LIEN_RETOUR_MEDIAS,
    TEXTE_LIBELLE_NOM_AFFICHAGE,
    TEXTE_LIBELLE_DESCRIPTION,
    TEXTE_BOUTON_ENREGISTRER,
    TEXTE_REFUS_NOM_VIDE,
    TEXTE_ECHEC_ENREGISTREMENT_FICHE,
    TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT,
    TEXTE_TITRE_POSEE_DANS,
    TEXTE_POSEE_NULLE_PART,
    TEXTE_BOUTON_SUPPRIMER_MEDIA,
    texteConfirmationSuppression,
    TEXTE_INTRO_EMPLACEMENTS_CONFIRMATION,
    TEXTE_BOUTON_ANNULER_SUPPRESSION,
    TEXTE_BOUTON_CONFIRMER_SUPPRESSION,
    TEXTE_ECHEC_SUPPRESSION,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    media: MediaFiche;
    emplacements: readonly EmplacementOuPoseeMedia[];
  }

  const { media, emplacements }: Props = $props();

  let retiree = $state(false);
  const emplacementsAffiches = $derived(retiree ? [] : emplacements);
  const effacable = $derived(retiree || media.effacable);

  let nom = $state(media.nomAffichage);
  let description = $state(media.description);

  let enCoursNom = $state(false);
  let erreurNom = $state<string | null>(null);

  let enCoursDescription = $state(false);
  let erreurDescription = $state<string | null>(null);

  interface ReponseEcritureFiche {
    readonly ok: boolean;
    readonly raison?: string;
  }

  let confirmationOuverte = $state(false);
  let enCoursSuppression = $state(false);
  let erreurSuppression = $state<string | null>(null);

  function ouvrirConfirmation(): void {
    erreurSuppression = null;
    confirmationOuverte = true;
  }

  function annulerSuppression(): void {
    confirmationOuverte = false;
  }

  async function confirmerSuppression(): Promise<void> {
    enCoursSuppression = true;
    erreurSuppression = null;
    try {
      const reponse = await fetch(`/admin/medias/${media.id}/supprimer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (reponse.status !== 200) {
        erreurSuppression = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as ReponseEcritureFiche;
      if (!resultat.ok) {
        erreurSuppression = TEXTE_ECHEC_SUPPRESSION;
        return;
      }
      confirmationOuverte = false;
      retiree = true;
    } catch {
      erreurSuppression = MESSAGE_RESEAU;
    } finally {
      enCoursSuppression = false;
    }
  }

  async function enregistrerNom(evenement: SubmitEvent): Promise<void> {
    evenement.preventDefault();
    const valeur = nom.trim();
    if (valeur.length === 0) {
      erreurNom = TEXTE_REFUS_NOM_VIDE;
      return;
    }
    enCoursNom = true;
    erreurNom = null;
    try {
      const reponse = await fetch(`/admin/medias/${media.id}/renommer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nom: valeur }),
      });
      if (reponse.status !== 200 && reponse.status !== 400) {
        erreurNom = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as ReponseEcritureFiche;
      if (!resultat.ok) {
        erreurNom = resultat.raison === 'forme-invalide' ? TEXTE_REFUS_NOM_VIDE : TEXTE_ECHEC_ENREGISTREMENT_FICHE;
        return;
      }
      nom = valeur;
    } catch {
      erreurNom = MESSAGE_RESEAU;
    } finally {
      enCoursNom = false;
    }
  }

  async function enregistrerDescription(evenement: SubmitEvent): Promise<void> {
    evenement.preventDefault();
    enCoursDescription = true;
    erreurDescription = null;
    try {
      const reponse = await fetch(`/admin/medias/${media.id}/decrire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (reponse.status !== 200 && reponse.status !== 400) {
        erreurDescription = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as ReponseEcritureFiche;
      if (!resultat.ok) {
        erreurDescription = TEXTE_ECHEC_ENREGISTREMENT_FICHE;
        return;
      }
    } catch {
      erreurDescription = MESSAGE_RESEAU;
    } finally {
      enCoursDescription = false;
    }
  }
</script>

{#snippet listeEmplacements()}
  {#if emplacementsAffiches.length === 0}
    <p>{TEXTE_POSEE_NULLE_PART}</p>
  {:else}
    <ul class="list-disc pl-5 text-sm">
      {#each emplacementsAffiches as emplacement (emplacement.pageTitre + emplacement.place)}
        <li>{emplacement.pageTitre} — {emplacement.place}</li>
      {/each}
    </ul>
  {/if}
{/snippet}

<div class="flex flex-col gap-6">
  <p>
    <a href="/admin/medias" class="text-sm text-muted-foreground hover:underline">‹ {TEXTE_LIEN_RETOUR_MEDIAS}</a>
  </p>

  {#if effacable}
    <p role="status" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT}
    </p>
  {/if}

  <div class="flex flex-col gap-6 sm:flex-row">
    <img
      src={`/admin/medias/${media.id}/octets`}
      alt={nom}
      class="aspect-square w-40 shrink-0 rounded-lg border border-border object-cover"
    />

    <div class="flex flex-1 flex-col gap-6">
      <form class="flex flex-col gap-1" onsubmit={enregistrerNom}>
        <label class="flex flex-col gap-1 text-sm" for="fiche-media-nom">
          <span>{TEXTE_LIBELLE_NOM_AFFICHAGE}</span>
          <input
            id="fiche-media-nom"
            type="text"
            bind:value={nom}
            class="w-full max-w-sm rounded-lg border border-input px-3 py-2 text-sm"
          />
        </label>
        <div>
          <Button type="submit" disabled={enCoursNom}>{TEXTE_BOUTON_ENREGISTRER}</Button>
        </div>
        {#if erreurNom}
          <p role="alert">{erreurNom}</p>
        {/if}
      </form>

      <form class="flex flex-col gap-1" onsubmit={enregistrerDescription}>
        <label class="flex flex-col gap-1 text-sm" for="fiche-media-description">
          <span>{TEXTE_LIBELLE_DESCRIPTION}</span>
          <textarea
            id="fiche-media-description"
            bind:value={description}
            rows="4"
            class="w-full max-w-sm rounded-lg border border-input px-3 py-2 text-sm"
          ></textarea>
        </label>
        <div>
          <Button type="submit" disabled={enCoursDescription}>{TEXTE_BOUTON_ENREGISTRER}</Button>
        </div>
        {#if erreurDescription}
          <p role="alert">{erreurDescription}</p>
        {/if}
      </form>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="text-sm font-medium">{TEXTE_TITRE_POSEE_DANS}</h2>
    {@render listeEmplacements()}
  </div>

  <div>
    <Button type="button" variant="destructive" onclick={ouvrirConfirmation}>{TEXTE_BOUTON_SUPPRIMER_MEDIA}</Button>
  </div>

  {#if confirmationOuverte}
    <div role="alertdialog" aria-label={texteConfirmationSuppression(nom)} class="flex flex-col gap-3 rounded-lg border border-border p-4">
      <p class="font-medium">{texteConfirmationSuppression(nom)}</p>
      {#if emplacementsAffiches.length > 0}
        <p>{TEXTE_INTRO_EMPLACEMENTS_CONFIRMATION}</p>
      {/if}
      {@render listeEmplacements()}
      {#if erreurSuppression}
        <p role="alert">{erreurSuppression}</p>
      {/if}
      <div class="flex gap-2">
        <Button type="button" variant="outline" onclick={annulerSuppression} disabled={enCoursSuppression}>
          {TEXTE_BOUTON_ANNULER_SUPPRESSION}
        </Button>
        <Button type="button" variant="destructive" onclick={confirmerSuppression} disabled={enCoursSuppression}>
          {TEXTE_BOUTON_CONFIRMER_SUPPRESSION}
        </Button>
      </div>
    </div>
  {/if}
</div>
