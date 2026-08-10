# API GitHub : peut-on écrire N fichiers en une requête, avec un verrou optimiste sur l'état de la branche ?

*Relevé de faits — documentation GitHub — à jour au 10 août 2026.*
*Ce document est un **lookup archivé sur demande**, pas une recherche approfondie : il répond à une
question factuelle posée en phase Stack, il ne compare aucune option et il n'arbitre rien. Les
alternatives (GitLab, API REST Git Data) n'ont pas été instruites. Aucune de ses affirmations ne
descend telle quelle dans un ADR sans que ses deux réserves l'accompagnent.*

---

## TL;DR

- **Oui pour l'écriture groupée.** La mutation GraphQL `createCommitOnBranch` ajoute, modifie et
  supprime plusieurs fichiers en **un seul appel**, sans construction manuelle de blobs ni d'arbres.
- **Oui pour le verrou optimiste, et il est obligatoire.** Le champ `expectedHeadOid` est de type
  `GitObjectID!` — non-null. On ne peut pas écrire sans déclarer l'état attendu de la branche.
- **Le conflit est un rejet global**, sans écriture partielle : type d'erreur `STALE_DATA`, sous
  HTTP 200. Observé sur une sortie réelle, **non documenté officiellement**.
- **Le binaire est supporté** (`contents` en base64 RFC 4648), et les commits ainsi créés sont
  **signés automatiquement** et marqués vérifiés.
- **Deux inconnues qui ne se combleront pas** : le mot « atomique » n'est écrit nulle part par
  GitHub, et **aucune limite de taille de requête ni de nombre de fichiers n'est publiée** — c'est
  un silence délibéré de l'éditeur.

---

## Ce qui est établi

**1. Une requête, N fichiers.** `officiel` · confiance élevée.

