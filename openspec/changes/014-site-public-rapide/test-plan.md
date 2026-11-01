## Niveaux

- **Unité** (`tests/unit/`, dans `workerd`) : la règle des largeurs et des noms de variantes
  (`core`, D1 et D3) ; la marque de la première image dans `composerPage` (D5) ; la place annoncée par
  nature (D4). Ces trois règles sont pures, et c'est là que vivent les bornes. Elles se prêtent à la
  mutation ciblée (`stryker-rejeu-cible-force` : `--mutate 'f:L-L' --force`).
- **Statique sur site bâti** (`tests/static/`, worker de test et sites jetables de
  `scripts/batir-site-jetable.mjs`) : le HTML réellement produit (`srcset`, `sizes`, `fetchpriority`,
  `loading`), les fichiers du site produit (variantes présentes, originaux absents), les octets d'une
  variante (format et dimensions), et le repli d'une image impossible à réduire. C'est le seul niveau
  où l'étape de construction s'exécute vraiment.
- **Intégration** (`tests/integration/`) : l'aperçu d'une page dont une image est empaquetée et une
  autre ne l'est pas (D7).
- **Recette observée** (site factice, variante photos-lourdes) : le score Lighthouse (SC-005), la
  durée de l'étape sur Workers Builds, le nombre de fichiers, et l'absence de refus par la politique de
  sécurité au navigateur.

## Oracle

| Scénario du delta | Oracle |
|---|---|
| Une grande photo est proposée en trois largeurs | Une fixture de 2 000 × 1 500 dans un site jetable ; le `srcset` de la page bâtie liste 3 entrées `360w`, `720w`, `1080w` ; chaque fichier servi a le type `image/webp`, et ses dimensions, lues par le lecteur d'en-tête de `src/core/medias/ingestion.ts`, valent 360 × 270, 720 × 540 et 1 080 × 810 |
| Une image plus étroite n'est jamais agrandie | `media-fixture-equipe.png` (960 × 640), posée dans un site jetable (la démo ne la pose pas) : entrées `360w`, `720w`, `960w`, aucune au-delà |
| Une petite image garde sa taille | Une fixture de 300 px : une seule entrée `300w`, en WebP |
| La place annoncée suit la nature | Le module des places porte une forme structurée (seuil, part de l'écran, retrait), que le rendu sérialise. Le test l'évalue à 412 px avec 1rem = 16 px : image et carrousel valent 380 px, galerie moins de 190 px. Le test statique vérifie que la page bâtie porte, pour chaque nature, la chaîne sérialisée de cette forme |
| Le fichier déposé n'est jamais envoyé | Aucune page de `.wrangler/test-worker/client` ne référence `<id>.<empreinte>.png` ; `_astro/` ne contient aucun fichier dont le nom commence par `media-fixture-hero.` sans suffixe de largeur |
| Une image impossible à réduire paraît quand même | Un site jetable dont une image a un en-tête PNG valide et un corps tronqué : la construction aboutit, la page présente l'image avec sa description, et la sortie de construction (`resultat.json`) contient `[variantes] <id> servie telle que déposée` |
| La photo de tête est prioritaire | Accueil du site de démo bâti : la première `<img>` porte `fetchpriority="high"` et aucun attribut `loading` ; toutes les autres portent `loading="lazy"` |
| La première image est dans une galerie, dans un carrousel ; emplacement vide ; une seule prioritaire | Tests unitaires de `composerPage` sur des pages composées à la main : exactement une image a `prioritaire: true`, et c'est celle attendue |
| Une page chargée de photos lourdes reste rapide | Lighthouse 13.6.0, mobile, 3 passes par page sur la variante photos-lourdes déployée ; médiane du score Performance ≥ 95 pour Accueil, Tarifs et Contact (procédure : mémoire `lighthouse-mesure-sc-005`) |

## Cas limites

- **Largeurs** (bornes de `w < L` et de `min(L, 1080)`) : L = 1, 300, 359, 360, 361, 719, 720, 721,
  1 079, 1 080, 1 081, 2 000. Résultats attendus : 360 → [360] ; 361 → [360, 361] ; 720 → [360, 720] ;
  1 080 → [360, 720, 1080] ; 1 081 → [360, 720, 1080]. Jamais plus de 3 largeurs, jamais une largeur
  au-delà de L.
- **Hauteurs arrondies** : 1 280 × 640 → 360 × 180 ; une image 1 000 × 333 → 360 × 120 (119,88
  arrondi), jamais 0. Une hauteur de 1 px reste au moins 1.
- **Noms** : un identifiant qui contient des tirets (`media-fixture-hero-720.webp` → identifiant
  `media-fixture-hero`, largeur 720) ; un nom sans largeur, ou avec une largeur non entière, est ignoré.
- **Source par défaut** : variantes [360, 720, 1080] → 720 ; [360] → 360 ; [300] → 300.
- **Priorité** : page sans image ; emplacement d'image vide puis galerie ; la même image posée deux
  fois (seule la première occurrence est prioritaire) ; formulaire ou texte avant la première image
  (ils ne comptent pas).
- **Repli** : corps tronqué ; image animée (WebP à plusieurs images) ; dimensions d'en-tête au-delà de
  la limite de pixels de `sharp`. Les trois cas sont servis tels que déposés et nommés dans la sortie.
- **Formats** : PNG avec transparence (la variante WebP garde le canal alpha) ; JPEG orienté par EXIF
  (la variante est orientée et ne porte plus de métadonnées).

## Doubles

Aucun double de `sharp` : l'étape tourne pour de vrai dans les constructions jetables, sur de petites
fixtures versionnées sous `tests/static/fixtures/`. Les fixtures 2 000 px et 300 px sont générées une
fois et gardées légères (couleur unie). Les tests unitaires de `core` n'ont besoin d'aucun double. Le
test d'aperçu sème la base comme `tests/integration/apercu-avec-brouillons.test.ts` le fait déjà.

## Zones sans test automatisé

- **Score Lighthouse (SC-005)** : mode `observé`. Je joue la mesure sur la variante photos-lourdes
  redéployée (skill `site-factice`) et je rapporte les 9 scores, les médianes et les audits « LCP
  request discovery » et « Improve image delivery ».
- **Politique de sécurité au navigateur** : les tests `workerd` n'appliquent aucune CSP (mémoire
  `csp-invisible-aux-tests-workerd`). La recette ouvre Accueil et l'aperçu d'Accueil dans Chromium
  (`playwright-cli`) et relève l'absence de refus `img-src` dans la console, ainsi que la variante
  effectivement chargée (360 px pour la galerie, 720 px pour l'image de tête à 412 px).
- **Coût de construction** : relevé de la ligne `[variantes] <n> photos, <f> fichiers, <s> s` dans la
  sortie de Workers Builds de `colibri.sebc.dev` (mémoire `recette-raccordee-workers-builds`) et dans
  un build local de la variante photos-lourdes. Le coût par photo est reporté dans l'ADR promu.
- **Qualité visuelle des variantes** : `humanCheckRequired`. Il faut regarder la photo de tête et une
  case de galerie sur un téléphone ; ni Lighthouse ni un test ne jugent le flou ou les artefacts de
  compression.
- **Nombre de fichiers** : `find dist -type f | wc -l` avant et après, sur le site de démo (119
  fichiers aujourd'hui, 2 originaux) ; attendu : +4 fichiers (3 + 3 variantes − 2 originaux).
