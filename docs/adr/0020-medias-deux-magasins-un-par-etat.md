# ADR-0020 : Médias — deux magasins, un par état : branche orpheline `media` pour le publié, D1 pour le brouillon
Statut : Accepté | Date : 2026-10-11

Promu depuis `docs/legacy/1.x/adr/0004-medias-deux-magasins-un-par-etat.md` — ADR-0004, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que l'amendement de la
> promotion change** : la Décision, et les points marqués *(amendé)* ou *(ajouté)* — le § « Amendée
> à la promotion » dit quoi et pourquoi ; la forme d'origine reste dans l'archive. Les renvois
> `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers `docs/legacy/1.x/` : ce
> ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à une autre décision porte
> la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte amendé, un numéro sans
> mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

**Modèle** : aucun delta dans cet ADR. La base (`colibri-cms.d1`) est déjà modélisée ; la branche `media` vit dans le dépôt de la cliente (`github`, `#external`), qui entre au modèle avec l'adaptateur de forge (change `011-apercu-et-publication`).

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
[socle de livraison](../legacy/socle-de-livraison.md) — « aucun prélèvement n'est possible sans un
acte du client » — et sa contrainte `C9`, « rien n'exige un moyen de paiement ».
Vérifié composant par composant dans
[`docs/legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`](../legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md).

## Décision

*(amendé)* Nous utiliserons **deux magasins, un par état** :

- le **publié** vit sur une **branche orpheline `media`** du dépôt de la cliente. À chaque
  publication, elle est **réécrite en un seul commit sans parent**, dont l'arbre est **calculé
  depuis D1 seul** : les images publiées que D1 garde, plus celles que la publication dépose.
  Dépôt et élagage sont **un seul geste** ; une image effacée à une publication quitte `media` à
  la publication suivante, dont l'arbre ne la porte plus ;
- le **brouillon** vit en **D1**, le binaire stocké en `BLOB`. La publication le dépose sur
  `media`, et **ses octets restent en D1 jusqu'à ce que le site en service porte l'image** —
  c'est-à-dire que le Worker qui répond l'a empaquetée à sa construction ; ils sont vidés
  ensuite. D1 garde, pour chaque image, publiée ou non, la ligne dont ce calcul part.

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
- *(amendé)* **La réécriture de `media` est le seul geste du système qui écrase**
  (`force: true`), et elle a lieu à **chaque** publication, sous le verrou, là où tout le reste
  de la publication est en avance rapide obligatoire. Conséquence de sécurité : une session
  d'administration compromise peut **détruire des médias publiés**, quand le contenu textuel,
  lui, reste indestructible dans l'historique git de la branche principale.
- **Ce qu'il faut garder se calcule depuis D1, jamais depuis l'état lu de la branche.** La
  latence de réplication mesurée le 2026-08-11
  ([`docs/legacy/research/2026-08-11-sous-requetes-publication.md`](../legacy/research/2026-08-11-sous-requetes-publication.md))
  ferait disparaître en silence un média fraîchement déposé, là où un `force: false`
  répondrait `422`.
- **Le média en brouillon est sans copie**, et c'est le seul objet du produit qu'une éditrice
  ne peut pas ressaisir — voir la réserve de
  [ADR-0003 (1.x)](../legacy/1.x/adr/0003-magasin-d1-brouillons-etat-publie-et-demandes.md).
- *(amendé)* **Le brouillon partage les 500 Mo de la base** avec les brouillons de texte et les
  demandes — et l'image publiée aussi, tant que le site en service ne la porte pas.
- *(ajouté)* **Le vidage des octets dépend du constat de mise en ligne**
  ([ADR-0023](./0023-serialisation-des-publications-et-constat-de-mise-en-ligne.md)). Tant que le
  site en service ne porte pas une image publiée, l'administration la sert depuis D1 ; ensuite,
  depuis l'adresse statique de l'image empaquetée. Une reconstruction qui n'aboutit pas laisse
  donc les octets en D1, jusqu'à la suivante qui aboutit.
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
- *(ajouté)* **Alimenter `media` en avance rapide et l'élaguer au début de la publication
  suivante** (la forme d'origine) : écartée car elle fait deux gestes sur la même branche, l'un
  additif, l'autre en `force: true`, là où un seul arbre calculé depuis D1 fait les deux ; et
  entre les deux, l'historique de `media` garde l'octet d'une image déjà effacée.

**Pour le brouillon.**

- **Déposer sur `media` dès le téléversement** : écartée car un téléversement n'est pas sous le
  verrou de publication, quand l'élagage en `force: true` l'est — un média déposé pendant
  l'élagage disparaîtrait en silence, exactement le mode de défaillance que le calcul depuis D1
  sert à empêcher. Et l'aperçu de `FR-081` devrait relire les octets depuis GitHub, sollicitant
  en lecture, à chaque aperçu, un jeton d'**écriture**.
- **Une branche orpheline `media-draft` distincte** : écartée car mêmes coûts, plus un espace
  de plus à ouvrir et à vérifier sous l'invariant `I1` du socle de livraison — le motif qui
  avait déjà écarté « deux dépôts distincts ».
- *(ajouté)* **Effacer les octets de D1 dès le dépôt sur `media`** (la forme d'origine) :
  écartée car, entre le dépôt et la fin de la reconstruction, l'administration n'aurait ni les
  octets en base ni l'image empaquetée — l'image disparaîtrait de la bibliothèque pendant
  plusieurs minutes, ou il faudrait la relire depuis GitHub avec le jeton d'**écriture**.

## Amendée à la promotion

Promue le 2026-10-11 par le change `011-apercu-et-publication`, le premier à déposer une image
publiée. Deux points de la décision d'origine changent ; le reste est repris tel quel.

1. **Les octets d'une image publiée restent en D1 jusqu'à ce que le site en service la porte.**
   La forme d'origine les effaçait dès le dépôt. Le site ne porte une image qu'une fois
   reconstruit, plusieurs minutes après le dépôt : dans l'intervalle, l'image aurait disparu de
   la bibliothèque de l'éditrice.
2. **`media` est réécrite en un seul commit sans parent à chaque publication.** La forme
   d'origine l'alimentait en avance rapide, puis l'élaguait au début de la publication
   suivante. Un seul arbre, calculé depuis D1 et posé en `force: true`, fait les deux ; la
   branche n'a jamais qu'un commit.

Retouchés en conséquence, marqués *(amendé)* ou *(ajouté)* : la Décision, deux conséquences
négatives, une conséquence ajoutée, deux alternatives ajoutées.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, requalifiée le
  2026-08-12 par le traitement de `S-19`. Revue humaine : 2026-08-13.
