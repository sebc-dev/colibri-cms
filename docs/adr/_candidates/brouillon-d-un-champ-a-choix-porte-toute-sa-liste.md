# Candidat ADR : Le brouillon d'un champ à choix porte toute sa liste d'options, et la publication la dépose telle quelle
Statut : Candidat — à trancher par la story « Aperçu et publication » | Date : 2026-10-10 | Provenance : change `010-reglage-des-formulaires`, review du ticket 06 (finding `change-F-2`, PR #198)

> Candidat né sous le cycle 2.x, sans antécédent 1.x. Il prolonge [ADR-0018](../0018-declaration-des-formulaires-de-devis.md)
> sur un cas que celui-ci ne règle pas. La promotion — ou le choix d'une alternative — revient à la
> story « Aperçu et publication » (FR-080→091), qui est la première à déposer un formulaire.

## Contexte

Le change `010` a livré la correction des options d'un formulaire. Son état, au moment où ce
candidat est déposé :

- **L'éditrice possède la liste des options d'un champ à choix** (FR-046→049) ; l'intégrateur possède
  les champs eux-mêmes — leur existence, leur ordre, leur nature, leur marque avec ou sans prix
  (FR-050, ADR-0018). La déclaration (`content/formulaires/<id>/formulaire.json`) ne donne que les
  **options de départ**.
- **Un enregistrement remplace la liste entière.** `appliquerOptions`
  (`src/core/formulaires/options.ts`) exige tous les champs à choix déclarés et toutes leurs options ;
  le magasin (`src/platform/formulaires/magasin.ts`) écrit la ligne entière. Le brouillon vaut
  `{ champs: { <idChamp>: [{ id, libelle, prix? }] }, derniersNumeros: { <idChamp>: n } }`.
- **L'affichage reprend la liste du brouillon champ par champ.** `optionsCourantes`
  (`src/core/formulaires/brouillon.ts`, ticket 06) rend, pour chaque champ à choix déclaré, la liste
  du brouillon **telle quelle** si toutes ses options sont lisibles et s'accordent à la marque
  `avecPrix` déclarée, sinon les options de la déclaration.

ADR-0018 règle quatre changements de la déclaration sous un brouillon : formulaire ou champ retiré
(brouillon ignoré), champ dont la nature ou la marque `avecPrix` ne s'accorde plus (options de départ),
champ à choix nouveau (options de départ). Il ne dit rien des **options de départ elles-mêmes**
qui changent sous un champ déjà enregistré. Aujourd'hui, à l'écran :

| L'intégrateur, après l'enregistrement… | L'écran montre |
|---|---|
| ajoute une option de départ (`pistache`) | la liste du brouillon, **sans** `pistache` |
| retire une option de départ (`fraise`) que le brouillon garde | la liste du brouillon, **avec** `fraise` |
| renomme ou change le prix d'une option de départ que le brouillon garde | le libellé et le prix **du brouillon** |
| passe un champ de choix unique à choix multiple, ou l'inverse | la liste du brouillon (le brouillon ne retient pas la nature) |
| fait d'un champ à choix un champ sans option (texte, e-mail…) | rien pour ce champ : il n'est plus à choix |

L'écran n'est qu'un aperçu de travail. **La question se pose vraiment à la publication**
(FR-086, FR-087) : elle dépose `formulaire.json` dans l'espace du client, et le site public le lit
(FR-089). Ce qu'elle dépose pour un champ dont les options de départ ont changé détermine ce que le
visiteur choisit et ce qu'une demande porte (FR-068).

## Décision (proposée)

**Le brouillon d'un champ à choix porte toute la liste de ses options : c'est la liste de
l'éditrice, et la publication la dépose telle quelle.**

- Pour un champ à choix qui a un brouillon lisible et accordé, l'aperçu (FR-081) et la publication
  (FR-086, FR-087) reprennent la liste du brouillon, dans son ordre et avec ses identifiants, comme le
  fait l'écran. Les options de départ changées depuis ne s'y mêlent pas.
- Tout le reste vient **toujours** de la déclaration : l'existence, l'ordre, le libellé, la nature, le
  caractère obligatoire et la marque avec ou sans prix des champs (ADR-0018).
- « La nature ne s'accorde plus » (ADR-0018) se lit **« le champ n'est plus à choix »**. Passer de
  choix unique à choix multiple, ou l'inverse, ne touche pas la liste des options : le brouillon ne
  retient pas la nature, et l'éditrice garde son travail. Ce point-là n'attend pas la story : la spec
  du change `010` (Requirement « Brouillon propre à chaque formulaire ») le fixe dès maintenant, et un
  test le tient.
- **Une seule règle de rattachement** : l'aperçu et la publication appellent `optionsCourantes`, sans
  la réécrire.

## Ce que la story « Aperçu et publication » devra trancher ou faire

1. **Confirmer cette décision ou retenir une alternative** (ci-dessous), puis promouvoir le candidat
   dans `docs/adr/` sous le prochain numéro libre (`ls docs/adr/`).
2. **Le récapitulatif avant publication** (FR-083) : dire ou non à l'éditrice qu'un formulaire publié
   garde une liste dont les options de départ ont changé depuis son enregistrement.
3. **`derniersNumeros` au moment où la publication vide le brouillon** : le reporter dans l'état
   publié, ou le recalculer depuis lui. Sans cela, un numéro `o<n>` déjà publié pourrait revenir,
   contre ADR-0018 (déjà relevé dans `openspec/changes/010-reglage-des-formulaires/design.md`,
   § Risks).
4. **Le format déposé** : la liste du brouillon remplace `options` du champ dans le `formulaire.json`
   déposé ; `id`, `libelle` et `prix` en centimes, sans conversion (ADR-0018, « au format déposé »).
5. **Les cas à poser en scénarios** (chacun avec un formulaire de la démonstration) :
   - une option de départ ajoutée après l'enregistrement n'est pas publiée pour ce champ ;
   - une option de départ retirée, gardée au brouillon, est publiée ;
   - un champ passé de choix unique à choix multiple publie la liste du brouillon ;
   - un champ devenu sans option ne publie aucune option, et son brouillon n'empêche pas la
     publication ;
   - un champ à choix sans brouillon publie ses options de départ.

**Points d'appui dans le code, à réutiliser :**

| Où | Quoi |
|---|---|
| `src/core/formulaires/brouillon.ts` | `optionsCourantes(formulaireDeclare, brouillon)` : la règle de rattachement, seule |
| `src/platform/formulaires/magasin.ts` | `obtenirBrouillonsFormulaires`, `obtenirBrouillonFormulaire` : la lecture des brouillons |
| `src/platform/contenu/formulaires.ts` | `lireFormulairesDeLaDeclaration`, `lireFormulaireDeLaDeclaration` : la déclaration chargée |
| `tests/unit/formulaires/brouillon.test.ts` | les cas « SC-06d » qui figent le comportement du tableau ci-dessus : les changer, c'est changer de décision |

## Conséquences

**Positives.**
- **Le travail de l'éditrice n'est jamais modifié en silence.** Ce qu'elle a vu à l'écran est ce qui
  part en ligne.
- **L'écran, l'aperçu et la publication disent la même chose**, par une seule fonction pure de
  `core/`.
- **Aucune fusion à inventer** : pas de règle sur l'ordre d'une option de départ ajoutée parmi celles
  de l'éditrice, ni sur un conflit de libellé entre les deux.

**Négatives — ce à quoi le produit s'engage.**
- **Une option de départ que l'intégrateur ajoute n'atteint pas un champ déjà enregistré.** Il doit
  demander à l'éditrice de l'ajouter, ou attendre qu'elle abandonne son brouillon (FR-092, story
  « Restauration »).
- **Une option de départ que l'intégrateur retire reste proposée au visiteur** si l'éditrice l'a
  gardée, jusqu'à ce qu'elle la retire elle-même.
- **Un renommage ou un changement de prix de départ** ne touche pas un champ enregistré.

## Alternatives considérées

- **Fusion option par option à la publication** : retirer du brouillon les options de départ que la
  déclaration ne porte plus, ajouter en fin de liste celles qu'elle a gagnées. Écartée en proposition :
  l'intégrateur reprendrait la main sur une liste que FR-046→049 donnent à l'éditrice, et la fusion
  demande des règles d'ordre et de conflit de libellé que rien ne fonde encore.
- **Signaler et laisser choisir** : marquer à l'écran le champ dont les options de départ ont changé,
  et proposer à l'éditrice de les reprendre. Possible en complément de la décision proposée, si le
  récapitulatif (point 2) le demande ; elle suppose un état et un geste nouveaux.
- **La déclaration l'emporte dès qu'elle change** : un champ dont les options de départ ont changé
  retombe sur elles, brouillon perdu pour ce champ. Écartée : un changement anodin de l'intégrateur
  effacerait des corrections de l'éditrice sans qu'elle le sache.
