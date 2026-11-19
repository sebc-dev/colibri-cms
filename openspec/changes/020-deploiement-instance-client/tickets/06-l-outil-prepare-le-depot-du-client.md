# 06 — L'outil de livraison prépare le dépôt du client depuis une version du produit

**Bloqué par :** 02, 03
**Vérif :** test
**Fichiers :** `scripts/livraison.mjs`, `src/platform/instance/depot-du-client.ts`, `scripts/batir-site-jetable.mjs`, `.claude/skills/recette/scripts/recette.mjs`, `.claude/skills/recette/SKILL.md`, `docs/architecture/context.c4`, `tests/unit/depot-du-client.test.ts`, `tests/static/depot-du-client-statique.test.ts`

## Ce que ça livre

Chaque client a son dépôt, privé, dans son compte GitHub. Ce ticket livre le geste qui le prépare :
`depot <dépôt> --version <étiquette> --instance <fichier>`. Le dépôt préparé porte les fichiers
d'une version du produit qui servent à construire le site, le **fichier d'instance** fourni, un
contenu de départ, et la branche des images (`media`) dans l'état que ce contenu demande. Deux
dépôts préparés depuis la même version ne diffèrent que par leur fichier d'instance et leur contenu.

**État du code.** L'outillage de recette a une commande `depot`
(`.claude/skills/recette/scripts/recette.mjs`) qui fait presque cela pour le dépôt de recette :
`git archive` du HEAD, retrait de `.github/`, site factice comme contenu au premier remplissage,
contenu gardé ensuite, branche `media` amorcée une seule fois. Elle part du HEAD et non d'une
étiquette, et elle laisse dans le dépôt l'outillage et les documents de l'intégrateur.
`scripts/livraison.mjs` existe avec le geste `controler`.

**Ce que ce ticket livre** :

- Le geste `depot` de `scripts/livraison.mjs`, lancé depuis un clone du produit, écrit dans un clone
  local du dépôt du client (git local seul ; il ne pousse rien).
- Il extrait les fichiers de la version désignée (`git archive` de l'étiquette). N'entrent pas dans
  le dépôt du client : `.github/` (aucune automatisation de la forge) ; `.claude/`, `openspec/`,
  `docs/`, `recette/`, `CLAUDE.md` (l'outillage et les documents de travail de l'intégrateur, qui
  portent ses identifiants). **La liste des exclusions est une constante de l'outil**, sous `src/`.
- Il pose le fichier d'instance fourni et, sur un dépôt vide, un contenu de départ. Il amorce la
  branche `media` avec chaque image que le contenu de départ désigne, sans quoi la première
  construction échoue sur une image absente.
- **Avant d'écrire quoi que ce soit**, il applique au fichier d'instance fourni la lecture de la
  construction (module de lecture du fichier d'instance) : un champ inconnu ou mal formé arrête la
  préparation en nommant le champ, et le dépôt n'est pas modifié. Le contrôle complet reste un geste
  distinct, joué après.
- Rejoué avec la **même version** sur un dépôt déjà préparé, il ne touche ni au contenu du site ni à
  la branche `media`.
- Il ne réécrit aucun fichier `wrangler` : le domaine est dérivé du fichier d'instance à la
  construction.
- La commande `depot` de la recette est ramenée sur ce chemin (elle garde son contenu factice et ses
  réglages de recette). `SKILL.md` suit.
- Dans `docs/architecture/context.c4`, la relation `integrateur -> github` perd sa marque `#planned`
  et reçoit sa trace ; `likec4 validate --no-layout --json --project colibri-cms docs/architecture`
  passe.

**Tests.** Mode `test` : le geste est fortement couplé à git et au système de fichiers, et son
oracle complet comprend une construction réelle. Les tests tournent dans `workerd` et ne lancent
aucun processus : le geste est donc joué **avant** eux, dans des dossiers temporaires, par le patron
existant de `scripts/batir-site-jetable.mjs`, qui consigne un résultat que le test juge (liste des
fichiers de chaque dépôt préparé, état de la branche `media`, issue de la construction). git tourne
pour de vrai ; rien d'autre n'est doublé. `vitest.config.ts` n'est pas modifié. La logique décidable
(liste des exclusions, décision « premier remplissage ou rejeu ») vit sous `src/` et se teste en
unité. Cas limites : dépôt vide ; dépôt déjà préparé et déjà publié (contenu changé) ; fichier
d'instance refusé ; deux fichiers d'instance différents sur la même version.

**Hors périmètre** : rejouer la préparation avec une **autre** version (c'est une montée de
version) ; pousser vers le dépôt distant ; créer le dépôt ou y inviter qui que ce soit ; la
documentation que la reconstruction sans le CMS devra y trouver ; un dépôt public ou un « fork ».

**Références** : ADR-0034, ADR-0035, ADR-0025 (`docs/adr/`), invariant `I9` de
`docs/architecture.md`.

## Critères

- [ ] Lancée sur un dépôt vide avec une version du produit et un fichier d'instance, la préparation dépose les fichiers de cette version, le fichier d'instance fourni et un contenu de départ   (SC-06a)
- [ ] Lancée sur un dépôt vide, la préparation crée la branche des images avec chaque image que le contenu de départ désigne, et une construction du site depuis ce dépôt aboutit   (SC-06b)
- [ ] Une fois la préparation terminée, le dépôt ne porte aucun fichier d'automatisation de la forge   (SC-06c)
- [ ] Une fois la préparation terminée, le dépôt ne porte ni l'outillage de recette, ni les documents de travail de l'intégrateur   (SC-06d)
- [ ] Rejouée avec la même version du produit sur un dépôt dont le contenu a déjà changé, la préparation laisse le contenu du site et la branche des images inchangés   (SC-06e)
- [ ] Lancée avec un fichier d'instance que la construction refuserait, la préparation s'arrête en nommant le champ en cause et le dépôt n'est pas modifié   (SC-06f)
- [ ] Quand le dépôt de deux clients est préparé depuis la même version du produit avec deux fichiers d'instance différents, les deux dépôts ne diffèrent que par le fichier d'instance et par le contenu du site   (SC-06g)
