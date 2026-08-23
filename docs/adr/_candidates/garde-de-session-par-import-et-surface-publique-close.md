# Candidat ADR : Le garde de session est tenu par l'import, et la surface publique est close
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0026-garde-de-session-par-import-et-surface-publique-close.md` (ADR-0026 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

`FR-082` réserve l'aperçu à une session ouverte, et l'aperçu est la seule route serveur qui rend
du contenu **non publié**. `FR-097` fait de l'envoi d'une demande le **seul** traitement serveur
déclenché par un visiteur. `FR-061` interdit tout fichier téléversé par un visiteur.

La Stack avait déposé deux énoncés : « toute route qui ne sert pas une page publiée exige une
session valide », et une description de la surface publique par ce qu'elle est **ouverte à**.
Ni « ne pas servir une page publiée », ni « ouverte au visiteur anonyme » **ne se lisent dans un
fichier** : ce sont des propriétés de l'**appelant**, pas de la source.

Pour `FR-061`, la Stack invoquait un fait acquis — « le visiteur n'écrit que ses coordonnées,
sans fichier ». Cela décrit l'intention sans la tenir : **un refus ne se tient qu'en
interdisant**.

**Caractéristique architecturale servie** : `C2` — confinement de l'origine commune.
**Exigences servies** : `FR-061`, `FR-082`, `FR-097`.

**Traces observables** : l'**absence de l'import** du garde, dans un fichier de route concerné ;
et l'**appel de `request.formData()`**, dans un fichier de `src/pages/api/public/`.

## Décision

**Tout fichier de route sous `src/pages/api/` ou `src/pages/admin/`, hors du sous-arbre
`src/pages/api/public/`, importera le garde de session `src/platform/session/index.ts`.**

**Aucun fichier de `src/pages/api/public/` ne lira un corps `multipart`.**

## Conséquences

**Positives.**

- **La polarité retournée rend le manquement lisible** : au lieu de décrire qui entre, on impose
  ce que la route importe, et l'absence d'import se voit dans les sources.
- **La surface publique est close par construction** : elle est un sous-arbre **nommé**, et
  rien d'autre. Toute route ajoutée hors de ce sous-arbre est gardée par défaut — l'oubli va
  dans le sens sûr.
- **`FR-061` devient un interdit vérifiable** et non plus une intention.
- **Le périmètre n'est pas choisi** : c'est la liste bornée de chemins que `run_worker_first`
  impose déjà par ailleurs, `/api/*` et l'administration.

**Négatives — ce à quoi le code s'engage.**

- **Importer le garde n'est pas l'appeler.** Une route peut importer
  `src/platform/session/index.ts` et ne jamais s'en servir : l'invariant ne le verrait pas. Il
  tient le **placement**, pas le comportement — l'appel effectif relève du niveau specs et de
  l'épreuve `SC-021`. C'est un angle mort assumé, en échange de la falsifiabilité.
- **Le périmètre est lié à `run_worker_first`.** Ajouter un troisième préfixe servi par le code
  élargirait la surface **sans que cet invariant le sache** : c'est pourquoi
  [ADR-0015](../../1.x/adr/0015-en-tetes-de-reponse-deux-porteurs.md) doit garder cette liste bornée.
- **La route d'aperçu doit vivre sous `src/pages/admin/`** — conséquence déjà portée par
  [ADR-0023](../../1.x/adr/0023-rendu-partage-par-le-publie-et-l-apercu.md).
- **Le second volet est nominatif** : il nomme `request.formData()`. Une autre façon de lire un
  corps `multipart` passerait le contrôle.

## Alternatives considérées

- **Décrire qui a le droit d'entrer** — l'énoncé d'origine de la Stack : écartée car « ne sert
  pas une page publiée » et « ouverte au visiteur anonyme » sont des propriétés de l'appelant,
  invisibles dans la source. Un invariant qu'aucun contrôle ne peut prendre en défaut n'est pas
  un invariant.
- **Servir la route d'aperçu depuis un troisième préfixe** (hors `/api/*` et hors
  l'administration) : écartée car elle exigerait d'élargir la liste `run_worker_first`, donc une
  révision de la Stack — et elle sortirait l'aperçu du périmètre gardé par cet invariant.

## Vérifiable ?

Oui — `arch-invariants`, invariant `I6` : garde de session importé par toute route non publique, et aucun corps `multipart` sur la surface publique.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi, qui a retourné la
  polarité des deux énoncés de la Stack pour les rendre vérifiables. Revue humaine : 2026-08-13.
