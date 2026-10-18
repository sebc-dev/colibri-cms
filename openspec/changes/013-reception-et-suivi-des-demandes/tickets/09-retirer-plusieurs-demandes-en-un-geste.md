# 09 — Retirer plusieurs demandes en un geste depuis la liste

**Bloqué par :** 08
**Vérif :** tdd
**Fichiers :** `src/pages/admin/demandes/retrait.ts`, `src/core/demandes/retrait.ts`, `src/platform/demandes/magasin.ts`, `src/admin/ilots-svelte-5/EcranDemandes.svelte`, `src/admin/ilots-svelte-5/DialogueRetrait.svelte`, `src/admin/textes.ts`, `docs/cahier-de-test.md`, `tests/unit/demandes/retrait-groupe.test.ts`, `tests/integration/retrait-groupe.test.ts`, `tests/parcours/demandes-retrait-groupe.parcours.ts`

## Ce que ça livre

Sur la liste, filtrée ou non, l'éditrice sélectionne plusieurs demandes et les retire en un seul geste
(FR-074) : quarante demandes indésirables arrivées d'un coup se retirent sans les ouvrir une à une.

- **La sélection.** Chaque ligne porte une case à cocher, nommée pour un lecteur d'écran par sa demande :
  « Sélectionner la demande du 17 octobre 2026 à 14:05, marie@exemple.fr ». Au téléphone, la case mesure au
  moins 44 px.
- **La barre de sélection** paraît dès qu'une case est cochée : « 3 demandes sélectionnées », « Tout
  sélectionner sur cette page » ou « Tout désélectionner », et le bouton « Retirer… ». Sur écran étroit,
  elle reste visible en bas de l'écran. « Tout sélectionner sur cette page » ne prend que les demandes de
  la page affichée.
- **Le dialogue** est celui du retrait d'une demande (ticket 08), titré « Retirer 3 demandes ? ». Il dit,
  avant que rien ne soit retiré, combien de demandes vont l'être et que ce que leurs visiteurs ont envoyé
  sera effacé définitivement ; le motif « Demande indésirable » dit qu'elles ne seront plus comptées nulle
  part. Le motif choisi porte sur toute la sélection.
- **Tout ou rien.** Un retrait groupé s'applique à toute la sélection ou à aucune de ses demandes, et ne
  touche aucune autre demande. En échec, aucune n'est retirée, et le dialogue dit « Le retrait n'a pas pu
  se faire : aucune demande n'a été retirée. Réessayez dans quelques instants. »
- **Après le retrait**, l'écran se recharge sur le même filtre, à la même page bornée : la liste et les
  nombres sont relus.

Chaque retrait efface ce que le ticket 08 efface : un retrait ordinaire ne garde que le formulaire
d'origine et la suite de chaque demande ; un retrait indésirable efface chaque demande entière, qui ne
compte plus nulle part. Aucun terme de développeur ne paraît (FR-117).

**Décisions à respecter (ADR-0030, D8 de l'approche ; ADR-0009, I4, I5, I14, I17) :**
- **La route du ticket 08 accepte désormais de 1 à 50 identifiants** textuels distincts, soit une page au
  plus. Zéro identifiant, 51 identifiants, ou un identifiant répété → 400. La règle vit dans
  `src/core/demandes/retrait.ts` (pur).
- **Une seule écriture.** Toute la sélection passe par une `db.batch` (transaction D1). Une erreur ne retire
  aucune demande : la route répond 500, que l'écran présente comme un échec. La contrainte `check` de la
  table fait échouer le lot entier si une colonne du visiteur était oubliée.
- **Conditions d'écriture.** `id in (…) and etat = 'presente'`, en marqueurs `?` comptés, jamais par
  concaténation. Une demande déjà retirée dans la sélection est laissée telle quelle, jamais comptée deux
  fois ; un identifiant inconnu mêlé à des connus n'empêche pas le retrait des autres.
- **L'îlot de la liste.** `EcranDemandes.svelte` (ticket 07) gagne les cases et la barre ; il réemploie
  `DialogueRetrait.svelte`. Contrôles natifs `<input type="checkbox">` stylés par les tokens (I14) ; aucun
  composant nouveau du registre (ADR-0009) ; liaison de texte seulement (I5).
- **Les textes** vivent dans `src/admin/textes.ts` : intitulé de la case, barre de sélection, titre au
  pluriel du dialogue.
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : la barre de
  sélection au téléphone ; quarante demandes indésirables d'une même page retirées en quatre actions
  (« Tout sélectionner sur cette page », « Retirer… », « Demande indésirable », « Retirer »).
- **Parcours.** `tests/parcours/garde-politique.ts` fait échouer tout parcours qui heurte la politique de
  l'administration.
- **Doubles.** Une panne de la base par un déclencheur `raise(abort)` posé sur la mise à jour ou la
  suppression dans `demandes`, puis retiré.
- **Cas limites à couvrir :** 1 et 50 identifiants ; 0 et 51 refusés ; identifiant répété ; identifiant
  inconnu mêlé à des connus ; demande déjà retirée dans la sélection ; panne de la base au milieu du lot
  (aucune retirée) ; retrait depuis une liste filtrée, puis retour sur le même filtre.

**Hors périmètre :**
- un retrait qui dépasse une page (au-delà de 50 demandes, un geste par page) ;
- toute corbeille, toute annulation de retrait, tout effacement d'office.

## Critères
- [ ] Quand l'éditrice sélectionne trois demandes, choisit le motif indésirable, et confirme, les trois demandes ne paraissent plus dans la liste, et la base n'en porte plus rien   (SC-09a)
- [ ] Quand l'éditrice demande à retirer trois demandes, avant que rien ne soit retiré, l'écran dit que trois demandes vont être retirées et que ce que leurs visiteurs ont envoyé sera effacé définitivement   (SC-09b)
- [ ] Quand l'éditrice retire deux des quatorze demandes présentes, les douze autres restent dans la liste, chacune avec son détail et sa suite inchangés   (SC-09c)
- [ ] Quand l'éditrice confirme le retrait de trois demandes et que leur effacement n'aboutit pas, aucune des trois n'est retirée, et l'écran dit que le retrait n'a pas pu se faire, sans terme de développeur   (SC-09d)
- [ ] Quand, après deux retraits ordinaires qui font lire 12 demandes, 3 commandes et 2 retirées, quarante demandes automatisées de « Devis gâteau » font lire 52 demandes, et que l'éditrice les sélectionne et les retire en un geste en les déclarant indésirables, l'écran affiche exactement 12 demandes, 3 commandes et 2 retirées pour le site, et les mêmes nombres qu'avant leur arrivée pour chaque formulaire   (SC-09e)
