# ADR-0034 : Valeurs d'instance — quatre champs dans le fichier d'instance, le domaine servi en est dérivé, la base se rattache par son nom
Statut : Accepté | Date : 2026-11-18

Décision née en 2.x, pour le change `020-deploiement-instance-client`, avant ses tickets. Elle reprend
le candidat `valeurs-d-instance-dans-le-fichier-d-instance` dans une forme étendue, et remplace les
candidats `configurations-lisent-le-fichier-d-instance` et
`invariant-i10-restreint-a-la-configuration-astro`. L'[ADR-0005](./0005-configuration-d-instance-quatre-lieux.md)
n'est pas amendé. Les numéros cités sont des numéros 2.x.

## Contexte

`FR-104` veut une instance par site, « selon une configuration identique d'un client à l'autre », et
`FR-098` aucun identifiant de l'intégrateur dans la configuration du déploiement. L'ADR-0005 a réparti
la configuration d'une instance en quatre lieux : les liaisons de plateforme dans la configuration du
déploiement, les secrets dans le compte du client, l'adresse autorisée en base, et le reste dans un
fichier d'instance versionné, `instance.json`.

Trois choses restaient ouvertes le jour où une première instance doit être livrée.

1. **Ce que le fichier d'instance porte.** Le candidat qui le fondait ne nommait que le domaine et la
   clé publique Turnstile. Depuis, la clé Turnstile n'a plus de lecteur
   ([ADR-0028](./0028-anti-abus-compteur-de-frequence-en-d1-sans-turnstile.md)), et trois champs sont
   apparus sans que rien ne les couvre : l'adresse d'expéditeur, le dépôt de publication, l'identifiant
   du compte de la plateforme ([ADR-0033](./0033-remplacement-de-l-adresse-autorisee-par-l-api-des-adresses-de-destination.md)).
   Un champ inconnu y passe sans bruit : rien n'empêche d'y glisser un secret.
2. **Où vit le domaine servi.** L'outil de déploiement ne lit qu'une configuration statique. Le cycle
   1.x en avait conclu que la configuration du déploiement sortait de la portée du fichier d'instance,
   et attendait que le domaine et l'identifiant de la base y soient écrits « à la livraison réelle ».
   L'outillage de recette le fait : il réécrit les deux fichiers de déploiement du dépôt de recette.
   Trois fichiers diffèrent alors d'un dépôt à l'autre, et toute version du produit qui touche à un
   fichier de déploiement entre en conflit dans chaque dépôt de client.
3. **Où vit l'identifiant de la base.** Même question, même réponse attendue : dans les fichiers de
   déploiement de chaque client.

Deux faits changent la donne. La construction produit déjà une configuration de déploiement
**effective**, `dist/server/wrangler.json`, vers laquelle `.wrangler/deploy/config.json` renvoie : un
déploiement lancé à la racine emploie ce fichier produit, non les fichiers versionnés. Et l'outil de
déploiement retrouve une base **par son nom** quand aucun identifiant n'est écrit. Ce second fait a
été constaté le 2026-11-16 sur le compte de recette, avec `wrangler` 4.129.0 et les fichiers du produit
non modifiés (`openspec/changes/020-deploiement-instance-client/constats/01-base-rattachee-par-son-nom.md`) :
les 17 mises à niveau appliquées sur la base `colibri`, le déploiement rattaché à elle, le Worker qui y
écrit, aucune seconde base créée, deux bases du même nom refusées par le compte, et, sans base, un
échec qui la nomme sans rien créer.

## Décision

1. **Hors contenu, `instance.json` est le seul fichier versionné qui diffère d'une instance à l'autre.**
   Il porte quatre champs, dont aucun n'est un secret : le nom de domaine (`domain`), l'adresse
   d'expéditeur (`senderAddress`), le dépôt de publication (`depotDePublication`) et l'identifiant du
   compte de la plateforme (`compteCloudflare`). Les deux premiers sont exigés pour construire ; les
   deux autres peuvent manquer, et les gestes qui en dépendent se refusent alors d'eux-mêmes.
   `turnstilePublicKey` en sort.
2. **Le fichier d'instance n'admet que ces champs, bien formés.** La construction s'arrête, en nommant
   le champ, sur un champ inconnu ou mal formé.
3. **Le domaine servi est dérivé du fichier d'instance.** En fin de construction, un script complète la
   configuration de déploiement effective : il y pose le domaine de l'instance comme seule adresse
   servie, et ferme l'adresse par défaut de la plateforme et les adresses d'aperçu. Il n'ajoute ni ne
   retire aucune liaison.
4. **La base n'a d'identifiant nulle part.** Elle porte le même nom dans chaque compte, `colibri`,
   comme le Worker porte le même nom, `colibri-cms` : un compte ne porte qu'une instance. L'outil de
   déploiement la retrouve par ce nom, à la mise à niveau comme au déploiement.
