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
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Button } from '../composants/ui/button/index.ts';
  import { afficherPastilleDeBrouillon } from '../pastille-brouillon.ts';
  import { messageErreurCorrection, MESSAGE_ECHEC, MESSAGE_RESEAU } from './message-erreur-correction.ts';
  import { analyserMarkdownRestreint } from '../../core/pages/texte-riche.ts';

  interface Props {
    slug: string;
    idEmplacement: string;
    markdownInitial: string;
  }

  const { slug, idEmplacement, markdownInitial }: Props = $props();

  let zoneEdition: HTMLDivElement | undefined = $state();
  let editeur: Editor | undefined;
  let enCours = $state(false);
  let messageErreur = $state<string | null>(null);
  let champLienVisible = $state(false);
  let lienSaisi = $state('');

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
  }

  onMount(() => {
    editeur = new Editor({
      element: zoneEdition,
      content: analyserMarkdownRestreint(markdownInitial),
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
    champLienVisible = true;
  }

  function appliquerLien(): void {
    const lien = lienSaisi.trim();
    if (lien === '') {
      editeur?.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editeur?.chain().focus().extendMarkRange('link').setLink({ href: lien }).run();
    }
    champLienVisible = false;
  }

  async function enregistrer(): Promise<void> {
    if (!editeur) return;
    enCours = true;
    messageErreur = null;
    try {
      const reponse = await fetch(`/admin/pages/${slug}/emplacements/${idEmplacement}`, {
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
        messageErreur = TEXTES_REFUS[resultat.raison ?? ''] ?? MESSAGE_ECHEC;
        return;
      }
      afficherPastilleDeBrouillon();
    } catch {
      messageErreur = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<div>
  <div role="toolbar" aria-label="Mise en forme du texte">
    <button type="button" onclick={basculerGras}>Gras</button>
    <button type="button" onclick={basculerItalique}>Italique</button>
    <button type="button" onclick={ouvrirChampLien}>Lien</button>
    <button type="button" onclick={basculerListe}>Liste</button>
    <button type="button" onclick={basculerTitre}>Titre</button>
  </div>
  {#if champLienVisible}
    <p>
      <label>
        Adresse du lien
        <input
          type="text"
          bind:value={lienSaisi}
          placeholder="https://, mailto:, tel: ou une adresse du site commençant par /"
        />
      </label>
      <Button type="button" onclick={appliquerLien}>Appliquer le lien</Button>
    </p>
  {/if}
  <div bind:this={zoneEdition}></div>
  <Button type="button" onclick={enregistrer} disabled={enCours}>Enregistrer</Button>
  {#if messageErreur}
    <p role="alert">{messageErreur}</p>
  {/if}
</div>
