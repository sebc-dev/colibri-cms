## ADDED Requirements

### Requirement: Le seuil de vingt tentatives par origine

Au-delà de **20 tentatives de connexion par heure** depuis une même origine (FR-007, seuil et fenêtre de
la capacité `seuil-par-origine`), l'écran de connexion SHALL refuser la tentative. Toute soumission compte
comme une tentative : celle d'une adresse comme celle d'un code. Une tentative refusée NE DOIT écrire aucun
code, n'en vérifier aucun, n'ouvrir aucune session et n'envoyer aucun message. Le refus DOIT s'annoncer à
l'écran, sans terme de développeur, **identiquement quelle que soit l'adresse ou le code soumis** — ni le
texte, ni les champs d'en-tête, ni le délai de la réponse ne dépendent de ce qui a été soumis : la
soumission d'une adresse refusée respecte le même délai plancher que toute soumission d'adresse. Le seuil
d'une origine NE DOIT pas toucher les autres origines, et le plafond de cinq messages par heure reste
inchangé.

#### Scenario: La vingt-et-unième tentative est refusée
- **WHEN** une même origine soumet vingt et une fois l'écran de connexion dans la même heure, adresses et codes mêlés
- **THEN** les vingt premières soumissions sont traitées, la vingt-et-unième est refusée et l'écran l'annonce

#### Scenario: Une tentative refusée n'écrit rien et n'ouvre rien
- **WHEN** au-delà du seuil de son origine, une soumission porte l'adresse autorisée, puis une autre porte un code valide
- **THEN** aucun code n'est écrit, aucun message n'est envoyé, le code valide n'est ni consommé ni accepté, et aucune session ne s'ouvre

#### Scenario: Le refus s'annonce identiquement pour toute adresse
- **WHEN** au-delà du seuil de son origine, une soumission porte l'adresse autorisée, et une autre une adresse quelconque
- **THEN** les deux réponses portent le même texte et les mêmes champs d'en-tête, et leurs délais ne se laissent pas distinguer

#### Scenario: Une autre origine se connecte normalement
- **WHEN** une origine a atteint le seuil, et que l'éditrice soumet l'adresse autorisée depuis une autre origine dans la même heure
- **THEN** un code est écrit et envoyé à l'adresse autorisée, comme sans seuil

#### Scenario: Aucun terme de développeur dans l'annonce
- **WHEN** l'écran annonce que le seuil de l'origine est atteint
- **THEN** aucun terme de développeur n'y paraît (FR-117)