5. **Les fichiers de déploiement versionnés restent ceux du produit, identiques partout.** Ils ne
   portent ni domaine, ni identifiant de compte, ni identifiant de base.
6. **Un seul module lit le fichier d'instance**, sous `src/platform/instance/`. La configuration Astro,
   le script de dérivation et le contrôle d'instance passent par lui.

## Conséquences

**Positives**

- Passer une instance à une nouvelle version ne touche aucun fichier propre au client hors
  `instance.json` et le contenu : `FR-105` devient un remplacement de fichiers, sans conflit.
- L'ADR-0005 tient tel quel : le rattachement de la base reste une liaison de la configuration du
  déploiement ; seule une valeur que le fichier d'instance portait déjà, le domaine, y est reportée.
- « Aucun secret n'a le droit d'entrer dans ce fichier », que l'ADR-0005 laissait à la recette, gagne
  une vérification mécanique partielle : un champ qui n'est pas l'un des quatre arrête la construction.
- Un identifiant de moins à inventorier à la livraison (`SC-013`).

**Négatives**

- **Le script de dérivation dépend de la forme d'un fichier produit par l'adaptateur.** Si
  `@astrojs/cloudflare` cesse d'écrire `dist/server/wrangler.json` ou d'y renvoyer, la dérivation doit
  échouer bruyamment, jamais passer en silence : un déploiement sans domaine ouvrirait l'adresse par
  défaut et ne servirait pas le site.
- **Le nom de la base devient une convention que rien dans le dépôt ne vérifie chez le client.** Une
  base créée sous un autre nom n'est pas trouvée, et la mise en ligne échoue en la nommant. Le geste
  qui la crée appartient à l'outil de livraison.
- **Le rattachement par le nom repose sur un comportement de l'outil de déploiement**, constaté sur
  une version, non garanti par un contrat. S'il change, l'identifiant devra entrer dans le fichier
  d'instance, par un nouvel ADR qui amendera l'ADR-0005.
- **Un fichier d'instance strict refuse ce qu'il tolérait.** Tout dépôt qui porte encore
  `turnstilePublicKey` cesse de se construire : le dépôt du produit et le dépôt de recette sont à
  mettre à jour par le ticket qui pose la règle. Aucune instance de client n'existe encore.
- **La configuration effective sert toujours un domaine**, y compris dans le dépôt du produit, où il
  est celui d'exemple. Personne ne la déploie ; l'outillage de recette pose ses valeurs par-dessus.

## Alternatives considérées

- **Écrire le domaine dans les fichiers de déploiement du dépôt de chaque client** — ce que le cycle
  1.x attendait et que la recette fait. Écartée : trois fichiers diffèrent par client au lieu d'un, et
  chaque version qui touche à un fichier de déploiement entre en conflit dans chaque dépôt.
- **Porter l'identifiant de la base dans `instance.json`** et le dériver comme le domaine. Écartée :
  inutile, l'outil retrouve la base par son nom ; elle aurait déplacé une liaison hors de la
  configuration du déploiement et amendé l'ADR-0005. Elle reste le repli nommé plus haut.
- **Les variables de construction de Workers Builds**, voie que l'ADR-0005 laissait « inexplorée ».
  Écartée : un cinquième lieu, saisi à la main dans un tableau de bord et invisible du dépôt, pour
  une valeur que le fichier d'instance porte déjà.
- **Faire lire `instance.json` par l'outil de déploiement lui-même** — la moitié inexécutable du
  candidat `configurations-lisent-le-fichier-d-instance`. Toujours impossible : il ne lit qu'une
  configuration statique. La dérivation en fin de construction obtient le même effet.

## Vérifiable ?

En partie. Deux invariants de `docs/architecture.md` en répondent. **`I8`**, promu : les valeurs
d'instance ne figurent que dans `instance.json`. **`I19`**, créé, qui remplace `I10` : `instance.json`
n'est lu que par le module de `src/platform/instance/`, et les fichiers de déploiement versionnés ne
portent ni domaine servi, ni identifiant de compte, ni identifiant de base. L'arrêt de la construction
sur un champ inconnu, et la forme de la configuration dérivée, se vérifient par les tests du change
020. Que la base soit trouvée par son nom dépend de la plateforme : constaté en recette, à refaire à
la répétition de l'épreuve de livraison.

Cette décision ne touche pas le modèle : aucun élément ni aucune relation ne naît, le module vit dans
`colibri-cms.worker.platform`. Pas de section Modèle, pas de vue.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite pendant la rédaction du change 020 ; le
  rattachement par le nom, relevé dans le code de l'outil par une relecture en contexte frais, puis
  constaté sur le compte de recette le 2026-11-16 à la demande de l'humain.
- Proposal (point 1), design (D3, D8) et cahier du constat :
  `openspec/changes/020-deploiement-instance-client/`.