> « you do not need to manually create blobs and trees before creating the commit. This allows you
> to add, update, or delete multiple files in a single API call. »
> — [GitHub Changelog, 13 septembre 2021](https://github.blog/changelog/2021-09-13-a-simpler-api-for-authoring-commits/)

**2. Le verrou optimiste est obligatoire.** `officiel` · confiance élevée.

> « **expectedHeadOid** (`GitObjectID!`) : The git commit oid expected at the head of the branch
> prior to the commit. »
> — [GitHub Docs, GraphQL reference › Commits](https://docs.github.com/en/graphql/reference/commits)

Le `!` du type porte l'essentiel : le champ est **non-null**, donc l'appelant ne peut pas écrire
« à l'aveugle ». Ce n'est pas une option de sécurité qu'on pense à activer, c'est la seule façon
d'appeler la mutation.

La même page décrit la mutation :

> « Appends a commit to the given branch as the authenticated user. This mutation creates a commit
> whose parent is the HEAD of the provided branch and also updates that branch to point to the new
> commit. »

**3. Comportement en cas de conflit : rejet global.** `tiers` · `mesuré` · confiance moyenne.

Sortie réelle obtenue en passant délibérément `git rev-parse HEAD~` comme `expectedHeadOid` :

> HTTP 200 · type d'erreur `STALE_DATA`
> « Expected branch to point to "f786b7e2e0ec290972a2ada6858217ba16305933" but it did not. Pull and
> try again. »
> — [Gist brasic — createCommitOnBranch error example](https://gist.github.com/brasic/964dfc371d524a09d602745ae3b238ff)

⚠ **Aucune page GitHub officielle ne documente ce code d'erreur ni ce message.** À traiter comme
un comportement observé, jamais comme un contrat d'API. Un test d'intégration qui filtrerait sur la
chaîne `STALE_DATA` s'appuierait sur un détail non publié.

**4. Contenu binaire supporté.** `officiel` · confiance moyenne-élevée.

> « The encoded contents may be binary. […] no charset transcoding or line-ending normalization will
> be performed »
> — [GitHub Docs, GraphQL reference › Input objects](https://docs.github.com/en/graphql/reference/input-objects), objet `FileAddition`

Les contenus sont transmis en base64 conforme RFC 4648, padding exigé.

⚠ Passage restitué **via l'index de recherche** : deux tentatives de lecture directe de la page
`input-objects` ont renvoyé l'index de la référence, pas les définitions. Établi comme officiel,
**non relu à la source**. À revérifier avant qu'il ne fonde une décision.

**5. Signature automatique des commits.** `officiel` · confiance élevée.

> « Commits authored using the new API are automatically GPG signed and are marked as verified in
> the GitHub UI. »
> — [GitHub Changelog, 13 septembre 2021](https://github.blog/changelog/2021-09-13-a-simpler-api-for-authoring-commits/)

À ne pas confondre : ce mécanisme signe les commits **de contenu** écrits par la mutation. Il ne dit
rien de la signature des commits de code du dépôt de ColibriCMS.

---

## Ce qui n'est pas établi

**A. Le mot « atomique » n'est pas de GitHub.** Ce qui est publié, c'est « un seul appel » (fait 1)
et un rejet global sur OID périmé (fait 3). L'atomicité s'en **déduit** — un commit git est un
déplacement de référence, il aboutit ou non — mais GitHub ne l'écrit pas. La distinction compte :
une déduction raisonnable et une garantie contractuelle ne se citent pas de la même façon dans un
document immuable.

**B. Aucune limite de taille de requête n'est publiée.** La page officielle des limites GraphQL
n'énonce qu'un plafond de nœuds et un délai de traitement :

> « Individual calls cannot request more than 500,000 total nodes. »
> — [GitHub Docs, Rate limits and query limits for the GraphQL API](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)

Et l'éditeur assume de ne pas publier le reste :

> « While we can't share all specifics to preserve the integrity of our platform, note that these
> limits are different from rate limiters. »
> — [GitHub Changelog, 1ᵉʳ septembre 2025 — GraphQL API resource limits](https://github.blog/changelog/2025-09-01-graphql-api-resource-limits/)

**C'est un silence délibéré, pas un trou de recherche** : une seconde requête ne le comblera pas.

**C. Aucun plafond documenté sur le nombre de fichiers d'un même commit.**

**D. La limite de 100 Mo par fichier** relève des limites générales de dépôt, pas de cette mutation.
Non vérifiée à la source dans ce relevé.

---

## Ce que ça acte pour ColibriCMS

Ce relevé **ne tranche aucun domaine de la Stack**. Il ferme une inconnue et en déplace d'autres.

### Ce que ça ferme

- **La condition dure de l'option A du domaine 1** — « l'espace de fichiers est le magasin de l'état
  publié » — exigeait qu'une publication touchant N objets s'écrive en un geste indivisible. Sur une
  forge GitHub, cette écriture existe, avec son verrou. Le principal coût opposé à cette option
  n'est plus un pari technique. Il reste son autre coût, intact : **deux sources de lecture** pour
  un même moteur de rendu (fichiers pour le publié, magasin de brouillon pour l'aperçu `FR-081`).

- **Le cas limite « une publication est déclenchée alors qu'une précédente n'est pas terminée »**
  (PRD, § Cas limites) trouve un moyen. Le PRD renvoyait explicitement la sérialisation à la phase
  Stack ; le verrou obligatoire la fournit **mécaniquement et gratuitement** : la seconde publication
  est rejetée, elle n'écrase pas la première. C'est un candidat de réponse, à confirmer quand le
  domaine 12 sera tranché.

- **`FR-091`** (« Lorsqu'une publication n'aboutit pas, le site public DOIT rester dans son dernier
  état publié ») est satisfait **par construction** sur ce chemin, le rejet étant global — et non par
  du code de compensation qu'aucun test n'exercerait.

### Ce que ça déplace

- **Le sort de `FR-091` est couplé au domaine 3 (où vivent les médias).** La propriété ci-dessus ne
  tient que si **le contenu et les médias partent par le même geste**. Si les médias vivent dans un
  stockage objet distinct, la publication redevient deux écrits vers deux systèmes, et `FR-091`
  redevient du code à écrire et à maintenir. Ce relevé **renforce donc le couplage** « médias dans le
  dépôt » — sans le trancher : le lookup R2 reste à jouer, et `I5` prime sur cet argument.

- **La forge n'est pas tranchée pour autant.** Ce relevé porte sur GitHub seul. GitLab n'a pas été
  instruit, et le domaine 12 ne peut pas se clore sur une source unique.

- **Le risque dominant reste ailleurs** : l'expiration du jeton d'écriture (`I4`, `I6`, `SC-013`).
  Une écriture atomique parfaite ne sert à rien si le jeton qui la porte expire au bout d'un an sur
  un compte que la cliente n'est jamais censée visiter (`SC-006`). Lookup à jouer.

### Réserves à reporter partout où ce fait descend

1. **« Atomique » est une déduction, pas une citation.** Tout ADR qui s'appuie sur cette propriété
   l'écrit comme telle.
2. **La taille maximale d'une publication ne se déduira que d'une mesure.** GitHub ne publie ni
   limite de corps de requête, ni plafond de fichiers par commit. Cette réserve est de même nature
   que la réserve 3 de l'annexe A du socle de livraison — « à mesurer sur le premier déploiement
   réel » — et devrait la rejoindre. *Le socle de livraison n'a pas été modifié : c'est un arbitrage
   humain.*

---

## Sources

| Source | Type | Ce qu'elle porte |
|---|---|---|
| [GitHub Changelog — A simpler API for authoring commits](https://github.blog/changelog/2021-09-13-a-simpler-api-for-authoring-commits/) | officiel | Écriture groupée en un appel · signature automatique |
| [GitHub Docs — GraphQL reference › Commits](https://docs.github.com/en/graphql/reference/commits) | officiel | Définition de la mutation · `expectedHeadOid (GitObjectID!)` |
| [GitHub Docs — GraphQL reference › Input objects](https://docs.github.com/en/graphql/reference/input-objects) | officiel | `FileAddition` · base64 RFC 4648 · binaire — *non relu à la source* |
| [GitHub Docs — Rate limits and query limits for the GraphQL API](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api) | officiel | Plafond de nœuds · absence de limite de taille |
| [GitHub Changelog — GraphQL API resource limits](https://github.blog/changelog/2025-09-01-graphql-api-resource-limits/) | officiel | Non-publication assumée des limites |
| [Gist brasic — createCommitOnBranch error example](https://gist.github.com/brasic/964dfc371d524a09d602745ae3b238ff) | tiers · mesuré | Sortie réelle du conflit `STALE_DATA` |

**Murs rencontrés** : aucun. Toutes les pages consultées sont publiques, sans connexion ni CAPTCHA.
