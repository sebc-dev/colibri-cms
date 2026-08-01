# PRD — ColibriCMS

| | |
|---|---|
| **Statut** | accepted |
| **Créé** | 2026-07-17 |
| **Révisé** | 2026-08-01 |
| **Trace vers** | [docs/brief.md](./brief.md) |
| **Consommé par** | [docs/stack.md](./stack.md) |
| **Périmètre** | V1 |

> Ce document dit **quoi**, jamais **comment**. Aucun choix technique n'y figure : ils vivent dans [stack.md](./stack.md) et les [ADR](./adr/README.md).

> **Numérotation** — les identifiants `FR-xxx` de ce document sont **stables** : une exigence amendée conserve son numéro, une exigence nouvelle prend le numéro libre suivant. Aucune renumérotation, jamais — les specs de feature y adossent leur traçabilité (`_Requirements:_`), et cette traçabilité est le mécanisme de confiance du projet. *(À ne pas confondre avec les `FR-xxx` d'une spec de feature, qui vivent dans son propre espace de noms — ainsi ceux de `specs/001-ci-quality-gate/`.)*

---

## Concepts

Trois mots portent tout le produit. Ils sont définis ici une fois et employés tels quels partout ensuite.

- **Gabarit** — la structure d'un type de page, définie par l'intégrateur. Il déclare une liste ordonnée de zones typées. Exemple : le gabarit « accueil » déclare une accroche, une photo héros, un texte de présentation et une galerie.
- **Zone** — un emplacement éditable nommé et typé à l'intérieur d'un gabarit. C'est l'unité que l'éditrice modifie.
- **Page** — une instance de gabarit portant une valeur pour chacune de ses zones.

La conséquence porteuse : **l'éditrice modifie des valeurs de zones, jamais la structure d'une page.** La mise en page appartient au gabarit, donc à l'intégrateur. C'est ce qui rend `SC-003` atteignable.

Un quatrième mot en découle, et il gouverne tout le cycle de vie :

- **Contenu en cours / contenu en ligne** — une page porte **deux** contenus : celui que l'éditrice modifie, et celui que le visiteur voit. **Enregistrer** n'agit que sur le premier ; **publier** recopie le premier dans le second. Le site public ne sert jamais que le second. La même mécanique vaut pour les formulaires et les réglages transverses. C'est ce qui permet à l'éditrice d'enregistrer un travail inachevé sans conséquence publique.

Le constructeur de formulaires ajoute quatre concepts, cloisonnés du reste. Le devis de la cliente n'est pas un objet dédié : c'est **un formulaire** parmi d'autres, qu'elle construit avec les briques ci-dessous.

- **Formulaire** — une composition, faite par l'éditrice, d'une suite ordonnée de champs, associée à une adresse e-mail de destination. Un formulaire suit le cycle brouillon/publication des pages. Il apparaît sur le site à l'emplacement qu'un gabarit lui réserve : une **zone de type formulaire**, dans laquelle l'éditrice désigne lequel de ses formulaires afficher.
- **Champ** — une brique d'un formulaire, d'un type parmi un ensemble fixé (texte court, e-mail, téléphone, zone de texte, choix unique, choix multiple, nombre, date, consentement). Un champ porte un libellé et peut être obligatoire.
- **Champ à prix** — un champ de type choix (unique/multiple) dont chaque choix porte un montant, ou un champ nombre porteur d'un prix unitaire. Les montants des champs à prix s'additionnent en un **total indicatif**, affiché dans le navigateur du visiteur et recalculé par le système à la réception.
- **Soumission** — l'ensemble « réponses saisies + total indicatif éventuel + coordonnées » envoyé, à l'initiative du visiteur, à l'e-mail de destination du formulaire. Le produit ne la conserve pas au-delà de son acheminement.

Le **devis** de la cliente est donc un formulaire portant des champs à prix (goûts, décoration, options) : le produit ne connaît pas la notion de « devis », il connaît des formulaires.

Tous les montants du produit sont exprimés en **euros**.

---

## User stories (priorisées, niveau produit)

### US1 — Modifier le contenu d'une page (Priorité : P1)

L'éditrice ouvre l'espace d'édition, choisit une page dans la liste, modifie le texte d'une ou plusieurs zones, et enregistre. Le site public n'a pas encore changé.

- **Pourquoi cette priorité** : c'est le geste central du produit ; sans lui rien d'autre n'a de valeur. Trace vers `SC-003`.
- **Scénarios d'acceptation** :
  1. **Given** la page « Accueil » dont la zone « accroche » vaut « Pâtisserie artisanale », **When** l'éditrice remplace la valeur par « Cake design sur mesure » et enregistre, **Then** la page conserve « Cake design sur mesure » à la relecture, et le site public affiche toujours « Pâtisserie artisanale ».
  2. **Given** une page en cours d'édition avec des modifications non enregistrées, **When** l'éditrice quitte la page sans enregistrer, **Then** le système l'avertit que ses modifications seront perdues.
  3. **Given** une page ouverte en édition, **When** l'éditrice tape du texte sans enregistrer, **Then** aucune modification n'est persistée.
  4. **Given** une page publiée dont l'éditrice a enregistré des modifications sans les publier, **When** elle consulte la liste des pages, **Then** cette page lui est signalée comme portant des modifications non mises en ligne.
  5. **Given** une page publiée portant des modifications enregistrées non publiées, **When** l'éditrice demande à abandonner ses modifications, **Then** la page retrouve le contenu actuellement en ligne.

### US2 — Remplacer une image (Priorité : P1)

Sur une zone de type image, l'éditrice choisit un fichier depuis son ordinateur. L'image remplace la précédente une fois la page enregistrée.

- **Pourquoi cette priorité** : le média est la raison d'être du produit (`brief.md` § Problème) — c'est ce qu'aucune alternative gratuite ne fait sans exposer un dépôt de code. Trace vers `SC-003`.
- **Scénarios d'acceptation** :
  1. **Given** la zone « photo héros » portant une image, **When** l'éditrice téléverse un fichier JPEG de 3 Mo et enregistre, **Then** la zone porte la nouvelle image et l'ancienne n'est plus affichée sur cette page.
  2. **Given** une zone image, **When** l'éditrice téléverse une photo de studio de 20 Mo, **Then** le système la réduit lui-même et l'accepte, sans rien demander à l'éditrice.
  3. **Given** une zone image, **When** l'éditrice téléverse un fichier qui n'est pas une image d'un format accepté, **Then** le système refuse, l'explique sans terme technique, et lui indique le geste concret à faire.

### US3 — Prévisualiser avant de publier (Priorité : P1)

Depuis une page modifiée mais non publiée, l'éditrice demande un aperçu et voit le rendu réel de sa page, tel que le visiteur la verra.

- **Pourquoi cette priorité** : c'est la condition de confiance de la publication. Sans aperçu fidèle, l'éditrice ne publiera pas seule. Trace vers `SC-003`.
- **Scénarios d'acceptation** :
  1. **Given** une page brouillon dont l'accroche a été modifiée, **When** l'éditrice demande l'aperçu, **Then** l'aperçu affiche l'accroche modifiée.
  2. **Given** une page portant des modifications non enregistrées, **When** l'éditrice demande l'aperçu, **Then** le système enregistre ses modifications dans le même geste, en l'annonçant, et l'aperçu les affiche.
  3. **Given** une page brouillon, **When** une personne non autorisée tente d'accéder à son aperçu, **Then** l'accès est refusé.
  4. **Given** une page brouillon, **When** l'éditrice consulte l'aperçu, **Then** le site public reste inchangé.

### US4 — Publier (Priorité : P1)

L'éditrice déclare qu'une page est prête. Le site public se met à jour.

- **Pourquoi cette priorité** : sans publication, le travail d'édition n'atteint jamais le visiteur. Trace vers `SC-004`.
- **Scénarios d'acceptation** :
  1. **Given** une page brouillon dont l'accroche a été modifiée et enregistrée, **When** l'éditrice publie, **Then** le site public affiche l'accroche modifiée en moins de 5 minutes.
  2. **Given** une page jamais publiée, **When** un visiteur demande son adresse, **Then** le site public ne l'expose pas.
  3. **Given** une page publiée, **When** l'éditrice enregistre une nouvelle modification sans publier, **Then** le site public continue d'afficher la version publiée précédente — y compris si une autre page est publiée entre-temps.
  4. **Given** une publication demandée, **When** l'éditrice revient dans l'espace d'édition plus tard, **Then** elle peut lire si la mise en ligne est en cours, aboutie, ou en échec et pourquoi.
  5. **Given** une page publiée devenue obsolète, **When** l'éditrice la retire du site, **Then** le site public ne l'expose plus, la navigation ne la propose plus, et son contenu reste disponible dans l'espace d'édition.

### US5 — Accéder à l'espace d'édition (Priorité : P1)

L'éditrice accède à son espace d'édition depuis son adresse e-mail, sans avoir créé de compte ailleurs.

- **Pourquoi cette priorité** : prérequis de tout le reste, et contrainte produit ferme du brief. Trace vers `SC-006`.
- **Scénarios d'acceptation** :
  1. **Given** une éditrice autorisée, **When** elle s'authentifie avec son adresse e-mail, **Then** elle accède à la liste des pages sans avoir créé de compte supplémentaire.
  2. **Given** une personne non autorisée, **When** elle demande une adresse quelconque de l'espace d'édition, **Then** l'accès est refusé.

### US6 — Construire un formulaire (Priorité : P2)

Dans l'admin, l'éditrice compose un formulaire : elle ajoute des champs depuis une palette, les nomme, les ordonne, marque ceux qui sont obligatoires, et pour les champs à choix saisit les choix et leur prix. Elle fixe l'adresse e-mail de destination. Le formulaire suit le cycle brouillon puis publication, et elle le place sur une page en le désignant dans une zone prévue à cet effet.

- **Pourquoi cette priorité** : c'est le geste qui rend la cliente autonome sur sa génération de prospects (`SC-007`) ; mais il vient après le socle d'édition (P1), sans lequel le formulaire n'a pas de site où vivre. Trace vers `SC-003`, `SC-007`.
- **Scénarios d'acceptation** :
  1. **Given** un formulaire vide, **When** l'éditrice ajoute un champ « choix unique » nommé « Garniture » avec les choix « Chocolat » (+5 €) et « Vanille » (+0 €), marque le champ obligatoire, publie, et désigne ce formulaire dans la zone formulaire de la page « Devis », **Then** le site public affiche ce champ, ses choix, et fait entrer leur prix dans le total.
  2. **Given** un champ « Chocolat » à 5 € publié, **When** l'éditrice le passe à 6 € et enregistre sans publier, **Then** le site public continue de calculer avec 5 €.
  3. **Given** un prix, un libellé ou une adresse e-mail de destination invalide, **When** l'éditrice enregistre, **Then** le système le rejette et l'explique sans terme technique.
  4. **Given** un formulaire, **When** l'éditrice y ajoute, retire ou réordonne des champs, **Then** la structure du formulaire reflète ses changements — cette liberté de composition ne vaut QUE pour les formulaires, jamais pour la structure d'une page (FR-011).
  5. **Given** un formulaire désigné par une page publiée, **When** l'éditrice tente de le supprimer, **Then** le système lui indique où il est utilisé et lui demande de confirmer.
  6. **Given** un formulaire dont l'adresse de destination vient d'être fixée, **When** l'éditrice demande un message de test, **Then** elle peut constater elle-même que les soumissions lui parviendront.

### US7 — Remplir et envoyer un formulaire (Priorité : P2)

Sur le site public, le visiteur remplit un formulaire publié ; si le formulaire porte des champs à prix, un total indicatif se met à jour à mesure de ses choix. Il saisit ses coordonnées, consent à leur usage, et envoie. L'éditrice reçoit la soumission par e-mail et peut y répondre directement.

- **Pourquoi cette priorité** : c'est la promesse de conversion du site, mais elle dépend de US6 (le formulaire doit exister) et du socle public. Trace vers `SC-007`.
- **Scénarios d'acceptation** :
  1. **Given** un formulaire avec « Chocolat » (+5 €) et « Deux étages » (+30 €), **When** le visiteur sélectionne les deux, **Then** le total affiché reflète la somme des montants, calculé sans requête serveur.
  2. **Given** un formulaire rempli et des coordonnées valides, **When** le visiteur envoie, **Then** l'éditrice reçoit un e-mail contenant les réponses, le total éventuel et les coordonnées, le visiteur en reçoit une copie, et le visiteur voit une confirmation.
  3. **Given** une demande reçue par e-mail, **When** l'éditrice y répond depuis sa messagerie, **Then** sa réponse parvient au visiteur sans qu'elle ait à recopier son adresse.
  4. **Given** un formulaire avec un champ obligatoire laissé vide, **When** le visiteur tente d'envoyer, **Then** le système refuse et signale le champ manquant.
  5. **Given** un formulaire portant un champ de consentement, **When** le visiteur tente d'envoyer sans avoir consenti, **Then** le système refuse l'envoi et l'explique.
  6. **Given** une soumission forgée qui contourne la validation du navigateur — champ obligatoire vide, consentement absent, champ inconnu, valeur hors bornes, **When** elle parvient au système, **Then** celui-ci la rejette.
  7. **Given** un total affiché, **When** le visiteur le consulte, **Then** il est présenté comme indicatif et non contractuel.

---

## Exigences fonctionnelles (atomiques, testables)

### Accès

- **FR-001** : Le système DOIT refuser tout accès à l'espace d'édition à une personne non explicitement autorisée.
- **FR-002** : L'éditrice DOIT pouvoir s'authentifier sans créer de compte autre que son adresse e-mail.
- **FR-003** : Le système DOIT vérifier l'autorisation de l'auteur de la requête à chaque écriture, indépendamment du contrôle d'accès à l'entrée de l'espace d'édition.
- **FR-004** : Le système DOIT associer chaque écriture à l'identité de la personne qui l'a effectuée. *(Cette information n'a **aucune surface** en v1 — ni écran, ni historique, ni journal consultable : elle prépare le multi-éditeur, hors périmètre. Ne rien construire pour l'exposer.)*
- **FR-005** : Toutes les personnes autorisées DOIVENT disposer des mêmes droits (aucun rôle différencié).

### Cycle de vie du contenu

- **FR-078** : Une page DOIT porter deux contenus distincts : le **contenu en cours**, que l'éditrice modifie, et le **contenu en ligne**, que le visiteur voit. L'enregistrement n'affecte que le contenu en cours ; la publication recopie le contenu en cours dans le contenu en ligne. Le site public NE DOIT servir QUE le contenu en ligne. La même règle s'applique aux formulaires et aux réglages transverses.
- **FR-079** : Le système DOIT indiquer à l'éditrice, dans la liste des pages, celles dont le contenu en cours diffère du contenu en ligne.
- **FR-080** : L'éditrice DOIT pouvoir abandonner les modifications non publiées d'une page et revenir au contenu en ligne. *(Seul retour arrière offert par le produit ; l'historique des versions reste hors périmètre.)*
- **FR-081** : L'éditrice DOIT pouvoir publier un formulaire et les réglages transverses par une action explicite, au même titre qu'une page (FR-034).
- **FR-082** : L'ensemble des pages d'un site DOIT être défini par l'intégrateur, hors de l'espace d'édition. Une page ainsi définie apparaît à l'éditrice à l'état **jamais publiée**, ses zones vides, et n'est exposée au visiteur qu'une fois publiée par elle.
- **FR-083** : L'éditrice DOIT pouvoir retirer du site public une page publiée, par une action explicite. La page redevient modifiable et son contenu est conservé.
- **FR-092** : Le système NE DOIT PAS écraser une modification enregistrée depuis que l'éditrice a ouvert la page, sans l'en avertir.

### Pages et zones

- **FR-006** : Le système DOIT présenter à l'éditrice la liste des pages du site.
- **FR-007** : Le système DOIT présenter chaque page comme la liste ordonnée des zones déclarées par son gabarit.
- **FR-008** : L'éditrice DOIT pouvoir modifier la valeur de chaque zone éditable d'une page.
- **FR-009** : Le système NE DOIT PAS permettre à l'éditrice de créer une page.
- **FR-010** : Le système NE DOIT PAS permettre à l'éditrice de supprimer une page.
- **FR-011** : Le système NE DOIT PAS permettre à l'éditrice d'ajouter, de supprimer ou de réordonner les zones d'une page.
- **FR-012** : Chaque zone DOIT déclarer un type parmi : texte simple, texte riche, image, galerie d'images, vidéo, bouton d'appel à l'action (CTA), date, formulaire, liste d'éléments structurés (répéteur).
- **FR-013** : Le système DOIT rejeter toute valeur de zone qui ne respecte pas le type déclaré de cette zone.
- **FR-014** : Le système DOIT rejeter toute valeur de zone soumise par un client, sans jamais se fier à la validation effectuée côté navigateur.
- **FR-015** : Dans une zone de type texte riche, l'éditrice DOIT pouvoir appliquer une mise en forme parmi : gras, italique, liste à puces, liste numérotée, lien. La destination d'un lien DOIT être choisie entre **une page du site** et **une adresse externe** ; l'éditrice ne saisit jamais l'adresse interne d'une page.
- **FR-016** : Le système NE DOIT PAS permettre à l'éditrice d'influer sur la mise en page (positionnement, dimensions, couleurs, polices) depuis une zone.
- **FR-017** : Le système NE DOIT enregistrer une modification QUE sur une action d'enregistrement explicite de l'éditrice. *Cette règle porte sur le contenu des pages, des formulaires et des réglages. Le **téléversement d'un fichier** est un geste distinct : il est effectué et conservé immédiatement, et n'apparaît sur le site qu'une fois la page enregistrée puis publiée.*
- **FR-018** : Le système DOIT avertir l'éditrice avant qu'elle ne quitte une page portant des modifications non enregistrées.
- **FR-019** : Chaque page DOIT porter un état parmi : **jamais publiée**, **publiée**, **publiée avec modifications en attente**, **retirée du site**. *(Le quatrième état est celui d'une page publiée puis retirée par FR-083 : elle n'est ni « jamais publiée » — elle l'a été — ni « publiée » — elle ne l'est plus. Ces états sont **dérivés**, jamais saisis.)*
- **FR-053** : Un gabarit DOIT pouvoir déclarer une zone comme obligatoire ; le système DOIT refuser la publication d'une page dont une zone obligatoire est vide.
- **FR-054** : Lorsqu'il refuse une publication pour zone obligatoire vide, le système DOIT indiquer à l'éditrice la ou les zones concernées, sans terme technique.
- **FR-066** : Pour une zone de type galerie, l'éditrice DOIT pouvoir ajouter, retirer et réordonner les images.
- **FR-067** : L'éditrice DOIT pouvoir saisir, pour chaque image d'une galerie, un texte alternatif (cf. FR-025) et une légende facultative.
- **FR-068** : Le mode d'affichage d'une galerie (grille, carrousel, etc.) DOIT être déclaré par le gabarit ; l'éditrice NE DOIT PAS pouvoir le modifier (corollaire de FR-016).
- **FR-069** : Pour une zone de type vidéo, l'éditrice DOIT pouvoir désigner une vidéo hébergée chez un fournisseur pris en charge — YouTube ou Vimeo — en collant son adresse. Le système DOIT proposer une vignette issue du fournisseur, que l'éditrice DOIT pouvoir remplacer par une image de son choix. Le téléversement d'un fichier vidéo est hors périmètre.
- **FR-070** : Pour une zone de type bouton d'appel à l'action, l'éditrice DOIT pouvoir saisir un libellé et choisir une destination entre **une page du site** et **une adresse externe**.
- **FR-086** : Pour une zone de type formulaire, l'éditrice DOIT pouvoir désigner lequel de ses formulaires publiés y est affiché. Un même formulaire PEUT être désigné par plusieurs pages.
- **FR-074** : Pour une zone de type liste d'éléments structurés (répéteur), le gabarit DOIT déclarer la forme d'un élément : ses sous-champs, le type de chacun, et son caractère obligatoire.
- **FR-075** : L'éditrice DOIT pouvoir ajouter, retirer et réordonner les éléments d'une zone répéteur.
- **FR-076** : Chaque sous-champ d'un élément DOIT être d'un type de base — texte simple, texte riche, image, vidéo, bouton d'action, ou date — et être validé selon ce type ; un sous-champ NE DOIT PAS être lui-même un répéteur, une galerie ou un formulaire (pas d'imbrication en v1).
- **FR-077** : L'éditrice NE DOIT PAS pouvoir modifier la forme d'un élément (ajouter, retirer ou retyper un sous-champ) : elle est déclarée par le gabarit (corollaire de FR-011 et FR-016).

### Navigation et liens

- **FR-084** : La navigation du site NE DOIT présenter au visiteur QUE des pages publiées. L'intégrateur déclare l'ordre et les libellés du menu ; le système en écarte à la mise en ligne toute page non publiée.
- **FR-085** : Le système DOIT connaître, pour chaque page et chaque formulaire, les endroits du site qui le référencent. Avant une dépublication ou une suppression, il DOIT indiquer à l'éditrice où l'élément est utilisé et lui demander de confirmer. À la mise en ligne, un lien ou une zone désignant une page ou un formulaire non publié NE DOIT PAS être rendu au visiteur — jamais de lien mort, et jamais d'échec de mise en ligne pour ce motif.

### Réglages transverses du site

- **FR-071** : L'éditrice DOIT pouvoir gérer les liens vers les réseaux sociaux affichés sur le site.
- **FR-072** : L'éditrice DOIT pouvoir gérer les coordonnées de contact (par exemple téléphone, e-mail, adresse) affichées sur le site.
- **FR-073** : Les réglages transverses DOIVENT suivre le même cycle brouillon/publication que les pages (FR-078) ; une modification non publiée NE DOIT PAS affecter le site public.

### Médias

- **FR-020** : L'éditrice DOIT pouvoir téléverser une image depuis la zone qu'elle est en train d'éditer.
- **FR-021** : Le système DOIT accepter les images aux formats JPEG, PNG, WebP et AVIF.
- **FR-022** : Le système DOIT refuser tout fichier dont le type réel n'est pas une image d'un format accepté, indépendamment de son nom et de son extension.
- **FR-088** : Lorsqu'une image dépasse la taille acceptée, le système DOIT la réduire pour l'éditrice plutôt que de la refuser. Le refus est réservé aux fichiers qui ne sont pas une image d'un format accepté.
- **FR-023** : Le système DOIT refuser tout fichier dépassant 8 Mo. *(Butée serveur, conformément à FR-014 ; dans le parcours nominal, FR-088 fait qu'elle n'est jamais atteinte.)*
- **FR-024** : Le système DOIT expliquer tout refus de fichier à l'éditrice dans un message dépourvu de terme technique, et lui indiquer le **geste concret** qui le résout — par exemple, pour une photo au format d'un iPhone : « Réglages → Appareil photo → Formats → Le plus compatible ».
- **FR-025** : L'éditrice DOIT pouvoir saisir un texte alternatif décrivant chaque image qu'elle téléverse.
- **FR-026** : Le système DOIT servir au visiteur des images redimensionnées et encodées pour l'affichage, sans que l'éditrice ait à s'en préoccuper.
- **FR-059** : En cas d'échec d'un téléversement, le système DOIT en informer l'éditrice et lui permettre de réessayer sans perdre les autres modifications de la page en cours.

### Référencement

- **FR-027** : L'éditrice DOIT pouvoir saisir, pour chaque page, le titre affiché par les moteurs de recherche.
- **FR-028** : L'éditrice DOIT pouvoir saisir, pour chaque page, la description affichée par les moteurs de recherche.
- **FR-029** : L'éditrice DOIT pouvoir choisir, pour chaque page, l'image affichée lors d'un partage sur les réseaux sociaux.

### Aperçu

- **FR-030** : L'éditrice DOIT pouvoir consulter l'aperçu d'une page dans son état enregistré, publiée ou non. Lorsqu'elle demande un aperçu alors que des modifications ne sont pas enregistrées, le système DOIT les enregistrer dans le même geste, en l'annonçant — l'enregistrement reste ainsi explicite (FR-017).
- **FR-031** : L'aperçu DOIT utiliser les mêmes gabarits et les mêmes styles que le site public, de sorte que la mise en page, les textes et le cadrage des images soient ceux que verra le visiteur. L'encodage et la taille des fichiers d'image servis PEUVENT différer.
- **FR-032** : Le système DOIT refuser l'accès à l'aperçu à une personne non autorisée.
- **FR-033** : La consultation d'un aperçu NE DOIT PAS modifier le site public.

### Publication

- **FR-034** : L'éditrice DOIT pouvoir publier une page par une action explicite, distincte de l'enregistrement.
- **FR-035** : Le site public NE DOIT exposer QUE les pages à l'état publié. Une page non publiée n'est pas bâtie : son adresse ne répond pas, et aucune redirection n'est fabriquée pour elle.
- **FR-036** : En conditions nominales, le site public DOIT refléter une publication en moins de 5 minutes, mesuré du clic « Publier » à la visibilité du contenu. *(Le report pour quota — FR-056 — et la première mise en ligne d'un site font exception.)*
- **FR-037** : La publication DOIT être la seule action de l'éditrice qui déclenche une mise à jour du site public.
- **FR-038** : Le système DOIT enregistrer, pour chaque page, la date de sa **première** publication et celle de sa **dernière** mise en ligne. Le gabarit décide laquelle exposer au visiteur.
- **FR-087** : Après une publication, le système DOIT indiquer à l'éditrice où en est la mise en ligne — en cours, en ligne, ou échouée avec son motif — et cette information DOIT rester consultable lorsqu'elle revient plus tard dans l'espace d'édition.
- **FR-093** : Le délai de mise en ligne d'une publication NE DOIT PAS croître avec le volume de médias déjà publiés : seul ce qui a changé depuis la dernière mise en ligne est retraité.
- **FR-055** : Si une image référencée par une page à publier est introuvable, le système DOIT faire échouer la mise à jour du site, la signaler (FR-087), et laisser le site en ligne inchangé.
- **FR-056** : Si le quota de mises à jour de l'offre d'hébergement est épuisé, le système DOIT conserver la modification de l'éditrice et la mettre en ligne dès qu'une mise à jour redevient possible, **sans intervention de sa part**.
- **FR-057** : Lorsqu'une publication ne peut aboutir immédiatement pour cause de quota, le système DOIT l'expliquer à l'éditrice sans terme technique.
- **FR-058** : Après une ou plusieurs publications, le site public DOIT finir par refléter le dernier état publié ; le système NE garantit PAS une mise à jour distincte par publication.

### Site public

- **FR-039** : Le site public DOIT servir ses **pages de contenu** sans aucun **traitement serveur** au moment de la visite. Le code exécuté dans le navigateur du visiteur — calcul du total, validation de saisie, lecture d'une vidéo — n'est pas concerné. Seul l'envoi d'une soumission de formulaire (FR-061) déclenche un traitement serveur.
- **FR-089** : Une page de contenu NE DOIT charger aucun code tiers avant une action explicite du visiteur. *(Couvre la lecture d'une vidéo comme le dispositif anti-spam de FR-063 ; garantit SC-005 sur **toutes** les pages, y compris celles qui portent un formulaire.)*

### Constructeur de formulaires — côté éditrice

- **FR-040** : L'éditrice DOIT pouvoir créer, modifier et supprimer des formulaires. La suppression d'un formulaire référencé par une page est soumise à FR-085.
- **FR-041** : L'éditrice DOIT pouvoir composer un formulaire en ajoutant, retirant et réordonnant ses champs. *(Cette liberté de composition vaut pour les formulaires uniquement, et ne contredit pas FR-011 qui l'interdit pour les pages.)*
- **FR-042** : Chaque champ DOIT être d'un type parmi : texte court, e-mail, téléphone, zone de texte, choix unique, choix multiple, nombre, date, consentement.
- **FR-043** : L'éditrice DOIT pouvoir donner un libellé à chaque champ et le marquer obligatoire ou facultatif.
- **FR-044** : Pour un champ de type choix (unique ou multiple), l'éditrice DOIT pouvoir définir les choix proposés et, pour chacun, un montant.
- **FR-045** : Pour un champ de type nombre, l'éditrice DOIT pouvoir définir une valeur minimale et une valeur maximale, ainsi qu'un prix unitaire optionnel ; la contribution du champ au total vaut alors la valeur saisie multipliée par ce prix unitaire. La valeur **maximale est obligatoire** : le système DOIT refuser la publication d'un formulaire dont un champ nombre n'en porte pas, et DOIT en proposer une à la création du champ. La valeur minimale est facultative ; en son absence, le système DOIT borner la valeur à **0** — un champ à prix ne peut jamais faire **baisser** le total. Le système DOIT refuser une soumission dont la valeur sort des bornes.
- **FR-046** : L'éditrice DOIT pouvoir fixer, par formulaire, l'adresse e-mail à laquelle les soumissions sont acheminées. Cette adresse DOIT être **confirmée** avant de pouvoir recevoir des soumissions ; tant qu'elle ne l'est pas, le système DOIT l'indiquer à l'éditrice et l'empêcher de publier le formulaire. *(Contrainte réelle du service d'acheminement, pas un choix de produit : aucun fournisseur n'accepte d'écrire à une adresse arbitraire sans preuve qu'elle est légitime. FR-096 — le message de test — est le geste par lequel l'éditrice constate que la confirmation a bien pris.)*
- **FR-096** : L'éditrice DOIT pouvoir déclencher elle-même l'envoi d'un message de test vers l'adresse de destination d'un formulaire, afin de constater qu'elle reçoit bien ce qui lui est destiné.
- **FR-047** : Les formulaires DOIVENT suivre le même cycle brouillon/publication que les pages (FR-078) ; une modification non publiée NE DOIT PAS affecter le site public.
- **FR-048** : Le système DOIT rejeter toute définition de formulaire invalide soumise par l'éditrice (libellé vide, montant non valide, bornes incohérentes, adresse e-mail de destination mal formée), sans se fier à la validation côté navigateur.

### Constructeur de formulaires — côté visiteur

- **FR-049** : Le site public DOIT présenter chaque formulaire publié tel que composé par l'éditrice, à l'emplacement où elle l'a désigné (FR-086).
- **FR-050** : Lorsqu'un formulaire porte des champs à prix, le site public DOIT afficher un total calculé dans le navigateur du visiteur, sans requête serveur, mis à jour à chaque changement de sélection.
- **FR-051** : Le système DOIT présenter tout total affiché comme indicatif et non contractuel.
- **FR-052** : Le système NE DOIT PAS permettre l'envoi d'une soumission tant qu'un champ obligatoire est vide, et DOIT signaler le ou les champs manquants.
- **FR-060** : Lorsqu'un formulaire porte un champ de consentement, le système DOIT refuser l'envoi tant que le visiteur n'a pas consenti, et l'expliquer.
- **FR-090** : À réception d'une soumission, le système DOIT la valider contre la **définition publiée** du formulaire — champs existants, types respectés, champs obligatoires renseignés, bornes respectées, consentement donné — et rejeter toute soumission non conforme, sans jamais se fier à la validation effectuée côté navigateur.
- **FR-091** : Le total figurant dans le message acheminé DOIT être **recalculé** par le système à partir de la définition publiée du formulaire et des réponses reçues, et non repris de la requête du visiteur. Le message DOIT mentionner les prix utilisés pour ce calcul.
- **FR-061** : À l'envoi d'une soumission, le système DOIT acheminer à l'adresse e-mail du formulaire les réponses saisies, le total éventuel et les coordonnées du visiteur. *(Amendé le 2026-08-01 : la promesse d'une **réponse parvenant directement au visiteur** est retirée. L'adresse du visiteur figure dans le corps du message ; y répondre suppose de la recopier.)*
- ~~**FR-095**~~ : *retirée le 2026-08-01, reportée en post-V1.* Énoncé : « Le système DOIT adresser au visiteur une copie de sa soumission, lorsque le formulaire recueille son adresse e-mail. » Motif : l'acheminement reste dans l'écosystème Cloudflare, dont l'offre gratuite n'écrit qu'aux adresses de destination vérifiées du compte — le visiteur est un destinataire quelconque. *(Le numéro n'est pas réattribué : la règle de numérotation interdit toute renumérotation.)*
- **FR-062** : Le système DOIT confirmer au visiteur que sa soumission a été envoyée, et l'informer en cas d'échec de l'envoi.
- **FR-063** : Le système DOIT résister aux envois automatisés de soumissions, dans le respect de FR-089.
- **FR-064** : Le système NE DOIT PAS conserver une soumission au-delà de son acheminement **réussi**. En cas d'échec, il DOIT la retenir le temps de réessayer **et de permettre à l'éditrice d'agir** (FR-097 à FR-099), et l'effacer dès la livraison, dès qu'elle l'a effacée, ou à l'expiration d'un délai borné — cette expiration étant **inconditionnelle**. *(Amendé le 2026-08-01 : la rétention devient consultable par l'éditrice. Ce qui est retenu reste le **message composé** — exactement ce qui aurait dû lui parvenir par e-mail —, et **uniquement pour les acheminements en échec** : une demande livrée ne laisse aucune trace. Ce n'est donc pas une base de prospects mais une **corbeille de courrier non distribué**, qui se vide par la livraison, par son geste, ou par l'échéance.)*
- **FR-094** : Un échec définitif d'acheminement DOIT être signalé à l'éditrice dans l'espace d'édition (FR-087), **avec son motif exprimé sans terme technique**.
- **FR-097** : L'éditrice DOIT pouvoir consulter le contenu d'une demande non acheminée, tant que celle-ci est retenue (FR-064).
- **FR-098** : L'éditrice DOIT pouvoir relancer l'acheminement d'une demande non acheminée.
- **FR-099** : L'éditrice DOIT pouvoir effacer elle-même une demande non acheminée, une fois qu'elle l'a relevée.
- **FR-065** : Le système NE DOIT PAS collecter **ni conserver** de donnée personnelle du visiteur au-delà de celles que le formulaire demande explicitement. Les données techniques strictement nécessaires à la lutte contre les envois automatisés et à l'acheminement du message ne sont pas conservées par le produit.

### Exigences transverses

*Ajoutées le 2026-08-01 à la suite de l'[audit de sécurité](./audit-securite-2026-08-01.md). Elles ne servent aucun écran en particulier : elles valent pour toutes les surfaces à la fois, ce qui est précisément la raison pour laquelle elles manquaient. Le **quoi** vit ici, le **comment** dans [stack.md](./stack.md) et les [ADR](./adr/README.md) — dont l'ADR de frontières de contenu hostile qu'elles fondent.*

**Contenu hostile et bornes des entrées**

- **FR-100** : Le système NE DOIT JAMAIS interpréter comme une instruction un contenu saisi par une éditrice ou par un visiteur. Tout contenu saisi DOIT être restitué comme du texte, sur toutes les surfaces où il réapparaît — site public, espace d'édition, aperçu, message acheminé. *(Exigence transverse : elle vaut pour le texte riche, les libellés de formulaire, les réponses d'un visiteur et les motifs d'échec. Le corollaire est qu'aucune surface n'est dispensée au motif qu'elle est privée : l'espace d'édition est la plus sensible, pas la moins.)*
- **FR-101** : Le système DOIT borner la longueur de chaque valeur qu'un visiteur soumet, ainsi que la taille totale d'une soumission, et DOIT refuser toute soumission qui dépasse ces bornes. *(Distinct de FR-045, qui borne la **valeur** d'un champ nombre pour la justesse du total : ici, il s'agit de la **taille** de ce qui entre, quel que soit le type de champ.)*
- **FR-102** : Le système DOIT borner le volume de soumissions qu'un formulaire accepte sur une période donnée, et refuser au-delà. *(Distinct de FR-063 : résister à l'automatisation et borner le volume sont deux propriétés différentes. Un dispositif anti-robot élève le coût unitaire d'une soumission sans le porter à l'infini ; il ne protège ni la boîte de réception de l'éditrice, ni le quota d'hébergement de SC-001.)*
- **FR-103** : Le système DOIT borner le volume total de médias qu'une instance peut accumuler, et informer l'éditrice avant que la limite ne soit atteinte. *(Le produit n'offre aucun geste de suppression de média — voir « Fichiers non référencés » en Cas limites : sans borne, l'accumulation est irréversible.)*

