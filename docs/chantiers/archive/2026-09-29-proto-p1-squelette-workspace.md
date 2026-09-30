# Prototype P1 — squelette du workspace

Portée : hors-cycle
Ouvert le 2026-09-29 · Actualisé le 2026-09-29 · branche `proto/rust` · HEAD `ffd8a86`

## Objectif
Poser le workspace Rust de §5 (crates core, app, html, worker, xtask ; lints, `deny.toml`,
`clippy.toml`, test de couches, hooks) et prouver que les portes restent vertes sur un code vide
et qu'une violation volontaire (un import de `worker` dans `core`) est détectée.

## Contexte à charger
à extraire  `docs/prototype-rust/decision.md` › § 5. Architecture cible — l'arborescence à poser
à extraire  `docs/prototype-rust/decision.md` › § 4. Raccords — askama confiné à html, ports Rng/Clock, xtask seul à tirer schemars
à extraire  `docs/prototype-rust/decision.md` › § 6. Outillage agent — boucle locale et CI bloquante à faire tourner
à extraire  `docs/prototype-rust/decision.md` › § 2. Décisions, lignes D2 et D12 à D14
à situer    `archives/ts-2.x/` — le cycle TypeScript, référence seulement

## Acquis
- J'ai décidé de mener le prototype hors du cycle OpenSpec : il produit des mesures pour
  `decision.md` §8, pas des specs. Seul P1 a vocation à rester comme fondation.
- J'ai constaté que le script de conformité du plugin (`.claude/scripts/scd-arch-conformance.mjs`)
  ne verra aucun import Rust de ce workspace : il ne résout que `use crate::` sous un `src/` à la
  racine. La séparation des crates reposera sur `cargo-deny` et le test de couches.
- Le chemin exact de la fonction getrandom (0.3 ou 0.4) restait à vérifier (§4 R2).

## Prochaine étape
Écrire le `Cargo.toml` racine (`[workspace]`, `[workspace.lints]`) et `rust-toolchain.toml`,
créer les cinq crates vides sous `crates/`, puis faire passer `cargo check --workspace`.

## Écarté
- Dessiner le modèle LikeC4 avant le prototype : P2 à P6 peuvent réviser D3, Q1 et Q3.
- Écrire vision et roadmap avant le prototype : il peut faire tomber la piste Rust elle-même.
- Le lint `unused_crate_dependencies` : il se déclenchait à tort sur les cibles de test ;
  `cargo shear --deny-warnings` tient ce rôle.
- Un `#[allow(clippy::expect_used)]` dans le test de couches : réécrit avec `?` à la place.

## Issue
Critère de P1 atteint le 2026-09-30 : portes vertes sur le code vide, et chaque règle essayée
par une violation volontaire (deny : cms-html → cms-app et worker dans cms-core ; clippy :
SystemTime::now dans core ; test de couches ; shear). Commits `dc34291` (workspace),
`10938bc` (deny.toml), `bbbe4c0` (clippy.toml, getrandom), `4706ae7` (test de couches),
`f3a5487` (hooks D14). Restés hors de P1 : `getrandom::fill` dans le clippy.toml de core
(à poser quand la crate entrera) et la CI GitHub de la porte Rust (§6).
