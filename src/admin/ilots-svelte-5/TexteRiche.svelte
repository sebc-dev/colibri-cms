<!--
  TexteRiche.svelte — l'îlot de correction d'un emplacement de texte riche
  (ticket 06,
  openspec/changes/003-remplir-emplacements/tickets/06-corriger-texte-riche.md).

  L'éditrice met en forme le texte (gras, italique, lien, liste, titre) par
  la barre ci-dessous, sans jamais écrire de balise ni de syntaxe Markdown
  (SC-06d) : l'éditeur est TipTap (`@tiptap/core` + `@tiptap/starter-kit`),
  monté sur un simple `<div>` (SC-06f, aucun terme de développeur — ni ici,
  ni dans la barre). Le document initial (brouillon ou contenu déclaré,
  ADR-0012) est un Markdown restreint, transformé en document TipTap par
  `analyserMarkdownRestreint` (`core/pages/texte-riche.ts`) — la seule
  fonction pure qui connaît la forme de ce document.

  Enregistre par la route générique d'écriture
  (`src/pages/admin/pages/[slug]/emplacements/[id].ts`) : un `POST` JSON qui
  porte le document produit par l'éditeur (`editeur.getJSON()`), authentifié
  par le seul cookie de session `SameSite=Strict` déjà attaché par le
  navigateur (ADR-0011) — aucun jeton anti-forgerie dédié. La sérialisation en
  Markdown restreint (marques retenues, schémas de lien, SC-06a/b/c) se fait
  côté serveur, dans `core/pages/brouillon.ts`
  (`appliquerCorrectionTexteRiche`) — jamais ici : cet îlot ne fait que
  transporter le document tel que l'éditeur le rend.

  Après un enregistrement accepté, révèle la pastille de brouillon du fil de
  retour sans recharger l'écran (`afficherPastilleDeBrouillon`, SC-06e) ; un
  refus affiche le motif à l'écran, sans terme de développeur (FR-117).

  Aucune directive `client:*` (ADR-0006) : monté par un point d'entrée
  externe (`monter.ts`), même patron que `ReglageLienVideo.svelte`.

  Habillage : ticket 08 (005-mise-en-page-administration). La barre de mise
  en forme est faite de `Button` en variante `outline`, carrés de 44 px sur
  écran étroit (`max-md:min-h-11 max-md:min-w-11`) ; couleurs et polices en
  tokens seuls (`I14`), jamais de valeur littérale hors `admin.css`.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Button } from '../composants/ui/button/index.ts';
  import { messageErreurCorrection, MESSAGE_ECHEC, MESSAGE_RESEAU } from './message-erreur-correction.ts';
  import { analyserMarkdownRestreint, lienDeTexteRicheAutorise } from '../../core/pages/texte-riche.ts';

  interface Props {
    /** Adresse d'enregistrement (POST JSON), composée par l'appelant. */
    adresse: string;
    markdownInitial: string;
    /** Appelée après un enregistrement accepté. */
    apresEnregistrement: () => void;
  }

  const { adresse, markdownInitial, apresEnregistrement }: Props = $props();
  const idUnique = $props.id();

  let zoneEdition: HTMLDivElement | undefined = $state();
  let editeur: Editor | undefined;
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);
  let champLienVisible = $state(false);
  let lienSaisi = $state('');
  let lienRefuse = $state(false);

  // Cible de 44 px sur écran étroit (SC-08e) pour chaque commande de la
  // barre de mise en forme ; taille du canvas au-delà (`sm` du bouton).
  const CLASSE_BOUTON_BARRE = 'max-md:min-h-11 max-md:min-w-11';

  // Recette CT-9.5 — TipTap refuse en silence un lien hors de sa liste
  // (`setLink` rend `false`) : le champ restait fermé comme si le lien était
  // posé. La règle du serveur (`lienDeTexteRicheAutorise`) est vérifiée ici
  // d'abord, et le refus se dit dans les mots du champ.
  const TEXTE_LIEN_REFUSE = "Ce lien n'est pas accepté : il doit commencer par https://, mailto:, tel: ou /.";

  // Recette, remarque 9.1 — la barre dit ce qui est posé là où est le
  // curseur : Gras, Italique, Liste et Titre sont des boutons à bascule
  // (`aria-pressed`), en plumage comme toute sélection du canvas. « Lien »
  // ouvre un champ, il ne bascule rien : il n'en porte pas.
  const CLASSE_BOUTON_BASCULE = `${CLASSE_BOUTON_BARRE} aria-pressed:border-plumage aria-pressed:bg-plumage-soft aria-pressed:text-plumage aria-pressed:hover:bg-plumage-soft aria-pressed:hover:text-plumage`;
  let grasActif = $state(false);
  let italiqueActif = $state(false);
  let listeActive = $state(false);
  let titreActif = $state(false);

  function suivreLaSelection(): void {
    if (!editeur) return;
    grasActif = editeur.isActive('bold');
    italiqueActif = editeur.isActive('italic');
    listeActive = editeur.isActive('bulletList');
    titreActif = editeur.isActive('heading', { level: 2 });
  }

  // SC-06f — aucun terme de développeur : le motif du refus dit ce qui se
  // passe, jamais « JSON », « document » ou « sérialisation ».
  const TEXTES_REFUS: Readonly<Record<string, string>> = {
    'emplacement-non-declare': "Cet emplacement n'existe plus dans la page : rechargez l'écran.",
    'nature-non-corrigible': 'Cet emplacement ne se corrige pas comme un texte riche.',
    'forme-invalide': "Le contenu n'a pas pu être enregistré : rechargez l'écran, puis réessayez.",
  };

  interface ReponseCorrection {
    readonly ok: boolean;
    readonly raison?: string;
    readonly refus?: readonly { readonly champ?: string; readonly raison?: string }[];
  }

  onMount(() => {
    editeur = new Editor({
      element: zoneEdition,
      content: analyserMarkdownRestreint(markdownInitial),
      // Le `<style>` que TipTap injecterait est refusé par la CSP de
      // l'administration (`style-src 'self'`, ADR-0010) : ses règles vivent
      // dans `src/admin/admin.css`.
      injectCSS: false,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          strike: false,
          underline: false,
          horizontalRule: false,
          orderedList: false,
          link: { openOnClick: false, autolink: false },
        }),
      ],
      onTransaction: suivreLaSelection,
    });
  });

  onDestroy(() => {
    editeur?.destroy();
  });

  function basculerGras(): void {
    editeur?.chain().focus().toggleBold().run();
  }

  function basculerItalique(): void {
    editeur?.chain().focus().toggleItalic().run();
  }

  function basculerListe(): void {
    editeur?.chain().focus().toggleBulletList().run();
  }

  function basculerTitre(): void {
    editeur?.chain().focus().toggleHeading({ level: 2 }).run();
  }

  function ouvrirChampLien(): void {
    lienSaisi = (editeur?.getAttributes('link').href as string | undefined) ?? '';
    lienRefuse = false;
    champLienVisible = true;
  }

  function appliquerLien(): void {
    const lien = lienSaisi.trim();
    if (lien === '') {
      editeur?.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (!lienDeTexteRicheAutorise(lien)) {
      lienRefuse = true;
      return;
    } else {
      editeur?.chain().focus().extendMarkRange('link').setLink({ href: lien }).run();
    }
    lienRefuse = false;
    champLienVisible = false;
  }

  async function enregistrer(): Promise<void> {
    if (!editeur) return;
    enCours = true;
    messageErreur = null;
    try {
      const reponse = await fetch(adresse, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ document: editeur.getJSON() }),
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
        messageErreur = TEXTES_REFUS[resultat.raison ?? resultat.refus?.[0]?.raison ?? ''] ?? MESSAGE_ECHEC;
        return;
      }
      apresEnregistrement();
    } catch {
      messageErreur = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div role="toolbar" aria-label="Mise en forme du texte" class="flex flex-wrap gap-1.5">
    <Button
      type="button"
      variant="outline"
      size="sm"
      class={CLASSE_BOUTON_BASCULE}
      aria-pressed={grasActif}
      onclick={basculerGras}>Gras</Button
    >
    <Button
      type="button"
      variant="outline"
      size="sm"
      class={CLASSE_BOUTON_BASCULE}
      aria-pressed={italiqueActif}
      onclick={basculerItalique}>Italique</Button
    >
    <Button type="button" variant="outline" size="sm" class={CLASSE_BOUTON_BARRE} onclick={ouvrirChampLien}>Lien</Button>
    <Button
      type="button"
      variant="outline"
      size="sm"
      class={CLASSE_BOUTON_BASCULE}
      aria-pressed={listeActive}
      onclick={basculerListe}>Liste</Button
    >
    <Button
      type="button"
      variant="outline"
      size="sm"
      class={CLASSE_BOUTON_BASCULE}
      aria-pressed={titreActif}
      onclick={basculerTitre}>Titre</Button
    >
  </div>
  {#if champLienVisible}
    <p class="flex flex-col gap-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink">
        Adresse du lien
        <input
          type="text"
          bind:value={lienSaisi}
          aria-invalid={lienRefuse}
          aria-describedby={lienRefuse ? `lien-refuse-${idUnique}` : undefined}
          placeholder="https://, mailto:, tel: ou une adresse du site commençant par /"
          class="rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm"
        />
      </label>
      {#if lienRefuse}
        <span id={`lien-refuse-${idUnique}`} role="alert" class="text-sm text-danger">{TEXTE_LIEN_REFUSE}</span>
      {/if}
      <Button type="button" onclick={appliquerLien} class="w-full max-md:min-h-11 md:w-auto">Appliquer le lien</Button>
    </p>
  {/if}
  <div
    bind:this={zoneEdition}
    class="min-h-32 rounded-lg border border-input bg-surface-raised px-3 py-2 text-base text-ink focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm"
  ></div>
  <Button type="button" onclick={enregistrer} disabled={enCours} class="w-full max-md:min-h-11 md:w-auto"
    >Enregistrer</Button
  >
  {#if messageErreur}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageErreur}</p>
  {/if}
</div>
