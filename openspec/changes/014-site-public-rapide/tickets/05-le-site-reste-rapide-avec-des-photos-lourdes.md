# 05 — Le site reste rapide avec des photos lourdes

**Bloqué par :** 01, 02, 03, 04
**Vérif :** observé
**Fichiers :** `src/platform/medias/variantes.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

La preuve que **SC-005** tient avec de vraies photos : chaque page publique obtient au moins 95 au
score Lighthouse Performance en mobile, en médiane de trois passes. La mesure se fait sur le site factice
de recette dont l'accueil pose une photo de tête et une galerie de 45 photos d'environ 1 Mio chacune (la
variante « photos-lourdes »). Le 2026-11-01, avant ce change, l'Accueil de cette variante obtenait 75.

Le ticket livre aussi une construction dont le coût est maîtrisé et mesuré. Chaque construction refait
les variantes de toute la bibliothèque publiée, et ce coût s'ajoute au délai de mise en ligne (SC-004 :
moins de 5 minutes).

**Décisions à respecter (design D9 et § Risks) :**
- **Le coût de construction (D9).** Dans l'adaptateur `src/platform/medias/variantes.ts` :
  - chaque photo est décodée une seule fois, puis déclinée par clonage ;
  - les photos sont traitées en parallèle, dans la limite de `os.availableParallelism()`, soit 2 sur
    Workers Builds gratuit ;
  - une variante déjà présente et plus récente que son original n'est pas refaite. Ce cas ne se produit
    qu'en développement et dans les tests, puisque `prebuild` vide `./medias` ;
  - une ligne de bilan termine l'étape : `[variantes] <n> photos, <f> fichiers, <s> s`.

  Le repli du ticket 03 (image servie telle que déposée, nommée dans la sortie) et les protections du
  ticket 02 tiennent toujours. Les tests statiques des tickets 02 et 03 se rejouent à chaque construction
  et gardent les noms et le contenu des variantes.
- **Les leviers si le score manque**, dans l'ordre et sans changer les specs :
  1. la qualité WebP 70 au lieu de 80 (122 Kio mesurés pour la variante de 720 px, contre 150) ;
  2. une qualité propre à la variante de 720 px.

  La mesure décide. Si ces leviers ne suffisent pas, le ticket s'arrête pour un arbitrage humain : la
  spec ne pourrait plus être tenue sans la changer.
- **Où vont les chiffres.** Les chiffres mesurés (scores, coût par photo, qualité retenue) vont dans le
  cahier de recette, jamais dans l'ADR promu : un ADR accepté ne se modifie plus. Si le coût mesuré sur
  Workers Builds dépasse 0,5 s par photo, le ticket le signale : un nouvel ADR remplacera l'ADR promu,
  et le cache des variantes deviendra le change suivant.

**La preuve observable :**
- **Redéployer** la variante photos-lourdes (skill `site-factice`) sur le serveur de recette
  `colibri.sebc.dev`, rebâti par Workers Builds depuis `sebc-dev/colibri_recette`.
- **Lighthouse** 13.6.0 (`npx lighthouse@13`, avec le Chromium de Playwright), en mobile, 3 passes par
  page sur Accueil, Tarifs et Contact. Rapporter les 9 scores, les médianes, et les audits « LCP request
  discovery » et « Improve image delivery ».
- **Au navigateur** (`playwright-cli`, écran de 412 px) : ouvrir Accueil et l'aperçu d'Accueil. Relever
  l'absence de tout refus `img-src` dans la console : les tests `workerd` n'appliquent aucune politique
  de sécurité. Relever aussi la variante effectivement chargée : 360 px pour une case de galerie, 720 px
  pour l'image de tête.
- **Le coût** : relever la ligne de bilan dans la sortie de Workers Builds et dans un build local de la
  variante photos-lourdes, et en tirer le coût par photo.
- **Le nombre de fichiers** : `find dist -type f | wc -l` sur le site de démo, avant et après. Il y en a
  119 aujourd'hui, dont 2 originaux ; +6 sont attendus (3 + 3 variantes, originaux gardés).
- **Contrôle humain** (`humanCheckRequired`) : la netteté de la photo de tête et d'une case de galerie,
  et l'absence d'artefacts de compression, regardées sur un téléphone. Ni Lighthouse ni un test ne
  jugent le flou.
- **Le cahier de recette** `docs/cahier-de-test.md` gagne une section pour ce change : la mesure
  Lighthouse, la console, la variante chargée, le coût par photo et le regard humain sur la netteté.

**Hors périmètre :**
- un cache des variantes entre deux constructions (change suivant, si la mesure l'exige) ;
- un deuxième format d'image (AVIF) ;
- changer la mise en page du site ;
- les pages aux images légères, qui obtenaient déjà 97.

## Critères
- [ ] Quand on mesure trois fois, en mobile, chaque page d'un site publié dont l'accueil pose une photo de tête et une galerie de 45 photos d'environ 1 Mio chacune, la médiane du score Performance de chaque page est d'au moins 95   (SC-05a)
