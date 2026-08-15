#!/usr/bin/env python3
"""PreToolUse — ce que l'agent n'a pas le droit de faire dans ce dépôt.

Quatre gardes, dans l'ordre de gravité décroissante :

  1. SIGNATURE ET CLÉS  — l'agent ne signe jamais, ne touche jamais à l'agent SSH,
     ne lit jamais ~/.ssh. La signature est le mécanisme d'autorisation de
     `verifier-guard` et `test-integrity` : elle doit rester un geste humain.
  2. ADR PAR BASH       — complète le hook `block-adr-edits` du plugin, dont le
     matcher ne voit que Edit|Write. C'est la seule catégorie qu'AUCUN contrôle
     CI ne rattrape : un ADR écrasé par `sed -i` ne se voit nulle part.
  3. CONFIG QUALITÉ     — ce qui contraint l'agent ne se modifie pas par l'agent.
     Porte sur les fichiers SUIVIS PAR GIT : créer la config au scaffold est le
     travail prévu au contrat, la modifier après coup est la dérive visée.
  4. TESTS ET EXTINCTIONS — précocité : la CI l'exige déjà sous signature, ce
     hook fait échouer à l'écriture plutôt qu'à la PR.

Rappel : exit 2 = bloque · exit 0 = laisse passer · exit 1 = erreur ignorée.
Sens du repli : ce qui n'est pas compris passe. Un hook qui bloque tout sur une
charge utile illisible rendrait le dépôt inutilisable ; les quatre gardes ont
chacun un filet en CI, SAUF le n° 2 — qui bloque donc au moindre doute.
"""
import json
import os
import re
import subprocess
import sys


def refus(titre, *lignes):
    print(f"⛔ {titre}", file=sys.stderr)
    for l in lignes:
        print(f"   {l}", file=sys.stderr)
    sys.exit(2)


try:
    charge = json.load(sys.stdin)
except Exception:
    sys.exit(0)

outil = charge.get("tool_name", "")
entree = charge.get("tool_input") or {}
cwd = charge.get("cwd", "") or os.getcwd()

commande = entree.get("command", "") if outil == "Bash" else ""
chemin = entree.get("file_path", "") if outil in ("Edit", "Write") else ""
contenu = entree.get("new_string", "") or entree.get("content", "") or ""


def absolu(p):
    if not p:
        return ""
    return p if p.startswith("/") else os.path.join(cwd, p)


def suivi_par_git(p):
    """Le fichier est-il déjà versionné ? Un fichier non suivi est en cours de
    création — c'est le travail du scaffold, pas une dérive."""
    if not p:
        return False
    try:
        r = subprocess.run(
            ["git", "ls-files", "--error-unmatch", "--", p],
            cwd=os.path.dirname(p) or cwd,
            capture_output=True,
            timeout=5,
        )
        return r.returncode == 0
    except Exception:
        return True  # dans le doute, on protège


# ─── 1. SIGNATURE ET CLÉS ───────────────────────────────────────────────────
if commande:
    if re.search(r"\bssh-add\b", commande):
        refus(
            "Agent SSH : hors de portée de l'agent IA.",
            "Purger, recharger ou lister les clés est un geste humain.",
            "Lance-le toi-même dans ton terminal.",
        )
    if re.search(r"\bgit\b[^|;&]*\bcommit\b", commande) and re.search(
        r"(^|\s)(-S|--gpg-sign)(\s|=|$)", commande
    ):
        refus(
            "Signature : l'agent IA ne signe jamais.",
            "Un commit signé atteste qu'un humain a vu et vouché.",
            "Prépare le commit sans -S, ou passe la main pour celui-ci.",
        )
    if re.search(r"user\.signingkey|commit\.gpgsign|gpg\.ssh\.", commande):
        refus(
            "Configuration de signature : réservée à l'humain.",
            "Modifier qui signe revient à contourner la garde.",
        )
    if re.search(r"ssh-keygen\s+(-Y\s+sign|.*-f\s*\S*\.ssh)", commande):
        refus("Clés SSH : ni signature ni génération par l'agent IA.")
    if re.search(r"(~|\$HOME|/home/[^/\s]+)/\.ssh", commande):
        refus(
            "~/.ssh : l'agent IA n'y touche pas, même en lecture.",
            "La passphrase est la seule barrière ; ne l'expose pas.",
        )

