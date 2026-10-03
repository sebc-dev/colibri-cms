# 04 — L'écran Réglages s'ouvre depuis le menu et montre le contenu de départ

**Bloqué par :** 02
**Vérif :** test
**Fichiers :** `src/pages/admin/reglages.astro`, `src/admin/MenuRubriques.astro`, `src/admin/GabaritCadre.astro`, `src/admin/textes.ts`, `tests/integration/ecran-reglages.test.ts`, `tests/integration/cadre-avec-l-ecran.test.ts` (dérogation, voir plus bas)

## Ce que ça livre

La rubrique « Réglages » du menu de l'administration est posée mais ne mène à rien. Désormais, en
session, l'éditrice la choisit et l'`Écran : Réglages` s'ouvre dans le cadre, « Réglages » marquée
active. L'écran présente trois cartes, dans cet ordre : **Coordonnées**, **Réseaux sociaux**,
**Mention d'information**, chacune avec son titre et le contenu de départ de son réglage (lu par le
ticket 02). La carte Coordonnées montre un champ par coordonnée déclarée, dans l'ordre de la
déclaration, intitulé par son nom, ou à défaut par le libellé de sa nature (« Téléphone »,
« Adresse e-mail », « Adresse postale », « Texte ») — **jamais** par son identifiant. Sans session,
l'écran renvoie à la connexion. Tout texte venu de la déclaration paraît tel quel : `<`, `>`, `&` et les
guillemets sont du texte, jamais du balisage. Aucun terme de développeur.

**Décisions à respecter :**
- `src/pages/admin/reglages.astro`, servi dans `GabaritCadre` avec `rubrique="reglages"`, derrière la
  garde de session importée (`I6`, ADR-0007) — sans session, redirection vers la connexion comme les
  autres écrans. `IdRubriqueServie` reçoit `'reglages'` ; la rubrique reçoit son `href`
  (`/admin/reglages`). Formulaires et Demandes restent sans écran.
- Les trois cartes sont **rendues par le serveur** (contenu présent sans script), sur les éléments
  déjà dessinés par le change 005 (carte, titre de carte, champ) — tokens d'`admin.css` seuls (`I14`).
  Les champs de la carte Coordonnées sont des champs de saisie déjà remplis (adresse postale en zone
  multiligne, `inputmode`/`type` adaptés au téléphone et à l'e-mail) ; leur enregistrement arrive au
  ticket 06. Les cartes Réseaux sociaux et Mention montrent ici la liste et le texte de départ en
  lecture ; leurs gestes arrivent aux tickets 07 et 08. Chaque carte porte une **zone de marque de
  brouillon qui lui est propre** (vide à ce ticket) et un bouton « Enregistrer » prévu en pied de carte.
- Carte Coordonnées vide de déclaration : « Aucune coordonnée n'est prévue pour votre site. », sans
  geste de création.
- Rendu par interpolation échappée d'Astro seulement : ni `set:html` ni `innerHTML` (`I5`) ; la
  mention est rendue en texte (Markdown non interprété) ou par le rendu sûr existant, jamais injectée en
  HTML brut. Aucune directive `client:*`, aucun script en ligne, CSP inchangée (`I4`, `I11`, `I12`).
- L'écran rejoint la liste des écrans cadrés lue par `tests/integration/cadre-avec-l-ecran.test.ts`
  (logo, menu, rubrique marquée, CSP) — ajout de cas, additif.

**Dérogation déclarée — test existant à mettre à jour.** Le delta `pages-et-emplacements` **modifie**
l'exigence « Cadre de navigation » : « Réglages » devient une rubrique servie. Le test existant
`SC-03c` de `tests/integration/cadre-avec-l-ecran.test.ts` (change 005) affirme l'inverse
(`/admin/reglages` ne mène à aucun écran ; « Réglages » dans `RUBRIQUES_SANS_ECRAN`). Ce ticket est
**autorisé** à retirer `/admin/reglages` de la liste des routes sans écran et « Réglages » de
`RUBRIQUES_SANS_ECRAN`, et à renommer le test en conséquence — **et rien d'autre** dans ce test ; la
vérification de Formulaires et Demandes et l'absence de geste de structure y restent intactes. Arbitré
par l'humain à la décomposition ; si la vérification finale bloque malgré la dérogation, la retouche est
reprise à la main.

**Hors périmètre :** tout enregistrement et toute marque de brouillon (tickets 05 à 08) ; la lecture
des brouillons (ticket 06) ; l'affichage des réglages sur le site public.

## Critères
- [ ] En session, choisir « Réglages » dans le menu du cadre ouvre l'`Écran : Réglages` dans le cadre, « Réglages » marquée active, présentant les cartes Coordonnées, Réseaux sociaux et Mention d'information dans cet ordre   (SC-04a)
- [ ] L'`Écran : Réglages` demandé sans session ouverte renvoie à l'écran de connexion, sans rien montrer des réglages   (SC-04b)
- [ ] Quand une valeur de coordonnée, un nom de lien ou un nom de coordonnée déclaré contient `<`, `>`, `&` ou des guillemets, ces caractères paraissent comme du texte sur l'écran et aucun balisage n'est interprété   (SC-04c)
- [ ] Aucun terme de développeur ne paraît sur l'écran des réglages, ses cartes, ses champs et leurs libellés (FR-117)   (SC-04d)
- [ ] Pour une déclaration portant « Téléphone de l'atelier » (téléphone) puis une adresse e-mail sans nom, la carte Coordonnées montre deux champs dans cet ordre, intitulés « Téléphone de l'atelier » et « Adresse e-mail », et aucun identifiant n'apparaît à l'écran   (SC-04e)
- [ ] Sur chaque écran cadré, la barre latérale montre les cinq rubriques, la rubrique de l'écran courant marquée active — « Réglages » sur l'écran des réglages   (SC-04f)
- [ ] Aucune rubrique autre que « Mes pages », « Médias » et « Réglages » ne mène à un écran servi, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page   (SC-04g)
