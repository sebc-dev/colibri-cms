# Résorber ce que la passe d'analyse lève

Portée : hors-cycle
Ouvert le 2026-09-11 · Actualisé le 2026-09-11 · branche `chore/chantier-corrections-analyse` · HEAD `30354a6`

## Objectif
J'allais traiter par petits lots ce que `npm run analyse` lève — `src/` d'abord, `tests/` ensuite —
puis retirer les extinctions qui ne tiennent qu'à une API dépréciée en amont, pour que le check
devienne vert, et donc promouvable en bloquant.

## Contexte à charger
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — à corriger en fin de chantier : elle
            annonce « sept règles éteintes » là où la config en porte huit, et un décompte de
            remontées que chaque lot périme (189 l.)
à lire      `eslint.config.analyse.js` — les huit extinctions de `tests/**` et leur motif ; c'est ici
            qu'on en retire une quand sa cause disparaît (78 l.)
à situer    `docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md` — la fiche du montage,
            conclusions déjà distillées ici, ne pas la relire

## Acquis
- `--fix` n'est pas « rien à juger » : sur trois corrections proposées, deux cassaient `tsc`. Relire
  le diff ET rejouer le typage fait partie du lot.
- Sur `||` → `??`, c'est le TYPE qui tranche, pas la lecture du site : quand le seul falsy qu'il
  autorise est `null`, les deux coïncident et tout le lot devient sûr d'un coup. Vérifier la
  déclaration, jamais la seule forme de la garde.
- Trancher faux positif / vrai constat sans deviner : quel `tsconfig` couvre le fichier, et
  `noUncheckedIndexedAccess` y est-il actif ? C'est cette option qui fabrique les gardes dites
  « toujours fausses », réelles à l'exécution. Un verdict ne dure pas : refaire l'épreuve.
- Un constat en traîne d'autres, dans les deux sens : d'autres fichiers portent la même cause, et la
  corriger fait apparaître le constat suivant sur la même ligne — la bonne forme vient en deux temps.
- Les tests d'intégration se ressemblent au mot près : une aide y est recopiée dans dix fichiers, une
  cause s'y traite donc en un lot. Et les deux plugins relèvent parfois la même ligne : compter les
  causes, jamais les remontées.
- Le chiffre ne se recopie ni ne se relit : deux comptes faux annoncés, le second parce que
  `noclobber` de zsh refusait d'écraser un rapport — rediriger par `>|`, et ne pas prendre l'`exit`
  de la redirection pour celui de l'outil.

## Prochaine étape
Attaquer les assertions de type superflues des tests — `no-unnecessary-type-assertion` et sa voisine
`non-nullable-type-assertion-style`, même famille. Soupçon à éprouver et non à croire : sur
`texte-riche.ts`, sept remontées qui sentaient le faux positif étaient toutes réelles.

## Écarté
- **Lancer `--fix` sur tout le dépôt sans relire le diff** — `||` et `??` ne coïncident pas sur `0` et
  `''` : c'est sémantique, pas du formatage.
- **Corriger les deux `as Record<…>` de `pages.ts`** — écarté à l'épreuve le matin (`tsc` cassait :
  TS18046, TS2339), **renversé le soir par la même épreuve** une fois le type porté par une annotation
  `ReadonlyMap`. Aucune extinction à poser sur ce fichier, contre ce qui était prévu.
- **Étendre ce soupçon sans le vérifier** — sur `texte-riche.ts`, sept remontées qui sentaient le faux
  positif étaient toutes réelles.
- **Annoter une `const` en `| undefined` pour rendre une garde réelle** — TypeScript re-narrowe depuis
  le type de l'initialiseur ; ce qui marche, c'est `Map.get` ou `.at(0)`.
- **Éteindre une règle plutôt que corriger** — le calibrage est le contrat ; une extinction ne se
  justifie que par une cause nommée, comme celles de `tests/**`.
- **Commencer par la migration `SELF`/`env`** — beaucoup d'endroits touchés, aucun comportement
  changé : elle noierait le diff des constats qui, eux, en changent.
- **Promouvoir `analyse` en bloquant avant qu'il soit vert** — un check rouge déclaré bloquant
  paralyse le cycle `run` au premier ticket.
- **Passer par `--fix` pour le lot `??=`** — il aurait corrigé du même geste les assertions de type et
  les expressions régulières, deux autres lots qui se relisent séparément.
