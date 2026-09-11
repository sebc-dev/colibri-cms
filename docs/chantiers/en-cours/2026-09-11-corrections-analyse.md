# Résorber ce que la passe d'analyse lève

Portée : hors-cycle
Ouvert le 2026-09-11 · Actualisé le 2026-09-11 · branche `chore/chantier-corrections-analyse` · HEAD `6e55f5f`

## Objectif
J'allais traiter par petits lots ce que `npm run analyse` lève — `src/` d'abord, `tests/` ensuite —
puis retirer les extinctions qui ne tiennent qu'à une API dépréciée en amont, pour que le check
devienne vert, et donc promouvable en bloquant.

## Contexte à charger
à extraire  `docs/ci.md` › « La boucle locale d'analyse » — à corriger en fin de chantier : son
            compte de règles éteintes et ses décomptes de remontées, que les lots périment (189 l.)
à lire      `eslint.config.analyse.js` — les extinctions de `tests/**` et leur motif ; c'est ici
            qu'on en retire une quand sa cause disparaît (78 l.)
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
- Le chiffre ne se recopie ni ne se relit : trois comptes faux annoncés — `noclobber` de zsh refuse
  d'écraser un rapport (rediriger par `>|`, **y compris `2>|`** : refusée, la redirection d'erreur
  fait que rien ne tourne et le rapport reste vide), et `--format unix` n'est plus livré avec ESLint.
- Une correction qui touche une assertion de test se réprouve par une sonde adverse — condition
  inversée, le test doit virer au rouge. Restaurer ensuite par une copie prise hors de l'arbre, avec
  vérification d'empreinte ; jamais par `git restore`, le travail du lot n'étant pas encore commité.

## Prochaine étape
Attaquer les quatre `sonarjs/pseudo-random` — un `Math.random()` de fixture dans
`corriger-bouton-action.test.ts`, `liste-des-pages.test.ts`, `regler-lien-video.test.ts` et
`texte-riche.test.ts` : une seule cause de fond, quatre sites, à traiter d'un geste.

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
  justifie que par une cause nommée, comme celles de `tests/**`.
- **Commencer par la migration `SELF`/`env`** — beaucoup d'endroits touchés, aucun comportement
  changé : elle noierait le diff des constats qui, eux, en changent.
- **Promouvoir `analyse` en bloquant avant qu'il soit vert** — un check rouge déclaré bloquant
  paralyse le cycle `run` au premier ticket.
- **Passer par `--fix` pour le lot `??=`** — il aurait corrigé du même geste les assertions de type et
  les expressions régulières, deux autres lots qui se relisent séparément.
