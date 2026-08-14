#!/usr/bin/env bash
#
# Invariants d'architecture — mode 5 de la grille de docs/ci.md.
#
# Source : la table des invariants de docs/archi.md (I1..I10) et les clauses
# d'ADR que le registre de docs/ci.md verse ici — ADR-0015, ADR-0024, ADR-0006.
# Des six ADR qui adressent un contrôle bloquant à docs/ci.md, les trois autres
# n'y passent pas : ADR-0008 revient au job `test`, ADR-0009 et ADR-0012 ne sont
# rendus par aucun contrôle. Le registre le dit ligne par ligne.
#
# CE SCRIPT EST INFORMATIF. Son taux de faux positifs n'est pas mesuré : un
# contrôle maison neuf n'en a aucun de connu, et un contrôle bruyant finit
# désactivé. La mesure se fait par rejeu sur l'historique du dépôt — c'est
# l'objet de docs/chantiers/en-attente/2026-08-14-durcissement-ci.md.
#
# Il porte sur l'ARBRE COURANT, pas sur le diff : un invariant violé par une
# ligne qu'aucune PR ne touche reste violé.
#
# Trois états par contrôle :
#   OK        le chemin existe et rien ne le viole
#   HORS      le chemin n'existe pas encore — le contrôle n'a rien à dire
#   VIOLATION avec le fichier et la ligne
#
# `git ls-files` et non `find` : seul ce qui est versionné compte.
set -uo pipefail

fail=0
declare -i n_ok=0 n_hors=0

ok()   { echo "  ✓ $1"; n_ok+=1; }
hors() { echo "  · $1 — HORS PORTÉE ($2 absent du dépôt)"; n_hors+=1; }
ko()   { echo "::warning title=Invariant $1::$2"; printf '      %s\n' "${@:3}"; fail=1; }

# Les fichiers versionnés d'un chemin donné, ou rien.
files() { git ls-files -- "$@" 2>/dev/null; }
# Vrai si au moins un fichier versionné existe sous ce chemin.
exists() { [ -n "$(files "$@")" ]; }

SRC_EXT=('*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.astro' '*.svelte')

echo "── Invariants de docs/archi.md ───────────────────────────────────────────"

# ── I1 · sens descendant des dépendances entre zones ─────────────────────────
# NON RENDU ICI. La matrice des arêtes autorisées se vérifie sur le graphe
# d'imports résolu — alias `tsconfig paths`, ré-exports, barils —, ce à quoi une
# expression régulière ne suffit pas (docs/archi.md § I1).
# Le moteur est la chaîne ESLint — eslint-plugin-boundaries sur
# eslint-import-resolver-typescript ; ses règles se posent au scaffold dans
# eslint.config.*. dependency-cruiser est écarté depuis le 2026-08-14 : ni
# .astro, ni TypeScript 7 (docs/ci.md § Registre des ADR vérifiés en CI).
echo "  ! I1 (sens descendant des dépendances entre zones) — NON RENDU : exige un graphe d'imports résolu (chaîne ESLint, à poser au scaffold)"

# ── I2 · src/core/ n'importe ni framework ni plateforme ──────────────────────
if exists 'src/core/*'; then
  hits=$(files 'src/core/*' | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' \
         | xargs -r grep -nE "(from|import|require\()[[:space:]]*['\"](astro|svelte|@astrojs/|cloudflare:)" 2>/dev/null) || true
  if [ -n "$hits" ]; then
    ko I2 "un fichier de src/core/ importe un framework ou la plateforme (ADR-0022)" "$hits"
  else
    ok "I2 — src/core/ n'importe ni astro, ni svelte, ni @astrojs/*, ni cloudflare:*"
  fi
else
  hors "I2" "src/core/"
fi

# ── I3 · rendu partagé par le publié et l'aperçu ─────────────────────────────
# Premier membre rendu ici (le point d'entrée unique) ; le second — les deux
# routes importent bien src/site/page.astro — l'est aussi, par présence.
if exists 'src/render/*'; then
  hits=$(files "${SRC_EXT[@]}" | grep -v '^src/render/' \
         | xargs -r grep -nE "['\"][^'\"]*src/render/[^'\"]+['\"]" 2>/dev/null \
         | grep -vE "src/render(/index(\.ts)?)?['\"]") || true
  if [ -n "$hits" ]; then
    ko I3 "src/render/ est atteint ailleurs que par src/render/index.ts (ADR-0023)" "$hits"
  else
    ok "I3 (a) — src/render/ n'est atteint que par son index"
  fi
  manquants=""
  for r in 'src/pages/[...slug].astro' 'src/pages/admin/apercu/[...slug].astro'; do
    if [ -f "$r" ] && ! grep -qE "src/site/page\.astro|\.\./site/page\.astro" "$r"; then
      manquants="${manquants}${r}"$'\n'
    fi
  done
  [ -n "$manquants" ] \
    && ko I3 "une route ne passe pas par le gabarit partagé src/site/page.astro (ADR-0023)" "$manquants" \
    || ok "I3 (b) — les deux routes passent par le gabarit partagé, ou n'existent pas encore"
