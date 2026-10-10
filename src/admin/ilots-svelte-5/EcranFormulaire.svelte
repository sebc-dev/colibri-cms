<!--
  EcranFormulaire.svelte — l'îlot de l'`Écran : Formulaire` (change 010,
  ticket 07). L'éditrice corrige libellé et prix des choix de chaque champ à
  choix, ajoute, retire, monte ou descend un choix, puis enregistre tout le
  formulaire d'un seul bouton (`POST /admin/formulaires/<id>/options`, cookie
  `SameSite=Strict`, ADR-0011). La route reste seule juge : un refus marque la
  ligne fautive de ce qui est attendu, la saisie est gardée. Interpolation
  échappée seulement (I5). Aucune directive `client:*` (ADR-0006).
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { Button } from '../composants/ui/button/index.ts';
  import {
    TEXTE_BOUTON_ENREGISTRER,
    TEXTE_ENREGISTREMENT_EN_COURS,
    TEXTE_FORMULAIRE_A_CORRIGER,
    TEXTE_FORMULAIRE_AJOUTER,
    TEXTE_FORMULAIRE_DESCENDRE,
    TEXTE_FORMULAIRE_ENREGISTRE,
    TEXTE_FORMULAIRE_GARDER_UN,
    TEXTE_FORMULAIRE_LISTE_COMPLETE,
    TEXTE_FORMULAIRE_MONTER,
    TEXTE_FORMULAIRE_RETIRER,
    TEXTE_INTITULE_CHOIX,
    TEXTE_INTITULE_PRIX,
    TEXTE_PLUSIEURS_CHOIX,
    TEXTE_REFUS_FORMULAIRE_INCONNU,
    TEXTE_SUFFIXE_EUROS,
    TEXTE_UN_SEUL_CHOIX,
    TEXTES_REFUS_FORMULAIRE,
  } from '../textes.ts';
  import { messageErreurCorrection, MESSAGE_RESEAU } from './message-erreur-correction.ts';
  import {
    ajouter as ajouterLigne,
    corpsDEnregistrement,
    deplacer as deplacerLigne,
    lignesDepuis,
    peutAjouter,
    peutRetirer,
    retirer as retirerLigne,
    type ChampCarte,
    type LigneChoix,
  } from './formulaire-carte.ts';

  interface Props {
    idFormulaire: string;
    champs: readonly ChampCarte[];
    apresEnregistrement: () => void;
  }

  const { idFormulaire, champs, apresEnregistrement }: Props = $props();

  let prochaineCle = 0;
  const etatInitial = champs.map((champ) => {
    const lignes = lignesDepuis(champ.options, prochaineCle);
    prochaineCle += lignes.length;
    return lignes;
  });
  let lignesParChamp = $state<LigneChoix[][]>(etatInitial);
  let erreurs = $state<Record<string, string>>({});
  let messageGeneral = $state<string | null>(null);
  let confirmation = $state<string | null>(null);
  let enCours = $state(false);
  let formulaire = $state<HTMLFormElement | undefined>(undefined);

  const CLASSE_CHAMP =
    'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:border-ring max-md:min-h-11 md:text-sm';
  const CLASSE_GESTE = 'h-auto rounded-md px-3 py-2 max-md:min-h-11';

  interface Reponse {
    readonly ok: boolean;
    readonly refus?: readonly { readonly champ: string; readonly raison: string }[];
    readonly champs?: readonly { readonly id: string; readonly options: readonly { readonly id: string }[] }[];
  }

  function nomDe(ligne: LigneChoix): string {
    const nom = ligne.libelle.trim();
    return nom.length > 0 ? nom : 'ce choix';
  }

  function remettreAZero(): void {
    erreurs = {};
    messageGeneral = null;
    confirmation = null;
  }

  async function ajouter(c: number): Promise<void> {
    if (enCours) return;
    lignesParChamp[c] = ajouterLigne(lignesParChamp[c] ?? [], prochaineCle++);
    remettreAZero();
    await tick();
    const lignes = lignesParChamp[c] ?? [];
    const derniere = lignes[lignes.length - 1];
    if (derniere !== undefined) document.getElementById(`choix-${String(derniere.cle)}`)?.focus();
  }

  function retirer(c: number, i: number): void {
    if (enCours) return;
    lignesParChamp[c] = retirerLigne(lignesParChamp[c] ?? [], i);
    remettreAZero();
  }

  function deplacer(c: number, i: number, sens: -1 | 1): void {
    if (enCours) return;
    lignesParChamp[c] = deplacerLigne(lignesParChamp[c] ?? [], i, sens);
    remettreAZero();
  }

  function reprendreIdentifiants(rendus: NonNullable<Reponse['champs']>): void {
    champs.forEach((champ, c) => {
      const rendu = rendus.find((r) => r.id === champ.id);
      const lignes = lignesParChamp[c];
      if (rendu === undefined || lignes === undefined) return;
      lignes.forEach((ligne, i) => {
        const id = rendu.options[i]?.id;
        if (id !== undefined) ligne.id = id;
      });
    });
  }

  async function enregistrer(evenement: SubmitEvent): Promise<void> {
    evenement.preventDefault();
    enCours = true;
    remettreAZero();
    try {
      const corps = corpsDEnregistrement(
        champs.map((champ, c) => ({ id: champ.id, avecPrix: champ.avecPrix, lignes: lignesParChamp[c] ?? [] })),
      );
      const reponse = await fetch(`/admin/formulaires/${encodeURIComponent(idFormulaire)}/options`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corps),
      });
      if (reponse.status !== 200 && reponse.status !== 400) {
        messageGeneral = messageErreurCorrection(reponse.status);
        return;
      }
      const resultat = (await reponse.json()) as Reponse;
      if (resultat.ok) {
        if (resultat.champs !== undefined) reprendreIdentifiants(resultat.champs);
        confirmation = TEXTE_FORMULAIRE_ENREGISTRE;
        apresEnregistrement();
        return;
      }
      if (resultat.refus === undefined) {
        messageGeneral = messageErreurCorrection(500);
        return;
      }
      const marques: Record<string, string> = {};
      for (const { champ, raison } of resultat.refus) {
        marques[champ] = TEXTES_REFUS_FORMULAIRE[raison] ?? TEXTE_REFUS_FORMULAIRE_INCONNU;
      }
      erreurs = marques;
      messageGeneral = TEXTE_FORMULAIRE_A_CORRIGER;
      await tick();
      const premiere = formulaire?.querySelector<HTMLElement>('[aria-invalid="true"], [data-erreur-formulaire]');
      if (premiere) {
        premiere.scrollIntoView?.({ block: 'center' });
        if (premiere instanceof HTMLInputElement) premiere.focus({ preventScroll: true });
      }
    } catch {
      messageGeneral = MESSAGE_RESEAU;
    } finally {
      enCours = false;
    }
  }
