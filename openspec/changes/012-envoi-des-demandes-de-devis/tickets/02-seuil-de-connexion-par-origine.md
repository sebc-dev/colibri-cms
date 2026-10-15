# 02 — L'écran de connexion refuse une origine au-delà de vingt tentatives par heure, sans retenir aucune adresse IP

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `migrations/0012_seuil_par_origine.sql`, `src/core/frequence/regles.ts`, `src/platform/frequence/index.ts`, `src/pages/admin/connexion.astro`, `src/admin/textes.ts`, `tests/unit/frequence/regles.test.ts`, `tests/integration/seuil-de-connexion.test.ts`

## Ce que ça livre

Une même **origine** — l'adresse IP que la plateforme attribue à la requête — ne peut plus soumettre
l'écran de connexion plus de **20 fois par heure** (FR-007). Toute soumission compte comme une
tentative, celle d'une adresse comme celle d'un code. Au-delà, l'écran refuse la tentative :
- aucun code n'est écrit ;
- aucun code n'est vérifié ;
- aucune session ne s'ouvre ;
- aucun message n'est envoyé.

L'écran l'annonce par un texte unique, le même quelle que soit l'adresse soumise. Une autre origine se
connecte normalement. Le plafond de cinq codes par heure (FR-006) reste inchangé.

Le compteur ne crée pas de fichier des visiteurs (DAT-3). Il ne retient d'une origine qu'une
**empreinte**, calculée avec une clé tirée au hasard par le produit pour la seule heure en cours. À
l'heure suivante, la clé et toutes les empreintes de l'heure écoulée sont effacées ensemble. Aucune
adresse IP, aucune clé et aucune empreinte ne paraissent dans une réponse ou un journal.

Ce compteur est commun aux deux surfaces publiques du produit. Le ticket 12 (l'envoi des demandes borne
chaque origine à cinq par heure) le branchera sur l'envoi des demandes.

**Décisions à respecter (ADR-0028) :**
- **Migration** `0012_seuil_par_origine.sql`, additive. Elle porte le prochain numéro libre de
  `migrations/`, `0012` à ce jour : le vérifier avant d'écrire. Elle crée deux tables :
  - `fenetre_seuil`, à une seule ligne : le début de la fenêtre et une clé de 32 octets ;
  - `comptes_seuil` : `surface`, `empreinte`, `nombre`, avec la clé primaire `(surface, empreinte)`.
- **`src/core/frequence/regles.ts`**, pur (I1/I2). Il porte :
  - les seuils, `demande` à 5 et `connexion` à 20 ;
  - la fenêtre, qui est l'heure d'horloge en cours ;
  - le verdict.

  Il reçoit l'instant en paramètre.
- **`src/platform/frequence/index.ts`** porte `compterEtJuger(db, surface, origine, maintenant)` :
  - **Bascule.** Au premier comptage d'une heure nouvelle, une seule écriture groupée (lot D1
    indivisible) efface toutes les empreintes et remplace la clé par 32 octets de
    `crypto.getRandomValues`.
  - **Empreinte.** C'est `HMAC-SHA-256(clé, adresse IP)` par WebCrypto, jamais l'adresse elle-même.
  - **Incrément.** Il est conditionné à la clé lue. Si la fenêtre a basculé entre la lecture et
    l'écriture, rien n'est compté sous l'ancienne clé, et le comptage reprend une fois.
  - **Origine.** Elle vient de l'en-tête `CF-Connecting-IP`. S'il est absent (outillage local), une
    origine commune « inconnue » est comptée.
  - **Panne.** Une erreur de la base refuse la sollicitation : la protection ne s'ouvre pas sur une panne.
- **Connexion** (`src/pages/admin/connexion.astro`) :
  - `compterEtJuger(…, 'connexion', …)` s'appelle en tête de **tout** `POST`, avant de lire l'adresse ou
    le code.
  - Au-delà du seuil, la soumission d'une adresse attend quand même le délai plancher
    (`DELAI_PLANCHER_MS`, `src/core/auth/regles.ts`).
  - Le plafond horaire de FR-006 s'évalue après le seuil.
- **Annonce.** L'écran l'affiche dans le message d'état ambre déjà employé pour le plafond horaire. Son
  texte vit dans `src/admin/textes.ts` : « Trop de tentatives de connexion depuis votre accès à
  internet. Merci de patienter une heure avant de réessayer. »
- **Aucune liaison nouvelle, aucun Durable Object.** L'invariant `I7` est retiré par l'ADR-0028.
- **Tests :**
  - le temps est passé en paramètre aux fonctions de `core/` ;
  - en intégration, la bascule de fenêtre se provoque en vieillissant la ligne de `fenetre_seuil` dans
    la vraie base, jamais en simulant l'horloge ;
  - l'origine est posée par l'en-tête `CF-Connecting-IP` des requêtes de test ;
  - l'indiscernabilité des délais reprend le patron statistique de
    `tests/integration/branches-indiscernables.test.ts`, par salves, la fenêtre vidée entre elles.
- **Cas limites à couvrir :** la 20ᵉ tentative traitée et la 21ᵉ refusée, une origine absente, une
  adresse IPv6, la bascule de fenêtre.

**Hors périmètre :** le seuil des demandes (ticket 12) ; toute vérification anti-robot (Turnstile,
écartée par l'ADR-0028).

## Critères
- [ ] Quand une même origine soumet vingt et une fois l'écran de connexion dans la même heure, adresses et codes mêlés, les vingt premières soumissions sont traitées, la vingt-et-unième est refusée et l'écran l'annonce   (SC-02a)
- [ ] Quand, au-delà du seuil de son origine, une soumission porte l'adresse autorisée, puis une autre porte un code valide, aucun code n'est écrit, aucun message n'est envoyé, le code valide n'est ni consommé ni accepté, et aucune session ne s'ouvre   (SC-02b)
- [ ] Quand, au-delà du seuil de son origine, une soumission porte l'adresse autorisée, et une autre une adresse quelconque, les deux réponses portent le même texte et les mêmes champs d'en-tête, et leurs délais ne se laissent pas distinguer   (SC-02c)
- [ ] Quand une origine a atteint le seuil, et que l'éditrice soumet l'adresse autorisée depuis une autre origine dans la même heure, un code est écrit et envoyé à l'adresse autorisée, comme sans seuil   (SC-02d)
- [ ] Quand l'écran annonce que le seuil de l'origine est atteint, aucun terme de développeur n'y paraît (FR-117)   (SC-02e)
- [ ] Quand des sollicitations de plusieurs origines ont été comptées, aucune des adresses IP de ces origines ne figure, sous aucune forme lisible, dans la base   (SC-02f)
- [ ] Quand une première sollicitation arrive dans une nouvelle fenêtre, alors que la base porte la clé et les empreintes de la fenêtre précédente, la clé et toutes les empreintes de la fenêtre précédente ont disparu de la base, et seules la nouvelle clé et l'empreinte de cette sollicitation y figurent   (SC-02g)
- [ ] Quand des sollicitations d'une même origine sont comptées dans deux fenêtres successives, les deux fenêtres ont des clés différentes, et l'empreinte de cette origine diffère d'une fenêtre à l'autre   (SC-02h)
- [ ] Quand une sollicitation est comptée, puis refusée pour seuil atteint, ni son adresse IP, ni la clé de la fenêtre, ni son empreinte ne figurent dans la réponse ni dans les journaux   (SC-02i)
