# Contrôles CI — ColibriCMS

| | |
|---|---|
| **Statut** | Actif |
| **Date** | 2026-08-08 (re-passe · 1<sup>re</sup> écriture le 2026-08-07) |
| **Trace vers** | [Stack](./stack.md) · [ADR-0012](./adr/0012-strategie-de-test-a-trois-etages.md) · [ADR-0006](./adr/0006-typescript-strict-validation-aux-frontieres.md) · [ADR-0010](./adr/0010-github-forge-et-chemin-de-publication.md) |
| **Adossé à** | [Contrôles CI du code généré par agent](./research/ci/2026-08-07-controles-ci-code-genere-ia.md) — rapport du 2026-08-07 |
| **Forge** | GitHub Actions — `.github/workflows/ci.yml` · `.github/workflows/nightly.yml` |
| **Consommé par** | `CLAUDE.md` (phase `contract`), qui lit ses commandes ici plutôt que de les inventer |

> **Ce que ce document est.** La synthèse de ce qui est **vérifié hors de l'agent**. Le
> contrôle réel est le fichier de workflow ; ce document en donne la portée, le statut et
> les limites. `CLAUDE.md` peut conseiller — seul le check serveur sous protection de
> branche refuse.
>
> **Pourquoi cette phase existe.** Le niveau implémentation atteste **de lui-même** que les
> tests sont intacts : il lance `git diff` sur les fichiers de test et retourne
> `testsUntouched: true`. Le producteur est son propre vérificateur — ce que le cycle refuse
> partout ailleurs. La CI est le seul endroit où cette affirmation est vérifiée par un tiers.

---

## Ce que la re-passe du 2026-08-08 a corrigé

**Deux références d'image du portail du 2026-08-07 n'existaient pas.** Relevé au registre :

| Écrit le 2026-08-07 | Réponse du registre | Tag réel |
|---|---|---|
| `semgrep/semgrep:v1.172.0` | **HTTP 404** | `1.172.0` — sans `v` |
| `ghcr.io/trufflesecurity/trufflehog:v3.96.0` | **manifeste absent** | `3.96.0` — sans `v` |

Les jobs `sast` et `secrets` auraient échoué au `docker pull`, pas sur un finding. Une
version supposée « marche ou casse au premier run » — ici elle cassait, ce qui est le cas
favorable ; le cas défavorable est celle qui marche et n'est pas celle qu'on croit. Les deux
images sont désormais **épinglées au digest**, qui lui n'est pas mobile.

Trois contrôles bloquants sont ajoutés, et le régime nocturne est ouvert. Le détail est
dans les sections correspondantes ; le motif tient en une phrase : le rapport de recherche
établit que **le gisement est dans les contrôles propres au projet**, pas dans l'outillage
générique, et que trois trous du portail précédent se ferment à coût quasi nul.

---

## L'état du dépôt au moment où cette phase est jouée

**Le dépôt ne porte encore aucun code** : ni `package.json`, ni `pnpm-lock.yaml`, ni source.
La branche `main` porte un projet antérieur, abandonné ; ses commandes (`pnpm gate`) et son
portail `@colibri/quality-gate` **ne sont pas** celles de ce projet.

Deux conséquences, toutes deux assumées :

1. Les commandes du tableau ci-dessous sont **normatives, pas constatées** : elles fixent
   les noms de scripts que le scaffold devra honorer. Le premier commit de code qui ne les
   fournit pas fera échouer `build` ou `test` — c'est l'effet recherché.
2. Les jobs qui en dépendent portent une **garde de scaffold** : ils testent la présence de
   `package.json` et se déclarent hors portée tant qu'il n'existe pas. **Ils passent alors
   au vert sans rien vérifier.** C'est un mensonge par construction, borné dans le temps, et
   il est écrit ici pour qu'il ne soit pris pour une garantie par personne.

Le gestionnaire de paquets retenu est **pnpm** — repris de l'outillage établi du développeur ;
`docs/stack.md` ne le tranche pas. Si le scaffold en retient un autre, **ce document et les
workflows sont à reprendre ensemble** : le cooldown de dépendances, en particulier, est une
mécanique propre à pnpm.

