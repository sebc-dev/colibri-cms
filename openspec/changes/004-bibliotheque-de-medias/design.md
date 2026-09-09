## Context

Voir proposal.md — Why pour la motivation. L'administration a déjà, après 003 : le cadre de navigation
(barre latérale, rubrique « Médias » posée mais inerte), la liste des pages, l'éditeur d'emplacements pour
les natures texte-riche / lien-vidéo / bouton-action, la persistance du brouillon en D1
(`brouillons_emplacements`, clé `(page_slug, id_emplacement)`, ADR-0012) et l'écriture depuis une session
ouverte sous cookie `SameSite=Strict` sans jeton dédié (ADR-0011). Ce change ajoute le magasin **brouillon**
des médias et branche la rubrique « Médias ».

Trois candidats ADR cadrent le terrain et ne sont pas rejugés ici : `medias-deux-magasins-un-par-etat`
(brouillon en D1, binaire en `BLOB`, borne 2 Mo d'une ligne D1 ; publié sur la branche `media`, hors
périmètre), `ingestion-des-medias-liste-blanche-sur-octets` (JPEG/PNG/WebP reconnus sur les octets d'en-tête,
SVG refusé, type déduit de la liste, dimensions lues à l'en-tête pour FR-108), et `pipeline-d-images-
variantes-au-build` (rendu et variantes, nés avec l'aperçu — hors périmètre). Le design est JETABLE : les
décisions structurantes qu'il pointe sont des ADR acceptés ou des candidats, jamais gravées ici.

## Goals / Non-Goals

**Goals :**
- Isoler dans `core/` la logique pure d'ingestion (reconnaissance du format sur les octets d'en-tête, borne
  de poids, lecture des dimensions, déduction du type) et le comptage de références / dérivation de
  l'orphelinat — couture de test la plus haute (ARCH-5, ADR-0003).
- Étendre le modèle d'emplacement de `core/` (`pages/declaration.ts`) aux trois natures d'image, en
  réutilisant le brouillon D1 existant (`brouillons_emplacements`) pour porter les images posées — sans
  nouvelle table de brouillon d'emplacement.
- Servir les octets d'un média en brouillon sur l'origine commune de façon sûre (SEC-5) : type déduit de la
  liste, sous garde de session, sans surface publique nouvelle (I6, FR-097).

**Non-Goals :**
- Le magasin **publié** (branche orpheline `media`) et l'**effacement définitif** à la publication (FR-037,
  élagage `force: true`) : la règle et le comptage sont posés, l'exécution part avec « Aperçu et publication ».
- Le **rendu** partagé publié/aperçu d'un emplacement d'image (`render/`, I5) et le **pipeline de variantes
  au build** (SC-005) : nés avec l'aperçu et le site public. Le service de la description sur une page
  publiée (FR-039) en dépend.
- La saisie de la déclaration des pages/emplacements (geste d'intégration hors produit, ADR-0012).

## Decisions

- **L'ingestion est une logique pure de `core/`, sans dépendance de décodage d'image.** La reconnaissance du
  format lit les octets **magiques** d'en-tête (JPEG `FF D8 FF`, PNG `89 50 4E 47…`, WebP `RIFF…WEBP`) et
  refuse tout le reste, SVG compris (candidat `ingestion-des-medias-liste-blanche-sur-octets`) ; les
  dimensions se lisent dans le même en-tête, par nature (SOF JPEG, IHDR PNG, en-tête VP8/VP8L/VP8X WebP). La
  liste est **fermée** à trois formats, donc le parsing est borné et testable en aller-retour, sans tirer de
  dépendance de décodage sous le plafond de 3 Mo gzip du Worker (I2 : `core/` n'importe ni framework ni
  plateforme). Le type renvoyé plus tard est **déduit** de la liste, jamais recopié du téléversement.
  *Écarté :* une dépendance de type `image-size` — pure et petite, mais surface d'approvisionnement inutile
  pour trois formats connus.
- **Le brouillon d'un emplacement d'image réutilise `brouillons_emplacements`.** Une image posée est une
  ligne `(page_slug, id_emplacement)` de `nature = 'image' | 'galerie' | 'carrousel'`, dont le `contenu`
  JSON porte `{ "mediaId": "<id>" }` (image) ou `{ "mediaIds": ["<id>", …] }` ordonné (galerie, carrousel).
  Aucune nouvelle table de brouillon d'emplacement : la clé stable d'ADR-0012 et la dérivation « porte un
  brouillon » (`core/pages/brouillon.ts`) restent inchangées. Réordonner ou retirer une image d'une galerie
  est une réécriture de ce tableau — modification de **contenu**, pas de structure (FR-024/025).
- **Le magasin brouillon des médias est une nouvelle table D1, binaire en `BLOB`.** `medias_brouillon`
  porte l'**identité**, le **nom d'origine**, le **nom d'affichage**, la **description**, les **dimensions**,
  le **type déduit** et les **octets** (candidat `medias-deux-magasins-un-par-etat` — volet brouillon ;
  FR-108). Migration versionnée additive (candidat `acces-aux-donnees-api-d1-native-et-migrations-wrangler`),
  ne touchant ni `brouillons_emplacements` ni l'auth. Le renommage ne change que le nom d'affichage ; le nom
  d'origine est conservé pour FR-108.
- **Le comptage de références prend les références en données, ne les interroge pas.** `core/` dérive
  l'effaçabilité (FR-037) et l'orphelinat (FR-038) à partir de l'**ensemble** des emplacements référençant
  une image — publiés **et** brouillons. L'ensemble publié est **vide** aujourd'hui (aucune représentation
  de l'état publié avant la publication) ; la fonction pure le reçoit tout de même en paramètre, prête pour
  la feature de publication qui l'exécutera. Cela tient ARCH-5 et évite de recâbler la logique plus tard.
- **Les octets d'un média en brouillon sont servis par une route sous `src/pages/admin/`, gardée.** Elle
  importe le garde de session `src/platform/session/index.ts` (I6, ADR-0007) — ce n'est **pas** une surface
  publique (FR-097) — et pose le **seul** `Content-Type` déduit de la liste blanche. Les quatre en-têtes de
  sécurité, dont **`X-Content-Type-Options: nosniff`**, sont posés par le **seul** middleware
  (`src/platform/entetes/middleware.ts`, I11, ADR-0008) : la route ne les pose pas elle-même (I11), elle en
  bénéficie du fait de son placement sous l'administration. C'est la mitigation de SEC-5 : un fichier qui
  mentirait sur sa nature ne devient pas du contenu exécutable réinterprété par le navigateur.
- **Le téléversement lit un corps `multipart` — permis car la route est gardée, non publique.** I6 n'interdit
  le `multipart` qu'à `src/pages/api/public/` ; la route de téléversement vit sous `src/pages/admin/`, sous
  garde de session. Écriture depuis une session ouverte : cookie `SameSite=Strict`, **aucun jeton
  anti-forgerie dédié** (ADR-0011), comme les écritures de 003.
- **La bibliothèque et le sélecteur d'image sont des îlots d'administration** (candidat `ilots-svelte-5`,
  ADR-0006 : aucune directive `client:*` sous `src/admin/`), servis sous la CSP stricte de l'administration
  (`script-src 'self'`, I12 ; ADR-0004, ADR-0008 ; tolérance `style="…"` d'ADR-0010). Les vignettes se
  chargent via `<img src="/admin/…">` sur l'origine commune (`img-src 'self'` de la politique
  d'administration) ; aucun script ni asset tiers, tout embarqué dans le bundle de l'îlot (SEC-1).
- **La recherche (FR-029) filtre sur nom d'affichage et description**, sur le petit jeu d'images d'un site
  vitrine — un filtre simple côté `platform/` (D1) ou en mémoire, sans index dédié.

## Risks / Trade-offs

- [Le parsing manuel des dimensions par format peut mal lire un en-tête exotique (WebP VP8X, PNG entrelacé)]
  → liste **fermée** à trois formats, chacun testé en aller-retour sur des fichiers réels (ADR-0003) ; un
  en-tête illisible est un refus de téléversement (FR-040), jamais une image sans dimensions persistée.
- [Servir des octets choisis par l'éditrice sur l'origine commune du cookie admin (SEC-5)] → type **déduit**
  de la liste blanche jamais recopié, `nosniff` posé par le middleware (I11), route **gardée** (I6), SVG
  refusé à l'ingestion : aucun chemin ne sert un document exécutable.
- [Un média en brouillon est sans copie — le seul objet qu'une éditrice ne peut ressaisir (réserve du
  candidat magasin-D1)] → assumé et hors périmètre de correction ici ; noté pour la feature de publication.
- [Le comptage de références lit aujourd'hui un ensemble publié vide et pourrait figer une hypothèse fausse]
  → la fonction pure **reçoit** les deux ensembles en paramètre ; brancher l'ensemble publié à la publication
  ne touchera pas `core/`.
- [Décisions structurantes figées prématurément] → design JETABLE ; chaque décision structurante est un ADR
  accepté (ADR-0006, ADR-0007, ADR-0008, ADR-0010, ADR-0011, ADR-0012) ou un candidat listé, pas gravée ici.

## Migration Plan

- Nouvelle table D1 `medias_brouillon` via migration versionnée (`wrangler d1 migrations`, additive) ;
  aucune donnée existante à reprendre. Rollback : retrait de la migration ; l'état publié n'a aucune
  représentation en D1 et n'est jamais touché par ce change — aucun risque sur un site en ligne.

## Open Questions

- (aucune reportable sans changer les specs, l'approche ou le découpage — les deux arbitrages de portée
  — trois natures d'image livrées ensemble, et frontière modèle/règle ici vs exécution déléguée à la
  publication — ont été tranchés avec l'humain au cadrage.)
