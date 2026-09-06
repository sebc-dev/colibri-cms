## Purpose

Permettre à l'éditrice de retrouver ses pages, d'y ouvrir chaque emplacement posé par l'intégrateur et
d'en corriger le contenu vers le brouillon de la page — sans jamais pouvoir toucher à la structure de la
page ni au site public — dans le cadre de navigation de l'administration. Couvre FR-015→026, sous FR-117.

## ADDED Requirements

### Requirement: Cadre de navigation de l'administration

L'administration SHALL présenter une barre latérale portant le menu des rubriques (« Mes pages », Médias,
Réglages, Formulaires, Demandes), « Mes pages » étant l'unique rubrique active et servie ; les autres
situent la navigation sans mener à aucun écran. La barre DOIT pouvoir se replier en un rail d'icônes et se
redéployer, l'état replié/déployé étant une préférence retenue sur l'appareil sans effet serveur. Aucun
terme de développeur ne DOIT paraître, et le menu n'offre aucun geste de structure (FR-024/025, FR-117).

#### Scenario: La barre latérale porte les cinq rubriques
- **WHEN** l'`Écran : Cadre de l'administration` est affiché
- **THEN** la barre latérale montre les cinq rubriques, « Mes pages » marquée active

#### Scenario: Replier la barre en un rail d'icônes
- **WHEN** l'éditrice actionne le bouton de repli
- **THEN** la barre se réduit à un rail d'icônes seules, la rubrique active y reste marquée, et la zone de contenu s'élargit d'autant

#### Scenario: Redéployer la barre
- **WHEN** l'éditrice redéploie la barre repliée
- **THEN** les libellés reparaissent à côté des icônes

#### Scenario: L'état replié/déployé est retenu sur l'appareil
- **WHEN** l'écran est rechargé après un choix de repli ou de déploiement
- **THEN** le dernier état choisi est conservé, sans requête serveur pour le porter

#### Scenario: Aucune autre rubrique n'est servie et aucun geste de structure n'est offert
- **WHEN** l'éditrice parcourt le menu du cadre
- **THEN** aucune rubrique autre que « Mes pages » ne mène à un écran servi, et le menu n'offre aucun geste d'ajout, de retrait, de déplacement ni de renommage de rubrique ou de page

#### Scenario: Aucun terme de développeur dans le cadre
- **WHEN** l'éditrice lit le menu et les libellés du cadre
- **THEN** aucun terme de développeur n'y paraît (FR-117)

#### Scenario: Le cadre est servi sous CSP stricte
- **WHEN** le cadre est servi
- **THEN** il l'est sous les en-têtes réels (CSP stricte de l'administration, ADR-0004 + ADR-0008 ; tolérance des attributs `style="…"`, ADR-0010), sans script en ligne ni directive `client:*` (ADR-0006)

### Requirement: Liste des pages

La rubrique « Mes pages » SHALL afficher toutes les pages déclarées par l'intégrateur dans l'ordre posé,
une ligne par page, en lisant la déclaration sans jamais l'écrire. Une instance sans page déclarée DOIT
montrer un message d'état vide sans offrir aucun geste de création (FR-024). La liste ne DOIT offrir aucun
geste d'ajout, de retrait, de déplacement ni de renommage de page (FR-024/025), ni aucun terme de
développeur (FR-117).

#### Scenario: Afficher les pages déclarées dans l'ordre posé
- **WHEN** l'`Écran : Liste des pages` est affiché pour une instance porteuse de pages déclarées
- **THEN** les pages paraissent dans l'ordre posé, une ligne par page

#### Scenario: État vide sans geste de création
- **WHEN** aucune page n'est déclarée pour l'instance
- **THEN** l'écran affiche le message d'état vide et n'offre aucun geste de création de page

#### Scenario: La liste est servie dans le cadre de l'administration
- **WHEN** l'`Écran : Liste des pages` est servi
- **THEN** il l'est dans l'`Écran : Cadre de l'administration` (barre latérale et menu présents, « Mes pages » marquée active et menant à cet écran)

#### Scenario: Aucun geste de structure sur la liste
- **WHEN** l'éditrice parcourt la liste des pages
- **THEN** aucun geste d'ajout, de retrait, de déplacement ni de renommage de page n'est offert (FR-024/025)

#### Scenario: Aucun terme de développeur dans la liste
- **WHEN** l'éditrice lit la liste et le message d'état vide
- **THEN** aucun terme de développeur n'y paraît

