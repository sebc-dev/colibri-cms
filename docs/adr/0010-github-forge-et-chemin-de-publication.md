# ADR-0010 : GitHub comme forge et comme chemin de publication
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

`ADR-0001` fait du dépôt Git de la cliente le magasin unique de l'état publié. La forge
cesse donc d'être un simple hébergeur de code : elle devient **le chemin critique de la
publication** et le lieu où vit la matière de `SC-011`. Le socle de livraison le note déjà
— c'est « le seul objet de la chaîne qui vit hors du compte Cloudflare, et donc le seul
endroit où la propriété peut silencieusement basculer du mauvais côté » (§3).

Deux épreuves pèsent sur ce choix, et elles ne se jouent pas sur les mêmes qualités.
`SC-011` demande qu'un développeur tiers reconstruise le site à partir des seuls fichiers.
`SC-014` demande davantage : qu'un prestataire tiers redéploie et publie **sans poser
aucune question à Isometria** (`US14`). Une épreuve « sans poser aucune question » ne se
gagne pas sur la supériorité technique d'un outil, elle se gagne sur sa familiarité.

Exigences concernées : `FR-037`, `FR-038`, `FR-040`, `FR-041`, `FR-088`, `FR-089`,
`FR-093`, `SC-013`, `SC-014` · `US11`, `US12`, `US14` · invariants `I1`, `I4`.

## Décision

Nous utiliserons **GitHub** comme forge et comme chemin de publication. Le dépôt sera
**ouvert au nom de la cliente**, Isometria n'y étant que collaborateur révocable.

La publication se fera par l'**API Git** de la forge, avec les identifiants du compte de
la cliente : aucun identifiant appartenant à l'intégrateur n'entre dans le chemin de
publication (`FR-041`, `SC-013`).

## Conséquences

**Positives**

- `SC-014` se joue sur du familier : c'est la forge que le développeur tiers connaît déjà,
  et l'épreuve de passation n'ajoute rien à apprendre au-delà du produit lui-même.
- Le dépôt étant au nom de la cliente, `I1` et `FR-088` sont tenus sur le seul objet de la
  chaîne qui vit hors du compte Cloudflare.
- Le système de build de la plateforme se branche directement sur ce dépôt, ce qui fait du
  commit le déclencheur unique exigé par `FR-040` et `C2`.

**Négatives — ce que ce choix coûte**

- **Une publication n'est pas une requête, c'est une séquence.** L'API Git de GitHub
  compose l'écriture en plusieurs appels — objets, arbre, commit, puis mise à jour de la
  référence. Seule la dernière étape fait basculer l'état publié : l'état visible n'est
  donc jamais partiel, mais un échec en cours de séquence laisse des objets non
  référencés dans le dépôt et **oblige à rejouer la publication entière**. C'est du code
  de chemin d'échec, sur le chemin le plus critique du produit.
- **Un compte GitHub de plus à ouvrir au nom de la cliente**, à recenser au dossier
  d'instance (`FR-089`) et à inscrire parmi les comptes dont la récupération dépend de sa
  boîte e-mail (`FR-093`) — la même boîte que `ADR-0007` a déjà faite clé de voûte.
- **La disponibilité de GitHub conditionne la publication** (pas le service du site, qui
  reste assuré). C'est la seconde dépendance externe du chemin de publication, après celle
  du build.

## Alternatives considérées

- **GitLab** : écartée malgré un avantage réel et reconnu — son API de commits accepte
  toutes les actions de fichiers **en une seule requête réellement atomique**, ce qui
  supprimerait la conséquence négative principale ci-dessus, sur le chemin le plus
  critique du produit. Payée en familiarité : `SC-014` se joue sur ce qu'un prestataire
  tiers connaît sans qu'on le lui explique, et ce critère l'a emporté.
- **Un dépôt Git auto-hébergé chez la cliente** : écartée parce qu'elle ajoute un objet à
  administrer et à maintenir dans la durée, ce que `I6` et `FR-100` proscrivent, et parce
  qu'elle rendrait `SC-014` dépendante d'une infrastructure que le prestataire tiers
  devrait d'abord comprendre.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 10 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
