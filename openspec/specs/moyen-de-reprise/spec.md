# Moyen de reprise — Spécification

## Purpose

Le moyen de reprise ouvre l'administration le jour où l'adresse autorisée ne répond plus : un code de
secours remis sur papier, présenté sans qu'aucun message ne parte, à usage unique et renouvelé à chaque
emploi, que l'éditrice peut remplacer depuis une session ouverte (FR-009 à FR-012, SC-020).

## Requirements

### Requirement: L'ouverture de session par le code de secours, sans message

Un code de secours en place, présenté depuis l'écran de saisie du code de secours, SHALL ouvrir une
session d'administration, sans qu'aucun message ne soit envoyé à quelque adresse que ce soit (FR-010).
Il ouvre depuis n'importe quel appareil : aucune liaison à l'appareil ne s'applique. La session ouverte
est en tout point une session ordinaire : même cookie verrouillé et opaque, mêmes échéances de sept et
trente jours. L'écran de connexion mène à l'écran de saisie du code de secours par un lien, sans terme
de développeur.

#### Scenario: Le code de secours ouvre une session sans message
- **WHEN** l'éditrice présente le code de secours en place sur l'écran de saisie du code de secours
- **THEN** une session s'ouvre
- **AND** aucun message n'est envoyé

#### Scenario: Le code de secours ouvre depuis un appareil quelconque
- **WHEN** le code de secours est présenté depuis un appareil qui n'a jamais demandé de code de connexion ni ouvert de session
- **THEN** une session s'ouvre

#### Scenario: Le code de secours ouvre quand l'envoi des messages est impossible
- **WHEN** plus aucun message ne peut partir vers l'adresse autorisée, et que l'éditrice présente le code de secours en place
- **THEN** une session s'ouvre

#### Scenario: La saisie du code de secours est normalisée
- **WHEN** le code de secours est saisi en minuscules, avec des espaces ou des tirets, ou avec un O, un I, un L ou un U à la place de 0, 1, 1 ou V
- **THEN** il est reconnu comme le code en place

#### Scenario: La session ouverte par le code de secours est une session ordinaire
- **WHEN** une session s'ouvre par le code de secours
- **THEN** son cookie porte le préfixe `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict` et `Path=/`, et rien de la session ne s'y lit
- **AND** elle se ferme après sept jours sans usage, et après trente jours quoi qu'il arrive

#### Scenario: L'écran de connexion mène au code de secours
- **WHEN** l'écran de connexion est rendu
- **THEN** il porte un lien vers l'écran de saisie du code de secours
- **AND** aucun terme de développeur ne paraît sur l'un ni l'autre écran

### Requirement: Le code de secours ne sert qu'une fois et se renouvelle à l'emploi

Un code de secours qui vient d'ouvrir une session SHALL cesser aussitôt d'ouvrir. Dans le même geste,
toute autre session ouverte est fermée, un nouveau code de secours est mis en place, et il est affiché
**une seule fois**, sur l'écran qui répond à la présentation, avant que l'éditrice ne poursuive vers
l'accueil. La réponse qui l'affiche n'est conservée par aucun intermédiaire, et le code n'apparaît
jamais dans une adresse de page. Deux présentations simultanées du même code n'ouvrent qu'une session.

#### Scenario: Un code de secours servi n'ouvre plus
- **WHEN** un code de secours a ouvert une session, puis est présenté une seconde fois
- **THEN** aucune session ne s'ouvre

#### Scenario: Un nouveau code s'affiche une fois à l'emploi
- **WHEN** une session vient de s'ouvrir par le code de secours
- **THEN** l'écran affiche un nouveau code de secours et invite à le recopier ou à l'imprimer
- **AND** il offre de poursuivre vers l'accueil, qui mène à « Mes pages »

#### Scenario: Le nouveau code ouvre une session ultérieure
- **WHEN** le nouveau code affiché à l'emploi est présenté plus tard
- **THEN** une session s'ouvre

#### Scenario: Le nouveau code ne se revoit pas
- **WHEN** l'éditrice quitte l'écran qui affiche le nouveau code, puis revient à l'écran « Code de secours »
- **THEN** le nouveau code n'y paraît pas

#### Scenario: L'emploi du code ferme les autres sessions
- **WHEN** une session est ouverte sur un premier appareil, puis que le code de secours ouvre une session sur un second
- **THEN** la session du premier appareil ne donne plus accès
- **AND** la session du second appareil reste ouverte

