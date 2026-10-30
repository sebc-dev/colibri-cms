# Demande de devis Specification

## Purpose

Permettre à un visiteur de composer, sur une page publique, une demande de devis chiffrée à partir d'un
formulaire posé par l'intégrateur et réglé par l'éditrice, de l'envoyer sans compte, et la faire parvenir
par e-mail à l'adresse autorisée. Couvre FR-052 → FR-064, sous FR-097, SEC-2 et SEC-7.

## Requirements

### Requirement: Dessin du formulaire sur la page

Un emplacement de formulaire SHALL dessiner, à son rang dans la page, le formulaire publié qu'il désigne :
ses champs dans l'ordre déclaré, chacun sous son libellé, un champ obligatoire marqué comme tel ; un champ
à choix unique comme un groupe où une seule option se choisit ; un champ à choix multiple comme un groupe
où plusieurs options se cochent ; chaque option d'un champ avec prix suivie de son prix en euros ; un champ
de texte, de texte long, d'e-mail ou de téléphone comme une zone de saisie de sa sorte. Le formulaire DOIT
présenter, avec le total, la mention que l'estimation est indicative et non engageante (FR-055), et, avant
le bouton d'envoi, la mention d'information sur le traitement des coordonnées réglée par l'éditrice
(FR-056). Il NE DOIT offrir aucun champ de fichier (FR-061). Le formulaire dessiné DOIT figurer dans le
document servi lui-même, bâti à la reconstruction du site. Tout texte venu du contenu — nom, libellé,
option — DOIT être affiché tel quel, sans qu'aucun balisage n'y soit interprété ; la mention d'information
garde la mise en forme et les règles de liens du texte riche.

#### Scenario: Les champs paraissent dans l'ordre déclaré
- **WHEN** un visiteur demande la page « Contact », qui pose le formulaire « Devis gâteau »
- **THEN** la page présente, à la place de cet emplacement, les champs « Parfum », « Nombre de parts », « Occasion », « Votre nom », « Votre adresse e-mail », « Votre numéro de téléphone » et « Votre message », dans cet ordre, « Parfum » et « Votre adresse e-mail » marqués obligatoires

#### Scenario: Chaque option d'un champ avec prix montre son prix
- **WHEN** le formulaire « Devis gâteau » est publié avec « Vanille » à 8 €, « Chocolat » à 9 € et « Fraise » à 10,50 € dans « Parfum »
- **THEN** la page présente ces trois options, chacune suivie de son prix — « 8 € », « 9 € », « 10,50 € » —, et les options d'« Occasion », champ sans prix, sans aucun prix

#### Scenario: Un choix unique n'admet qu'une option
- **WHEN** le visiteur choisit « Vanille » puis « Chocolat » dans « Parfum »
- **THEN** seule « Chocolat » reste choisie

#### Scenario: Un choix multiple admet plusieurs options
- **WHEN** le visiteur coche « Anniversaire » puis « Mariage » dans « Occasion »
- **THEN** les deux restent cochées

#### Scenario: Les deux mentions accompagnent le formulaire
- **WHEN** un visiteur consulte une page qui pose un formulaire
- **THEN** la mention que l'estimation est indicative et non engageante paraît avec le total, et la mention d'information publiée paraît avant le bouton d'envoi

#### Scenario: Le formulaire figure dans le document servi
- **WHEN** une page qui pose un formulaire est demandée
- **THEN** ses champs, ses options, leurs prix et les deux mentions figurent dans la réponse elle-même, sans qu'aucun échange supplémentaire ne soit nécessaire pour les obtenir

#### Scenario: Aucun champ de fichier
- **WHEN** un visiteur parcourt le formulaire
- **THEN** aucun champ n'offre de joindre un fichier

#### Scenario: Un texte du formulaire n'est jamais interprété
- **WHEN** un libellé de champ ou d'option publié contient les caractères `<`, `>`, `&` ou des guillemets
- **THEN** la page les affiche comme du texte, et aucun balisage n'est interprété

### Requirement: Total calculé sur l'appareil du visiteur

Le formulaire SHALL afficher au visiteur le total de sa sélection (FR-052) : la somme des prix des options
choisies dans les champs avec prix (FR-053), en euros. Le total DOIT être recalculé à chaque changement de
sélection, sur l'appareil du visiteur, sans aucun échange avec le serveur (FR-054). Une option d'un champ
sans prix NE DOIT pas changer le total. Sans aucune option choisie dans un champ avec prix, le total vaut
0 €. La somme DOIT être exacte au centime.

