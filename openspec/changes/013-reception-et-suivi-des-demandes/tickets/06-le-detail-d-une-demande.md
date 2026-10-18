# 06 — Le détail d'une demande

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/pages/admin/demandes/[id].astro`, `src/core/demandes/detail.ts`, `src/platform/demandes/magasin.ts`, `src/admin/textes.ts`, `docs/cahier-de-test.md`, `tests/unit/demandes/relecture-du-detail.test.ts`, `tests/integration/detail-d-une-demande.test.ts`

## Ce que ça livre

Depuis la liste, la date d'une demande mène à l'`Écran : Demande` (`/admin/demandes/<id>`), dans le cadre,
la rubrique « Demandes » marquée active. L'écran présente tout ce que la demande porte, de haut en bas :
1. le lien « ← Toutes les demandes » ;
2. le titre « Demande du 17 octobre 2026 à 14:05 » ; quand l'e-mail de la demande n'a pas pu partir, la
   pastille « E-mail non parti » et, dessous, « L'e-mail de cette demande n'a pas pu partir : elle n'est
   connue que d'ici. » ;
3. l'origine : « Formulaire : Devis gâteau », « Page : Contact » ;
4. les choix : une ligne par champ à choix renseigné, par exemple « Parfum : Fraise (10 €) », puis, pour un
   formulaire avec prix, « Total indicatif : 40 € (estimation non engageante) » ;
5. les coordonnées et le message : une ligne par champ renseigné, par exemple « Votre nom : Marie Dupont » ;
   un texte sur plusieurs lignes se présente en bloc sous son libellé, ses lignes gardées ;
6. la suite, en texte ; la liste déroulante qui la change est le ticket 07.

Chaque valeur paraît derrière l'étiquette de son champ, affichée telle quelle : aucun balisage n'y est
interprété (SEC-6).

**Une demande retirée ou inconnue ne montre aucune donnée.** L'écran porte le titre « Cette demande n'est
plus dans la liste », aucun détail, et le lien « Revenir aux demandes ». Le retrait n'existe pas encore
(ticket 08) : les tests sèment directement une demande retirée, `etat = 'retiree'` et colonnes du visiteur
nulles.

**Le produit n'efface rien de lui-même** (FR-079) : une demande reçue il y a plus d'un an figure toujours
dans la liste et se présente toujours entière dans son détail.

Sans session, l'écran mène à l'écran de connexion sans rendre aucune donnée de demande. Aucun terme de
développeur ne paraît (FR-117).

**Décisions à respecter (D2, D5 de l'approche ; ADR-0007, I2, I5, I6) :**
- **La page.** `src/pages/admin/demandes/[id].astro`, derrière `verifierSession` (ADR-0007, I6). Sans
  session → `Astro.redirect('/admin/connexion')`, avant toute lecture. Rendue dans `GabaritCadre` avec
  `rubrique="demandes"`. Rendu serveur seul dans ce ticket : aucun îlot, aucun script.
- **La lecture.** `obtenirDemande(db, id)` dans `src/platform/demandes/magasin.ts`, requête préparée. Une
  demande `retiree` ou absente rend « inconnue », et la page répond 404 avec le texte de la demande retirée.
- **La relecture tolérante du détail.** `relireDetail(json)`, dans `src/core/demandes/detail.ts` (pur, I2),
  n'accepte que la forme posée par `composerDetail` (ticket 01) : des tableaux de lignes faites de chaînes
  et de prix entiers bornés. Toute autre forme rend un détail vide, sans lever d'erreur : une ligne corrompue
  s'affiche vide, jamais comme une erreur.
- **Aucun HTML composé (I5).** Un texte long se rend ligne par ligne, un élément par ligne, en nœuds de
  texte ; interpolation échappée d'Astro seulement ; aucun `set:html`.
- **Les prix.** `formaterPrix` (`src/core/formulaires/prix.ts`) suivi de « € » ; date par
  `src/core/demandes/date.ts` (ticket 03).
- **Les textes** vivent dans `src/admin/textes.ts` : titre, lien de retour, mention d'e-mail, « Total
  indicatif », texte de la demande retirée.
- **SC-06h** se prouve sur une demande semée avec une date de réception de plus d'un an, après une
  nouvelle demande envoyée, une lecture des deux écrans et une publication (patron de
  `tests/integration/publier-en-un-geste.test.ts`).
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : un message de
  plusieurs lignes se lit ligne à ligne au téléphone, sans défilement horizontal.
- **Cas limites à couvrir :** `detail` corrompu en base (JSON illisible, forme inattendue) affiché vide ;
  formulaire sans prix (pas de ligne de total) ; choix multiple à plusieurs options ; texte long avec une
  ligne vide au milieu ; identifiant inconnu ; identifiant d'une demande retirée.

**Hors périmètre :**
- la liste déroulante de la suite (ticket 07) ;
- le bouton « Retirer cette demande » (ticket 08).

## Critères
- [ ] Quand l'éditrice ouvre la demande qui porte « Fraise » (10 €), « 10 parts » (30 €), « Anniversaire », le nom « Marie Dupont » et l'adresse « marie@exemple.fr », l'écran porte sa date de réception, « Devis gâteau », « Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Occasion : Anniversaire », un total indicatif de 40 €, « Votre nom : Marie Dupont » et « Votre adresse e-mail : marie@exemple.fr »   (SC-06a)
- [ ] Quand la demande porte dans « Votre message » un texte de trois lignes, l'écran présente ces trois lignes, l'une sous l'autre, sous le libellé « Votre message »   (SC-06b)
- [ ] Quand l'éditrice ouvre une demande dont l'e-mail n'a pas pu partir, l'écran porte la mention que l'e-mail de cette demande n'a pas pu partir   (SC-06c)
- [ ] Quand l'éditrice ouvre l'adresse du détail d'une demande qu'elle a retirée, l'écran dit que cette demande n'est plus dans la liste, n'en montre aucune donnée, et mène à la liste des demandes   (SC-06d)
- [ ] Quand une demande porte, dans son adresse e-mail ou dans « Votre nom », des caractères `<`, `>`, `&` ou des guillemets, le détail les affiche comme du texte, et aucun balisage n'est interprété   (SC-06e)
- [ ] Quand l'`Écran : Demande` est demandé sans session ouverte, l'écran de connexion s'ouvre, et la réponse ne porte aucune donnée de demande   (SC-06f)
- [ ] Quand l'`Écran : Cadre de l'administration` est affiché, la barre latérale montre les cinq rubriques, la rubrique de l'écran courant marquée active (« Mes pages » sur la liste des pages et sur l'éditeur d'une page, « Médias » sur la bibliothèque et sur la fiche d'une image, « Réglages » sur l'écran des réglages, « Formulaires » sur la liste des formulaires et sur l'écran d'un formulaire, « Demandes » sur la liste des demandes et sur le détail d'une demande)   (SC-06g)
- [ ] Quand des demandes sont présentes depuis plus d'un an, sans aucun geste de l'éditrice, elles figurent toujours dans la liste, chacune avec tout son détail   (SC-06h)
