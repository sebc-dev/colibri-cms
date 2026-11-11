# Remplacement de l'adresse autorisée — Spécification

## Purpose

Permettre à l'éditrice de remplacer seule, depuis une session ouverte, l'adresse autorisée qui ouvre
son administration et reçoit ses demandes, la nouvelle adresse ne le devenant qu'après preuve de sa
maîtrise (FR-013, FR-014), sans visiter aucun compte et sans l'intégrateur.

## Requirements

### Requirement: L'écran « Adresse e-mail » montre l'adresse et propose de la remplacer

L'administration SHALL offrir un écran « Adresse e-mail », atteignable depuis l'écran Réglages et
seulement avec une session ouverte. Il montre l'adresse autorisée en place et offre d'en proposer une
nouvelle. Quand un remplacement est en cours, il dit vers quelle adresse et à quelle étape il en est.
Aucun texte de l'écran ni de ses suites ne porte de terme de développeur (FR-117).

#### Scenario: Sans session, l'écran n'est pas atteignable
- **WHEN** l'écran « Adresse e-mail » ou l'une de ses écritures est demandé sans session ouverte
- **THEN** la demande est renvoyée vers l'écran de connexion
- **AND** rien n'est inscrit, écrit ni envoyé

#### Scenario: L'écran Réglages mène à l'adresse e-mail
- **WHEN** l'écran Réglages est rendu
- **THEN** il porte un lien vers l'écran « Adresse e-mail »

#### Scenario: L'écran montre l'adresse en place
- **WHEN** l'écran est rendu avec une session ouverte
- **THEN** il montre l'adresse autorisée en place
- **AND** il offre un champ pour proposer une nouvelle adresse

#### Scenario: Un remplacement en cours se voit
- **WHEN** l'écran est rendu alors qu'un remplacement est en cours
- **THEN** il dit vers quelle adresse il est en cours et ce qui reste à faire

#### Scenario: Aucun terme de développeur
- **WHEN** l'écran, l'une de ses étapes ou l'un de ses refus est rendu
- **THEN** aucun terme de développeur n'y paraît (FR-117)

### Requirement: La nouvelle adresse est inscrite chez Cloudflare, qui en demande la confirmation

Une nouvelle adresse proposée SHALL être refusée, sans rien inscrire, si elle n'a pas la forme d'une
adresse e-mail ou si elle est l'adresse autorisée en place. Sinon, le produit l'inscrit parmi les
adresses de destination du compte Cloudflare du client, ce qui fait partir vers elle le message de
confirmation de Cloudflare ; si elle y est déjà inscrite, il ne l'inscrit pas une seconde fois. Il
ouvre un remplacement en cours, rattaché à la session qui l'a demandé ; un seul remplacement est en
cours à la fois, et en proposer un autre annule le précédent. L'écran dit qu'un message, en anglais,
va arriver dans la nouvelle boîte, et qu'il faut y cliquer sur le bouton de confirmation, puis revenir
à l'écran. Rien ne change de l'adresse autorisée à cette étape.

#### Scenario: Une adresse mal formée est refusée
- **WHEN** l'éditrice propose une saisie qui n'a pas la forme d'une adresse e-mail
- **THEN** l'écran le dit
- **AND** rien n'est inscrit chez Cloudflare et aucun remplacement n'est ouvert

#### Scenario: L'adresse en place est refusée
- **WHEN** l'éditrice propose l'adresse autorisée en place
- **THEN** l'écran dit que c'est déjà son adresse
- **AND** rien n'est inscrit chez Cloudflare

#### Scenario: Une nouvelle adresse est inscrite chez Cloudflare
- **WHEN** l'éditrice propose une adresse valide qui n'est pas inscrite chez Cloudflare
- **THEN** le produit demande à Cloudflare de l'inscrire parmi les adresses de destination du compte
- **AND** l'écran annonce le message de confirmation à venir et le geste à faire

#### Scenario: Une adresse déjà inscrite ne l'est pas deux fois
- **WHEN** l'éditrice propose une adresse déjà inscrite chez Cloudflare
- **THEN** le produit ne demande pas de nouvelle inscription
- **AND** un remplacement est ouvert vers elle

