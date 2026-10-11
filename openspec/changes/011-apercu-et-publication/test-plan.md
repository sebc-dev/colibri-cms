## Niveaux

- **Unitaire (`tests/unit/`)** — le cœur du change est en `core/` pur, donc testable sans plateforme
  (I2, C5) : la superposition déclaration ← publié ← brouillon (D2) ; la composition d'une page à rendre,
  liens et destinations revérifiés (D3) ; l'effaçabilité selon le contenu courant (D5) ;
  `PREFIXES_AUTORISES` et `cheminAutorise` (D6) ; le plan de dépôt — fichiers, fiches, suppressions,
  marque, images à déposer, inventaire `media` (D6) ; la règle des options et la numérotation (D7) ; le
  récapitulatif et son empreinte (D10) ; l'état de la mise en ligne et ses bornes (D9) ; l'orchestration
  du dépôt contre le port `Forge` (D8), avec une forge en mémoire.
- **Intégration (`tests/integration/`, `workerd`)** — contre la vraie D1 locale : les migrations `0009`
  et `0010` (données conservées au renommage) ; le verrou à bail (prise, refus, reprise après
  expiration) ; la finalisation en un lot (brouillons de l'instantané seuls supprimés, à `maj_le` égal) ;
  le vidage des octets ; et par `exports.default.fetch` : la garde de l'aperçu, de l'écran Publier et des
  routes de publication, le contenu rendu de l'aperçu, le récapitulatif sur un jeu connu (SC-016), le
  refus d'empreinte périmée (409), l'échec propre sans dépôt configuré, l'écran des réglages, d'un
  formulaire et l'éditeur après une publication (état publié semé en base).
- **Statique (`tests/static/`)** — la sortie du build : `dist/client` porte un document par page déclarée
  et la page introuvable ; `dist/client/_headers` porte la règle `/*` et ses en-têtes (CSP sans script) ;
  aucune page bâtie ne porte de `<script>` ni d'URL d'une autre origine ; le build échoue en nommant
  l'image et la page quand une fiche ou des octets manquent (build lancé sur un contenu jetable).
- **Parcours (`tests/parcours/`, Playwright sur `wrangler dev`)** — ce que seule la vraie couche des
  fichiers statiques et le navigateur voient : une page publique servie avec les en-têtes de `_headers`
  (preuve « document statique », que `exports.default.fetch` ne peut pas donner, voir Doubles), sans
  violation de politique ; l'aperçu servi sous la CSP de l'administration sans violation (feuille du
  gabarit, images en brouillon) ; le geste « Publier » → récapitulatif → annuler.
- **Recette (mode `observé`)** — la chaîne réelle : dépôt sur GitHub, reconstruction automatique,
  SC-004 chronométré, branche `media` atteinte par la reconstruction (point bloquant hérité), bail et
  borne mesurés.

## Oracle

| Scénario | Oracle |
|---|---|
| Superposition, plan, options, numérotation, effaçabilité, état, empreinte | égalité de valeurs sur des fonctions pures — oracle a priori (`tdd`) |
| Dépôt contre la forge : avance rapide refusée puis rebâtie, réponse perdue reconnue, `media` sans parent et `force` | la forge en mémoire tient l'état des références et des objets ; on constate l'état final des deux branches et le nombre d'écritures (`tdd`) |
| Octets déposés identiques au téléversement | égalité octet pour octet entre le BLOB D1 et le blob reçu par la forge, décodé du base64 |
| Récapitulatif exact (SC-016) | jeu de brouillons connu semé en base → les cinq listes égales à l'attendu, ni plus ni moins |
| Aperçu = page publique (même rendu) | le même modèle de page rendu par les deux routes : on compare l'arbre du `<main>` et du pied de page, bandeau exclu, adresses d'images en brouillon normalisées |
| Une page publique est un document statique | parcours : la réponse porte la CSP de `_headers` ; statique : le fichier existe dans `dist/client` |
| Aucun terme de développeur | liste plancher de termes proscrits (dépôt, GitHub, branche, commit, build, déploiement, push, serveur, 404, 422…) cherchée dans le HTML et les messages JSON — oracle partiel, complété par la relecture |
| SC-004 (< 5 min) | chronométrage en recette, de la confirmation à la page publique changée |

## Cas limites

- **Récapitulatif** : aucun brouillon ; un seul réglage ; les trois objets ensemble ; une image remplacée
  par un brouillon (effacée) ; une image posée seulement par une version publiée sans brouillon (gardée) ;
  une image téléversée jamais posée (effacée) ; une description modifiée d'image publiée ; une image posée
  au départ par l'intégrateur et jamais touchée (ni listée ni effacée tant qu'elle est posée).
