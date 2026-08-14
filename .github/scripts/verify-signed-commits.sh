#!/usr/bin/env bash
#
# Vérifie que chaque commit passé en argument porte une signature SSH valide,
# émise par une clé listée dans le fichier allowed_signers fourni.
#
#   Usage : verify-signed-commits.sh <allowed_signers> <sha>...
#   Sortie : 0 si tous vérifiés · 1 si un seul ne l'est pas · 0 si aucun sha.
#
# Partagé par `verifier-guard` et `test-integrity`. La logique est critique et
# deux copies dériveraient ; ce fichier est donc surveillé par
# `quality-config-guard` au même titre que la configuration qualité.
#
# `pipefail` n'est PAS décoratif : sans lui, `git verify-commit | sed` rendrait
# le code de sortie de `sed`, et le garde accepterait tout.
set -uo pipefail

signers="${1:?allowed_signers manquant}"; shift
[ $# -gt 0 ] || exit 0

# Fermeture par défaut : sans liste de clés, rien ne peut être prouvé, donc
# rien n'est accepté.
if [ ! -f "$signers" ]; then
  echo "::error title=Aucune clé de confiance::${signers} est absent — aucune preuve n'est possible, donc rien n'est accepté (docs/ci.md § La soupape de verifier-guard)."
  exit 1
fi

git config gpg.format ssh
git config gpg.ssh.allowedSignersFile "$signers"

# Rend le type de chaque clé de confiance visible dans le log. Une clé `sk-*`
# est adossée à un jeton matériel ; toute autre est un fichier, dont la
# protection tient à un usage et non à une preuve (docs/ci.md).
awk '{printf "  clé de confiance : %s — type %s\n", $1, $2}' "$signers"

fail=0
for c in "$@"; do
  if git verify-commit "$c" 2>&1 | sed 's/^/    /'; then
    echo "  ✓ ${c} — signature valide"
  else
    echo "::error title=Commit non signé::${c} — $(git log -1 --format=%s "$c")"
    fail=1
  fi
done

exit $fail
