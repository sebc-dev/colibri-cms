---
id: ADR-0006
title: Génération assistée par IA & portail de vérification
status: accepted
date: 2026-07-10
authors: [arborescence-digital]
scope: .claude/, tests/, docs/adr/
supersedes: []
superseded-by: null
depends-on: [ADR-0002, ADR-0004, ADR-0005]
---

# ADR-0006 — Génération assistée par IA & portail de vérification

**Statut :** accepted — 2026-07-10 · *scindé de l'ex-ADR-001 (volet IA)*

> **Pourquoi un ADR séparé.** ADR-0005 répond à « quoi/où tester ». ADR-0006 répond à « comment le code produit par IA est généré et verrouillé ». C'est un concern de **gouvernance de production**, pas de taxonomie de test — d'où la scission.

---

## Résumé exécutif

Utiliser l'IA pour générer le code **ne change pas quelles couches tester** (le trophée d'ADR-0005 tient) mais **déplace le mode d'échec** : d'un humain qui rate des cas limites, on passe à une IA qui produit du code *plausible, qui compile, mais subtilement faux* — API hallucinée, SQL confiant mais erroné, invariant violé sans bruit, contrôle d'accès qui *semble* présent. Le goulot passe d'**écrire** à **vérifier**. La stratégie optimise donc une seule chose : le **maximum de confiance vérifiée par ligne relue par un humain**, via des contrôles **mécaniques** qui ne supposent jamais que l'IA « a compris l'intention ». L'architecture d'ADR-0004 est anormalement bien taillée pour ça : ses seams (schémas Zod, contrat `@colibri/db`, `writeHandler`, `AssetResolver`, frontières ESLint) sont à la fois des cibles de test **et** des specs de prompt.

---

## Contexte

- Le code métier V1 est produit par génération IA (Claude Code Max), pas écrit ligne à ligne.
- Mode d'échec IA : fort sur le happy-path, faible sur « ce qui n'était pas dit ». Les bugs sont *plausibles*, donc échappent à une relecture rapide.
- Risque neuf et spécifique : une IA à qui l'on demande « fais passer les tests » peut **tricher avec ses propres tests** (affaiblir un test, sur-ajuster à l'assertion, mocker précisément ce qui est sous test, avaler l'erreur dans un `catch`, mettre à jour un golden pour verdir un snapshot).
- Levier disponible : ADR-0004 a déjà rendu les invariants *lisibles par machine* (types, schémas, interfaces, frontières).

---

## Décision

### 1. Inversion test-first : le test est l'artefact humain
Séquence par tranche : **l'humain pose le schéma Zod + le test rouge** (le contrat) ; **l'IA génère l'implémentation jusqu'au vert**. Un test qui échoue + un schéma sont un prompt bien plus précis que de la prose. L'humain relit **les tests** (petits, denses), pas l'implémentation ligne à ligne (chère, régénérable). Le test devient l'artefact possédé.

### 2. Property-based sur `@colibri/core` (fast-check)
L'IA écrit du code plausible qui casse sur les entrées qu'elle n'a pas explorées ; les tests de propriété balaient l'espace mécaniquement. Trois cibles pures :
- **slug** : idempotence (`slugify(slugify(s)) === slugify(s)`), jamais de caractère réservé, sur `fc.string()`.
- **`toBlocks`** : ne perd jamais un nœud (invariant de préservation structurelle).
- **verrou (`lock`)** : deux `updated_at` différents ⇒ toujours rejet.

### 3. Mutation testing sur `@colibri/core` (Stryker) — l'ajout le plus important
Le danger neuf n'est pas le test rouge, c'est **le test vert qui ne vérifie rien**. La mutation testing est le **méta-test** : elle injecte des bugs et vérifie que la suite les attrape. Un score de mutation sur `renderer`/`slug`/`lock` dit si les tests protègent *réellement*. **Cantonnée au `core` pur** (rapide, déterministe) — pas sur toute la base.

### 4. Frontières de dépendance comme barrière CI
`dependency-cruiser` / ESLint `no-restricted-paths` : un import de Cloudflare dans `core`, ou d'`apps` dans `db`, **casse la CI**. L'IA « aime » importer directement ; sans cette barrière, la topologie d'ADR-0004 s'érode à chaque génération.

### 5. Propriété des fichiers : humain vs IA
| Possédé par l'**humain** (l'IA ne modifie pas) | Généré par l'**IA** |
|---|---|
| Tests d'acceptation / d'intégration | Repositories (intérieur) |
| Schémas Zod (`Row`/`Input`) | Endpoints minces (`writeHandler({...})`) |
| Migrations D1 | Îlots React |
| Config des frontières (ESLint/dep-cruiser) | Intérieur du renderer (`toBlocks`) |
| Seam d'auth (résolution JWKS) | Pages du site (SSG) |

### 6. Goldens jamais auto-acceptés
Un changement de snapshot est une **revue humaine**, pas un `--update` lancé par l'IA.

### 7. Portail de merge non-négociable
Une tranche ne merge pas tant que **tous** sont verts :
- intégration workerd (ADR-0005) verte ;
- **score de mutation** du `core` touché ≥ seuil ;
- **frontières** de dépendance OK ;
- 100 % des endpoints d'écriture testés pour l'autorisation.

### 8. Pas de couverture-ligne comme cible
L'IA sait gonfler la couverture avec du bruit (fausse confiance, vrais tests noyés). On garde l'objectif **orienté risque** d'ADR-0005, pas un pourcentage global.