---

## Commandes du projet

Ce tableau est la source unique. `CLAUDE.md` y renvoie, il ne le recopie pas.

| Rôle | Commande | État |
|---|---|---|
| Installation | `pnpm install --frozen-lockfile` | Réelle — jamais `pnpm install` nu |
| Build | `pnpm build` | **Normative** — à honorer au scaffold |
| Typage | `pnpm typecheck` (`tsc --noEmit`, cf. ADR-0006) | **Normative** |
| Tests | `pnpm test` | **Normative** |
| Couverture | `pnpm coverage` → `coverage/lcov.info` | **Normative** |
| Lint / format | `pnpm lint` | **Normative** |
| Code mort (nocturne) | `pnpm knip` (knip 6.32.0) | **Normative** |
| Mutation (nocturne) | `pnpm mutation` (`@stryker-mutator/core` 9.6.1, `--incremental`) | **Normative** |
| Couverture du diff | `diff-cover coverage/lcov.info --compare-branch=origin/main` | Réelle (`diff-cover` 10.4.2) |
| SCA | `google/osv-scanner-action/osv-scanner-action@v2.5.0` sur `pnpm-lock.yaml` | Réelle |
| Secrets | `trufflehog git file:///repo --results=verified --fail` (image `3.96.0`) | Réelle |
| SAST | `semgrep scan --config=p/typescript --config=p/javascript --config=p/owasp-top-ten` (image `1.172.0`) | Réelle |
| Audit des workflows | `zizmorcore/zizmor-action@v0.6.2` (zizmor 1.29.0, hors ligne) | Réelle |

**Le lockfile est committé et l'installation verrouillée.** Sans version figée, la SCA
scannerait autre chose que ce qui sera installé : elle ne prouverait rien.

---

## Contrôles

| # | Job | Contrôle | Portée | Statut | Couvre |
|---|---|---|---|---|---|
| 1 | `build` | Build + typage strict | dépôt (garde de scaffold) | **Bloquant** | contrat d'API, null-safety, code qui ne compile pas |
| 2 | `test` | Suite de tests | dépôt (garde de scaffold) | **Bloquant** | régression fonctionnelle |
| 3 | `sca` | OSV-Scanner sur lockfile | **dépôt entier** | **Bloquant** | CVE connue, y compris en dépendance transitive |
| 4 | `deps-policy` | Cooldown pnpm + visibilité des variations | dépôt + diff du lockfile | **Bloquant** | paquet halluciné puis enregistré, version compromise trop récente pour une base de CVE |
| 5 | `secrets` | TruffleHog, credentials **vérifiés** | **dépôt entier + historique** | **Bloquant** | secret en dur, secret laissé dans l'historique |
| 6 | `workflow-audit` | zizmor sur `.github/workflows/` | fichiers de workflow | **Bloquant** | action remplacée sous un tag mobile, permissions trop larges, injection de gabarit |
| 7 | `test-integrity` | Intégrité des tests | diff des tests | **Bloquant** | subversion des tests par l'agent |
| 8 | `suppression-guard` | Suppression du vérificateur, sous signature | diff des sources | **Bloquant** | `@ts-ignore`, `as any`, `eslint-disable`, `catch {}` vide |
| 9 | `quality-config-guard` | Config qualité et fichiers d'agent figés | diff de la config | **Bloquant** | seuils abaissés, contrôle désactivé, consigne d'agent réécrite |
| — | `lint` | Style | dépôt (garde de scaffold) | Informatif | lisibilité |
| — | `coverage` | Couverture du **code nouveau** | diff | Informatif | zone non testée introduite par la PR |
| — | `sast` | Semgrep | dépôt | Informatif | injection, XSS, path-traversal |
| — | `dead-code` | knip (**nocturne**) | dépôt | Informatif | artefact demandé resté mort |
| — | `mutation` | Stryker `--incremental` (**nocturne**) | code nouveau | Informatif | oracle faible, assertion qui ne vérifie rien |

