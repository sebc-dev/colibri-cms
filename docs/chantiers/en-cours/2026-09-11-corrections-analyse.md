# Résorber ce que la passe d'analyse lève

Portée : hors-cycle
Ouvert le 2026-09-11 · Actualisé le 2026-09-12 · branche `chore/chantier-corrections-analyse` · HEAD `4c749a9`

## Objectif
J'allais traiter par petits lots ce que `npm run analyse` lève — `src/` d'abord, `tests/` ensuite —
puis retirer les extinctions qui ne tiennent qu'à une API dépréciée en amont, pour que le check
devienne vert, et donc promouvable en bloquant.

## Contexte à charger
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — la tâche de clôture : ses décomptes de
            remontées et son compte de règles éteintes, que les lots ont périmés, et qui décrit
            encore un calibrage à un seul bloc (189 l.)
à lire      `eslint.config.analyse.js` — le calibrage, désormais en deux blocs : les extinctions
            larges de `tests/**` et une extinction bornée à un seul fichier (88 l.)
à situer    `docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md` — la fiche du montage,
            conclusions déjà distillées ici, ne pas la relire

## Acquis
- `--fix` n'est pas « rien à juger » : sur trois corrections proposées, deux cassaient `tsc`. Relire
  le diff ET rejouer le typage fait partie du lot.
- Trancher faux positif / vrai constat sans deviner : quel `tsconfig` couvre le fichier, et
  `noUncheckedIndexedAccess` y est-il actif ? C'est cette option qui fabrique les gardes dites
  « toujours fausses », réelles à l'exécution. Un verdict ne dure pas : refaire l'épreuve.
- Un constat en traîne d'autres, dans les deux sens : d'autres fichiers portent la même cause, et la
  corriger fait apparaître le constat suivant sur la même ligne — la bonne forme vient en deux temps.
- Les deux plugins relèvent parfois la même ligne : compter les causes, jamais les remontées.
- Le chiffre ne se recopie ni ne se relit : quatre comptes faux annoncés — `noclobber` de zsh refuse
  d'écraser un fichier existant (rediriger par `>|`), ce qui frappe le rapport, sa redirection
  d'erreur (`2>|`) et jusqu'à un `head -n -1 f > f` ; muette, la commande laisse croire que l'essai a
  eu lieu, et c'est le fichier de la veille qu'on relit. Et `--format unix` n'est plus livré avec ESLint.
- Une correction qui touche une assertion de test se réprouve par une sonde adverse — condition
  inversée, le test doit virer au rouge. Restaurer ensuite par une copie prise hors de l'arbre, avec
  vérification d'empreinte ; jamais par `git restore`, le travail du lot n'étant pas encore commité.
- Un lot se prouve par quatre commandes, dans cet ordre : `npm run typecheck`, la passe d'analyse sur
  les seuls fichiers touchés, `npm test` sur ces mêmes fichiers, `npm run lint`.
- Un rejet non géré ne rougit aucun test : il se rapporte en `Errors N`, la ligne `Tests` affichant
  le même « passed » dans les deux cas. Ne lire que `Tests` donne un faux vert.
- `no-clear-text-protocols` tolère déjà les TLD de documentation (`.test`, `example.com`) et les
  namespaces XML : une sonde-témoin doit viser un domaine réel, sinon elle ne prouve rien.
- La portée d'une extinction se mesure, elle ne se suppose pas : appliquer chaque portée pour de vrai,
  et regarder ce qu'un témoin planté ailleurs cesse de déclencher.

## Prochaine étape
J'allais finir par les deux lots qui touchent des assertions, chacun avec sa sonde adverse :
`prefer-specific-assertions` (`code-vers-adresse-autorisee`, `plafond-horaire` — la règle nomme
elle-même `toHaveLength(1)`), puis `parameterized-tests` (`code-ouvre-la-session`, deux endroits).
La passe verte, restait la clôture : corriger `docs/ci.md`, puis passer `analyse` en `blocking`.

## Écarté
- **Lancer `--fix` sur tout le dépôt sans relire le diff** — `||` et `??` ne coïncident pas sur `0` et
  `''` : c'est sémantique, pas du formatage.
- **Corriger les deux `as Record<…>` de `pages.ts`** — écarté à l'épreuve le matin (`tsc` cassait :
  TS18046, TS2339), **renversé le soir par la même épreuve** une fois le type porté par une annotation
  `ReadonlyMap`. Aucune extinction à poser sur ce fichier, contre ce qui était prévu.
- **Étendre ce soupçon sans le vérifier** — sur `texte-riche.ts`, sept remontées qui sentaient le faux
  positif étaient toutes réelles.
- **Appliquer telle quelle la correction qu'une règle suggère** — une autre règle de la même grille
  peut l'interdire ; il faut alors une troisième forme, qu'aucune des deux ne nomme.
- **Annoter une `const` en `| undefined` pour rendre une garde réelle** — TypeScript re-narrowe depuis
  le type de l'initialiseur ; ce qui marche, c'est `Map.get` ou `.at(0)`.
- **Éteindre une règle plutôt que corriger** — le calibrage est le contrat ; une extinction ne se
  justifie que par une cause nommée, comme celles de `tests/**`. Rééprouvé sur `pseudo-random` : la
  forme de remplacement était déjà en usage ailleurs dans le dépôt.
- **Grouper les lots qui touchent des assertions avec les autres** — chacun exige sa sonde adverse et
  sa restauration par copie ; les garder ensemble en fin évite de payer ce rituel à chaque petit lot.
- **Commencer par la migration `SELF`/`env`** — beaucoup d'endroits touchés, aucun comportement
  changé : elle noierait le diff des constats qui, eux, en changent.
- **Promouvoir `analyse` en bloquant avant qu'il soit vert** — un check rouge déclaré bloquant
  paralyse le cycle `run` au premier ticket.
- **Passer par `--fix` pour le lot `??=`** — il aurait corrigé du même geste les assertions de type et
  les expressions régulières, deux autres lots qui se relisent séparément.
- **Éteindre `no-clear-text-protocols` sur tout `tests/**`** — mesuré, pas supposé : sous cette portée
  un `http://` vers un domaine réel planté dans un autre test cesse d'être vu ; bornée au seul
  fichier, il reste vu.
- **Poser un `eslint-disable` sur la ligne** — escape-hatch que le filet CI annote, et le commit
  tomberait alors dans les catégories qui exigent la signature de l'humain.
- **Déguiser l'URL en la composant depuis ses morceaux** — contournement d'analyseur, qui abîme la
  lisibilité du test sans rien régler.
- **Simplifier la regex du vocabulaire FR-117** — ses vingt-et-une branches sont une liste de mots,
  irréductible sans en retirer, donc sans affaiblir FR-117 : c'est la représentation qui change.
