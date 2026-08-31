#!/usr/bin/env bash
#
# Vérification observée — ticket 09 (specs/001-connexion-par-code/
# 09-parcours-local.md), SPEC.md § Décisions de test.
#
# Mode `observé`, arbitré par SPEC.md le 2026-08-25 : la liaison d'expédition
# réelle (`send_email`, ADR-0002) n'existe pas dans le moteur de test — ses
# tables tournent contre la vraie D1 locale, mais l'envoi lui-même n'y est
# observable, en local, que via l'écriture sur disque temporaire de
# Miniflare (`node_modules/miniflare/dist/src/workers/email/
# send_email.worker.js`, mesuré) — une dépendance d'implémentation fragile
# pour un test HTTP. Et une égalité de DURÉES ne se juge jamais sur une
# assertion. Les deux se constatent ici, contre le serveur de développement
# local (`npm run dev`), au prix d'une vérification lente.
#
# Patron : `scripts/verif-bout-en-bout.sh` — `set -uo pipefail`, helpers
# `ok()`/`ko()` qui comptent et impriment, sections `step()`, un bilan final
# au même format, découverte du serveur de dev via le fichier de verrou
# `.astro/dev.json` (`pid`/`port`/`url`) plutôt qu'un port en dur.
#
# Ce script est le SEUL endroit du projet où la vraie liaison d'expédition
# est éprouvée (SPEC.md § Ce que ça livre) — jamais un simulacre, jamais un
# double interne : chaque code demandé passe par `POST /admin/connexion`
# réel, chaque message observé est celui que la plateforme a réellement reçu
# pour expédition.
#
# Ce qu'il NE prouve PAS (hors-périmètre, rappelé par le ticket) : la
# réception réelle du message — seul son DÉPART se constate ici.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

fail=0
declare -i n_ok=0 n_ko=0

ok() {
  echo "  ✓ $1"
  n_ok+=1
}
ko() {
  echo "  ✗ $1"
  fail=1
  n_ko+=1
}

step() {
  echo
  echo "── $1 ─────────────────────────────────────────────"
}

echo "Horodatage de départ : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ─── Constantes du parcours (reprises des tickets 03/04/05, mêmes valeurs que
# les fichiers de test de la feature — tests/integration/*.test.ts) ─────────
ADRESSE_AUTORISEE='editrice@example.com' # wrangler.astro.jsonc, send_email.destination_address
ADRESSE_QUELCONQUE='quelquun-dautre@example.com'
NOM_COOKIE_APPAREIL='identifiant-appareil'
NOM_COOKIE_SESSION='__Host-session'
PLAFOND=5
ALPHABET_CODE='0123456789ABCDEFGHJKMNPQRSTVWXYZ' # Crockford, sans confusables (ADR-0001)
MARQUEUR_ECRAN_CONNEXION='Recevoir un code'
MARQUEUR_ACCUEIL='Vous êtes connectée'
# L'objet fixe : lu en source plutôt que dupliqué en dur ici — ce que ce
# script éprouve, c'est que la valeur QUE LE PRODUIT DÉFINIT atteint bien le
# message réellement expédié, pas une coïncidence de deux constantes tenues
# séparément.
OBJET_ATTENDU="$(sed -n "s/^const OBJET = '\\(.*\\)';\$/\\1/p" src/platform/email/index.ts)"

if [ -z "$OBJET_ATTENDU" ]; then
  echo "impossible de lire l'objet fixe dans src/platform/email/index.ts — arrêt" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
DEV_LOG="$TMP_DIR/dev.log"
DEV_JOB=""
DEV_STARTED=0