### 9. Outillage Claude Code (là où le levier est le plus haut)
Encoder les garde-fous dans l'outillage plutôt que dans la discipline :
- **Hook** post-génération : lance mutation + frontières sur le **diff** ; rouge ⇒ pas de merge, l'IA re-génère.
- **Hook** de protection : **refuse toute édition** dans `tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth.
- **Skill `/slice`** : impose la séquence **schéma → test rouge → implémentation** pour toute nouvelle tranche.
- **Golden lock** : interdit `--update`/`-u` sur les snapshots.

---

## Workflow concret (par tranche)
1. **Humain** : schéma Zod (`Row`/`Input`) + test rouge (le contrat).
2. **IA** : implémente jusqu'au vert.
3. **Portail auto** (hook/CI) : intégration workerd + mutation sur le `core` touché + frontières. Rouge ⇒ re-génération.
4. `writeHandler` testé **une fois, à fond** (toutes les branches JWT/CSRF/Zod/authz/409) ; chaque nouvel endpoint n'a plus qu'un test mince « passe par le pipeline + son `run` ». L'IA ne *peut pas* livrer un endpoint sans auth (structurel, ADR-0004) **et** un test l'affirme (comportemental).

---

## Conséquences

### Bénéfices
- Le mode d'échec IA (plausible-mais-faux) est attrapé par des contrôles mécaniques, pas par la relecture.
- La mutation testing neutralise le risque « tests verts qui ne vérifient rien ».
- Les frontières empêchent l'érosion de l'architecture à chaque génération.
- L'humain relit des tests (petits) au lieu d'implémentations (grandes) → débit soutenable.

### Risques / vigilance
- **Coût CI de la mutation testing** → cantonner strictement au `core` pur.
- Dépendance à la stabilité de `vitest-pool-workers` (beta, ADR-0005) pour le portail d'intégration.
- Discipline de propriété des fichiers : sans les hooks, l'IA finira par éditer un test.

---

## Anti-patterns à proscrire (spécifiques IA)
- **Laisser l'IA modifier ses propres tests / schémas / migrations** pour verdir.
- **Sur-mocker** précisément ce qui est sous test.
- **Avaler l'erreur** dans un `catch` silencieux pour faire passer.
- **`--update` de golden** par l'IA.
- **Viser un % de couverture** au lieu du risque.
- **Relire l'implémentation ligne à ligne** au lieu de posséder le test.

---

## Seuils qui feraient reconsidérer
- Si le score de mutation du `core` reste bas malgré des tests verts → renforcer les tests **avant** d'accepter de nouvelles tranches générées.
- Si le coût de la mutation testing dépasse le budget CI → l'exécuter en nightly/pré-merge ciblé plutôt qu'à chaque PR.
- Si les hooks Claude Code deviennent un frein → réévaluer la granularité des répertoires protégés, pas le principe.

---

## Caveats
- **Versions d'outillage** (`fast-check`, Stryker, `dependency-cruiser`) **à épingler au jour de l'installation** — non figées ici, dans l'esprit d'ADR-0003.
- **Aucune source ne prescrit ce régime pour ce stack précis** : il compose des pratiques établies (test-first, property-based, mutation, boundaries) — inférence raisonnée, à valider à l'usage.
- La séparation humain/IA des fichiers est un **contrat opérationnel** : sa valeur dépend entièrement de l'application par les hooks.

---

## Alternatives Considered
- **Couverture-ligne comme cible.** *Rejeté* : l'IA sait la gonfler avec du bruit → fausse confiance ; on garde l'objectif orienté-risque.
- **Pas de mutation testing.** *Rejeté* : sans méta-test, rien n'attrape les « tests verts qui ne vérifient rien » produits par l'IA.
- **Laisser l'IA écrire ses propres tests/schémas.** *Rejeté* : ouvre la triche (test affaibli, sur-mock, `catch` silencieux, golden mis à jour).
- **Auto-générer CLAUDE.md / fichiers de contexte en masse.** *Rejeté* : évidence empirique (Gloaguen et al., 2026) — les fichiers générés par LLM font *baisser* le taux de succès (~-3 %) et coûtent >20 % d'inférence ; les fichiers écrits à la main n'apportent que ~+4 %.

## Constraints
> Compilées en hooks Claude Code + portail CI (cf. ADR-0002).
- **INTERDIT** à l'IA d'éditer : `tests/`, `migrations/`, `**/schema/`, la config des frontières, le seam d'auth (JWKS).
- **OBLIGATOIRE** : séquence par tranche = schéma Zod (humain) → test rouge (humain) → implémentation (IA) jusqu'au vert.
- **OBLIGATOIRE** : portail de merge = intégration workerd verte **+** score de mutation du `core` touché ≥ seuil **+** frontières OK **+** 100 % endpoints écriture testés pour l'autorisation.
- **INTERDIT** : `--update` / `-u` de golden par l'IA (revue humaine obligatoire).
- **INTERDIT** : viser un pourcentage de couverture-ligne.

## Related
- Infrastructure de gouvernance (hooks/CI, propriété des fichiers) : ADR-0002.
- Seams testés / frontières verrouillées : ADR-0004.
- Taxonomie de test réutilisée : ADR-0005.
- Versions d'outillage (`fast-check`, Stryker, `dependency-cruiser`) à épingler : esprit d'ADR-0003.
