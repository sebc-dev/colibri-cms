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

## Amendement 2026-08-01 — l'innocuité, les dépendances, et le mécanisme protégé de lui-même

Suites de l'[audit de sécurité du 1<sup>er</sup> août 2026](../audit-securite-2026-08-01.md) (lot L7).
Les six lots précédents ont traité **ce que le produit fait d'un contenu** — ce qui entre, ce qui
est rendu, ce qui est acheminé, ce qui est exposé ([ADR-0011](./ADR-0011-frontieres-de-contenu-hostile.md),
puis ADR-0004 (c), ADR-0010 (c), ADR-0007 (e), ADR-0003 (d)). Celui-ci traite l'autre objet :
**le dispositif qui vérifie ce code, et ce qui protège ce dispositif**. Six points, qui ferment
`B-14`, `C-17e`, `C-17f` et `D-09`.

Le premier n'est pas un oubli de rédaction : c'est une **question que cet ADR ne s'était pas
posée**.

**1. Le portail vérifie la conformité, pas l'innocuité** *(B-14)*.

Les quatre contrôles du § 7 répondent tous à la même question — *le code fait-il ce qu'on a
demandé ?* Aucun ne répond à l'autre — *fait-il **aussi** autre chose ?* Le point aveugle a une
forme précise, et il faut l'écrire parce qu'elle est ce qui rend le trou invisible : **tout ce qui
ajoute un comportement sans retirer de conformité** franchit les quatre.

- **Tests verts.** Un `fetch` vers un domaine attaquant, placé dans le seam d'envoi, ne casse
  aucune assertion : la malveillance est *orthogonale* à la spécification, et une spécification
  ne contraint que ce qu'elle nomme.
- **Score de mutation.** Il mesure si la suite attrape des bugs **injectés dans le code
  existant**. Une ligne *ajoutée* qui exfiltre ne fait pas baisser le score — la mutation testing
  est un méta-test de la suite, pas un contrôle du diff.
- **Frontières de dépendance.** `dependency-cruiser` vérifie **qui importe qui**. Un appel réseau
  sortant n'est pas un import : la topologie interne peut être irréprochable pendant que la donnée
  sort.
- **100 % des endpoints d'écriture testés pour l'autorisation.** Le contrôle vérifie que chaque
  endpoint **passe par** `writeHandler`. Une backdoor placée **dans** son `run` y passe
  parfaitement — elle est *derrière* l'autorisation, pas devant.

L'ADR est calibré sur « plausible mais subtilement faux » et sur la triche aux tests, c'est-à-dire
sur un générateur **bien intentionné mais faillible**. Le modèle de menace de ce point est un
**adversaire**, et le corpus nomme déjà les quatre par lesquels il peut arriver : un agent
générateur victime d'une injection (il traite du contenu hostile — c'est la prémisse d'ADR-0011) ;
une **dépendance compromise** (point 4) ; un **contributeur extérieur** (point 6) ; une session ou
un modèle compromis. Et l'enjeu n'est pas celui d'un dépôt ordinaire : le cœur est **publié sur
npm** et déployé fidèlement à toute la flotte par l'outillage d'ADR-0008 — c'est le mot d'`A-04`,
« le registre npm est le point unique de compromission de toute la flotte ». Une version
malveillante n'a pas besoin d'être découverte pour arriver partout ; elle a besoin d'être publiée.

**2. La frontière réseau : un seam, une allowlist, aucun hôte deviné** *(B-14, versant mécanique)*.

Un code malveillant qui n'a pas de chemin vers l'extérieur n'exfiltre rien. La frontière est donc
posée là où elle est **mécaniquement lisible** : les appels sortants.