### Requirement: Éditeur d'une page et ses emplacements

Ouvrir une page depuis la liste SHALL présenter ses emplacements dans l'ordre posé par l'intégrateur,
chacun avec le moyen d'édition de sa nature (texte riche, lien de vidéo, bouton d'action) et son contenu
courant, avec un fil de retour vers « Mes pages ». L'éditeur ne DOIT offrir aucun geste d'ajout, de
retrait, de déplacement ni de renommage d'un emplacement (FR-024/025), ni aucun terme de développeur
(FR-117).

#### Scenario: Ouvrir une page depuis la liste
- **WHEN** l'éditrice clique une page de l'`Écran : Liste des pages`
- **THEN** son `Écran : Éditeur de page` s'ouvre

#### Scenario: Les emplacements paraissent dans l'ordre posé, par nature
- **WHEN** l'éditeur d'une page est affiché
- **THEN** les emplacements paraissent dans l'ordre posé, chacun avec le moyen d'édition de sa nature (texte riche, lien de vidéo, bouton d'action)

#### Scenario: Chaque emplacement montre son contenu courant
- **WHEN** l'éditeur d'une page est affiché
- **THEN** chaque emplacement présente le contenu courant de la page

#### Scenario: Le fil de retour ramène à la liste
- **WHEN** l'éditrice actionne le fil de retour
- **THEN** l'`Écran : Liste des pages` est de nouveau affiché

#### Scenario: Aucun geste de structure dans l'éditeur
- **WHEN** l'éditrice parcourt l'éditeur d'une page
- **THEN** aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement, et rien ne l'offre à l'écran (FR-024/025)

#### Scenario: Aucun terme de développeur dans l'éditeur
- **WHEN** l'éditrice lit l'éditeur d'une page
- **THEN** aucun terme de développeur n'y paraît

### Requirement: Application d'une correction au brouillon

Le noyau `core/` SHALL appliquer une correction à un brouillon de page sans jamais toucher l'état publié,
dériver l'état « porte un brouillon » (vrai dès qu'une correction existe, faux sinon), et refuser toute
correction qui viserait la structure (ajouter, retirer, déplacer ou renommer un emplacement, ou viser un
emplacement non déclaré) au titre de FR-024/025. Le brouillon DOIT être porté par une table D1 créée par
une migration versionnée, liant le brouillon à l'emplacement par son identité stable. La destination
d'un bouton d'action ne DOIT admettre que les schémas d'URL `https`, `mailto`, `tel` et les chemins
relatifs ; tout autre schéma est refusé en `core/` et au champ, sans rien enregistrer. Une écriture forgée
depuis une autre origine ne DOIT pas aboutir : la session `SameSite=Strict` posée par 001 n'est pas
attachée à une requête cross-site (ADR-0011), et aucun jeton anti-forgerie dédié n'est introduit.

#### Scenario: Appliquer une correction produit le brouillon corrigé
- **WHEN** en `core/`, une correction de bouton (libellé, destination) est appliquée à un brouillon
- **THEN** le brouillon corrigé est produit, sans toucher l'état publié

#### Scenario: Dériver l'état « porte un brouillon »
- **WHEN** en `core/`, on dérive l'état d'une page
- **THEN** « porte un brouillon » est vrai dès qu'une correction existe, faux sinon

#### Scenario: Refuser une correction de structure
- **WHEN** en `core/`, une correction viserait la structure (ajouter, retirer, déplacer ou renommer un emplacement, ou viser un emplacement non déclaré)
- **THEN** elle est refusée (FR-024/025)

#### Scenario: Table D1 des brouillons versionnée
- **WHEN** la table D1 des brouillons est mise en place
- **THEN** elle est créée par une migration versionnée (`wrangler d1 migrations`) et lie le brouillon à l'emplacement déclaré par son identité stable

#### Scenario: Une correction persistée laisse l'état publié intact
- **WHEN** par la couture HTTP contre la vraie base locale, une correction de bouton est enregistrée
- **THEN** le brouillon est persisté et l'état publié reste intact

#### Scenario: La page bascule à « brouillon » sans quitter l'écran
- **WHEN** une correction est enregistrée
- **THEN** la page bascule à « brouillon » dans l'`Écran : Liste des pages` (pastille présente) et l'`Écran : Éditeur de page` (pastille au fil de retour), sans quitter l'écran