# ─── 2. ADR PAR BASH (aucun filet en CI → on bloque au doute) ───────────────
if commande and re.search(r"adr/\d", commande) and "_candidates" not in commande:
    MUTATION = r"sed\s+-i|>\s*[^|]|>>|\btee\b|\bmv\b|\bcp\b|\brm\b|truncate|\bdd\b|git\s+(checkout|restore|rm)|perl\s+-i|python3?\s+-c"
    if re.search(MUTATION, commande):
        refus(
            "ADR immuable : réécriture par Bash bloquée.",
            "Un ADR accepté est superseded par un NOUVEL ADR, jamais réécrit.",
            "Le hook Edit|Write du plugin ne voit pas Bash ; celui-ci le complète.",
            "Lecture seule autorisée (cat, grep, git show…).",
        )

# ─── 3. CONFIG QUALITÉ (si déjà suivie par git) ─────────────────────────────
CONFIG = [
    r"(^|/)eslint\.config\.[^/]+$",
    r"(^|/)\.eslintrc",
    r"(^|/)tsconfig[^/]*\.json$",
    r"(^|/)vitest\.config\.[^/]+$",
    r"(^|/)playwright\.config\.[^/]+$",
    r"(^|/)stryker\.conf\.[^/]+$",
    r"(^|/)knip\.[^/]+$",
    r"(^|/)prettier\.config\.[^/]+$",
    r"(^|/)\.prettierrc",
    r"(^|/)\.prettierignore$",
    r"(^|/)\.eslintignore$",
    r"(^|/)\.npmrc$",
    r"\.github/workflows/",
    r"\.github/scripts/",
    r"(^|/)CLAUDE\.md$",
    r"(^|/)AGENTS\.md$",
    r"(^|/)\.claude/",
]


def est_config(p):
    return any(re.search(m, p) for m in CONFIG)


if chemin and est_config(chemin):
    a = absolu(chemin)
    if os.path.exists(a) and suivi_par_git(a):
        refus(
            f"Config qualité : « {chemin} » est déjà versionné.",
            "Ce qui contraint l'agent ne se modifie pas par l'agent —",
            "la soupape CI est un scope de commit, que j'écris aussi facilement",
            "que la modification elle-même. Passe la main à l'humain.",
            "(La CRÉATION d'une config au scaffold, elle, reste autorisée.)",
        )

if commande and re.search(r"sed\s+-i|>\s*[^|]|>>|\btee\b", commande):
    for m in CONFIG:
        motif = m.replace(r"(^|/)", "").replace(r"$", "").replace("\\", "")
        if motif and motif in commande:
            refus(
                "Config qualité : écriture par Bash bloquée.",
                f"« {motif} » contraint l'agent ; passe la main à l'humain.",
            )

# ─── 4. TESTS ET EXTINCTIONS DE VÉRIFICATEUR ────────────────────────────────
EST_TEST = r"\.(test|spec)\.(ts|tsx)$|(^|/)(tests|e2e)/"
EST_SOURCE = r"\.(ts|tsx|js|jsx|mjs|cjs|astro|svelte)$"

NEUTRALISANT = r"\.(skip|only|todo|fixme)\(|\bxit\(|\bxdescribe\(|expect\(true\)\.toBe\(true\)"
EXTINCTION = r"@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|\bas any\b|\bas unknown as\b|catch\s*(\([^)]*\))?\s*\{\s*\}|nosemgrep|trufflehog:ignore"

if chemin and contenu:
    if re.search(EST_TEST, chemin) and re.search(NEUTRALISANT, contenu):
        refus(
            "Test neutralisé : .skip/.only/.todo interdits à l'agent IA.",
            "`test-integrity` l'exige sous signature humaine ; autant échouer ici.",
        )
    if (
        re.search(EST_SOURCE, chemin)
        and not re.search(EST_TEST, chemin)
        and re.search(EXTINCTION, contenu)
    ):
        refus(
            "Extinction de vérificateur dans du code source.",
            "`as any`, `@ts-ignore`, `eslint-disable`, `catch {}` vide :",
            "`verifier-guard` les refuse sans commit signé, que je ne peux pas produire.",
            "Corrige la cause plutôt que d'éteindre le vérificateur.",
        )

if commande and re.search(r"\brm\b", commande) and re.search(EST_TEST, commande):
    refus(
        "Suppression d'un fichier de test.",
        "`test-integrity` l'exige sous signature humaine.",
    )

sys.exit(0)