- **Aucun appel réseau hors d'un fichier de seam déclaré.** La règle **ferme une topologie qui
  existe déjà à moitié** : ADR-0004 § f a nommé les seams `verifyAccessJwt` (JWKS), `sendMail` et
  Turnstile. Quatre autres chemins sortants existent sans porter ce nom, et le prennent ici — le
  **Deploy Hook** (POST à la publication), l'**API Workers Builds** (interrogée par le Cron), l'**API
  REST D1** du build, et l'**oEmbed** du build avec la récupération de vignette. Sept chemins, et
  aucun autre : un appel sortant écrit ailleurs échoue le portail, sans discussion sur son
  intention.
- **Chaque seam déclare ses hôtes dans une allowlist versionnée**, unique, à côté de la
  configuration des frontières. Son contenu, tel que le corpus le détermine :

  | Seam | Hôte(s) | Source |
  |---|---|---|
  | JWKS (`verifyAccessJwt`) | `<team>.cloudflareaccess.com` | ADR-0004 § f, amdt (c) point 5 — `createRemoteJWKSet` |
  | Turnstile (`siteverify`) | `challenges.cloudflare.com` | ADR-0007 (e) point 5, `stack.md` § Anti-spam |
  | Deploy Hook · API Workers Builds · API REST D1 du build | `api.cloudflare.com` — **trois usages distincts du même hôte** | ADR-0003 (c) et (d) points 2-3, `stack.md` § État de la mise en ligne |
  | oEmbed (build) | l'endpoint **en dur par fournisseur**, YouTube et Vimeo | ADR-0007 (e) point 8 |
  | `sendMail` | **aucun** — Cloudflare Email Service par *binding* | `stack.md` § Acheminement |

  La dernière ligne est écrite précisément parce qu'elle est vide : D1, R2, KV et l'envoi passent
  par des **bindings**, donc par aucun hôte. Un seam qui *acquerrait* un hôte — un mailer changé
  pour un fournisseur HTTP, par exemple — est exactement le changement qui doit déclencher la revue
  du point 3, et il ne le déclencherait pas si l'absence n'était pas déclarée.
- **Un hôte qui arrive comme donnée n'est pas un hôte déclaré.** C'est le cas non évident, et il
  est déjà dans le produit : la réponse oEmbed porte une `thumbnail_url` **sur un troisième hôte**,
  celui du CDN du fournisseur. Une allowlist de littéraux ne le couvre pas — l'adresse n'est pas
  dans le code, elle est dans la réponse. Un tel appel n'est donc permis qu'à travers un résolveur
  qui **valide l'hôte contre l'allowlist avant d'appeler**. Sans cela, la récupération de vignette
  est un SSRF que le corpus décrivait déjà (ADR-0007 (e) point 8) sans le nommer côté réseau.
  C'est la forme d'ADR-0011 § 4 appliquée au transport : **ne pas croire ce que la partie distante
  dit d'elle-même**.

Ce que ce point ne prétend pas : arrêter un adversaire déterminé. Un hôte composé par
concaténation, encodé, ou lu dans une variable d'environnement franchit l'allowlist. Il ferme la
forme **naïve** — qui est la forme probable — et pousse la forme sophistiquée dans un fichier qui
est lui-même sous revue humaine. C'est la raison d'être du point suivant, et non un aveu qu'on lui
oppose.

**3. Une revue humaine ciblée — et ce qu'elle renverse du brief** *(B-14, versant humain)*.

Il faut l'écrire frontalement plutôt que de le glisser. Le brief pose :

> « Le code entrant n'est pas relu ligne à ligne. Aujourd'hui parce qu'une seule personne construit
> le produit en s'appuyant sur la génération assistée par IA ; demain parce que l'open source peut
> amener des contributeurs extérieurs. Dans les deux cas la confiance ne peut pas reposer sur la
> relecture humaine : elle doit être établie par des vérifications mécaniques. »

Réintroduire une revue humaine **porteuse**, fût-elle ciblée, est un **renversement partiel de
cette prémisse**. On peut noter que les deux motifs du brief sont des motifs d'*échelle* — une
personne ne peut pas tout lire, des contributeurs viendront — et qu'une revue bornée n'y contrevient
donc pas littéralement ; ce serait se payer de mots. « Vérifications mécaniques » y désignait tout
le plancher de la confiance, et ce point en retire une part.

