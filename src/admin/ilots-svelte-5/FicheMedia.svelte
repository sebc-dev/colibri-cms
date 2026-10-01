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

  Ticket 11 — habillage (openspec/changes/005-mise-en-page-administration/
  tickets/11-fiche-image-habillee.md, SC-11a à SC-11f) : le contenu prend le
  thème Colibri, sans toucher un seul geste ni un seul texte ci-dessus.
  - Composants de base (`src/admin/composants/ui/`, disponibles depuis le
    ticket 02) : `Input`/`Label`/`Textarea` pour les deux champs, `Button`
    (déjà en place) pour les actions, `Alert` pour le bandeau d'image vouée
    à l'effacement (design.md § Décisions — remplace le `<p role="status">`
    maison, même texte).
  - Disposition (SC-11c/d) : à partir de `md` (768 px, design.md D8), la
    prévisualisation est à gauche (le reste de la largeur, bornée à
    `max-w-xl`) et une colonne de 320 px (`md:w-80`, jamais `flex-1` : sa
    base nulle écraserait la largeur à 0) porte les champs, les
    emplacements et la suppression — bouton `danger` en contour
    (`border-destructive`) ; sous `md`, tout reste sur une seule colonne,
    dans cet ordre.
  - Sur-couche de suppression (SC-11a/b) : la confirmation ex-`<div
    role="alertdialog">` maison devient `Dialog` (`bits-ui`, ADR-0009) —
    en-tête non déroulant (titre + bouton de fermeture, toujours visible)
    et corps déroulant (`overflow-y-auto`) qui REPREND la même liste des
    emplacements, hauteur bornée à l'écran (`max-h-[calc(100dvh-2rem)]`),
    largeur pleine moins 16 px de chaque côté sous `sm`
    (`w-[calc(100%-2rem)]`, même formule que `dialog-content.svelte`).
    Animations sous `motion-safe:` (design.md D8) : sans mouvement quand
    l'appareil demande de réduire les animations.
  - Cibles tactiles (SC-11e) : `max-md:min-h-11 max-md:min-w-11` sur chaque
    élément actionnable (lien de retour, boutons, bouton de fermeture de la
    sur-couche) — même patron que `connexion.astro` (ticket 06).
  - Tokens seulement (`I14`) : aucune couleur littérale, uniquement les
    alias `bg-*`/`text-*`/`border-*` de `src/admin/admin.css`. Nom et
    description restent interpolés (jamais `{@html}`), donc toujours
    échappés.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres îlots.
