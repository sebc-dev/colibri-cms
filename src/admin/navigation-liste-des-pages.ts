/**
 * Active le clic vers l'`Écran : Éditeur de page` depuis l'`Écran : Liste des
 * pages` (ticket 03, SC-03a,
 * openspec/changes/003-remplir-emplacements/tickets/03-editeur-emplacements.md).
 *
 * `src/pages/admin/mes-pages.astro` (ticket 02) rend chaque page dans un
 * `<li>{page.titre}</li>` littéral, sans balise supplémentaire : c'est ce qui
 * garde `SC-02a` observable par une requête HTTP réelle
 * (`tests/integration/liste-des-pages.test.ts`), sans exécuter de
 * JavaScript. La navigation ajoutée par ce module ne touche donc jamais ce
 * rendu serveur — elle attache un comportement, après coup, côté client
 * seulement (comme `monterCadreAvecContenu`, ADR-0006 : aucun script en
 * ligne, ce fichier est importé depuis un `<script>` de module).
 *
 * La correspondance ligne → page vit dans un attribut `data-*` posé sur la
 * liste elle-même (jamais sur un `<li>`, pour ne rien changer à sa forme
 * observée) : un tableau JSON des identifiants de page, dans le même ordre
 * que les lignes rendues.
 */
export function activerNavigationListeDesPages(idListe: string): void {
  const liste = document.getElementById(idListe);
  if (!liste) return;

  const brut = liste.dataset.pages;
  if (!brut) return;

  let identifiants: unknown;
  try {
    identifiants = JSON.parse(brut);
  } catch {
    return;
  }
  if (!Array.isArray(identifiants)) return;
  // `Array.isArray` ne narrowe `unknown` qu'en `any[]` : c'est cette
  // annotation, et non le garde, qui empêche les éléments de traverser en
  // `any` le reste de la fonction.
  const identifiantsBruts: unknown[] = identifiants;

  const lignes = Array.from(liste.children).filter(
    (element): element is HTMLLIElement => element instanceof HTMLLIElement,
  );

  lignes.forEach((ligne, index) => {
    const identifiant = identifiantsBruts[index];
    if (typeof identifiant !== 'string') return;

    const destination = `/admin/pages/${identifiant}`;

    ligne.setAttribute('role', 'link');
    ligne.tabIndex = 0;
    ligne.classList.add('cursor-pointer');

    ligne.addEventListener('click', () => {
      window.location.assign(destination);
    });
    ligne.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Enter' && evenement.key !== ' ') return;
      evenement.preventDefault();
      window.location.assign(destination);
    });
  });
}