**Décision : la revue humaine est rétablie sur une surface bornée, et son déclenchement reste
mécanique.** C'est la seule ligne qui tienne :

- Le **déclencheur** est calculé par le portail et **bloquant**. Un diff qui touche un seam, un
  endpoint d'écriture nouveau, l'allowlist réseau, un manifeste de dépendances ou un fichier du
  mécanisme d'application **rougit le portail** jusqu'à approbation humaine explicite. Personne
  n'a à *penser* à relire : c'est très exactement le mode d'échec que le brief redoute, et il est
  fermé par la même famille de geste que le reste de l'ADR.
- La **surface** est bornée **par la forme** — une liste de chemins — et non par le jugement
  (« les parties importantes »). Une liste se vérifie ; un jugement dérive.
- Il n'existe **pas de substitut mécanique**. « Ce code exfiltre-t-il ? » n'est pas décidable par
  un linter au-delà de l'allowlist du point 2. L'alternative honnête n'est pas un meilleur
  automate : c'est d'accepter le résiduel sans revue.

*Alternative écartée* — accepter le résiduel, s'en tenir au point 2, et écrire le risque. Elle a
un mérite réel : elle laisse la prémisse du brief intacte. Elle est rejetée pour une raison
interne, qui décide : **le point 4 de ce même amendement est déjà une revue humaine.** Approuver
une dépendance nouvelle, c'est relire un diff. On ne peut pas refuser le principe au point 3 et
l'exercer au point 4 ; il faudrait renoncer aussi à la gouvernance des dépendances, c'est-à-dire à
`C-17e`.

*Ce que la décision coûte, écrit ici plutôt que découvert plus tard.* D'abord, aujourd'hui
l'approbateur est **la personne qui lance l'agent** : elle relit un diff qu'elle veut voir merger,
ce qui est un adversaire faible. La revue vaut contre un agent dévoyé ou une dépendance piégée,
pas contre une intention humaine. Ensuite, le marqueur d'approbation est lui-même un artefact du
dépôt, donc porteur de la même auto-référence que les hooks — d'où la chaîne du point 5. Enfin
c'est une friction réelle, et elle tombe sur les fichiers les plus touchés au début : les seams.
Le § « Seuils qui feraient reconsidérer » vaut ici tel qu'il est écrit — si la friction devient un
frein, on réévalue la **granularité** de la liste, jamais le principe.

**4. Aucune dépendance nouvelle sans approbation humaine** *(C-17e)*.

Le § 9 protège `tests/`, `migrations/`, `**/schema/`, la config des frontières et le seam d'auth.
Il ne protège ni `package.json`, ni le `catalog:`, ni le lockfile — or l'ajout d'une dépendance est
le geste par lequel du code que personne n'a écrit entre dans le produit. Le vecteur a un nom :
le **slopsquatting**, une IA qui hallucine un nom de paquet plausible qu'un attaquant a pris soin
d'enregistrer. Ce n'est pas une hypothèse d'école — c'est le mode d'échec le plus documenté de la
génération de code, et il est *silencieux* : le paquet s'installe, les tests passent.

**Décision : toute dépendance nouvelle — directe ou entrée du `catalog:` — est approuvée
explicitement par un humain**, et `package.json`, `pnpm-workspace.yaml` (qui porte le `catalog:`)
et `pnpm-lock.yaml` rejoignent les chemins possédés par l'humain du § 9.

Ce point **ne rejoue pas** ce qui a été tranché ailleurs : l'épinglage exact, `--frozen-lockfile`
en CI et la boucle de veille CVE appartiennent à ADR-0003 (d) point 6, qui renvoyait
**explicitement ici** la seule approbation d'une dépendance nouvelle. La division est nette et vaut
la peine d'être dite : la veille de (d) dit *qu'on sait* qu'une dépendance présente est devenue
vulnérable ; ce point-ci dit *ce qu'on fait avant qu'elle entre*. Aucune des deux ne rattrape le
défaut de l'autre — même forme qu'ADR-0011 § 1.

