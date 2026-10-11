# 03 — Le noyau vérifie une correction des options, prix compris

**Bloqué par :** 01
**Vérif :** tdd
**Fichiers :** `src/core/formulaires/prix.ts`, `src/core/formulaires/options.ts`, `src/core/formulaires/declaration.ts`, `tests/unit/formulaires/prix.test.ts`, `tests/unit/formulaires/options.test.ts`

## Ce que ça livre

Avant qu'une correction puisse être enregistrée (ticket 05), le noyau sait lire un montant tel que
l'éditrice l'écrit (« 12 », « 12,50 », « 12.50 ») et dire si une correction des options d'un formulaire
convient à sa **déclaration** : la liste des champs à choix, leur nature et leur marque avec ou sans prix
viennent **toujours** de la déclaration, jamais de ce que la soumission annonce. Le but est de ne laisser
passer ni une faute de saisie ni une tentative de toucher à la structure du formulaire, que seul
l'intégrateur pose (FR-050). Les bornes sont explicites et testées à leurs limites.

**Règles (logique pure de `src/core/formulaires/`, `I2`) :**
- **libellé d'option** : espaces de début et de fin retirés, de 1 à 80 caractères, sans saut de ligne ;
- **prix** (champ avec prix seulement) : un montant en euros d'au moins 0 € et d'au plus 99 999,99 €,
  au centime près ; la saisie admet la virgule ou le point décimal et au plus deux décimales ; une
  saisie vide, négative, à plus de deux décimales ou qui n'est pas un nombre est refusée ;
- **nombre d'options** : au moins 1 et au plus 30 par champ ;
- deux options d'un même champ ne portent pas le même libellé, **à la casse près** ;
- une option d'un champ sans prix ne porte **aucun** prix ;
- un champ que la déclaration ne porte pas, un champ qui n'est pas à choix, ou un champ à choix déclaré
  absent de la soumission fait refuser la soumission ;
- **un seul refus refuse toute la soumission** : aucun nouveau contenu de brouillon n'est rendu.

**Décisions à respecter :**
- `prix.ts` :
  - `lirePrixSaisi(texte)` rend un **entier de centimes** ou une raison de refus — jamais de
    `parseFloat` sur la saisie brute ;
  - `formaterPrix(centimes)` rend le montant à la française, **tel que `lirePrixSaisi` le relit** :
    virgule décimale, deux décimales seulement s'il y a des centimes, sans séparateur de milliers (800 →
    « 8 », 1250 → « 12,50 », 9 999 999 → « 99999,99 ») ; les écrans l'affichent suffixé « € ». Propriété
    à tenir : `lirePrixSaisi(formaterPrix(c)) = c` pour tout `c` de 0 à 9 999 999.
  - Une seule règle de lecture d'un montant : l'îlot et la route importeront ces fonctions (arête
    `admin → core` permise par `I1`).
- `options.ts` — `appliquerOptions(formulaireDeclare, brouillonCourant, corpsBrut)` vérifie une
  soumission de la forme `{ champs: [{ id, options: [{ id?, libelle, prix? }] }] }`, `prix` étant le
  **texte saisi**. Elle rend soit le nouveau contenu du brouillon
  `{ champs: { <idChamp>: [{ id, libelle, prix? }] }, derniersNumeros: { <idChamp>: n } }` (libellés
  débarrassés de leurs espaces de début et de fin, prix en centimes), soit `forme-invalide`, soit
  `valeur-refusee` avec `refus: [{ champ, raison }]`.
  - `champ` vaut `<idChamp>`, `<idChamp>.<rang>.libelle` ou `<idChamp>.<rang>.prix`, `rang` étant la
    position de l'option dans la soumission, **à partir de 0**.
  - `raison` est un **code** (jamais un texte français : la traduction vit dans l'îlot, ticket 07).
- **Identifiants d'option** :
  - une option soumise avec un `id` connu garde cet identifiant ;
  - une option soumise **sans** `id` est une option ajoutée : elle reçoit `o<n>`, `n` valant un de
    plus que le plus grand numéro que le champ a connu — le plus grand suffixe `o<n>` de la déclaration,
    du brouillon courant et de la soumission, et le dernier numéro que le brouillon courant retient pour
    ce champ (`derniersNumeros`, 0 s'il manque) ;
  - le nouveau contenu retient, pour chaque champ à choix, ce plus grand numéro, attributions nouvelles
    comprises : un numéro attribué ne revient **jamais**, même après le retrait de son option par une
    correction précédente (ADR-0018, « jamais réattribuée dans un champ ») ;
  - le dernier numéro retenu ne vient **jamais** de la soumission : seul le brouillon courant le porte ;
  - un `id` que ni la déclaration ni le brouillon courant ne connaissent pour ce champ, ou un `id` répété
    dans la soumission, rend `forme-invalide`.
- Bornes en **constantes nommées exportées**, à côté de `PRIX_CENTIMES_MAX` (ticket 01) :
  `OPTIONS_PAR_CHAMP_MAX = 30`, `LIBELLE_OPTION_LONGUEUR_MAX = 80` — l'îlot du ticket 07 les importera.

**Hors périmètre :** l'enregistrement en base et la route (ticket 05) ; le rapprochement d'un brouillon
avec une déclaration qui a changé, pour l'affichage (ticket 06) ; les messages en français (ticket 07).

## Critères
- [x] En `core/`, les saisies de prix « 12 », « 12,5 », « 12,50 », « 12.50 », « 0 » et « 99999,99 » valent respectivement 12 €, 12,50 €, 12,50 €, 12,50 €, 0 € et 99 999,99 €   (SC-03a)
- [x] En `core/`, une option d'un champ avec prix soumise avec, tour à tour, un prix vide, « -1 », « 12,505 », « douze » et « 100000 » fait refuser chaque soumission sur le prix de cette option, sans aucun nouveau contenu de brouillon   (SC-03b)
- [x] En `core/`, un champ à choix soumis sans aucune option fait refuser la soumission sur ce champ, qui doit garder au moins une option, sans aucun nouveau contenu de brouillon   (SC-03c)
- [x] En `core/`, un champ à choix soumis avec 30 options valides est accepté ; soumis avec 31, la soumission est refusée sur ce champ   (SC-03d)
- [x] En `core/`, une option soumise avec un libellé fait seulement d'espaces, un libellé de 81 caractères, un libellé portant un saut de ligne, ou un libellé identique à la casse près à celui d'une autre option du même champ fait refuser la soumission sur le libellé de cette option ; un libellé de 80 caractères est accepté   (SC-03e)
- [x] En `core/`, une soumission qui porte un prix sur une option d'un champ déclaré sans prix, ou qui omet le prix d'une option d'un champ déclaré avec prix, est refusée sur cette option, sans aucun nouveau contenu de brouillon   (SC-03f)
- [x] En `core/`, une soumission qui porte un champ que la déclaration ne porte pas, des options pour un champ sans option, ou qui omet un champ à choix déclaré est refusée, sans aucun nouveau contenu de brouillon   (SC-03g)
- [x] En `core/`, quand trois corrections d'un même champ s'enchaînent, chacune appliquée au brouillon rendu par la précédente — la première ajoute une option, la deuxième la retire, la troisième ajoute une autre option —, la dernière option ajoutée reçoit un identifiant distinct de celui de l'option retirée comme de ceux des options présentes   (SC-03h)
