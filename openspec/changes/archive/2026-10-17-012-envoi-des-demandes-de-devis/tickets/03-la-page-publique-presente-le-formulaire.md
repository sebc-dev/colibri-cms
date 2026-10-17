# 03 — La page publique présente le formulaire qu'elle pose

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/core/rendu/page.ts`, `src/render/Formulaire.astro`, `src/render/formulaire/textes.ts`, `src/render/index.ts`, `src/site/page.astro`, `src/site/site.css`, `src/pages/[...slug].astro`, `src/pages/admin/apercu/[...slug].astro`, `tests/unit/rendu/composer-formulaire.test.ts`, `tests/integration/formulaire-sur-la-page.test.ts`, `tests/parcours/formulaire-dessine.parcours.ts`

## Ce que ça livre

Un visiteur qui ouvre une page portant un emplacement de formulaire voit, à la place de cet emplacement,
le formulaire publié qu'il désigne :
- ses champs dans l'ordre déclaré, chacun sous son libellé ;
- un champ obligatoire marqué du mot « obligatoire » après son libellé, pas d'un astérisque seul ;
- un champ à choix unique dessiné comme un groupe de boutons d'option, où une seule option se choisit ;
- un champ à choix multiple dessiné comme un groupe de cases à cocher, où plusieurs options se cochent ;
- dans un champ avec prix, chaque option suivie de son prix en euros (« Fraise — 10 € », « 10,50 € »
  quand il y a des centimes) ;
- les options d'un champ sans prix, sans aucun prix ;
- un champ de texte, de texte long, d'e-mail ou de téléphone dessiné comme une zone de saisie de sa
  sorte ;
- aucun champ de fichier (FR-061).

Viennent ensuite, dans cet ordre :
1. le bloc du total, « Total estimé : 0 € », avec la mention « Estimation indicative, non engageante. »
   (FR-055) ;
2. la mention d'information sur le traitement des coordonnées, réglée par l'éditrice (FR-056) ;
3. le bouton « Envoyer ma demande ».

Tout cela figure **dans le document servi lui-même**, bâti à la reconstruction du site. Rien ne demande
d'échange supplémentaire. Un même formulaire posé sur « Tarifs » et sur « Contact » paraît sur les deux
pages, avec les mêmes options et les mêmes prix.

Le document est complet mais **sans script** à ce stade :
- le total reste à « 0 € » et ne suit pas encore la sélection (ticket 05) ;
- le bouton est inactif dans le document ;
- les textes des états à venir — envoi en cours, confirmation, échecs — sont déjà présents en éléments
  masqués ;
- un `<noscript>` dit : « Le total et l'envoi de ce formulaire ont besoin de JavaScript, désactivé dans
  votre navigateur. Vous pouvez nous écrire avec les coordonnées en bas de page. »

**Décisions à respecter :**
- **Composition** (ADR-0027, ADR-0024). `composerPage` (`src/core/rendu/page.ts`) reçoit les
  formulaires déclarés. Pour un emplacement de formulaire, elle rend un `FormulaireRendu` qui porte :
  - le nom du formulaire ;
  - les champs dans l'ordre : identifiant, nature, libellé, obligatoire, avec ou sans prix, et les
    options avec leur prix en centimes ;
  - la mention d'information courante, analysée comme un texte riche ;
  - un mode d'envoi, `actif` ou `desactive`.
- **Source des formulaires.** La page publique lit la déclaration empaquetée
  (`lireFormulairesDeLaDeclaration`, `src/platform/contenu/formulaires.ts`), c'est-à-dire le contenu
  déposé par la dernière publication, en mode `actif`. **Dans ce ticket, la route d'aperçu passe la même
  source, en mode `actif`**, pour que l'aperçu reste identique à la page publique. Le brouillon et le mode
  `desactive` arrivent au ticket 06.
- **Prix.** Ils s'affichent par `formaterPrix` (`src/core/formulaires/prix.ts`) suivi de « € ». Aucun
  nombre à virgule flottante (ADR-0018).
- **Dessin** (I3, I16, ADR-0029). `src/render/Formulaire.astro` est exporté par le baril
  `src/render/index.ts`, et dessiné par `src/site/page.astro`, son seul importateur. Aucun fichier
  `.svelte` ni aucune directive `client:*` sous `src/render/` ou `src/site/`.
- **Textes.** Les libellés, les noms et les options sont écrits par interpolation : Astro les échappe.
  La mention d'information passe par le rendu du texte riche, `src/render/markdown/`, seul lieu du HTML
  brut (I5).
- **Données du script à venir.** Le ticket 05 aura besoin des prix en centimes, des natures et des
  obligations. Ils voyagent en attributs `data-*` du document, jamais en script écrit dans la page.
- **Saisie du produit seule.** Le formulaire porte `novalidate` : la vérification de saisie sera celle du
  produit (ticket 08), jamais la bulle du navigateur.
- **Accessibilité.** Chaque groupe à choix est un `fieldset` titré par son libellé, et toute la ligne
  d'une option se touche.
- **Textes destinés au visiteur.** Ils vivent dans `src/render/formulaire/textes.ts` :

  | Élément | Texte |
  |---|---|
  | Total | « Total estimé : 39 € » |
  | Mention avec le total | « Estimation indicative, non engageante. » |
  | Bouton | « Envoyer ma demande » |
  | Envoi en cours | « Envoi en cours… » |
  | Confirmation | « Merci, votre demande a été envoyée. » |
  | Acheminement en échec, site injoignable | « Votre demande n'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants. » |
  | Seuil atteint | « Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure. » |
  | Formulaire changé | « Ce formulaire vient d'être mis à jour. Rechargez la page pour voir les prix à jour, puis refaites votre demande. » |
  | Sans script | « Le total et l'envoi de ce formulaire ont besoin de JavaScript, désactivé dans votre navigateur. Vous pouvez nous écrire avec les coordonnées en bas de page. » |

- **Mise en page.** Elle s'écrit sobrement dans `src/site/site.css`, en une colonne, et tient sur un
  téléphone de 375 px sans défilement horizontal.
- **Valeurs des scénarios.** Le contenu de départ porte « Fraise » à 10 €. Le scénario « Fraise à
  10,50 € » se joue sur une fixture du site jetable (`scripts/batir-site-jetable.mjs`) ou au niveau de la
  composition.

**Hors périmètre :**
- le total qui suit la sélection, et tout script (ticket 05) ;
- l'envoi (ticket 07) ;
- le brouillon dans l'aperçu (ticket 06) ;
- l'échec de la reconstruction sur un formulaire introuvable ou sans moyen de répondre (ticket 04).

## Critères
- [x] Quand un visiteur demande la page « Contact », qui pose le formulaire « Devis gâteau », la page présente, à la place de cet emplacement, les champs « Parfum », « Nombre de parts », « Occasion », « Votre nom », « Votre adresse e-mail », « Votre numéro de téléphone » et « Votre message », dans cet ordre, « Parfum » et « Votre adresse e-mail » marqués obligatoires   (SC-03a)
- [x] Quand le formulaire « Devis gâteau » est publié avec « Vanille » à 8 €, « Chocolat » à 9 € et « Fraise » à 10,50 € dans « Parfum », la page présente ces trois options, chacune suivie de son prix — « 8 € », « 9 € », « 10,50 € » —, et les options d'« Occasion », champ sans prix, sans aucun prix   (SC-03b)
- [x] Quand le visiteur choisit « Vanille » puis « Chocolat » dans « Parfum », seule « Chocolat » reste choisie   (SC-03c)
- [x] Quand le visiteur coche « Anniversaire » puis « Mariage » dans « Occasion », les deux restent cochées   (SC-03d)
- [x] Quand un visiteur consulte une page qui pose un formulaire, la mention que l'estimation est indicative et non engageante paraît avec le total, et la mention d'information publiée paraît avant le bouton d'envoi   (SC-03e)
- [x] Quand une page qui pose un formulaire est demandée, ses champs, ses options, leurs prix et les deux mentions figurent dans la réponse elle-même, sans qu'aucun échange supplémentaire ne soit nécessaire pour les obtenir   (SC-03f)
- [x] Quand un visiteur parcourt le formulaire, aucun champ n'offre de joindre un fichier   (SC-03g)
- [x] Quand un libellé de champ ou d'option publié contient les caractères `<`, `>`, `&` ou des guillemets, la page les affiche comme du texte, et aucun balisage n'est interprété   (SC-03h)
- [x] Quand la page « Tarifs » pose, à la suite de son image de bandeau, un emplacement qui désigne le formulaire « Devis gâteau », la page présente le formulaire « Devis gâteau » après l'image de bandeau, et aucun autre emplacement entre les deux   (SC-03i)
- [x] Quand les pages « Tarifs » et « Contact » posent toutes deux le formulaire « Devis gâteau », chacune des deux pages présente ce formulaire, avec les mêmes options et les mêmes prix   (SC-03j)
