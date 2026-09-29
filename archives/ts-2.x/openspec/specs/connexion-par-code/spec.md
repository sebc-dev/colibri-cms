# Connexion par code — Spécification

## Purpose

Cette capacité ouvre l'administration à la seule éditrice, sans mot de passe ni compte à créer : elle saisit l'adresse autorisée qu'elle utilise déjà, reçoit un code court dans sa boîte, le recopie sur le même appareil et se retrouve dans son administration — tout en refusant à un inconnu d'apprendre quelle adresse ouvre l'instance ou de noyer cette boîte.

## Requirements

### Requirement: La porte de l'administration

Toute route d'administration demandée sans session valide SHALL être refusée et renvoyée vers l'écran de connexion ; l'écran de connexion, lui, SHALL rester servi avec ou sans session, car il n'est pas une route d'administration (le garde de session est tenu par l'import, ADR-0007). L'accueil, derrière la garde, ne porte aucune fonction.

#### Scenario: L'accueil sans session renvoie vers la connexion
- **WHEN** l'accueil `/admin/` est demandé sans cookie de session valide
- **THEN** la réponse est un renvoi vers l'écran de connexion
- **AND** le contenu de l'accueil n'est jamais rendu

#### Scenario: L'écran de connexion se sert dans les deux cas
- **WHEN** l'écran de connexion est demandé avec ou sans cookie de session
- **THEN** il se rend dans les deux cas
- **AND** il porte son champ d'adresse

#### Scenario: Un chemin inconnu ne laisse rien voir
- **WHEN** un chemin inconnu sous `/admin/` est demandé
- **THEN** la réponse est un refus
- **AND** rien de l'administration n'est laissé voir

#### Scenario: L'accueil est vide de fonction
- **WHEN** l'accueil est rendu derrière la garde
- **THEN** il ne porte aucune fonction — ni lien vers un autre écran, ni action

### Requirement: La politique de sécurité sur toute réponse d'administration

Les trois formes de réponse de l'administration — l'écran servi, le renvoi vers la connexion, le chemin inconnu — SHALL porter la même politique de sécurité stricte, posée par un porteur unique inscrit depuis la configuration Astro (ADR-0008). C'est, avec l'échappement, l'une des deux seules parades au script injecté dans un écran d'administration, et aucune forme de réponse ne peut rester à découvert.

#### Scenario: L'écran servi porte la politique stricte
- **WHEN** l'écran de connexion est servi
- **THEN** la réponse porte la politique de sécurité de contenu, le refus de reniflage de type, une politique de référent et le refus d'être mis en cadre

#### Scenario: Le renvoi porte les mêmes champs
- **WHEN** le garde rend un renvoi vers l'écran de connexion
- **THEN** la réponse porte exactement les mêmes champs d'en-tête, aux mêmes valeurs, que l'écran servi

#### Scenario: Le chemin inconnu porte les mêmes champs
- **WHEN** un chemin inconnu sous `/admin/` est rendu
- **THEN** la réponse porte exactement les mêmes champs d'en-tête, aux mêmes valeurs, que l'écran servi

#### Scenario: La politique ne relâche aucune source
- **WHEN** une réponse d'administration est rendue
- **THEN** sa politique de sécurité de contenu ne porte ni `unsafe-inline`, ni `unsafe-eval`, ni aucune source tierce

### Requirement: L'envoi d'un code à l'adresse autorisée

La soumission de l'adresse autorisée SHALL engendrer un code court, n'en conserver en base qu'une empreinte salée, et demander son expédition à la plateforme ; toute autre adresse soumise n'écrit rien et ne demande rien. Un identifiant d'appareil est posé à l'affichage du formulaire, seulement s'il manque.

#### Scenario: L'adresse autorisée fait écrire un code et demander son expédition
- **WHEN** l'adresse autorisée est soumise
- **THEN** un code est écrit
- **AND** son expédition est demandée à la plateforme

#### Scenario: Toute autre adresse ne fait rien
- **WHEN** une adresse autre que l'adresse autorisée est soumise
- **THEN** aucun code n'est écrit
- **AND** aucune expédition n'est demandée

#### Scenario: Le code respecte sa forme
- **WHEN** un code est engendré
- **THEN** il fait huit signes d'un alphabet de trente-deux caractères sans confusables

#### Scenario: La base ne conserve qu'une empreinte salée
- **WHEN** un code a été écrit
- **THEN** le code tel qu'il a été engendré ne se retrouve pas en base
- **AND** seule une empreinte salée en est conservée

#### Scenario: L'identifiant d'appareil est posé à l'affichage
- **WHEN** l'écran de connexion est affiché
- **THEN** un identifiant d'appareil est posé s'il manque, et celui qui est déjà là reste intact
- **AND** la durée de vie de cet identifiant n'est pas plus courte que celle d'un code

