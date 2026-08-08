# ADR-0011 : Maintien de la flotte — CMS publié en paquet versionné, dépôt d'instance mince
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le modèle est « un déploiement = un site = un client » : la mutualisation est `EXCLU` du
Brief. Chaque cliente a donc son compte, son dépôt et ses deux Workers. La question n'est
pas comment livrer **une** instance, mais comment en faire monter **toute une flotte** en
version.

`FR-086` est catégorique : le déploiement d'une nouvelle version sur une instance
existante **ne doit exiger aucun code propre à cette instance**. `SC-008` en fait une
épreuve exécutée sur une instance portant du contenu réel, et `US13` ajoute que le contenu
saisi avant le déploiement doit être retrouvé.

Or `ADR-0001` a fait du dépôt de la cliente le magasin de son contenu. Ce dépôt porte donc
déjà quelque chose qui lui appartient en propre et qu'aucune montée de version ne doit
toucher. S'il portait **aussi** le code du CMS, monter de version reviendrait à faire
converger deux histoires Git divergentes — et la divergence commence à la première
personnalisation.

Exigences concernées : `FR-082`, `FR-083`, `FR-085`, `FR-086`, `FR-090`, `FR-094`,
`SC-008`, `SC-018` · `US13`.

## Décision

Nous publierons ColibriCMS sous forme de **paquet versionné**, et le dépôt de chaque
instance sera **mince** : il ne portera que ce qui appartient à la cliente — contenu,
médias, gabarits, configuration — et **aucun code du produit**.

Monter une instance de version sera **changer un numéro de version** dans sa configuration
et redéployer. Rien d'autre.

Toute personnalisation d'une instance devra s'exprimer en configuration ou en gabarit ;
aucune ne s'exprimera en code propre à cette instance.

## Conséquences

**Positives**

- `FR-086` est vrai par construction : il n'existe pas de code propre au client, donc il
  n'y a rien à concilier.
- `SC-008` devient une épreuve simple à jouer : changer un numéro, redéployer, vérifier
  que le contenu est retrouvé.
- Le dépôt d'instance reste lisible pour ce qu'il est — le contenu de la cliente — ce qui
  sert directement `SC-011` : le développeur tiers n'a pas à démêler le contenu du code.
- Un correctif de sécurité se propage à la flotte par un changement de numéro, sans
  travail de fusion instance par instance.

**Négatives — ce que ce choix coûte**

- **Le produit dépend d'un registre de paquets**, c'est-à-dire d'un objet qui n'est ni
  dans le compte Cloudflare, ni dans le dépôt de la cliente. `I3` s'entend « sans accès
  Cloudflare », pas « sans registre » : c'est une extension assumée de la lecture de
  l'invariant, et elle doit être connue comme telle.
- **Toute la charge d'adaptation retombe sur la configuration et les gabarits.** Un besoin
  client que la configuration n'exprime pas n'a aucun exutoire local : il faut le porter
  dans le produit, pour toute la flotte, ou le refuser. C'est un choix qui rigidifie
  volontairement.
- **Un défaut dans une version se propage à chaque instance qui monte.** Le pendant du
  correctif qui se propage sans effort.
- **Le numéro de version de chaque instance doit être suivi quelque part** — dossier
  d'instance (`FR-090`) — sinon la flotte devient un ensemble d'états inconnus, et l'on
  perd précisément ce que ce choix devait acheter.
- L'aller-retour de gabarit (`FR-082`, `FR-083`, `SC-018`) devient un cas de montée de
  version à part entière : un emplacement retiré par une version et rétabli par une autre
  doit retrouver son contenu à l'identique.

## Alternatives considérées

- **Le dépôt-gabarit forké, monté par fusion amont** : écartée parce qu'elle produit des
  conflits à résoudre client par client **dès la première personnalisation** —
  c'est-à-dire précisément le code divergent que `FR-086` et le Brief interdisent. Ce qui
  est présenté comme une facilité de démarrage devient une dette proportionnelle à la
  taille de la flotte.
- **Le code du CMS copié dans le dépôt de chaque instance, sans fusion amont** : écartée
  parce qu'elle rend toute montée de version manuelle et non vérifiable, et parce qu'elle
  mêle dans un même dépôt le contenu de la cliente et le code du produit, ce qui
  compromet la lisibilité dont `SC-011` dépend.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 11 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
