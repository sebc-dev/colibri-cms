# 10 — « Publier » mène au récapitulatif des pages, réglages et formulaires, qu'on peut annuler

**Bloqué par :** 08
**Vérif :** test
**Fichiers :** `src/admin/GabaritCadre.astro`, `src/admin/textes.ts`, `src/core/publication/recapitulatif.ts`, `src/pages/admin/publier.astro`, `tests/unit/publication/recapitulatif.test.ts`, `tests/integration/ecran-publier.test.ts`, `tests/static/ecran-publier-statique.test.ts`

## Ce que ça livre

Le cadre de l'administration porte, sur chaque écran et toujours visible, le geste **« Publier »**.
Sur téléphone, il reste visible tiroir fermé. Il ne met rien en ligne lui-même : il ouvre l'**écran
Publier**, qui présente le **récapitulatif** de ce qui partira en ligne :
- les **pages** qui portent un brouillon, par leur titre, dans l'ordre posé, chacune menant à son
  aperçu ;
- les **réglages** qui portent un brouillon (Coordonnées, Réseaux sociaux, Mention d'information) ;
- les **formulaires** qui portent un brouillon, par leur nom.

Sans rien à publier, l'écran le dit et n'offre aucun geste de mise en ligne. « Annuler » ramène à
l'écran quitté sans rien toucher : aucun dépôt, chaque brouillon intact, le site public inchangé.
Sans session, l'écran renvoie à la connexion.

**Décisions à respecter :**
- **Cadre** (`src/admin/GabaritCadre.astro`) : un bouton principal « Publier » dans la barre haute, à
  droite, sur **tous** les écrans. La barre haute n'existe aujourd'hui que sous `md` : elle doit
  exister aussi sur écran large, ou « Publier » y prendre une place équivalente hors du menu des
  rubriques. Le bouton est un lien vers `/admin/publier`, rendu par le serveur, présent sans
  attendre aucun script. La CSP stricte et l'absence de `client:*` restent tenues (I4, I12, ADR-0006).
- `src/core/publication/recapitulatif.ts`, pur : il dérive, depuis les déclarations et les objets qui
  portent un brouillon, les trois listes de ce ticket. Les images s'y ajoutent au ticket 11, et
  l'empreinte de confirmation au ticket 15.
- **Écran** `src/pages/admin/publier.astro`, gardé (I6), dans le cadre, aucune rubrique marquée
  active, titre « Publier » :
  - phrase d'introduction : « Voici ce qui va être mis en ligne. Rien ne part tant que vous n'avez pas
    confirmé. » ;
  - chaque liste est absente si elle est vide ;
  - chaque page est un lien « Voir l'aperçu » vers son aperçu (ticket 08) ;
  - « Annuler » (bouton secondaire) ramène à l'écran quitté, « Mes pages » à défaut. Une adresse de
    retour transmise par la requête est revérifiée comme un chemin interne sous `/admin/`, jamais une
    redirection ouverte.
- **Rien à publier** : « Rien à publier : aucune page, aucun réglage ni aucun formulaire n'a de
  modification en attente. », et seul « Revenir à mes pages » est offert.
- Le bouton « Publier maintenant » n'apparaît pas encore : il arrive avec la confirmation (ticket 15).
- Les textes vont dans `src/admin/textes.ts`. Les noms sont affichés par l'interpolation échappée
  d'Astro seulement (I5).
- La disposition sur téléphone (« Publier » visible tiroir fermé, tiroir qui se referme) se constate
  aussi au cahier de recette, dans le paragraphe de ce ticket, joué en fin de front.

**Hors périmètre :** les images dans le récapitulatif et son exactitude complète (ticket 11) ; la
confirmation et la mise en ligne (ticket 15) ; l'état de la dernière publication dans le cadre
(ticket 18).

## Critères
- [ ] Un écran servi derrière la garde arrive avec le logo, le menu des cinq rubriques avec la rubrique courante marquée, le geste « Publier », et le contenu de l'écran à l'intérieur du cadre, sans que ni le menu, ni « Publier », ni le contenu n'attendent l'exécution d'un script pour exister   (SC-10a)
- [ ] Quand l'éditrice actionne « Publier » depuis n'importe quel écran servi derrière la garde, l'`Écran : Publier` s'ouvre, portant le récapitulatif de ce qui va partir, sans que rien ne soit encore mis en ligne   (SC-10b)
- [ ] Sur un appareil étroit, le menu est fermé et le contenu occupe toute la largeur ; un bouton de menu, toujours visible en haut de l'écran, ouvre le tiroir portant les cinq rubriques ; et le geste « Publier » reste visible en haut de l'écran, tiroir fermé   (SC-10c)
- [ ] Quand seul le réglage « Mention d'information » porte un brouillon, le récapitulatif présente « Mention d'information » parmi les réglages, et ne présente aucune page, aucun formulaire ni aucune image   (SC-10d)
- [ ] Quand l'éditrice actionne une page listée dans le récapitulatif, l'aperçu de cette page s'ouvre   (SC-10e)
- [ ] Quand aucune page, aucun réglage ni aucun formulaire ne porte de brouillon, qu'aucune description n'a changé, qu'aucune image n'est à effacer, et que la dernière publication n'a pas échoué, l'écran dit qu'il n'y a rien à publier, et n'offre aucun geste de mise en ligne   (SC-10f)
- [ ] L'écran Publier demandé sans session ouverte renvoie à l'écran de connexion, sans rien montrer du récapitulatif   (SC-10g)
- [ ] Quand le récapitulatif est affiché et que l'éditrice annule, elle revient à l'écran qu'elle quittait ; rien n'est déposé, chaque brouillon est intact et porte toujours sa marque, et le site public est inchangé   (SC-10h)