**9 bloquants · 3 informatifs sur PR · 2 informatifs nocturnes.**

### Pourquoi `sast` et `coverage` ne sont pas bloquants

La règle est explicite : *aucun contrôle dont le taux de faux positifs est inconnu ne
devient bloquant*. Sur ce dépôt, aucun des deux n'a jamais tourné sur du code réel — il n'y
a pas de code. Les rendre bloquants reviendrait à parier sur un chiffre qu'on n'a pas, et
**un contrôle bruyant finit désactivé** : son efficacité théorique tombe alors à zéro, ce
qui est pire que de l'assumer informatif.

Un job informatif **n'est simplement pas dans la liste des checks requis**. Il peut virer au
rouge et annoter la PR sans la bloquer — aucun `continue-on-error` ne vient masquer son
signal.

Pour `coverage`, la conséquence est nommément celle que l'ADR-0012 cherchait à empêcher :
pendant la fenêtre de mesure, **du code non testé peut atterrir sur `main` sans aucun
refus**. C'est un arbitrage, pas un oubli.

**Les trois contrôles ajoutés le 2026-08-08 sont bloquants d'emblée** parce qu'ils échappent
à cette règle : leur signal n'est pas une heuristique dont le bruit se mesure, c'est un
`git diff`, une comparaison d'entier ou une vérification de signature. Le taux de faux
positifs n'est pas « inconnu », il est **nul par construction** — ou alors le contrôle a un
défaut, pas un bruit.

---

## Le garde de suppression — la seule soupape qu'un agent ne peut pas écrire

**Le mode de défaillance.** L'agent ne casse pas le contrôle : il l'**éteint localement**.
Un `@ts-ignore` au-dessus de la ligne qui ne compile pas, un `as any` qui fait taire le
typage, un `eslint-disable` sur la règle qui gêne, un `catch {}` vide qui avale l'erreur.
Rien n'est rouge. Le vérificateur a simplement été débranché à l'endroit précis où il
servait — et sur un socle dont l'ADR-0006 fait reposer la sûreté sur *TypeScript strict +
validation aux frontières*, c'est le geste qui vide l'ADR de son contenu.

