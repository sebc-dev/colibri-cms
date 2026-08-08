# Signature des commits — marche à suivre

| | |
|---|---|
| **Statut** | Actif |
| **Date** | 2026-08-08 |
| **Trace vers** | [Contrôles CI](./ci.md) § Le garde de suppression · § Ce que `test-integrity` peut et ne peut pas faire |
| **Vérifié par** | `suppression-guard` et `test-integrity` (régime B), via `.github/scripts/verify-signed-commits.sh` |

> **Ce document est une procédure, pas une justification.** Le *pourquoi* — pourquoi une
> signature plutôt qu'un scope de commit, ce qu'elle prouve et ce qu'elle ne prouve pas —
> vit dans [`docs/ci.md`](./ci.md) et n'est pas recopié ici. Ce qui suit est le *comment* :
> les gestes, dans l'ordre, avec ce qu'ils affichent quand ils marchent et quand ils ratent.
>
> Toutes les commandes ci-dessous ont été éprouvées le 2026-08-08 en dépôt jetable.

---

## 1. Quand un commit doit-il être signé ?

**Trois cas, et trois seulement.** Le reste de votre travail ne se signe pas.

| Le commit… | Garde qui l'exige |
|---|---|
| ajoute `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`, `eslint-disable`, `as any`, `as unknown as`, `: any` ou un `catch {}` vide **dans une source** | `suppression-guard` |
| **supprime un fichier de test**, ou retire plus d'assertions qu'il n'en ajoute | `test-integrity` régime B |
| modifie `.github/allowed_signers` | `suppression-guard` |

Les fichiers de test et la documentation sont **hors portée** du premier cas : un `as any`
dans un `.test.ts` ou dans un `.md` ne déclenche rien.

> **Ne posez pas `commit.gpgsign = true`.** Signer *tous* les commits vous ferait taper la
> phrase de passe des dizaines de fois par jour, et une friction permanente se contourne par
> lassitude — c'est exactement le mode de défaillance que ces gardes visent. La signature
> doit rester un geste rare et délibéré.

---

## 2. Mise en place — une seule fois

```bash
# 1. Une clé DÉDIÉE À LA SIGNATURE. `-a 100` : 100 tours de KDF bcrypt, pour rendre
#    coûteux un cassage hors ligne si le fichier sortait de la machine.
#    Choisissez une phrase que vous êtes seul à connaître.
ssh-keygen -t ed25519 -a 100 -C "colibri-signing" -f ~/.ssh/colibri_sign

# 2. L'enregistrer sur GitHub comme clé de SIGNATURE — pas d'authentification.
#    C'est ce qui donne le badge « Verified » sur les commits. La CI n'en dépend pas :
#    elle vérifie contre .github/allowed_signers, pas contre votre compte.
gh ssh-key add ~/.ssh/colibri_sign.pub --type signing --title "colibri-signing"

# 3. Configurer git POUR CE DÉPÔT (pas --global).
git config gpg.format ssh
git config user.signingkey ~/.ssh/colibri_sign.pub
git config gpg.ssh.allowedSignersFile .github/allowed_signers   # pour vérifier en local

# 4. La liste de confiance. Le principal (1er champ) est libre : il identifie, il
#    n'authentifie pas — c'est la clé qui authentifie.
printf '%s %s\n' "chauveau.sebastien@gmail.com" "$(cat ~/.ssh/colibri_sign.pub)" \
  > .github/allowed_signers
```

> **L'amorçage est le seul moment sans preuve, et il est irréductible.** Aucune clé de
> confiance n'existe pour signer l'arrivée de la première clé de confiance : la CI émet un
> `::warning` et laisse passer. **Poussez ce fichier vous-même**, dans un commit que vous
> faites de votre main, et relisez la clé qu'il contient avant de pousser. Ensuite le
> fichier est auto-protégé — voir § 6.

---

## 3. La règle absolue : cette clé n'entre jamais dans `ssh-agent`

C'est **la** condition de tout le dispositif, et elle a été mesurée :

| Situation | Ce qui se passe |
|---|---|
| Clé absente de `ssh-agent` | l'agent qui code ne peut pas signer — `git commit -S` échoue, aucun commit créé |
| Clé chargée par un seul `ssh-add` | **n'importe quel processus du même utilisateur obtient une signature**, sans jamais connaître la phrase |

La phrase ne fuit pas dans le second cas : elle cesse simplement d'être demandée.

La règle est tenable parce qu'elle ne demande aucun effort : **cette clé ne sert qu'à
signer**, jamais à s'authentifier auprès de GitHub — `~/.ssh/github_dotfiles` continue de
faire ce travail. `ssh-add` n'a donc aucune raison légitime d'être invoqué dessus.

Contrôle, à faire quand un doute surgit — la clé de signature ne doit **pas** apparaître :

```bash
ssh-add -l
```

---

## 4. Signer, au quotidien

```bash
git commit -S -m "fix(types): shim D1 — as unknown as, faute de types générés"
```

git réclame la phrase dans **votre** terminal. Si rien ne la demande et que la commande
échoue, c'est que vous n'êtes pas dans un terminal interactif — voir § 8.

> **Ne faites pas passer la signature par un script, un alias ou un hook écrit par un
> agent.** C'est le seul endroit du dispositif où son concours est un risque : l'outillage
> qui vous demande la phrase est l'outillage qui peut la capturer. Tapez `git commit -S`.

---

## 5. Rattraper des commits déjà faits sans signature

Le cas le plus fréquent : la CI refuse, et les commits sont déjà écrits.

