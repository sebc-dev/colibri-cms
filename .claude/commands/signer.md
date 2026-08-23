---
description: Prépare un commit de bout en bout — trie ce qui part, décide si la signature humaine est exigée et pourquoi, compose le message aux conventions du dépôt. Commite lui-même un commit ordinaire ; pour un commit à signer, indexe, écrit .git/COMMIT_A_SIGNER et rend la main.
argument-hint: "[chemins, ou en clair ce qui doit partir]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git reset:*), Bash(git log:*), Bash(git commit:*), Read, Write, Grep, Glob, AskUserQuestion
---

# /signer — préparer un commit, décider de la signature

**Ratio : 30% humain / 70% AI.** L'IA trie, décide du motif et compose ; l'humain relit le
diff que le script lui affiche et tape la passphrase — ou ne la tape pas.

## Contexte

Dans ce dépôt, la signature SSH d'un commit n'est pas un ornement : c'est le **mécanisme
d'autorisation** de trois contrôles CI bloquants — `verifier-guard`, `test-integrity`,
`specs-integrity`. Elle est **réservée à l'humain**, et un hook `PreToolUse`
(`.claude/hooks/garde-agent.py`) le rend déterministe : je ne peux pas signer, même en
essayant.

Le seul chemin par lequel une signature naît ici est `scripts/signer-commit.sh`, lancé **à
la main dans un vrai terminal**. Il lit son message dans `.git/COMMIT_A_SIGNER`. Mon travail
s'arrête à préparer ce fichier et l'index.

⚠️ La section « Pourquoi une signature est exigée » du script est une **copie** de la
logique des jobs CI, et une copie dérive — c'est arrivé. Je décide donc sur les motifs
ci-dessous, qui sont ceux de `.github/workflows/ci.yml`, pas ceux du script ; j'écris le
motif dans le corps du message, y compris quand le script ne le connaît pas encore ; et je
**vérifie d'abord que ma propre liste n'est pas périmée** (test 0). Une liste de motifs qui
n'a pas de garde de fraîcheur finit par rassurer à tort : c'est le défaut d'origine.

## Ce que je fais

1. **Montrer l'état.** `git status --short --untracked-files=all`, puis `git diff --stat`.

2. **Trier ce qui part.** Par défaut : le travail de la session en cours. `$ARGUMENTS` peut
   restreindre — des chemins, ou une indication en clair que je traduis en chemins.
   **Si le tri est ambigu, je demande** (`AskUserQuestion`) plutôt que de deviner : un index
   mal composé se signe aussi bien qu'un bon, et la signature attestera alors d'un périmètre
   que personne n'a voulu. Je pose le problème en prose avant les options.

3. **Décider si la signature est exigée**, en jouant **le test 0 puis les quatre tests**
   ci-dessous, sur l'index une fois composé. Je dis le verdict **en clair, avec son motif**.
   Si le test 0 révèle un garde CI que je ne sais pas prédire, je **suspends le verdict** :
   je le dis, je vais lire le job, et je demande à l'humain plutôt que de rassurer.

4. **Composer le message** aux conventions du dépôt (`CLAUDE.md`) — Conventional Commits,
   sujet à l'impératif, en français. Deux scopes sont **imposés par des contrôles**, pas par
   le goût :
   - `.claude/**`, `.github/workflows/**`, `.github/scripts/**`, `eslint.config.*`,
     `tsconfig*.json`, `vitest.config.*`, `playwright.config.*`, `prettier.config.*`,
     `.prettierrc*`, `.eslintrc*`, `.npmrc`, `knip.*`, `stryker.conf.*`, `CLAUDE.md`,
     `AGENTS.md`, ou les scripts de contrôle de `package.json` (`test`, `typecheck`, `lint`,
     `build`, `coverage`, `knip`, `mutation`) → `chore(config):` · `chore(ci):` ·
     `build(ci):` · `chore(agent):`, ou le label `config-change` sur la PR
     (`quality-config-guard`) ;
   - lockfile ou blocs de dépendances de `package.json` → `build(deps):` · `chore(deps):` ·
     `fix(deps):`, ou le label `deps` (`dependency-review`).

   Ces deux gardes jugent **chaque commit**, pas le diff cumulé : un commit ne peut pas
   porter les deux scopes à la fois. Si l'index mêle les deux natures, je **scinde** — deux
   commits — au lieu de choisir.