- **Empreinte** : un brouillon enregistré entre l'affichage et la confirmation (409) ; aucun changement
  (acceptée).
- **Passes d'images** : 0, 1, 40, 41 images ; 10 Mo pile et 10 Mo + 1 octet dans une passe ; une image
  de 2 Mo (borne D1).
- **Verrou** : bail à 4 min 59 s (refus) et 5 min (reprise) ; reprise après des blobs déjà déposés (pas
  de doublon) ; deux confirmations simultanées.
- **Dépôt** : 1 et 2 refus d'avance rapide puis succès ; 3 refus (échec, rien de finalisé) ; réponse
  perdue au `PATCH` ; branche `media` absente (création) ; dépôt non configuré ; clé absente ; 401/403/404
  de la forge.
- **Finalisation** : correction enregistrée pendant le dépôt (reste en brouillon) ; image effacée à N
  absente de `media` à N+1 seulement.
- **État** : 29 min 59 s et 30 min après le dépôt ; marque du site égale à la dernière (en ligne) ; marque
  ancienne après la borne puis égale (tardive) ; aucune publication (pas de pastille).
- **Options** : les cinq cas du candidat (D7) ; un brouillon désaccordé avec un publié accordé ; un
  identifiant `o<n>` jamais redonné après publication.
- **Chemins** : identifiant avec `..`, `/`, majuscules, vide → refusé ; `.github/workflows/x.yml` →
  refusé ; chaque préfixe autorisé → accepté.
- **Rendu** : texte riche avec `javascript:`, `data:`, `<script>` littéral ; image sans description ;
  galerie vide ; emplacement d'image sans image ; aucun réseau publié ; titres avec `<>&"`.

## Doubles

- **Forge en mémoire** (`tests/…/forge-en-memoire.ts`), implémentant le port `Forge` de `core/` — et lui
  seul : références, commits, arbres (avec `base_tree`, contenus inlinés, suppressions), blobs adressés par
  leur oid git réel (SHA-1 de `blob <taille>\0…`, calculé par `crypto.subtle`), avance rapide vérifiée,
  `force`. Elle peut injecter un refus d'avance rapide, une réponse perdue, ou une panne d'accès. C'est le
  seul double du change : l'orchestration `core/` est testée contre elle, sans `fetch`.
- **L'adaptateur `forge-github.ts`** se teste en lui passant un `fetch` de substitution (fonction locale
  qui rend des `Response`) : on vérifie la forme des requêtes (méthode, chemin, en-têtes, absence de la clé
  dans tout message d'erreur) et la traduction des statuts — jamais d'appel réseau.
- **Aucun double de D1 ni de session** (ADR-0014) : la base locale de `workerd`, la session semée comme
  dans les tests existants.
- **Pourquoi pas de forge derrière `exports.default.fetch`** : `@cloudflare/vitest-plugin` 1.x n'expose
  pas d'interception des `fetch` sortants et `vitest.config.ts` est protégé ; les routes de publication
  sont donc testées par `exports.default.fetch` sur leurs chemins qui n'atteignent pas la forge (garde,
  récapitulatif, 409, « pas raccordé »), et l'orchestration complète au niveau `core/` + D1.
- **`exports.default.fetch` court-circuite la couche des fichiers statiques** : il appelle le Worker
  directement. Une page bâtie demandée ainsi traverse le code — elle ne prouve donc rien de FR-096 ;
  cette preuve est au parcours (`wrangler dev`) et en recette.

## Zones sans test automatisé

- **SC-004** (< 5 min) et **FR-089** (seul le dépôt sur la branche principale reconstruit) : chaîne
  réelle GitHub → reconstruction → déploiement, observable en recette seulement (`observé`).
- **La branche `media` atteinte par la reconstruction automatique** : constat de recette (point bloquant
  hérité de la stack 1.x).
- **Mesure du bail et de la borne** : durée réelle d'une publication à 1 et à 40 images, durée réelle
  d'une reconstruction, en recette.
- **Rendu visuel** du gabarit public et de l'écran Publier sur 360 px, lisibilité, toucher : cahier de
  recette (§ par ticket), joué en fin de front comme pour 005.
- **« Aucun terme de développeur »** au-delà de la liste plancher : relecture.