```bash
# Un seul commit, le dernier :
git commit --amend --no-edit -S

# Tout un intervalle — chaque commit est ré-écrit et re-signé.
# La phrase est demandée UNE FOIS PAR COMMIT : c'est normal, et c'est le prix.
git rebase <base> --exec "git commit --amend --no-edit -S"

# Puis, la branche ayant été réécrite :
git push --force-with-lease
```

`--force-with-lease` et jamais `--force` : il refuse si quelqu'un a poussé entre-temps.

---

## 6. Faire tourner la clé — l'ordre est contraint

La liste de confiance se protège elle-même : toute modification est vérifiée contre la
version du fichier **à la base de la PR**. Une clé ne peut donc être ajoutée que par un
commit signé d'une clé *déjà* de confiance. D'où deux temps, et pas un :

```bash
# ── Temps 1 : AJOUTER la nouvelle clé, en signant avec l'ANCIENNE.
ssh-keygen -t ed25519 -a 100 -C "colibri-signing-2" -f ~/.ssh/colibri_sign2
printf '%s %s\n' "chauveau.sebastien@gmail.com" "$(cat ~/.ssh/colibri_sign2.pub)" \
  >> .github/allowed_signers
git config user.signingkey ~/.ssh/colibri_sign.pub      # encore l'ancienne
git commit -aS -m "chore(config): ajoute la nouvelle clé de signature"
# → mergez cette PR avant de continuer.

# ── Temps 2 : RETIRER l'ancienne, en signant avec la NOUVELLE.
git config user.signingkey ~/.ssh/colibri_sign2.pub
# éditez .github/allowed_signers pour ne garder que la nouvelle ligne
git commit -aS -m "chore(config): retire l'ancienne clé de signature"
```

Les deux temps ont été rejoués : chacun passe, et une clé inconnue qui se signe elle-même
est refusée. **Ne sautez pas le merge intermédiaire** — au temps 2, la nouvelle clé doit
déjà être de confiance *à la base*.

Pensez aussi à `gh ssh-key delete` pour l'ancienne, côté compte GitHub.

---

## 7. Clé perdue, ou phrase compromise

**Phrase compromise** — tapée dans une session d'agent, dans un `!`, dans un script tiers :
faites une rotation (§ 6) sans attendre, puis relisez les commits signés depuis la date
suspecte avec `git log --show-signature`.

**Clé perdue** — c'est un blocage réel, et il n'y a pas de porte dérobée : plus aucun commit
ne peut signer le remplacement de la liste. La sortie passe par le propriétaire du ruleset,
qui est le dernier recours *par construction* :

1. Retirer temporairement `suppression-guard` et `test-integrity` des checks requis
   (`docs/ci.md` § Protection de branche).
2. Ouvrir et merger une PR qui remplace `.github/allowed_signers` par la nouvelle clé.
3. Remettre les deux checks requis.

Écrivez ce que vous avez fait et quand — une fiche `/scd-sdd:note` suffit. Une exception non
tracée est une exception qui devient une habitude.

---

## 8. Vérifier avant de pousser

Le plus simple, pour voir l'état de chaque commit :

```bash
git log --format='%h %G? %s' <base>..HEAD
```

`%G?` vaut `G` (signature bonne), `U` (bonne mais clé non fiable), `B` (mauvaise),
`N` (pas de signature), `E` (non vérifiable).

Pour rejouer **exactement** ce que fera la CI, avec le même script :

```bash
bash .github/scripts/verify-signed-commits.sh .github/allowed_signers \
  $(git rev-list --no-merges origin/main..HEAD)
```

---

## 9. Dépannage

| Message | Ce qu'il veut dire |
|---|---|
| `Load key "…": incorrect passphrase supplied to decrypt private key?` puis `fatal: failed to write commit object` | phrase fausse, **ou** aucun terminal pour la demander (contexte non interactif). Signez depuis votre terminal. |
| `gpg.ssh.allowedSignersFile needs to be configured and exist` | vérification locale sans le réglage du § 2, étape 3. |
| `No principal matched.` | la clé n'est pas dans `.github/allowed_signers` — ou, pendant une rotation, pas encore dans la version **de la base**. |
| `::error title=Aucune clé de confiance::… est absent` | `.github/allowed_signers` n'existe pas. Fermeture par défaut : rien ne passe. Voir § 2. |
| `::error title=Commit non signé::<sha>` | ce commit précis n'a pas de signature valide. Voir § 5. |
| CI verte mais pas de badge « Verified » sur GitHub | la clé n'est pas enregistrée sur le compte comme clé de *signature*. Cosmétique — la CI n'en dépend pas. Voir § 2, étape 2. |

---

## 10. Ce que cette procédure ne garantit pas

Quatre limites, écrites en détail dans [`docs/ci.md`](./ci.md) § *Ce que ce garde ne protège
pas*, rappelées ici pour qu'on ne les découvre pas trop tard :

- le fichier de clé reste **copiable** — le chiffrement protège l'usage, pas l'exfiltration ;
- la phrase ne doit **jamais** être tapée dans une session d'agent, où elle irait au transcript ;
- l'outillage de signature ne doit **pas** être écrit par un agent ;
- la propriété n'est **pas vérifiable par la machine** : la CI lit `ssh-ed25519` et ne peut
  pas distinguer une clé jamais chargée dans `ssh-agent` d'une clé nue. Elle repose sur
  l'usage décrit au § 3. La clé matérielle, qui aurait converti cet usage en preuve, a été
  écartée le 2026-08-08 — ce n'est pas un manque à combler, c'est un arbitrage rendu.
