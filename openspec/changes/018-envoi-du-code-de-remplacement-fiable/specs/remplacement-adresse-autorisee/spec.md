## MODIFIED Requirements

### Requirement: L'écran « Adresse e-mail » montre l'adresse et propose de la remplacer

L'administration SHALL offrir un écran « Adresse e-mail », atteignable depuis l'écran Réglages et
seulement avec une session ouverte. Il montre l'adresse autorisée en place et offre d'en proposer une
nouvelle. Quand un remplacement est en cours, il dit vers quelle adresse et à quelle étape il en est.
Aucun texte de l'écran ni de ses suites ne porte de terme de développeur (FR-117). Toute adresse que
l'écran affiche, quelle que soit sa longueur, SHALL rester lisible en entier dans la largeur d'un
téléphone.

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

#### Scenario: Une adresse longue se lit en entier à 360 px
- **WHEN** l'écran affiche, à 360 px de large, une adresse de quarante signes ou plus, à l'étape de la confirmation, à l'étape du code ou à la réussite
- **THEN** l'adresse revient à la ligne dans sa carte et aucun de ses signes n'est rogné
- **AND** la page ne défile pas horizontalement

### Requirement: Le code du produit ne part qu'une fois la confirmation de Cloudflare constatée

Quand l'éditrice revient à l'écran et dit avoir confirmé, le produit SHALL demander à Cloudflare si
l'adresse du remplacement en cours est vérifiée. Tant qu'elle ne l'est pas, aucun code n'est écrit ni
envoyé, et l'écran redit le geste à faire. Tant qu'elle l'est depuis moins d'une minute, à l'instant
que Cloudflare donne pour la vérification, aucun code n'est écrit ni envoyé non plus : l'écran dit
que le clic est enregistré et qu'il faut patienter un instant. Passé ce délai, le produit engendre un
code de la même forme que le code de connexion — huit signes sans confusables —, n'en garde qu'une
empreinte salée, et l'envoie à la nouvelle adresse en texte seul, sous un objet fixe propre au
remplacement, depuis l'adresse d'expéditeur de l'instance. Le produit SHALL attendre l'issue de
l'envoi avant de répondre : l'écran ne dit qu'un code est parti que si l'envoi a été accepté. Un envoi
refusé est retenté brièvement ; s'il reste refusé, le code est annulé et l'écran le dit, sans terme de
développeur, en invitant à redemander le code un peu plus tard. Le code est rattaché au remplacement
en cours et à la session qui l'a demandé. Demander un nouveau code annule le précédent.

#### Scenario: Sans confirmation, aucun code ne part
- **WHEN** l'éditrice dit avoir confirmé alors que Cloudflare ne tient pas encore l'adresse pour vérifiée
- **THEN** aucun code n'est écrit ni envoyé
- **AND** l'écran redit qu'il faut cliquer sur le bouton du message de confirmation

#### Scenario: Une confirmation de moins d'une minute fait patienter
- **WHEN** l'éditrice dit avoir confirmé ou demande un nouveau code alors que Cloudflare tient l'adresse pour vérifiée depuis moins d'une minute
- **THEN** aucun code n'est écrit ni envoyé, et aucun message n'est compté au plafond
- **AND** l'écran dit que le clic est bien enregistré et invite à réessayer dans un instant
- **AND** l'écran redit l'adresse en place

#### Scenario: La confirmation constatée fait partir un code
- **WHEN** l'éditrice dit avoir confirmé, que Cloudflare tient l'adresse pour vérifiée depuis une minute ou plus, et que l'envoi est accepté
- **THEN** un code est écrit et envoyé vers la nouvelle adresse
- **AND** l'écran invite à recopier le code reçu dans la nouvelle boîte

#### Scenario: Un envoi refusé puis accepté fait partir le code
- **WHEN** l'envoi du code est refusé à la première tentative puis accepté à une tentative suivante de la même demande
- **THEN** un seul message part, avec le code écrit pour cette demande
- **AND** l'écran invite à recopier le code reçu dans la nouvelle boîte