#### Scenario: L'affichage du nouveau code n'est pas conservé
- **WHEN** l'écran affiche le nouveau code à l'emploi
- **THEN** la réponse interdit à tout intermédiaire de la conserver
- **AND** l'adresse de la page ne porte pas le code

#### Scenario: Deux présentations simultanées n'ouvrent qu'une session
- **WHEN** le même code de secours est présenté deux fois en même temps
- **THEN** une seule session s'ouvre
- **AND** un seul nouveau code est mis en place

### Requirement: Le refus du code de secours ne dit rien de la cause

Un code de secours refusé SHALL ne pas ouvrir de session, et rendre le même écran — même texte, mêmes
champs d'en-tête — qu'il soit faux, déjà servi, remplacé, ou présenté sur une instance où aucun code
n'est en place. Le texte invite à vérifier la recopie, sans terme de développeur. Aucun compte de
saisies fautives ne rend le code de secours inutilisable.

#### Scenario: Un code faux est refusé
- **WHEN** un code qui n'est pas le code en place est présenté
- **THEN** aucune session ne s'ouvre
- **AND** l'écran invite à vérifier la recopie

#### Scenario: Le refus est le même quelle qu'en soit la cause
- **WHEN** sont présentés tour à tour un code faux, un code déjà servi, un code remplacé, et un code quelconque sur une instance sans code en place
- **THEN** les quatre réponses portent le même texte et les mêmes champs d'en-tête

#### Scenario: Les saisies fautives ne brûlent pas le code
- **WHEN** dix codes faux sont présentés, sous le seuil de l'origine, puis le code en place
- **THEN** le code en place ouvre une session

#### Scenario: Aucun terme de développeur dans le refus
- **WHEN** l'écran annonce un code de secours refusé
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: La présentation d'un code de secours compte dans le seuil de connexion

Chaque présentation d'un code de secours SHALL compter comme une tentative de connexion de son origine,
dans le même compte que les soumissions de l'écran de connexion — vingt par heure (FR-007, capacité
`seuil-par-origine`). Au-delà, ou quand la base ne permet pas de compter, la présentation est refusée
avant toute vérification : aucun code n'est vérifié ni servi, aucune session ne s'ouvre, aucun nouveau
code n'est mis en place. Ces refus s'annoncent par les mêmes textes que ceux de l'écran de connexion,
identiquement quel que soit le code présenté, au terme du même délai plancher.

#### Scenario: La vingt-et-unième tentative est refusée, codes de secours compris
- **WHEN** une même origine fait, dans la même heure, vingt soumissions mêlées de l'écran de connexion et de l'écran du code de secours, puis présente un code de secours
- **THEN** la vingt-et-unième tentative est refusée et l'écran annonce le seuil

#### Scenario: Au-delà du seuil, le code en place n'est ni servi ni accepté
- **WHEN** au-delà du seuil de son origine, le code de secours en place est présenté
- **THEN** aucune session ne s'ouvre
- **AND** le code en place ouvre encore une session une fois l'origine revenue sous le seuil

#### Scenario: Le refus au seuil ne dépend pas du code présenté
- **WHEN** au-delà du seuil de son origine, sont présentés le code en place puis un code faux
- **THEN** les deux réponses portent le même texte et les mêmes champs d'en-tête, et toutes deux attendent le délai plancher

#### Scenario: Une panne du comptage refuse sans servir le code
- **WHEN** la base refuse de compter la présentation du code de secours en place
- **THEN** aucune session ne s'ouvre, le code en place reste valable, et l'écran dit que la connexion n'a pas pu se faire, sans annoncer le seuil

### Requirement: Le code de secours n'est conservé qu'en empreinte

Le code de secours SHALL compter vingt-six signes, tirés chacun indépendamment et uniformément d'un
alphabet de trente-deux signes sans confusables, soit au moins 128 bits. Il est affiché groupé pour la
recopie. La base n'en garde qu'une empreinte, qui ne permet pas d'en retrouver la valeur, et au plus un
code est en place à la fois. Ni la configuration du déploiement, ni aucun secret de la plateforme, ni
aucun fichier du dépôt ne porte de donnée qui permette de le reconstituer (FR-011).

#### Scenario: Le code a la forme attendue
- **WHEN** un code de secours est engendré
- **THEN** il compte vingt-six signes de l'alphabet sans confusables
- **AND** il est affiché en groupes séparés

#### Scenario: Les codes engendrés sont uniformes
- **WHEN** un grand nombre de codes de secours sont engendrés
- **THEN** chaque signe de l'alphabet paraît à chaque position avec la même fréquence attendue

