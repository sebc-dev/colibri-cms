# Candidat ADR : Médias — deux magasins, un par état : branche orpheline `media` pour le publié, D1 pour le brouillon
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/legacy/1.x/adr/0004-medias-deux-magasins-un-par-etat.md` (ADR-0004 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/legacy/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — le numéro 2.x est attribué à la promotion, un geste humain dans `docs/adr/`.


## Contexte

Un média traverse deux états, et les exigences qui portent sur chacun ne sont pas les mêmes.

**Le publié.** `FR-107` exige une procédure documentée reconstruisant le site depuis les
fichiers, et `SC-011` en demande une pièce datée : le média publié doit donc exister comme
**fichier** dans un espace appartenant à la cliente (`FR-088`). `FR-037` fait effacer
définitivement une image à la publication, et `FR-084` fait annoncer cet effacement dans le
récapitulatif — deux exigences qui parlent d'un effacement **vrai à l'écran**. `SC-011`
n'exige pas l'identité binaire du site reconstruit.

**Le brouillon.** Entre le téléversement et la publication, un média n'est pas encore publié :
`FR-107` et `SC-011` ne portent pas sur lui. `FR-027`, `FR-033`, `FR-034` et `FR-040` le font
vivre, se poser et se remplacer avant toute publication.

La contrainte du palier gratuit qui décide de l'alternative principale est l'invariant `I5` du
[socle de livraison](../../legacy/socle-de-livraison.md) — « aucun prélèvement n'est possible sans un
acte du client » — et sa contrainte `C9`, « rien n'exige un moyen de paiement ».
Vérifié composant par composant dans
[`docs/legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`](../../legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md).

## Décision

Nous utiliserons **deux magasins, un par état** :

- le **publié** vit sur une **branche orpheline `media`** du dépôt de la cliente, alimentée de
  façon **additive** à la publication et **élaguée de ses orphelins au début de la publication
  suivante** ;
- le **brouillon** vit en **D1**, le binaire stocké en `BLOB` ; la publication le dépose sur
  `media` puis l'efface de la base.

## Conséquences

**Positives.**

- L'espace occupé par `media` est **borné par le jeu courant des médias publiés** : c'est une
  borne **logique**, tenue par construction, et non une décroissance observée.
- `FR-037` et `FR-084` restent vrais à l'écran : ce que le récapitulatif annonce comme
  définitivement effacé l'est.
- `media` ne reçoit que du **publié**, donc le budget de médias par publication mesuré en phase
  Stack reste vrai tel quel.
- `FR-040` reçoit une borne **documentée** et non estimée pour le poids : 2 Mo, limite de
  taille d'une ligne ou d'un `BLOB` en D1 (docs Cloudflare D1 · *Limits*, page datée du
  2026-04-21).
- Le brouillon ne coûte ni espace ni secret de plus sous l'invariant `I1` et la contrainte `C7`
  du socle de livraison, et il laisse intacte la séquence de publication.

**Négatives — ce à quoi le code s'engage.**

- **La récupération de l'espace physique n'est ni promise ni constatable.** Elle dépend d'un
  ramasse-miettes GitHub que rien ne documente, qui n'est ni déclenchable ni daté. Les
  orphelins survivent d'une publication à l'autre : l'espace ne croît pas sans fin, il ne
  maigrit pas à l'instant du build.
- **L'élagage est le seul geste du système qui écrase** (`force: true`), là où tout le reste de
  la publication est en avance rapide obligatoire. Conséquence de sécurité, portée au dossier
  de `/scd-sdd:premortem socle` : une session d'administration compromise peut **détruire des
  médias publiés**, quand le contenu textuel, lui, reste indestructible dans l'historique git.
- **Ce qu'il faut garder se calcule depuis D1, jamais depuis l'état lu de la branche.** La
  latence de réplication mesurée le 2026-08-11
  ([`docs/legacy/research/2026-08-11-sous-requetes-publication.md`](../../legacy/research/2026-08-11-sous-requetes-publication.md))
  ferait disparaître en silence un média fraîchement déposé, là où un `force: false`
  répondrait `422`.
- **Le média en brouillon est sans copie**, et c'est le seul objet du produit qu'une éditrice
  ne peut pas ressaisir — voir la réserve de
  [ADR-0003](../../legacy/1.x/adr/0003-magasin-d1-brouillons-etat-publie-et-demandes.md).
- **Le brouillon partage les 500 Mo de la base** avec les brouillons de texte et les demandes.
- **La reconstruction devient « un clone, deux branches »** : la procédure de `FR-107` et
  `FR-109` doit récupérer `main` **et** `media`, et le *fetch* de `media` pendant le build doit
  être explicite dans la commande de build.

## Alternatives considérées

**Pour le publié.**

- **R2** : écartée car tout usage, même gratuit, passe par un *checkout* d'activation
  obligatoire (doc R2 « Get started », MAJ 2026-04-21) qui **souscrit un service facturé à
  l'usage sur le moyen de paiement du compte** (Billing policy). L'invariant `I5` du socle de
  livraison tenant à l'**absence** de moyen de paiement enregistré, il tombe là — sans qu'il
  soit besoin du dialogue de carte, lui seulement rapporté.
- **Deux dépôts distincts** : écartée car mêmes bénéfices, mais un espace de plus à ouvrir et à
  vérifier sous l'invariant `I1` du socle de livraison.
- **D1, KV ou Durable Objects pour le publié** : écartée car `FR-107` exige des **fichiers** —
  un clone nu n'en produirait aucun.
- **Un dépôt à historique complet** : écartée car il garde chaque version de chaque média pour
  toujours ; `FR-037` et `FR-084` deviendraient faux à l'écran.

**Pour le brouillon.**

- **Déposer sur `media` dès le téléversement** : écartée car un téléversement n'est pas sous le
  verrou de publication, quand l'élagage en `force: true` l'est — un média déposé pendant
  l'élagage disparaîtrait en silence, exactement le mode de défaillance que le calcul depuis D1
  sert à empêcher. Et l'aperçu de `FR-081` devrait relire les octets depuis GitHub, sollicitant
  en lecture, à chaque aperçu, un jeton d'**écriture**.
- **Une branche orpheline `media-draft` distincte** : écartée car mêmes coûts, plus un espace
  de plus à ouvrir et à vérifier sous l'invariant `I1` du socle de livraison — le motif qui
  avait déjà écarté « deux dépôts distincts ».

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, requalifiée le
  2026-08-12 par le traitement de `S-19`. Revue humaine : 2026-08-13.