#### Scenario: Le total est la somme des options choisies
- **WHEN** le visiteur choisit « Chocolat » (9 €) dans « Parfum » et « 10 parts » (30 €) dans « Nombre de parts »
- **THEN** le total affiché est 39 €

#### Scenario: Le total suit chaque changement
- **WHEN** le visiteur, après avoir obtenu un total de 39 €, remplace « Chocolat » par « Fraise » (10 €)
- **THEN** le total affiché devient 40 €, sans action de sa part ni rechargement de la page

#### Scenario: Le calcul n'échange rien avec le serveur
- **WHEN** le visiteur change sa sélection plusieurs fois
- **THEN** aucune requête ne part de son appareil vers le serveur

#### Scenario: Une option sans prix ne change pas le total
- **WHEN** le visiteur coche « Mariage » dans « Occasion », champ sans prix
- **THEN** le total affiché est inchangé

#### Scenario: Sans sélection, le total est nul
- **WHEN** le visiteur ouvre la page sans avoir rien choisi
- **THEN** le total affiché est 0 €

#### Scenario: Les centimes sont exacts
- **WHEN** le visiteur choisit une option à 10,50 € et une option à 0,20 €
- **THEN** le total affiché est 10,70 €

### Requirement: Champs obligatoires et saisie vérifiée avant l'envoi

L'envoi SHALL être refusé tant qu'un champ obligatoire n'est pas renseigné, en désignant le champ manquant
(FR-058) : un champ de texte, de texte long, d'e-mail ou de téléphone vide ou fait d'espaces, un champ à
choix unique sans option choisie, un champ à choix multiple sans option cochée. Une adresse e-mail DOIT
avoir la forme d'une adresse, un numéro de téléphone celle d'un numéro (chiffres, espaces, points, tirets,
parenthèses et un `+` initial) ; chaque saisie DOIT tenir dans sa longueur maximale — 200 caractères pour
un texte, 2 000 pour un texte long, 254 pour une adresse e-mail, 30 pour un numéro de téléphone. Le refus
DOIT désigner chaque champ en cause par son libellé, dire ce qui manque ou ne va pas, et ne rien envoyer.
Le serveur DOIT appliquer les mêmes règles à toute demande reçue.

#### Scenario: Un champ obligatoire vide bloque l'envoi
- **WHEN** le visiteur envoie le formulaire « Devis gâteau » sans avoir renseigné « Votre adresse e-mail »
- **THEN** rien n'est envoyé, et le formulaire désigne « Votre adresse e-mail » comme champ à renseigner

#### Scenario: Un choix obligatoire sans option bloque l'envoi
- **WHEN** le visiteur envoie le formulaire sans avoir choisi de parfum
- **THEN** rien n'est envoyé, et le formulaire désigne « Parfum » comme champ à renseigner

#### Scenario: Un champ fait d'espaces est vide
- **WHEN** le visiteur n'a saisi que des espaces dans « Votre adresse e-mail » et envoie
- **THEN** rien n'est envoyé, et le formulaire désigne ce champ comme champ à renseigner

#### Scenario: Une adresse e-mail mal formée est désignée
- **WHEN** le visiteur saisit « marie.exemple.fr » dans « Votre adresse e-mail » et envoie
- **THEN** rien n'est envoyé, et le formulaire désigne ce champ en disant que l'adresse n'a pas la forme d'une adresse e-mail

#### Scenario: Une saisie trop longue est désignée
- **WHEN** le visiteur saisit 2 001 caractères dans « Votre message » et envoie
- **THEN** rien n'est envoyé, et le formulaire désigne ce champ en disant sa longueur maximale

#### Scenario: Le serveur refuse ce que le formulaire aurait dû bloquer
- **WHEN** une demande parvient au serveur sans valeur pour un champ obligatoire, sans passer par le formulaire de la page
- **THEN** elle est refusée en désignant ce champ, et aucun e-mail n'est envoyé

### Requirement: Envoi de la demande et confirmation

Une fois les champs obligatoires renseignés, le visiteur SHALL pouvoir envoyer sa demande (FR-057), sans
compte ni inscription. Pendant l'envoi, le formulaire DOIT dire que l'envoi est en cours et ne DOIT pas
permettre un second envoi. Dès que l'envoi s'achève sans confirmation — refus du serveur ou échec —, le
bouton d'envoi DOIT redevenir actif, la saisie gardée. Une demande acceptée DOIT être confirmée au
visiteur (FR-059) : le formulaire laisse place à un message qui dit que sa demande a été envoyée. La
confirmation NE DOIT paraître qu'une fois la demande gardée dans la liste des demandes (capacité
`suivi-des-demandes`) ou son e-mail remis à la plateforme d'acheminement — l'un des deux suffit (FR-066).