#### Scenario: La base ne garde pas la valeur du code
- **WHEN** un code de secours vient d'être mis en place
- **THEN** sa valeur, sous sa forme affichée comme sous sa forme normalisée, ne se trouve dans aucune ligne d'aucune table de la base

#### Scenario: Un seul code est en place
- **WHEN** un code de secours est mis en place alors qu'un autre l'était
- **THEN** seul le dernier ouvre une session

#### Scenario: La configuration ne porte rien du code
- **WHEN** un code de secours est mis en place
- **THEN** ni la configuration du déploiement, ni le fichier d'instance, ni aucune liaison ou secret de la plateforme n'a changé

### Requirement: L'écran « Code de secours » crée et remplace le code

L'administration SHALL offrir un écran « Code de secours », atteignable depuis l'écran Réglages et
seulement avec une session ouverte. Il dit si un code est en place et depuis quelle date, sans jamais en
montrer la valeur. Il permet d'en créer un quand aucun n'est en place — le geste de la livraison
(FR-009) —, et de le remplacer quand un l'est (FR-012), après une confirmation qui dit que l'ancien
cessera d'ouvrir et que les autres appareils seront déconnectés. Créer ou remplacer met en place un
nouveau code, l'affiche une seule fois sur la réponse, fait cesser l'ancien et ferme toute autre session
ouverte ; la session de l'éditrice reste ouverte. Le geste ne relève pas de la publication : il prend
effet aussitôt, sans brouillon.

#### Scenario: Sans session, l'écran n'est pas atteignable
- **WHEN** l'écran « Code de secours » ou son geste de création est demandé sans session ouverte
- **THEN** la demande est renvoyée vers l'écran de connexion
- **AND** aucun code n'est mis en place

#### Scenario: L'écran Réglages mène au code de secours
- **WHEN** l'écran Réglages est rendu
- **THEN** il porte un lien vers l'écran « Code de secours »

#### Scenario: Sans code en place, l'écran le dit et offre de le créer
- **WHEN** l'écran est rendu sur une instance où aucun code de secours n'est en place
- **THEN** il dit qu'aucun code de secours n'est en place
- **AND** il offre de le créer

#### Scenario: Avec un code en place, l'écran dit depuis quand sans le montrer
- **WHEN** l'écran est rendu alors qu'un code de secours est en place
- **THEN** il dit la date à laquelle le code a été mis en place
- **AND** la valeur du code n'y paraît pas

#### Scenario: La création affiche le code une fois
- **WHEN** l'éditrice crée le code de secours
- **THEN** la réponse affiche le nouveau code et invite à le recopier ou à l'imprimer
- **AND** la réponse interdit à tout intermédiaire de la conserver
- **AND** revenir ensuite à l'écran ne le montre plus

#### Scenario: Le remplacement demande une confirmation
- **WHEN** l'éditrice demande à remplacer le code en place
- **THEN** une confirmation dit que l'ancien code cessera d'ouvrir et que les autres appareils seront déconnectés
- **AND** rien ne change tant qu'elle n'a pas confirmé

#### Scenario: Le remplacement fait cesser l'ancien code
- **WHEN** l'éditrice confirme le remplacement, puis que l'ancien code est présenté
- **THEN** l'ancien code n'ouvre pas de session
- **AND** le nouveau en ouvre une

#### Scenario: Le remplacement ferme les autres sessions
- **WHEN** une session est ouverte sur un autre appareil, et que l'éditrice remplace le code
- **THEN** la session de l'autre appareil ne donne plus accès
- **AND** la session de l'éditrice reste ouverte

#### Scenario: Aucun terme de développeur sur l'écran
- **WHEN** l'écran « Code de secours », sa confirmation ou l'affichage d'un nouveau code est rendu
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: L'éditrice reprend seule son administration, boîte coupée

Quand l'adresse autorisée ne reçoit plus rien, l'éditrice SHALL pouvoir, avec son seul code de secours
et sans aucune aide, ouvrir son administration depuis un appareil neuf et consulter la liste des
demandes (SC-020).

#### Scenario: Boîte inaccessible, l'éditrice consulte ses demandes
- **WHEN** l'adresse autorisée ne reçoit plus aucun message, et que l'éditrice présente son code de secours depuis un appareil neuf
- **THEN** une session s'ouvre, un nouveau code s'affiche une fois
- **AND** elle atteint la liste des demandes depuis l'administration