**5. Le mécanisme d'application protégé de lui-même** *(C-17f)*.

La liste du § 9 omet `.claude/hooks/`, `.claude/settings.json`, `.github/workflows/` et
`tooling/quality-gate/` : **le mécanisme d'application lui-même**. Une génération qui édite le hook
désactive tout le portail sans toucher une seule zone interdite. S'y ajoute, constaté à la
promotion d'[ADR-0009](./ADR-0009-portail-qualite.md), un cinquième chemin que personne n'avait
écrit : la **base de référence des mutants survivants**. ADR-0009 § 5 exige qu'elle soit « possédée
par l'humain (chemin protégé par le hook) » ; elle ne l'est pas, parce que la liste livrée est
celle du § 9 — antérieur à un artefact qu'ADR-0009 a inventé. Personne n'a écrit la jointure. Or
c'est elle qui tient le cliquet : le négatif qu'ADR-0009 assume (« un test creux peut vivre sur
`main` jusqu'au prochain passage du régime planifié ») n'est borné que **parce que le nightly
échoue** ; une baseline élargie le fait verdir.

Mais rallonger la liste ne suffit pas, et c'est le fond de ce point : **protéger les hooks par les
hooks est auto-référent.** Un hook désactivé ne refuse plus rien, **y compris sa propre édition**,
et `.claude/settings.json` décide si le hook s'exécute. La protection ne peut pas reposer sur
l'objet qu'elle protège.

**Décision : trois maillons, chacun cassant l'auto-référence du précédent.**

| Maillon | Où il s'exécute | Ce qu'il attrape | Comment il tombe |
|---|---|---|---|
| Hook `PreToolUse` | dans la session, **avant** l'écriture | le geste, à la source | édition de `.claude/settings.json` ou du hook |
| **Re-vérification par la CI** | **ailleurs**, sur une machine que l'agent ne pilote pas, à partir de **l'état du dépôt** et non de la session | le diff arrivé malgré le hook | édition de `.github/workflows/` |
| **Protection de branche + checks requis** | **sur le forge, hors du dépôt** | tout ce qui précède | rien qu'une écriture de fichier puisse faire |

La CI est ce qui casse la boucle, et il faut dire pourquoi plutôt que seulement qu'elle le fait :
elle ne demande pas au hook s'il a tourné — elle **relit le diff**. Un hook contourné n'efface pas
sa trace ; le fichier protégé apparaît dans le diff, et le contrôle échoue sur ce fait seul. La
preuve n'est plus le fonctionnement d'un garde, elle est le contenu d'un changement.

Reste que la configuration de la CI vit **dans** le dépôt. D'où le troisième maillon, sur le
forge, qui n'y vit pas. **Asymétrie assumée avec l'arbitrage d'ADR-0003 (d) point 1**, et écrite
pour n'être pas lue comme une contradiction : là-bas le motif de route dans le dépôt a été préféré
au *Bypass* du tableau de bord **parce que le portail peut lire le dépôt** ; ici le dernier rempart
doit vivre hors du dépôt **parce que l'agent peut écrire le dépôt**. Même raisonnement — placer le
contrôle là où l'adversaire du moment n'atteint pas —, deux modèles de menace, deux réponses
opposées.

**6. Les contributions externes, et un déclencheur qui a déjà sonné** *(D-09)*.

Le brief anticipe des contributeurs extérieurs ; rien ne définit protection de branche, revue
obligatoire, ni politique de divulgation de vulnérabilité. L'audit le classe faible en le jugeant
« théorique pré-V1, immédiat à l'ouverture du dépôt ».

**Le déclencheur a déjà sonné.** Vérifié le 2026-08-02 : le dépôt est **public**, la branche `main`
ne porte **aucune protection ni aucun *ruleset***, et il n'existe ni `SECURITY.md` ni `CODEOWNERS`.
La condition que l'audit et le plan de remédiation traitaient comme future est remplie depuis un
moment. Ce n'est donc pas une préparation : c'est une **action en retard**, et elle vaut plus que
son classement d'origine — la protection de branche est le troisième maillon du point 5, le seul
que l'édition d'un fichier ne peut pas désactiver.

**Décision : porté par cet ADR et par un `SECURITY.md` à la racine, sans ADR dédié.** La colonne
« Doc cible » du suivi proposait « ADR-0006 ou ADR dédié » ; le motif du choix est le grain.
`D-09` est un constat unique dont le contenu **est** la gouvernance du dispositif décrit ici — qui
peut merger, quelle re-vérification subit une contribution, où se signale une vulnérabilité. Ouvrir
`ADR-0012` produirait un ADR dont l'unique décision serait « écrire un fichier », et scinderait la
chaîne d'application du point 5 sur deux documents dont chacun renverrait à l'autre pour son motif
— l'argument par lequel ADR-0011 a refusé « un ADR par frontière ». `SECURITY.md` n'est pas une
décision d'architecture : c'est l'**artefact** que la décision produit, à l'endroit où un tiers
sait le chercher.

Contenu minimal : versions supportées (raccordées au SemVer d'ADR-0008), **canal de signalement
privé** et interdiction de l'issue publique — une vulnérabilité annoncée publiquement sur un cœur
déployé en flotte est une divulgation avant correctif —, délai de réponse annoncé, absence de
prime, et périmètre : le **cœur**, un projet client relevant de son intégrateur.

*Seuil qui ferait reconsidérer* : un flux de contribution réel — plusieurs mainteneurs, triage,
accord de contribution — rouvrirait la question par un ADR dédié. La décision ci-dessus vaut pour
un dépôt ouvert **sans** contributeurs réguliers, ce qui est l'état d'aujourd'hui.

*Ce que cet amendement ne ferme pas, nommé pour n'être pas rejoué :* l'allowlist réseau **n'atteint
pas le projet client**, hors du portail du cœur — le véhicule y est la règle ESLint livrée avec le
paquet et la checklist de provisionnement (ADR-0008, avec `A-03`) ; le retrait d'une version
compromise du cœur relève du « correctif de sécurité poussé » (`C-17i`, ADR-0008) ; et la cible de
test « aucun appel réseau du cœur ne sort de l'allowlist déclarée » revient à ADR-0005.

---

## Amendement 2026-08-02 (b) — la revue exigée, à l'endroit où elle peut vivre

La protection de branche appelée par l'amendement (a) a été posée le 2026-08-02. Elle a révélé une
**incohérence interne** de cet amendement, que sa rédaction seule ne montrait pas.

**Ce qui est en place.** Un *ruleset* actif sur la branche par défaut : pull request obligatoire,
force-push refusé, suppression refusée, **`bypass_actors` vide** — propriétaire compris —, et le
régime **par-changement** du portail (`quality-gate`) en **check requis**. Deux des trois exigences
de la contrainte sont donc tenues, et la troisième — « revue exigée » — n'a pas été posée.

**Pourquoi elle ne peut pas l'être.** La forge interdit d'approuver sa propre pull request, et le
dépôt a un **mainteneur unique**. Exiger une approbation sans second approbateur ne produit pas de
la sûreté : elle rend la branche par défaut **immergeable**. Et ce blocage a une issue naturelle,
inscrire le propriétaire en `bypass_actors` — c'est-à-dire détruire exactement ce qui fait du
troisième maillon le seul qu'une écriture de fichier ne désactive pas. **Une contrainte dont le
seul chemin d'application praticable est le contournement du mécanisme qu'elle sert est une
contrainte mal placée.**

**Et c'était déjà écrit ici.** Le **point 3** de l'amendement (a) pose que « l'approbateur est la
personne qui lance l'agent » et que « le marqueur d'approbation est lui-même un artefact du
dépôt ». La revue humaine y vit **dans le dépôt**, déclenchée par le portail. La contrainte, elle,
la plaçait **sur le forge**. Les deux ne pouvaient pas être vraies ensemble sur un dépôt à un seul
mainteneur ; la configuration n'a fait que rendre l'écart visible.

**Décision : la revue reste exigée, son lieu est corrigé.**

- Sur le **forge**, l'exigence est ramenée à ce qu'une forge peut tenir sans second humain — et
  **renforcée** là où elle le peut : PR obligatoire, aucun push direct, aucun force-push, aucune
  suppression, **aucun acteur en contournement**, portail en check requis. Ce que cela garantit
  tient en une phrase : **rien n'atteint la branche par défaut sans avoir été relu par le portail,
  et personne ne peut s'en dispenser.**
- La relecture **humaine** reste portée par le **point 3** : le portail refuse un diff touchant un
  seam, un endpoint d'écriture nouveau, l'allowlist réseau, un manifeste de dépendances ou le
  mécanisme d'application, tant que le marqueur d'approbation n'est pas porté. Marqueur dans le
  dépôt, vérification dans la CI, impossibilité de court-circuiter la CI sur le forge : **la chaîne
  des trois maillons du point 5 est intacte**, elle passe par trois artefacts au lieu de deux.

**Ce que la correction coûte, écrit plutôt que découvert.** Rien n'est perdu par rapport à l'état
réellement atteignable : l'approbation par un tiers n'a jamais été disponible sur ce dépôt. Ce qui
est perdu, c'est l'écrit qui laissait croire qu'elle l'était. Le résiduel reste celui que
l'amendement (a) nommait déjà — un approbateur qui relit un diff qu'il veut voir merger est un
adversaire faible ; la revue vaut contre un agent dévoyé ou une dépendance piégée, pas contre une
intention humaine.

**Seuil, et il est mécanique.** Dès qu'une **seconde personne a le droit de merger** sur ce dépôt,
`required_approving_review_count` passe à 1 et `require_last_push_approval` à vrai. Le geste est
nommé ici pour n'avoir pas à être re-décidé. C'est le seuil du point 6 de l'amendement (a) — « un
flux de contribution réel » —, ici avec sa configuration.

*Ce que cet amendement ne ferme pas, nommé pour n'être pas rejoué :* le **marqueur d'approbation**
et l'extension d'`estCheminProtege()` restent dus (lot L10, requis avant la première ligne du
cœur). Tant qu'ils manquent, le check requis passe au vert sur un diff que le portail ne sait pas
encore refuser — et il rend cet écart **plus** piégeur qu'avant, parce qu'il produit un vert qui
ressemble à une garantie.

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
- **INTERDIT** *(2026-08-01)* : tout appel réseau sortant hors d'un **fichier de seam déclaré** — JWKS, `sendMail`, Turnstile, Deploy Hook, API Workers Builds, API REST D1 du build, oEmbed du build ; il n'existe pas de huitième chemin sortant.
- **OBLIGATOIRE** *(2026-08-01)* : chaque seam déclare son ou ses hôtes dans l'**allowlist réseau** versionnée du dépôt, y compris quand la réponse est « aucun hôte » (accès par *binding*) ; **INTERDIT** un littéral d'URL vers un hôte qui n'y figure pas.
- **INTERDIT** *(2026-08-01)* : atteindre un hôte fourni **comme donnée** (p. ex. la `thumbnail_url` d'une réponse oEmbed) sans l'avoir validé contre l'allowlist **avant** l'appel.
- **OBLIGATOIRE** *(2026-08-01)* : le portail **refuse** tout diff touchant un seam, un endpoint d'écriture nouveau, l'allowlist réseau, un manifeste de dépendances ou un fichier du mécanisme d'application, tant qu'une **approbation humaine explicite** n'est pas portée ; **INTERDIT** que le déclenchement de cette revue dépende de la vigilance de qui que ce soit.
- **OBLIGATOIRE** *(2026-08-01)* : toute dépendance **nouvelle** (directe ou entrée du `catalog:`) est approuvée explicitement par un humain ; **INTERDIT** à l'IA d'éditer `package.json`, `pnpm-workspace.yaml` ou `pnpm-lock.yaml`.
- **INTERDIT** *(2026-08-01)* : à l'IA d'éditer le **mécanisme d'application** — `.claude/hooks/`, `.claude/settings.json`, `.github/workflows/`, `tooling/quality-gate/` et la base de référence des mutants survivants d'ADR-0009 § 5.
- **OBLIGATOIRE** *(2026-08-01)* : la **CI re-vérifie**, à partir du diff et non de l'exécution du hook, qu'aucun chemin protégé n'a changé sans approbation — la protection des hooks par les hooks étant auto-référente.
- ~~**OBLIGATOIRE** *(2026-08-01)* : la branche par défaut est protégée **sur le forge** — aucun push direct, revue exigée, régime **par-changement** du portail en **check requis** ; c'est le seul maillon hors du dépôt, donc le seul qu'une écriture de fichier ne peut pas désactiver.~~ **→ Nuancé le 2026-08-02** (amendement (b)) : « revue exigée » était placée sur le forge, où un dépôt à mainteneur unique ne peut pas la tenir sans se contourner lui-même. Remplacée par les deux contraintes suivantes.
- **OBLIGATOIRE** *(2026-08-02)* : la branche par défaut est protégée **sur le forge** — pull request obligatoire, aucun push direct, aucun force-push, aucune suppression, **aucun acteur en contournement** (`bypass_actors` vide, propriétaire compris), et le régime **par-changement** du portail en **check requis**. C'est le seul maillon hors du dépôt, donc le seul qu'une écriture de fichier ne peut pas désactiver.
- **OBLIGATOIRE** *(2026-08-02)* : l'exigence de relecture **humaine** est portée par le **marqueur d'approbation du dépôt** et son contrôle par la CI (point 3 de l'amendement (a)), non par un compte d'approbations sur le forge ; **OBLIGATOIRE** de porter `required_approving_review_count` à 1 et `require_last_push_approval` à vrai **dès qu'une seconde personne a le droit de merger**.
- **OBLIGATOIRE** *(2026-08-01)* : `SECURITY.md` à la racine — canal de signalement **privé**, délai de réponse, périmètre ; **INTERDIT** de signaler une vulnérabilité par une issue publique.

## Related
- Infrastructure de gouvernance (hooks/CI, propriété des fichiers) : ADR-0002.
- Seams testés / frontières verrouillées : ADR-0004.
- Taxonomie de test réutilisée : ADR-0005.
- Versions d'outillage (`fast-check`, Stryker, `dependency-cruiser`) à épingler : esprit d'ADR-0003.
- **Portail qui applique ces contrôles** *(2026-08-01)* : [ADR-0009](./ADR-0009-portail-qualite.md), promu `accepted` par le même lot — topologie, registre à source unique, contrat machine, *fail-closed* et cliquet de la baseline de mutation. L'amendement ci-dessus étend ce portail ; il ne le redéfinit pas.
- **Épinglage exact, `--frozen-lockfile` et veille CVE** *(2026-08-01)* : ADR-0003 amendement (d) point 6, qui renvoyait ici la seule **approbation d'une dépendance nouvelle**.
- Origine *(2026-08-01)* : [audit de sécurité du 2026-08-01](../audit-securite-2026-08-01.md), constats `B-14` (innocuité), `C-17e` (dépendances), `C-17f` (mécanisme d'application), `D-09` (contributions externes).
- Origine de l'amendement (b) *(2026-08-02)* : la pose effective de la protection de branche, qui a révélé une incohérence **interne** à l'amendement (a) — son point 3 place la revue humaine dans le dépôt, sa contrainte la plaçait sur le forge. Aucun constat d'audit nouveau ; `C-17f` (troisième maillon) et `D-09` (configuration du forge) en sont les lignes de suivi.
