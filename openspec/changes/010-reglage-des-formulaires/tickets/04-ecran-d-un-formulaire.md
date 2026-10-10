# 04 — L'écran d'un formulaire montre ses champs à choix et leurs options

**Bloqué par :** 02, 03
**Vérif :** test
**Fichiers :** `src/pages/admin/formulaires/[id].astro`, `src/admin/textes.ts`, `tests/integration/ecran-formulaire.test.ts`

## Ce que ça livre

Chaque formulaire déclaré a désormais son `Écran : Formulaire`, ouvert depuis sa ligne de la liste
(ticket 02), dans le cadre, « Formulaires » marquée active. L'écran est titré par le nom du formulaire,
porte un lien de retour « Formulaires » et une phrase d'aide : « Vous réglez ici les choix proposés aux
visiteurs et leurs prix. Les questions elles-mêmes sont posées avec vous à la création du site. ». Il
présente une carte par **champ à choix**, dans l'ordre de la déclaration, titrée par le libellé du champ
(« Parfum ») avec la mention « Un seul choix » ou « Plusieurs choix possibles », et listant ses options :
le libellé de chacune et, dans un champ avec prix, son prix **en euros** (« 8 € »), jamais en centimes.
Les champs sans option (nom, adresse e-mail, téléphone, message) **n'apparaissent pas** : rien ne
suggère qu'une question puisse être ajoutée, retirée, renommée ou déplacée. Un formulaire non déclaré
donne une réponse « introuvable » ; sans session, l'écran renvoie à la connexion.

**Décisions à respecter :**
- `src/pages/admin/formulaires/[id].astro`, servi dans `GabaritCadre` avec `rubrique="formulaires"`,
  derrière la garde de session importée (`I6`, ADR-0007) : la garde passe **d'abord** (sans session →
  `/admin/connexion`, même pour un identifiant inconnu).
- `[id]` est cherché dans la liste déjà chargée par `src/platform/contenu/formulaires.ts` (ticket 01) —
  **jamais** utilisé pour lire un fichier. Non trouvé → réponse `404` « introuvable », sur le modèle de
  la page inconnue de l'administration (`src/pages/admin/[...inconnue].astro`), sans rien du formulaire.
- Cartes **rendues par le serveur** (contenu présent sans script), sur les éléments déjà dessinés par
  les changes 005 et 008 (carte à titre, champ, bouton) : une ligne par option, champ « Choix » (le
  libellé) et, dans un champ avec prix, champ « Prix » suffixé « € » (clavier numérique décimal sur
  téléphone), déjà remplis. Les gestes de liste (monter, descendre, retirer, ajouter) et l'effet
  d'« Enregistrer » arrivent au ticket 07.
- Un **seul** bouton « Enregistrer » pour tout le formulaire, en pied d'écran. Une **zone de marque de
  brouillon** à côté du titre, vide à ce ticket (remplie au ticket 06).
- Les options affichées sont celles de la **déclaration** ; le contenu du brouillon arrive au ticket 06.
- Prix affichés par `formaterPrix` (ticket 03), suffixés « € ».
- Rendu par l'interpolation échappée d'Astro seulement : ni `set:html`, ni `innerHTML`, ni `Fragment`
  (`I5`). Aucune directive `client:*`, aucun script en ligne ; écran servi sous les en-têtes réels de
  l'administration, CSP inchangée (`I4`, `I11`, `I12`) ; tokens d'`admin.css` seuls (`I14`). Textes
  visibles dans `src/admin/textes.ts`.
- **Ce ticket ne touche aucun test existant** : ses vérifications, y compris celles du cadre sur ce
  nouvel écran (rubrique active, politique de sécurité), vivent dans son propre fichier de test neuf.

**Hors périmètre :** le contenu du brouillon et la marque (ticket 06) ; les gestes sur les options et
l'enregistrement depuis l'écran (ticket 07) ; tout geste sur un champ (FR-050).

## Critères
- [ ] En session, ouvrir « Devis gâteau » montre l'`Écran : Formulaire` titré « Devis gâteau », avec « Parfum » et ses trois options dans l'ordre — Vanille 8 €, Chocolat 9 €, Fraise 10 € —, puis « Occasion » avec ses options sans prix, et rien pour « Votre adresse e-mail »   (SC-04a)
- [ ] En parcourant l'écran d'un formulaire, aucun moyen n'est offert d'ajouter, de retirer, de renommer ou de réordonner un champ   (SC-04b)
- [ ] En session, l'écran d'un formulaire demandé pour un identifiant qu'aucun formulaire déclaré ne porte répond « introuvable », sans rien montrer d'autre   (SC-04c)
- [ ] L'écran d'un formulaire déclaré demandé sans session ouverte renvoie à l'écran de connexion, sans rien montrer du formulaire   (SC-04d)
- [ ] Le nom du formulaire, les libellés de champ et les libellés d'option déclarés qui contiennent une esperluette, une apostrophe ou des guillemets paraissent comme du texte, et aucun balisage issu des données n'est interprété   (SC-04e)
- [ ] Aucun terme de développeur ni aucun identifiant ne paraît sur l'écran d'un formulaire, ses cartes et leurs libellés, et aucun prix n'y paraît en centimes (FR-117)   (SC-04f)
- [ ] Sur l'écran d'un formulaire, la barre latérale montre les cinq rubriques, « Formulaires » seule marquée active   (SC-04g)
