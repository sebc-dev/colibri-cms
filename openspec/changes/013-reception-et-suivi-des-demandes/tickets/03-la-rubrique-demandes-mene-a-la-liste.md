# 03 — La rubrique « Demandes » mène à la liste des demandes, la plus récente d'abord

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/pages/admin/demandes.astro`, `src/platform/demandes/magasin.ts`, `src/core/demandes/date.ts`, `src/admin/MenuRubriques.astro`, `src/admin/textes.ts`, `docs/cahier-de-test.md`, `tests/unit/demandes/date.test.ts`, `tests/integration/liste-des-demandes.test.ts`

## Ce que ça livre

L'éditrice actionne la rubrique « Demandes » du menu, en barre comme en tiroir, et arrive sur l'`Écran :
Demandes`, la rubrique marquée active. Jusqu'ici, la rubrique était posée sans écran. Désormais, les cinq
rubriques du menu mènent chacune à leur écran.

L'écran présente le titre « Demandes », puis les demandes présentes de la plus récente à la plus ancienne
(FR-069), les 50 plus récentes au plus. Le moyen d'atteindre les plus anciennes est le ticket 04. Chaque
ligne dit :
- la date et l'heure de réception, par exemple « 17 octobre 2026 à 14:05 » ; cette date est le lien vers
  le détail de la demande (`/admin/demandes/<id>`, écran posé par le ticket 06) ;
- le formulaire d'origine et la page d'origine ;
- la coordonnée qui permet de répondre au visiteur : son adresse e-mail, ou à défaut son téléphone ;
- le total, par exemple « 40 € », absent quand le formulaire ne porte pas de prix ;
- la suite, en texte : « À renseigner », « Sans suite », « Devis envoyé » ou « Commande » ; la liste
  déroulante qui la change est le ticket 07 ;
- la pastille « E-mail non parti » quand l'e-mail de la demande n'a pas pu partir.

Sans aucune demande présente, l'écran dit : « Aucune demande n'est encore arrivée. Les demandes envoyées
depuis les formulaires du site paraîtront ici. »

Tout texte venu d'une demande s'affiche tel quel : aucun balisage n'y est interprété (SEC-6). Sans session,
l'écran mène à l'écran de connexion sans rendre aucune donnée de demande. Aucun terme de développeur ne
paraît (FR-117).

**Préalable.** La PR de retouche des tests, fusionnée **avant** le ticket 01, a réduit trois tests du
menu à ce qui reste vrai avant et après ce ticket : SC-03c de `tests/integration/cadre-avec-l-ecran.test.ts`,
SC-04g de `tests/integration/ecran-reglages.test.ts` et SC-02e de
`tests/integration/liste-des-formulaires.test.ts` ne disent plus que « Demandes » ne mène à aucun écran,
ni que quatre rubriques seulement ont un lien. Ce ticket ne modifie **aucun** test existant.

**Décisions à respecter (D4, D9, D10 de l'approche ; ADR-0007, I5, I6, I14) :**
- **La page.** `src/pages/admin/demandes.astro`, derrière `verifierSession` (ADR-0007, I6). Sans session →
  `Astro.redirect('/admin/connexion')`, avant toute lecture de demande. Rendue dans `GabaritCadre` avec
  `rubrique="demandes"`. Rendu serveur seul dans ce ticket : aucun îlot, aucun script ; les gestes arrivent
  au ticket 07. Patron de `src/pages/admin/formulaires.astro`.
- **Le menu.** Dans `src/admin/MenuRubriques.astro`, `IdRubriqueServie` gagne `'demandes'`, et son `href`
  devient `/admin/demandes`. Le commentaire d'en-tête du composant est mis à jour.
- **La lecture.** `listerDemandes` dans `src/platform/demandes/magasin.ts` :
  `where etat = 'presente' order by recue_le desc, rowid desc limit 50`, requête préparée.
- **Les dates.** `src/core/demandes/date.ts`, pur. Le fuseau `Europe/Paris` est une constante de ce module,
  et le format est `Intl.DateTimeFormat('fr-FR', { timeZone, dateStyle: 'long', timeStyle: 'short' })`.
- **Le total.** `formaterPrix` (`src/core/formulaires/prix.ts`) suivi de « € ».
- **Aucune saisie rendue en HTML (SEC-6).** Interpolation échappée d'Astro seulement ; aucun `set:html`
  (I5). La politique de sécurité de l'administration reste le second filet.
- **Les textes** vivent dans `src/admin/textes.ts` : titre, liste vide, pastille « E-mail non parti »,
  libellés des quatre suites. Ni « supprimer », ni « statut », ni « base ».
- **La présentation.** Liste à lignes séparées, comme l'`Écran : Formulaires` ; pastille par le composant
  `badge` déjà copié (ADR-0009) ; sur écran étroit, chaque ligne devient une carte empilée dans le même
  ordre. Couleurs par les tokens seulement (I14).
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : la liste lue au
  téléphone, la pastille, la liste vide.
- **Cas limites à couvrir :** 0, 1, 50 et 51 demandes présentes (50 lignes au plus) ; deux demandes reçues
  à la même milliseconde (ordre stable) ; demande sans prix (aucun total) ; coordonnée par téléphone ; une
  ligne `retiree` semée dans la table n'apparaît pas.
- **Les demandes se sèment directement dans la table**, dates comprises, jamais par une horloge simulée.

**Hors périmètre :**
- le filtre et la pagination (ticket 04) ;
- les nombres (ticket 05) ;
- l'écran du détail (ticket 06) ;
- tout geste — suite, sélection, retrait (tickets 07 à 09).

## Critères
- [ ] Quand trois demandes sont arrivées lundi, mardi et mercredi, la liste présente celle de mercredi, puis celle de mardi, puis celle de lundi   (SC-03a)
- [ ] Quand l'éditrice ouvre la liste après la demande de Marie Dupont, venue de la page « Contact » pour « Devis gâteau », d'un total de 40 €, avec l'adresse « marie@exemple.fr », la ligne de cette demande porte sa date de réception, « Devis gâteau », « Contact », « marie@exemple.fr », 40 € et la suite « à renseigner », et mène au détail de la demande   (SC-03b)
- [ ] Quand aucune demande n'est présente, l'écran dit qu'aucune demande n'est arrivée, sans terme de développeur   (SC-03c)
- [ ] Quand une demande porte, dans son adresse e-mail, des caractères `<`, `>`, `&` ou des guillemets, la liste les affiche comme du texte, et aucun balisage n'est interprété   (SC-03d)
- [ ] Quand l'éditrice actionne « Demandes » dans le menu du cadre, en barre ou en tiroir, l'`Écran : Demandes` s'ouvre, la rubrique « Demandes » marquée active   (SC-03e)
- [ ] Quand l'éditrice parcourt le menu du cadre, en barre ou en tiroir, chacune des cinq rubriques mène à son écran, aucune autre entrée du menu ne mène à un écran, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page   (SC-03f)
- [ ] Quand l'`Écran : Demandes` est demandé sans session ouverte, l'écran de connexion s'ouvre, et la réponse ne porte aucune donnée de demande   (SC-03g)
