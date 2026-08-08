# ADR-0001 : Le dépôt de la cliente porte l'état publié ; la base ne porte que le brouillon
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le produit promet que le contenu de la cliente lui reste, en clair, sans ColibriCMS —
c'est l'invariant `I2` du socle de livraison (`docs/socle-de-livraison.md`) et la matière
de `SC-011`. Il promet aussi qu'un site publié se reconstruit sans aucun accès Cloudflare
(`I3`, `FR-043`) et qu'une erreur d'édition se rattrape en revenant à la dernière version
publiée (`FR-035`, `SC-009`).

La contrainte `C1` du socle de livraison, écrite le 5 août 2026, formulait la réponse
ainsi : « à la publication, le CMS écrit le contenu dans D1 **et** le commite en fichiers
plats ». Deux exemplaires du même état, donc deux façons pour lui de diverger. La
publication n'est pas transactionnelle de bout en bout : entre l'écriture en base et le
commit, il existe une fenêtre où l'un a réussi et l'autre non. Réconcilier cette fenêtre
demande du code qui ne s'exécute que dans un cas d'échec — c'est-à-dire du code qu'aucun
usage normal n'éprouve, dans un produit dont le Brief pose que « le code entrant n'est pas
relu ligne à ligne ».

Exigences concernées : `FR-029` (brouillon unique), `FR-035`, `FR-036`, `FR-037`,
`FR-040`, `FR-080`, `SC-009`, `SC-011`, `SC-012` · invariants `I2`, `I3`.

## Décision

Nous ferons du dépôt Git de la cliente le **magasin unique de l'état publié**. Le contenu
publié, les médias publiés et leur inventaire n'existeront qu'en fichiers plats dans ce
dépôt.

Nous cantonnerons Cloudflare D1 à ce qui n'est pas publié : le brouillon unique
(`FR-029`), la médiathèque de travail, et les demandes de devis reçues (`FR-066`,
`FR-080`). **D1 ne portera jamais l'état publié**, pas même en copie de lecture.

Publier sera donc écrire un commit, et ce commit sera le seul déclencheur de la
reconstruction du site public (`FR-040`).

## Conséquences

**Positives**

- `I2`, `I3` et `SC-009` deviennent vrais par construction : il n'existe pas de second
  exemplaire de l'état publié, donc aucune divergence n'est possible et aucun code de
  réconciliation n'a de raison d'exister.
- La copie portable et la mise en ligne sont le même geste : l'export ne peut jamais être
  périmé, ce qui est exactement ce que `C2` du socle de livraison exigeait.
- `FR-035` (abandonner le brouillon) se ramène à relire le dépôt : il n'y a rien à
  « restaurer », seulement une source de vérité à relire.
- `FR-036` est acquis sans effort : le produit n'expose que ce qu'il relit, c'est-à-dire
  la dernière version publiée.

**Négatives — ce que ce choix coûte**

- **Toute lecture de l'état publié devient un appel réseau à la forge.** Le contrôle
  « cette image est-elle utilisée par la dernière version publiée ? » (`FR-024`) n'est
  plus une jointure en base mais une lecture distante. Le CMS s'engage à un cache local
  explicite, invalidé à chaque publication — ou à payer cette latence à chaque écran.
- **La disponibilité de la forge conditionne la publication.** Le site en ligne continue
  d'être servi, mais publier échoue tant que la forge est indisponible.
- **Le dépôt ne maigrit jamais.** Un contenu ou un média supprimé quitte l'arbre de
  travail et demeure dans l'historique. La taille du dépôt croît de façon monotone.
- **`C1` du socle de livraison devient faux** et doit être amendé hors de cet ADR : la
  double écriture qu'il prescrit est précisément ce que la présente décision supprime.
- Une publication interrompue ne laisse aucun état intermédiaire visible, mais elle doit
  être rejouée entièrement : il n'existe pas de reprise partielle.

## Alternatives considérées

- **D1 porte l'état publié, le dépôt en est une copie déposée** (la formulation d'origine
  de `C1`) : écartée parce que la double écriture ouvre une fenêtre où `I2` est faux si le
  commit échoue après le succès en base — une fenêtre qu'il faudrait réconcilier par du
  code que rien n'éprouve tant qu'il ne casse pas.
- **D1 porte un cache en lecture seule de l'état publié**, alimenté après chaque commit
  réussi : écartée pour la même raison sous une forme atténuée — un cache qui peut être
  périmé est un second exemplaire, et le produit n'a aucun moyen de détecter qu'il l'est
  sans relire la source qu'il prétendait éviter de lire.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 1 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