#### Scenario: Le code porte l'identifiant d'appareil de sa demande
- **WHEN** un code est écrit à la suite d'une soumission
- **THEN** il porte l'identifiant d'appareil de la soumission qui l'a demandé

#### Scenario: Le message part en texte seul avec un objet fixe
- **WHEN** un message portant un code part vers l'adresse autorisée
- **THEN** il part en texte seul, sans HTML
- **AND** il porte un objet fixe posé par le produit

### Requirement: L'indiscernabilité des deux branches de soumission

Sur une soumission donnée, l'écran de connexion SHALL rendre la même réponse — même corps, mêmes champs d'en-tête, même moment — que l'adresse soumise soit l'adresse autorisée ou n'importe quelle autre. La réponse n'est rendue qu'au terme d'un délai plancher gelé en source, et l'expédition est remise à la plateforme après que la réponse est partie.

#### Scenario: Le corps de réponse est identique pour les deux branches
- **WHEN** une même soumission est jouée pour l'adresse autorisée puis pour toute autre adresse
- **THEN** le corps de la réponse est identique dans les deux branches

#### Scenario: Les champs d'en-tête sont identiques pour les deux branches
- **WHEN** une même soumission est jouée pour l'adresse autorisée puis pour toute autre adresse
- **THEN** les champs d'en-tête de la réponse sont identiques dans les deux branches

#### Scenario: La réponse attend un délai plancher constant
- **WHEN** une soumission est reçue
- **THEN** la réponse n'est rendue qu'au terme d'un délai plancher
- **AND** ce délai est une constante des sources

#### Scenario: L'expédition est remise après le rendu
- **WHEN** une soumission de l'adresse autorisée est traitée
- **THEN** l'expédition est remise à la plateforme après que la réponse est rendue, jamais avant

#### Scenario: Une expédition qui échoue ne change rien
- **WHEN** l'expédition demandée échoue
- **THEN** ni le corps, ni les champs d'en-tête, ni le moment de la réponse ne changent

#### Scenario: Une instance non semée se comporte de même
- **WHEN** aucune adresse autorisée n'est enregistrée et une adresse est soumise
- **THEN** la réponse reste la même — l'écran ne se comporte pas autrement

#### Scenario: Les temps de réponse ne distinguent pas les branches
- **WHEN** deux cents soumissions sont conduites hors plafond, la fenêtre vidée entre les salves, sur l'adresse autorisée et sur d'autres adresses
- **THEN** les deux branches ne se laissent pas distinguer par leur temps de réponse

### Requirement: Le plafond de cinq messages par heure glissante

Au plus cinq codes SHALL être écrits par heure glissante, afin de protéger d'abord la boîte de la cliente. Le plafond compte les codes écrits, jamais les expéditions abouties, et son épreuve est indivisible de l'écriture du code. Le plafond atteint s'annonce à l'écran, identiquement quelle que soit l'adresse soumise.

#### Scenario: Le sixième code de l'heure n'est pas écrit
- **WHEN** un sixième code est demandé dans une même heure glissante
- **THEN** il n'est pas écrit
- **AND** rien n'est demandé à la plateforme

#### Scenario: Le plafond compte les codes écrits
- **WHEN** le plafond est évalué
- **THEN** il compte les codes écrits dans l'heure, jamais les expéditions abouties

#### Scenario: Une ligne morte reste comptée jusqu'à sortir de l'heure
- **WHEN** un code a été annulé ou brûlé mais n'est pas encore sorti de l'heure
- **THEN** il reste compté par le plafond

#### Scenario: Une ligne sortie de l'heure libère une place
- **WHEN** un code sort de l'heure glissante
- **THEN** il cesse d'être compté
- **AND** une nouvelle soumission redevient possible

#### Scenario: L'épreuve du plafond est indivisible de l'écriture
- **WHEN** deux soumissions concurrentes atteignent le point d'entrée alors que cinq codes sont déjà écrits dans l'heure
- **THEN** elles n'écrivent pas un sixième code

#### Scenario: Le plafond atteint s'annonce identiquement
- **WHEN** le plafond est atteint et une adresse est soumise
- **THEN** l'écran annonce le plafond atteint, identiquement pour l'adresse autorisée et pour toute autre
- **AND** aucun terme de développeur ne paraît dans l'annonce

### Requirement: L'ouverture de session par le code recopié

Un code recopié sur l'appareil qui l'a demandé, une seule fois et dans les quinze minutes, SHALL ouvrir une session opaque en base et renvoyer vers l'accueil. La saisie se normalise, et le cookie ne porte rien qui se lise.

