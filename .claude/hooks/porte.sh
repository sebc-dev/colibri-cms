#!/usr/bin/env bash
# Hook Stop (D14) : la porte bloquante de D13 avant de rendre la main — seulement si l'arbre de
# travail porte des modifications Rust non commitées. Un seul renvoi : si l'agent a déjà été
# relancé par ce hook (stop_hook_active), il rend la main et l'échec reste visible.
set -u
export PATH="$HOME/.cargo/bin:$PATH"
[ "$(jq -r '.stop_hook_active // false')" = "true" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
git status --porcelain -- '*.rs' '*Cargo.toml' Cargo.lock '*clippy.toml' deny.toml .cargo rust-toolchain.toml \
  | grep -q . || exit 0

etape() {
  local nom=$1; shift
  local sortie
  if ! sortie=$("$@" 2>&1); then
    printf 'Porte en échec — %s :\n%s\n' "$nom" "$(printf '%s\n' "$sortie" | tail -n 40)" >&2
    exit 2
  fi
}
etape "cargo fmt"            cargo fmt --all --check
etape "clippy natif"         cargo clippy --workspace --all-targets --quiet -- -D warnings
etape "clippy wasm32"        cargo clippy -p cms-worker --target wasm32-unknown-unknown --quiet -- -D warnings
etape "cargo deny"           cargo deny --log-level error check bans licenses sources
etape "cargo shear"          cargo shear --deny-warnings
etape "tests (nextest)"      cargo nextest run --workspace --no-fail-fast
exit 0