**Journalisation**

- **FR-104** : Le système NE DOIT PAS faire figurer le contenu d'une soumission, ni aucune donnée personnelle d'un visiteur, dans ses journaux techniques. *(FR-065 dit ce que le **produit** ne conserve pas ; cette exigence ferme la voie par laquelle la même donnée ressortirait ailleurs, avec une durée de rétention que le produit ne maîtrise pas.)*

**Information du visiteur** *(rapatriée en V1 le 2026-08-01)*

- **FR-105** : Tout site portant un formulaire DOIT exposer une information de confidentialité, accessible depuis chaque page qui porte un formulaire, énonçant la finalité de la collecte, le destinataire des demandes, la durée de rétention d'une demande non acheminée (FR-064), le recours à un sous-traitant d'hébergement et d'acheminement, les droits du visiteur et la base légale de l'acheminement.
- **FR-106** : L'éditrice DOIT pouvoir modifier le contenu de l'information de confidentialité depuis l'espace d'édition.
- **FR-107** : Tout site DOIT exposer des mentions légales, accessibles depuis chaque page. *(Obligation propre, indépendante de la protection des données : elle vaut même pour un site sans formulaire.)*
- **FR-108** : L'éditrice DOIT pouvoir modifier le contenu des mentions légales depuis l'espace d'édition.
- **FR-109** : Le système DOIT refuser la publication d'un formulaire tant que l'information de confidentialité n'est pas renseignée, et l'indiquer à l'éditrice. *(Même forme que FR-046 pour l'adresse de destination : la condition est vérifiée **avant** la mise en ligne, pas découverte après la première demande reçue.)*

