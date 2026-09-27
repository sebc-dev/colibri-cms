/**
 * Anime le cadre commun de l'administration (ticket 04,
 * openspec/changes/005-mise-en-page-administration/tickets/
 * 04-repli-et-tiroir.md, SC-04a à SC-04f).
 *
 * `GabaritCadre.astro` (ticket 03, complété par ce ticket) rend déjà, dans
 * la même réponse HTTP, la barre latérale déployée, la barre du haut et le
 * tiroir fermé — ce module, chargé par un `<script>` de module Astro
 * (bundlé, jamais `is:inline`, invariant `I12`), ne fait qu'attacher un
 * comportement après coup, sans jamais manipuler `innerHTML` ni émettre de
 * requête réseau, et sans aucune directive `client:*` (invariant `I4`,
 * ADR-0006) :
 *
 * - **repli** (SC-04a, SC-04b) : bascule l'attribut `data-replie` sur la
 *   barre (`"true"`/`"false"`), persisté dans
 *   `localStorage['admin.cadre.replie']` (`'1'`/`'0'` — la clé et les
 *   valeurs de l'ancien `Cadre.svelte`, pour que la préférence déjà
 *   retenue sur l'appareil survive à la migration, SC-04c). L'accès à
 *   `localStorage` est protégé par `try/catch` de part en part : en
 *   navigation privée (ou tout autre contexte qui le refuse), la barre
 *   reste déployée par défaut, sans jamais lever d'erreur.
 * - **tiroir** (SC-04d, SC-04e) : `showModal()`/`close()` sur le
 *   `<dialog>` — la boîte de dialogue modale fournit nativement le piège
 *   de focus, la fermeture par Échap et le retour du focus à l'élément qui
 *   l'a ouverte ; ce module n'ajoute que la fermeture au toucher du fond
 *   (un clic dont la cible est le `<dialog>` lui-même, jamais un de ses
 *   descendants — le contenu visible du tiroir remplit tout l'espace
 *   intérieur de la boîte) et au choix d'une rubrique (un clic sur un lien
 *   du menu qu'il porte).
 *
 * `data-pret` n'est posé sur la barre qu'une fois l'état initial du repli
 * appliqué : les transitions (`motion-safe:`) de largeur restent coupées
 * jusque-là, pour qu'une barre repliée par préférence saute sans animation
 * au premier affichage plutôt que de se replier sous les yeux (SC-04f,
 * design.md § Risks). Le module s'exécute une fois, après coup : c'est ce
 * qui rend ce saut instantané.
 */

/** Attribut posé sur la barre latérale (jamais un ancêtre commun avec le
 * tiroir — la seconde instance de `MenuRubriques.astro` qu'il porte ne
 * doit jamais hériter du repli du bureau). */
const ID_BARRE = 'barre-laterale';
const ID_BOUTON_REPLI = 'bouton-repli-menu';
const ID_BOUTON_OUVRIR_TIROIR = 'bouton-ouvrir-tiroir';
const ID_TIROIR = 'tiroir-menu';

const CLE_STOCKAGE_REPLI = 'admin.cadre.replie';

function lireRepliStocke(): boolean {
  try {
    return window.localStorage.getItem(CLE_STOCKAGE_REPLI) === '1';
  } catch {
    return false;
  }
}

function ecrireRepliStocke(replie: boolean): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE_REPLI, replie ? '1' : '0');
  } catch {
    // Stockage indisponible (navigation privée, quota…) : la préférence ne
    // survit pas au rechargement, mais rien n'échoue pour l'éditrice.
  }
}

function appliquerRepli(barre: HTMLElement, bouton: HTMLElement, replie: boolean): void {
  barre.setAttribute('data-replie', replie ? 'true' : 'false');
  bouton.setAttribute('aria-pressed', replie ? 'true' : 'false');
  bouton.setAttribute('aria-label', replie ? 'Déplier le menu' : 'Replier le menu');
}

function activerRepli(): void {
  const barre = document.getElementById(ID_BARRE);
  const bouton = document.getElementById(ID_BOUTON_REPLI);
  if (!barre || !bouton) return;

  let replie = lireRepliStocke();
  appliquerRepli(barre, bouton, replie);
  // Posé une fois l'état initial peint : jusque-là, aucune transition
  // n'est active sur la barre (voir la classe `data-[pret=true]:…` côté
  // `GabaritCadre.astro`).
  barre.setAttribute('data-pret', 'true');

  bouton.addEventListener('click', () => {
    replie = !replie;
    appliquerRepli(barre, bouton, replie);
    ecrireRepliStocke(replie);
  });
}

function activerTiroir(): void {
  const bouton = document.getElementById(ID_BOUTON_OUVRIR_TIROIR);
  const tiroir = document.getElementById(ID_TIROIR);
  if (!bouton || !(tiroir instanceof HTMLDialogElement)) return;

  bouton.addEventListener('click', () => {
    tiroir.showModal();
  });

  // Le contenu visible du tiroir remplit tout l'espace intérieur de la
  // boîte : seul un clic sur le fond (le `::backdrop`, hors de la boîte)
  // cible le `<dialog>` lui-même plutôt qu'un de ses descendants.
  tiroir.addEventListener('click', (evenement) => {
    if (evenement.target === tiroir) tiroir.close();
  });

  // Choix d'une rubrique : chaque lien du menu porté par le tiroir le
  // referme avant que la navigation qu'il déclenche ne parte.
  tiroir.querySelectorAll('a').forEach((lien) => {
    lien.addEventListener('click', () => tiroir.close());
  });
}

export function activerCadre(): void {
  activerRepli();
  activerTiroir();
}
