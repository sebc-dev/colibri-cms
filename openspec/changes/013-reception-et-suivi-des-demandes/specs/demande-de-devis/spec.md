## MODIFIED Requirements

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