nettoyage() {
  if [ "$DEV_STARTED" -eq 1 ]; then
    npx astro dev stop >>"$DEV_LOG" 2>&1 || true
  fi
  if [ -n "$DEV_JOB" ]; then
    wait "$DEV_JOB" 2>/dev/null || true
  fi
  # Rend la base locale à un état neutre — ne laisse pas les adresses/codes
  # semés par ce script pour la prochaine exécution (D1 locale n'est de toute
  # façon pas versionnée, .gitignore § Cloudflare / Wrangler).
  npx wrangler d1 execute DB --local \
    --command "delete from adresses_autorisees; delete from codes_connexion; delete from sessions;" \
    >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap nettoyage EXIT

d1_exec() {
  npx wrangler d1 execute DB --local --command "$1" >/dev/null 2>&1
}

# Lit le texte visible d'une page HTML : retire <script>/<style> puis toute
# balise — pour que la relecture des textes (c5) porte sur ce que l'éditrice
# lit réellement, pas sur des scripts d'outillage ou des commentaires CSS
# injectés par le mode développement d'Astro (vite, dev toolbar).
texte_visible() {
  node -e '
    let donnees = "";
    process.stdin.on("data", (d) => { donnees += d; });
    process.stdin.on("end", () => {
      const sansScripts = donnees.replace(/<script[\s\S]*?<\/script>/gi, " ");
      const sansStyles = sansScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
      const sansBalises = sansStyles.replace(/<[^>]+>/g, " ");
      process.stdout.write(sansBalises);
    });
  '
}

TERMES_DEVELOPPEUR=(
  'commit' 'branche' 'build' 'déploiement' 'déployer' 'repository' 'dépôt git'
  'endpoint' 'webhook' 'backend' 'front-end' 'framework' 'rate limit'
  'throttle' 'quota' '429'
)

# Rend 0 (échec, au sens shell) si `$2` porte un terme de développeur — imprime
# chaque terme trouvé, sinon confirme l'absence.
verifier_absence_termes_developpeur() {
  local description="$1" texte_minuscule trouve terme
  texte_minuscule="$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]')"
  trouve=0
  for terme in "${TERMES_DEVELOPPEUR[@]}"; do
    if printf '%s' "$texte_minuscule" | grep -qF -- "$terme"; then
      ko "$description porte le terme de développeur « $terme »"
      trouve=1
    fi
  done
  if [ "$trouve" -eq 0 ]; then
    ok "$description ne porte aucun terme de développeur"
  fi
}

# Extrait la valeur d'un cookie depuis un pot au format Netscape (celui que
# `curl -c` écrit).
cookie_depuis_pot() {
  local pot="$1" nom="$2"
  awk -v nom="$nom" -F'\t' '$6 == nom { print $7 }' "$pot" | tail -1
}

# ─── Étape 0 — environnement reproductible ──────────────────────────────────
step "0. Environnement reproductible : migrations appliquées, tables vidées"

if out="$(npm run db:migrate 2>&1)"; then
  ok "npm run db:migrate (FR-013, FR-014)"
else
  ko "npm run db:migrate a échoué"
  echo "$out" | sed 's/^/      /'
fi

rm -rf .astro .wrangler/tmp/email
mkdir -p .wrangler/tmp/email

if d1_exec "delete from adresses_autorisees; delete from codes_connexion; delete from sessions; insert into adresses_autorisees (adresse) values ('$ADRESSE_AUTORISEE');"; then
  ok "adresse autorisée semée ($ADRESSE_AUTORISEE), tables vidées"
else
  ko "le semis de l'adresse autorisée a échoué"
fi

# ─── Étape 1 — serveur de développement local ───────────────────────────────
step "1. npm run dev — découverte du serveur via .astro/dev.json"

npm run dev >"$DEV_LOG" 2>&1 &
DEV_JOB=$!

DEV_LOCK=".astro/dev.json"
dev_pret=0
for _ in $(seq 1 30); do
  if [ -f "$DEV_LOCK" ]; then
    dev_pret=1
    break
  fi
  if ! kill -0 "$DEV_JOB" 2>/dev/null; then
    break
  fi
  sleep 1
done

DEV_URL=""
if [ "$dev_pret" -eq 0 ]; then
  ko "npm run dev n'a pas démarré de serveur"
  sed 's/^/      /' "$DEV_LOG"
else
  DEV_STARTED=1
  DEV_URL="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(".astro/dev.json","utf-8")).url)')"
  ok "serveur de développement démarré ($DEV_URL)"
fi

ORIGIN_HEADER="Origin: $DEV_URL"

# Attend qu'un nouveau fichier .txt apparaisse sous .wrangler/tmp/email/ —
# c'est la seule trace observable, en local, d'un appel réel à la liaison
# `send_email` (ADR-0002, mesuré contre miniflare). `$1` est la liste (une
# entrée par ligne) des fichiers déjà présents avant l'action à observer.
attendre_nouveau_fichier_email() {
  local avant="$1" timeout="${2:-5}" fin apres nouveau
  fin=$((SECONDS + timeout))
  while [ "$SECONDS" -lt "$fin" ]; do
    apres="$(find .wrangler/tmp/email -type f -name '*.txt' 2>/dev/null | sort)"
    nouveau="$(comm -13 <(printf '%s\n' "$avant") <(printf '%s\n' "$apres"))"
    if [ -n "$nouveau" ]; then
      printf '%s\n' "$nouveau" | head -1
      return 0
    fi
    sleep 0.2
  done
  return 1
}

liste_fichiers_email() {
  find .wrangler/tmp/email -type f -name '*.txt' 2>/dev/null | sort
}

# Le dernier message « send_email binding called » vu dans les journaux du
# serveur de développement (buffer tenu par `astro dev logs`, indépendant de
# ce que ce script a capturé sur son propre descripteur de sortie).
dernier_message_envoi() {
  npx astro dev logs 2>/dev/null | node -e '
    let donnees = "";
    process.stdin.on("data", (d) => { donnees += d; });
    process.stdin.on("end", () => {
      const lignes = donnees.split("\n").filter(Boolean);
      for (let i = lignes.length - 1; i >= 0; i -= 1) {
        try {
          const objet = JSON.parse(lignes[i]);
          if (typeof objet.message === "string" && objet.message.startsWith("send_email binding called")) {
            process.stdout.write(objet.message);
            process.exit(0);
          }
        } catch {
          // ligne non-JSON (bruit de vite) : ignorée.
        }
      }
      process.exit(1);
    });
  '
}

if [ "$DEV_STARTED" -eq 1 ]; then

  # ─── Étape 2 (c1) — le parcours entier, sans intervention manuelle ────────
  step "2. Le parcours entier, de l'écran de connexion à l'accueil (c1)"

  POT_C1="$TMP_DIR/pot-c1.txt"
  CORPS_C1_INITIAL="$TMP_DIR/c1-initial.html"
  curl -s -c "$POT_C1" "$DEV_URL/admin/connexion" -o "$CORPS_C1_INITIAL"
  APPAREIL_C1="$(cookie_depuis_pot "$POT_C1" "$NOM_COOKIE_APPAREIL")"

  if [ -n "$APPAREIL_C1" ] && grep -qF "$MARQUEUR_ECRAN_CONNEXION" "$CORPS_C1_INITIAL"; then
    ok "l'écran de connexion s'affiche et pose un identifiant d'appareil"
  else
    ko "l'écran de connexion n'a pas posé d'identifiant d'appareil, ou ne s'affiche pas"
  fi

  AVANT_C1="$(liste_fichiers_email)"
  curl -s -b "$POT_C1" -c "$POT_C1" -X POST "$DEV_URL/admin/connexion" \
    -H "content-type: application/x-www-form-urlencoded" -H "$ORIGIN_HEADER" \
    --data-urlencode "adresse=$ADRESSE_AUTORISEE" -o /dev/null

  FICHIER_C1="$(attendre_nouveau_fichier_email "$AVANT_C1" 10 || true)"
  CODE_C1=""
  if [ -n "$FICHIER_C1" ] && [ -f "$FICHIER_C1" ]; then
    CODE_C1="$(sed -n "s/^Code : \\([$ALPHABET_CODE]\\{8\\}\\)\$/\\1/p" "$FICHIER_C1")"
  fi

  if [ -n "$CODE_C1" ]; then
    ok "un code a été demandé et retrouvé dans le message expédié ($CODE_C1)"
  else
    ko "aucun code retrouvable dans un message expédié — le parcours ne peut pas continuer"
  fi

  ENTETES_C1="$TMP_DIR/c1-entetes.txt"
  curl -s -D "$ENTETES_C1" -b "$POT_C1" -c "$POT_C1" -X POST "$DEV_URL/admin/connexion" \
    -H "content-type: application/x-www-form-urlencoded" -H "$ORIGIN_HEADER" \
    --data-urlencode "code=$CODE_C1" -o /dev/null

  if grep -qi "^HTTP/.* 302" "$ENTETES_C1" && grep -qi "^set-cookie: $NOM_COOKIE_SESSION=" "$ENTETES_C1"; then
    ok "le code recopié ouvre une session (302 + cookie __Host-session)"
  else
    ko "la soumission du code n'a pas ouvert de session"
    sed 's/^/      /' "$ENTETES_C1"
  fi

  CORPS_ACCUEIL="$TMP_DIR/accueil.html"
  ENTETES_ACCUEIL="$TMP_DIR/accueil-entetes.txt"
  curl -s -D "$ENTETES_ACCUEIL" -b "$POT_C1" "$DEV_URL/admin/" -o "$CORPS_ACCUEIL"

  if grep -qi "^HTTP/.* 200" "$ENTETES_ACCUEIL" && grep -qF "$MARQUEUR_ACCUEIL" "$CORPS_ACCUEIL"; then
    ok "l'accueil est atteint avec la session ouverte — parcours complet, sans intervention manuelle"
  else
    ko "l'accueil n'a pas été atteint avec la session ouverte"
  fi

  # ─── Étape 3 (c2) — le départ est conditionné à l'adresse autorisée ───────
  step "3. Le départ du message est conditionné à l'adresse autorisée (c2)"

  d1_exec "delete from codes_connexion;"

  POT_AUTORISEE="$TMP_DIR/pot-autorisee.txt"
  curl -s -c "$POT_AUTORISEE" "$DEV_URL/admin/connexion" -o /dev/null
  AVANT_AUTORISEE="$(liste_fichiers_email)"
  curl -s -b "$POT_AUTORISEE" -X POST "$DEV_URL/admin/connexion" \
    -H "content-type: application/x-www-form-urlencoded" -H "$ORIGIN_HEADER" \
    --data-urlencode "adresse=$ADRESSE_AUTORISEE" -o /dev/null
  FICHIER_AUTORISEE="$(attendre_nouveau_fichier_email "$AVANT_AUTORISEE" 10 || true)"

  if [ -n "$FICHIER_AUTORISEE" ]; then
    ok "soumettre l'adresse autorisée fait partir un message"
  else
    ko "soumettre l'adresse autorisée n'a fait partir aucun message"
  fi

  MESSAGE_AUTORISEE="$(dernier_message_envoi || true)"

  POT_QUELCONQUE="$TMP_DIR/pot-quelconque.txt"
  curl -s -c "$POT_QUELCONQUE" "$DEV_URL/admin/connexion" -o /dev/null
  AVANT_QUELCONQUE="$(liste_fichiers_email)"
  curl -s -b "$POT_QUELCONQUE" -X POST "$DEV_URL/admin/connexion" \
    -H "content-type: application/x-www-form-urlencoded" -H "$ORIGIN_HEADER" \
    --data-urlencode "adresse=$ADRESSE_QUELCONQUE" -o /dev/null
  sleep 1
  FICHIER_QUELCONQUE="$(attendre_nouveau_fichier_email "$AVANT_QUELCONQUE" 2 || true)"

  if [ -z "$FICHIER_QUELCONQUE" ]; then
    ok "soumettre une autre adresse ne fait partir aucun message"
  else
    ko "soumettre une autre adresse a pourtant fait partir un message"
  fi

  # ─── Étape 4 (c3) — la forme du message ────────────────────────────────────
  step "4. Le message part en texte seul, sans HTML, avec l'objet fixe (c3)"

  if [ -n "$FICHIER_AUTORISEE" ] && [ -f "$FICHIER_AUTORISEE" ]; then
    CONTENU_MESSAGE="$(cat "$FICHIER_AUTORISEE")"
    if printf '%s' "$CONTENU_MESSAGE" | grep -Eq "^Code : [$ALPHABET_CODE]{8}\$" \
      && ! printf '%s' "$CONTENU_MESSAGE" | grep -q '<'; then
      ok "le corps expédié est du texte seul (« Code : ……… »), sans balise"
    else
      ko "le corps expédié n'a pas la forme attendue"
      echo "      contenu : $CONTENU_MESSAGE"
    fi
  else
    ko "aucun fichier de message à examiner pour la forme du corps"
  fi

  if [ -n "$MESSAGE_AUTORISEE" ]; then
    DESTINATAIRE_MESSAGE="$(printf '%s\n' "$MESSAGE_AUTORISEE" | grep -m1 -E '^To: ' || true)"
    if [ -z "$DESTINATAIRE_MESSAGE" ] && [ -n "$FICHIER_AUTORISEE" ] && [ -f "$FICHIER_AUTORISEE" ]; then
      DESTINATAIRE_MESSAGE="$(grep -m1 -E '^To: ' "$FICHIER_AUTORISEE" || true)"
    fi
    if printf '%s' "$DESTINATAIRE_MESSAGE" | grep -qF "To: $ADRESSE_AUTORISEE"; then
      ok "le message remis à la plateforme est adressé à l'adresse autorisée (« $ADRESSE_AUTORISEE »)"
    else
      ko "le destinataire du message remis à la plateforme n'est pas l'adresse autorisée"
      echo "      destinataire : $DESTINATAIRE_MESSAGE"
    fi
    if printf '%s' "$MESSAGE_AUTORISEE" | grep -qF "Subject: $OBJET_ATTENDU"; then
      ok "l'objet expédié est l'objet fixe posé par le produit (« $OBJET_ATTENDU »)"
    else
      ko "l'objet expédié ne correspond pas à l'objet fixe posé par le produit"
      echo "      journal : $MESSAGE_AUTORISEE"
    fi
    if printf '%s' "$MESSAGE_AUTORISEE" | grep -qF 'HTML:'; then
      ko "le message porte une partie HTML (attendu : texte seul)"
    else
      ok "le message ne porte aucune partie HTML"
    fi
  else
    ko "aucune ligne de journal « send_email binding called » retrouvée pour l'objet/la forme"
  fi

  # ─── Étape 5 (c5, part 1) — les textes statiques du parcours ──────────────
  step "5. Relecture des textes statiques (annonce de portée, refus) — c5"

  # src/admin/textes.ts est du TypeScript : la relecture porte directement
  # sur le texte source (les chaînes littérales elles-mêmes), pas sur un
  # module chargé — ce sont les caractères qui comptent pour une relecture,
  # jamais leur exécution. Couvre les six raisons de refus et l'annonce de
  # portée, jamais jouées toutes les six par un seul parcours HTTP.
  TEXTES_STATIQUES="$(grep -E "^\s*(introuvable|brule|'deja-utilise'|annule|expire|'mauvais-appareil'|export const TEXTE_ANNONCE_PORTEE_CODE)" -A2 src/admin/textes.ts || true)"
  verifier_absence_termes_developpeur "src/admin/textes.ts (annonce de portée + six refus)" "$TEXTES_STATIQUES"

  # ─── Étape 6 (c5, part 2) — les écrans réellement rendus ──────────────────
  step "6. Relecture des écrans joués : connexion, refus, plafond, accueil, message (c5)"

  TEXTE_CONNEXION="$(texte_visible <"$CORPS_C1_INITIAL")"
  verifier_absence_termes_developpeur "l'écran de connexion" "$TEXTE_CONNEXION"

  # Un refus (code introuvable) : appareil dédié, sans toucher au reste du
  # parcours déjà joué.
  POT_REFUS="$TMP_DIR/pot-refus.txt"
  curl -s -c "$POT_REFUS" "$DEV_URL/admin/connexion" -o /dev/null
  CORPS_REFUS="$TMP_DIR/refus.html"
  curl -s -b "$POT_REFUS" -X POST "$DEV_URL/admin/connexion" \
    -H "content-type: application/x-www-form-urlencoded" -H "$ORIGIN_HEADER" \
    --data-urlencode "code=00000000" -o "$CORPS_REFUS"
  verifier_absence_termes_developpeur "l'écran de refus de code" "$(texte_visible <"$CORPS_REFUS")"

  # Le plafond atteint : cinq lignes semées directement (comme les tests),
  # jamais en épuisant réellement le vrai plafond du reste de ce script —
  # retiré aussitôt après lecture.
  d1_exec "delete from codes_connexion;"
  for _ in $(seq 1 "$PLAFOND"); do
    d1_exec "insert into codes_connexion (identifiant_appareil, empreinte, sel, creee_le, expire_le) values ('appareil-plafond-verif-connexion', 'empreinte', 'sel', $(($(date +%s%3N))), $(($(date +%s%3N) + 900000)));"
  done
  POT_PLAFOND="$TMP_DIR/pot-plafond.txt"
  curl -s -c "$POT_PLAFOND" "$DEV_URL/admin/connexion" -o /dev/null
  CORPS_PLAFOND="$TMP_DIR/plafond.html"
  curl -s -b "$POT_PLAFOND" -X POST "$DEV_URL/admin/connexion" \
    -H "content-type: application/x-www-form-urlencoded" -H "$ORIGIN_HEADER" \
    --data-urlencode "adresse=$ADRESSE_QUELCONQUE" -o "$CORPS_PLAFOND"
  verifier_absence_termes_developpeur "l'écran du plafond atteint" "$(texte_visible <"$CORPS_PLAFOND")"
  d1_exec "delete from codes_connexion;"

  verifier_absence_termes_developpeur "l'écran d'accueil" "$(texte_visible <"$CORPS_ACCUEIL")"

  if [ -n "$FICHIER_AUTORISEE" ] && [ -f "$FICHIER_AUTORISEE" ]; then
    verifier_absence_termes_developpeur "le message expédié" "$(cat "$FICHIER_AUTORISEE")"
  fi

  # ─── Étape 7 (c4) — deux cents soumissions hors plafond, fenêtre vidée ────
  step "7. 200 soumissions, hors plafond, fenêtre vidée entre les salves — égalité des temps (c4)"

  NOMBRE_DE_SALVES=25
  PAR_BRANCHE_PAR_SALVE=4 # < PLAFOND (5), marge d'une unité contre tout résidu

  DUREES_AUTORISEE="$TMP_DIR/durees-autorisee.txt"
  DUREES_QUELCONQUE="$TMP_DIR/durees-quelconque.txt"
  : >"$DUREES_AUTORISEE"
  : >"$DUREES_QUELCONQUE"

  POT_MESURE="$TMP_DIR/pot-mesure.txt"
  curl -s -c "$POT_MESURE" "$DEV_URL/admin/connexion" -o /dev/null

  echo "  (${NOMBRE_DE_SALVES} salves de $((PAR_BRANCHE_PAR_SALVE * 2)) soumissions, fenêtre vidée entre chacune — patience, campagne volontairement lente)"

  echec_campagne=0
  for _salve in $(seq 1 "$NOMBRE_DE_SALVES"); do
    if ! d1_exec "delete from codes_connexion;"; then
      echec_campagne=1
    fi
    for _tir in $(seq 1 "$PAR_BRANCHE_PAR_SALVE"); do
      t="$(curl -s -o /dev/null -w '%{time_total}' -b "$POT_MESURE" -c "$POT_MESURE" \
        -X POST "$DEV_URL/admin/connexion" -H "content-type: application/x-www-form-urlencoded" \
        -H "$ORIGIN_HEADER" --data-urlencode "adresse=$ADRESSE_AUTORISEE")"
      awk -v t="$t" 'BEGIN{printf "%.3f\n", t*1000}' >>"$DUREES_AUTORISEE"

      t="$(curl -s -o /dev/null -w '%{time_total}' -b "$POT_MESURE" -c "$POT_MESURE" \
        -X POST "$DEV_URL/admin/connexion" -H "content-type: application/x-www-form-urlencoded" \
        -H "$ORIGIN_HEADER" --data-urlencode "adresse=$ADRESSE_QUELCONQUE")"
      awk -v t="$t" 'BEGIN{printf "%.3f\n", t*1000}' >>"$DUREES_QUELCONQUE"
    done
  done
  d1_exec "delete from codes_connexion;"

  if [ "$echec_campagne" -eq 1 ]; then
    ko "au moins une purge de fenêtre a échoué pendant la campagne des 200 soumissions"
  else
    ok "200 soumissions conduites (${NOMBRE_DE_SALVES} salves de $((PAR_BRANCHE_PAR_SALVE * 2)), fenêtre vidée entre chacune, jamais plus de ${PAR_BRANCHE_PAR_SALVE} < ${PLAFOND} par branche et par salve)"
  fi

  stats() {
    local f="$1" n moyenne min max mediane
    n="$(wc -l <"$f" | tr -d ' ')"
    read -r moyenne min max < <(awk '{s+=$1; if(NR==1||$1<mn)mn=$1; if(NR==1||$1>mx)mx=$1} END{printf "%.2f %.2f %.2f", s/NR, mn, mx}' "$f")
    mediane="$(sort -n "$f" | awk -v n="$n" 'BEGIN{m1=int((n+1)/2); m2=int(n/2)+1} NR==m1{a=$1} NR==m2{b=$1} END{printf "%.2f", (a+b)/2}')"
    echo "$moyenne $mediane $min $max $n"
  }

  read -r MOY_A MED_A MIN_A MAX_A N_A < <(stats "$DUREES_AUTORISEE")
  read -r MOY_Q MED_Q MIN_Q MAX_Q N_Q < <(stats "$DUREES_QUELCONQUE")

  echo "  adresse autorisée  (n=$N_A) — moyenne ${MOY_A} ms · médiane ${MED_A} ms · min ${MIN_A} ms · max ${MAX_A} ms"
  echo "  adresse quelconque (n=$N_Q) — moyenne ${MOY_Q} ms · médiane ${MED_Q} ms · min ${MIN_Q} ms · max ${MAX_Q} ms"

  ECART_MEDIANES="$(awk -v a="$MED_A" -v q="$MED_Q" 'BEGIN{d=a-q; if(d<0)d=-d; printf "%.2f", d}')"
  echo "  écart des médianes : ${ECART_MEDIANES} ms"

  # Une assertion ne juge pas une durée (SPEC.md § Décisions de test) : ce
  # seuil n'est qu'une aide au diagnostic — les nombres ci-dessus sont la
  # preuve, à lire par qui vérifie. 30 ms = 10 % du délai plancher gelé en
  # source (DELAI_PLANCHER_MS = 300 ms, src/core/auth/regles.ts) : au-delà,
  # quelque chose mériterait d'être regardé de plus près.
  SEUIL_ECART_MS=30
  if awk -v e="$ECART_MEDIANES" -v s="$SEUIL_ECART_MS" 'BEGIN{exit !(e<=s)}'; then
    ok "les deux branches restent indiscernables au temps de réponse (écart ${ECART_MEDIANES} ms ≤ ${SEUIL_ECART_MS} ms)"
  else
    ko "l'écart de médiane (${ECART_MEDIANES} ms) dépasse le seuil de diagnostic (${SEUIL_ECART_MS} ms) — à examiner"
  fi

else
  ko "le serveur de développement local n'a pas pu démarrer — étapes 2 à 7 non jouées"
fi

# ─── Bilan ───────────────────────────────────────────────────────────────────
echo
echo "Horodatage de fin : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "── Bilan : ${n_ok} contrôle(s) au vert · $([ $fail -eq 0 ] && echo 0 || echo "${n_ko}") en échec"
exit $fail
