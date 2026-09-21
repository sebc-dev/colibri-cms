# Plan de test — Bibliothèque de médias

Stratégie de test **de ce change** (la politique durable vit dans `docs/test.md`). Le mode de vérif de
chaque ticket reste tranché par `strategie-verif` à la décomposition ; ce plan pose l'oracle et les cas
limites qui comptent, pour l'informer.

## Niveaux

- **Unité (`core/`, sans plateforme — la couture la plus haute, ARCH-5, ADR-0003).** L'ingestion
  (reconnaissance de format sur octets d'en-tête, borne de poids, lecture des dimensions, déduction du type)
  et le comptage de références / dérivation de l'orphelinat et de l'effaçabilité sont des fonctions pures :
  elles s'instancient et se vérifient sans D1 ni HTTP. C'est là que vit l'essentiel des tests. Le modèle
  d'emplacement étendu aux trois natures d'image (lecture de la déclaration, pose/remplacement, ensemble
  ordonné d'une galerie) s'y teste aussi en aller-retour.
- **Intégration (couture HTTP contre la vraie base locale, `workerd` via Miniflare, ADR-0003).** La
  persistance D1 d'un média admis (identité, nom d'origine, dimensions, type déduit, octets), la pose/le
  remplacement d'une image dans le brouillon d'un emplacement, le retrait à la suppression sur plusieurs
  pages, et surtout la **route de service des octets** : type déduit servi, garde de session effective (une
  requête sans session n'obtient aucun octet), `nosniff` présent (posé par le middleware, I11).
- **Observé (`observé`, pas de test automatisé).** Le rendu visuel de la grille et des vignettes, le
  sélecteur d'image dans l'éditeur, la composition/réordonnancement d'une galerie ou d'un carrousel à la
  souris — l'agencement à l'écran n'a pas d'oracle a priori exécutable (voir « Zones sans test automatisé »).

## Oracle par famille de scénarios

- **Ingestion — format.** Oracle a priori exact : un jeu de fichiers réels (JPEG, PNG, WebP valides ; SVG ;
  un fichier hors liste ; un fichier dont l'extension/le `Content-Type` ment sur les octets) → accepté /
  refusé déterministe. Testable en `tdd`.
- **Ingestion — poids.** Oracle sur les bornes (voir cas limites). Testable en `tdd`.
- **Ingestion — dimensions.** Oracle : dimensions connues d'images de référence par format → valeurs lues
  égales. Testable en `tdd`.
- **Comptage de références / effaçabilité / orphelinat.** Oracle a priori : ensembles de références
  (publiés, brouillons) → effaçable ssi les deux ensembles sont vides ; orpheline ssi plus référencée.
  L'ensemble publié étant vide aujourd'hui, les tests le passent explicitement en paramètre (et couvrent le
  cas non vide, prêt pour la publication). Testable en `tdd`.
- **Pose / remplacement / galerie.** Oracle : brouillon attendu (`contenu` JSON) après le geste ; refus si
  emplacement non déclaré ou d'une autre nature. Testable en `tdd`/`test`.
- **Service des octets.** Oracle observable par la couture HTTP : statut, `Content-Type` déduit, `nosniff`
  présent, refus sans session. Testable en `test`.
- **Suppression multi-pages.** Oracle : après confirmation, chaque page concernée porte un brouillon retirant
  l'image ; l'image devient orpheline ; l'état publié intact. Testable en `test`.

## Cas limites (partitions d'équivalence + valeurs aux bornes)

- **Format (EP)** : JPEG valide · PNG valide · WebP valide · SVG · format hors liste (GIF, HEIC, PDF) ·
  fichier vide ou tronqué (en-tête illisible → refus, pas d'image sans dimensions persistée).
- **Mensonge sur la nature (EP)** : extension `.png` + octets JPEG (accepté comme JPEG, type déduit) ·
  extension `.jpg` + octets SVG (refusé) · `Content-Type: image/png` + octets hors liste (refusé).
- **Poids (BVA)** : 2 Mo − 1 octet (accepté) · exactement 2 Mo (à fixer côté implémentation : la borne est
  « une ligne D1 » ; le ticket tranche inclusif/exclusif et le teste) · 2 Mo + 1 octet (refusé).
- **Dimensions (EP par format)** : PNG entrelacé · WebP `VP8` / `VP8L` / `VP8X` · JPEG à plusieurs segments
  avant le SOF — chacun doit rendre les bonnes dimensions ou refuser proprement.
- **Références (EP)** : image posée dans 0 emplacement (orpheline, supprimable directement) · dans 1 · dans
  n emplacements de pages différentes (suppression multi-pages) · référencée en brouillon mais pas en publié
  (cas courant) · l'ensemble publié non vide (cas futur, testé par paramètre).
- **Recherche (EP)** : correspondance sur le nom seul · sur la description seule · sur aucun (état vide de
  recherche) · casse/accents (comportement à fixer et tester).
- **Galerie/carrousel (EP)** : 0 image · 1 · plusieurs ordonnées · réordonnancement · retrait d'une image de
  l'ensemble.

## Doubles

Doubles **minimaux**. La logique de `core/` se teste sans double (fonctions pures, fichiers de fixtures
d'images réelles pour l'ingestion). La couture d'intégration utilise la **vraie** base D1 locale servie par
Miniflare (ADR-0003), pas un mock de D1 — aucun sur-mock couplé à l'implémentation. La session est établie
par le vrai chemin de 001 dans la couture, non simulée par un double.

## Zones sans test automatisé

- **Rendu visuel de la grille et des vignettes**, **agencement du sélecteur d'image**, **glisser-déposer de
  réordonnancement d'une galerie/carrousel** : pas d'oracle a priori exécutable → mode `observé` (preuve
  observable : build/typecheck/lint + capture) ou `humanCheckRequired` pour ce qu'un agent ne peut constater
  (lisibilité, ergonomie au pouce). Le décompte des vignettes et la présence de la marque d'orphelin restent,
  eux, vérifiables et n'ont pas à passer en observé.
- **Le rendu de la description sur une page publiée (FR-039)** et **l'effacement à la publication (FR-037)**
  ne sont pas exécutés par ce change : hors périmètre de test ici, portés par les features de publication et
  de site public.
