# 04 — Un formulaire revient à sa version publiée

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `migrations/0015_numeros_options.sql`, `src/pages/admin/formulaires/[id]/revenir.ts`, `src/platform/formulaires/magasin.ts`, `src/core/formulaires/options.ts`, `src/pages/admin/formulaires/[id].astro`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/textes.ts`, `tests/unit/formulaires/numeros-options.test.ts`, `tests/integration/revenir-formulaire.test.ts`, `tests/integration/revenir-garde-fous.test.ts`

## Ce que ça livre

L'écran d'un formulaire qui porte un brouillon offre « Revenir à la version publiée » (FR-092). Après
confirmation, l'écran présente les options publiées de chaque champ à choix, ou les options de départ si
le formulaire n'a jamais été publié, sans marque de brouillon. Aucun autre formulaire ni aucun réglage
n'est touché (FR-093). Ce ticket ferme aussi le geste sur les trois sortes d'objet : il n'est offert
qu'à un objet en brouillon, un objet inconnu est refusé, et aucun texte ne porte de terme de développeur.

**Le geste** réutilise l'îlot `RevenirVersionPubliee.svelte` (ticket 01), monté dans l'en-tête de l'écran
d'un formulaire, à côté de sa marque, révélé par l'événement `brouillon-enregistre`. La confirmation dit :
« Les modifications du formulaire « <nom> » seront perdues. », le nom affiché en texte.

**Un identifiant d'option ne revient jamais** (ADR-0018, ADR-0026 ; design D3). Le compteur
`derniersNumeros` vit dans le brouillon et dans l'état publié ; supprimer le brouillon perdrait les
numéros qu'il était seul à porter. D'où :
- une migration additive `migrations/0015_numeros_options.sql` crée `numeros_options(formulaire, champ,
  dernier, primary key (formulaire, champ))`, recréée aussi paresseusement par le magasin, comme
  `brouillons_formulaires` ;
- une fonction pure de `src/core/formulaires/options.ts` calcule, pour un brouillon, le plus grand numéro
  de chaque champ (son `derniersNumeros` et les suffixes `o<n>` de ses options) ;
- `plafondDesNumeros` prend cette table comme cinquième source, en plus de la déclaration, du brouillon,
  du publié et de la soumission.

**La route.** `POST /admin/formulaires/[id]/revenir`, sans corps :
- `verifierSession`, sinon `401` ; anti-forgerie par `SameSite=Strict` (ADR-0011) ;
- `404` pour un formulaire que la déclaration ne porte pas ;
- lecture du brouillon, puis un seul `db.batch` : un upsert `dernier = max(dernier, excluded.dernier)` par
  champ, puis la suppression du brouillon sous `maj_le = ?` (la valeur lue) et sous la condition atomique
  de refus pendant une publication (ticket 02, `409` `publication-en-cours`) ;
- si la suppression ne touche aucune ligne alors que le brouillon existe encore, la route relit et
  recommence, trois fois au plus, puis répond `409` avec la raison `modifie-pendant-le-retour` ;
- succès si le formulaire ne portait aucun brouillon.

**Les garde-fous communs aux trois routes** (`tests/integration/revenir-garde-fous.test.ts`) : présence
du geste selon le brouillon, objet inconnu refusé sans erreur du serveur, et relecture des textes du
geste et de la confirmation pour les trois natures.

## Critères
- [ ] « Devis gâteau » publié, puis une option retirée du champ « Parfum », le formulaire revenu : l'écran présente les options publiées de « Parfum », option retirée comprise, sans marque de brouillon   (SC-04a)
- [ ] « Accueil » porte un brouillon, « Contact », la carte Réseaux sociaux et « Devis atelier » n'en portent pas : l'éditeur d'« Accueil » offre « Revenir à la version publiée », et ni l'éditeur de « Contact », ni la carte Réseaux sociaux, ni l'écran de « Devis atelier » ne l'offrent   (SC-04b)
- [ ] le geste, la confirmation et chacun de leurs messages, sur une page, un réglage et un formulaire, ne portent aucun terme de développeur (FR-117)   (SC-04c)
- [ ] une publication interrompue avant le dépôt du contenu, plus de 5 minutes passées : le retour d'un formulaire est refusé avec le message de publication en cours, et le brouillon du formulaire est intact   (SC-04d)
- [ ] en session, un geste de retour qui désigne une page, un réglage ou un formulaire que la déclaration ne porte pas est refusé sans erreur du serveur, et aucun brouillon n'est supprimé   (SC-04e)
- [ ] deux options ajoutées au champ « Parfum » de « Devis gâteau » reçoivent deux identifiants ; après le retour du formulaire, une option ajoutée à « Parfum » reçoit un identifiant distinct de ces deux   (SC-04f)
