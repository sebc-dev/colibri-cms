# PRD — ColibriCMS

| | |
|---|---|
| **Statut** | Draft |
| **Créé** | 2026-07-17 |
| **Trace vers** | [docs/brief.md](./brief.md) |
| **Consommé par** | [docs/stack.md](./stack.md) |
| **Périmètre** | V1 |

> Ce document dit **quoi**, jamais **comment**. Aucun choix technique n'y figure : ils vivent dans [stack.md](./stack.md) et les [ADR](./adr/README.md).

---

## Concepts

Trois mots portent tout le produit. Ils sont définis ici une fois et employés tels quels partout ensuite.

- **Gabarit** — la structure d'un type de page, définie par l'intégrateur. Il déclare une liste ordonnée de zones typées. Exemple : le gabarit « accueil » déclare une accroche, une photo héros, un texte de présentation et une galerie.
- **Zone** — un emplacement éditable nommé et typé à l'intérieur d'un gabarit. C'est l'unité que l'éditrice modifie.
- **Page** — une instance de gabarit portant une valeur pour chacune de ses zones.

La conséquence porteuse : **l'éditrice modifie des valeurs de zones, jamais la structure d'une page.** La mise en page appartient au gabarit, donc à l'intégrateur. C'est ce qui rend `SC-003` atteignable.

Le constructeur de formulaires ajoute quatre concepts, cloisonnés du reste. Le devis de la cliente n'est pas un objet dédié : c'est **un formulaire** parmi d'autres, qu'elle construit avec les briques ci-dessous.

- **Formulaire** — une composition, faite par l'éditrice, d'une suite ordonnée de champs, associée à une adresse e-mail de destination. Un formulaire suit le cycle brouillon/publication des pages.
- **Champ** — une brique d'un formulaire, d'un type parmi un ensemble fixé (texte court, e-mail, téléphone, zone de texte, choix unique, choix multiple, nombre, date, consentement). Un champ porte un libellé et peut être obligatoire.
- **Champ à prix** — un champ de type choix (unique/multiple) dont chaque choix porte un montant, ou un champ nombre porteur d'un prix unitaire. Les montants des champs à prix s'additionnent en un **total indicatif** calculé dans le navigateur du visiteur.
- **Soumission** — l'ensemble « réponses saisies + total indicatif éventuel + coordonnées » envoyé, à l'initiative du visiteur, à l'e-mail de destination du formulaire. Le produit ne la conserve pas.

Le **devis** de la cliente est donc un formulaire portant des champs à prix (goûts, décoration, options) : le produit ne connaît pas la notion de « devis », il connaît des formulaires.

---

## User stories (priorisées, niveau produit)

### US1 — Modifier le contenu d'une page (Priorité : P1)

L'éditrice ouvre l'espace d'édition, choisit une page dans la liste, modifie le texte d'une ou plusieurs zones, et enregistre. Le site public n'a pas encore changé.

- **Pourquoi cette priorité** : c'est le geste central du produit ; sans lui rien d'autre n'a de valeur. Trace vers `SC-003`.
- **Scénarios d'acceptation** :
  1. **Given** la page « Accueil » dont la zone « accroche » vaut « Pâtisserie artisanale », **When** l'éditrice remplace la valeur par « Cake design sur mesure » et enregistre, **Then** la page conserve « Cake design sur mesure » à la relecture, et le site public affiche toujours « Pâtisserie artisanale ».
  2. **Given** une page en cours d'édition avec des modifications non enregistrées, **When** l'éditrice quitte la page sans enregistrer, **Then** le système l'avertit que ses modifications seront perdues.
  3. **Given** une page ouverte en édition, **When** l'éditrice tape du texte sans enregistrer, **Then** aucune modification n'est persistée.

### US2 — Remplacer une image (Priorité : P1)

Sur une zone de type image, l'éditrice choisit un fichier depuis son ordinateur. L'image remplace la précédente une fois la page enregistrée.