#### Scenario: Un envoi qui reste refusé se dit à l'écran
- **WHEN** l'envoi du code reste refusé après les tentatives de la demande
- **THEN** l'écran ne dit pas qu'un code est parti : il dit que le code n'a pas pu partir et invite à le redemander un peu plus tard
- **AND** le code écrit pour cette demande ne permet pas de remplacer l'adresse
- **AND** l'écran redit l'adresse en place

#### Scenario: Le code a la forme du code de connexion et n'est gardé qu'en empreinte
- **WHEN** un code de remplacement est engendré
- **THEN** il fait huit signes de l'alphabet sans confusables
- **AND** la base n'en garde qu'une empreinte salée, jamais le code

#### Scenario: Le message part en texte seul, vers la nouvelle adresse
- **WHEN** un code de remplacement part
- **THEN** son destinataire est la nouvelle adresse, son expéditeur l'adresse d'expéditeur de l'instance
- **AND** il part en texte seul, sous un objet fixe qui n'est pas celui du code de connexion

#### Scenario: Un nouveau code annule le précédent
- **WHEN** un second code de remplacement est demandé et part
- **THEN** le premier ne permet plus de remplacer l'adresse

#### Scenario: Cloudflare ne répond pas à la vérification
- **WHEN** Cloudflare refuse ou ne répond pas à la demande d'état de l'adresse
- **THEN** aucun code n'est écrit ni envoyé
- **AND** l'écran invite à réessayer dans quelques instants

### Requirement: Le plafond de cinq messages par heure pour le remplacement

Au plus cinq messages SHALL partir pour le remplacement par heure glissante, toutes adresses
confondues : chaque inscription chez Cloudflare qui fait partir un message de confirmation compte
pour un, chaque code de remplacement dont l'envoi a été accepté compte pour un. Un code dont l'envoi
est resté refusé ne compte pas : sa place est rendue. Au-delà du plafond, rien n'est inscrit ni écrit
ni envoyé, et l'écran dit, sans terme de développeur, qu'il faut attendre avant de réessayer. Le refus
du plafond ne retire rien de ce qui est déjà en cours : un code déjà parti et encore bon reste
recopiable. Ce plafond est indépendant du plafond des codes de connexion : l'un n'entame jamais
l'autre. L'épreuve du plafond est indivisible de l'écriture qu'elle autorise.

#### Scenario: Le sixième message de l'heure ne part pas
- **WHEN** cinq messages sont déjà partis pour le remplacement dans l'heure, et que l'éditrice propose une adresse ou demande un code
- **THEN** rien n'est inscrit chez Cloudflare, aucun code n'est écrit et rien n'est envoyé
- **AND** l'écran dit qu'il faut attendre avant de réessayer

#### Scenario: Un code qui n'est pas parti rend sa place
- **WHEN** quatre messages sont déjà partis dans l'heure, qu'un code est demandé et que son envoi reste refusé
- **THEN** le plafond compte toujours quatre messages
- **AND** une nouvelle demande de code dans la même heure est acceptée

#### Scenario: Le refus du plafond garde l'étape du code
- **WHEN** un code de remplacement est parti et reste bon, et qu'une nouvelle demande de code est refusée par le plafond
- **THEN** l'écran dit qu'il faut attendre avant de réessayer et garde le champ de saisie du code
- **AND** le code déjà parti permet toujours de remplacer l'adresse

#### Scenario: Le plafond du remplacement n'entame pas la connexion
- **WHEN** le plafond du remplacement est atteint, et que l'adresse autorisée est soumise à l'écran de connexion
- **THEN** un code de connexion est écrit et envoyé comme sans plafond du remplacement

#### Scenario: Une place se libère en sortant de l'heure
- **WHEN** un message du remplacement sort de l'heure glissante
- **THEN** une nouvelle proposition ou un nouveau code redevient possible

#### Scenario: Deux demandes simultanées ne franchissent pas le plafond
- **WHEN** deux demandes de code concurrentes arrivent alors que quatre messages sont déjà partis dans l'heure
- **THEN** un seul code est écrit
