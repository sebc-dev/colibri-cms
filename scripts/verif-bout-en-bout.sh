#!/usr/bin/env bash
#
# Vérification bout-en-bout — specs/001-scaffold-projet.
#
# Mode `inhérent` (docs/1.x/specs/001-scaffold-projet/tasks.md § R1/R2,
# docs/ci.md § L'état du dépôt) : la spec exclut toute unité de logique métier,
# donc aucun test à écrire — la preuve EST le code de sortie de ce script. Il
# naît par morceaux, une étape par lot qui la constate (même archive, plan.md
# § Étape de vérification bout-en-bout) : R1 pose les étapes 1 à 5 ci-dessous ;
# R2 y ajoute la 6ᵉ. Les documents cités sont archivés — cycle 1.x.
#
# Patron : .github/scripts/arch-invariants.sh — set -uo pipefail, un état par
# contrôle, le commentaire dit le pourquoi. Ce script-ci NE remplace PAS
# arch-invariants.sh, il l'appelle (étape 3) : les deux vivent côte à côte.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

fail=0
declare -i n_ok=0 n_ko=0

ok() { echo "  ✓ $1"; n_ok+=1; }
ko() {
  echo "  ✗ $1"
  fail=1
  n_ko+=1
}

step() {
  echo
  echo "── $1 ─────────────────────────────────────────────"
}

# Exécute une commande, réussit si elle sort à 0.
expect_zero() {
  local desc="$1"
  shift
  local out
  if out="$("$@" 2>&1)"; then
    ok "$desc"
  else
    ko "$desc (code de sortie $?)"
    echo "$out" | sed 's/^/      /'
  fi
}

# Exécute une commande, réussit si elle sort à un code NON nul — c'est le cas
# des quatre défauts de l'étape 4 : la détection EST le succès de l'assertion.
expect_nonzero() {
  local desc="$1"
  shift
  local out
  if out="$("$@" 2>&1)"; then
    ko "$desc — aucune violation détectée (code de sortie 0, non nul attendu)"
    echo "$out" | sed 's/^/      /'
  else
    ok "$desc"
  fi
}

# Sauvegarde/restauration pour les défauts injectés à l'étape 4 — hors du
# dépôt (un répertoire temporaire), pour ne dépendre d'aucun état git.
BACKUP_DIR="$(mktemp -d)"
trap 'rm -rf "$BACKUP_DIR"' EXIT

backup() { cp -- "$1" "$BACKUP_DIR/$(basename "$1").bak"; }
restore() { cp -- "$BACKUP_DIR/$(basename "$1").bak" "$1"; }

# ─── Préambule : environnement reproductible ────────────────────────────────
# Les artefacts d'une exécution précédente (dist/, coverage/, .astro/,
# .wrangler/) ne doivent pas fausser les constats qui suivent (ex. « dist/
# peuplé » deviendrait vrai par un vieux build, pas par celui de cette étape).
rm -rf dist coverage .astro .wrangler .stryker-tmp reports

# ─── Étape 1 — installation verrouillée + six commandes normatives ──────────
# SC-002 : six codes de sortie nuls sur le scaffold livré, sans garde de
# scaffold. `knip` et `mutation` sont lancées à part : leur code de sortie
# n'entre dans aucun critère (FR-007, FR-023) — voir les cas limites de la
# spec, qui disent pourquoi les faire taire serait pire.
step "1. npm ci puis typecheck / build / test / coverage / lint / lint:boundaries"

# T3 : sur un environnement dépourvu de node_modules/, l'installation
# verrouillée termine avec un code de sortie nul (SC-001).
rm -rf node_modules
expect_zero "npm ci sur un environnement dépourvu de node_modules/ (FR-001, SC-001)" npm ci

# T4 : un package.json désynchronisé du lockfile fait échouer npm ci au lieu
# de le resynchroniser en silence (FR-018). Défaut injecté puis retiré.
backup package.json
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  p.devDependencies['left-pad'] = '^1.3.0';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"
expect_nonzero "package.json désynchronisé du lockfile détecté par npm ci (FR-018)" npm ci
restore package.json

# Le `npm ci` ci-dessus a échoué avant d'installer quoi que ce soit sous ce
# nom : on réinstalle proprement avant de poursuivre, sur le manifeste rendu
# intact.
expect_zero "npm ci (FR-001)" npm ci
expect_zero "npm run typecheck (FR-003)" npm run typecheck
expect_zero "npm run build (FR-002, FR-017)" npm run build

if [ -d dist ] && [ -n "$(find dist -type f -print -quit)" ]; then
  ok "dist/ est peuplé"
