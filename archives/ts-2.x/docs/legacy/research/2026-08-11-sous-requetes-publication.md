# Combien de sous-requêtes consomme la publication ? — mesure de la chaîne blob → arbre → commit

*Mesure du 11 août 2026, sur dépôt jetable et avec témoin. Instruit `S-04` de `docs/audit-stack.md`.*
*Ce document est un **relevé de mesure**, pas une recherche : il ne compare aucune option de fond
et n'arbitre rien. Il établit des nombres, il ne décide pas du mode de dépôt.*
*Trace brute rejouable — scripts et sortie intégrale : `2026-08-11-sous-requetes-publication.transcript.txt`.*

---

## TL;DR

Le constat `S-04` **est confirmé** : la chaîne naïve consomme **N + 4 appels pour N fichiers** et
franchit les 50 sous-requêtes **au 47ᵉ fichier**. Mesuré : 45 fichiers = 49 appels.

Mais une parade existe, et elle est **mesurée, pas supposée** : `POST /git/trees` accepte le
contenu **inliné** dans l'entrée d'arbre, ce qui supprime l'appel par fichier. Le coût devient
**4 appels, quel que soit le nombre de fichiers texte** — vérifié jusqu'à 1 000 entrées en une
requête.

Deux limites bornent cette parade, toutes deux mesurées :

1. **Le contenu inliné est de l'UTF-8.** Un PNG y est **corrompu** (70 o → 84 o). Les médias
   gardent donc leur `POST /git/blobs` en base64 : **1 appel par média, non mutualisable**.
2. **Le préambule qui lit le HEAD n'est pas fiablement *read-your-writes*.** Sur 10 publications
   enchaînées, **2 ont été rejetées en `422 Update is not a fast forward`** alors que rien d'autre
   n'écrivait sur la branche. Il faut donc un réessai, et le budget d'appels doit le prévoir.

**Conséquence pour la stack :** le nombre de **fichiers texte** cesse d'être une contrainte ; c'est
le nombre de **médias déposés en une publication** qui porte seul le plafond — **42 médias**, un
réessai complet réservé (voir le calcul en fin de document).

---

## Ce qui a été mesuré, et comment

Chaque appel HTTP sortant est compté **dans la fonction qui l'émet** — le compteur n'est pas
reconstitué après coup, et aucun nombre de ce document n'est déduit d'une lecture de la
documentation.

Dépôt jetable `sebc-dev/colibri-mesure-s04` (privé), API REST GitHub `2022-11-28`.

> **Réserve de méthode.** La mesure porte sur le **côté GitHub** : combien d'appels la chaîne
> émet. Le plafond de **50 sous-requêtes par requête** est, lui, une donnée Cloudflare reprise de
> `docs/stack.md` et **non revérifiée ici** — c'est l'objet de `S-10`/`S-11`, pas de celui-ci.

---

## A — Le coût du préambule

Connaître le commit parent **et** l'arbre de base avant de bâtir :

| Voie | Appels |
|---|---|
| `GET /git/ref/heads/{b}` puis `GET /git/commits/{sha}` | **2** |
| `GET /repos/{o}/{r}/commits/{ref}` — porte les deux | **1** |

La voie courte économise un appel. Voir la section D : elle ne dispense pas du réessai, et la voie
longue n'en dispense pas davantage.

## B — La chaîne naïve : un blob par fichier

| Scénario | Fichiers | Appels | Détail |
|---|---|---|---|
| Témoin | 1 | **5** | 1 préambule + 1 blob + arbre + commit + `PATCH` |
| A10 | 10 | **14** | |
| A45 | 45 | **49** | |

**Loi mesurée : N + 4.** Le seuil de 50 est franchi au **47ᵉ fichier** — l'audit annonçait
« plus de ~45 fichiers », l'écart est d'un fichier près.

## C — La parade : contenu inliné dans `POST /git/trees`

Une entrée d'arbre accepte `content` au lieu de `sha` ; GitHub crée le blob implicitement, sans
appel dédié.

| Scénario | Fichiers texte | Corps émis | Appels | Statut |
|---|---|---|---|---|
| B1 | 1 | 451 o | **4** | arbre `201` |
| B45 | 45 | 17,6 Ko | **4** | arbre `201` |
| B100 | 100 | 39,2 Ko | **4** | arbre `201` |
| B500 | 500 | 197 Ko | **4** | arbre `201` |
| B1000 | 1 000 | 396 Ko | **4** | arbre `201` |

**Le coût est constant.** Aucun refus n'est apparu jusqu'à 1 000 entrées.

