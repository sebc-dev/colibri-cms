# ADR-0017 : Sérialisation des publications et constat de la mise en ligne — une seule ligne d'état en D1, et l'empreinte du commit exposée par le site publié
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/stack.md](../stack.md) — candidat n° 17, lignes « Sérialisation et suivi des publications » et « Constat de la mise en ligne »

## Contexte

La publication est une **séquence en deux temps** : dépôt additif des médias sur la branche
`media`, puis commit du contenu sur la branche principale
([ADR-0004](./0004-medias-deux-magasins-un-par-etat.md),
[ADR-0005](./0005-forge-github-api-git-data-jeton-a-portee-fine.md)). Il en découle que la
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
   [relevé](../research/2026-08-11-sous-requetes-publication.md)).
3. **`FR-090` — informer l'éditrice de l'issue de sa publication — n'est pas tenu par le dépôt
   seul.** Le dépôt n'est qu'un déclencheur (`FR-089`) : un build peut échouer après lui, et
   l'éditrice verrait l'ancien site avec un succès affiché.

## Décision

Nous tiendrons **une seule ligne d'état en D1**, portant : le **verrou conditionnel**, un
**bail horodaté** — une publication qui trouve un verrou **expiré** le reprend au lieu de
renoncer — et l'**issue du dépôt**.

Le **site publié exposera l'empreinte du commit dont il est né**, à un chemin connu ;
l'administration la lira par une requête **publique** et la comparera.

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
  [socle de livraison](../socle-de-livraison.md) ni sur l'inventaire des secrets.

**Négatives — ce à quoi le code s'engage.**

- **La valeur du bail n'est pas arbitrée ici.** Elle se borne par ce que dure la séquence —
  `4 + M` appels GitHub — et se **mesure en recette** ; le chiffre descend en specs. Tant qu'il
  n'est pas mesuré, c'est un trou : **un bail trop court fait reprendre une publication encore
  vivante**, un bail trop long **bloque le site pour sa durée**.
- **Le verrou sérialise, il ne debounce pas.** Dix publications rapprochées font dix builds,
  mis en file par la concurrence de 1 — voir
  [ADR-0001](./0001-cible-de-deploiement-worker-unique-workers-builds.md).
- **Le site publié gagne une surface publique.** L'empreinte du commit est exposée à un chemin
  connu, lisible par quiconque. C'est minime, mais c'est une information sur le dépôt de la
  cliente qui sort du produit.
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

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack sur les mesures du
  2026-08-11, complétée par les traitements de `S-04` et `S-07`. Revue humaine : 2026-08-13.
