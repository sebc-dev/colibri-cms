## MODIFIED Requirements

### Requirement: Une publication qui échoue avant le dépôt ne change rien

Quand une publication échoue avant que le contenu soit déposé — dépôt injoignable, accès refusé, clé
absente ou invalide, dépôt introuvable, dépôt non configuré —, le site public, le contenu publié et chaque
brouillon SHALL rester exactement tels qu'ils étaient (FR-091), et l'éditrice DOIT en être informée par un
message qui dit que rien n'a changé, sans aucun terme de développeur (FR-117). Le message DOIT distinguer
deux cas. Un **échec passager** — dépôt injoignable, état du dépôt qui a changé entre-temps — invite à
réessayer plus tard. Un **refus durable** — accès refusé, clé absente ou invalide, dépôt introuvable, dépôt
non configuré — n'invite pas à réessayer : il invite l'éditrice à prévenir la personne qui s'occupe de son
site. La relance d'une mise en ligne qui n'a pas abouti suit la même distinction. Dans les deux cas, une
publication redevient possible aussitôt.

#### Scenario: Un dépôt refusé ne change rien
- **WHEN** l'éditrice confirme une publication et que le dépôt refuse l'écriture
- **THEN** chaque brouillon est intact et porte toujours sa marque, le contenu publié est inchangé, et l'écran dit que la publication n'a pas pu se faire et que rien n'a changé

#### Scenario: Un site sans dépôt configuré ne publie pas
- **WHEN** l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et que l'éditrice confirme une publication
- **THEN** rien n'est déposé, chaque brouillon est intact, et l'écran dit que la publication n'a pas pu se faire, sans aucun terme de développeur

#### Scenario: Un échec passager invite à réessayer
- **WHEN** l'éditrice confirme une publication et que le dépôt est injoignable
- **THEN** l'écran dit que la publication n'a pas pu se faire, que rien n'a changé, et invite à réessayer dans quelques minutes

#### Scenario: Un accès refusé invite à prévenir, pas à réessayer
- **WHEN** l'éditrice confirme une publication et que le dépôt refuse l'accès
- **THEN** l'écran dit que rien n'a changé et invite à prévenir la personne qui s'occupe du site
- **AND** il n'invite pas à réessayer

#### Scenario: Un dépôt introuvable invite à prévenir, pas à réessayer
- **WHEN** l'éditrice confirme une publication et que le dépôt est introuvable
- **THEN** l'écran dit que rien n'a changé et invite à prévenir la personne qui s'occupe du site
- **AND** il n'invite pas à réessayer

#### Scenario: Un site sans dépôt configuré invite à prévenir, pas à réessayer
- **WHEN** l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et que l'éditrice confirme une publication
- **THEN** l'écran invite à prévenir la personne qui s'occupe du site
- **AND** il n'invite pas à réessayer

#### Scenario: La relance refusée durablement invite à prévenir
- **WHEN** l'éditrice relance une mise en ligne qui n'a pas abouti et que le dépôt refuse l'accès
- **THEN** l'écran invite à prévenir la personne qui s'occupe du site
- **AND** il n'invite pas à réessayer

#### Scenario: Après un refus durable, une publication reste possible
- **WHEN** une publication vient d'être refusée durablement, puis que l'éditrice confirme une nouvelle publication
- **THEN** la nouvelle publication n'est pas refusée au motif qu'une autre serait en cours

#### Scenario: Aucun terme de développeur dans le message de refus durable
- **WHEN** l'éditrice lit le message d'un refus durable
- **THEN** aucun terme de développeur n'y paraît (FR-117)

## ADDED Requirements

### Requirement: Un échec de dépôt est consigné pour l'exploitation

Chaque fois qu'une publication ou une relance échoue parce que le dépôt n'a pas abouti, le serveur SHALL
écrire dans les journaux de la plateforme, réservés à l'exploitation, une trace qui dit l'étape en cause —
dépôt des images, dépôt du contenu, relance — et la nature de l'échec — accès refusé, dépôt introuvable,
état périmé, dépôt injoignable, dépôt non configuré. Cette trace NE DOIT porter ni la clé d'écriture ni
aucune partie d'elle. Une publication qui aboutit n'écrit aucune trace d'échec.

#### Scenario: Un accès refusé pendant le dépôt du contenu est consigné
- **WHEN** une publication échoue parce que le dépôt refuse l'accès au moment de déposer le contenu
- **THEN** une trace est écrite dans les journaux de la plateforme
- **AND** elle dit l'étape du contenu et que l'accès a été refusé

#### Scenario: Un échec pendant le dépôt des images est consigné
- **WHEN** une publication échoue pendant le dépôt des images
- **THEN** une trace est écrite dans les journaux de la plateforme
- **AND** elle dit l'étape des images et la nature de l'échec

#### Scenario: Un dépôt non configuré est consigné
- **WHEN** l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et qu'une publication est confirmée
- **THEN** une trace est écrite dans les journaux de la plateforme
- **AND** elle dit que le dépôt n'est pas configuré

#### Scenario: Une relance qui échoue est consignée
- **WHEN** la relance d'une mise en ligne échoue parce que le dépôt n'a pas abouti
- **THEN** une trace est écrite dans les journaux de la plateforme
- **AND** elle dit l'étape de la relance et la nature de l'échec

#### Scenario: La trace ne porte pas la clé
- **WHEN** une trace d'échec de dépôt est écrite
- **THEN** la clé d'écriture n'y paraît pas, ni en entier ni en partie

#### Scenario: Une publication qui aboutit ne laisse aucune trace d'échec
- **WHEN** une publication aboutit
- **THEN** aucune trace d'échec de dépôt n'est écrite