- **Pourquoi cette priorité** : le média est la raison d'être du produit (`brief.md` § Problème) — c'est ce qu'aucune alternative gratuite ne fait sans exposer un dépôt de code. Trace vers `SC-003`.
- **Scénarios d'acceptation** :
  1. **Given** la zone « photo héros » portant une image, **When** l'éditrice téléverse un fichier JPEG de 3 Mo et enregistre, **Then** la zone porte la nouvelle image et l'ancienne n'est plus affichée sur cette page.
  2. **Given** une zone image, **When** l'éditrice tente de téléverser un fichier de 20 Mo, **Then** le système refuse et lui explique la limite dans un message sans terme technique.
  3. **Given** une zone image, **When** l'éditrice téléverse un fichier qui n'est pas une image, **Then** le système refuse et l'explique.

### US3 — Prévisualiser avant de publier (Priorité : P1)

Depuis une page modifiée mais non publiée, l'éditrice demande un aperçu et voit le rendu réel de sa page, tel que le visiteur la verra.

- **Pourquoi cette priorité** : c'est la condition de confiance de la publication. Sans aperçu fidèle, l'éditrice ne publiera pas seule. Trace vers `SC-003`.
- **Scénarios d'acceptation** :
  1. **Given** une page brouillon dont l'accroche a été modifiée, **When** l'éditrice demande l'aperçu, **Then** l'aperçu affiche l'accroche modifiée.
  2. **Given** une page brouillon, **When** une personne non autorisée tente d'accéder à son aperçu, **Then** l'accès est refusé.
  3. **Given** une page brouillon, **When** l'éditrice consulte l'aperçu, **Then** le site public reste inchangé.

### US4 — Publier (Priorité : P1)

L'éditrice déclare qu'une page est prête. Le site public se met à jour.

- **Pourquoi cette priorité** : sans publication, le travail d'édition n'atteint jamais le visiteur. Trace vers `SC-004`.
- **Scénarios d'acceptation** :
  1. **Given** une page brouillon dont l'accroche a été modifiée et enregistrée, **When** l'éditrice publie, **Then** le site public affiche l'accroche modifiée en moins de 5 minutes.
  2. **Given** une page jamais publiée, **When** un visiteur demande son adresse, **Then** le site public ne l'expose pas.
  3. **Given** une page publiée, **When** l'éditrice enregistre une nouvelle modification sans publier, **Then** le site public continue d'afficher la version publiée précédente.

### US5 — Accéder à l'espace d'édition (Priorité : P1)

L'éditrice accède à son espace d'édition depuis son adresse e-mail, sans avoir créé de compte ailleurs.

- **Pourquoi cette priorité** : prérequis de tout le reste, et contrainte produit ferme du brief. Trace vers `SC-006`.
- **Scénarios d'acceptation** :
  1. **Given** une éditrice autorisée, **When** elle s'authentifie avec son adresse e-mail, **Then** elle accède à la liste des pages sans avoir créé de compte supplémentaire.
  2. **Given** une personne non autorisée, **When** elle demande une adresse quelconque de l'espace d'édition, **Then** l'accès est refusé.

### US6 — Construire un formulaire (Priorité : P2)

Dans l'admin, l'éditrice compose un formulaire : elle ajoute des champs depuis une palette, les nomme, les ordonne, marque ceux qui sont obligatoires, et pour les champs à choix saisit les choix et leur prix. Elle fixe l'adresse e-mail de destination. Le formulaire suit le cycle brouillon puis publication.

- **Pourquoi cette priorité** : c'est le geste qui rend la cliente autonome sur sa génération de prospects (`SC-007`) ; mais il vient après le socle d'édition (P1), sans lequel le formulaire n'a pas de site où vivre. Trace vers `SC-003`, `SC-007`.
- **Scénarios d'acceptation** :
  1. **Given** un formulaire vide, **When** l'éditrice ajoute un champ « choix unique » nommé « Garniture » avec les choix « Chocolat » (+5 €) et « Vanille » (+0 €), marque le champ obligatoire, et publie, **Then** le site public affiche ce champ, ses choix, et fait entrer leur prix dans le total.
  2. **Given** un champ « Chocolat » à 5 € publié, **When** l'éditrice le passe à 6 € et enregistre sans publier, **Then** le site public continue de calculer avec 5 €.
  3. **Given** un prix, un libellé ou une adresse e-mail de destination invalide, **When** l'éditrice enregistre, **Then** le système le rejette et l'explique sans terme technique.
  4. **Given** un formulaire, **When** l'éditrice y ajoute, retire ou réordonne des champs, **Then** la structure du formulaire reflète ses changements — cette liberté de composition ne vaut QUE pour les formulaires, jamais pour la structure d'une page (FR-011).