else
  ko "dist/ est absent ou vide après le build"
fi

expect_zero "npm test (FR-004)" npm test
expect_zero "npm run coverage (FR-006)" npm run coverage

if [ -f coverage/lcov.info ]; then
  ok "coverage/lcov.info existe"
else
  ko "coverage/lcov.info est absent"
fi

expect_zero "npm run lint (FR-005)" npm run lint
expect_zero "npm run lint:boundaries (FR-010)" npm run lint:boundaries

# `knip` (FR-007) : doit s'exécuter et rapporter — sur ce plancher, qu'aucun
# point d'entrée n'atteint encore, un diagnostic est le comportement correct
# (spec § cas limites) : le taire en le déclarant point d'entrée neutraliserait
# le vérificateur.
knip_out="$(npm run knip 2>&1)"
if [ -n "$knip_out" ]; then
  ok "npm run knip s'est exécuté et a rapporté un diagnostic (FR-007)"
else
  ko "npm run knip n'a produit aucune sortie"
fi

# `mutation` (FR-023) : doit REFUSER — aucun test n'a encore tourné sur ce
# dépôt (spec § cas limites). Un succès serait le signe d'un refus qu'on a
# fait taire, pas d'une réussite.
if npm run mutation >/tmp/verif-mutation.$$ 2>&1; then
  ko "npm run mutation a réussi sans qu'aucun test n'ait tourné (FR-023 attend un refus)"
  sed 's/^/      /' /tmp/verif-mutation.$$
else
  ok "npm run mutation a refusé de s'exécuter, comme l'exige FR-023"
fi
rm -f /tmp/verif-mutation.$$

# ─── Étape 2 — build rejoué sans identifiant Cloudflare ─────────────────────
# SC-008 : aucun identifiant de compte Cloudflare n'est nécessaire au build.
step "2. Build rejoué sans identifiant de compte Cloudflare (SC-008)"
rm -rf dist
expect_zero "build sans CLOUDFLARE_ACCOUNT_ID ni CLOUDFLARE_API_TOKEN" \
  env -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_API_TOKEN npm run build

# ─── Étape 3 — invariants d'architecture ────────────────────────────────────
# SC-010 : sept des dix invariants exercés (I1 par lint:boundaries à l'étape
# 1, six autres ici), trois seuls hors portée (I6, I7, I9). Sur les objets que
# CE script rapporte — et non la ligne de bilan d'arch-invariants.sh, qui
# compte des états rapportés et non des lignes de table (plan § étape 3) — le
# résultat mesuré sur le plancher livré est fixe : neuf états au vert, quatre
# hors portée, zéro violation.
step "3. bash .github/scripts/arch-invariants.sh"

arch_out="$(bash .github/scripts/arch-invariants.sh 2>&1)"
arch_exit=$?
echo "$arch_out" | sed 's/^/      /'

if [ "$arch_exit" -eq 0 ]; then
  ok "arch-invariants.sh sort à 0"
else
  ko "arch-invariants.sh sort à $arch_exit"
fi

bilan_attendu="── Bilan : 9 contrôle(s) au vert · 4 hors portée · 0 violation(s)"
bilan_obtenu="$(echo "$arch_out" | grep -E '^── Bilan')"
if [ "$bilan_obtenu" = "$bilan_attendu" ]; then
  ok "bilan exact : 9 au vert · 4 hors portée · 0 violation (I2,I3,I4,I5,I8,I10 verts ; I6,I7,I9 hors portée)"
else
  ko "bilan inattendu : '$bilan_obtenu' (attendu : '$bilan_attendu')"
fi