Taille d'une entrée unique, poussée jusqu'où la mesure est allée : **256 Kio, 1 Mio, 4 Mio et
16 Mio acceptés** (`201`). Aucun plafond n'a été atteint dans cette plage — c'est une **borne
inférieure constatée**, pas le plafond réel, qui n'a pas été cherché.

## D — Le préambule n'est pas fiablement *read-your-writes*

Dix publications enchaînées, en comparant à chaque tour ce que répondent les deux préambules, puis
en publiant depuis la voie courte :

| Tour | git-data | REST court | | `PATCH` |
|---|---|---|---|---|
| 1 | `95f58d5` | `95f58d5` | accord | `200` |
| 2 | `bb6e463` | `95f58d5` | **désaccord** | **`422`** |
| 3 | `bb6e463` | `bb6e463` | accord | `200` |
| 4 | `bb6e463` | `d3ffb67` | **désaccord** | `200` |
| 5 | `bf0dc91` | `bf0dc91` | accord | `200` |
| 6 | `bf0dc91` | `bf0dc91` | accord | **`422`** |
| 7–10 | — | — | accord | `200` |

**2 désaccords sur 10, 2 rejets sur 10.** Trois faits en sortent :

- **Les deux voies peuvent être en retard** — au tour 4, c'est `git-data` qui l'était, pas la voie
  courte. Ce n'est donc pas « l'endpoint court est caché ».
- **L'accord ne garantit rien** : au tour 6 les deux voies s'accordaient, et le `PATCH` a été
  rejeté quand même. Les deux lectures étaient en retard ensemble.
- Le `422 Update is not a fast forward` **fait son office** : il refuse, il n'écrase pas. C'est
  exactement la propriété sur laquelle `FR-091` s'appuie.

> **Réserve.** Ce test enchaîne les publications aussi vite que le réseau le permet, sur la même
> ref. Une publication réelle est espacée et sérialisée par le verrou D1. **2/10 est un majorant
> obtenu en conditions adverses, pas un taux attendu en production.** Ce qui est établi, c'est que
> le taux **n'est pas nul** — donc que le réessai est obligatoire, pas que sa fréquence est connue.

## E — Les médias ne peuvent pas être inlinés

Un PNG de 70 octets passé en `content` :

| | Taille relue | Premiers octets | Verdict |
|---|---|---|---|
| Référence | 70 o | `89504e470d0a1a0a` | — |
| Inliné via `content` | **84 o** | `c289504e470d0a1a` | **CORROMPU** |
| Témoin `POST /git/blobs`, `encoding: base64` | 70 o | `89504e470d0a1a0a` | **IDENTIQUE** |

L'octet `0x89` est ressorti en `0xC2 0x89` : le contenu a été traité comme du texte UTF-8. L'arbre a
pourtant répondu **`201`** — la corruption est **silencieuse**, elle ne lève aucune erreur.

**Un média coûte donc 1 appel, et ce coût n'est pas mutualisable.**

---

## Le budget qui en découle

Pour une publication déposant `T` fichiers texte et `M` médias :

```
appels = 1 (préambule) + M (blobs médias) + 1 (arbre) + 1 (commit) + 1 (PATCH)
       = M + 4        ← T n'y figure plus
```

La section D impose de réserver un réessai. Un réessai après `422` **ne recrée pas les blobs** —
leurs SHA sont déjà connus — mais il refait tout le reste, le parent ayant changé :

```
réessai = 1 (préambule) + 1 (arbre) + 1 (commit) + 1 (PATCH) = 4

pire cas = M + 8 ≤ 50   →   M ≤ 42
```

| | Plafond |
|---|---|
| Fichiers texte par publication | **non contraint** (mesuré jusqu'à 1 000) |
| Médias par publication, un réessai réservé | **42** |
| Médias par publication, sans réessai | 46 |

**42 est le nombre à descendre en specs** : c'est celui qui survit au `422` mesuré en section D.

---

## Ce que cette mesure ne dit pas

- **Le plafond Cloudflare lui-même** n'a pas été revérifié (voir la réserve de méthode).
- **Le plafond réel de `POST /git/trees`** n'a pas été atteint : 1 000 entrées et 16 Mio par entrée
  passent, la limite est au-delà et reste inconnue.
- **La réécriture de la branche `media`** n'a pas été mesurée. Elle est non-avance-rapide, c'est
  l'objet de `S-03`, et son coût en appels s'ajoute à ce budget sans avoir été compté ici.
- **Le taux de `422` attendu en production** est inconnu ; seul son caractère non nul est établi.
- Rien ici ne tranche entre les parades. C'est à l'arbitrage de `S-04` de dire si l'on **amende le
  choix** (dépôt inliné pour le texte, médias étalés) ou si l'on **consigne une borne** en
  contrainte descendue en specs.