#### Scenario: Une demande complète est confirmée
- **WHEN** le visiteur a choisi « Fraise » et « 10 parts », renseigné son adresse e-mail, et envoie
- **THEN** le formulaire laisse place à un message qui confirme que sa demande a été envoyée

#### Scenario: Un double envoi ne produit qu'une demande
- **WHEN** le visiteur actionne deux fois de suite le bouton d'envoi
- **THEN** une seule demande part, une seule demande paraît dans la liste des demandes, et un seul e-mail parvient à l'adresse autorisée

#### Scenario: L'envoi en cours se voit
- **WHEN** le visiteur a envoyé sa demande et que la réponse n'est pas encore revenue
- **THEN** le formulaire dit que l'envoi est en cours, et le bouton d'envoi est inactif

#### Scenario: Après un refus du serveur, le visiteur peut renvoyer
- **WHEN** le visiteur a envoyé sa demande et que le serveur la refuse, en désignant un champ ou parce que le formulaire a changé
- **THEN** le formulaire n'est plus en cours d'envoi, le bouton d'envoi est de nouveau actif, et toute la saisie est gardée

#### Scenario: Une demande gardée est confirmée même si son e-mail est refusé
- **WHEN** le visiteur envoie une demande complète, qu'elle est gardée dans la liste des demandes, et que la plateforme d'acheminement refuse l'e-mail
- **THEN** le formulaire laisse place au message qui confirme que sa demande a été envoyée

#### Scenario: Une demande acheminée est confirmée même si elle n'a pas pu être gardée
- **WHEN** le visiteur envoie une demande complète, que la base refuse de la garder, et que son e-mail est remis à la plateforme d'acheminement
- **THEN** le formulaire laisse place au message qui confirme que sa demande a été envoyée

### Requirement: Échec de l'envoi sans perte de la saisie

Quand l'envoi n'aboutit pas, le visiteur SHALL en être informé (FR-060), sans perdre aucune de ses
saisies ni de ses sélections, et DOIT pouvoir réessayer. L'envoi n'aboutit pas quand la demande n'a pu être
ni gardée dans la liste des demandes ni acheminée par e-mail, quand le site ne répond pas, quand le
comptage des demandes est en panne, quand le seuil des demandes est atteint, ou quand le formulaire a
changé. Le message DOIT dire, sans terme technique, ce qui s'est passé et quoi faire : réessayer plus tard
quand la demande n'a pu être ni gardée ni acheminée, que le site ne répond pas ou que le comptage des
demandes est en panne ; patienter quand le seuil des demandes est atteint (FR-062) ; recharger la page
quand le formulaire a changé depuis son ouverture. Aucun échec NE DOIT être présenté comme une demande
envoyée.

#### Scenario: Un acheminement en échec est annoncé, la saisie gardée
- **WHEN** le visiteur envoie une demande complète, que la base refuse de la garder, et que la plateforme d'acheminement refuse l'e-mail
- **THEN** le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer, et toutes ses saisies et sélections sont toujours là

#### Scenario: Le site injoignable est annoncé, la saisie gardée
- **WHEN** le visiteur envoie sa demande alors que son appareil n'atteint pas le site
- **THEN** le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer, sans rien effacer

#### Scenario: Réessayer après un échec
- **WHEN** après un échec d'envoi, le visiteur renvoie sa demande et qu'elle est gardée et acheminée
- **THEN** la demande est confirmée, une seule demande paraît dans la liste des demandes, et un seul e-mail parvient pour ce nouvel envoi

#### Scenario: Le seuil atteint est annoncé, la saisie gardée
- **WHEN** le visiteur envoie une demande au-delà du seuil de son origine
- **THEN** le formulaire dit que trop de demandes ont été envoyées depuis sa connexion et l'invite à réessayer plus tard, sans rien effacer, et aucun e-mail n'est envoyé

#### Scenario: Une panne du comptage est annoncée comme un échec, la saisie gardée
- **WHEN** le visiteur envoie une demande complète et que la base refuse de compter la sollicitation
- **THEN** le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer dans quelques instants, sans parler de seuil ni rien effacer, et aucun e-mail n'est envoyé