else
  hors "I3" "src/render/"
fi

# ── I4 · aucune directive client:* sous src/admin/ ───────────────────────────
if exists 'src/admin/*'; then
  hits=$(files 'src/admin/*.astro' | xargs -r grep -nE 'client:(load|idle|visible|media|only)' 2>/dev/null) || true
  if [ -n "$hits" ]; then
    ko I4 "une directive client:* sous src/admin/ (ADR-0024) — elle produit du script en ligne, que la CSP stricte de l'administration interdit" "$hits"
  else
    ok "I4 — aucune directive client:* sous src/admin/"
  fi
else
  hors "I4" "src/admin/"
fi

# ── I5 · HTML brut confiné au rendu Markdown ─────────────────────────────────
if exists 'src/*'; then
  hits=$(files "${SRC_EXT[@]}" | grep -v '^src/render/markdown/' \
         | xargs -r grep -nE '\{@html|set:html' 2>/dev/null) || true
  if [ -n "$hits" ]; then
    ko I5 "du HTML brut est rendu hors de src/render/markdown/ (ADR-0025) — c'est la porte du XSS stocké sur l'origine commune" "$hits"
  else
    ok "I5 — {@html} et set:html ne vivent que sous src/render/markdown/"
  fi
else
  hors "I5" "src/"
fi

