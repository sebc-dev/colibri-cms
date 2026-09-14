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
  (`img-src 'self'`, design.md) : aucun asset ni script tiers.

  Le téléversement poste vers `src/pages/admin/medias/televerser.ts` (ticket
  04, non modifiée ici) — un refus dit le motif (format ou poids, SC-05e) via
  `texteDuRefusTeleversement` (`src/admin/textes.ts`), jamais un terme de
  développeur. Un ajout accepté rejoint la grille sans recharger l'écran : le
  nom d'origine vient du `File` posé par l'éditrice (identique à celui que la
  route persiste), l'identité de la réponse `{ ok: true, id }`.

  La recherche (SC-05f) filtre en mémoire sur le nom d'origine, seul champ
  que ce magasin porte à ce ticket (le nom d'affichage et la description
  arrivent au ticket 07) — sans index dédié, comme le permet design.md.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres îlots.
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import type { MediaListe } from '../../platform/medias/magasin.ts';
  import {
    TEXTE_BIBLIOTHEQUE_VIDE,
    TEXTE_BOUTON_TELEVERSER,
    TEXTE_LIBELLE_RECHERCHE_MEDIAS,
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
      medias = [{ id: resultat.id, nomOrigine: fichier.name }, ...medias];
    } catch {
      messageErreur = MESSAGE_RESEAU;
    } finally {
      enCours = false;
      entree.value = '';
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between gap-4">
    <h1 class="text-xl font-semibold">Médias</h1>
    <input
      bind:this={entreeFichier}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="sr-only"
      onchange={televerser}
    />
    <Button type="button" onclick={() => entreeFichier?.click()} disabled={enCours}>
      {TEXTE_BOUTON_TELEVERSER}
    </Button>
  </div>

  <label class="flex flex-col gap-1 text-sm">
    <span>{TEXTE_LIBELLE_RECHERCHE_MEDIAS}</span>
    <input
      type="search"
      bind:value={recherche}
      placeholder={TEXTE_PLACEHOLDER_RECHERCHE_MEDIAS}
      class="w-full max-w-sm rounded-lg border border-input px-3 py-2 text-sm"
    />
  </label>

  {#if messageErreur}
    <p role="alert">{messageErreur}</p>
  {/if}

  {#if medias.length === 0}
    <p>{TEXTE_BIBLIOTHEQUE_VIDE}</p>
  {:else if mediasFiltres.length === 0}
    <p>{TEXTE_RECHERCHE_MEDIAS_SANS_RESULTAT}</p>
  {:else}
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
      {#each mediasFiltres as media (media.id)}
        <li class="overflow-hidden rounded-lg border border-border bg-card">
          <img
            src={`/admin/medias/${media.id}/octets`}
            alt={media.nomOrigine}
            loading="lazy"
            class="aspect-square w-full object-cover"
          />
        </li>
      {/each}
    </ul>
  {/if}
</div>
