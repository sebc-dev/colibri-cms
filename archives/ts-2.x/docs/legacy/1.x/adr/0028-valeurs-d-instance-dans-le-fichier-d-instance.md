# ADR-0028 : Les valeurs d'instance qui vivent dans les fichiers ne figurent que dans `instance.json`
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/archi.md](../archi.md) — invariant `I8`

## Contexte

[ADR-0020](./0020-configuration-d-instance-quatre-lieux.md) a retenu **quatre lieux, un par
nature de valeur**, dont un **fichier d'instance unique et versionné** pour tout ce que les
trois autres ne portent pas. Il laissait une réserve explicite : « nom, format et mécanisme de
lecture du fichier ne sont pas tranchés ici ».

La Stack avait par ailleurs déposé la forme vérifiable de `SC-008` : « hors le fichier
d'instance et le contenu, deux instances ont le même dépôt ». Sans elle, la divergence ne se
découvre qu'à une montée de version, **en production**.

Cet invariant rend le **nom et le format** ; le mécanisme de lecture est rendu par
[ADR-0030](./0030-configurations-lisent-le-fichier-d-instance.md). Les deux se complètent sans
se recouvrir : celui-ci interdit qu'une valeur **logée dans le fichier** vive ailleurs, l'autre
impose que les configurations aillent l'y chercher.

**Caractéristique architecturale servie** : `C4` — uniformité de la flotte.
**Exigences servies** : `FR-104`, `FR-105`, `SC-008`.

**Trace observable** : l'**occurrence du domaine ou de la clé publique Turnstile**, hors
d'`instance.json`.

## Décision

Les valeurs propres à une instance qui vivent dans les fichiers — **le domaine**, **la clé
publique Turnstile**, et tout ce que la ligne « Configuration d'instance » de `docs/stack.md`
n'affecte pas à l'un des trois autres lieux — **ne figureront que dans le fichier d'instance
`instance.json`, à la racine du dépôt** ; **aucun autre fichier versionné hors contenu ne les
portera**.

Les **trois autres lieux gardent les leurs** : rattachement D1 et destination d'acheminement
dans la configuration du déploiement, clé de vérification Turnstile dans le compte Cloudflare,
adresse autorisée en D1.

## Conséquences

**Positives.**

- **`SC-008` devient un diff** au lieu d'une intention : hors le fichier d'instance et le
  contenu, deux dépôts de clientes doivent être identiques.
- La montée de version cesse d'être un risque silencieux : une valeur qui a fui dans un fichier
  du produit se voit **avant** le déploiement.
- Un clone nu trouve dans les fichiers le domaine et la clé publique dont il a besoin, donc `C6`
  du [socle de livraison](../socle-de-livraison.md) tient.

**Négatives — ce à quoi le code s'engage.**

- **La trace observable est nominative.** Elle porte sur le domaine et la clé publique
  Turnstile ; une **septième valeur d'instance** ajoutée plus tard ne serait pas couverte tant
  que cet invariant n'est pas remplacé.
- **`instance.json` est un nom en dur.** Le renommer casse le contrôle et demande un ADR de
  remplacement — c'est le prix de la falsifiabilité.
- **L'interdit « aucun secret n'entre dans ce fichier » reste hors périmètre.** Reconnaître un
  secret est sémantique : cet invariant tient *quelles valeurs y vivent*, jamais la **nature**
  de ce qui y entrerait. La contrainte reste écrite dans
  [ADR-0020](./0020-configuration-d-instance-quatre-lieux.md), et rien ne la vérifie.
- **Le format est figé avec le nom** : il doit rester lisible par la configuration Astro **et**
  par celle du Worker, sans outil intermédiaire.

## Alternatives considérées

- **Répartir chaque valeur là où son outil l'attend** : écartée en
  [ADR-0020](./0020-configuration-d-instance-quatre-lieux.md) — c'est la pente naturelle des
  outils, et elle ne laisse aucune frontière vérifiable entre les fichiers du produit et ceux de
  la cliente.
- **Formuler l'invariant comme « aucun secret n'entre dans le fichier d'instance »** : écartée
  faute de trace observable. Reconnaître un secret relève du jugement, pas d'une occurrence dans
  un fichier ; l'invariant retient le versant qui se lit.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi, qui referme la
  réserve déposée par la Stack. Revue humaine : 2026-08-13.
