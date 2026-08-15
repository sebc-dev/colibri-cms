# ADR-0030 : La configuration Astro et celle du Worker lisent `instance.json`, et n'y écrivent aucune valeur en dur
Statut : Remplacé par [ADR-0032](./0032-invariant-i10-restreint-a-la-configuration-astro.md) | Date : 2026-08-13 | Trace vers : [docs/archi.md](../archi.md) — invariant `I10`

## Contexte

[ADR-0020](./0020-configuration-d-instance-quatre-lieux.md) a retenu un fichier d'instance
unique, et [ADR-0028](./0028-valeurs-d-instance-dans-le-fichier-d-instance.md) lui a donné son
nom et son format — `instance.json`, à la racine. Reste le **mécanisme de lecture**, troisième
et dernier terme de la réserve que la Stack avait déposée sur la phase Archi.

Les deux invariants se complètent sans se recouvrir : `I8` **interdit** qu'une valeur logée dans
le fichier vive ailleurs ; celui-ci **impose** que les deux configurations aillent l'y chercher
plutôt que de la redire. L'un sans l'autre laisse un trou — sans obligation de lecture, une
configuration pourrait ne pas porter la valeur du tout et la recevoir d'ailleurs, ce qui
rouvrirait la dispersion sous une autre forme sans jamais violer `I8`.

**Caractéristique architecturale servie** : `C4` — uniformité de la flotte.
**Exigences servies** : `FR-104`, `FR-105`, `SC-008`.

**Trace observable** : la **lecture d'`instance.json`**, dans `astro.config.*` et dans
`wrangler.*`.

## Décision

**La configuration Astro et celle du Worker liront dans `instance.json` les valeurs qu'`I8` y
loge** ; **aucune d'elles n'y sera écrite en dur.**

Les **liaisons de plateforme** — rattachement D1, `send_email`, Durable Object, Cron — resteront
déclarées dans la **configuration du déploiement** : c'est leur lieu.

## Conséquences

**Positives.**

- **La valeur n'existe qu'une fois** : aucune désynchronisation possible entre la configuration
  Astro et celle du Worker.
- Un clone nu bâtit le site sans D1 ni accès Cloudflare, donc `C6` du
  [socle de livraison](../socle-de-livraison.md) tient — le domaine pour les URL canoniques et
  le sitemap, la clé publique Turnstile pour le widget.
- Une montée de version ne touche jamais ce fichier : la fusion dans le dépôt d'une cliente ne
  peut pas écraser ses valeurs.

**Négatives — ce à quoi le code s'engage.**

- **Le format est figé par cette obligation.** `astro.config.*` et `wrangler.*` doivent l'un et
  l'autre lire le fichier **au moment où ils s'évaluent**, sans outil intermédiaire — c'est ce
  qui impose JSON, et ce qui rend un autre format coûteux à adopter plus tard.
- **La trace nomme deux familles de fichiers.** Une troisième configuration ajoutée plus tard —
  un outil de build, un linter propre à l'instance — ne serait **pas couverte** tant que cet
  invariant n'est pas remplacé.
- **Deux mécanismes de configuration coexistent** : le fichier d'instance et la configuration du
  déploiement. Il faut savoir lequel porte quoi, et cette connaissance vit dans
  [ADR-0020](./0020-configuration-d-instance-quatre-lieux.md), pas dans les fichiers.
- **L'invariant tient la lecture, pas ce qui en est fait.** Une configuration pourrait lire le
  fichier **et** écrire quand même une valeur en dur ailleurs : c'est `I8` qui l'attrape, pas
  celui-ci. **Les deux ne valent qu'ensemble.**

## Alternatives considérées

- **N'imposer que l'interdit d'`I8`** : écartée car interdire qu'une valeur vive ailleurs ne dit
  pas **d'où elle vient**. Une configuration pourrait la recevoir d'une variable
  d'environnement, sans violer l'interdit et sans qu'un clone nu la trouve — `C6` tomberait en
  silence.
- **L'injection par variables de build de Workers Builds** : écartée **par défaut
  d'instruction**, et non sur le fond — aucun fait de plateforme n'a été constaté à son sujet.
  Elle reste une voie inexplorée, qui demanderait un ADR de remplacement.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi, qui referme le
  troisième terme de la réserve déposée par la Stack. Revue humaine : 2026-08-13.
