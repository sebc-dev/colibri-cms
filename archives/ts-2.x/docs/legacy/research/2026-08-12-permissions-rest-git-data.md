# Quelles permissions GitHub exige-t-il des points d'entrée REST *git data* ? — relevé

*Relevé du 12 août 2026, sur la **donnée source** de la documentation GitHub, publiée dans le dépôt
public `github/docs` et interrogée par `gh api`. Instruit le cinquième grief de `S-10` de
`docs/audit-stack.md` — les mesures du 11/08/2026 vivent sur un dépôt jetable externe et n'ont
laissé aucune trace versionnée, ce qui vaut encore pour quatre lignes du tableau
`## Le jeton d'écriture` de `docs/stack.md`.*
*Aucun appel n'a été fait contre l'API GitHub, aucun jeton n'a été créé : ce document **cite**, il
ne mesure pas. Il ne rejoue donc pas les mesures du 11/08 et ne les infirme pas.*
*Trace brute rejouable — commandes et sortie intégrale : `2026-08-12-permissions-rest-git-data.transcript.txt`.*

---

## TL;DR

**Deux des quatre lignes sans trace n'avaient pas besoin d'être mesurées : GitHub les publie.** Les
permissions exigées de chaque point d'entrée REST vivent dans `github/docs` sous forme de donnée
lisible à la machine — `src/rest/data/fpt-<version-d-api>/git.json`, champ `progAccess.permissions`.

```
POST   /repos/{owner}/{repo}/git/blobs      → { Contents: write }
POST   /repos/{owner}/{repo}/git/trees      → { Contents: write }
POST   /repos/{owner}/{repo}/git/commits    → { Contents: write }
DELETE /repos/{owner}/{repo}/git/refs/{ref} → { Contents: write }
```

Identique dans les deux versions d'API vivantes (`2022-11-28` et `2026-03-10`), au commit
`0b2db291` du **23/06/2026** — la datation est prise au dernier commit du fichier source, GitHub
n'imprimant aucune date de mise à jour, comme pour le fait 3.

**Et la même donnée dit une chose que la mesure du 11/08 ne pouvait pas voir.** Le champ
`permissions` n'est pas une liste de permissions : c'est une **liste de jeux suffisants**. Les deux
points d'entrée qui *déplacent une ref* en ont **deux**, là où les autres n'en ont qu'un :

```
POST  /repos/{owner}/{repo}/git/refs
PATCH /repos/{owner}/{repo}/git/refs/{ref}
   → { Contents: write }
   → { Contents: write, Workflows: write }
```

Le dépôt d'essai du 11/08 ne contenait aucun fichier de workflow ; la condition qui lève le second
jeu n'a donc jamais pu se déclencher, et la mesure a conclu « une seule permission » de bonne foi.

**Ce que la condition est exactement n'est écrit nulle part dans cette donnée.** Qu'elle se lise
« le commit visé touche un fichier sous `.github/workflows/` » est une **lecture**, appuyée sur la
règle connue des jetons à portée fine — pas une citation. Elle est déclarée ici parce que c'est
d'elle que dépend la validité de l'argument, pas en réserve de bas de page.

**Côté GraphQL, l'absence se vérifie structurellement.** L'entrée `createCommitOnBranch` de
`src/graphql/data/fpt/schema-commits.json` (commit `fb07809a`, 11/06/2026) porte les clés `name`,
`id`, `href`, `description`, `isDeprecated`, `inputFields`, `returnFields`, `category` — et
**aucune clé de permission**, là où une opération REST porte son `progAccess.permissions`.
L'affirmation de `docs/stack.md` — « GitHub ne publie aucune table de permissions GraphQL » — est
donc exacte, et vérifiée autrement que par une absence de page. `updateRefs` n'apparaît dans aucun
des trois fichiers de schéma consultés.

---

## Ce que ça change pour les quatre lignes sans trace

| Ligne du tableau `## Le jeton d'écriture` | Issue |
|---|---|
| `Contents: write` seule suffit à blob, arbre, commit | **Se cite.** Publiée par GitHub, dans les deux versions d'API |
| `PATCH /git/refs` en `force: false` refuse un non-avance-rapide | **Se cite à moitié.** L'intention du paramètre est documentée mot pour mot ; la réponse `422 Update is not a fast forward` reste mesurée |
| GraphQL exige `Contents` + `Workflows` | **Ne se cite pas**, et ne se citera pas : GitHub ne publie rien sur les permissions GraphQL |
| `git push --force-with-lease` passe avec `Contents` seule | **Ne se cite pas.** Rien dans la donnée REST ne couvre le protocole git lui-même |

**L'asymétrie mesurée le 11/08 tient malgré la découverte ci-dessus.** GraphQL a refusé avec
`Contents` seule sur un dépôt **sans** workflows, là où REST est passé sur le même dépôt : REST
exige `Workflows` **sous condition**, GraphQL l'exige **toujours**.

*Une lecture, déclarée comme telle* : la description de `createCommitOnBranch` dit que la mutation
« creates a commit whose parent is the HEAD of the provided branch **and also updates that branch
to point to the new commit** ». Un seul appel fait les deux gestes. Il tombe donc toujours dans le
cas « déplacement de ref », là où la chaîne REST les sépare et ne rencontre la condition qu'au
dernier. C'est une explication plausible de l'asymétrie, pas une preuve — GitHub n'en publie aucune.

---

## Ce que ce relevé n'établit pas

- **Aucun jeton à portée fine n'a été créé, aucun appel réel n'a été passé.** Les quatre lignes
  mesurées le 11/08 ne sont ni rejouées ni infirmées.
- **Le jeton dont dispose `gh` sur cette machine ne peut pas servir de témoin** : c'est un OAuth de
  portées `gist, read:org, repo, workflow`, alors que la mesure porte précisément sur ce qu'une
  permission **unique** autorise. Rejouer les mesures suppose de créer des jetons à portée fine à
  la main, dans l'interface GitHub.
- **La condition qui lève le second jeu de permissions n'est pas établie.** Voir ci-dessus : c'est
  une lecture.