</script>

<form bind:this={formulaire} onsubmit={enregistrer} novalidate class="flex flex-col gap-4">
  {#if messageGeneral}
    <p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{messageGeneral}</p>
  {/if}
  {#each champs as champ, c (champ.id)}
    {@const lignes = lignesParChamp[c] ?? []}
    <section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" aria-labelledby={`carte-champ-${String(c)}`}>
      <h2 id={`carte-champ-${String(c)}`} class="text-lg font-medium">{champ.libelle}</h2>
      <p class="text-sm text-ink-muted">
        {champ.nature === 'choix-multiple' ? TEXTE_PLUSIEURS_CHOIX : TEXTE_UN_SEUL_CHOIX}
      </p>
      {#if erreurs[champ.id] !== undefined}
        <p role="alert" data-erreur-formulaire class="text-sm text-danger">{erreurs[champ.id]}</p>
      {/if}
      <ul class="flex flex-col gap-3">
        {#each lignes as ligne, i (ligne.cle)}
          {@const erreurLibelle = erreurs[`${champ.id}.${String(i)}.libelle`]}
          {@const erreurPrix = erreurs[`${champ.id}.${String(i)}.prix`]}
          <li class="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div class="flex flex-col gap-2 md:flex-row md:items-start">
              <div class="flex flex-1 flex-col gap-1">
                <label for={`choix-${String(ligne.cle)}`} class="text-sm font-medium">{TEXTE_INTITULE_CHOIX}</label>
                <input
                  id={`choix-${String(ligne.cle)}`}
                  type="text"
                  bind:value={ligne.libelle}
                  aria-invalid={erreurLibelle !== undefined}
                  aria-describedby={erreurLibelle !== undefined ? `erreur-choix-${String(ligne.cle)}` : undefined}
                  class={CLASSE_CHAMP}
                />
                {#if erreurLibelle !== undefined}
                  <p id={`erreur-choix-${String(ligne.cle)}`} role="alert" class="text-sm text-danger">{erreurLibelle}</p>
                {/if}
              </div>
              {#if champ.avecPrix}
                <div class="flex flex-col gap-1 md:w-44">
                  <label for={`prix-${String(ligne.cle)}`} class="text-sm font-medium">{TEXTE_INTITULE_PRIX}</label>
                  <div class="flex items-center gap-2">
                    <input
                      id={`prix-${String(ligne.cle)}`}
                      type="text"
                      inputmode="decimal"
                      bind:value={ligne.prix}
                      aria-invalid={erreurPrix !== undefined}
                      aria-describedby={erreurPrix !== undefined ? `erreur-prix-${String(ligne.cle)}` : undefined}
                      class={CLASSE_CHAMP}
                    />
                    <span>{TEXTE_SUFFIXE_EUROS}</span>
                  </div>
                  {#if erreurPrix !== undefined}
                    <p id={`erreur-prix-${String(ligne.cle)}`} role="alert" class="text-sm text-danger">{erreurPrix}</p>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={i === 0 || enCours}
                aria-label={`${TEXTE_FORMULAIRE_MONTER} ${nomDe(ligne)} dans ${champ.libelle}`}
                onclick={() => deplacer(c, i, -1)}
                class={CLASSE_GESTE}>{TEXTE_FORMULAIRE_MONTER}</Button
              >
              <Button
                type="button"
                variant="outline"
                disabled={i === lignes.length - 1 || enCours}
                aria-label={`${TEXTE_FORMULAIRE_DESCENDRE} ${nomDe(ligne)} dans ${champ.libelle}`}
                onclick={() => deplacer(c, i, 1)}
                class={CLASSE_GESTE}>{TEXTE_FORMULAIRE_DESCENDRE}</Button
              >
              <Button
                type="button"
                variant="outline"
                disabled={!peutRetirer(lignes) || enCours}
                aria-label={`${TEXTE_FORMULAIRE_RETIRER} ${nomDe(ligne)} dans ${champ.libelle}`}
                onclick={() => retirer(c, i)}
                class={CLASSE_GESTE}>{TEXTE_FORMULAIRE_RETIRER}</Button
              >
            </div>
          </li>
        {/each}
      </ul>
      {#if !peutRetirer(lignes)}
        <p class="text-sm text-ink-muted">{TEXTE_FORMULAIRE_GARDER_UN}</p>
      {/if}
      {#if peutAjouter(lignes)}
        <Button
          type="button"
          variant="outline"
          disabled={enCours}
          aria-label={`${TEXTE_FORMULAIRE_AJOUTER} dans ${champ.libelle}`}
          onclick={() => ajouter(c)}
          class={`${CLASSE_GESTE} self-start`}>{TEXTE_FORMULAIRE_AJOUTER}</Button
        >
      {:else}
        <p class="text-ink-muted">{TEXTE_FORMULAIRE_LISTE_COMPLETE}</p>
      {/if}
    </section>
  {/each}
  <Button type="submit" disabled={enCours} class="h-auto self-start rounded-md border-0 px-3 py-2 max-md:min-h-11">
    {enCours ? TEXTE_ENREGISTREMENT_EN_COURS : TEXTE_BOUTON_ENREGISTRER}
  </Button>
  {#if confirmation}
    <p role="status" class="text-sm text-ink-muted">{confirmation}</p>
  {/if}
</form>
