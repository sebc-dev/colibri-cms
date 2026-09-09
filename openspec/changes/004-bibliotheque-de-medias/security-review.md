## Surface

Ce change ouvre la **première ingestion d'un fichier binaire choisi par l'éditrice** et la **première route
qui sert ces octets** sur l'origine commune au public et à l'administration. Toutes les surfaces neuves sont
derrière la garde de session posée par 001 ; aucune route publique n'est ajoutée et le site public reste
statique et intact (FR-097, FR-026).

- **Route de téléversement** (`src/pages/admin/`) : lit un corps `multipart/form-data` porteur d'un binaire.
  Permis car la route est **gardée**, non publique — I6 n'interdit le `multipart` qu'à `src/pages/api/public/`.
  Écriture depuis une session ouverte, cookie `__Host-session` `SameSite=Strict`, **aucun jeton anti-forgerie
  dédié** (ADR-0011).
- **Route de service des octets d'un média en brouillon** (`src/pages/admin/`) : sert un binaire choisi par
  l'éditrice, sur l'origine commune, avec un `Content-Type` que le code choisit — le cœur de SEC-5.
- **Autres routes d'écriture** (`src/pages/admin/`) : renommage, description, pose/remplacement d'une image
  dans un emplacement, retrait à la suppression — mêmes appuis d'anti-forgerie que 003.
- **Nouvelle table D1 `medias_brouillon`** (binaire en `BLOB`) et sa migration versionnée : première écriture
  de contenu binaire dans D1.
- **Deux entrées externes textuelles** saisies par l'éditrice : le nom d'affichage et la **description** —
  cette dernière destinée à être servie plus tard avec l'image sur une page publiée (FR-039, rendu délégué).

## Menaces

- **Fichier qui ment sur sa nature (SEC-5)** — un fichier hostile (SVG exécutable, HTML, polyglotte) présenté
  comme une image et servi sur l'origine commune deviendrait du contenu exécutable contre le cookie
  d'administration. Menace de tête de ce change.
- **XSS same-origin par la description (SEC-6)** — le texte de description finira rendu sur une page publiée
  (FR-039) : une description devenue HTML exécutable serait un XSS de l'intérieur. Le rendu est délégué, mais
  la **saisie et le stockage** ont lieu ici.
- **Écriture forgée cross-site (CSRF)** sur les routes neuves (téléversement, renommage, description, pose,
  suppression).
- **Pose visant un emplacement non déclaré ou d'une autre nature** — contrôle d'**autorisation métier**
  (FR-024/025), distinct de l'authentification : une session valide ne l'ouvre pas.
- **Injection SQL** sur la table des médias et sur les requêtes de références.
- **Épuisement de ressource** — un téléversement volumineux qui saturerait la ligne D1 (limite 2 Mo) ou la
  mémoire du Worker.
- **Fuite d'octets à un non-authentifié** — la route de service exposerait un média en brouillon hors session.
- **Vocabulaire de développeur** dans un message de refus (FR-117) — pas une faille, mais un invariant produit
  qui se relit au même endroit que la validation des entrées.

## Mitigations

- **SEC-5 (fichier menteur)** → liste blanche **fermée** JPEG/PNG/WebP reconnue sur les **octets d'en-tête**,
  jamais l'extension ni le `Content-Type` déclaré ; **SVG refusé** ; le `Content-Type` servi est **déduit**
  de la liste, jamais recopié (candidat `ingestion-des-medias-liste-blanche-sur-octets`). La route de service
  est **gardée** (I6, ADR-0007) et `X-Content-Type-Options: nosniff` est posé par le **seul** middleware
  (I11, ADR-0008) — la route ne pose aucun des quatre en-têtes de sécurité elle-même (I11). À scruter sur le
  diff : que la reconnaissance ne s'appuie que sur les octets, que le type servi ne vienne jamais du
  téléversement, et qu'aucun `headers.set` de la route ne porte l'un des quatre en-têtes.
- **SEC-6 (description)** → la description est stockée telle quelle en D1 (donnée, pas HTML) ; **aucun rendu
  de HTML dans ce change** — toute occurrence de `{@html}`/`set:html` hors de `src/render/markdown/` violerait
  I5. Le rendu sûr (échappement en attribut `alt`) est un point à porter dans la feature de site public, noté
  ici pour son REVIEW_CONTEXT.
- **CSRF** → cookie de session `SameSite=Strict` seul (ADR-0011). À scruter : que chaque route neuve n'accepte
  que la méthode attendue, ne se replie sur aucune authentification par en-tête ou paramètre d'URL, et que
  rien n'assouplisse `SameSite`.
- **Pose de structure** → refus en `core/`, sur la déclaration lue : l'identifiant d'emplacement reçu est
  vérifié **contre la déclaration** (nature image/galerie/carrousel comprise) avant toute écriture, jamais
  inséré tel quel (FR-024/025).
- **Injection SQL** → API D1 native avec requêtes liées, sans concaténation (candidat
  `acces-aux-donnees-api-d1-native-et-migrations-wrangler`) ; migration additive et versionnée, ne touchant
  ni l'auth ni l'état publié.
- **Épuisement** → borne de poids **2 Mo** appliquée en `core/` **avant** persistance (candidat
  `medias-deux-magasins-un-par-etat`) ; un fichier plus lourd est refusé (FR-040) sans être stocké.
- **Fuite d'octets** → la route de service importe le garde de session (I6) ; une requête sans session valide
  n'obtient aucun octet. À scruter : le placement de la route sous `src/pages/admin/` et l'import du garde.
- **FR-117** → les messages de refus (format, poids) et les libellés de la fiche/suppression se relisent mot à
  mot : aucun terme de développeur, aucune trace technique renvoyée à l'éditrice.

## Données

Aucune donnée personnelle de visiteur : ce change ne touche ni les demandes, ni les compteurs de fréquence.
Les données écrites sont du **contenu éditorial non publié** — des images en brouillon et leurs métadonnées
(nom, description, dimensions), en D1, rattachées à des emplacements déclarés, jamais à une personne. L'état
publié n'est jamais écrit par ce change. Aucun secret n'est introduit, et aucun identifiant appartenant à
Isometria (`docs/security.md` § Politique, SC-012/SC-013).