### Requirement: La demande reçue s'accorde au formulaire publié

Le serveur SHALL vérifier chaque demande reçue contre le formulaire publié qu'elle désigne, jamais contre ce
que la demande annonce : le formulaire DOIT exister et être posé sur la page d'origine annoncée ; chaque
valeur DOIT viser un champ déclaré ; chaque option DOIT exister dans son champ ; un champ à choix unique NE
DOIT porter qu'une option ; un champ sans valeur de choix NE DOIT pas porter d'option. Le serveur DOIT
recalculer le total depuis les prix publiés et le comparer au total que le formulaire affichait au moment
de l'envoi. Une demande qui ne s'accorde pas — formulaire, page, champ ou option inconnus, total différent
— DOIT être refusée sans envoyer d'e-mail, et le formulaire dit au visiteur que le formulaire a changé et
l'invite à recharger la page, sa saisie gardée.

#### Scenario: Un prix changé depuis l'ouverture de la page est refusé
- **WHEN** le visiteur a ouvert la page quand « Fraise » valait 10 €, que l'éditrice a depuis publié « Fraise » à 11 €, que le site a été reconstruit, et que le visiteur envoie sa demande avec « Fraise »
- **THEN** la demande est refusée, aucun e-mail n'est envoyé, et le formulaire l'invite à recharger la page, sa saisie gardée

#### Scenario: Une option inconnue est refusée
- **WHEN** une demande désigne dans « Parfum » une option que le formulaire publié ne porte pas
- **THEN** elle est refusée, et aucun e-mail n'est envoyé

#### Scenario: Deux options dans un choix unique sont refusées
- **WHEN** une demande porte deux options dans « Parfum », champ à choix unique
- **THEN** elle est refusée, et aucun e-mail n'est envoyé

#### Scenario: Un champ inconnu est refusé
- **WHEN** une demande porte une valeur pour un champ que le formulaire publié ne déclare pas
- **THEN** elle est refusée, et aucun e-mail n'est envoyé

#### Scenario: Une page qui ne pose pas le formulaire est refusée
- **WHEN** une demande désigne le formulaire « Devis gâteau » et une page d'origine qui ne le pose pas
- **THEN** elle est refusée, et aucun e-mail n'est envoyé

#### Scenario: Un total annoncé faux est refusé
- **WHEN** une demande annonce un total de 1 € pour « Fraise » (10 €) et « 10 parts » (30 €)
- **THEN** elle est refusée, et aucun e-mail n'est envoyé

### Requirement: Le seul traitement serveur d'un visiteur

L'envoi d'une demande SHALL être le seul geste d'un visiteur qui déclenche un traitement serveur (FR-097).
Le point d'envoi DOIT n'accepter qu'un envoi de demande venu du site lui-même : une requête émise depuis une
autre origine, d'une autre méthode, d'un autre format, ou d'un corps qui dépasse la taille d'une demande,
DOIT être refusée sans rien envoyer. Un corps qui porte un fichier DOIT être refusé sans être lu (FR-061).
Le point d'envoi NE DOIT exiger ni compte ni session, NE DOIT poser aucun cookie, et NE DOIT renvoyer
aucune des données saisies par le visiteur.

#### Scenario: Un envoi venu d'une autre origine est refusé
- **WHEN** une demande parvient au point d'envoi avec une origine qui n'est pas celle du site
- **THEN** elle est refusée, et aucun e-mail n'est envoyé

#### Scenario: Un corps portant un fichier est refusé sans être lu
- **WHEN** un envoi parvient au point d'envoi sous la forme d'un formulaire à pièces jointes
- **THEN** il est refusé sans que son corps soit lu, et aucun e-mail n'est envoyé

#### Scenario: Un corps démesuré est refusé
- **WHEN** un envoi parvient au point d'envoi avec un corps plus grand que la taille d'une demande
- **THEN** il est refusé, et aucun e-mail n'est envoyé

#### Scenario: L'envoi ne pose aucun cookie et ne renvoie pas la saisie
- **WHEN** une demande est acceptée
- **THEN** la réponse ne pose aucun cookie et ne contient aucune des valeurs saisies par le visiteur

#### Scenario: Une demande ne demande aucun compte
- **WHEN** un visiteur sans aucune session envoie une demande complète
- **THEN** elle est acceptée et confirmée

### Requirement: Acheminement de la demande par e-mail