#### Scenario: Le code recopié ouvre la session
- **WHEN** le code est recopié sur l'appareil qui l'a demandé, dans les quinze minutes
- **THEN** une session s'ouvre
- **AND** la réponse renvoie vers l'accueil

#### Scenario: L'accueil s'affiche sans fonction
- **WHEN** la session vient de s'ouvrir et l'accueil est atteint
- **THEN** l'accueil s'affiche
- **AND** il ne porte toujours aucune fonction

#### Scenario: La saisie est normalisée
- **WHEN** le code est saisi avec des majuscules, des séparateurs ou des confusables
- **THEN** la casse est indifférente, les séparateurs sont ignorés et les confusables sont ramenés à leur signe

#### Scenario: Le même code ne s'utilise pas deux fois
- **WHEN** un code déjà utilisé est présenté une seconde fois
- **THEN** il n'ouvre pas de session

#### Scenario: Un code trop vieux n'ouvre pas de session
- **WHEN** un code est présenté au-delà de quinze minutes après sa demande
- **THEN** il n'ouvre pas de session

#### Scenario: Le cookie de session est verrouillé et opaque
- **WHEN** une session s'ouvre
- **THEN** le cookie porte le préfixe `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict` et `Path=/`
- **AND** rien de la session ne se lit dans le cookie

#### Scenario: L'écran de saisie dit la durée de validité
- **WHEN** l'écran de saisie du code est rendu
- **THEN** il dit combien de temps le code reste bon
- **AND** aucun terme de développeur n'y paraît

### Requirement: Le refus de code qui dit le geste à reprendre

Chaque code refusé SHALL indiquer lequel des trois gestes reprendre — retaper, demander un nouveau code, revenir sur l'appareil demandeur — le verdict tranchant à partir de l'état lu, sans filtrer les codes à la lecture. Un code est brûlé à la cinquième saisie fautive, et une nouvelle demande depuis un appareil annule le code précédent de ce seul appareil.

#### Scenario: Une saisie fautive invite à retaper
- **WHEN** un code fautif est saisi
- **THEN** l'écran invite à retaper
- **AND** aucune session ne s'ouvre

#### Scenario: La cinquième saisie fautive brûle le code
- **WHEN** un code reçoit une cinquième saisie fautive
- **THEN** il devient inutilisable pour toute présentation ultérieure
- **AND** l'écran invite à demander un nouveau code

#### Scenario: Un code d'un autre appareil invite à y revenir
- **WHEN** un code est présenté depuis un appareil qui n'en a jamais demandé
- **THEN** l'écran invite à revenir sur l'appareil demandeur, jamais à en demander un nouveau

#### Scenario: Une nouvelle demande annule le code du seul appareil demandeur
- **WHEN** une nouvelle demande est faite depuis un appareil
- **THEN** le code précédent de cet appareil devient inutilisable
- **AND** un code demandé depuis un autre appareil reste utilisable

#### Scenario: Un code hors d'usage invite à en demander un nouveau
- **WHEN** un code expiré, déjà utilisé ou annulé est présenté
- **THEN** l'écran invite à demander un nouveau code, jamais à revenir sur un autre appareil

#### Scenario: L'écran de saisie borne l'annonce à l'appareil
- **WHEN** l'écran de saisie est rendu
- **THEN** il annonce que seul le dernier code demandé depuis cet appareil permet d'entrer
- **AND** aucun terme de développeur ne paraît dans les textes de refus

### Requirement: La fin de session automatique

Une session SHALL se fermer après sept jours sans usage, et après trente jours quoi qu'il arrive. L'échéance glissante se rafraîchit sans écrire en base à chaque requête (ADR-0001), et rien ne compte ni ne ferme les sessions simultanées — elles expirent.

#### Scenario: Sept jours sans usage ferment la session
- **WHEN** une session est restée sept jours sans usage
- **THEN** elle ne donne plus accès à l'accueil
- **AND** la demande est renvoyée vers l'écran de connexion

#### Scenario: Trente jours ferment la session quoi qu'il arrive
- **WHEN** une session dépasse trente jours, même utilisée chaque jour depuis son ouverture
- **THEN** elle ne donne plus accès

#### Scenario: Un usage dans la fenêtre repousse l'échéance
- **WHEN** une session est utilisée à l'intérieur de la fenêtre des sept jours
- **THEN** l'échéance des sept jours est repoussée

#### Scenario: Le rafraîchissement n'écrit pas à chaque requête
- **WHEN** une session est utilisée requête après requête
- **THEN** le rafraîchissement de l'échéance n'écrit pas en base à chaque requête

#### Scenario: Les sessions simultanées coexistent
- **WHEN** plusieurs sessions sont ouvertes en même temps
- **THEN** elles coexistent sans que rien ne les compte ni ne les ferme