5. **Écrire le motif de la signature dans le corps du message** quand il y en a un. C'est ce
   qui le met sous les yeux de l'humain à la relecture. Pour le motif 2, ce n'est pas
   facultatif : `verifier-guard` **échoue** si le message d'un commit signé ne nomme pas le
   vérificateur éteint.

6. **Conclure**, selon le verdict :
   - **signature exigée** → j'indexe, j'écris `.git/COMMIT_A_SIGNER` (outil `Write`), je
     n'exécute rien d'autre et je finis par la ligne de passation ;
   - **signature non exigée** → je commite moi-même, **sans `-S`**, avec
     `git commit -F <fichier de message>`. Ne pas faire signer pour rien : **ce qui se signe
     trop souvent ne se relit plus**, et c'est la relecture qui est la garantie.

## Les motifs, sur l'index

Chacun cite le job qui l'impose. Je les joue tels quels ; je n'en déduis aucun autre — **et
je commence par vérifier que cette liste n'est pas périmée.**

```bash
# 0 — SUIS-JE À JOUR ? Les quatre motifs qui suivent COPIENT la logique de la CI,
#     et une copie dérive : `specs-integrity` est né 28 commits après le script de
#     signature, qui a donc conseillé de ne PAS signer là où c'était obligatoire
#     (2026-08-23). Tout job qui appelle verify-signed-commits.sh exige une
#     signature et doit avoir son motif ici.
awk '/^  [a-z0-9-]+:$/ { j=$1; sub(/:$/, "", j) }
     /verify-signed-commits\.sh/ { print j }' \
    $(find .github/workflows -maxdepth 1 -name '*.y*ml' 2>/dev/null) /dev/null | sort -u
# → attendu, et rien d'autre : specs-integrity · test-integrity · verifier-guard.
#   Un nom de plus = je SUSPENDS le verdict (je ne conclus jamais « commit
#   ordinaire » sur une liste que je sais incomplète), je lis le job, je demande.

# 1 — verifier-guard, contrôle 1 : le registre des clés de confiance.
git diff --cached --name-only -- .github/allowed_signers

# 2 — verifier-guard, contrôle 2 : une extinction de vérificateur AJOUTÉE dans du
#     code source. Tests et docs exclus (test-integrity couvre les uns, docs/ci.md
#     cite ces motifs et n'a pas à bloquer sa propre notice).
git diff --cached --unified=0 -- \
  ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.js' ':(glob)**/*.jsx' \
  ':(glob)**/*.mjs' ':(glob)**/*.cjs' ':(glob)**/*.astro' ':(glob)**/*.svelte' \
  ':(exclude,glob)**/*.test.ts' ':(exclude,glob)**/*.test.tsx' \
  ':(exclude,glob)**/*.spec.ts' ':(exclude,glob)**/*.spec.tsx' \
  ':(exclude,glob)tests/**' ':(exclude,glob)e2e/**' \
  | grep -nE '^\+.*(@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|\bas any\b|\bas unknown as\b|:[[:space:]]*any\b|catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{[[:space:]]*\}|nosemgrep|trufflehog:ignore)'

# 3 — test-integrity, volet B : test SUPPRIMÉ, ou oracle allégé (plus d'assertions
#     retirées qu'ajoutées).
TESTS=(':(glob)**/*.test.ts' ':(glob)**/*.test.tsx' ':(glob)**/*.spec.ts'
       ':(glob)**/*.spec.tsx' ':(glob)tests/**' ':(glob)e2e/**')
git diff --cached --diff-filter=D --name-only -- "${TESTS[@]}"
a=$(git diff --cached -- "${TESTS[@]}" | grep -cE '^\+.*(expect\(|assert)') || true
r=$(git diff --cached -- "${TESTS[@]}" | grep -cE '^-.*(expect\(|assert)')  || true
[ "${r:-0}" -gt "${a:-0}" ] && echo "oracle allégé : ${r} retirées pour ${a} ajoutées"

# 4 — specs-integrity : spec.md et plan.md sont figés sans exception ; dans
#     tasks.md, seul l'état des CASES est libre — le texte des tâches ne l'est pas.
git diff --cached --name-only -- ':(glob)specs/**/spec.md' ':(glob)specs/**/plan.md'
neutraliser() { sed -E 's/^([[:space:]]*[-*][[:space:]]+)\[[ xX]\]/\1[ ]/'; }
d=$(git diff --cached --unified=0 -- ':(glob)specs/**/tasks.md')
avant=$(echo "$d" | grep -E '^-'  | grep -vE '^---'    | cut -c2- | neutraliser | sort) || true
apres=$(echo "$d" | grep -E '^\+' | grep -vE '^\+\+\+' | cut -c2- | neutraliser | sort) || true
[ "$avant" = "$apres" ] || echo "texte des tâches modifié hors cases → signature"
```

