# Journal — ColibriCMS

> Trace chronologique des phases jouées. Les fichiers restent la source de vérité de
> l'état courant ; ce journal enregistre les événements et les faits non dérivables
> (verdict analyze, premortem appliqué, issue d'un lot). Une ligne = un événement.
> Les lignes marquées (reconstitué) ont été datées depuis l'historique git.

## Socle

| Date | Phase | Résultat |
|---|---|---|
| 2026-07-17 | brief | 3 personas · 8 SC · 12 exclusions · (reconstitué) |
| 2026-07-17 | prd | 77 FR · 8 SC · (reconstitué) |
| 2026-07-17 | stack | Astro SSG + admin SSR Cloudflare · D1/R2/KV · 23 choix · 4 décisions → ADR · (reconstitué) |
| 2026-07-17 | adr | 0001..0008 · (reconstitué) |
| 2026-07-17 | contract | CLAUDE.md · 6 blocs de contraintes ADR · 4 règles de travail · (reconstitué) |
| 2026-07-31 | migrate | 3 anciens plugins à désinstaller · journal reconstitué · format-lint renseigné |
| 2026-08-01 | prd | réécrit après revue contradictoire · passé à `accepted` · 99 FR · (reconstitué) |
| 2026-08-01 | adr | ADR-0010 « modèle brouillon/publié à deux contenus » `accepted` · (reconstitué) |
| 2026-08-01 | adr | amendements 0003, 0004, 0005, 0007 selon ADR-0010 et la revue · (reconstitué) |
| 2026-08-01 | stack | réaligné sur ADR-0010 · passé à `accepted` · (reconstitué) |
| 2026-08-01 | contract | contraintes d'ADR-0010 et de la revue portées dans CLAUDE.md · (reconstitué) |
| 2026-08-01 | adr | suites de la revue du PRD réparties en 4 amendements (0003 c, 0004 b, 0007 d, 0010 b) · document de suivi éteint · (reconstitué) |

## Sécurité — remédiation de l'audit

| Date | Phase | Résultat |
|---|---|---|
| 2026-08-01 | audit | audit de sécurité du socle documentaire · 4 angles indépendants en contexte frais · 62 constats bruts → **54** fusionnés (4 critiques, 14 élevés, 26 moyens, 10 faibles) · verdict : corpus remarquable sur les risques nommés, muet sur l'injection |
| 2026-08-01 | plan | découpage en 11 lots, un par document cible · matrice de traçabilité des 54 constats · `docs/suites-audit-securite.md` |
| 2026-08-01 | remédiation | **L1** — PRD, section « Exigences transverses » `FR-100` → `FR-110` · mentions légales et information de confidentialité **rapatriées en V1** · ferme C-17d, avance A-01, B-08, B-09, B-12, C-11, C-12, D-01 |
| 2026-08-01 | remédiation | **L2** — `ADR-0011` « Frontières de contenu hostile » `accepted`, racine sécurité de la chaîne documentaire · allowlist fermée du texte riche, contexte de rendu déclaré, type réel par signature d'octets (SVG interdit), en-têtes et CSP · README ADR, `stack.md` et `CLAUDE.md` réalignés · ferme A-01, avance A-02, C-07, C-12, C-17a |
| 2026-08-01 | remédiation | **L3** — `ADR-0004` amendement (c), les suites d'ADR-0011 dans le cœur · `toBlocks()` en arbre de blocs typés (`set:html` interdit), requête D1 paramétrée, aperçu SSR **et** médias bruts sur un hôte distinct sous la même politique Access, `verifyAccessJwt` fail-closed, `against:'live-form-definition'` · ratures `includeDrafts` (ADR-0010) et « Email Routing » → « Email Service » · `stack.md` remonte la restriction `http(s)` du `LinkTarget` hors du commentaire de code · ferme D-02, D-04, avance A-03, B-02, B-05, B-07, B-10, C-01, C-15, C-17b |
| 2026-08-01 | remédiation | **L5** — `ADR-0007` amendement (e), le chemin de soumission de bout en bout · message **composé et non concaténé** (sujet constant, corps en texte brut, caractères de contrôle rejetés à l'entrée, aucun en-tête dérivé d'une valeur de visiteur) · corbeille **rendue comme texte**, délai **normatif à 30 jours**, purge par `DELETE` confiée au Cron · bornes de ce qui entre, de ce qui est composé (`price_delta >= 0`, plafonds anti-débordement) et de ce qui est calculé (plafond du total, dépassement = refus) · limite de débit à **deux étages** (périphérie + compteur par formulaire), `hostname` de `siteverify` contrôlé, *fail-closed* · destinataire hors du site (projection publique sans `recipient_email`) et hors du geste (relu depuis `form_defs` en `live` à chaque acheminement) · **`FR-112`** : soumission refusée si `publications.en_ligne ≠ 1` · zone vidéo (`ref` par expression rationnelle, embed construit, oEmbed en dur, vignette vérifiée avant R2) · `failure_reason` borné · renoncement de l'écart de total écrit pour mémoire · ferme D-10, avance B-03, B-04, B-08, B-09, B-11, C-05, C-06, C-08, C-09, C-11, C-14 |
| 2026-08-01 | remédiation | **L4** — `ADR-0010` amendement (c), ce que le modèle à deux contenus n'écrivait qu'à moitié · clés naturelles à charset fermé, engendrées une fois puis immuables, unicité sur les **deux états réunis** · invariant « rien de public hors des deux contenus » étendu aux **octets** (critère de contenu, le transport restant à ADR-0004 (c)) · `FR-111` : retrait reflété dans le délai de FR-036, fraîcheur du HTML bornée, sort des dérivés écrit comme renoncement borné · jeton de verrou = compteur entier `version`, `datetime('now')` disqualifié · ferme C-13, D-03, avance B-06, B-10 (documentaire clos) |

## 001-ci-quality-gate

| Date | Phase | Résultat |
|---|---|---|
| 2026-07-19 | kickoff-feature | dossier `001-ci-quality-gate` · greenfield · (reconstitué) |
| 2026-07-19 | specify | 30 FR · 0 [NEEDS CLARIFICATION] · (reconstitué) |
| 2026-07-19 | plan | 22 fichiers touchés · 1 candidat ADR (0009) · (reconstitué) |
| 2026-07-19 | tasks | 11 lots R1..R11 · 58 tâches · (reconstitué) |
| 2026-07-26 | run | R1..R11 livrés · 58/58 tâches cochées · portail à 11 checks, 2 hooks, CI + nightly · (reconstitué) |
