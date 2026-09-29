# ADR-0027 : L'objet qui porte le compteur de fréquence est nommé par une constante du code
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/archi.md](../archi.md) — invariant `I7`

## Contexte

[ADR-0012](./0012-anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre.md) a retenu un
compteur de fréquence dans un Durable Object **unique**, portant une table d'origines sous
empreintes HMAC à clé de fenêtre. La promesse qui le fonde est : **rien de dérivé d'une origine
ne survit à la fenêtre de comptage qui l'a fait naître.**

La Stack nommait **trois** façons de la casser. **Une seule est statique**, et c'est celle que
cet invariant tient : un objet **nommé d'après une origine**. Les deux autres — une entrée qui
franchit sa fenêtre, une clé qui ne change pas d'une fenêtre à l'autre — sont du **comportement
à l'exécution** : elles descendent au niveau specs, et le § « Vérification mécanique
obligatoire » de `docs/stack.md` les a déjà versées à `ci` comme contrôle de sources.

Ce que l'invariant empêche est précis : un objet par visiteur ferait du **nom de l'objet**
l'empreinte d'une adresse, créée **dans l'infrastructure de la plateforme** — un identifiant
durable que ni l'effacement de la table, ni la rotation de la clé de fenêtre, ni aucune reprise
du produit ne retire.

**Caractéristique architecturale servie** : `C2` — confinement de l'origine commune.
**Exigences servies** : `FR-007`, `FR-062`.

**Trace observable** : l'**argument de `idFromName`**, dans `src/platform/frequence/`.

## Décision

**L'identifiant de l'objet qui porte le compteur de fréquence sera dérivé d'une constante
littérale du code** ; **aucun appel à `idFromName`, dans `src/platform/frequence/`, ne prendra
une valeur issue d'une requête.**

## Conséquences

**Positives.**

- **Aucun identifiant durable de personne n'est créé dans l'infrastructure de la plateforme**,
  et cela par construction — pas par vigilance.
- La promesse du § « Données personnelles » de `docs/stack.md` gagne son versant **vérifiable**,
  celui qui ne casse aucun écran et ne se verrait donc jamais autrement.

**Négatives — ce à quoi le code s'engage.**

- **L'invariant ne tient qu'une des trois falsifications.** Les deux autres sont du runtime : la
  promesse n'est pas garantie par cet ADR seul, et ce serait une erreur de le croire.
- **Il est nominatif et localisé** : il nomme `idFromName` et le chemin
  `src/platform/frequence/`. Un appel fait ailleurs, ou par une autre API de nommage d'objet,
  passerait le contrôle.
- **Un objet unique est un point de sérialisation** : tout le trafic anti-abus y passe —
  conséquence déjà portée par
  [ADR-0012](./0012-anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre.md).

## Alternatives considérées

- **Un objet par visiteur** : écartée — c'est exactement ce que cet invariant empêche. Elle
  ferait du nom de l'objet l'empreinte d'une adresse IP, hors de portée de toute reprise.
- **Formuler l'invariant comme la promesse entière** (« rien de dérivé d'une origine ne survit à
  sa fenêtre ») : écartée car deux de ses trois falsifications sont du comportement à
  l'exécution, invisibles dans les sources.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — compilée en phase Archi, qui a retenu la seule
  moitié statique de la promesse de la Stack. Revue humaine : 2026-08-13.
