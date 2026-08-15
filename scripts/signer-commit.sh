#!/usr/bin/env bash
#
# Signer un commit — le seul chemin par lequel une signature naît dans ce dépôt.
#
#   Usage : scripts/signer-commit.sh [fichier-message]
#           (défaut : .git/COMMIT_A_SIGNER, que l'agent prépare)
#
# Ce script est COURT ET STABLE À DESSEIN : une signature atteste qu'un humain a
# vu et vouché, donc l'outil qui la produit doit se relire en deux minutes. Il
# figure dans la liste que `.claude/hooks/garde-agent.py` protège : l'agent ne
# peut pas le modifier une fois versionné.
#
# Trois refus, avant toute signature :
#   1. pas de vrai terminal      → l'agent pourrait le lancer, la passphrase
#                                  transiterait par lui ;
#   2. la clé est dans ssh-agent → la passphrase ne serait pas demandée, et la
#                                  garantie « seul l'humain signe » tomberait ;
#   3. rien n'est indexé         → il n'y a rien à voucher.
set -uo pipefail

MSG="${1:-.git/COMMIT_A_SIGNER}"
cd "$(git rev-parse --show-toplevel)" || exit 1

# ── 1. Vrai terminal exigé ──────────────────────────────────────────────────
if [ ! -t 0 ] || [ ! -t 1 ]; then
  echo "⛔ Pas de terminal interactif." >&2
  echo "   Ce script se lance à la main, jamais depuis un agent : la passphrase" >&2
  echo "   ne doit transiter par rien d'autre que ton clavier." >&2
  exit 1
fi

# ── 2. La clé ne doit pas être déverrouillée dans l'agent ───────────────────
CLE="$(git config --get user.signingkey || true)"
[ -n "$CLE" ] || { echo "⛔ Aucune user.signingkey configurée." >&2; exit 1; }
EMPREINTE="$(ssh-keygen -lf "$CLE" 2>/dev/null | awk '{print $2}')"
if [ -n "$EMPREINTE" ] && ssh-add -l 2>/dev/null | grep -q "$EMPREINTE"; then
  echo "⛔ La clé de signature est chargée dans ssh-agent." >&2
  echo "   Elle signerait sans réclamer la passphrase, ce qui rend la signature" >&2
  echo "   accessible à tout ce qui tourne sous ton utilisateur." >&2
  echo "   Purge : ssh-add -d $CLE   (ou ssh-add -D)" >&2
  exit 1
fi

# ── 3. Il faut quelque chose à signer ───────────────────────────────────────
git diff --cached --quiet && { echo "⛔ Rien n'est indexé." >&2; exit 1; }
[ -r "$MSG" ] || { echo "⛔ Message introuvable : $MSG" >&2; exit 1; }

# ── Ce que tu t'apprêtes à vouloir ──────────────────────────────────────────
echo "── Fichiers ────────────────────────────────────────────────"
git diff --cached --stat
echo
echo "── Pourquoi une signature est exigée ───────────────────────"
motifs=0
git diff --cached --name-only -- .github/allowed_signers | grep -q . && {
  echo "  • le registre des clés est modifié (verifier-guard)"; motifs=1; }
git diff --cached -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.astro' '*.svelte' \
  | grep -qE '^\+.*(@ts-ignore|@ts-nocheck|eslint-disable|\bas any\b|nosemgrep)' && {
  echo "  • une extinction de vérificateur est introduite (verifier-guard)"; motifs=1; }
git diff --cached --diff-filter=D --name-only -- '*.test.ts' '*.spec.ts' 'tests/**' \
  | grep -q . && { echo "  • un fichier de test est supprimé (test-integrity)"; motifs=1; }
[ "$motifs" -eq 0 ] && echo "  • aucune — un commit ORDINAIRE n'a pas besoin d'être signé."

echo
echo "── Message ─────────────────────────────────────────────────"
sed 's/^/  /' "$MSG"
echo
echo "── Diff complet ────────────────────────────────────────────"
git --no-pager diff --cached
echo
echo "Clé : $CLE ($EMPREINTE)"
printf 'Signer ce commit ? [o/N] '
read -r reponse </dev/tty
case "$reponse" in
  o|O|oui|Oui) ;;
  *) echo "Abandonné — rien n'a été commité. L'index est intact."; exit 0 ;;
esac

# ── Signature — c'est ici que la passphrase est réclamée ────────────────────
git commit -S -F "$MSG" || exit 1
echo
git --no-pager log -1 --format='✓ %h — %s%n  signature %G? par %GK'