# FR-026 : une barre finale ajoutée au motif d'une zone fait basculer I3, sur
# CE fichier — eslint.config.boundaries.js — précisément parce qu'il désigne
# les cinq zones (plan § décision 10, T40). Défaut injecté puis retiré.
backup eslint.config.boundaries.js
node -e "
  const fs = require('fs');
  const f = 'eslint.config.boundaries.js';
  const src = fs.readFileSync(f, 'utf-8');
  const motif = \"pattern: 'src/render'\";
  if (!src.includes(motif)) { throw new Error('motif introuvable : ' + motif); }
  fs.writeFileSync(f, src.replace(motif, \"pattern: 'src/render/*'\"));
"
if bash .github/scripts/arch-invariants.sh >/tmp/verif-i3-defect.$$ 2>&1; then
  ko "(T40) une barre finale sur le motif render n'a pas fait basculer I3 (FR-026)"
  sed 's/^/      /' /tmp/verif-i3-defect.$$
else
  ok "(T40) barre finale sur le motif render détectée — I3 bascule en violation (FR-026)"
fi
rm -f /tmp/verif-i3-defect.$$
restore eslint.config.boundaries.js

# ─── Étape 4 — quatre défauts injectés puis retirés ─────────────────────────
# Chacun doit être SIGNALÉ par un porteur précis ; l'arbre est rendu intact
# à la fin (aucune trace des défauts, aucun fichier de .github/ modifié).
step "4. Quatre défauts injectés puis retirés"

# (a) Incohérence de type — SC-003, porteur : npm run typecheck.
backup src/core/zone.ts
printf '\nexport const DEFAUT_TYPE: number = "pas un nombre";\n' >>src/core/zone.ts
expect_nonzero "(a) incohérence de type détectée par typecheck (SC-003)" npm run typecheck
restore src/core/zone.ts

# (b) Import src/core/ → src/platform/ — SC-004, porteur : npm run
# lint:boundaries (I1, matrice descendante : core → aucune zone).
backup src/core/zone.ts
{
  echo
  echo "import { ZONE as ZONE_PLATFORM } from '../platform/zone.ts';"
  echo 'export const DEFAUT_FRONTIERE = ZONE_PLATFORM;'
} >>src/core/zone.ts
expect_nonzero "(b) import core → platform détecté par lint:boundaries (SC-004)" npm run lint:boundaries
restore src/core/zone.ts

# (c) Import de la plateforme (`cloudflare:workers`) depuis src/core/ — SC-005,
# porteur DISTINCT : arch-invariants.sh (I2), pas eslint — c'est ce que la
# spec exige explicitement, pour ne pas confondre les deux vérificateurs.
backup src/core/zone.ts
{
  echo
  echo "import { env } from 'cloudflare:workers';"
  echo 'export const DEFAUT_PLATEFORME = env;'
} >>src/core/zone.ts
if bash .github/scripts/arch-invariants.sh >/tmp/verif-arch-defect.$$ 2>&1; then
  ko "(c) arch-invariants.sh n'a pas signalé l'import cloudflare:workers dans src/core/ (SC-005)"
  sed 's/^/      /' /tmp/verif-arch-defect.$$
else
  ok "(c) import cloudflare:workers dans src/core/ détecté par arch-invariants.sh — I2 (SC-005)"
fi
rm -f /tmp/verif-arch-defect.$$
restore src/core/zone.ts

# (d) Violation de la règle de lint de style — FR-005 : sans ce défaut, une
# configuration de lint sans une seule règle satisferait quand même l'étape 1.
backup src/site/zone.ts
printf '\nconst defautLintInutilise = 1;\n' >>src/site/zone.ts
expect_nonzero "(d) variable inutilisée détectée par npm run lint (FR-005)" npm run lint
restore src/site/zone.ts

ok "arbre rendu intact — les quatre défauts ont été retirés"

# ─── Étape 5 — la base migrée deux fois ─────────────────────────────────────
# SC-007, FR-021 : la seconde application ne réapplique rien, et le schéma ne
# porte aucun objet propre au produit — seules les tables de service du
# mécanisme de migration et du moteur.
step "5. npm run db:migrate deux fois de suite"

# C'est le script npm nommé par le contrat (FR-013, `db:migrate`) qui doit
# être exercé, pas l'exécutable sous-jacent — sinon une ligne de package.json
# renommée ou pointant ailleurs laisserait l'étape verte.
rm -rf .wrangler
expect_zero "première application des migrations (FR-013)" npm run db:migrate

second_out="$(npm run db:migrate 2>&1)"
second_exit=$?
echo "$second_out" | sed 's/^/      /'
if [ "$second_exit" -eq 0 ] && echo "$second_out" | grep -q "No migrations to apply"; then
  ok "seconde application : zéro migration en attente (FR-014)"
else
  ko "seconde application n'a pas rapporté « No migrations to apply! »"
fi

schema_tables="$(
  npx wrangler d1 execute DB --local --json \
    --command "select name from sqlite_master where type='table' order by name" 2>/dev/null |
    node -e '
      let data = "";
      process.stdin.on("data", (d) => (data += d));
      process.stdin.on("end", () => {
        const parsed = JSON.parse(data);
        console.log(parsed[0].results.map((r) => r.name).sort().join(","));
      });
    '
)"
attendu_tables="_cf_METADATA,d1_migrations,sqlite_sequence"
if [ "$schema_tables" = "$attendu_tables" ]; then
  ok "le schéma ne porte que les tables de service ($schema_tables) — FR-021"
else
  ko "schéma inattendu : '$schema_tables' (attendu : '$attendu_tables')"
fi

# ─── Étape 6 — serveur de développement local et sonde D1 ──────────────────
# FR-012, SC-006 : une seule commande (`npm run dev`) donne un serveur HTTP
# local dont une route lit la base même que l'étape 5 vient de migrer.
# FR-024 : cette route (src/platform/d1/sonde-dev.ts, injectée par
# astro.config.ts uniquement quand `command === 'dev'`) ne doit exister
# qu'en développement — jamais dans dist/.
step "6. npm run dev, sonde /_sonde, puis absence dans dist/ (FR-012, FR-024, SC-006)"

npm run dev >/tmp/verif-dev.$$ 2>&1 &
dev_job=$!

# FR-012 : le port 4321 est celui par défaut, mais pas celui garanti — astro
# bascule sur le port suivant s'il est occupé (ex. par un serveur étranger),
# et interroger 4321 en dur constaterait alors CE serveur-là, pas celui lancé
# ici. Le constat s'ancre donc au fichier de verrou qu'`astro dev` écrit
# lui-même (`.astro/dev.json`, champs `pid`, `port`, `url`) : le préambule a
# fait `rm -rf .astro`, donc son apparition signale CE lancement.
dev_lock=".astro/dev.json"
dev_started=0
for _ in $(seq 1 30); do
  if [ -f "$dev_lock" ]; then
    dev_started=1
    break
  fi
  if ! kill -0 "$dev_job" 2>/dev/null; then
    break
  fi
  sleep 1
done

sonde_body=""
sonde_reached=0
if [ "$dev_started" -eq 0 ]; then
  ko "npm run dev n'a pas démarré de serveur (FR-012)"
  sed 's/^/      /' /tmp/verif-dev.$$
else
  dev_url="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(".astro/dev.json","utf-8")).url)')"

  if sonde_body="$(curl -s -f "$dev_url/_sonde" 2>/dev/null)"; then
    sonde_reached=1
  fi

  if [ "$sonde_reached" -eq 1 ] && [ "$sonde_body" = '{"n":1}' ]; then
    ok "GET /_sonde répond {\"n\":1} — lit la base migrée par l'étape 5 (FR-012, SC-006)"
  elif [ "$sonde_reached" -eq 1 ]; then
    ko "GET /_sonde a répondu '$sonde_body' (attendu : '{\"n\":1}')"
  else
    ko "GET /_sonde n'a jamais répondu — le serveur de développement local n'est pas monté (FR-012)"
  fi
fi

npx astro dev stop >/tmp/verif-dev-stop.$$ 2>&1
wait "$dev_job" 2>/dev/null
echo "$(cat /tmp/verif-dev.$$ /tmp/verif-dev-stop.$$ 2>/dev/null)" | sed 's/^/      /'
rm -f /tmp/verif-dev.$$ /tmp/verif-dev-stop.$$

# FR-024 : le répertoire de sortie du build (`dist/`, produit par l'étape 2
# et jamais reconstruit depuis — `npm run dev` ne reconstruit rien) ne porte
# aucune trace DÉRIVÉE de la sonde. `dist/server/entry.mjs` existe déjà
# indépendamment de cette route — c'est l'entrée générique qu'`output:
# 'server'` émet quel que soit le nombre de routes servies — son existence
# seule ne signale donc rien ; le signal falsifiable est l'absence de tout
# fichier ou de toute chaîne dérivés de `sonde-dev`. Mesuré : sans le garde
# `command === 'dev'` d'astro.config.ts, un fichier
# `dist/server/chunks/sonde-dev_*.mjs` apparaît et la chaîne `_sonde` se lit
# dans `dist/server/entry.mjs` — ce contrôle détecte donc réellement la fuite
# qu'il prétend détecter, pas seulement en apparence.
if [ ! -d dist ]; then
  ko "dist/ est absent au moment de l'étape 6 (attendu : produit par l'étape 2)"
elif find dist -type f -iname '*sonde-dev*' -print -quit | grep -q .; then
  ko "un fichier dérivé de sonde-dev.ts existe dans dist/ (FR-024)"
elif grep -rq "_sonde" dist/ 2>/dev/null; then
  ko "la chaîne _sonde apparaît dans dist/ (FR-024)"
else
  ok "aucun fichier dérivé de la sonde ni occurrence de _sonde dans dist/ (FR-024)"
fi

# ─── Bilan ───────────────────────────────────────────────────────────────────
echo
echo "── Bilan : ${n_ok} contrôle(s) au vert · $([ $fail -eq 0 ] && echo 0 || echo "${n_ko}") en échec"
exit $fail