-->
<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '../composants/ui/button/index.ts';
  import { Input } from '../composants/ui/input/index.ts';
  import { Label } from '../composants/ui/label/index.ts';
  import { Textarea } from '../composants/ui/textarea/index.ts';
  import { Alert, AlertDescription } from '../composants/ui/alert/index.ts';
  import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogClose } from '../composants/ui/dialog/index.ts';
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

  // `nom` est le nom enregistré (titre, texte de remplacement, confirmation) ;
  // `nomSaisi` est le champ. Liés au même état, un nom vidé puis refusé
  // vidait aussi le titre (recette, remarque 11.3).
  let nom = $state(media.nomAffichage);
  let nomSaisi = $state(media.nomAffichage);
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
    const valeur = nomSaisi.trim();
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
      nomSaisi = valeur;
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
    <p class="text-sm break-words">{TEXTE_POSEE_NULLE_PART}</p>
  {:else}
    <ul class="list-disc break-words pl-5 text-sm">
      {#each emplacementsAffiches as emplacement (emplacement.pageTitre + emplacement.place)}
        <li>{emplacement.pageTitre} — {emplacement.place}</li>
      {/each}
    </ul>
  {/if}
{/snippet}

<div class="flex flex-col gap-6">
  <p>
    <a
      href="/admin/medias"
      class="inline-flex items-center text-sm text-muted-foreground hover:underline max-md:min-h-11"
    >
      ‹ {TEXTE_LIEN_RETOUR_MEDIAS}
    </a>
  </p>

  <h1 class="break-words">{nom}</h1>

  {#if effacable}
    <Alert variant="destructive" class="border-transparent">
      <AlertDescription>{TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT}</AlertDescription>
    </Alert>
  {/if}

  <div class="flex flex-col gap-8 md:flex-row md:items-start">
    <img
      src={`/admin/medias/${media.id}/octets`}
      alt={nom}
      class="aspect-square w-full min-w-0 rounded-lg border border-border object-cover md:max-w-xl md:flex-1"
    />

    <div class="flex min-w-0 flex-col gap-6 md:w-80 md:shrink-0">
      <form class="flex flex-col gap-1.5" onsubmit={enregistrerNom}>
        <Label for="fiche-media-nom">{TEXTE_LIBELLE_NOM_AFFICHAGE}</Label>
        <Input id="fiche-media-nom" type="text" bind:value={nomSaisi} class="max-md:min-h-11" />
        <div>
          <Button type="submit" disabled={enCoursNom} class="max-md:min-h-11 max-md:min-w-11">
            {TEXTE_BOUTON_ENREGISTRER}
          </Button>
        </div>
        {#if erreurNom}
          <p role="alert" class="text-sm text-destructive">{erreurNom}</p>
        {/if}
      </form>

      <form class="flex flex-col gap-1.5" onsubmit={enregistrerDescription}>
        <Label for="fiche-media-description">{TEXTE_LIBELLE_DESCRIPTION}</Label>
        <Textarea id="fiche-media-description" bind:value={description} rows={4} />
        <div>
          <Button type="submit" disabled={enCoursDescription} class="max-md:min-h-11 max-md:min-w-11">
            {TEXTE_BOUTON_ENREGISTRER}
          </Button>
        </div>
        {#if erreurDescription}
          <p role="alert" class="text-sm text-destructive">{erreurDescription}</p>
        {/if}
      </form>

      <div class="flex flex-col gap-2">
        <h2 class="text-sm font-medium">{TEXTE_TITRE_POSEE_DANS}</h2>
        {@render listeEmplacements()}
      </div>

      <div>
        <Button
          type="button"
          variant="destructive"
          onclick={ouvrirConfirmation}
          class="border-destructive max-md:min-h-11 max-md:min-w-11"
        >
          {TEXTE_BOUTON_SUPPRIMER_MEDIA}
        </Button>
      </div>
    </div>
  </div>

  {#if confirmationOuverte}
    <Dialog bind:open={confirmationOuverte}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          class="bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr] gap-4 rounded-xl p-4 text-sm ring-1 outline-none motion-safe:duration-100 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95"
        >
          <div class="flex items-start justify-between gap-4">
            <DialogTitle class="break-words font-display text-base font-semibold">
              {texteConfirmationSuppression(nom)}
            </DialogTitle>
            <DialogClose>
              {#snippet child({ props })}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={enCoursSuppression}
                  class="max-md:min-h-11 max-md:min-w-11 shrink-0"
                  {...props}
                >
                  <XIcon />
                  <span class="sr-only">{TEXTE_BOUTON_ANNULER_SUPPRESSION}</span>
                </Button>
              {/snippet}
            </DialogClose>
          </div>
          <div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
            {#if emplacementsAffiches.length > 0}
              <p class="break-words">{TEXTE_INTRO_EMPLACEMENTS_CONFIRMATION}</p>
            {/if}
            {@render listeEmplacements()}
            {#if erreurSuppression}
              <p role="alert" class="text-sm text-destructive">{erreurSuppression}</p>
            {/if}
            <div class="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onclick={annulerSuppression}
                disabled={enCoursSuppression}
                class="max-md:min-h-11 max-md:min-w-11"
              >
                {TEXTE_BOUTON_ANNULER_SUPPRESSION}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onclick={confirmerSuppression}
                disabled={enCoursSuppression}
                class="max-md:min-h-11 max-md:min-w-11"
              >
                {TEXTE_BOUTON_CONFIRMER_SUPPRESSION}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  {/if}
</div>