Le signal est déterministe : ces motifs sont greppables sur les **lignes ajoutées** du diff.
Les fichiers de test sont exclus (ils ont leurs propres raisons d'en contenir), et la
documentation aussi — ce document cite ces motifs et n'a pas à se bloquer lui-même.

**Pourquoi la soupape n'est pas un scope de commit.** `quality-config-guard` s'ouvre par un
`chore(config):` dans le message. Cela suffit là-bas : le but est que le changement ne passe
pas *en silence*. Ici, non — un agent écrit un scope de commit aussi facilement qu'il écrit
un `as any`. La soupape doit être quelque chose qu'il ne peut pas produire.

**La soupape est une signature.** Une suppression n'est acceptée que si **chaque commit qui
l'introduit** porte une signature SSH valide, vérifiée en CI contre `.github/allowed_signers`.

```
suppression détectée  →  .github/allowed_signers absent   →  REFUS (fermeture par défaut)
                      →  commit non signé                 →  REFUS
                      →  signé par une clé hors liste     →  REFUS
                      →  signé par une clé de la liste    →  passe
```

**La liste se protège elle-même.** Sans cela le garde ne vaudrait rien : l'agent y ajouterait
sa propre clé. Toute modification de `.github/allowed_signers` est vérifiée contre la version
de ce fichier **à la base de la PR** — une clé ne peut donc être ajoutée que par un commit
signé avec une clé déjà de confiance.

### Ce qui rend la signature infaisable par un agent — mesuré, pas supposé

C'est **tout** le dispositif, et il ne tient pas dans le workflow. Trois choses ont été
relevées ou éprouvées sur la machine le 2026-08-08.

**1. L'état de départ.** Aucune signature n'était configurée : ni `commit.gpgsign`, ni
`gpg.format`, ni `user.signingkey`, aucune clé GPG secrète. Une seule clé SSH,
`~/.ssh/github_dotfiles`, de type `ssh-ed25519` et **sans aucune phrase de passe** —
`ssh-keygen -y -P ""` la déchiffre. Elle sert à s'authentifier ; elle ne peut pas servir ici.

**2. Ce qui bloque réellement l'agent.** Une clé dédiée, chiffrée par une phrase de passe
que lui seul l'humain connaît, **et jamais chargée dans `ssh-agent`**. Éprouvé en dépôt
jetable :

| Situation | Résultat observé |
|---|---|
| Clé à phrase, absente de `ssh-agent` | `git commit -S` → *incorrect passphrase*, **aucun commit créé** |
| Même clé, après **un seul `ssh-add`** | signature obtenue sans connaître la phrase · `git verify-commit` → *Good signature* |

L'outil `Bash` de l'agent n'a pas de terminal (`tty` → *not a tty*) et aucun programme
*askpass* n'est installé (`SSH_ASKPASS` vide) : la demande de phrase n'a nulle part où
aboutir, et la signature échoue. C'est la configuration favorable, et elle est constatée.

**3. La seule condition, et pourquoi elle est tenable.** Un `ssh-agent` tourne sur ce poste
(`SSH_AUTH_SOCK=/run/user/1000/openssh_agent`) et l'agent l'atteint. Un unique `ssh-add`
suffirait donc à rendre la phrase sans objet — non parce qu'elle fuit, mais parce qu'elle
cesse d'être demandée.

> **La règle n'est pas un effort de volonté.** Cette clé **ne sert qu'à signer**, jamais à
> s'authentifier auprès de GitHub — `github_dotfiles` continue de faire ce travail. `ssh-add`
> n'a donc aucune raison légitime d'être invoqué dessus. Il n'y a pas de tentation à laquelle
> résister : il n'y a pas d'occasion. C'est ce qui rend la discipline soutenable là où
> `ssh-add -c` échouerait ici, faute d'*askpass*.

### La recette — geste humain, je ne l'exécute pas

```bash
# 1. Une clé DÉDIÉE À LA SIGNATURE, chiffrée par une phrase que vous seul connaissez.
#    `-a 100` : 100 tours de KDF bcrypt, pour rendre coûteux un cassage hors ligne
#    si le fichier venait à sortir de la machine.
ssh-keygen -t ed25519 -a 100 -C "colibri-signing" -f ~/.ssh/colibri_sign

# 2. L'enregistrer sur GitHub comme clé de SIGNATURE (pas d'authentification) —
#    c'est ce qui donne le badge « Verified ». La CI, elle, ne dépend pas de cet
#    enregistrement : elle vérifie contre le fichier posé à l'étape 4.
gh ssh-key add ~/.ssh/colibri_sign.pub --type signing --title "colibri-signing"

# 3. Configurer git pour ce dépôt. NE PAS poser commit.gpgsign = true :
#    seuls les commits qui éteignent un vérificateur ont besoin d'être signés,
#    et une phrase réclamée à chaque commit se contourne par lassitude.
git config gpg.format ssh
git config user.signingkey ~/.ssh/colibri_sign.pub

# 4. Poser la liste de confiance, et la POUSSER VOUS-MÊME (voir l'amorçage ci-dessous).
printf '%s %s\n' "chauveau.sebastien@gmail.com" "$(cat ~/.ssh/colibri_sign.pub)" \
  > .github/allowed_signers
```

Signer devient `git commit -S -m "…"`, et git réclame la phrase — à vous, dans votre
terminal. **Ne faites jamais `ssh-add ~/.ssh/colibri_sign`.**

> **L'amorçage est le seul trou, et il est irréductible.** Tant que
> `.github/allowed_signers` n'existe pas à la base, la PR qui l'installe le fait **sans
> preuve** — le workflow émet un `::warning` explicite et laisse passer. Il n'existe aucune
> clé de confiance pour signer l'arrivée de la première clé de confiance. **Poussez ce
> fichier vous-même**, directement, et vérifiez de vos yeux la clé qu'il contient. Après
> cela, le fichier est auto-protégé.

### Ce que ce garde ne protège pas

Quatre limites, toutes connues, aucune rédhibitoire — mais aucune n'a le droit d'être tue :

- **Le fichier de clé reste copiable.** Le chiffrement protège l'usage, pas l'exfiltration.
  `-a 100` rend un cassage hors ligne coûteux ; il ne le rend pas impossible.
- **La phrase ne doit jamais être tapée dans une commande `!` de la session de l'agent** :
  elle atterrirait dans le transcript.
- **L'outillage de signature ne doit pas être écrit par l'agent.** S'il rédige le script,
  l'alias ou le hook par lequel vous signez, il peut capturer la phrase au moment où vous la
  tapez. Signez par un `git commit -S` que vous tapez vous-même. C'est le seul endroit du
  dispositif où le concours de l'agent est un risque et non une aide.
- **La propriété n'est pas vérifiable par la machine.** La CI lit `ssh-ed25519` dans
  `allowed_signers` et ne peut pas distinguer « clé à phrase jamais chargée dans l'agent » de
  « clé nue dans `~/.ssh` ». Elle repose sur un **usage**, pas sur une preuve. Le workflow
  affiche donc le type de chaque clé de confiance à chaque vérification, pour que l'écart
  reste visible.

**La clé matérielle est écartée** — décision du 2026-08-08, et ce n'est pas un report. Une
clé FIDO2 (`sk-ssh-ed25519@openssh.com`) aurait transformé la quatrième limite en preuve : le
type inscrit dans `allowed_signers` aurait attesté qu'un contact physique a eu lieu, et
`ssh-agent` ne l'aurait pas annulée — l'agent n'y détient qu'une référence, chaque signature
redescend au jeton. Ce chemin n'est pas pris.

**La conséquence, à lire comme définitive** : la garantie de ce contrôle repose sur un usage
— une clé qui n'entre jamais dans `ssh-agent` — et **aucune évolution prévue ne la rendra
vérifiable par la machine**. L'affichage du type de clé dans le log ne prépare donc pas une
migration ; il maintient le fait sous les yeux, pour que personne ne relise ce garde dans six
mois en le prenant pour une preuve.

**Le mode de défaillance reste sûr.** Sans signature valide, `suppression-guard` refuse.
L'erreur possible est qu'il accepte une signature que l'agent aurait pu produire — jamais
qu'il laisse passer une suppression non signée.

### Ce que ce garde coûte

Un `as unknown as` légitime dans un shim de types Workers ou D1 **bloque** tant que le
commit n'est pas signé. C'est le prix voulu : la sortie n'est pas de supprimer le garde,
c'est de reconnaître qu'on éteint un vérificateur et de le signer de sa main. Si ce geste
devient fréquent, ce n'est pas le garde qu'il faut relâcher — c'est un signal sur le code.

---

## Approvisionnement — ce que la SCA ne voit pas

L'OSV-Scanner compare le lockfile à des bases de vulnérabilités **connues**. Il est aveugle
à un paquet hostile trop récent pour y figurer. Or c'est exactement la fenêtre du
*slopsquatting* : un modèle hallucine un nom de paquet — mesuré à **19,7 %** des paquets
cités, sur 2,23 millions, par Spracklen et al. (USENIX Security 2025) — et **43 %** de ces
hallucinations se répètent d'un run à l'autre, ce qui rend le nom prévisible donc
enregistrable par un tiers.

Trois gardes, aucun ne remplaçant les autres :

**1. Cooldown de dépendances — 7 jours.** `pnpm-workspace.yaml` doit déclarer
`minimumReleaseAge: 10080`. Une version publiée il y a moins de sept jours n'est pas
installable ; les versions compromises étant généralement retirées en quelques heures, la
fenêtre d'attaque est couverte. `deps-policy` **refuse** si la clé manque ou si la valeur
est inférieure, dès que `package.json` existe.

```yaml
# pnpm-workspace.yaml — à poser au scaffold
minimumReleaseAge: 10080          # 7 jours, en minutes
minimumReleaseAgeExclude: []      # paquets internes uniquement
```

> **Ce que ce choix coûte, et c'est réel.** Un correctif de sécurité publié aujourd'hui
> n'est installable qu'à J+7. En incident il faut ajouter le paquet à
> `minimumReleaseAgeExclude` à la main, sous pression — et comme ce fichier est surveillé
> par `quality-config-guard`, le commit devra porter `chore(config):`. Ce détour est le prix
> assumé du cooldown ; il est écrit ici pour qu'il ne soit pas découvert le jour de
> l'incident.

**2. Aucune variation de dépendance en silence.** Toute modification de `pnpm-lock.yaml`
exige un commit portant `build(deps):`, `chore(deps):` ou `fix(deps):`, ou le label `deps`
sur la PR. On ne surveille **que** le lockfile : `package.json` bouge pour mille raisons
légitimes, et un contrôle bruyant finit désactivé. Le lockfile, lui, ne change pas sans
qu'une dépendance change.

**3. La chaîne d'approvisionnement de la CI elle-même.** Toutes les actions sont épinglées
au **SHA complet** et toutes les images au **digest** — un tag est mobile, il peut être
repointé sous le même nom. `workflow-audit` (zizmor 1.29.0, hors ligne) refuse toute
référence non épinglée, ainsi que les permissions trop larges et l'injection de gabarit.

Ces trois-là passent les quatre facteurs sans réserve : le signal est un entier comparé, un
`git log` et une analyse statique déterministe. `online-audits: false` est délibéré — pas
d'appel d'API, donc pas de limite de débit, donc pas de rouge intermittent.

---

## Ordonnancement

Jobs indépendants, tous en parallèle, sans `needs:` — ordonnés dans le fichier par coût
croissant pour la lecture. `concurrency` avec `cancel-in-progress` évite d'empiler les runs
sur une même branche.

Déclencheurs : `pull_request` **et** `push` sur `main`. Un check qui ne tourne pas sur
`pull_request` n'apparaît jamais dans la liste des status checks sélectionnables et bloque
la PR indéfiniment une fois exigé.

### Le régime nocturne — `.github/workflows/nightly.yml`

Ouvert le 2026-08-08. Il tourne à 3 h et à la demande, **jamais sur `pull_request`** : aucun
de ses jobs ne peut donc figurer dans les checks requis, ce qui est le point.

- **`dead-code` (knip)** vise le *building to the test* : la logique vit dans un artefact
  jetable pendant que l'artefact demandé reste mort.
- **`mutation` (Stryker `--incremental`)** vise l'**oracle faux** : un test qui exécute le
  code sans rien vérifier monte la couverture ; seul un mutant survivant le révèle.

Ils ne peuvent pas devenir bloquants. Le test de mutation a un taux de mutants équivalents
estimé entre **4 % et 39 %** dans la littérature (Madeyski et al. 2013) — très au-dessus du
seuil de 10-15 % — et knip a des faux positifs connus sur les points d'entrée dynamiques.

Deux manques assumés, tous deux au chantier de durcissement :

- **`[à compléter]` — la base de référence de mutants survivants.** « Alerter uniquement sur
  un mutant survivant *nouveau* » exige un `mutation-survivors.baseline.json` qui n'existe
  pas tant qu'aucun code n'a été muté une première fois. Sans elle, le premier vrai run
  remontera l'intégralité du corpus comme nouveau.
- **`[à compléter]` — l'ablation no-op.** Remplacer un artefact critique par une
  implémentation vide et vérifier que quelque chose casse. Aucune commande réelle ne
  l'exprime aujourd'hui ; l'écrire serait l'inventer, et aucun job ne la porte donc.

> **Note GitHub.** Un `schedule` est automatiquement désactivé après 60 jours sans activité
> sur le dépôt. Le réveiller est un geste manuel dans l'onglet Actions.

---

## Protection de branche

Branche : `main` · Bypass : **interdit** · Force-push et suppression : **interdits**

Checks requis, à l'identique des noms de jobs :

```
build · test · sca · deps-policy · secrets · workflow-audit
test-integrity · suppression-guard · quality-config-guard
```

### État : **À METTRE À JOUR — un check requis fantôme bloque déjà toute PR**

Un ruleset `Main protect` (id `20239278`) est actif. Relevé à nouveau le **2026-08-08**,
inchangé depuis le 2026-08-02 :

```
enforcement: active · target: branch · conditions.ref_name.include: ["~DEFAULT_BRANCH"]
rules: deletion · non_fast_forward · pull_request · required_status_checks
bypass_actors: [] · current_user_can_bypass: "never"
required_status_checks.contexts: [ "quality-gate" ]        ← projet abandonné
```

L'interdiction de bypass, de force-push et de suppression est donc **déjà conforme** et n'a
pas à être reposée. En revanche `quality-gate` est le job de l'ancien portail : il n'existe
dans aucun workflow de ce projet. Tant que ce contexte reste exigé, **toute PR reste
`pending` pour toujours** — et comme le bypass est à `never`, personne ne peut merger,
propriétaire compris.

La commande ci-dessous remplace la liste des checks et laisse le reste intact. **Je ne
l'exécute pas** ; elle est à coller telle quelle, une fois `.github/workflows/ci.yml`
présent sur la branche que vous proposerez :

```bash
gh api -X PUT repos/sebc-dev/colibri-cms/rulesets/20239278 \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "name": "Main protect",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash", "rebase"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "build" },
          { "context": "test" },
          { "context": "sca" },
          { "context": "deps-policy" },
          { "context": "secrets" },
          { "context": "workflow-audit" },
          { "context": "test-integrity" },
          { "context": "suppression-guard" },
          { "context": "quality-config-guard" }
        ] } }
  ]
}
JSON
```

Vérification après coup :

```bash
gh api repos/sebc-dev/colibri-cms/rulesets/20239278 \
  --jq '[.rules[] | select(.type=="required_status_checks")
         | .parameters.required_status_checks[].context] | sort'
# attendu : ["build","deps-policy","quality-config-guard","sca","secrets",
#            "suppression-guard","test","test-integrity","workflow-audit"]
```

**Tant que cette commande n'est pas passée, tout ce document est informatif** — et pire
qu'informatif : la PR qui apporte ces contrôles est elle-même bloquée par le fantôme.

> **Ce qui n'est délibérément pas posé : `required_signatures`.** Le ruleset GitHub sait
> exiger que **tous** les commits soient signés. Ce n'est pas ce qu'on veut : avec une clé
> à contact physique, l'agent ne pourrait plus commiter du tout. L'exigence de signature
> est portée par `suppression-guard`, et ne s'applique qu'aux commits qui éteignent un
> vérificateur.

---

## Blindage local (défense en profondeur — **ne remplace pas** le ruleset)

Un agent a contourné des hooks pre-commit par `--no-verify`, `git stash` et flags silencieux
sur **six commits consécutifs**, malgré des règles écrites l'interdisant. Le hook ci-dessous
est un complément qui rend ce geste coûteux — **il n'est pas le backstop**. Le backstop est
le check serveur ; le présenter autrement reproduirait exactement l'erreur qu'il corrige.

**Non installé.** Cette phase n'installe aucun hook et ne modifie aucun `settings.json` :
les blocs sont rendus, le geste est humain.

`.claude/settings.json` :

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Bash",
  "hooks": [ { "type": "command",
               "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/block-no-verify.sh\"" } ] } ] } }
