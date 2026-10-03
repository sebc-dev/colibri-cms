<!--
  EmplacementComposition.svelte — composer un emplacement de galerie ou de
  carrousel dans l'`Écran : Éditeur de page` (ticket 09,
  openspec/changes/004-bibliotheque-de-medias/tickets/
  09-composer-galerie-carrousel.md, SC-09a/b).

  Un seul îlot pour les deux natures : la composition (ajouter, réordonner,
  retirer, remplacement en bloc de `mediaIds`) est la même, seule la nature
  déclarée change deux libellés — le compte d'images et le motif de refus
  « nature-non-corrigible ». Il remplace EmplacementGalerie.svelte et
  EmplacementCarrousel.svelte (ticket 06, présentation seule).

  Ticket 06 (openspec/changes/004-bibliotheque-de-medias/tickets/
  06-editeur-presente-natures-image.md) posait ici une PRÉSENTATION SEULE,
  sans moyen de composer la galerie. Ce ticket y ajoute la composition, même
  patron que `EmplacementImage.svelte` (ticket 08) : un bouton ouvre la
  réserve déjà connue (`mediasInitiaux`, lue côté serveur par
  `listerMediasBrouillon`, `src/platform/medias/magasin.ts`, servie par
  `[slug].astro` en attribut `data-*`) ; choisir une vignette AJOUTE cette
  image à l'ensemble ; chaque image déjà composée porte deux boutons de
  déplacement (monter/descendre) et un bouton de retrait. Chacun de ces
  gestes REMPLACE en bloc `mediaIds` par un POST `{ mediaIds: [...] }` vers
  la route générique d'écriture (`src/pages/admin/pages/[slug]/
  emplacements/[id].ts`), authentifiée par le seul cookie de session
  `SameSite=Strict` (ADR-0011) — jamais un ajout/retrait incrémental côté
  serveur : c'est ce remplacement en bloc qui rend le geste « contenu,
  jamais structure » (FR-024/025, SC-09b). Aucun octet n'est relu ni
  retéléversé ici : chaque image est référencée par son identité seule
  (`mediaId`).

  Après un geste accepté, révèle la pastille de brouillon du fil de retour
  sans recharger l'écran (`afficherPastilleDeBrouillon`, même geste que
  `EmplacementImage.svelte`) ; un refus (structure, forme) affiche le motif
  à l'écran, sans terme de développeur (FR-117), sans que rien n'ait été
  enregistré.

  Le glisser-déposer visuel et l'agencement de la grille restent hors de ce
  qu'un test automatisé prouve (plan de test, humanCheckRequired) : le
  réordonnancement est offert ici par deux boutons (monter/descendre), un
  moyen suffisant et observable pour satisfaire SC-09b sans dépendre d'une
  interaction souris.

  Monté sans directive `client:*` (ADR-0006) par `monter.ts`, qui lui passe
  la nature déclarée en plus de l'ensemble initial et de la réserve.

  Habillage : ticket 09 (005-mise-en-page-administration, SC-09a à SC-09f).
  Aucun geste ne change (même route, même remplacement en bloc, mêmes
  textes de refus et de compte d'images) — seule la présentation :
  - Les vignettes déjà composées et les vignettes de la réserve utilisent
    toutes `VignetteMedia.svelte`, tel qu'habillé par le ticket 10, sans le
    modifier ici.
  - « Monter »/« Descendre »/« Retirer » et « Ajouter une image » offrent
    chacun une cible d'au moins 44 × 44 px sur écran étroit
    (`max-md:min-h-11 max-md:min-w-11`, SC-09e).
  - La réserve d'ajout s'ouvre dans une vraie boîte de dialogue (`Dialog`,
    `bits-ui`, ADR-0009), même patron que `EmplacementImage.svelte` : en-tête
    non déroulant (titre + bouton de fermeture, toujours visible, SC-09b) et
    corps déroulant seul (`overflow-y-auto`), largeur pleine moins 16 px de
    chaque côté sous `sm` (`w-[calc(100%-2rem)]`, SC-09b), deux vignettes par
    rangée sur écran étroit (`grid-cols-2`). Animations sous `motion-safe:`
    (SC-09c).
  - Un refus s'affiche en `danger` (`bg-danger-soft`/`text-danger`, SC-09d) :
    dans la carte, hors sur-couche, pour monter/descendre/retirer (gestes
    qui n'ouvrent jamais la sur-couche) ; dans le corps de la sur-couche
    (même geste, même texte) pour un ajout refusé, le temps qu'elle reste
    ouverte — ajouter ne ferme la sur-couche que sur un succès (aucun geste
    ne change).
  - Tokens seuls (`I14`) ; noms rendus échappés (interpolation Svelte,
    jamais `{@html}`).
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import SurCoucheChoixImage from './SurCoucheChoixImage.svelte';
  import type { MediaListe } from '../../platform/medias/magasin.ts';
  import { afficherPastilleDeBrouillon } from '../pastille-brouillon.ts';
  import { soumettreCorrection } from './soumettre-correction.ts';
  import VignetteMedia from './VignetteMedia.svelte';
  import { libelleCompteImages } from './libelle-compte-images.ts';

  interface Props {
    slug: string;
    idEmplacement: string;
    mediaIdsInitial: readonly string[];
    mediasInitiaux: readonly MediaListe[];
    nature: 'galerie' | 'carrousel';
  }

  const { slug, idEmplacement, mediaIdsInitial, mediasInitiaux, nature }: Props = $props();

  let mediaIds = $state<string[]>([...mediaIdsInitial]);
  let ouvert = $state(false);
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);

  // SC-09b — aucun terme de développeur : le motif du refus dit ce qui
  // manque, jamais « ID », « payload » ou « requête ».
  const TEXTES_REFUS: Readonly<Record<string, string>> = {
    'nature-non-corrigible':
      nature === 'galerie'
        ? 'Cet emplacement ne se corrige pas comme une galerie.'
        : 'Cet emplacement ne se corrige pas comme un carrousel.',
    'forme-invalide': 'Choisissez des images dans la bibliothèque.',
  };

  const mediasDisponibles = $derived(mediasInitiaux.filter((media) => !mediaIds.includes(media.id)));

  function nomDe(idMedia: string): string {
    return mediasInitiaux.find((media) => media.id === idMedia)?.nomAffichage ?? idMedia;
  }

  /**
   * Remplace en bloc l'ensemble ordonné, jamais un diff incrémental
   * (FR-024/025, SC-09b) — le patron commun aux trois gestes (ajouter,
   * réordonner, retirer) ci-dessous.
   */
  async function enregistrer(nouveauxMediaIds: readonly string[]): Promise<boolean> {
    enCours = true;
    messageErreur = null;
    const issue = await soumettreCorrection(`/admin/pages/${slug}/emplacements/${idEmplacement}`, { mediaIds: nouveauxMediaIds }, TEXTES_REFUS);
    enCours = false;
    if (!issue.ok) {
      messageErreur = issue.message;
      return false;
    }
    mediaIds = [...nouveauxMediaIds];
    afficherPastilleDeBrouillon();
    return true;
  }

  async function ajouter(idMedia: string): Promise<void> {
    const accepte = await enregistrer([...mediaIds, idMedia]);
    if (accepte) ouvert = false;
  }

  async function retirer(index: number): Promise<void> {
    await enregistrer(mediaIds.filter((_, position) => position !== index));
  }

  async function monter(index: number): Promise<void> {
    if (index <= 0) return;
    const nouveaux = [...mediaIds];
    [nouveaux[index - 1], nouveaux[index]] = [nouveaux[index], nouveaux[index - 1]];
    await enregistrer(nouveaux);
  }

  async function descendre(index: number): Promise<void> {
    if (index >= mediaIds.length - 1) return;
    const nouveaux = [...mediaIds];
    [nouveaux[index], nouveaux[index + 1]] = [nouveaux[index + 1], nouveaux[index]];
    await enregistrer(nouveaux);
  }
</script>

<div class="flex flex-col gap-3">
  <p class="text-sm text-ink-muted">{libelleCompteImages(mediaIds.length, nature)}</p>

  {#if messageErreur && !ouvert}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
  {/if}

  {#if mediaIds.length > 0}
    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {#each mediaIds as idMedia, index (idMedia + String(index))}
        <li class="flex flex-col gap-2">
          <VignetteMedia id={idMedia} alt={nomDe(idMedia)} />
          <div class="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={() => monter(index)}
              disabled={enCours || index === 0}
              aria-label={`Monter l'image ${nomDe(idMedia)}`}
              class="max-md:min-h-11 max-md:min-w-11"
            >
              Monter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={() => descendre(index)}
              disabled={enCours || index === mediaIds.length - 1}
              aria-label={`Descendre l'image ${nomDe(idMedia)}`}
              class="max-md:min-h-11 max-md:min-w-11"
            >
              Descendre
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={() => retirer(index)}
              disabled={enCours}
              aria-label={`Retirer l'image ${nomDe(idMedia)}`}
              class="max-md:min-h-11 max-md:min-w-11"
            >
              Retirer
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div>
    <Button
      type="button"
      onclick={() => (ouvert = true)}
      disabled={enCours}
      class="w-full max-md:min-h-11 md:w-auto"
    >
      Ajouter une image
    </Button>
  </div>

  <SurCoucheChoixImage
    bind:ouvert
    titre="Ajouter une image"
    medias={mediasDisponibles}
    messageVide="La bibliothèque ne contient aucune autre image à ajouter."
    libelleChoix={(nom) => `Ajouter l'image ${nom}`}
    onChoisir={ajouter}
    {enCours}
    {messageErreur}
  />
</div>