#### Scenario: L'adresse autorisée ne change pas à la proposition
- **WHEN** une nouvelle adresse vient d'être proposée
- **THEN** l'adresse autorisée en place ouvre toujours l'administration
- **AND** les demandes partent toujours vers elle

#### Scenario: Un nouveau remplacement annule le précédent
- **WHEN** un remplacement est en cours vers une première adresse, et que l'éditrice en propose une seconde
- **THEN** le remplacement vers la première adresse est annulé
- **AND** un code envoyé pour la première adresse ne permet plus de remplacer l'adresse

#### Scenario: Cloudflare refuse l'inscription
- **WHEN** Cloudflare refuse ou ne répond pas à la demande d'inscription
- **THEN** l'écran dit que le remplacement n'a pas pu commencer et invite à réessayer plus tard
- **AND** aucun remplacement n'est ouvert et l'adresse autorisée ne change pas

### Requirement: Le code du produit ne part qu'une fois la confirmation de Cloudflare constatée

Quand l'éditrice revient à l'écran et dit avoir confirmé, le produit SHALL demander à Cloudflare si
l'adresse du remplacement en cours est vérifiée. Tant qu'elle ne l'est pas, aucun code n'est écrit ni
envoyé, et l'écran redit le geste à faire. Quand elle l'est, le produit engendre un code de la même
forme que le code de connexion — huit signes sans confusables —, n'en garde qu'une empreinte salée,
et l'envoie à la nouvelle adresse en texte seul, sous un objet fixe propre au remplacement, depuis
l'adresse d'expéditeur de l'instance. Le code est rattaché au remplacement en cours et à la session
qui l'a demandé. Demander un nouveau code annule le précédent.

#### Scenario: Sans confirmation, aucun code ne part
- **WHEN** l'éditrice dit avoir confirmé alors que Cloudflare ne tient pas encore l'adresse pour vérifiée
- **THEN** aucun code n'est écrit ni envoyé
- **AND** l'écran redit qu'il faut cliquer sur le bouton du message de confirmation

#### Scenario: La confirmation constatée fait partir un code
- **WHEN** l'éditrice dit avoir confirmé et que Cloudflare tient l'adresse pour vérifiée
- **THEN** un code est écrit et son envoi vers la nouvelle adresse est demandé
- **AND** l'écran invite à recopier le code reçu dans la nouvelle boîte

#### Scenario: Le code a la forme du code de connexion et n'est gardé qu'en empreinte
- **WHEN** un code de remplacement est engendré
- **THEN** il fait huit signes de l'alphabet sans confusables
- **AND** la base n'en garde qu'une empreinte salée, jamais le code

#### Scenario: Le message part en texte seul, vers la nouvelle adresse
- **WHEN** un code de remplacement part
- **THEN** son destinataire est la nouvelle adresse, son expéditeur l'adresse d'expéditeur de l'instance
- **AND** il part en texte seul, sous un objet fixe qui n'est pas celui du code de connexion

#### Scenario: Un nouveau code annule le précédent
- **WHEN** un second code de remplacement est demandé
- **THEN** le premier ne permet plus de remplacer l'adresse

#### Scenario: Cloudflare ne répond pas à la vérification
- **WHEN** Cloudflare refuse ou ne répond pas à la demande d'état de l'adresse
- **THEN** aucun code n'est écrit ni envoyé
- **AND** l'écran invite à réessayer dans quelques instants

### Requirement: Le code recopié dans la session demandeuse remplace l'adresse autorisée

Le code de remplacement SHALL remplacer l'adresse autorisée seulement s'il est recopié dans la
session qui a demandé le remplacement, une seule fois, et dans les quinze minutes. La saisie se
normalise comme celle du code de connexion. Un code est brûlé à la cinquième saisie fautive. Une
saisie refusée dit quel geste reprendre — retaper, ou demander un nouveau code — et ne change rien.
Le remplacement réussi est un seul geste : l'adresse autorisée devient la nouvelle, le remplacement
en cours est clos, tout code de connexion en circulation cesse d'ouvrir, et toute autre session
ouverte est fermée ; la session de l'éditrice reste ouverte. L'écran confirme la nouvelle adresse et
dit que les codes de connexion et les demandes y arriveront désormais.