### US7 — Remplir et envoyer un formulaire (Priorité : P2)

Sur le site public, le visiteur remplit un formulaire publié ; si le formulaire porte des champs à prix, un total indicatif se met à jour à mesure de ses choix. Il saisit ses coordonnées, consent à leur usage, et envoie. L'éditrice reçoit la soumission par e-mail.

- **Pourquoi cette priorité** : c'est la promesse de conversion du site, mais elle dépend de US6 (le formulaire doit exister) et du socle public. Trace vers `SC-007`.
- **Scénarios d'acceptation** :
  1. **Given** un formulaire avec « Chocolat » (+5 €) et « Deux étages » (+30 €), **When** le visiteur sélectionne les deux, **Then** le total affiché reflète la somme des montants, calculé sans requête serveur.
  2. **Given** un formulaire rempli et des coordonnées valides, **When** le visiteur envoie, **Then** l'éditrice reçoit un e-mail contenant les réponses, le total éventuel et les coordonnées, et le visiteur voit une confirmation.
  3. **Given** un formulaire avec un champ obligatoire laissé vide, **When** le visiteur tente d'envoyer, **Then** le système refuse et signale le champ manquant.
  4. **Given** un formulaire portant un champ de consentement, **When** le visiteur tente d'envoyer sans avoir consenti, **Then** le système refuse l'envoi et l'explique.
  5. **Given** un total affiché, **When** le visiteur le consulte, **Then** il est présenté comme indicatif et non contractuel.

---

## Exigences fonctionnelles (atomiques, testables)

### Accès

- **FR-001** : Le système DOIT refuser tout accès à l'espace d'édition à une personne non explicitement autorisée.
- **FR-002** : L'éditrice DOIT pouvoir s'authentifier sans créer de compte autre que son adresse e-mail.
- **FR-003** : Le système DOIT vérifier l'autorisation de l'auteur de la requête à chaque écriture, indépendamment du contrôle d'accès à l'entrée de l'espace d'édition.
- **FR-004** : Le système DOIT associer chaque écriture à l'identité de la personne qui l'a effectuée.
- **FR-005** : Toutes les personnes autorisées DOIVENT disposer des mêmes droits (aucun rôle différencié).

### Pages et zones

