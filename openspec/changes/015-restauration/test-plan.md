## Niveaux

- **Unité** (`tests/unit/formulaires/`) : le calcul du plus grand numéro d'un brouillon de formulaire, et
  `plafondDesNumeros` avec la table `numeros_options` comme source (D3). Fonctions pures de `core/`.
- **Intégration dans workerd** (`tests/integration/`) : le cœur du change. Chaque route est appelée par
  `exports.default.fetch` avec une vraie D1, sur le patron de `outils-publication.ts`
  (`semerSession`, `semerBrouillonEmplacement`, `semerBrouillonReglage`, `semerBrouillonFormulaire`,
  semis direct de `publies_*`). L'oracle est la base (lignes présentes ou absentes) et le HTML de l'écran
  relu après le geste (marque `data-pastille-brouillon`, contenu présenté, présence du geste).
- **Parcours navigateur** (`tests/parcours/`) : un seul parcours, la page « Tarifs » corrigée puis revenue,
  confirmation comprise. Il couvre ce que workerd ne voit pas : l'îlot, le `Dialog`, le rechargement et
  la CSP de l'administration.

## Oracle par exigence

- **Revenir à la version publiée** : après le geste, l'écran rendu par le serveur présente le contenu de
  `publies_*` (ou de la déclaration si rien n'est publié), sans marque ni geste. Le geste absent d'un
  objet sans brouillon se lit dans le HTML.
- **Aucun autre brouillon touché** : comptage des lignes des trois tables avant et après, et contenu
  identique des lignes restantes. Le récapitulatif se relit par l'écran Publier. Le dépôt se vérifie par
  la forge en mémoire (`tests/unit/publication/forge-en-memoire.ts`) : aucun appel pendant le geste, et
  aucun fichier de « Tarifs » dans le dépôt de la publication suivante.
- **Refus pendant une publication** : semer `publication.instantane` non nul (bail courant, puis bail
  dépassé), jouer le geste, constater `409` et la ligne de brouillon intacte. Puis vider l'instantané et
  constater le succès.
- **Sans session, cross-site, objet inconnu** : `401`, `404`, aucune ligne supprimée. Le cross-site se
  joue comme dans les tests existants des réglages : requête sans cookie de session.
- **Identifiant d'option** : ajouter deux options par la route des options, revenir, en ajouter une, et
  comparer les identifiants.
- **Images** : téléverser et poser par les routes existantes, revenir, relire le récapitulatif.

## Cas limites

- Page dont le brouillon porte un emplacement que la déclaration ne porte plus : la ligne part aussi.
- Objet sans brouillon : succès, rien ne change.
- Deux gestes successifs sur le même objet : les deux aboutissent.
- Formulaire jamais publié : retour au contenu de départ, compteur conservé.
- Brouillon de formulaire réécrit entre la lecture et la suppression (D3) : rejouer la route sur une base
  où le brouillon change ; relève le chemin de reprise sans délai artificiel.
- Titre de page avec `<`, `>`, `&`, guillemets : la confirmation l'affiche en texte (parcours, ou rendu
  de l'îlot).

## Doubles

La forge en mémoire existante, seulement pour la publication suivante. Aucun double de D1.

## Zones sans test automatisé

- L'habillage de la confirmation sur téléphone (une colonne, cibles de 44 px) : cas ajoutés au cahier de
  recette, joués par playwright-cli sur le serveur de recette.
- SC-009 de bout en bout sur la recette (page publique identique avant et après) : cahier de recette.
