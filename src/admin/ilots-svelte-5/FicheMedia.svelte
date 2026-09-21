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

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres îlots.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import type { MediaFiche } from '../../platform/medias/magasin.ts';
  import {
    TEXTE_LIEN_RETOUR_MEDIAS,
    TEXTE_LIBELLE_NOM_AFFICHAGE,
    TEXTE_LIBELLE_DESCRIPTION,
    TEXTE_BOUTON_ENREGISTRER,
    TEXTE_REFUS_NOM_VIDE,
    TEXTE_ECHEC_ENREGISTREMENT_FICHE,
    TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    media: MediaFiche;
  }

  const { media }: Props = $props();

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

<div class="flex flex-col gap-6">
  <p>
    <a href="/admin/medias" class="text-sm text-muted-foreground hover:underline">‹ {TEXTE_LIEN_RETOUR_MEDIAS}</a>
  </p>

  {#if media.effacable}
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
</div>
