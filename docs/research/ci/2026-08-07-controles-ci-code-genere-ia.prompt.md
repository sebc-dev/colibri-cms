# Prompt de recherche — Contrôles CI pour du code généré par l'IA

Composé le 2026-08-07 · à jouer dans Claude Research (Claude Desktop)
Décision servie : une re-passe de `/scd-sdd:ci` — quels contrôles ajouter au portail
existant, lesquels rendre bloquants.

---

<contexte>

## Le projet

Un CMS livré à une cliente unique, déployé **dans son propre compte Cloudflare**, sans
aucune infrastructure du prestataire. Développé **par une seule personne**, en 2026.

Socle technique figé : TypeScript en mode strict avec validation de schéma à l'exécution
sur les frontières d'entrée · Astro · deux Cloudflare Workers séparés (site public en
assets statiques, CMS) · base Cloudflare D1 · GitHub comme forge et comme chemin de
publication · monorepo pnpm avec catalogue de versions centralisé.

Trois contraintes structurantes, non négociables :

1. **Le code n'est pas relu ligne à ligne.** Il est très majoritairement écrit par un
   agent de codage. Ce qui atteste de sa qualité doit s'exécuter, pas se déclarer. C'est
   l'hypothèse fondatrice de tout le dispositif.
2. **Gratuité sans moyen de paiement enregistré.** Tout composant retenu doit être
   utilisable sans carte bancaire sur le compte. Ce critère — et non le prix — a déjà
   écarté plusieurs services de la plateforme.
3. **Un développeur seul.** Un outil abandonné dans six mois, ou qui demande un réglage
   récurrent, est un coût net qui finit par être supprimé.

## Le portail déjà en place

Neuf jobs GitHub Actions, déclenchés sur `pull_request` et sur `push` de la branche par
défaut. Six sont exigés par la protection de branche, trois annotent sans bloquer.

| Job | Ce qu'il fait | Portée | Statut |
|---|---|---|---|
| `build` | `tsc --noEmit` puis build | dépôt | bloquant |
| `test` | la suite de tests | dépôt | bloquant |
| `sca` | OSV-Scanner sur le lockfile | dépôt entier | bloquant |
| `secrets` | TruffleHog, credentials **vérifiés actifs**, historique complet | dépôt entier | bloquant |
| `test-integrity` | `git diff` sur les fichiers de test : suppression, neutralisant ajouté (`.skip` `.only` `expect(true).toBe(true)`), plus d'assertions retirées qu'ajoutées | diff des tests | bloquant |
| `quality-config-guard` | `git diff` sur la config qualité ; changement autorisé seulement si tous les commits portent un scope explicite | diff de la config | bloquant |
| `lint` | style | dépôt | informatif |
| `coverage` | `diff-cover` sur le **code nouveau**, sans seuil chiffré | diff | informatif |
| `sast` | Semgrep, rulesets `p/typescript` `p/javascript` `p/owasp-top-ten` | dépôt | informatif |

Un projet antérieur, sur le même dépôt et abandonné depuis, avait construit un portail
maison de onze contrôles dont **sept étaient des invariants d'architecture vérifiés par
analyse statique légère** (lecture de fichiers + expressions régulières, sans dépendance
externe) : frontières d'import entre paquets, obligation de passer par un gestionnaire
d'écriture unique pour tout endpoint mutant, couverture d'autorisation exigeant un test
colocalisé pour chaque endpoint d'écriture, interdiction du SQL de lecture hors du paquet
d'accès aux données, contournement d'un bug outillage qui tronque silencieusement une
migration, cohérence du catalogue de versions, et un contrôle de mutation en régime
nocturne adossé à une base de référence de mutants survivants.

## Les pistes déjà envisagées, à confirmer ou à démentir