**Accès**

- **FR-110** : L'éditrice DOIT disposer d'un geste explicite de déconnexion, qui met fin à sa session sans attendre son expiration. *(Une session dure 7 jours ; sur un poste partagé ou emprunté, son expiration naturelle n'est pas un recours.)*

---

## Cas limites

Les comportements ci-dessous sont **décidés** ; ils fondent des exigences citées entre parenthèses.

- **Zone obligatoire laissée vide.** Un gabarit déclare quelles zones sont obligatoires. Le système **refuse la publication** tant qu'une zone obligatoire est vide et indique laquelle, sans terme technique. (FR-053, FR-054)
- **Image manquante à la mise à jour.** Si une zone image d'une page à publier pointe vers une image introuvable, la mise à jour du site **échoue et le signale** ; le site en ligne reste dans son état précédent. Une image manquante est traitée comme une anomalie, pas comme un cas métier — à la différence d'un lien vers une page dépubliée, qui est un choix légitime de l'éditrice et n'interrompt rien (FR-085). (FR-055, FR-087)
- **Quota d'hébergement atteint.** Si le quota de mises à jour de l'offre gratuite est épuisé, la publication **n'aboutit pas immédiatement** : le système l'explique à l'éditrice sans jargon, conserve sa modification, et la met en ligne dès que possible, sans rien lui demander. (FR-056, FR-057, FR-087)
- **Deux onglets, une éditrice.** La v1 n'a qu'une éditrice (aucune édition simultanée — voir « NON inclus »), mais deux onglets restent atteignables par accident : l'admin ouvert sur l'ordinateur le matin, repris sur le téléphone le soir. Décision : le système **refuse l'écrasement silencieux**. Il détecte qu'une page a été enregistrée ailleurs depuis son ouverture, l'en informe sans terme technique et lui propose de recharger la page à jour. Aucune fusion automatique n'est tentée ; la résolution de conflit et l'édition simultanée restent hors périmètre. (FR-092)
- **Publication pendant une mise à jour du site.** Une publication garantit seulement que le site finira par refléter **le dernier état publié** ; deux publications rapprochées peuvent être absorbées par une seule mise à jour. (FR-058)
- **Première mise en ligne d'un site.** La première mise en ligne, ou la première après un changement de gabarit qui invalide tout le contenu bâti, **peut dépasser 5 minutes**. C'est un événement d'intégrateur, pas un geste d'éditrice : FR-036 ne s'y applique pas. (FR-036, FR-093)
- **Gabarit modifié après coup.** Si l'intégrateur ajoute une zone à un gabarit dont des pages existent, ces pages restent publiées **en l'état** — leur contenu en ligne, figé à leur dernière publication, ne bouge pas (FR-078). La nouvelle zone est vide dans le contenu en cours, et si elle est obligatoire, la page ne pourra être **republiée** qu'une fois la zone renseignée (par FR-053). Aucune valeur par défaut n'est inventée.
- **Téléversement interrompu.** Si la connexion tombe pendant l'envoi d'une image, l'éditrice **est informée de l'échec** et peut réessayer sans que la page perde ses autres modifications. (FR-059, FR-024)
- **Fichiers non référencés.** Un fichier téléversé puis abandonné (page quittée sans enregistrer, image remplacée) **reste stocké** : le produit n'offre aucun geste de suppression de média (médiathèque hors périmètre), et n'en récupère aucun automatiquement en v1. C'est une décision, pas un oubli — la réduction des images à l'entrée (FR-088) maintient le volume très en deçà du quota gratuit, et le nettoyage éventuel relève de l'intégrateur. *Toute récupération automatique future devra tenir compte des **deux** contenus (FR-078) : une image absente du contenu en cours peut être servie par le contenu en ligne.*
- **Acheminement d'une soumission en échec.** L'échec d'un envoi d'e-mail se manifeste souvent **après** que le visiteur a reçu sa confirmation. Le système retient alors la soumission le temps de réessayer (FR-064) et signale un échec définitif à l'éditrice dans l'espace d'édition, **avec son motif** (FR-094). *(Amendé le 2026-08-01 en deux temps. **Un** : avec le retrait de FR-095, le visiteur n'a plus de copie de sa demande — un échec définitif est donc **silencieux pour lui**, il a lu « bien envoyée » et n'a aucun moyen de savoir que rien n'est arrivé. **Deux** : le filet est reconstitué du côté de l'éditrice. La demande n'est plus seulement pleurée, elle est **récupérable** — elle reste consultable (FR-097), réexpédiable après correction de l'adresse (FR-098) et effaçable par elle (FR-099). Sur la cause la plus probable — une adresse de destination erronée — la demande arrive donc réellement, au lieu d'être perdue. Ce qui reste hors d'atteinte : l'échec qu'elle ne regarde jamais, et l'expiration du délai borné.)*
- **Adresse de destination valide mais erronée.** Une faute de frappe dans son propre domaine produit une adresse **bien formée** que FR-048 ne peut pas détecter, et toutes les demandes tomberaient dans le vide. Deux parades se renforcent : l'adresse doit être **confirmée** avant de servir (FR-046) — une adresse erronée ne le sera jamais, et l'échec devient visible **avant** la publication plutôt qu'après la première demande perdue — et le **message de test** (FR-096) permet à l'éditrice de le constater elle-même. Une vérification de délivrabilité automatique reste en post-V1.
- **Définition de formulaire modifiée entre l'affichage et l'envoi.** Le site public étant statique et potentiellement en cache, le visiteur peut envoyer une soumission calculée sur des prix qui viennent de changer. Le système **achemine** la demande avec le total recalculé (FR-091) sans rien signaler au visiteur — le total est indicatif par nature (FR-051) — et l'e-mail mentionne les prix utilisés.

