# ADR-0020 : Configuration d'instance — quatre lieux, un par nature de valeur, et un fichier d'instance unique pour le reste
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/stack.md](../stack.md) — candidat n° 20, ligne « Configuration d'instance »

## Contexte

`FR-104` fait déployer le produit à raison d'**une instance par site**, et le §3 du
[socle de livraison](../socle-de-livraison.md) met le **code** autant que le contenu dans le
dépôt de chaque cliente. Monter une version est donc une **fusion dans son dépôt** — et
`FR-105` / `SC-008` exigent que cette montée se fasse « sans modification de code spécifique à
ce client ».

**Six valeurs distinguent une instance d'une autre** : le domaine, l'identifiant de la base D1,
l'adresse autorisée, la destination d'acheminement vérifiée, la clé de **vérification**
Turnstile et la clé **publique** Turnstile. Si elles sont éparpillées dans les fichiers du
produit, `SC-008` tombe à la deuxième instance.

La contrainte qui décide du quatrième lieu est `C6` du socle de livraison — le mode de build
« depuis les fichiers plats », sans D1 et sans accès Cloudflare : un clone nu a besoin du
**domaine** pour ses URL canoniques et son sitemap, et de la clé **publique** Turnstile pour le
widget que porte toute page à formulaire (`FR-062`).

## Décision

Nous rangerons les valeurs d'instance en **quatre lieux, un par nature de valeur**.

**Trois sont imposés et n'ont pas été arbitrés :**

1. les **liaisons de plateforme** — rattachement D1, `send_email`, Durable Object, Cron — dans
   la **configuration du déploiement**, par amorçage : un rattachement ne peut pas vivre dans la
   base qu'il ouvre ;
2. les **secrets** dans le **compte Cloudflare de la cliente**, comme la clé de vérification
   Turnstile ;
3. l'**adresse autorisée** en **D1**, parce que son remplacement est aujourd'hui impossible à
   honorer et que les seules issues futures passent par un geste depuis l'administration — la
   figer en configuration de déploiement fermerait cette porte définitivement.

**Le quatrième est le seul choix rendu :** tout le reste — **domaine et clé publique Turnstile
compris** — dans un **fichier d'instance unique et versionné**, hors du code, qu'aucune montée
de version ne touche.

## Conséquences

**Positives.**

- **`SC-008` cesse d'être une intention et devient un diff** : hors le fichier d'instance et le
  contenu, deux dépôts de clientes doivent être identiques. C'est ce que l'invariant `I8` de
  [`docs/archi.md`](../archi.md) rend falsifiable, et
  [ADR-0028](./0028-valeurs-d-instance-dans-le-fichier-d-instance.md) le fige.
- Un clone nu bâtit les pages à formulaire et leurs URL canoniques sans D1 ni accès Cloudflare,
  donc `C6` tient.
- Aucun cinquième lieu n'est ouvert : les trois lieux imposés gardent exactement ce qu'ils
  portaient.

**Négatives — ce à quoi le code s'engage.**

- **Aucun secret n'a le droit d'entrer dans ce fichier**, le dépôt étant ouvert à l'intégrateur
  comme collaborateur. C'est une contrainte **écrite**, et non espérée — mais **reconnaître un
  secret est sémantique** : aucun contrôle ne peut la tenir en entier. L'invariant `I8` ne tient
  que le versant vérifiable — *quelles valeurs y vivent* —, jamais la nature de ce qui y
  entrerait.
- **Quatre lieux sont quatre endroits à inventorier à la recette**, et la contrainte `C7` du
  socle de livraison le fait déjà pour les liaisons du déploiement.
- **L'injection par variables de build de Workers Builds n'a pas été instruite**, faute d'un
  fait de plateforme constaté : cette voie reste inexplorée, et non écartée.
- Le nom, le format et le mécanisme de lecture du fichier ne sont pas décidés ici — ils l'ont
  été par [`docs/archi.md`](../archi.md), et sont figés par
  [ADR-0028](./0028-valeurs-d-instance-dans-le-fichier-d-instance.md) et
  [ADR-0030](./0030-configurations-lisent-le-fichier-d-instance.md).

## Alternatives considérées

- **Répartir chaque valeur là où son outil l'attend** — le domaine dans la configuration Astro,
  le rattachement D1 dans celle du Worker : écartée. C'est la **pente naturelle des outils**, et
  c'est précisément ce qui ne laisse **aucune frontière vérifiable** entre les fichiers du
  produit et ceux de la cliente : la divergence ne se découvrirait qu'à une montée de version,
  en production.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, complétée le
  2026-08-13 par l'audit de la stack (lieu de la clé publique Turnstile). Revue humaine :
  2026-08-13.