#### Scenario: Une écriture forgée cross-site n'aboutit pas
- **WHEN** une écriture est forgée depuis une autre origine
- **THEN** elle n'aboutit pas, la session `SameSite=Strict` n'étant pas attachée à une requête cross-site (ADR-0011), et aucun jeton dédié n'est introduit

#### Scenario: Une destination de bouton hors liste blanche est refusée
- **WHEN** en `core/`, une correction de bouton vise une destination dont le schéma n'est ni `https`, ni `mailto`, ni `tel`, ni un chemin relatif
- **THEN** elle est refusée, aucun brouillon n'est écrit, et le champ le dit sans terme de développeur (FR-117)

### Requirement: Réglage d'un emplacement de lien de vidéo

Le réglage d'un emplacement de lien de vidéo SHALL accepter un lien externe reconnu et l'enregistrer au
brouillon, et refuser un lien non reconnu au niveau du champ en disant ce qui est attendu, sans rien
enregistrer. La reconnaissance DOIT être une logique pure de `core/`. Aucun terme de développeur ne DOIT
paraître dans le champ ni le message d'erreur (FR-117, FR-022).

#### Scenario: Reconnaissance d'un lien de vidéo en `core/`
- **WHEN** en `core/`, un lien de vidéo externe est évalué
- **THEN** un lien reconnu est accepté et un lien non reconnu est rejeté

#### Scenario: Coller un lien reconnu persiste le brouillon
- **WHEN** par la couture HTTP, un lien reconnu est collé et enregistré
- **THEN** le brouillon est persisté, la page bascule à « brouillon », et l'état publié reste intact

#### Scenario: Coller un lien non reconnu n'écrit rien
- **WHEN** par la couture HTTP, un lien non reconnu est soumis
- **THEN** aucun brouillon n'est écrit et l'état de la page ne bascule pas

#### Scenario: Un lien non reconnu est refusé au champ
- **WHEN** à l'`Écran : Éditeur de page`, un lien non reconnu est saisi
- **THEN** il est refusé au niveau du champ (`États : erreur`) en disant ce qui est attendu

#### Scenario: Aucun terme de développeur dans le champ de lien de vidéo
- **WHEN** l'éditrice lit le champ et son message d'erreur
- **THEN** aucun terme de développeur n'y paraît

### Requirement: Correction d'un emplacement de texte riche

La correction d'un emplacement de texte riche SHALL permettre à l'éditrice de poser gras, italique, lien,
liste et titre sans jamais écrire de balise, et sérialiser le contenu en Markdown restreint vers le
brouillon. Seules les marques dont l'aller-retour est testé DOIVENT survivre ; une marque hors liste est
écartée. Seuls les schémas d'URL `https`, `mailto`, `tel` et les chemins relatifs DOIVENT être admis dans
un lien ; tout autre schéma est rejeté. Aucun terme de développeur ne DOIT paraître dans l'éditeur ni sa
barre de mise en forme (FR-117, FR-018).

#### Scenario: Aller-retour d'une marque retenue
- **WHEN** en `core/`, une marque retenue (gras, italique, lien, liste, titre) est sérialisée puis relue
- **THEN** la marque est préservée

#### Scenario: Une marque hors liste est écartée
- **WHEN** en `core/`, une marque hors de la liste retenue est sérialisée
- **THEN** elle est écartée

#### Scenario: Un schéma d'URL non autorisé est rejeté
- **WHEN** en `core/`, un lien vise un schéma d'URL hors `https`, `mailto`, `tel` ou chemin relatif
- **THEN** il est rejeté

#### Scenario: La barre de mise en forme pose les marques sans balise
- **WHEN** à l'`Écran : Éditeur de page`, l'éditrice actionne la barre de mise en forme
- **THEN** gras, italique, lien, liste et titre se posent sans qu'elle écrive de balise

#### Scenario: Enregistrer une correction de texte riche persiste le Markdown restreint
- **WHEN** par la couture HTTP, une correction de texte riche est enregistrée
- **THEN** le brouillon est persisté en Markdown restreint, la page bascule à « brouillon », et l'état publié reste intact

#### Scenario: Aucun terme de développeur dans l'éditeur de texte riche
- **WHEN** l'éditrice lit l'éditeur de texte riche et sa barre de mise en forme
- **THEN** aucun terme de développeur n'y paraît