---

## NON inclus (frontière de périmètre)

Reprend et affine le périmètre EXCLU du [brief](./brief.md#périmètre). Ce sont des décisions, pas des lacunes.

- **Articles, auteurs, tags, et tout contenu daté ou parcourable en flux.** La cliente n'a pas de blog.
- **Suppression de pages par l'éditrice**, et gestion des adresses de pages, unicité des adresses, édition du menu de navigation, pages orphelines. *(La **création** de page a été déplacée en Pistes post-V1 : l'idée est bonne, seulement pas en v1. L'éditrice dispose en revanche de la dépublication — FR-083 — qui lui donne la maîtrise de ce qui est en ligne.)*
- **Composition de page par l'éditrice** : elle ne choisit ni n'ordonne les sections. La structure appartient au gabarit.
- **Contrôle de la mise en page** depuis l'éditeur (couleurs, polices, dimensions, positionnement).
- **Édition simultanée par plusieurs personnes** et les mécanismes qu'elle exigerait (verrouillage, fusion, résolution de conflit). Le refus d'écrasement de FR-092 n'en est pas un : il signale, il ne réconcilie pas.
- **Rôles et permissions différenciés.**
- **Réutilisation d'un média déjà téléversé** (sélecteur de médias existants).
- **Médiathèque** : grille, recherche, suppression de fichiers, gestion globale — et par conséquent, aucune récupération automatique de l'espace de stockage en v1.
- **Historique des versions et restauration.** Le seul retour arrière est l'abandon des modifications non publiées (FR-080).
- **Hébergement de fichiers vidéo.** Les vidéos sont désignées chez un fournisseur (FR-069) ; le produit n'en stocke ni n'en sert aucune.
- **Mesure d'audience embarquée dans le site.** Aucun code de mesure n'est chargé sur les pages publiques. La connaissance du trafic vient des statistiques serveur de la plateforme d'hébergement, consultables par l'intégrateur. Une mesure côté site, si elle devenait nécessaire, devrait respecter FR-089 — ce qui la rend structurellement difficile, et c'est délibéré.
- **Contenu dynamique pour le visiteur**, hors soumission de formulaire : les pages de contenu ne consultent aucune donnée au moment de la visite.
- **Conservation et suivi des soumissions acheminées** : pas de base de prospects, pas d'historique des demandes reçues, pas de statut « traité », pas de recherche. *(Précisé le 2026-08-01 : la corbeille de FR-064 n'est pas une exception à cette frontière. Elle ne contient que les demandes **non acheminées**, elle ne garde rien de ce qui est parti, et une demande n'en sort que pour disparaître — livrée, effacée, ou expirée. Une demande acheminée avec succès n'y entre jamais.)*
- **Total ferme ou contractuel** : le total affiché est indicatif (FR-051) ; le produit ne gère aucun tarif opposable.
- **Multi-devise.** Tous les montants sont en euros.
- **Logique de formulaire avancée** : champs conditionnels, formulaires multi-étapes, règles de prix conditionnelles (paliers, remises, combinaisons). Le total est une simple somme des contributions des champs.
- **Upload de fichier par le visiteur** dans un formulaire.
- **Paiement en ligne, prise de rendez-vous, panier** : un formulaire produit une soumission, pas une commande.
- **Commentaires et recherche sur le site public.**
- **Mutualisation multi-clients** : un déploiement dessert un seul site.

