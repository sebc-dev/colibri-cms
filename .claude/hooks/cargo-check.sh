#!/usr/bin/env bash
# Hook PostToolUse (D14) : après l'édition d'un fichier Rust ou d'un manifeste, un `cargo check`
# court. En échec, la sortie tronquée part sur stderr et le code 2 la remet sous les yeux de l'agent.
set -u
export PATH="$HOME/.cargo/bin:$PATH"
fichier=$(jq -r '.tool_input.file_path // empty')
case "$fichier" in
  *.rs|*Cargo.toml|*clippy.toml|*deny.toml|*/.cargo/config.toml) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! sortie=$(cargo check --workspace --all-targets --message-format=short --quiet 2>&1); then
  printf 'cargo check en échec après modification de %s :\n%s\n' "$fichier" "$(printf '%s\n' "$sortie" | head -n 40)" >&2
  exit 2
fi
exit 0