- **FR-006** : Le système DOIT présenter à l'éditrice la liste des pages du site.
- **FR-007** : Le système DOIT présenter chaque page comme la liste ordonnée des zones déclarées par son gabarit.
- **FR-008** : L'éditrice DOIT pouvoir modifier la valeur de chaque zone éditable d'une page.
- **FR-009** : Le système NE DOIT PAS permettre à l'éditrice de créer une page.
- **FR-010** : Le système NE DOIT PAS permettre à l'éditrice de supprimer une page.
- **FR-011** : Le système NE DOIT PAS permettre à l'éditrice d'ajouter, de supprimer ou de réordonner les zones d'une page.
- **FR-012** : Chaque zone DOIT déclarer un type parmi : texte simple, texte riche, image, galerie d'images, vidéo, bouton d'appel à l'action (CTA), liste d'éléments structurés (répéteur).
- **FR-013** : Le système DOIT rejeter toute valeur de zone qui ne respecte pas le type déclaré de cette zone.
- **FR-014** : Le système DOIT rejeter toute valeur de zone soumise par un client, sans jamais se fier à la validation effectuée côté navigateur.
- **FR-015** : Dans une zone de type texte riche, l'éditrice DOIT pouvoir appliquer une mise en forme parmi : gras, italique, liste à puces, liste numérotée, lien.
- **FR-016** : Le système NE DOIT PAS permettre à l'éditrice d'influer sur la mise en page (positionnement, dimensions, couleurs, polices) depuis une zone.
- **FR-017** : Le système NE DOIT enregistrer une modification QUE sur une action d'enregistrement explicite de l'éditrice.
- **FR-018** : Le système DOIT avertir l'éditrice avant qu'elle ne quitte une page portant des modifications non enregistrées.
- **FR-019** : Chaque page DOIT porter un état parmi : brouillon, publiée.
- **FR-053** : Un gabarit DOIT pouvoir déclarer une zone comme obligatoire ; le système DOIT refuser la publication d'une page dont une zone obligatoire est vide.
- **FR-054** : Lorsqu'il refuse une publication pour zone obligatoire vide, le système DOIT indiquer à l'éditrice la ou les zones concernées, sans terme technique.
- **FR-066** : Pour une zone de type galerie, l'éditrice DOIT pouvoir ajouter, retirer et réordonner les images.
- **FR-067** : L'éditrice DOIT pouvoir saisir, pour chaque image d'une galerie, un texte alternatif (cf. FR-025) et une légende facultative.
- **FR-068** : Le mode d'affichage d'une galerie (grille, carrousel, etc.) DOIT être déclaré par le gabarit ; l'éditrice NE DOIT PAS pouvoir le modifier (corollaire de FR-016).
- **FR-069** : Pour une zone de type vidéo, l'éditrice DOIT pouvoir désigner la vidéo à afficher.
- **FR-070** : Pour une zone de type bouton d'appel à l'action, l'éditrice DOIT pouvoir saisir un libellé et une destination (lien).
- **FR-074** : Pour une zone de type liste d'éléments structurés (répéteur), le gabarit DOIT déclarer la forme d'un élément : ses sous-champs, le type de chacun, et son caractère obligatoire.
- **FR-075** : L'éditrice DOIT pouvoir ajouter, retirer et réordonner les éléments d'une zone répéteur.
- **FR-076** : Chaque sous-champ d'un élément DOIT être d'un type de base — texte simple, texte riche, image, vidéo, bouton d'action, ou date — et être validé selon ce type ; un sous-champ NE DOIT PAS être lui-même un répéteur ou une galerie (pas d'imbrication en v1).
- **FR-077** : L'éditrice NE DOIT PAS pouvoir modifier la forme d'un élément (ajouter, retirer ou retyper un sous-champ) : elle est déclarée par le gabarit (corollaire de FR-011 et FR-016).

### Réglages transverses du site

- **FR-071** : L'éditrice DOIT pouvoir gérer les liens vers les réseaux sociaux affichés sur le site.
- **FR-072** : L'éditrice DOIT pouvoir gérer les coordonnées de contact (par exemple téléphone, e-mail, adresse) affichées sur le site.
- **FR-073** : Les réglages transverses DOIVENT suivre le même cycle brouillon/publication que les pages ; une modification non publiée NE DOIT PAS affecter le site public.

### Médias

- **FR-020** : L'éditrice DOIT pouvoir téléverser une image depuis la zone qu'elle est en train d'éditer.
- **FR-021** : Le système DOIT accepter les images aux formats JPEG, PNG, WebP et AVIF.
- **FR-022** : Le système DOIT refuser tout fichier dont le type réel n'est pas une image d'un format accepté, indépendamment de son nom et de son extension.
- **FR-023** : Le système DOIT refuser tout fichier dépassant 8 Mo.
- **FR-024** : Le système DOIT expliquer tout refus de fichier à l'éditrice dans un message dépourvu de terme technique.
- **FR-025** : L'éditrice DOIT pouvoir saisir un texte alternatif décrivant chaque image qu'elle téléverse.
- **FR-026** : Le système DOIT servir au visiteur des images redimensionnées et encodées pour l'affichage, sans que l'éditrice ait à s'en préoccuper.
- **FR-059** : En cas d'échec d'un téléversement, le système DOIT en informer l'éditrice et lui permettre de réessayer sans perdre les autres modifications de la page en cours.

### Référencement

- **FR-027** : L'éditrice DOIT pouvoir saisir, pour chaque page, le titre affiché par les moteurs de recherche.
- **FR-028** : L'éditrice DOIT pouvoir saisir, pour chaque page, la description affichée par les moteurs de recherche.
- **FR-029** : L'éditrice DOIT pouvoir choisir, pour chaque page, l'image affichée lors d'un partage sur les réseaux sociaux.

### Aperçu

- **FR-030** : L'éditrice DOIT pouvoir consulter l'aperçu d'une page dans l'état enregistré, publiée ou non.
- **FR-031** : L'aperçu DOIT produire le même rendu que le site public pour un contenu identique.
- **FR-032** : Le système DOIT refuser l'accès à l'aperçu à une personne non autorisée.
- **FR-033** : La consultation d'un aperçu NE DOIT PAS modifier le site public.