Chaque demande acceptée SHALL être acheminée par un e-mail à l'adresse autorisée (FR-063), envoyé depuis
l'adresse d'expéditeur de l'instance. L'e-mail DOIT être **inerte et étiqueté** (ADR-0002, SEC-7) : texte
seul, jamais de HTML ; objet fixe posé par le produit, « Demande de devis — » suivi du nom du formulaire ;
chaque donnée du visiteur rendue derrière l'étiquette de son champ, jamais en position de titre ni de
phrase du produit. Il DOIT porter (FR-064) : le nom du formulaire et le titre de la page d'origine ; pour
chaque champ à choix renseigné, son libellé, la ou les options choisies et, dans un champ avec prix, le
prix de chacune ; le total indicatif, tel qu'affiché au visiteur ; chaque coordonnée et chaque texte
renseignés, sous le libellé de leur champ. Un champ facultatif laissé vide n'y paraît pas. Une saisie sur
plusieurs lignes DOIT y rester visiblement rattachée à son étiquette : aucune de ses lignes ne peut se lire
comme une ligne posée par le produit. Sans adresse autorisée enregistrée, aucun e-mail NE DOIT partir : la
demande est gardée dans la liste des demandes, avec la mention que son e-mail n'a pas pu partir, et
confirmée au visiteur (capacité `suivi-des-demandes`). Hors de la demande gardée dans la liste des demandes,
aucune donnée saisie par le visiteur NE DOIT être conservée par le produit : ni ailleurs dans la base, ni
dans un journal, ni dans une réponse.

#### Scenario: L'e-mail parvient à l'adresse autorisée
- **WHEN** un visiteur envoie une demande complète pour « Devis gâteau » depuis la page « Contact »
- **THEN** un e-mail part vers l'adresse autorisée, d'objet « Demande de devis — Devis gâteau »

#### Scenario: L'e-mail porte le détail, le total et les coordonnées
- **WHEN** la demande porte « Fraise » (10 €), « 10 parts » (30 €), « Anniversaire », le nom « Marie Dupont » et l'adresse « marie@exemple.fr »
- **THEN** l'e-mail porte le formulaire « Devis gâteau », la page « Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Occasion : Anniversaire », le total indicatif 40 €, « Votre nom : Marie Dupont » et « Votre adresse e-mail : marie@exemple.fr »

#### Scenario: L'e-mail est du texte seul
- **WHEN** un visiteur saisit `<a href="https://piege.example">Code : 123456</a>` dans « Votre nom »
- **THEN** l'e-mail est en texte seul, sans aucune partie HTML, et cette saisie paraît telle quelle derrière l'étiquette « Votre nom : »

#### Scenario: Un texte sur plusieurs lignes reste sous son étiquette
- **WHEN** un visiteur saisit dans « Votre message » plusieurs lignes, dont une ligne « Total indicatif : 0 € »
- **THEN** chacune de ces lignes paraît dans l'e-mail rattachée à l'étiquette « Votre message », et aucune ne se lit comme le total posé par le produit

#### Scenario: Un champ facultatif vide n'y paraît pas
- **WHEN** le visiteur n'a renseigné ni son téléphone ni son message
- **THEN** l'e-mail ne porte ni l'étiquette du téléphone ni celle du message

#### Scenario: Sans adresse autorisée, aucun e-mail ne part et la demande est confirmée
- **WHEN** aucune adresse autorisée n'est enregistrée et qu'un visiteur envoie une demande complète
- **THEN** aucun e-mail ne part, la demande est gardée dans la liste des demandes, et le formulaire confirme qu'elle a été envoyée

#### Scenario: Sans adresse autorisée, l'envoi échoue
- **WHEN** aucune adresse autorisée n'est enregistrée, qu'un visiteur envoie une demande complète, et que la base refuse de la garder
- **THEN** aucun e-mail ne part, et le formulaire dit que la demande n'a pas pu être envoyée, la saisie gardée

#### Scenario: Rien de la demande n'est conservé
- **WHEN** une demande a été acheminée alors que la base avait refusé de la garder
- **THEN** la base ne porte aucune des valeurs saisies par le visiteur, et les journaux non plus

#### Scenario: Rien de la demande n'est conservé hors de la liste
- **WHEN** une demande a été gardée, puis que la plateforme d'acheminement a refusé son e-mail
- **THEN** les valeurs saisies par le visiteur ne figurent que dans la demande gardée : ni ailleurs dans la base, ni dans les journaux, ni dans la réponse