#### Scenario: Le code recopié remplace l'adresse
- **WHEN** l'éditrice recopie le code de remplacement dans la session qui l'a demandé, dans les quinze minutes
- **THEN** l'adresse autorisée devient la nouvelle adresse
- **AND** l'écran confirme la nouvelle adresse

#### Scenario: La saisie est normalisée
- **WHEN** le code de remplacement est saisi avec des minuscules, des séparateurs ou des confusables
- **THEN** il est reconnu

#### Scenario: Un code fautif invite à retaper
- **WHEN** un code fautif est saisi
- **THEN** l'écran invite à retaper
- **AND** l'adresse autorisée ne change pas

#### Scenario: La cinquième saisie fautive brûle le code
- **WHEN** un code de remplacement reçoit une cinquième saisie fautive, puis que le bon code est saisi
- **THEN** l'adresse autorisée ne change pas
- **AND** l'écran invite à demander un nouveau code

#### Scenario: Un code trop vieux ne remplace pas l'adresse
- **WHEN** le code de remplacement est saisi plus de quinze minutes après son envoi
- **THEN** l'adresse autorisée ne change pas
- **AND** l'écran invite à demander un nouveau code

#### Scenario: Le code ne sert que dans la session demandeuse
- **WHEN** le code de remplacement est saisi depuis une autre session que celle qui a demandé le remplacement
- **THEN** l'adresse autorisée ne change pas

#### Scenario: Le code ne sert qu'une fois
- **WHEN** un code de remplacement a déjà servi, puis est saisi à nouveau
- **THEN** il ne remplace rien

#### Scenario: Le code de remplacement n'ouvre pas de session
- **WHEN** un code de remplacement est présenté sur l'écran de connexion
- **THEN** aucune session ne s'ouvre

#### Scenario: La nouvelle adresse ouvre l'administration, l'ancienne non
- **WHEN** l'adresse vient d'être remplacée, puis que la nouvelle puis l'ancienne sont soumises à l'écran de connexion
- **THEN** un code est écrit et envoyé vers la nouvelle adresse
- **AND** pour l'ancienne, rien n'est écrit ni envoyé, et la réponse est celle de toute autre adresse

#### Scenario: Les codes de connexion en circulation cessent d'ouvrir
- **WHEN** un code de connexion a été envoyé à l'ancienne adresse, puis que l'adresse est remplacée avant qu'il serve
- **THEN** ce code n'ouvre plus de session

#### Scenario: Le remplacement ferme les autres sessions
- **WHEN** une session est ouverte sur un autre appareil, et que l'éditrice remplace l'adresse
- **THEN** la session de l'autre appareil ne donne plus accès
- **AND** la session de l'éditrice reste ouverte

#### Scenario: Deux saisies simultanées du bon code ne remplacent qu'une fois
- **WHEN** le même code de remplacement est saisi deux fois en même temps
- **THEN** l'adresse est remplacée une seule fois et un seul avis part

#### Scenario: Le code de secours reste en place
- **WHEN** l'adresse vient d'être remplacée
- **THEN** le code de secours en place ouvre toujours une session

### Requirement: L'ancienne adresse est prévenue du remplacement

Le remplacement réussi SHALL faire partir vers l'ancienne adresse un avis, en texte seul et sous un
objet fixe, qui dit que l'adresse de l'administration a été remplacée, par quelle adresse et à quelle
date, et que, si l'éditrice n'en est pas l'auteure, son code de secours lui permet de reprendre la
main. L'avis ne porte aucun code. Un avis qui ne part pas ne défait pas le remplacement ; l'échec est
consigné dans les journaux de la plateforme.

#### Scenario: L'avis part vers l'ancienne adresse
- **WHEN** l'adresse vient d'être remplacée
- **THEN** un avis part vers l'ancienne adresse, en texte seul, sous un objet fixe
- **AND** il nomme la nouvelle adresse et la date, et renvoie au code de secours

