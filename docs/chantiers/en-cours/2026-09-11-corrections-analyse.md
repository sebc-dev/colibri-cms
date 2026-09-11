# Résorber ce que la passe d'analyse lève sur `src/`

Portée : hors-cycle
Ouvert le 2026-09-11 · Actualisé le 2026-09-11 · branche `chore/chantier-corrections-analyse` · HEAD `502d53a`

## Objectif
J'allais traiter par petits lots ce que `npm run analyse` lève — `src/` d'abord, `tests/` ensuite —
puis retirer les extinctions qui ne tiennent qu'à une API dépréciée en amont, pour que le check
devienne vert, et donc promouvable en bloquant.

## Contexte à charger
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — les deux régimes, le calibrage assumé et
            la limite `.astro`/`.svelte` ; porte deux chiffres à reprendre en fin de chantier, « sept
            règles éteintes » là où la config en porte huit, et un décompte de `src/` que chaque lot
            périme (189 l., seule cette section compte)
à lire      `eslint.config.analyse.js` — les huit extinctions de `tests/**` et leur motif ; c'est ici
            qu'on en retire une quand sa cause disparaît (78 l.)
à situer    `docs/chantiers/archive/2026-09-11-boucle-analyse-locale.md` — la fiche du montage,
            conclusions déjà distillées ici, ne pas la relire
à situer    `.claude/agents/quality-analyse.md` — la règle de périmètre du diagnostiqueur ; à ouvrir
            seulement si un run remonte l'arriéré au lieu des fichiers du ticket

## Acquis
- J'ai retenu un ordre qui n'est pas celui du volume : les constats qui demandent un regard d'abord,
  la migration `SELF`/`env` en dernier.
- J'ai appris que `--fix` n'est pas « rien à juger » : sur trois corrections proposées, deux cassaient
  `tsc`. Relire le diff ET rejouer le typage fait partie du lot, ce n'est pas un supplément.
- J'ai trouvé comment trancher faux positif / vrai constat sans deviner : quel `tsconfig` couvre le
  fichier, et `noUncheckedIndexedAccess` y est-il actif ? Ici un seul, l'option absente — c'est elle
  qui fabrique les gardes dites « toujours fausses » qui sont pourtant réelles à l'exécution. Et le
  verdict n'est pas durable : le faux positif de `pages.ts` s'est évaporé dès que le type est passé
  ailleurs. Refaire l'épreuve avant de poser une extinction, jamais la croire sur parole.
- J'ai appris qu'un constat nommé en traîne d'autres : ouvrir le fichier entier plutôt que les seules
  lignes visées — la cause des `all<T>()` de D1 courait sur quatre fichiers.
- Le chiffre ne se recopie ni ne se relit : `npm run check:agent` le refait. Un rapport gardé d'une
  passe précédente m'a fait annoncer un compte faux.

## Prochaine étape
Attaquer `tests/**`, par la famille du duck-type `DB` recopié dans une dizaine de fichiers de test —
même cause que celle traitée côté `src/`, même geste. Typage, build et tests à chaque fois ; un
commit par cause.

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
