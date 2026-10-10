# 02 — La rubrique « Formulaires » ouvre la liste des formulaires

**Bloqué par :** 01
**Vérif :** test
**Fichiers :** `src/pages/admin/formulaires.astro`, `src/admin/MenuRubriques.astro`, `src/admin/textes.ts`, `tests/integration/liste-des-formulaires.test.ts`, `tests/static/liste-des-formulaires-statique.test.ts`, `recette/site-factice/variantes/sans-formulaire/variante.json`, `recette/site-factice/README.md`, `.claude/skills/site-factice/scripts/site.mjs`, `docs/cahier-de-test.md`

## Ce que ça livre

La rubrique « Formulaires » du menu de l'administration est posée mais ne mène à rien. Désormais, en
session, l'éditrice la choisit et l'`Écran : Formulaires` s'ouvre dans le cadre, « Formulaires »
marquée active. L'écran présente une ligne par formulaire déclaré, sous son nom, dans l'ordre
alphabétique des identifiants — « Devis atelier » puis « Devis gâteau » pour la démonstration —, toute
la ligne menant à l'écran de ce formulaire. Sur un site qui ne déclare aucun formulaire, l'écran dit
« Aucun formulaire n'est prévu pour votre site. », sans aucun geste de création. Il n'offre aucun geste
d'ajout, de retrait, de renommage ni de déplacement de formulaire. Sans session, il renvoie à la
connexion. Aucun terme de développeur ni aucun identifiant n'y paraît.

**Décisions à respecter :**
- `src/pages/admin/formulaires.astro`, servi dans `GabaritCadre` avec `rubrique="formulaires"`,
  derrière la garde de session importée (`I6`, ADR-0007) — sans session, redirection vers
  `/admin/connexion` comme les autres écrans. `IdRubriqueServie` (`src/admin/MenuRubriques.astro`)
  reçoit `'formulaires'` et la rubrique reçoit son `href` (`/admin/formulaires`). « Demandes » reste
  sans écran ni lien.
- La liste vient du chargement de la déclaration posé au ticket 01
  (`src/platform/contenu/formulaires.ts`), dans l'ordre qu'il rend. Chaque ligne mène à
  `/admin/formulaires/<identifiant>` ; cet écran est servi au ticket 04 — ici, le lien se vérifie par son
  adresse. L'identifiant ne paraît que dans l'adresse du lien, jamais dans le texte visible.
- Liste rendue par le serveur, sur le modèle de la liste des pages (`src/pages/admin/mes-pages.astro` :
  une ligne menant à un écran), tokens d'`admin.css` seuls (`I14`). Les marques de brouillon des lignes
  arrivent au ticket 06.
- État vide : prouvé comme celui de « Mes pages » (`tests/static/liste-des-pages-statique.test.ts`) —
  la lecture de `core/` rend une liste vide sans aucun fichier, et la branche vide de l'écran porte le
  message, sans geste de création.
- Rendu par l'interpolation échappée d'Astro seulement : ni `set:html`, ni `innerHTML`, ni `Fragment`
  (`I5`). Aucune directive `client:*`, aucun script en ligne ; écran servi sous les en-têtes réels de
  l'administration, CSP inchangée (`I4`, `I11`, `I12`). Textes visibles dans `src/admin/textes.ts`.
- **Tests existants : ce ticket n'en touche aucun.** Une PR directe (#187), fusionnée **avant** ce ticket, a
  retiré des tests existants `tests/integration/cadre-avec-l-ecran.test.ts` (cas « SC-03c » du
  change 005) et `tests/integration/ecran-reglages.test.ts` (cas « SC-04g » du change 008) les seules
  vérifications qui affirmaient que « Formulaires » ne mène à aucun écran. Toutes les vérifications de ce ticket — y compris celles du
  cadre sur le nouvel écran (cinq rubriques, rubrique active, politique de sécurité) — vivent dans ses
  propres fichiers de test neufs.
- Recette :
  - le site factice reçoit une variante `sans-formulaire` (aucun formulaire déclaré). Aujourd'hui
    `.claude/skills/site-factice/scripts/site.mjs` ne remplace que `content/pages/` : `variante.json`
    reçoit une clé qui retire des formulaires (par identifiant), traitée par `composer()` ; la table des
    variantes de `recette/site-factice/README.md` la mentionne ;
  - `docs/cahier-de-test.md` : un § pour ce ticket (liste, ordre, état vide, connexion) ; CT-4.1 et
    CT-4.3 et la ligne « Hors périmètre » ne disent plus que « Formulaires » ne mène nulle part.

**Hors périmètre :** l'écran d'un formulaire (ticket 04) ; les marques de brouillon (ticket 06) ; la
rubrique « Demandes ».

## Critères
- [ ] En session, choisir « Formulaires » dans le menu du cadre ouvre l'`Écran : Formulaires` dans le cadre, « Formulaires » marquée active, présentant « Devis atelier » puis « Devis gâteau », chacun menant à l'écran de ce formulaire   (SC-02a)
- [ ] Sur un site qui ne déclare aucun formulaire, l'`Écran : Formulaires` dit qu'aucun formulaire n'est prévu pour le site, et n'offre aucun geste de création   (SC-02b)
- [ ] L'`Écran : Formulaires` demandé sans session ouverte renvoie à l'écran de connexion, sans rien montrer des formulaires   (SC-02c)
- [ ] Sur l'`Écran : Formulaires`, la barre latérale montre les cinq rubriques, « Formulaires » seule marquée active   (SC-02d)
- [ ] Aucune rubrique autre que « Mes pages », « Médias », « Réglages » et « Formulaires » ne mène à un écran servi, et ni le menu ni l'`Écran : Formulaires` n'offrent de geste d'ajout, de retrait, de renommage ni de déplacement de rubrique, de page ou de formulaire   (SC-02e)
- [ ] Les noms des formulaires sont affichés tels quels, jamais interprétés : la liste ne porte aucune balise issue des données, et la source de l'écran n'injecte aucune donnée comme balisage (ni `set:html`, ni `innerHTML`, ni directive `client:*`)   (SC-02f)
- [ ] Aucun terme de développeur ni aucun identifiant ne paraît sur l'`Écran : Formulaires` (FR-117)   (SC-02g)
