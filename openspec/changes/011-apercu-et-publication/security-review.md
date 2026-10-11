## Surface

- **Un secret nouveau** : la clé d'écriture du dépôt (`JETON_DEPOT`), à portée fine, sur le seul dépôt
  de l'instance, `Contents: Read and write` seule — secret du compte Cloudflare du client (ADR-0005,
  SEC-3), lu par le seul adaptateur `src/platform/publication/forge-github.ts`.
- **Un flux sortant nouveau** : le Worker écrit dans un dépôt GitHub (`api.github.com`), dont la branche
  principale **est** le site publié et déclenche sa reconstruction.
- **Une valeur d'instance nouvelle**, non secrète : `depotDePublication` dans `instance.json` (I8).
- **Des routes d'administration nouvelles**, toutes sous `/admin/` et gardées (I6) : l'aperçu
  `/admin/apercu/<page>` (GET), l'écran `/admin/publier` (GET), `/admin/publication`,
  `/admin/publication/suite`, `/admin/publication/relancer` (POST), `/admin/publication/etat` (GET).
- **Des pages publiques nouvelles**, statiques, qui rendent sur l'origine commune le texte de l'éditrice
  (texte riche, libellés, coordonnées, descriptions d'images) ; un porteur d'en-têtes nouveau,
  `public/_headers` (ADR-0004).
- **L'aperçu** rend ce même contenu, brouillons compris, **sous la session** et sous la CSP de
  l'administration.
- **Un geste destructeur** : la réécriture forcée (`force: true`) de la branche `media`.

## Menaces

1. **Fuite de la clé d'écriture** — par un message d'erreur relayé à l'écran, une ligne de journal
   (`observability` est activé), une réponse JSON, ou un fichier versionné. Une clé fuitée réécrit le
   site publié.
2. **Écriture hors du contenu** — un chemin composé depuis un identifiant (page, emplacement, formulaire,
   image) qui sortirait de `content/` ou viserait `.github/workflows/` : réécriture du pipeline de build
   (exécution de code dans le compte du client) et, avec la seule permission `Contents`, refus silencieux
   au dernier geste (candidat `prefixes-de-publication-en-constante-unique`).
3. **XSS same-origin par le rendu public ou l'aperçu** — le texte riche, un libellé, une coordonnée ou une
   description devenus balisage exécutable sur l'origine du cookie de session (SEC-1, SEC-6) ; l'aperçu,
   servi sous session, est la cible la plus directe.
4. **Liens dangereux** — `javascript:` / `data:` dans un lien de texte riche, une destination de bouton ou
   un lien de vidéo ; lien externe qui récupère `window.opener`.
5. **Aperçu atteignable sans session ou conservé** — un brouillon exposé au public, ou gardé par un cache
   intermédiaire et resservi.
6. **Contournement des en-têtes publics** — une configuration qui ferait passer les pages publiques par
   le Worker (`run_worker_first` global) : `_headers` ne s'appliquerait plus, sans signal (ADR-0004).
7. **Publication forgée cross-site** — un site tiers qui déclencherait « Publier » ou « Relancer » dans le
   navigateur de l'éditrice.
8. **Session volée** — elle peut publier, et détruire des images publiées par la réécriture forcée de
   `media` (SEC-8).
9. **Corruption du contenu déposé** — injection dans `page.json`, `formulaire.json`, une fiche ou la
   marque par concaténation de chaînes ; binaire d'image corrompu par un encodage texte.
10. **Épuisement** — une publication qui dépasse la mémoire (128 Mo) ou les sous-requêtes (50) et laisse
    un état incohérent ; un verrou jamais relâché qui bloque toute publication.

## Mitigations

1. **Clé** : lue de `env` dans l'adaptateur seul, jamais passée à `core/`, jamais sérialisée ; les erreurs
   de la forge sont traduites en issues typées sans corps de réponse ni en-têtes ; aucune journalisation
   de requête sortante ; l'écran ne montre que des messages fixes (FR-117). Test : la clé ne figure dans
   aucune réponse ni aucun message d'erreur, succès comme échec. Jamais dans `instance.json` ni dans
   `wrangler*.jsonc` (ADR-0005) — un contrôle de relecture.
2. **Chemins** : `PREFIXES_AUTORISES` seul porteur (I9, opposable une fois l'ADR promu), sans `.github/` ;
   `cheminAutorise` vérifié sur **chaque** chemin du plan juste avant l'appel à la forge (défense en
   profondeur, au-delà de la constante) ; tout identifiant revérifié contre `^[a-z0-9][a-z0-9-]*$`
   avant composition ; refus de `..`, de segment vide, de chemin absolu.
3. **XSS** : le texte riche est rendu **nœud par nœud** depuis l'arbre de `analyserMarkdownRestreint`,
   sans `set:html` ni `{@html}` (I5 tenu par absence) ; tout autre texte passe par l'échappement par
   défaut d'Astro ; pages publiques sans aucun script et sous `default-src 'none'` ; l'aperçu sous la CSP
   stricte de l'administration (I12, I15), sans attribut `style` du gabarit. Tests : `<script>`,
   `<img onerror>` et `"><` dans chaque sorte de texte, rendus comme texte, au public et à l'aperçu.
4. **Liens** : revérification **au rendu** par les règles existantes (`lienDeTexteRicheAutorise`,
   `destinationBoutonAutorisee`, règle du lien de vidéo) — un lien refusé devient du texte ; liens
   externes en `rel="noopener noreferrer"`.
5. **Aperçu** : `verifierSession` en tête de route (I6), renvoi vers la connexion sans corps ;
   `Cache-Control: no-store` ; aucune page publique ne pointe vers `/admin/apercu/` (test statique sur
   `dist/client`) : la réécriture des liens vers les pages déclarées (design D3) n'a lieu que dans la
   route gardée de l'aperçu, et l'adresse réécrite est construite depuis la déclaration, jamais
   recopiée du contenu. Les octets d'image en brouillon restent servis par la route gardée existante.
6. **En-têtes publics** : `public/_headers` versionné, règle `/*` ; contrôle statique que le
   `wrangler.json` produit ne pose aucun `run_worker_first` global, et que `dist/client/_headers` porte
   bien la CSP ; parcours qui vérifie la CSP sur une page publique servie par `wrangler dev`.
7. **Anti-forgerie** : cookie `SameSite=Strict` (ADR-0011) sur toutes les écritures ; aucune écriture en
   GET (`/admin/publication/etat` ne fait que lire et dériver).
8. **Session volée** : risque accepté par le candidat `medias-deux-magasins-un-par-etat` et
   `docs/security.md` (SEC-8) ; la branche principale reste en avance rapide obligatoire, donc le contenu
   textuel publié reste indestructible dans l'historique ; le rayon d'action de « Publier » est énuméré
   (ce que le récapitulatif montre, rien d'autre — empreinte vérifiée).
9. **Contenu déposé** : JSON produit par `JSON.stringify` depuis des objets typés, jamais par
   concaténation ; Markdown déjà restreint à l'enregistrement ; images en blob base64, jamais inlinées
   (test octet pour octet).
10. **Épuisement** : passes bornées à 40 images et 10 Mo ; verrou à bail de 5 min renouvelé à chaque
    passe ; finalisation D1 en un seul lot, après le dépôt réussi seulement ; tout échec avant libère le
    verrou sans rien écrire d'autre.

## Données

- **Aucune donnée personnelle de visiteur** n'est touchée : la publication ne dépose ni demande ni
  coordonnée de visiteur (les demandes arrivent avec l'Epic B).
- **Les coordonnées de l'éditrice** (téléphone, e-mail, adresse de l'atelier) deviennent publiques par
  geste explicite — c'est leur raison d'être (FR-041) ; le récapitulatif les annonce par le réglage
  « Coordonnées ».
- **Les images publiées** quittent D1 pour le dépôt du client — un espace qui lui appartient (FR-088).
  Une image effacée disparaît de la branche `media` (un seul commit, sans historique) ; l'effacement
  physique sur les serveurs de GitHub dépend de son ramasse-miettes, ni promis ni constatable (candidat
  `medias-deux-magasins-un-par-etat`).
- **La marque de publication** (128 bits aléatoires) n'est pas un secret : elle n'ouvre rien.
