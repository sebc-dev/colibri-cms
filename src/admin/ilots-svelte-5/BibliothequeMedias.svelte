<!--
  BibliothequeMedias.svelte — la réserve de l'`Écran : Médias` (ticket 05,
  openspec/changes/004-bibliotheque-de-medias/tickets/05-ecran-medias.md).

  Reçoit `mediasInitiaux` déjà lus côté serveur (`listerMediasBrouillon`,
  `src/platform/medias/magasin.ts`, servies par `medias.astro` en attribut
  `data-*` — même patron que `data-media-ids` des emplacements de galerie et
  de carrousel) : aucun `fetch` de liste au montage, la grille est déjà
  connue (SC-05a). L'état vide de la réserve (SC-05b) et celui, distinct, de
  la recherche sans correspondance (SC-05g) se distinguent par la longueur
  de `mediasInitiaux` d'une part, celle du résultat filtré d'autre part — la
  réserve elle-même n'est jamais mutée par la recherche.

  Chaque vignette est un `<img>` servi par la route déjà livrée au ticket 04
  (`src/pages/admin/medias/[id]/octets.ts`), sur l'origine commune
  (`img-src 'self'`, design.md) : aucun asset ni script tiers. Depuis le
  ticket 07 (openspec/changes/004-bibliotheque-de-medias/tickets/
  07-fiche-renommer-decrire.md), chaque vignette est aussi un lien navigable
  vers `/admin/medias/{id}` — l'`Écran : Fiche d'une image`
  (`src/pages/admin/medias/[id].astro`) — c'est là, et non depuis la grille,
  que l'éditrice renomme et décrit une image.

  Le téléversement poste vers `src/pages/admin/medias/televerser.ts` (ticket
  04, non modifiée ici) — un refus dit le motif (format ou poids, SC-05e) via
  `texteDuRefusTeleversement` (`src/admin/textes.ts`), jamais un terme de
  développeur. Un ajout accepté rejoint la grille sans recharger l'écran : le
  nom d'origine vient du `File` posé par l'éditrice (identique à celui que la
  route persiste), l'identité de la réponse `{ ok: true, id }` — `effacable`
  vaut `true` (ticket 10) : une image tout juste téléversée n'est encore
  posée dans aucun emplacement.

  Ticket 10 du change 004 (openspec/changes/004-bibliotheque-de-medias/
  tickets/10-signaler-images-orphelines.md, SC-10a/b) : chaque vignette
  porte la marque `TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT` (`../textes.ts`)
  quand `media.effacable` (posé côté serveur par `listerMediasBrouillon`,
  `src/platform/medias/magasin.ts`) — jamais un terme de développeur
  (« orpheline », « référence »).

  Ticket 10 du change 005 (openspec/changes/005-mise-en-page-administration/
  tickets/10-medias-habille.md) : l'habillage de cet écran, sans changer un
  seul geste ni un seul texte. Le titre porte la police d'affichage
  (`h1`, Fraunces — couche de base, `admin.css`), le bouton « Téléverser »
  est l'action principale (`Button` par défaut = `plumage`), la recherche
  utilise les composants `Label`/`Input` du registre. Un refus de
  téléversement (SC-10b) et le signalement d'une image orpheline (SC-10f)
  passent par `Alert`/un texte `ambre`, jamais par une couleur littérale
  (`I14`). Sous `md` (768 px, point de rupture unique du change) : l'action
  de téléversement passe en pleine largeur sous le titre, la grille se
  resserre à deux vignettes par rangée (SC-10a), et chaque élément
  actionnable garde une cible d'au moins 44 × 44 px (SC-10e, `max-md:min-h-11`
  sur le bouton « Téléverser » et le champ de recherche — la largeur d'au
  moins 44 px vient de `w-full` sous `md` sur ces deux éléments, pas de
  `min-w-11` — même patron que `src/pages/admin/connexion.astro`, ticket 06).

  La recherche (SC-05f) filtre en mémoire sur le nom d'origine, seul champ
  que ce magasin porte à ce ticket (le nom d'affichage et la description
  existent désormais, ticket 07, mais étendre la recherche à la description
  reste hors périmètre de ce ticket-là — voir `magasin.ts`) — sans index
  dédié, comme le permet design.md.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres îlots.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import { Input } from '../composants/ui/input/index.ts';
  import { Label } from '../composants/ui/label/index.ts';
  import { Alert, AlertDescription } from '../composants/ui/alert/index.ts';
  import VignetteMedia from './VignetteMedia.svelte';
  import type { MediaListe } from '../../platform/medias/magasin.ts';
  import {
    TEXTE_BIBLIOTHEQUE_VIDE,
    TEXTE_BOUTON_TELEVERSER,
    TEXTE_LIBELLE_RECHERCHE_MEDIAS,
    TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT,
    TEXTE_PLACEHOLDER_RECHERCHE_MEDIAS,
    TEXTE_RECHERCHE_MEDIAS_SANS_RESULTAT,
    texteDuRefusTeleversement,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';

  interface Props {
    mediasInitiaux: readonly MediaListe[];
  }

  const { mediasInitiaux }: Props = $props();

  let medias = $state<MediaListe[]>([...mediasInitiaux]);
  let recherche = $state('');
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);
  let entreeFichier: HTMLInputElement | undefined;

  const mediasFiltres = $derived.by(() => {
    const terme = recherche.trim().toLocaleLowerCase('fr');
    if (terme.length === 0) return medias;
    return medias.filter((media) => media.nomOrigine.toLocaleLowerCase('fr').includes(terme));
  });

  interface ReponseTeleversement {
    readonly ok: boolean;
    readonly raison?: string;
    readonly id?: string;
  }

  async function televerser(evenement: Event): Promise<void> {
    const entree = evenement.currentTarget as HTMLInputElement;
    const fichier = entree.files?.item(0);
    if (!fichier) return;

    enCours = true;
    messageErreur = null;
    try {
      const donnees = new FormData();
      donnees.append('fichier', fichier);
      const reponse = await fetch('/admin/medias/televerser', { method: 'POST', body: donnees });
      // Seuls 201 (accepté) et 400 (refus métier) portent un corps JSON —
      // même distinction que `CorrectionBoutonAction.svelte`.
      if (reponse.status !== 201 && reponse.status !== 400) {
        messageErreur = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as ReponseTeleversement;
      if (!resultat.ok || resultat.id === undefined) {
        messageErreur = texteDuRefusTeleversement(resultat.raison);
        return;
      }
      medias = [{ id: resultat.id, nomOrigine: fichier.name, effacable: true }, ...medias];
    } catch {
      messageErreur = MESSAGE_RESEAU;
    } finally {
      enCours = false;
      entree.value = '';
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <h1>Médias</h1>
    <input
      bind:this={entreeFichier}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="sr-only"
      onchange={televerser}
    />
    <Button
      type="button"
      onclick={() => entreeFichier?.click()}
      disabled={enCours}
      class="w-full max-md:min-h-11 md:w-auto"
    >
      {TEXTE_BOUTON_TELEVERSER}
    </Button>
  </div>

  {#if messageErreur}
    <Alert variant="destructive">
      <AlertDescription>{messageErreur}</AlertDescription>
    </Alert>
  {/if}

  <div class="flex flex-col gap-1.5">
    <Label for="recherche-medias">{TEXTE_LIBELLE_RECHERCHE_MEDIAS}</Label>
    <Input
      id="recherche-medias"
      type="search"
      bind:value={recherche}
      placeholder={TEXTE_PLACEHOLDER_RECHERCHE_MEDIAS}
      class="w-full max-w-sm max-md:min-h-11"
    />
  </div>

  {#if medias.length === 0}
    <p>{TEXTE_BIBLIOTHEQUE_VIDE}</p>
  {:else if mediasFiltres.length === 0}
    <p>{TEXTE_RECHERCHE_MEDIAS_SANS_RESULTAT}</p>
  {:else}
    <ul class="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
      {#each mediasFiltres as media (media.id)}
        <li class="flex flex-col gap-2">
          <a href={`/admin/medias/${media.id}`} class="block">
            <VignetteMedia id={media.id} alt={media.nomOrigine} />
          </a>
          {#if media.effacable}
            <p class="rounded-md bg-ambre-soft px-2 py-1 text-xs text-ambre">
              {TEXTE_MARQUE_IMAGE_VOUEE_EFFACEMENT}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