**Ce qu'aucune signature ne déverrouille**, et qu'il ne faut donc pas proposer de signer :
un neutralisant **ajouté** dans un test (`.skip(`, `.only(`, `.todo(`, `.fixme(`, `xit(`,
`xdescribe(`, `expect(true).toBe(true)`). `test-integrity` le refuse sans appel — la seule
sortie est de **retirer** le test, ce que le motif 3 couvre. Le hook le bloque déjà à
l'écriture.

**Deux différences de contexte** que je garde en tête sans essayer de les combler : la CI
raisonne **commit par commit** sur `BASE_SHA..HEAD` quand je raisonne sur l'**index** — une
réécriture rétablie plus loin dans la branche m'échappe et rougira quand même en PR ; et
`specs-integrity`, `verifier-guard`, `test-integrity` ne s'arment que sur un événement
`pull_request` — un push direct vers `main` les laisse en `notice`. Je décide donc sur ce
qui **bloquerait en PR** : c'est la discipline du dépôt, pas seulement ce que la CI attrape
aujourd'hui.

## Règles absolues

- **Jamais `git commit -S`, jamais `--gpg-sign`.** Le hook refuse ; essayer est déjà la faute.
- **Jamais `ssh-add`, jamais `~/.ssh`**, jamais `user.signingkey` / `commit.gpgsign` /
  `gpg.ssh.*` — ni en lecture, ni en écriture, ni « juste pour vérifier ».
- **Jamais lancer `scripts/signer-commit.sh` moi-même.** Il refuse hors terminal, et
  contourner ce refus ferait transiter la passphrase par autre chose que le clavier de
  l'humain.
- **Ne rien pousser.** Pas de `git push`, pas de `gh pr create`.
- **Un ID se cite avec son intitulé** — `FR-097`, `I1`, `T36`, `R3` ne descendent jamais nus
  dans un message ou dans une question.
- **Ne pas modifier `scripts/signer-commit.sh` ni les fichiers de config qualité** : le
  garde les protège, et c'est voulu — un outil qui produit des signatures et que je pourrais
  modifier afficherait une chose et en signerait une autre.

## À la fin

**Signature exigée** — après avoir indexé et écrit `.git/COMMIT_A_SIGNER`, je rappelle le
motif en une ligne, puis je termine par **cette ligne et rien d'autre** :

```
cd /home/negus/projets/colibri-cms && scripts/signer-commit.sh
```

**Signature non exigée** — j'affiche le `git log -1 --oneline` du commit créé, et je m'arrête.
Rien n'est poussé.
