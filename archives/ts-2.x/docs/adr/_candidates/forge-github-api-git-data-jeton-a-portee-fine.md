# Candidat ADR : Forge et écriture de la publication — GitHub, API REST *git data*, avance rapide obligatoire, jeton à portée fine à une seule permission
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md` (ADR-0005 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — le numéro 2.x est attribué à la promotion, un geste humain dans `docs/adr/`.


## Contexte

La publication écrit le contenu dans le dépôt de la cliente. Trois contraintes décident de la
voie d'écriture :

- `FR-091` redoute qu'une publication en écrase une autre : il faut un refus, pas un écrasement ;
- `FR-086` et `FR-089` font du dépôt du contenu publié le geste et le déclencheur ;
- un Worker Cloudflare **n'a ni sous-processus ni système de fichiers** : il ne peut pas
  lancer `git`. Tout effet passe par une liaison ou par le réseau.

S'y ajoute `FR-101` — une publication doit aboutir après retrait de tous les accès de
l'intégrateur — et `SC-006`, qui interdit d'envoyer la cliente visiter des comptes tiers.

Les faits qui portent la décision sont datés et portent chacun leur niveau de preuve. Relevés
versés :
[`docs/legacy/research/2026-08-12-permissions-rest-git-data.md`](../../legacy/research/2026-08-12-permissions-rest-git-data.md)
et
[`docs/legacy/research/2026-08-11-sous-requetes-publication.md`](../../legacy/research/2026-08-11-sous-requetes-publication.md)
(mesures du 2026-08-11 sur dépôt jetable, avec témoin) ;
[`docs/legacy/research/2026-08-12-jeton-github-desuetude.md`](../../legacy/research/2026-08-12-jeton-github-desuetude.md)
pour la désuétude.

Trois d'entre eux sont décisifs :

- `POST /git/blobs`, `/git/trees` et `/git/commits` n'exigent que **`Contents: write`**
  [officiel · cité] ;
- le **déplacement de ref** a **deux** jeux de permissions suffisants — `Contents: write`,
  **ou** `Contents: write` + `Workflows: write` [officiel · cité] ; lecture non citée : le
  second se lève quand le commit visé touche `.github/workflows/` ;
- un jeton **à portée fine** est « **revoked automatically** if pushed to a public repository
  or gist, or **if unused for one year** » [officiel · cité, docs GitHub · *GitHub credential
  types reference*].

## Décision

Nous utiliserons **GitHub** comme forge, et l'**API REST *git data*** pour écrire la
publication :

- le **contenu textuel est inliné** dans les entrées de `POST /git/trees` — il ne coûte aucun
  appel dédié ;
- les **médias sont déposés par `POST /git/blobs` en base64** — un appel chacun, non
  mutualisable, le contenu inliné étant de l'UTF-8 où un binaire est corrompu en silence ;
- puis `POST /git/commits` et `PATCH /git/refs` en **`force: false`**, avance rapide
  obligatoire — **sauf l'élagage de `media`**, seul geste non-avance-rapide, exécuté sous le
  verrou et calculé depuis D1.

Le jeton sera **à portée fine**, sur le **dépôt unique** de la cliente, **sans expiration**, et
portera la permission **`Contents: Read and write` seule**.

Nous le maintiendrons en vie par un **Cron Trigger dans le compte de la cliente**, faisant un
appel anodin **hebdomadaire**.

## Conséquences

**Positives.**

- `PATCH /git/refs` en `force: false` **refuse** un déplacement qui n'est pas en avance rapide
  — mesuré : `422 Update is not a fast forward` sur un commit bâti sur un parent périmé. C'est
  exactement la situation que `FR-091` redoute, et le refus en est la démonstration.
- Le contenu textuel inliné rend la chaîne **constante à 4 appels quel que soit le nombre de
  fichiers texte** — mesuré jusqu'à 1 000 entrées en une requête. Un blob par fichier coûtait
  `N + 4`, soit les 50 sous-requêtes franchies au 47ᵉ fichier.
- Le jeton vit dans le compte de la cliente : l'invariant `I6` et la contrainte `C10` du
  [socle de livraison](../../legacy/socle-de-livraison.md) tiennent, et `FR-101` avec eux.
- La cadence hebdomadaire **est** la parade : le Cron du palier gratuit n'a pas de retry, un
  appel sauté n'est jamais réémis, et 52 passages par an laissent la marge que la fenêtre
  glissante d'un an absorbe.

**Négatives — ce à quoi le code s'engage.**

- **La publication n'écrit jamais sous `.github/`.** C'est la condition sous laquelle
  l'argument « une seule permission » est vrai. Si elle tombe, le jeton se fait refuser au
  **dernier** geste de la publication — celui qui rend le contenu visible — et **rien dans le
  code ne relierait la panne à cette décision**. La contrainte est rendue falsifiable par
  l'invariant `I9` de [`docs/archi.md`](../../legacy/1.x/archi.md).
- **Le jeton est permanent, sans rotation et sans détection de compromission**, sur un dépôt
  qui **est** le site publié. La révocation à un an était une sécurité **passive** — un jeton
  oublié meurt — et le Cron la neutralise sciemment. La rotation n'a **aucun porteur
  possible** : l'invariant `I6` du socle de livraison a fait partir l'intégrateur, et `SC-006`
  interdit d'envoyer la cliente sur GitHub. Sans keep-alive, c'est `FR-101` qui tombe à un an.
- **Le Cron de maintien en vie n'est pas observable.** S'il cesse de tourner, rien ne le
  signale : la panne ne se manifeste que par une publication qui échoue, **jusqu'à un an plus
  tard**, ce que `FR-101` interdit. Aucune exigence ne porte ce constat — dette au dossier de
  `/scd-sdd:premortem socle`.
- **Le budget de sous-requêtes borne les médias à 42 par publication.** Le budget est de
  `M + 4` appels pour `M` médias ; un réessai coûte 4 appels de plus sans recréer les blobs,
  d'où `M + 8 ≤ 50`. Les fichiers texte, eux, ne sont pas contraints.
- **Le réessai est obligatoire.** La lecture du HEAD n'est pas fiablement *read-your-writes* :
  sur dix publications enchaînées, **deux** `PATCH` ont été rejetés en `422` alors que rien
  d'autre n'écrivait sur la branche, et les deux voies de lecture se sont montrées en retard
  tour à tour.
- **Un fait décisif restera sans trace.** La double permission exigée par les mutations GraphQL
  est `[mesuré · trace non versée]` et le restera : GitHub ne publie aucune table de
  permissions GraphQL, et rejouer la mesure supposerait de recréer à la main des jetons à
  portée fine. C'est le **seul motif écrit** de l'écartement de GraphQL, et sa *nécessité* est
  obtenue par différence — un seul facteur ayant changé entre les deux jetons — non par une
  phrase de GitHub.

## Alternatives considérées

- **GraphQL `updateRefs` / `createCommitOnBranch` avec `beforeOid` et `force: true`** : écartée
  car elle exige en plus **`Workflows: write`** — mesuré par différence : `Contents` seul →
  `FORBIDDEN` ; `Contents` + `Workflows` → commit créé. C'est-à-dire le droit de réécrire le
  pipeline qui bâtit le site, accordé à un jeton qui vit dans un Worker exposé à l'internet.
  Ses deux avantages ne coûtent rien à la voie retenue : l'atomicité multi-refs n'était pas
  atteignable — la publication est une séquence en deux temps — et le seul geste
  non-avance-rapide se déroule sous le verrou. **L'écartement n'est pas entamé par la
  contrainte `.github/`** : GraphQL exige `Workflows` **toujours**, y compris sur un dépôt sans
  workflows, quand REST ne l'exige que **sous condition**.
- **`git push --force-with-lease`** : écartée car un Worker n'a ni sous-processus ni système de
  fichiers. Le contrôle serait pourtant le même, avec la même permission (mesuré : oid attendu
  faux → `stale info`).
- **GitLab** : écartée car aucun des faits sourcés ne porte sur lui.
- **La branche GitHub App** : non instruite. Le jeton d'installation expire en une heure
  (documenté), mais que la clé privée n'expire jamais n'est écrit sur aucune page lue, et la
  propriété d'une App installée sur un compte de particulier n'a pas été établie. Sans objet
  tant que la voie retenue tient.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack sur mesures du
  2026-08-11 et données officielles du 2026-08-12, complétée par les traitements de `S-10` et
  `S-18`. Revue humaine : 2026-08-13.