### Publication

- **FR-034** : L'éditrice DOIT pouvoir publier une page par une action explicite, distincte de l'enregistrement.
- **FR-035** : Le site public NE DOIT exposer QUE les pages à l'état publié.
- **FR-036** : Le site public DOIT refléter une publication en moins de 5 minutes.
- **FR-037** : La publication DOIT être la seule action de l'éditrice qui déclenche une mise à jour du site public.
- **FR-038** : Le système DOIT enregistrer la date de première publication de chaque page.
- **FR-055** : Si une image référencée par une page à publier est introuvable, le système DOIT faire échouer la mise à jour du site, la signaler, et laisser le site en ligne inchangé.
- **FR-056** : Si le quota de mises à jour de l'offre d'hébergement est épuisé, le système DOIT conserver la modification de l'éditrice et la mettre en ligne dès qu'une mise à jour redevient possible.
- **FR-057** : Lorsqu'une publication ne peut aboutir immédiatement pour cause de quota, le système DOIT l'expliquer à l'éditrice sans terme technique.
- **FR-058** : Après une ou plusieurs publications, le site public DOIT finir par refléter le dernier état publié ; le système NE garantit PAS une mise à jour distincte par publication.

### Site public

- **FR-039** : Le site public DOIT servir ses **pages de contenu** sans exécution de code applicatif au moment de la visite. Seul l'envoi d'une soumission de formulaire (FR-061) fait exception.

### Constructeur de formulaires — côté éditrice

- **FR-040** : L'éditrice DOIT pouvoir créer, modifier et supprimer des formulaires.
- **FR-041** : L'éditrice DOIT pouvoir composer un formulaire en ajoutant, retirant et réordonnant ses champs. *(Cette liberté de composition vaut pour les formulaires uniquement, et ne contredit pas FR-011 qui l'interdit pour les pages.)*
- **FR-042** : Chaque champ DOIT être d'un type parmi : texte court, e-mail, téléphone, zone de texte, choix unique, choix multiple, nombre, date, consentement.
- **FR-043** : L'éditrice DOIT pouvoir donner un libellé à chaque champ et le marquer obligatoire ou facultatif.
- **FR-044** : Pour un champ de type choix (unique ou multiple), l'éditrice DOIT pouvoir définir les choix proposés et, pour chacun, un montant.
- **FR-045** : Pour un champ de type nombre, l'éditrice DOIT pouvoir définir un prix unitaire optionnel ; la contribution du champ au total vaut alors la valeur saisie multipliée par ce prix unitaire.
- **FR-046** : L'éditrice DOIT pouvoir fixer, par formulaire, l'adresse e-mail à laquelle les soumissions sont acheminées.
- **FR-047** : Les formulaires DOIVENT suivre le même cycle brouillon/publication que les pages ; une modification non publiée NE DOIT PAS affecter le site public.
- **FR-048** : Le système DOIT rejeter toute définition de formulaire invalide soumise par l'éditrice (libellé vide, montant non valide, adresse e-mail de destination mal formée), sans se fier à la validation côté navigateur.

### Constructeur de formulaires — côté visiteur

- **FR-049** : Le site public DOIT présenter chaque formulaire publié tel que composé par l'éditrice.
- **FR-050** : Lorsqu'un formulaire porte des champs à prix, le site public DOIT afficher un total calculé dans le navigateur du visiteur, sans requête serveur, mis à jour à chaque changement de sélection.
- **FR-051** : Le système DOIT présenter tout total affiché comme indicatif et non contractuel.
- **FR-052** : Le système NE DOIT PAS permettre l'envoi d'une soumission tant qu'un champ obligatoire est vide, et DOIT signaler le ou les champs manquants.
- **FR-060** : Lorsqu'un formulaire porte un champ de consentement, le système DOIT refuser l'envoi tant que le visiteur n'a pas consenti, et l'expliquer.
- **FR-061** : À l'envoi d'une soumission, le système DOIT acheminer à l'adresse e-mail du formulaire les réponses saisies, le total éventuel et les coordonnées du visiteur.
- **FR-062** : Le système DOIT confirmer au visiteur que sa soumission a été envoyée, et l'informer en cas d'échec de l'envoi.
- **FR-063** : Le système DOIT résister aux envois automatisés de soumissions.
- **FR-064** : Le système NE DOIT PAS conserver une soumission au-delà de son acheminement.
- **FR-065** : Le système NE DOIT PAS collecter du visiteur d'autre donnée que celle que le formulaire demande explicitement.