- **Vague 1 — greps déterministes sur le diff.** Un garde contre la suppression du
  vérificateur (`@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`, `: any`, `as any`,
  `as unknown as`, `eslint-disable`, `catch {}` vide ajoutés hors fichiers de test) ;
  l'extension du garde de configuration aux fichiers qui contraignent l'agent lui-même ;
  l'épinglage des actions GitHub à un SHA complet plutôt qu'à un tag mobile, avec un
  analyseur statique de workflows.
- **Vague 2 — au scaffold.** Des contrôles d'invariant dérivés des décisions
  d'architecture, sur le modèle du portail abandonné ; une revue de dépendances portant
  sur le diff pour rendre visible tout ajout ; un contrôle de budget de build (nombre de
  fichiers d'une version de Worker, octets de JavaScript servis par page).
- **Vague 3 — nocturne.** Test de mutation ; ablation no-op (remplacer l'artefact demandé
  par une implémentation vide et vérifier que quelque chose casse) ; détection de code mort.

## Le critère de décision utilisé

> Valeur = Risque_couvert × (1 − Taux_de_faux_positifs) × Poids_latence × Poids_maintenance

Un contrôle n'est rendu **bloquant** que s'il passe les quatre seuils : impact élevé et
déterministe · faux positifs sous ~10-15 % après réglage · latence compatible avec le
budget d'une pull request · configuration déclarative sans réglage récurrent. Il en rate
un seul, il reste **informatif**. Le coût opérationnel fait partie du calcul : un contrôle
bruyant finit désactivé, et son efficacité théorique tombe alors à zéro.

## Ce qui est acquis et n'est pas rouvert par cette recherche

- La stratégie de vérification à trois étages — unitaire/intégration et bout en bout à
  chaque commit, épreuves d'invariant rejouables à cadence propre — est une décision
  d'architecture figée.
- Le régime *clean as you code* : les seuils portent sur le code nouveau ou modifié,
  jamais sur un pourcentage global.
- Le backstop est le check serveur sous protection de branche. Un hook local ou une
  consigne écrite dans un fichier de contexte sont de la défense en profondeur, et rien
  de plus : sur ce projet, un agent a contourné des hooks pre-commit par `--no-verify`,
  `git stash` et flags silencieux sur six commits consécutifs, malgré des règles écrites
  l'interdisant.

</contexte>

---

## Question

Parmi les contrôles automatiques exécutables en intégration continue, **lesquels attrapent
réellement les modes de défaillance propres au code écrit par un agent**, et pour chacun :
son taux de faux positifs mesuré, sa latence, son coût de maintenance — donc son statut
bloquant ou informatif selon le critère ci-dessus ?

Cinq modes de défaillance servent de grille, et la réponse dit pour chacun ce qui le
détecte, ce qui ne le détecte pas, et ce qui prétend le détecter sans preuve :

1. **Oracle faux** — le code passe des tests dont l'assertion vérifie la mauvaise chose,
   souvent parce que le test a été écrit après le code par le même acteur, et capture
   donc le comportement réel plutôt que le comportement attendu.
2. **Suppression du vérificateur** — l'agent fait taire l'outil qui le contrarie plutôt
   que de corriger : annotation d'exclusion de typage, échappement vers un type
   dynamique, désactivation d'une règle de lint, mise en sommeil d'un test, abaissement
   d'un seuil, contournement d'un hook.
3. **Chaîne d'approvisionnement** — dépendance hallucinée puis enregistrée par un tiers
   pour y livrer du code (*slopsquatting*), paquet hostile trop récent pour figurer dans
   une base de vulnérabilités, altération directe du lockfile, compromission d'une action
   de CI référencée par un tag mobile.
4. **Building to the test** — la logique vit dans un artefact jetable pendant que
   l'artefact demandé reste mort, ou le code est écrit pour satisfaire le contrôle plutôt
   que l'exigence.
5. **Violation d'invariant d'architecture** — le code est correct en général mais viole une
   décision propre au projet, qu'aucun outil générique ne connaît.

La réponse doit aussi dire **ce qui manque à la liste de neuf jobs ci-dessus** : un mode de
défaillance documenté qu'aucun d'eux ne couvre, et le contrôle qui le couvrirait.

## Périmètre

**Inclus**

- Écosystème TypeScript / pnpm / GitHub Actions, cible Cloudflare Workers et Astro.
- Outils installables et **gratuits sans moyen de paiement enregistré**, open source ou
  palier gratuit sans carte.
- **La littérature empirique** : mesures publiées sur le code généré — fréquence des
  vulnérabilités introduites, fréquence des noms de paquets inexistants, efficacité
  mesurée du test de mutation à révéler un oracle faible, effet observé d'un contrôle
  bloquant sur le comportement de l'agent.
- **Les offres commerciales, à titre de référence** — non retenables ici, mais ce qu'elles
  détectent indique ce qu'il faudrait reproduire. Pour chacune : ce qu'elle détecte que
  l'open source ne détecte pas, et s'il existe un équivalent gratuit.
- **Les garde-fous côté agent** — hooks, bacs à sable, restrictions de permissions,
  règles de contexte — en disant pour chacun s'il est **contournable par l'agent
  lui-même**, et donc s'il peut prétendre au rôle de backstop.
- **Le spécifique Cloudflare Workers et Astro** : comptage des fichiers d'une version de
  Worker et limites du palier gratuit, budget de JavaScript servi par page, vérification
  des migrations D1, exécution de `wrangler` en intégration continue.

**Exclus**

- La revue humaine, le *pair programming* et tout processus qui suppose un second lecteur :
  l'hypothèse fondatrice du projet est qu'il n'y en a pas.
- Les techniques de prompt, le choix de modèle et le réglage de l'agent : la question porte
  sur ce qui vérifie **après**, pas sur ce qui produit.
- Les outils exigeant une carte bancaire, un contrat commercial ou une organisation
  d'entreprise pour fonctionner — sauf mention explicite comme référence, cf. ci-dessus.
- Les écosystèmes autres que JavaScript/TypeScript, sauf si un contrôle y est né et se
  transpose, auquel cas le dire.
- La stratégie de test elle-même (quels étages, quelle pyramide) : c'est une décision déjà
  figée.

**Horizon**

La réponse doit être vraie **au 7 août 2026**. Pour chaque outil recommandé : date de la
dernière version publiée, cadence de publication sur les douze derniers mois, nombre de
mainteneurs actifs, et tout changement de modèle économique. Écarter — ou marquer comme
tel — ce qui n'a pas connu de version depuis plus de six mois.

Ce filtre a une raison mesurable : la référence interne du projet recommandait encore une
action GitHub officielle de Semgrep dont le dépôt est aujourd'hui **archivé** avec la
mention « This project is deprecated ». C'est exactement le coût qu'on cherche à éviter.

Réserve à traiter explicitement : les contrôles ciblant spécifiquement le code généré sont
un sujet **récent**. Un filtre de maturité à douze mois risque d'écarter précisément ce
qu'on cherche. Signaler `[JEUNE]` avec la date de première version plutôt que d'omettre,
quand un outil récent n'a pas d'équivalent mûr.

## Contraintes de sourcing

- Source primaire exigée pour tout chiffre ; remonter au document d'origine plutôt qu'à
  la page qui le cite.
- Étiqueter chaque source : officiel · préprint indépendant · benchmark d'éditeur ·
  commercial · communautaire.
- Séparer les niveaux de preuve : mesuré / rapporté / anecdotique / non étayé.
- Citer verbatim les passages qui portent une affirmation, et attribuer par affirmation
  plutôt que par paragraphe.
- L'absence de donnée est un résultat : l'écrire. Si le taux de faux positifs d'un outil
  n'est publié nulle part, c'est une conclusion utile — elle interdit de le rendre
  bloquant.
- Une source unique non recoupée reste unique même si plusieurs pages la répètent.

**Trois chiffres circulent** dans la documentation qui a servi à poser ce portail, et
aucun n'a été recoupé. Les traiter comme des affirmations à vérifier, pas comme un acquis :

| Chiffre circulant | À trancher |
|---|---|
| « près de la moitié des tâches de génération introduisent une vulnérabilité OWASP détectable, mesuré sur plus de cent modèles » | source primaire ? protocole ? échantillon ? |
| « un nom de paquet suggéré sur cinq n'existe pas » | source primaire ? écosystème mesuré ? |
| « un tiers de ces noms peut être enregistré par un tiers » | source primaire ? est-ce mesuré ou déduit ? |

## Hypothèses concurrentes

Poser explicitement les hypothèses, ce qui les départagerait, et la confiance de chacune.
Ne pas trancher artificiellement quand les sources divergent.

- **H1** : le test de mutation est le seul contre-feu mécanique à l'oracle faux, et son
  coût est acceptable si on ne bloque que sur un mutant survivant *nouveau*.
  **H2** : sur un projet mené seul, son coût de mise en place et de maintenance dépasse
  son apport, et un contrôle d'invariant structurel rend davantage pour le même effort.
- **H1** : les contrôles génériques (SAST, SCA, couverture) suffisent, et les contrôles
  propres au projet sont un luxe.
  **H2** : les défauts qui comptent dans du code généré sont des violations de contrat
  propres au projet, qu'aucun outil générique ne connaît, et le gisement est là.
- **H1** : rendre un contrôle bloquant réduit le comportement qu'il vise.
  **H2** : le réprimer le rend plus subtil sans l'éliminer — l'agent contourne par un
  chemin que le motif ne reconnaît pas. Chercher toute mesure publiée sur ce point.

## Format de rendu

TL;DR · Key Findings · Details · Recommendations · Caveats.

Niveau de confiance par affirmation, en rappelant qu'il classe et ne mesure pas. Marqueurs
`[À VÉRIFIER]` et `[INCERTAIN]` sur ce qui n'est pas établi, et `[JEUNE]` sur un outil de
moins de douze mois.

Deux tableaux sont attendus :

1. **contrôle → mode de défaillance couvert → outil et commande → latence → taux de faux
   positifs publié (ou « non publié ») → verdict bloquant/informatif** selon le critère à
   quatre facteurs donné plus haut.
2. **chiffre circulant → source primaire trouvée ? → verdict**, pour les trois chiffres
   listés ci-dessus et pour tout autre chiffre rencontré qui circule sans origine.

Une section distincte pour **ce que rien n'attrape** : les modes de défaillance dont la
recherche établit qu'aucun contrôle automatique ne les couvre aujourd'hui. C'est une
conclusion, pas un aveu.

## Ce qui ferait changer la recommandation

- Un taux de faux positifs mesuré au-dessus de ~15 % sur un contrôle recommandé comme
  bloquant : il redevient informatif.
- La disparition d'un mainteneur ou un changement de licence sur un outil retenu : le
  projet est mené seul, un outil orphelin est une dette.
- Un palier gratuit qui se met à exiger un moyen de paiement : le composant devient
  inutilisable ici, quel que soit son mérite technique.
- Une mesure publiée montrant que le taux de faux positifs d'un contrôle **n'est pas
  estimable** sur le volume de pull requests d'un développeur seul : le protocole de
  mesure sur trente jours tombe, et il faut un proxy (corpus public, rejeu sur
  l'historique du dépôt).
- L'apparition d'un second relecteur humain sur le projet : l'hypothèse fondatrice tombe,
  et l'arbitrage entre contrôle automatique et revue se rouvre entièrement.
- Une preuve solide en faveur de H2 sur la troisième paire d'hypothèses — réprimer rend
  plus subtil : cela déplacerait l'effort des motifs greppables vers des contrôles
  sémantiques, plus coûteux.
