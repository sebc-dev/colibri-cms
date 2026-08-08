# Journal — socle

> Trace chronologique des phases jouées sur le socle. Les fichiers restent la source de
> vérité de l'état courant ; ce journal enregistre les événements et les faits non dérivables.
> Une ligne = un événement.

| Date | Phase | Résultat |
|---|---|---|
| 2026-08-06 | init-project | arborescence créée (docs/ · adr/_candidates/ · journal/ · chantiers/×3 · research/) · socle vierge · reprise en brief |
| 2026-08-06 | brief | 4 personas · 14 SC · 15 exclusions · socle-de-livraison.md remonté de l'archive (6 invariants intégrés) |
| 2026-08-06 | premortem (brief, hors-cadre) | 15 remédiations appliquées sur 17 retenues (SC-015 ajouté · SC-010/SC-011 durcis · 2 EXCLU · 1 contrainte · 5 QO · 2 précisions Inclus · 2 cases recette + 2 clauses socle) · écartées : R3 livrabilité solo, R12 tiers SC-014 |
| 2026-08-06 | prd | 102 FR · 18 SC · 0 marqueur |
| 2026-08-07 | stack | Astro + Workers (×2) + D1 + GitHub · dépôt = magasin du publié, D1 = brouillon · R2 écarté (carte exigée) · Email Service vers destination vérifiée · 12 décisions → ADR |
| 2026-08-07 | adr | 0001..0012 rédigés (12 candidats Stack, 1:1) · stack.md rétro-lié · déposés dans `_candidates/`, promotion par geste humain (hook d'immutabilité `docs/adr/NNNN-*`) |
| 2026-08-07 | ci | GitHub Actions · 6 bloquants · 3 informatifs · couverture diff **sans seuil chiffré** (informative, seuil renvoyé au durcissement) · garde de scaffold sur build/test/coverage/lint (aucun code au dépôt) · ruleset `Main protect` À METTRE À JOUR — le check requis `quality-gate` du projet abandonné bloque déjà toute PR |
| 2026-08-08 | ci (re-passe) | GitHub Actions · 9 bloquants · 3 informatifs + 2 nocturnes · couverture diff toujours **sans seuil chiffré** · 2 tags d'image morts corrigés (`semgrep:v1.172.0` 404, `trufflehog:v3.96.0` absent) et tout épinglé SHA/digest · +`deps-policy` (cooldown pnpm 10080) · +`workflow-audit` (zizmor 1.29.0 hors ligne) · +`suppression-guard` (signature SSH contre `.github/allowed_signers`, fermeture par défaut ; clé à phrase de passe hors `ssh-agent` — **clé matérielle écartée**, la garantie reste un usage et non une preuve vérifiable par la CI) · `nightly.yml` ouvert (knip · Stryker) · ruleset toujours À METTRE À JOUR |
