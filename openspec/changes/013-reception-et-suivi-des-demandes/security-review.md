## Surface

- **La route publique d'envoi** (`POST /api/public/demandes`) écrit désormais en base : chaque demande
  acceptée y laisse une ligne portant des données du visiteur. L'entrée reste celle du change 012 —
  comptée, origine, format et taille contrôlés, vérifiée contre la déclaration empaquetée — et seule une
  demande vérifiée est gardée.
- **Deux écrans d'administration** (`GET /admin/demandes`, `GET /admin/demandes/<id>`) rendent ces données
  à l'éditrice, sur l'origine commune où vit le cookie de session.
- **Deux écritures d'administration** (`POST /admin/demandes/<id>/suite`, `POST /admin/demandes/retrait`)
  changent une suite et effacent des demandes.
- **Paramètres d'adresse** `?formulaire=` et `?page=` sur la liste ; identifiant de demande dans l'adresse
  du détail et de la suite.

## Menaces

- **XSS de l'intérieur (SEC-6)** — un visiteur anonyme écrit, dans un champ de coordonnée ou de message, un
  texte qui serait rendu en HTML dans l'administration : exécution d'un script sur l'origine du cookie de
  session. C'est la menace principale du change : jusqu'ici, aucune saisie de visiteur n'était rendue à
  l'éditrice ailleurs que dans un e-mail en texte seul.
- **Injection SQL** — identifiants, filtre, page ou suite concaténés dans une requête.
- **Écriture sans session, ou forgée depuis un autre site** — retrait ou suite déclenchés par une page
  tierce pendant que l'éditrice est connectée.
- **Effacement massif ou détourné** — une sélection démesurée, ou un retrait qui déborde sur des demandes
  non sélectionnées (FR-079).
- **Effacement incomplet** — un retrait ordinaire qui laisse une coordonnée en base, en contradiction avec
  ce que le dialogue promet.
- **Fuite par les journaux** — une trace d'échec (garde ou acheminement) qui porte une valeur saisie.
- **Session volée (SEC-8)** — un tiers qui tient la session lit toutes les demandes (données personnelles)
  et peut les retirer.
- **Désérialisation du détail** — le JSON `detail` relu depuis la base, supposé bien formé.

## Mitigations

- **XSS** — aucune saisie n'est jamais rendue en HTML : interpolation échappée d'Astro dans les écrans,
  liaison de texte de Svelte dans les îlots, données de l'îlot passées en attribut `data-*` échappé ; un
  message de plusieurs lignes se rend ligne par ligne en nœuds de texte. Aucun `set:html` ni `{@html}` hors
  `src/render/markdown/` (I5). La CSP de l'administration (`script-src 'self'`, I12) reste le second filet.
  Les scénarios « Un texte de demande n'est jamais interprété » se testent sur le HTML rendu.
- **Injection SQL** — requêtes préparées seules (`prepare(...).bind(...)`), y compris la liste `in (…)` du
  retrait, construite en marqueurs `?` comptés ; `page` converti en entier borné, `formulaire` comparé à
  une liste lue en base, `suite` et `motif` comparés à des listes fermées de `core/`.
- **Écritures** — garde de session en tête de chaque route (I6, ADR-0007) ; anti-forgerie par le cookie
  `SameSite=Strict` (ADR-0011) ; corps JSON borné par `lireCorpsJsonBorne`, jamais `multipart`.
- **Effacement borné** — 1 à 50 identifiants distincts par retrait ; mise à jour ou suppression conditionnée
  à `id in (…) and etat = 'presente'` ; une seule transaction (`db.batch`), tout ou rien.
- **Effacement complet** — la contrainte `check` de la table refuse toute ligne `retiree` qui porte une
  colonne du visiteur non nulle (design D1, ADR-0030) : un oubli dans le code échoue à l'écriture au lieu
  de garder une donnée en silence. Une colonne ajoutée plus tard porte sa propre clause, et le test de la
  liste fermée des colonnes gardées fait échouer celle qui l'oublierait ; aucun fichier de `src/` ni de
  `migrations/` ne coupe la vérification des contraintes (`I17`).
- **Journaux** — les traces d'échec ne portent que le motif rendu par la base ou la plateforme, jamais une
  valeur saisie, un identifiant de demande ni une adresse ; un scénario de la spec `demande-de-devis` le
  vérifie.
- **Session volée** — rayon d'action énuméré : lire, changer une suite, retirer ; aucun export, aucun envoi
  vers une autre adresse. Chaque demande existe aussi dans la boîte de l'éditrice quand son e-mail est
  parti. Le reste relève des parades de la session (ADR-0001, FR-118).
- **Désérialisation** — le `detail` relu passe par une fonction de `core/` qui n'accepte que la forme
  attendue (tableaux de lignes à chaînes et entiers bornés) et rend un détail vide sinon, sans lever.

## Données

- **Données personnelles gardées** — pour chaque demande présente : la coordonnée de réponse, toutes les
  valeurs saisies (nom, adresse e-mail, téléphone, message), les choix, le total, la page, la date et
  l'heure. Aucune adresse IP : le compteur de fréquence reste à empreintes de fenêtre (ADR-0028), sans lien
  avec la demande gardée.
- **Durée** — aucune durée appliquée par le produit, aucun effacement d'office (arrêt du cahier des charges
  et FR-079) ; l'effacement est praticable par le retrait, à l'unité ou par page de 50. **DAT-1 reste
  ouvert** : mention d'information, politique de durée écrite (boîte e-mail comprise) et acte de
  sous-traitance sont à cadrer avant la première mise en ligne (`docs/legacy/research/
  2026-08-10-retention-donnees-demandes-devis.md`).
- **Après un retrait ordinaire** — ne restent que le formulaire d'origine (identifiant et nom) et la suite :
  aucune donnée personnelle. **Après un retrait indésirable** — rien.
- **Résidu** — l'historique restaurable de D1 (Time Travel, 7 jours sur le palier gratuit) garde une demande
  effacée pendant cette durée ; résidu borné, consigné dans ADR-0030.
- **Second support** — la copie e-mail dans la boîte de l'éditrice échappe au produit ; le dialogue de
  retrait le rappelle.