---

## Cas limites

Les comportements ci-dessous sont **décidés** ; ils fondent des exigences citées entre parenthèses.

- **Zone obligatoire laissée vide.** Un gabarit déclare quelles zones sont obligatoires. Le système **refuse la publication** tant qu'une zone obligatoire est vide et indique laquelle, sans terme technique. (FR-053, FR-054)
- **Image manquante à la mise à jour.** Si une zone image d'une page à publier pointe vers une image introuvable, la mise à jour du site **échoue et le signale** ; le site en ligne reste dans son état précédent. Une image manquante est traitée comme une anomalie, pas comme un cas métier. (FR-055)
- **Quota d'hébergement atteint.** Si le quota de mises à jour de l'offre gratuite est épuisé, la publication **n'aboutit pas immédiatement** : le système l'explique à l'éditrice sans jargon, conserve sa modification, et la met en ligne dès que possible. (FR-056, FR-057)
- **Deux onglets, une éditrice.** La v1 n'a qu'une éditrice (aucun verrouillage — voir « NON inclus »), mais deux onglets restent atteignables par accident. Décision assumée : **la dernière écriture enregistrée gagne**, sans avertissement. Acceptable tant que l'éditrice est unique ; à revoir dès qu'un deuxième éditeur entre en périmètre.
- **Publication pendant une mise à jour du site.** Une publication garantit seulement que le site finira par refléter **le dernier état publié** ; deux publications rapprochées peuvent être absorbées par une seule mise à jour. (FR-058)
- **Gabarit modifié après coup.** Si l'intégrateur ajoute une zone à un gabarit dont des pages existent, ces pages restent publiées **en l'état** ; la nouvelle zone est vide, et si elle est obligatoire, la page ne pourra être **republier** qu'une fois la zone renseignée (par FR-053). Aucune valeur par défaut n'est inventée.
- **Téléversement interrompu.** Si la connexion tombe pendant l'envoi d'une image, l'éditrice **est informée de l'échec** et peut réessayer sans que la page perde ses autres modifications. (FR-059, FR-024)

---

## NON inclus (frontière de périmètre)

