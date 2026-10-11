# ADR-0023 : Sérialisation des publications et constat de la mise en ligne — une seule ligne d'état en D1, et une marque de publication empaquetée par le site
Statut : Accepté | Date : 2026-10-11

Promu depuis `docs/legacy/1.x/adr/0017-serialisation-des-publications-et-constat-de-mise-en-ligne.md` — ADR-0017, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que l'amendement de la
> promotion change** : le titre, et les points marqués *(amendé)* ou *(ajouté)* — le § « Amendée
> à la promotion » dit quoi et pourquoi ; la forme d'origine reste dans l'archive. Les renvois
> `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers `docs/legacy/1.x/` : ce
> ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à une autre décision porte
> la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte amendé, un numéro sans
> mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

**Modèle** : aucun delta dans cet ADR. La ligne d'état vit dans `colibri-cms.d1`, déjà modélisée ; la reconstruction (`workers-builds`, `#external`), ses relations `github -[async]-> workers-builds` et `workers-builds -[async]-> colibri-cms.worker`, et la vue dynamique `flow-publication` entrent au modèle avec le code et la recette qui les constatent (change `011-apercu-et-publication`).

## Contexte

La publication est une **séquence en deux temps** : dépôt additif des médias sur la branche
`media`, puis commit du contenu sur la branche principale
([ADR-0004 (1.x)](../legacy/1.x/adr/0004-medias-deux-magasins-un-par-etat.md),
[ADR-0005 (1.x)](../legacy/1.x/adr/0005-forge-github-api-git-data-jeton-a-portee-fine.md)). Il en découle que la
**sérialisation est obligatoire** — c'est le cas limite que le PRD nomme, « une publication est
déclenchée alors qu'une précédente n'est pas terminée » : un compare-and-swap sur le dernier
geste ne protège pas le premier. `FR-091` exige que le site public reste dans son état
antérieur quand une publication n'aboutit pas.

Trois manques se referment ensemble.

1. **Un verrou seul ne suffit pas.** Un Worker tué net — déploiement, limite atteinte —
   n'exécute pas sa sortie : le verrou resterait posé, et plus aucune publication ne passerait,
   sans rien dans le produit pour le débloquer.
2. **Un réessai doit reconnaître son propre travail.** Le réessai est obligatoire, la lecture du
   HEAD n'étant pas fiablement *read-your-writes* (mesure du 2026-08-11,
   [relevé](../legacy/research/2026-08-11-sous-requetes-publication.md)).
3. **`FR-090` — informer l'éditrice de l'issue de sa publication — n'est pas tenu par le dépôt
   seul.** Le dépôt n'est qu'un déclencheur (`FR-089`) : un build peut échouer après lui, et
   l'éditrice verrait l'ancien site avec un succès affiché.

## Décision

Nous tiendrons **une seule ligne d'état en D1**, portant : le **verrou conditionnel**, un
**bail horodaté** — une publication qui trouve un verrou **expiré** le reprend au lieu de
renoncer — et l'**issue du dépôt**.

*(ajouté)* La publication avance en **passes**, une par requête : des passes de dépôt des
médias, puis une passe finale qui écrit les deux branches. Chaque passe renouvelle le bail. Ce
qui est déposé est un **instantané** pris à la confirmation de l'éditrice et gardé dans la ligne
d'état : une reprise rejoue cet instantané, pas l'état courant des brouillons.

*(amendé)* Chaque dépôt écrit dans le contenu une **marque de publication** neuve,
`content/publication.json` — 128 bits aléatoires, tirés une fois par publication et gardés dans
la ligne d'état. La construction du site l'empaquette : le Worker qui répond sait **de quelle
publication il est né**. L'administration compare la marque du Worker qui lui répond à la
dernière marque déposée ; égales, la publication est en ligne. L'état se dérive à chaque
lecture, il n'est jamais stocké.

Un réessai reconnaîtra son propre commit en **comparant l'oid de l'arbre qu'il s'apprête à
pousser à celui du HEAD**.

## Conséquences

**Positives.**

- **La reprise d'un bail expiré est sûre**, parce que la séquence est **rejouable telle
  quelle** : le dépôt sur `media` est additif et adressé par contenu — le rejouer redépose les
  mêmes blobs, sans effet de bord — et l'arbre et le commit se recalculent depuis le HEAD
  courant, ce qu'impose déjà le réessai du `422`.
- **La réponse perdue se ferme sans état supplémentaire** : le même contenu produit
  déterministement le même oid, donc le réessai reconnaît son propre commit et rapporte un
  succès au lieu d'empiler un doublon. **Aucun marqueur à maintenir.**
- **Le constat de mise en ligne ne coûte aucun secret** : ni webhook, ni jeton d'API
  Cloudflare — rien qui morde sur la contrainte `C7` du
  [socle de livraison](../legacy/socle-de-livraison.md) ni sur l'inventaire des secrets.
