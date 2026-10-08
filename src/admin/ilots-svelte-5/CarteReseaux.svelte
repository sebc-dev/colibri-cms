<!--
  CarteReseaux.svelte — l'îlot de la carte Réseaux sociaux de l'`Écran :
  Réglages` (ticket 07,
  openspec/changes/008-reglages-transverses/tickets/07-composer-les-reseaux-sociaux.md).

  L'éditrice compose la liste : ajoute, corrige, retire, monte ou descend un
  lien, puis enregistre la liste entière en un geste (`POST
  /admin/reglages/reseaux`, cookie `SameSite=Strict`, ADR-0011). Un refus
  marque le champ fautif d'un message qui dit ce qui est attendu ; la saisie
  est gardée. Nom et adresse : interpolation échappée seulement (I5).
  Aucune directive `client:*` (ADR-0006).
-->
<script lang="ts">
  import { Button } from '../composants/ui/button/index.ts';
  import { RESEAUX_LIENS_MAX } from '../../core/reglages/reseaux.ts';
  import {
    TEXTE_BOUTON_ENREGISTRER,
    TEXTE_ENREGISTREMENT_EN_COURS,
    TEXTE_REFUS_RESEAU_INCONNU,
    TEXTE_RESEAUX_ADRESSE,
    TEXTE_RESEAUX_AJOUTER,
    TEXTE_RESEAUX_AUCUN_LIEN,
    TEXTE_RESEAUX_DESCENDRE,
    TEXTE_RESEAUX_LISTE_COMPLETE,
    TEXTE_RESEAUX_MONTER,
    TEXTE_RESEAUX_NOM,
    TEXTE_RESEAUX_RETIRER,
    TEXTES_REFUS_RESEAUX,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';
  import type { ReseauCarte } from './reseaux-carte.ts';

  interface Props {
    reseaux: readonly ReseauCarte[];
    apresEnregistrement: () => void;
  }

  const { reseaux, apresEnregistrement }: Props = $props();

  const LIENS_MAX = RESEAUX_LIENS_MAX;

  interface Ligne {
    cle: number;
    nom: string;
    lien: string;
  }

  let prochaineCle = 0;
  let lignes = $state<Ligne[]>(reseaux.map((r) => ({ cle: prochaineCle++, nom: r.nom, lien: r.lien })));
  let erreurs = $state<Record<string, string>>({});
  let messageGeneral = $state<string | null>(null);
  let enCours = $state(false);

  const CLASSE_CHAMP =
    'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm';
  const CLASSE_GESTE = 'h-auto rounded-md px-3 py-2 max-md:min-h-11';

  interface RefusChamp {
    readonly champ: string;
    readonly raison: string;
  }
  interface Reponse {
    readonly ok: boolean;
    readonly raison?: string;
    readonly refus?: readonly RefusChamp[];
  }

  function ajouter(): void {
    if (lignes.length >= LIENS_MAX) return;
    lignes.push({ cle: prochaineCle++, nom: '', lien: '' });
    erreurs = {};
  }

  function retirer(i: number): void {
    lignes.splice(i, 1);
    erreurs = {};
  }

  function deplacer(i: number, sens: -1 | 1): void {
    const j = i + sens;
    if (j < 0 || j >= lignes.length) return;
    const [ligne] = lignes.splice(i, 1);
    lignes.splice(j, 0, ligne);
    erreurs = {};
  }

  function nomDe(ligne: Ligne): string {
    const nom = ligne.nom.trim();
    return nom.length > 0 ? nom : 'ce lien';
  }

  async function enregistrer(evenement: SubmitEvent): Promise<void> {
    evenement.preventDefault();
    enCours = true;
    erreurs = {};
    messageGeneral = null;
    try {
      const reponse = await fetch('/admin/reglages/reseaux', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reseaux: lignes.map((l) => ({ nom: l.nom, lien: l.lien })) }),
      });
      if (reponse.status !== 200 && reponse.status !== 400) {
        messageGeneral = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as Reponse;
      if (resultat.ok) {
        apresEnregistrement();
        return;
      }
      if (resultat.refus === undefined) {
        messageGeneral = TEXTES_REFUS_RESEAUX[resultat.raison ?? ''] ?? TEXTE_REFUS_RESEAU_INCONNU;
        return;
      }
      const marques: Record<string, string> = {};
      for (const { champ, raison } of resultat.refus) {
        marques[champ] = TEXTES_REFUS_RESEAUX[raison] ?? TEXTE_REFUS_RESEAU_INCONNU;
      }
      if (marques.reseaux !== undefined) messageGeneral = marques.reseaux;
      erreurs = marques;
    } catch {
      messageGeneral = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<form onsubmit={enregistrer} novalidate class="flex flex-col gap-4">
  {#if lignes.length === 0}
    <p class="text-ink-muted">{TEXTE_RESEAUX_AUCUN_LIEN}</p>
  {/if}
  <ul class="flex flex-col gap-4">
    {#each lignes as ligne, i (ligne.cle)}
      <li class="flex flex-col gap-2 rounded-lg border border-border p-3">
        <div class="flex flex-col gap-1">
          <label for={`champ-reseau-nom-${ligne.cle}`} class="text-sm font-medium">{TEXTE_RESEAUX_NOM}</label>
          <input
            id={`champ-reseau-nom-${ligne.cle}`}
            type="text"
            bind:value={ligne.nom}
            aria-invalid={erreurs[`reseaux.${i}.nom`] !== undefined}
            aria-describedby={erreurs[`reseaux.${i}.nom`] !== undefined ? `erreur-reseau-nom-${ligne.cle}` : undefined}
            class={CLASSE_CHAMP}
          />
          {#if erreurs[`reseaux.${i}.nom`] !== undefined}
            <p id={`erreur-reseau-nom-${ligne.cle}`} role="alert" class="text-sm text-danger">{erreurs[`reseaux.${i}.nom`]}</p>
          {/if}
        </div>
        <div class="flex flex-col gap-1">
          <label for={`champ-reseau-lien-${ligne.cle}`} class="text-sm font-medium">{TEXTE_RESEAUX_ADRESSE}</label>
          <input
            id={`champ-reseau-lien-${ligne.cle}`}
            type="text"
            inputmode="url"
            bind:value={ligne.lien}
            aria-invalid={erreurs[`reseaux.${i}.lien`] !== undefined}
            aria-describedby={erreurs[`reseaux.${i}.lien`] !== undefined ? `erreur-reseau-lien-${ligne.cle}` : undefined}
            class={CLASSE_CHAMP}
          />
          {#if erreurs[`reseaux.${i}.lien`] !== undefined}
            <p id={`erreur-reseau-lien-${ligne.cle}`} role="alert" class="text-sm text-danger">{erreurs[`reseaux.${i}.lien`]}</p>
          {/if}
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={i === 0}
            aria-label={`${TEXTE_RESEAUX_MONTER} ${nomDe(ligne)}`}
            onclick={() => deplacer(i, -1)}
            class={CLASSE_GESTE}>{TEXTE_RESEAUX_MONTER}</Button
          >
          <Button
            type="button"
            variant="outline"
            disabled={i === lignes.length - 1}
            aria-label={`${TEXTE_RESEAUX_DESCENDRE} ${nomDe(ligne)}`}
            onclick={() => deplacer(i, 1)}
            class={CLASSE_GESTE}>{TEXTE_RESEAUX_DESCENDRE}</Button
          >
          <Button
            type="button"
            variant="outline"
            aria-label={`${TEXTE_RESEAUX_RETIRER} ${nomDe(ligne)}`}
            onclick={() => retirer(i)}
            class={CLASSE_GESTE}>{TEXTE_RESEAUX_RETIRER}</Button
          >
        </div>
      </li>
    {/each}
  </ul>
  {#if lignes.length >= LIENS_MAX}
    <p class="text-ink-muted">{TEXTE_RESEAUX_LISTE_COMPLETE}</p>
  {:else}
    <Button type="button" variant="outline" onclick={ajouter} class={`${CLASSE_GESTE} self-start`}>{TEXTE_RESEAUX_AJOUTER}</Button>
  {/if}
  <Button type="submit" disabled={enCours} class="h-auto self-start rounded-md border-0 px-3 py-2 max-md:min-h-11">
    {enCours ? TEXTE_ENREGISTREMENT_EN_COURS : TEXTE_BOUTON_ENREGISTRER}
  </Button>
  {#if messageGeneral}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageGeneral}</p>
  {/if}
</form>