Reprend et affine le périmètre EXCLU du [brief](./brief.md#périmètre). Ce sont des décisions, pas des lacunes.

- **Articles, auteurs, tags, et tout contenu daté ou parcourable en flux.** La cliente n'a pas de blog.
- **Création et suppression de pages par l'éditrice** — donc aussi : gestion des adresses de pages, unicité des adresses, édition du menu de navigation, pages orphelines.
- **Composition de page par l'éditrice** : elle ne choisit ni n'ordonne les sections. La structure appartient au gabarit.
- **Contrôle de la mise en page** depuis l'éditeur (couleurs, polices, dimensions, positionnement).
- **Édition simultanée par plusieurs personnes** et les mécanismes qu'elle exigerait (verrouillage, résolution de conflit).
- **Rôles et permissions différenciés.**
- **Réutilisation d'un média déjà téléversé** (sélecteur de médias existants).
- **Médiathèque** : grille, recherche, suppression de fichiers, gestion globale.
- **Historique des versions et restauration.**
- **Contenu dynamique pour le visiteur**, hors soumission de formulaire : les pages de contenu ne consultent aucune donnée au moment de la visite.
- **Conservation et suivi des soumissions** : pas d'écran de suivi, pas de base de prospects, pas de statut « traité ». La soumission est acheminée par e-mail puis oubliée du produit (FR-064).
- **Total ferme ou contractuel** : le total affiché est indicatif (FR-051) ; le produit ne gère aucun tarif opposable.
- **Logique de formulaire avancée** : champs conditionnels, formulaires multi-étapes, règles de prix conditionnelles (paliers, remises, combinaisons). Le total est une simple somme des contributions des champs.
- **Upload de fichier par le visiteur** dans un formulaire.
- **Paiement en ligne, prise de rendez-vous, panier** : un formulaire produit une soumission, pas une commande.
- **Commentaires et recherche sur le site public.**
- **Mutualisation multi-clients** : un déploiement dessert un seul site.

---

## Pistes post-V1 (backlog suivi)

Distinct de « NON inclus » (frontière ferme) : ces idées sont **jugées bonnes et volontairement reportées**, à reprendre quand un besoin réel les justifie. Consignées pour ne pas les perdre.

**Types de zone additionnels**
- Carte / plan (adresse géolocalisée — fréquent pour un commerce physique).
- Horaires d'ouverture.
- Imbrication de zones : un répéteur ou une galerie à l'intérieur d'un élément de répéteur (exclu en v1, cf. FR-076).
- Note en étoiles comme sous-champ d'avis (non retenu pour ce carrousel-ci).

**Éléments transverses éditables**
- Menu de navigation éditable par la cliente (v1 : figé par l'intégrateur).
- Pied de page enrichi : mentions légales, liens éditables (v1 : réseaux sociaux + coordonnées seulement, cf. FR-071/FR-072).
- Bandeau temporaire (promotion, fermeture exceptionnelle).

**Constructeur de formulaires — capacités avancées**
- Champs conditionnels, formulaires multi-étapes.
- Règles de prix conditionnelles (paliers, remises, combinaisons) au-delà de la somme simple.
- Upload de fichier par le visiteur (ex. photo de modèle de gâteau).

**Contenu éditorial** (reporté au premier client qui a un blog)
- Articles, auteurs, tags ; le seam `ContentTypeDescriptor` (ADR-0004) est déjà posé pour les accueillir.

**Confort d'édition**
- Réutilisation d'un média déjà téléversé (sélecteur), médiathèque (grille, recherche).
- Historique des versions et restauration.
- Édition simultanée multi-éditeurs + rôles différenciés.

---

## Critères de succès mesurables

Repris du [brief](./brief.md#critères-de-succès-mesurables), inchangés — le PRD ne les redéfinit pas, il les sert.

- **SC-001** — 0 €/mois par site en conditions nominales. *Servi par* : FR-017, FR-026, FR-037, FR-039.
- **SC-002** — Le site de la pâtisserie est en production sur ColibriCMS.
- **SC-003** — L'éditrice modifie une page et remplace une image, seule, sans aide, du premier coup. *Servi par* : FR-006 à FR-020, FR-024, FR-030.
- **SC-004** — Une publication est visible en ligne en moins de 5 minutes. *Servi par* : FR-034, FR-036.
- **SC-005** — Lighthouse Performance ≥ 95 en mobile sur le HTML bâti des pages de contenu. *Servi par* : FR-026, FR-039.
- **SC-006** — Zéro compte créé par l'éditrice hors son adresse e-mail. *Servi par* : FR-002.
- **SC-007** — La cliente construit un formulaire de devis elle-même, et une demande composée par un visiteur lui parvient par e-mail, avec réponses, total et coordonnées. *Servi par* : FR-040 à FR-046, FR-061.
- **SC-008** — Une nouvelle version de ColibriCMS se déploie sur une instance cliente existante sans code spécifique au client, et sans perte de son contenu. *Servi par* : l'architecture, non un FR de surface — voir [stack.md](./stack.md) et l'ADR de stratégie de mise à jour de la flotte.

---

## Questions ouvertes

Tous les `[NEEDS CLARIFICATION]` de la première rédaction ont été tranchés. Deux points restent à cadrer, mais **en aval** — ni l'un ni l'autre ne bloque le socle d'édition (P1) :

- **Anti-spam des soumissions (FR-063).** Le *quoi* est fixé (résister aux envois automatisés) ; le *comment* touche à la frontière statique du site public et relève de [stack.md](./stack.md) / d'un ADR, pas du PRD.
- **Conformité RGPD.** FR-060 et FR-065 posent le consentement et la minimisation ; une mention d'information (politique de confidentialité) et la base légale de l'acheminement par e-mail restent à cadrer avec la cliente avant mise en production. Non bloquant pour l'implémentation du chemin nominal.

Rappel de séquencement : le constructeur de formulaires (US6, US7, FR-040 à FR-052 et FR-060 à FR-065) est **P2**. Il dépend du socle P1 (édition, médias, publication) et ne doit pas être entamé avant que celui-ci soit en état.
