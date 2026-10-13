# 18 — L'éditrice sait si sa publication est en ligne, et peut la relancer

**Bloqué par :** 15
**Vérif :** tdd
**Fichiers :** `src/core/publication/etat.ts`, `src/platform/contenu/publication.ts`, `src/platform/publication/magasin.ts`, `src/platform/publication/publier.ts`, `src/platform/medias/magasin.ts`, `src/pages/admin/publication/etat.ts`, `src/pages/admin/publication/relancer.ts`, `src/pages/admin/publier.astro`, `src/admin/GabaritCadre.astro`, `src/admin/PastillePublication.astro`, `src/admin/ilots-svelte-5/EcranPublier.svelte`, `src/admin/textes.ts`, `tests/unit/publication/etat.test.ts`, `tests/integration/issue-de-la-publication.test.ts`, `tests/static/issue-de-la-publication-statique.test.ts`

## Ce que ça livre

Une fois le contenu déposé, l'administration dit à l'éditrice où en est la mise en ligne (FR-090) :
- **« en cours de mise en ligne »** tant que le site en service n'est pas né de cette publication ;
- **« en ligne »** dès qu'il l'est ;
- **« n'a pas abouti »** quand 30 minutes ont passé depuis le dépôt sans qu'il le soit. Le site
  reste alors tel qu'il était, et les modifications sont gardées (FR-091).

Une mise en ligne qui arrive après la borne fait passer l'état à « en ligne ».

L'état de la dernière publication paraît dans le **cadre**, sur chaque écran : l'éditrice le connaît
même après avoir quitté l'écran Publier. Quand la dernière mise en ligne n'a pas abouti, elle peut la
**relancer**, même sans aucun brouillon. La relance dépose une nouvelle marque de publication, sans
changer le contenu. Aucun terme de développeur ne paraît dans ces états.

L'administration sait de quelle publication le site en service est né sans aucun service tiers ni
aucune adresse publique nouvelle : la marque de publication déposée est **empaquetée** à la
construction du site.

**Décisions à respecter (ADR-0023) :**
- **Marque empaquetée** : `src/platform/contenu/publication.ts` empaquette `content/publication.json`
  par `import.meta.glob`. S'il est absent, le site n'est né d'aucune publication. Le Worker qui
  répond sait ainsi de quelle publication il est né. La marque survit aux commits ultérieurs de
  l'intégrateur, parce que seul un dépôt réécrit ce fichier.
- **État dérivé** : `src/core/publication/etat.ts`, pur, avec l'horloge en paramètre.
  - Si la marque du site égale la dernière marque déposée : « en ligne ».
  - Sinon, moins de `BORNE_MISE_EN_LIGNE` (30 minutes, constante nommée) depuis le dépôt :
    « en cours de mise en ligne ».
  - Sinon : « n'a pas abouti ».
  - Si le verrou est pris : « publication en train de partir ».
  - Si aucune publication n'a eu lieu : aucun état.

  L'état n'est jamais stocké : il se dérive à chaque écran.
- **Lecture** : `GET /admin/publication/etat`, gardée (I6), ne fait que lire et dériver. L'écran
  Publier l'interroge toutes les 10 secondes tant que l'état est « en cours ».
- **Pastille du cadre** (`src/admin/PastillePublication.astro`, rendue par le serveur, à côté de
  « Publier ») :
  - « Mise en ligne en cours… » ;
  - « Site à jour » ;
  - « La dernière mise en ligne n'a pas abouti », qui mène à l'écran Publier ;
  - « Publication en cours… ».

  Jamais de pastille avant la première publication.
- **États de l'écran Publier** :
  - en ligne : « Votre site est à jour. » et un lien « Voir mon site » (nouvel onglet) ;
  - n'a pas abouti : « La mise en ligne n'a pas abouti. Votre site est resté tel qu'il était, et vos
    modifications sont gardées. » et le bouton « Relancer la mise en ligne », offert même quand il n'y
    a rien à publier.
- **Relance** : `POST /admin/publication/relancer`, gardée, `SameSite=Strict`. Elle dépose une marque
  neuve et aucun autre fichier, par le verrou et le dépôt de la branche principale (tickets 12 et
  15) : nouveau commit, nouvelle reconstruction, contenu inchangé. L'état repasse à « en cours ».
- **Vidage des octets** (ADR-0020) : à chaque lecture de l'état « en ligne », les images publiées que
  le Worker empaquette voient leurs octets vidés en base.
- **Cas limites** à couvrir : 29 min 59 s et 30 min après le dépôt ; une marque ancienne après la
  borne, puis égale (mise en ligne tardive) ; aucune publication (aucune pastille).

**Hors périmètre :** la reconstruction réelle et le chronométrage de SC-004 (ticket 19).

## Critères
- [x] Quand le contenu vient d'être déposé et que le site en service n'est pas encore né de cette publication, l'administration dit que la publication est en cours de mise en ligne, sur l'écran Publier comme dans le cadre   (SC-18a)
- [x] Quand le site en service est né de la dernière publication déposée, l'administration dit que la publication est en ligne   (SC-18b)
- [x] Quand le site en service n'est pas né de la dernière publication, 29 minutes et 59 secondes après son dépôt puis 30 minutes après, l'administration dit d'abord « en cours de mise en ligne », puis que la mise en ligne n'a pas abouti, que le site est resté tel qu'il était et que les modifications sont gardées   (SC-18c)
- [x] Quand la mise en ligne a été dite sans aboutissement puis que le site en service naît de cette publication, l'administration dit que la publication est en ligne   (SC-18d)
- [x] Quand la dernière mise en ligne n'a pas abouti, qu'aucun brouillon n'existe et que l'éditrice relance la mise en ligne, une nouvelle marque de publication est déposée sans changer le contenu, et l'état repasse à « en cours de mise en ligne »   (SC-18e)
- [x] Aucun terme de développeur ne paraît dans l'état d'une publication, en cours, en ligne, sans aboutissement ou refusée (FR-117)   (SC-18f)
- [x] Quand une publication a été déposée et que l'éditrice ouvre n'importe quel écran servi derrière la garde, le cadre dit si cette publication est en cours de mise en ligne, en ligne, ou si elle n'a pas abouti   (SC-18g)
- [x] Aucun terme de développeur ne paraît dans le menu, le geste « Publier », l'état de la dernière publication et les libellés du cadre (FR-117)   (SC-18h)
