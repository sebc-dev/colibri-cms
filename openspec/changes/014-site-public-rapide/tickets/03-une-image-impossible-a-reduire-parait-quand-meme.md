# 03 — Une image impossible à réduire paraît quand même

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/platform/medias/variantes.ts`, `scripts/batir-site-jetable.mjs`, `tests/static/fixtures/site-jetable-image-irreductible/`, `tests/static/variantes-repli-statique.test.ts`

## Ce que ça livre

Une image publiée reste toujours visible sur le site, même quand la construction ne sait pas en tirer
de variantes réduites. Elle paraît alors **telle que déposée**, avec sa description et ses dimensions,
et la construction aboutit. La construction nomme cette image dans son compte rendu.

La raison de ce choix : l'éditrice ne lit pas le compte rendu de construction. Si une image bloquait la
mise en ligne, elle ne saurait pas laquelle retirer. Une image lourde vaut mieux qu'une publication
bloquée.

**Décisions à respecter (design D6) :**
- **L'étape ne lève jamais d'erreur pour une image admise.** Elle se replie dans trois cas :
  - `sharp` échoue à décoder l'image : fichier tronqué, ou dimensions annoncées au-delà de la limite de
    pixels de `sharp` (`limitInputPixels`), alors que l'ingestion admet un en-tête JPEG jusqu'à
    65 535 px ;
  - l'image est animée (`metadata.pages > 1`) : la réduire ne garderait que sa première image ;
  - l'écriture d'une variante échoue.
- **Le repli.** L'étape copie l'original sous `medias/variantes/<id>-<largeur originale>.<ext>`, avec
  son extension d'origine. Elle écrit dans la sortie de construction une ligne
  `[variantes] <id> servie telle que déposée : <raison>`. Le rendu lit cette copie comme une variante
  unique : la page n'a pas de `srcset` à plusieurs entrées. La copie double l'original dans le site, qui
  le garde déjà (ticket 02). Le repli reste rare.
- **Le repli ne vaut que pour un fichier admis.** Les refus du ticket 02 (nom hors de la forme stricte,
  en-tête qui n'est ni JPEG, ni PNG, ni WebP) restent des échecs de construction qui nomment le fichier
  (`security-review.md`, menaces 3 et 4).
- **La limite de pixels de `sharp` n'est jamais relevée** (`security-review.md`, mitigation 3) : une
  image qui la dépasse tombe dans le repli au lieu d'épuiser la mémoire.
- Une image servie par le repli garde ses métadonnées EXIF. Ce résidu est signalé dans
  `security-review.md` et n'est pas traité ici.

**Les tests :**
- `scripts/batir-site-jetable.mjs` gagne une construction attendue en **succès** dont il consigne la
  sortie dans `resultat.json`. Aujourd'hui, seules les constructions attendues en échec y sont
  consignées. Cette construction part d'une nouvelle fixture,
  `tests/static/fixtures/site-jetable-image-irreductible/`, qui pose des images admises mais
  irréductibles. Cette extension du script est de l'outillage de test : elle accompagne les tests.
- Le test lit `resultat.json` : code de sortie 0, et une ligne `[variantes] <id> servie telle que
  déposée` par image irréductible. Il lit aussi la page bâtie : chaque image y paraît avec sa description
  et ses dimensions, et sa seule adresse est la copie de l'original.
- Cas limites, chacun servi tel que déposé et nommé dans la sortie :
  - un PNG dont l'en-tête est valide et le corps tronqué ;
  - un WebP animé à plusieurs images, qui garde son animation ;
  - un en-tête qui annonce des dimensions au-delà de la limite de pixels de `sharp`.

**Hors périmètre :**
- réduire ces images par un autre moyen ;
- retirer les métadonnées d'une image servie par le repli ;
- signaler le repli à l'éditrice dans l'administration.

## Critères
- [ ] Quand la reconstruction trouve une image publiée dont les octets ne se laissent pas réduire, le site est produit, la page présente cette image telle que déposée, avec sa description et ses dimensions, et la reconstruction nomme cette image dans son compte rendu   (SC-03a)