#### Scenario: L'avis ne porte aucun code
- **WHEN** l'avis du remplacement part
- **THEN** il ne porte ni code de connexion, ni code de remplacement, ni code de secours

#### Scenario: Un avis qui échoue ne défait rien
- **WHEN** l'envoi de l'avis échoue
- **THEN** l'adresse autorisée reste la nouvelle adresse
- **AND** une trace de l'échec est écrite dans les journaux de la plateforme, sans aucun code

### Requirement: Les demandes partent vers la nouvelle adresse

Une fois l'adresse remplacée, toute demande de devis envoyée SHALL être acheminée vers la nouvelle
adresse autorisée, et plus vers l'ancienne. Avant la bascule, rien ne change de l'acheminement.

#### Scenario: Une demande après le remplacement va à la nouvelle adresse
- **WHEN** l'adresse vient d'être remplacée, puis qu'une visiteuse envoie une demande complète
- **THEN** la demande est acheminée vers la nouvelle adresse
- **AND** aucun message de la demande ne part vers l'ancienne

#### Scenario: Une demande pendant un remplacement en cours va à l'adresse en place
- **WHEN** un remplacement est en cours, non encore abouti, et qu'une visiteuse envoie une demande complète
- **THEN** la demande est acheminée vers l'adresse autorisée en place

### Requirement: Le plafond de cinq messages par heure pour le remplacement

Au plus cinq messages SHALL partir pour le remplacement par heure glissante, toutes adresses
confondues : chaque inscription chez Cloudflare qui fait partir un message de confirmation compte
pour un, chaque code de remplacement écrit compte pour un. Au-delà, rien n'est inscrit ni écrit ni
envoyé, et l'écran dit, sans terme de développeur, qu'il faut attendre avant de réessayer. Ce plafond
est indépendant du plafond des codes de connexion : l'un n'entame jamais l'autre. L'épreuve du
plafond est indivisible de l'écriture qu'elle autorise.

#### Scenario: Le sixième message de l'heure ne part pas
- **WHEN** cinq messages sont déjà partis pour le remplacement dans l'heure, et que l'éditrice propose une adresse ou demande un code
- **THEN** rien n'est inscrit chez Cloudflare, aucun code n'est écrit et rien n'est envoyé
- **AND** l'écran dit qu'il faut attendre avant de réessayer

#### Scenario: Le plafond du remplacement n'entame pas la connexion
- **WHEN** le plafond du remplacement est atteint, et que l'adresse autorisée est soumise à l'écran de connexion
- **THEN** un code de connexion est écrit et envoyé comme sans plafond du remplacement

#### Scenario: Une place se libère en sortant de l'heure
- **WHEN** un message du remplacement sort de l'heure glissante
- **THEN** une nouvelle proposition ou un nouveau code redevient possible

#### Scenario: Deux demandes simultanées ne franchissent pas le plafond
- **WHEN** deux demandes de code concurrentes arrivent alors que quatre messages sont déjà partis dans l'heure
- **THEN** un seul code est écrit

### Requirement: Sans clé de la plateforme, le remplacement est refusé sans rien changer

Quand l'instance ne dispose pas de la clé qui permet d'inscrire une adresse chez Cloudflare, ou de
l'identifiant du compte, l'écran « Adresse e-mail » SHALL montrer l'adresse en place et dire que le
remplacement n'est pas possible pour le moment, sans terme de développeur ; aucune proposition n'est
acceptée. La clé n'apparaît dans aucune réponse, aucun journal, et aucun fichier du dépôt.

#### Scenario: Sans clé, l'écran le dit
- **WHEN** l'écran est rendu sur une instance sans clé ou sans identifiant de compte
- **THEN** il montre l'adresse en place et dit que le remplacement n'est pas possible pour le moment
- **AND** aucune proposition n'aboutit à une inscription ou un envoi

#### Scenario: La clé ne paraît nulle part
- **WHEN** une proposition, une vérification ou un refus de Cloudflare est traité
- **THEN** la clé ne figure ni dans la réponse, ni dans les journaux de la plateforme