- *(ajouté)* **Le constat n'ajoute aucune adresse publique** : la marque n'est lue que par
  l'administration, dans le Worker qui lui répond.
- *(ajouté)* **Relancer une reconstruction qui n'a pas abouti ne coûte qu'une marque neuve** :
  un dépôt sans autre fichier fait un nouveau commit, donc une nouvelle reconstruction, sans
  toucher au contenu.

**Négatives — ce à quoi le code s'engage.**

- **La valeur du bail n'est pas arbitrée ici.** Elle se borne par ce que dure la séquence —
  `4 + M` appels GitHub — et se **mesure en recette** ; le chiffre descend en specs. Tant qu'il
  n'est pas mesuré, c'est un trou : **un bail trop court fait reprendre une publication encore
  vivante**, un bail trop long **bloque le site pour sa durée**.
- **Le verrou sérialise, il ne debounce pas.** Dix publications rapprochées font dix builds,
  mis en file par la concurrence de 1 — voir
  [ADR-0001 (1.x)](../legacy/1.x/adr/0001-cible-de-deploiement-worker-unique-workers-builds.md).
- *(amendé)* **Le contenu porte un fichier que seule la publication écrit.**
  `content/publication.json` ne se modifie pas à la main : l'intégrateur qui le réécrirait ferait
  dire « n'a pas abouti » à une publication en ligne. En échange, un commit ultérieur de
  l'intégrateur qui ne touche pas ce fichier ne fausse pas le constat.
- *(ajouté)* **Une publication s'étale sur plusieurs requêtes**, que l'écran de l'éditrice
  enchaîne. Si l'écran se ferme en cours de route, rien ne publie pendant la durée du bail ;
  ensuite, c'est la publication suivante qui reprend l'instantané laissé en suspens et le mène au
  bout.
- **Le constat se fait par comparaison, donc il a un état intermédiaire.** Entre le dépôt et
  l'apparition de la nouvelle empreinte, la publication est « en cours » — et rien ne distingue
  un build lent d'un build mort sans une **borne de temps**, qui reste à décider au niveau
  specs.

## Alternatives considérées

- **Lire l'issue du build par un webhook ou par l'API Cloudflare** : écartée car l'un et l'autre
  exigent un jeton d'API dans le compte de la cliente, ce qui mord sur la contrainte `C7` du
  socle de livraison et rallonge l'inventaire des secrets — quand la requête publique ne coûte
  rien.
- **Tenir l'issue du dépôt pour l'issue de la publication** : écartée car c'est exactement le
  succès affiché à tort que `FR-090` doit éviter.
- **Maintenir un marqueur d'idempotence à part** pour reconnaître un réessai : écartée car l'oid
  de l'arbre le donne gratuitement, sans état de plus à tenir à jour.
- *(ajouté)* **L'empreinte du commit exposée par le site publié à un chemin connu** (la forme
  d'origine) : écartée car elle ajoute une adresse publique à un site qui n'en sert aucune hors
  l'envoi d'une demande, et parce qu'un commit ultérieur de l'intégrateur change l'empreinte
  sans qu'aucune publication n'ait échoué — le constat dirait « n'a pas abouti » à tort.
- *(ajouté)* **L'empreinte que fournit le service de reconstruction, en variable de
  construction** : écartée car elle est absente des constructions locales et de recette.
- *(ajouté)* **Une publication en une seule requête** : écartée car elle plafonne les médias à
  42 par publication ([ADR-0021](./0021-forge-github-api-git-data-jeton-a-portee-fine.md)).

## Amendée à la promotion

Promue le 2026-10-11 par le change `011-apercu-et-publication`, le premier à publier. La ligne
d'état, le verrou à bail et la reconnaissance d'un réessai par l'oid de l'arbre sont repris tels
quels. Deux points changent.

1. **Le constat compare une marque de publication empaquetée, plus une empreinte de commit
   exposée.** Le Worker qui répond à l'administration est celui qui sert le site : il sait déjà
   de quelle publication il est né, sans rien exposer.
2. **La publication avance en passes, sur un instantané.** C'est la conséquence de l'amendement
   d'[ADR-0021](./0021-forge-github-api-git-data-jeton-a-portee-fine.md) : des médias déposés en
   plusieurs requêtes exigent que chaque requête renouvelle le bail et dépose le même contenu.

Les valeurs du bail et de la borne de temps restent hors de cet ADR, comme la forme d'origine le
voulait : ce sont des constantes nommées, choisies par le change et mesurées en recette.

Retouchés en conséquence, marqués *(amendé)* ou *(ajouté)* : le titre, la Décision, deux
conséquences positives, deux négatives, trois alternatives.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack sur les mesures du
  2026-08-11, complétée par les traitements de `S-04` et `S-07`. Revue humaine : 2026-08-13.