```

> **Le chemin est absolu, et ce n'est pas un détail.** Un hook invoqué par chemin relatif
> (`bash .claude/hooks/...`) cesse de refuser — **en silence** — dès que le répertoire
> courant de l'outil `Bash` quitte la racine du dépôt. C'est un mode de défaillance déjà
> constaté sur ce projet ; `$CLAUDE_PROJECT_DIR` le ferme.

`.claude/hooks/block-no-verify.sh` — `exit 2` bloque ; `exit 1` serait ignoré et ne
bloquerait rien :

```bash
#!/usr/bin/env bash
set -uo pipefail
cmd="$(cat | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)"
[ -z "$cmd" ] && exit 0
case "$cmd" in
  *"git commit"*--no-verify*|*"git commit"*" -n"*|*"git push"*--no-verify*)
    echo "⛔ Les hooks de commit ne se sautent pas." >&2
    echo "   Un hook cassé se répare ou se signale — il ne se contourne pas." >&2
    exit 2 ;;
esac
exit 0
```

**Ses limites, à connaître :** il ne voit pas un `git` appelé via un script, un alias ou un
wrapper ; le motif ` -n` peut mordre sur un message de commit qui le contient ; et il ne
protège que les sessions de cet agent, pas un `git` tapé dans un autre terminal.

---

## Ce que ces contrôles ne couvrent pas

- **L'oracle faux sémantique.** Du code qui compile, passe le lint et passe des tests **dont
  l'assertion vérifie la mauvaise chose** est indétectable. Le test de mutation nocturne le
  révèle *statistiquement* — un mutant survivant nouveau signale une assertion faible — mais
  ne le prouve pas, et son bruit lui interdit de bloquer. `coverage` fait pire : il
  **récompense** un test sans assertion, qui exécute la ligne sans rien vérifier.
- **Le *building to the test* « propre ».** Si l'agent écrit un artefact demandé qui satisfait
  le contrôle sans remplir l'exigence, et que l'artefact n'est pas mort, ni `dead-code` ni
  l'ablation no-op ne le voient. Rien ne le détecte sans oracle sémantique — qui n'existe pas
  de façon déterministe et gratuite.
- **L'invariant d'architecture non encore formalisé.** Aucun outil générique ne connaît les
  décisions de ce projet — que D1 ne porte jamais l'état publié (ADR-0001), que le Worker
  public ne sert jamais de script (ADR-0004). Un contrôle maison n'attrape que les invariants
  qu'on a pensé à écrire : **il vaut ce que vaut sa liste**, et cette liste est vide
  aujourd'hui. C'est, d'après le rapport de recherche, le principal gisement de valeur
  restant.
- **La suppression du vérificateur par un chemin non reconnu.** `suppression-guard` grep des
  motifs. Un agent contraint peut affaiblir un oracle sans écrire aucun de ces motifs — et
  la littérature sur le *reward hacking* ne tranche pas si réprimer un comportement
  l'élimine ou le rend plus subtil. Le garde réduit une surface, il ne ferme pas le sujet.
- **Le commit forgé côté forge.** `workflow-audit` tourne **hors ligne**, il ne vérifie donc
  pas qu'un SHA épinglé est bien atteignable depuis le dépôt de l'action (*impostor-commit*).
  Le compromis est délibéré : un audit en ligne dépend d'une limite de débit, et un contrôle
  intermittent finit désactivé.
- **La logique métier et l'autorisation.** Le SAST ne modélise pas l'intention : un IDOR sur
  la médiathèque ou sur les demandes de devis ne produit aucun motif suspect.
- **Les invariants du produit.** `SC-011` (réversibilité), `SC-012` (révocation des accès) et
  `SC-014` (passation) sont des **procédures dont la sortie est une pièce datée**
  (ADR-0012, étage 3). Elles ne se jouent pas à chaque commit ; entre deux exécutions, une
  régression sur ces promesses n'est détectée par rien. C'est le coût explicite de l'ADR.
- **Tout ce que la garde de scaffold laisse passer**, tant qu'il n'y a pas de `package.json` :
  `build`, `test`, `coverage`, `lint`, `dead-code` et `mutation` sont verts sans avoir rien
  exécuté.
- **La gratuité du palier Free** (`SC-001`, `I5`) : aucun job ne compte les fichiers d'une
  version de Worker — la limite est de **20 000 par version** — ni ne surveille le quota.
  C'est du travail applicatif au build (`C5`, `docs/stack.md`), et un budget de build
  déterministe existe (`size-limit`, `@shiftescape/astro-bundle-budget`) : c'est une entrée
  du chantier de durcissement.

---

## Palier suivant

→ [`docs/chantiers/en-attente/2026-08-07-durcissement-ci.md`](./chantiers/en-attente/2026-08-07-durcissement-ci.md)