---

## Pistes post-V1 (backlog suivi)

Distinct de « NON inclus » (frontière ferme) : ces idées sont **jugées bonnes et volontairement reportées**, à reprendre quand un besoin réel les justifie. Consignées pour ne pas les perdre.

**Autonomie de l'éditrice**
- **Création d'une page depuis un gabarit existant.** C'est la première chose qu'un client réel réclamera (« Collection Noël », « Ateliers »). Reportée, non refusée : elle suppose de traiter l'adresse de la page, sa place dans le menu, et le risque de page orpheline — trois sujets que la v1 laisse à l'intégrateur.
- Menu de navigation éditable par la cliente (v1 : ordre et libellés figés par l'intégrateur, filtrés sur les pages publiées, cf. FR-084).

**Types de zone additionnels**
- Carte / plan (adresse géolocalisée — fréquent pour un commerce physique).
- Horaires d'ouverture.
- Imbrication de zones : un répéteur ou une galerie à l'intérieur d'un élément de répéteur (exclu en v1, cf. FR-076).
- Note en étoiles comme sous-champ d'avis (non retenu pour ce carrousel-ci).

**Éléments transverses éditables**
- ~~Pied de page enrichi : mentions légales, liens éditables (v1 : réseaux sociaux + coordonnées seulement, cf. FR-071/FR-072).~~ **→ Scindé le 2026-08-01.** Les **mentions légales sont rapatriées en V1** (FR-107, FR-108), avec l'information de confidentialité (FR-105, FR-106) : les reporter laissait ADR-0007 amendement (c) exiger que la durée de rétention « figure dans la mention d'information », alors que le périmètre ne garantissait l'existence d'aucune mention d'information (audit de sécurité, constat B-12). Le reste — **liens de pied de page éditables** — demeure post-V1 (v1 : réseaux sociaux + coordonnées seulement, cf. FR-071/FR-072).
- Bandeau temporaire (promotion, fermeture exceptionnelle).

**Médias**
- Acceptation des photos au format HEIC (v1 : refusées, avec le geste concret à faire — FR-024).
- Réutilisation d'un média déjà téléversé (sélecteur), médiathèque (grille, recherche).
- Récupération automatique de l'espace occupé par les fichiers non référencés — sous réserve de tenir compte des deux contenus (FR-078).

**Publication et suivi**
- Notification par e-mail de l'issue d'une mise en ligne (v1 : consultable dans l'espace d'édition — FR-087).
- Restitution à l'éditrice d'un chiffre de fréquentation simple, issu des statistiques serveur.

**Constructeur de formulaires — capacités avancées**
- Champs conditionnels, formulaires multi-étapes.
- Règles de prix conditionnelles (paliers, remises, combinaisons) au-delà de la somme simple.
- Upload de fichier par le visiteur (ex. photo de modèle de gâteau).
- Vérification automatique de la délivrabilité de l'adresse de destination (v1 : message de test manuel — FR-096).
- **Copie de la soumission au visiteur (FR-095)**, retirée de la v1 le 2026-08-01 : l'envoi sortant reste dans l'écosystème Cloudflare, qui n'écrit qu'aux adresses de destination vérifiées du compte. Ce qui subsiste de son absence, une fois la corbeille de FR-064 en place : le visiteur n'a toujours **aucun moyen de savoir** que sa demande n'est pas arrivée — c'est désormais le seul trou, et la raison de reprendre FR-095 si Cloudflare ouvre le destinataire quelconque en gratuit.
- Réponse parvenant directement au visiteur depuis le message reçu (`Reply-To`), retirée de FR-061 le 2026-08-01.

**Contenu éditorial** (reporté au premier client qui a un blog)
- Articles, auteurs, tags ; le seam `ContentTypeDescriptor` (ADR-0004) est déjà posé pour les accueillir.

**Confort d'édition**
- Historique des versions et restauration.
- Édition simultanée multi-éditeurs + rôles différenciés — le suivi d'identité de FR-004 est déjà en place pour les accueillir.

---

## Critères de succès mesurables

Repris du [brief](./brief.md#critères-de-succès-mesurables), inchangés — le PRD ne les redéfinit pas, il les sert.

- **SC-001** — 0 €/mois par site en conditions nominales. *Servi par* : FR-017, FR-026, FR-037, FR-039, FR-088, FR-093, FR-102, FR-103.
- **SC-002** — Le site de la pâtisserie est en production sur ColibriCMS. *Servi par* : FR-082.
- **SC-003** — L'éditrice modifie une page et remplace une image, seule, sans aide, du premier coup. *Servi par* : FR-006 à FR-020, FR-024, FR-030, FR-079, FR-080, FR-087, FR-088.
- **SC-004** — Une publication est visible en ligne en moins de 5 minutes. *Servi par* : FR-034, FR-036, FR-093. **Mesuré en conditions nominales, sur un site à volume de contenu réaliste** (galeries remplies), et non sur un site fraîchement provisionné ; la première mise en ligne est exclue de la mesure.
- **SC-005** — Lighthouse Performance ≥ 95 en mobile sur le HTML bâti des pages de contenu — **y compris celles qui portent un formulaire** : aucune page n'en est exemptée. *Servi par* : FR-026, FR-039, FR-089.
- **SC-006** — Zéro compte créé par l'éditrice hors son adresse e-mail. *Servi par* : FR-002.
- **SC-007** — La cliente construit un formulaire de devis elle-même, et une demande composée par un visiteur lui parvient par e-mail, avec réponses, total et coordonnées. *Servi par* : FR-040 à FR-046, FR-061, FR-086, FR-091, FR-094, FR-096 à FR-099, FR-101, FR-102, FR-105, FR-109.
- **SC-008** — Une nouvelle version de ColibriCMS se déploie sur une instance cliente existante sans code spécifique au client, et sans perte de son contenu. *Servi par* : l'architecture, non un FR de surface — voir [stack.md](./stack.md) et l'ADR de stratégie de mise à jour de la flotte.

---

## Questions ouvertes

- **Anti-spam des soumissions (FR-063).** Le *quoi* est fixé (résister aux envois automatisés, sans charger de code tiers avant une action du visiteur — FR-089) ; le *comment* relève de [stack.md](./stack.md) / d'un ADR. La contrainte FR-089 restreint désormais l'espace des solutions : à vérifier au moment du choix.
- **Conformité RGPD.** FR-060, FR-065 et FR-090 posent le consentement — désormais vérifié côté serveur —, la minimisation et la non-conservation. Restent à cadrer avec la cliente avant mise en production : la mention d'information (politique de confidentialité) et la base légale de l'acheminement par e-mail. **S'y ajoute depuis le 2026-08-01** : la corbeille de FR-064 retient des données personnelles pendant un **délai borné** qui n'est plus de l'ordre de la minute, et qui doit être **annoncé dans la mention d'information**. Le délai lui-même est un paramètre technique ([stack.md](./stack.md)) ; ce qui relève du produit, c'est qu'il soit court, inconditionnel, et écrit. Non bloquant pour l'implémentation du chemin nominal. **Amendé le 2026-08-01** : ce point n'est plus entièrement ouvert. L'**existence** d'une mention d'information et de mentions légales, leur **contenu obligatoire** et leur **surface d'édition** sont désormais des exigences (FR-105 à FR-109) — l'audit de sécurité ayant relevé que rien ne les portait, alors qu'ADR-0007 les supposait. Ce qui reste à cadrer avec la cliente est leur **rédaction** — la qualification des rôles (responsable de traitement, sous-traitants) et la formulation des finalités —, non plus leur existence.
- **Comportement HEIC sur l'appareil de la cliente** `[À VÉRIFIER]`. Selon le sélecteur utilisé, iOS transcode les photos en JPEG ou transmet le HEIC brut. À constater une fois sur son iPhone réel : si le transcodage a lieu dans son parcours, FR-024 n'aura jamais à jouer sur ce motif.

*Résolue le 2026-08-01* : **durée de session et révocation d'accès** (FR-001). Session de **7 jours**, et couper l'accès à une personne se fait en **deux gestes** — retirer son adresse de la politique d'accès, *puis* révoquer sa session. Décision d'exploitation, portée par [stack.md](./stack.md) et l'amendement (b) d'ADR-0003 ; elle n'appelle aucun amendement d'exigence.

Rappel de séquencement : le constructeur de formulaires (US6, US7, FR-040 à FR-052, FR-060 à FR-065, FR-086, FR-090, FR-091, FR-094, FR-096 à FR-099 — FR-095 étant retirée de la v1) est **P2**. Il dépend du socle P1 (édition, médias, publication) et ne doit pas être entamé avant que celui-ci soit en état.