# ── I6 · garde de session par import · surface publique close ────────────────
if exists 'src/pages/api/*' 'src/pages/admin/*'; then
  sans_garde=""
  while IFS= read -r f; do
    case "$f" in src/pages/api/public/*) continue ;; esac
    grep -qE "platform/session" "$f" || sans_garde="${sans_garde}${f}"$'\n'
  done < <(files 'src/pages/api/*' 'src/pages/admin/*' | grep -E '\.(ts|astro)$')
  [ -n "$sans_garde" ] \
    && ko I6 "une route d'API ou d'administration n'importe pas le garde de session src/platform/session/index.ts (ADR-0026)" "$sans_garde" \
    || ok "I6 (a) — toute route hors src/pages/api/public/ importe le garde de session"

  multipart=$(files 'src/pages/api/public/*' | xargs -r grep -nE '\.formData\(\)' 2>/dev/null) || true
  [ -n "$multipart" ] \
    && ko I6 "une route publique lit un corps multipart (ADR-0026) — FR-061 interdit tout fichier téléversé par un visiteur" "$multipart" \
    || ok "I6 (b) — aucune route publique ne lit de corps multipart"
else
  hors "I6" "src/pages/api/ et src/pages/admin/"
fi

# ── I7 · objet de fréquence nommé par une constante ──────────────────────────
if exists 'src/platform/frequence/*'; then
  suspects=$(files 'src/platform/frequence/*' \
             | xargs -r grep -nE 'idFromName\(' 2>/dev/null \
             | grep -vE "idFromName\([[:space:]]*(\"[^\"]*\"|'[^']*'|\`[^\`\$]*\`|[A-Z_][A-Z0-9_]*)[[:space:]]*\)") || true
  [ -n "$suspects" ] \
    && ko I7 "l'identifiant de l'objet de fréquence n'est pas une constante littérale (ADR-0027) — un objet par visiteur ferait de son nom l'empreinte d'une adresse, hors de portée de toute reprise" "$suspects" \
    || ok "I7 — idFromName ne reçoit qu'une constante littérale"
else
  hors "I7" "src/platform/frequence/"
fi

# ── I8 · les valeurs d'instance ne vivent que dans instance.json ─────────────
if [ -f instance.json ]; then
  # Les valeurs de chaînes du fichier d'instance, hors valeurs trop courtes
  # pour être cherchées sans bruit.
  mapfile -t valeurs < <(grep -oE '"[^"]{8,}"' instance.json | tr -d '"' | sort -u)
  fuites=""
  for v in "${valeurs[@]}"; do
    h=$(files "${SRC_EXT[@]}" 'astro.config.*' 'wrangler.*' 'package.json' \
        | xargs -r grep -nF -- "$v" 2>/dev/null) || true
    [ -n "$h" ] && fuites="${fuites}${h}"$'\n'
  done
  [ -n "$fuites" ] \
    && ko I8 "une valeur propre à l'instance est recopiée hors d'instance.json (ADR-0028) — hors contenu, le diff entre les dépôts de deux clientes doit être vide" "$fuites" \
    || ok "I8 — aucune valeur d'instance.json n'est recopiée dans le code ni dans les configurations"
else
  hors "I8" "instance.json"
fi

# ── I9 · préfixes de publication en constante unique ─────────────────────────
if exists 'src/core/publication/*'; then
  ailleurs=$(files "${SRC_EXT[@]}" | grep -v '^src/core/publication/prefixes\.ts$' \
             | xargs -r grep -n 'PREFIXES_AUTORISES' 2>/dev/null \
             | grep -vE "from[[:space:]]*['\"]") || true
  [ -n "$ailleurs" ] \
    && ko I9 "PREFIXES_AUTORISES est déclaré ailleurs que dans src/core/publication/prefixes.ts (ADR-0029)" "$ailleurs" \
    || ok "I9 (a) — PREFIXES_AUTORISES n'a qu'un seul porteur"

  if [ -f src/core/publication/prefixes.ts ]; then
    if grep -qE "['\"]\.github/?" src/core/publication/prefixes.ts; then
      ko I9 "'.github/' figure dans PREFIXES_AUTORISES (ADR-0029) — la publication pourrait alors réécrire le portail qui la contrôle" "src/core/publication/prefixes.ts"
    else
      ok "I9 (b) — .github/ ne figure pas dans les préfixes publiables"
    fi
  fi
else
  hors "I9" "src/core/publication/"
fi

# ── I10 · les configurations lisent le fichier d'instance ────────────────────
if ls astro.config.* wrangler.* >/dev/null 2>&1; then
  muettes=""
  for c in $(files 'astro.config.*' 'wrangler.*'); do
    grep -q 'instance.json' "$c" || muettes="${muettes}${c}"$'\n'
  done
  [ -n "$muettes" ] \
    && ko I10 "une configuration ne lit pas instance.json et redit donc ses valeurs (ADR-0030)" "$muettes" \
    || ok "I10 — les deux configurations lisent instance.json"
else
  hors "I10" "astro.config.* et wrangler.*"
fi

echo
echo "── Contrôles réclamés par des ADR, hors table de docs/archi.md ───────────"

# ── ADR-0015 · la liste run_worker_first reste bornée ────────────────────────
# Si elle passe globale, TOUTES les réponses sont générées par le code et le
# fichier _headers cesse silencieusement de s'appliquer aux pages publiques.
if ls wrangler.* >/dev/null 2>&1; then
  large=$(grep -nE 'run_worker_first' $(files 'wrangler.*') 2>/dev/null \
          | grep -E '(:[[:space:]]*true|"/\*"|'"'"'/\*'"'"')') || true
  [ -n "$large" ] \
    && ko ADR-0015 "run_worker_first est global ou porte un motif fourre-tout — le fichier _headers ne s'applique plus aux pages publiques, qui perdent leurs en-têtes de sécurité en silence" "$large" \
    || ok "ADR-0015 (a) — run_worker_first reste une liste bornée"
else
  hors "ADR-0015 (a)" "wrangler.*"
fi

# ── ADR-0015 · ADR-0024 · la CSP se définit par ses interdits ────────────────
# « Stricte » ne se prouve pas par la présence de l'en-tête : ce sont les
# interdits qui se vérifient. La moitié statique est greppable ; la présence de
# l'en-tête sur chaque réponse, elle, est du runtime — voir docs/ci.md
# § Ce que ces contrôles ne couvrent pas.
if exists 'src/*'; then
  relachee=$(files "${SRC_EXT[@]}" 'public/_headers' \
             | xargs -r grep -nE "unsafe-inline|unsafe-eval" 2>/dev/null) || true
  [ -n "$relachee" ] \
    && ko ADR-0024 "une directive CSP relâchée dans les sources — la seconde des deux parades de la quatrième porte s'ouvre en silence, et cette porte n'a aucun repli" "$relachee" \
    || ok "ADR-0015 (b) / ADR-0024 — ni unsafe-inline ni unsafe-eval dans les sources"
else
  hors "ADR-0024" "src/"
fi

# ── ADR-0006 · les quatre attributs du cookie de session ─────────────────────
# Quatre attributs dont l'absence ne casse aucun écran : elle ne se voit qu'à
# l'attaque. Ils sont statiques, donc lisibles dans les sources.
if exists 'src/platform/session/*'; then
  porteur=$(files 'src/platform/session/*' | xargs -r grep -lE 'Set-Cookie|__Host-' 2>/dev/null) || true
  if [ -n "$porteur" ]; then
    manquants=""
    for a in '__Host-' 'HttpOnly' 'Secure' 'SameSite=Strict'; do
      grep -qF -- "$a" $porteur || manquants="${manquants} ${a}"
    done
    [ -n "$manquants" ] \
      && ko ADR-0006 "le cookie de session ne porte pas tous ses attributs —${manquants}" "$porteur" \
      || ok "ADR-0006 — le cookie de session porte __Host-, HttpOnly, Secure et SameSite=Strict"
  else
    hors "ADR-0006" "le porteur du cookie sous src/platform/session/"
  fi
else
  hors "ADR-0006" "src/platform/session/"
fi

echo
echo "── Bilan : ${n_ok} contrôle(s) au vert · ${n_hors} hors portée · $([ $fail -eq 0 ] && echo 0 || echo 'au moins 1') violation(s)"
if [ "$n_ok" -eq 0 ]; then
  echo "::notice title=Aucun code::Le dépôt ne porte encore aucune source — ce contrôle n'a rien vérifié (docs/ci.md § L'état du dépôt)."
fi
exit $fail
