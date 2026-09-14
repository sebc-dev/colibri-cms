<!--
  Cadre.svelte — le cadre commun à tous les écrans d'administration (ticket
  01, specs/003-remplir-emplacements/01-cadre-administration.md).

  Un unique îlot d'administration monté en application (SPEC.md § Décisions
  d'implémentation) : la barre latérale et son menu vivent ici, dans ce même
  composant, pas dans une hydratation par page. « Mes pages » portait, à ce
  ticket, le seul `href` : elle menait par un vrai lien navigable à
  l'`Écran : Liste des pages` (ticket 02, SC-02e) — les quatre autres
  (Médias, Réglages, Formulaires, Demandes) ne menaient à aucun écran servi :
  elles étaient rendues sans lien ni bouton, rien qui « offre » un geste de
  navigation vers elles (C5). « Médias » a rejoint « Mes pages » au ticket 05
  (voir plus bas) ; Réglages, Formulaires et Demandes restent sans `href`
  tant qu'aucun ticket ne leur sert d'écran. Aucun geste d'ajout, de retrait,
  de déplacement ni de renommage de rubrique n'est offert par ce menu.

  L'état replié/déployé est une préférence retenue sur l'appareil (UX-2,
  `localStorage`) : jamais une requête serveur (C4). Aucun bloc `<style>` :
  les styles viennent des utilitaires Tailwind posés par `admin.css`
  (ADR-0008 — `style-src 'self'` sans `unsafe-inline`).

  Ticket 05 (openspec/changes/004-bibliotheque-de-medias/tickets/
  05-ecran-medias.md, SC-05c) : « Médias » sert désormais un écran
  (`/admin/medias`), donc porte à son tour un `href` — même exigence de lien
  navigable que « Mes pages » ci-dessus, plus la même rubrique ne peut être
  active sur deux écrans distincts : `rubriqueActive` (prop, par défaut
  `'mes-pages'` pour ne rien changer aux écrans déjà servis) dit laquelle des
  deux l'est ici.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Files from '@lucide/svelte/icons/files';
  import Image from '@lucide/svelte/icons/image';
  import Settings from '@lucide/svelte/icons/settings';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import Mail from '@lucide/svelte/icons/mail';
  import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
  import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';

  type IdRubriqueServie = 'mes-pages' | 'medias';

  interface Props {
    children?: Snippet;
    rubriqueActive?: IdRubriqueServie;
  }

  const { children, rubriqueActive = 'mes-pages' }: Props = $props();

  /**
   * Rubriques servies, chacune menant à son écran par un vrai lien navigable
   * (`href`, ticket 02 SC-02e, arbitrage du chantier
   * docs/chantiers/en-cours/2026-09-07-run-liste-des-pages-02.md, point 2 :
   * « menant à cet écran » exige un lien, pas seulement une mise en évidence
   * visuelle). Les trois autres rubriques n'ont pas de `href` : elles ne
   * mènent à aucun écran servi, rien qui « offre » un geste de navigation
   * vers elles (hors-périmètre, C5).
   */
  const RUBRIQUES = [
    { id: 'mes-pages', libelle: 'Mes pages', icone: Files, href: '/admin/mes-pages' },
    { id: 'medias', libelle: 'Médias', icone: Image, href: '/admin/medias' },
    { id: 'reglages', libelle: 'Réglages', icone: Settings, href: null },
    { id: 'formulaires', libelle: 'Formulaires', icone: ClipboardList, href: null },
    { id: 'demandes', libelle: 'Demandes', icone: Mail, href: null },
  ] as const;

  const CLE_STOCKAGE = 'admin.cadre.replie';

  function lireEtatInitial(): boolean {
    try {
      return window.localStorage.getItem(CLE_STOCKAGE) === '1';
    } catch {
      return false;
    }
  }

  let replie = $state(lireEtatInitial());

  $effect(() => {
    try {
      window.localStorage.setItem(CLE_STOCKAGE, replie ? '1' : '0');
    } catch {
      // La préférence reste en mémoire pour la session en cours si le
      // stockage local est indisponible (navigation privée, quota) — sans
      // conséquence sur le fonctionnement du cadre (C4 reste local, jamais
      // serveur).
    }
  });

  function basculerRepli() {
    replie = !replie;
  }
</script>

<div class="flex min-h-dvh bg-background text-foreground">
  <aside
    class={[
      'flex shrink-0 flex-col gap-4 border-r border-border bg-card p-3 transition-[width]',
      replie ? 'w-16' : 'w-56',
    ]}
    aria-label="Menu de l'administration"
  >
    <button
      type="button"
      class="flex size-8 items-center justify-center self-end rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      onclick={basculerRepli}
      aria-label={replie ? 'Déployer le menu' : 'Replier le menu'}
    >
      {#if replie}
        <PanelLeftOpen class="size-4" />
      {:else}
        <PanelLeftClose class="size-4" />
      {/if}
    </button>

    <nav>
      <ul class="flex flex-col gap-1">
        {#each RUBRIQUES as rubrique (rubrique.id)}
          <li>
            <!--
              Un seul élément par rubrique : `<a>` quand un écran est servi
              (`href`), `<span>` sinon — rien qui « offre » un geste de
              navigation vers une rubrique sans écran (C5). `href={undefined}`
              n'est pas rendu par Svelte.
            -->
            <svelte:element
              this={rubrique.href ? 'a' : 'span'}
              href={rubrique.href ?? undefined}
              class={[
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm',
                rubrique.id === rubriqueActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground',
              ]}
              aria-current={rubrique.id === rubriqueActive ? 'page' : undefined}
            >
              <rubrique.icone class="size-4 shrink-0" aria-hidden="true" />
              {#if !replie}
                <span>{rubrique.libelle}</span>
              {/if}
            </svelte:element>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>

  <main class="min-w-0 flex-1 p-8">
    {@render children?.()}
  </main>
</div>
