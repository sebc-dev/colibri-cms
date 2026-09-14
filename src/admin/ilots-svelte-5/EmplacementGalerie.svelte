<!--
  EmplacementGalerie.svelte — la présentation d'un emplacement de galerie
  dans l'`Écran : Éditeur de page` (ticket 06,
  openspec/changes/004-bibliotheque-de-medias/tickets/
  06-editeur-presente-natures-image.md, SC-06a/b).

  PRÉSENTATION SEULE : montre le nombre d'images qui composent la galerie,
  sans le moindre moyen d'en ajouter, d'en retirer ou de les réordonner
  (SC-06c) — la composition vient avec sa pose (ticket 09). `mediaIds` porte
  les identités stables des images posées, dans l'ordre déjà lu par
  `core/pages/declaration.ts` et posées par le serveur en attribut `data-*`
  (`monter.ts`, sérialisées en JSON) : ce composant ne relit ni ne requiert
  rien de plus, aucun `fetch`. Aucun terme de développeur (SC-06d) : les
  identités elles-mêmes ne sont jamais affichées, seul leur compte l'est.

  Aucune directive `client:*` (ADR-0006) : monté par le point d'entrée
  externe `monter.ts`, même patron que les autres présentations
  d'emplacement.
-->
<script lang="ts">
  import type { EmplacementGalerie } from '../../core/pages/declaration.ts';
  import { libelleCompteImages } from './libelle-compte-images.ts';

  /** Les props sont le contenu courant lu par `core`, rien de plus. */
  type Props = Pick<EmplacementGalerie, 'mediaIds'>;

  const { mediaIds }: Props = $props();
</script>

<div>
  <p>{libelleCompteImages(mediaIds.length, 'galerie')}</p>
</div>
