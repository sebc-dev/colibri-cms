# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-12 · branche `work/reprise-socle-v2` · HEAD `3f843dc`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus », puis le seul § `S-nn` en cours — 415 l.
à extraire  `docs/stack.md` › § « Décisions structurantes → candidats ADR » + la ligne de tableau nommée par le constat — 1156 l.
à extraire  `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md` › ses marques `[À VÉRIFIER]` / `[INCERTAIN]` — 178 l. ; la source que `S-11` dit trahie
à lire      `docs/research/2026-08-10-gating-paiement-r2-email-cloudflare.md` — 77 l. ; R2 par la Billing policy
à extraire  `docs/research/2026-08-10-acheminement-demandes-envoi-email.md` › `Cron` — 137 l. ; le « pas de retry » non repris
à extraire  `docs/prd.md` › les seuls `FR`/`SC` nommés par le constat, ou par le passage de `stack.md` qu'il soutient — 838 l.
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté » — 231 l. ; les sources déjà rejetées, et le motif de chacune
à situer    les cinq relevés du 12/08 de `docs/research/` — conclusions déjà portées par `stack.md`
à situer    `docs/socle-de-livraison.md` › Annexe A — non requise par `S-11` ; à remonter pour `S-18`/`S-19`
à situer    `docs/audit-brief-prd.md`, `docs/audit-auth.md` — clos, arbitrages consommés

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : chaque constat arbitré par l'humain, sur feu vert ;
  les constats restent **figés**, seul le récapitulatif est à jour, et un arbitrage **complète** une
  ligne antérieure par un ajout daté sans la défaire. Ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance, décidé le 11/08.** L'ordre que j'avais posé pour la suite :
  L5 (`S-11`, `S-18`, `S-19`) · L6 (`S-13`, `S-15`, `S-17`) · L7 (`S-14`, `S-16`, `S-20` ; `S-12`
  arbitré ici, exécuté par `premortem socle`).
- **Ce que `S-10` a appris est écrit dans sa ligne du récapitulatif** — les trois façons de refermer
  un fait non sourcé, et les trois corollaires de « mesurer un fait juste invalide les preuves
  écrites à son appui ». J'y renvoyais plutôt que de le reporter ici.
- **`S-11` demande l'inverse de `S-10`** : non pas combler un fait sans source, mais **rétablir la
  qualification exacte** d'un fait que la stack affirme plus fort que son rapport. Son **quatrième
  grief (Astro) est déjà rendu**, avec `S-10` et dans le même paragraphe du candidat ADR n° 1 — un
  même fait en deux moitiés, la trace pour l'un, la date pour l'autre. J'allais n'instruire que les
  trois autres.
- **Pour ces trois** : R2 marqué `[À VÉRIFIER]`, Turnstile officiel mais `[INCERTAIN]` sur la
  ventilation par mode, Cron Triggers tenus d'une source unique tierce.

## Prochaine étape

**Instruire les trois griefs restants de `S-11`**, puis écrire sa ligne au récapitulatif. J'allais
commencer par R2 : le constat dit que sa disqualification tient déjà par le seul *checkout*
officiel, donc sans le témoignage Community.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette. *Borné le
  12/08 : ne vise que ce que la documentation **ne porte pas** — « ni documenté ni infirmé ».
  Citer une page officielle datée est au contraire ce que `S-06` et `S-09` ont déjà fait.*
- **Les écartés propres à `S-10`** — rouvrir Better Auth, rétrograder la ligne GraphQL, corriger la
  fiche archivée du 10/08, épingler un correctif, renvoyer la désuétude en recette, garder trois
  preuves faibles, rejouer les mesures du jeton — sont **écrits dans sa ligne du récapitulatif**,
  avec leur motif. Ils n'ont plus à vivre ici.
