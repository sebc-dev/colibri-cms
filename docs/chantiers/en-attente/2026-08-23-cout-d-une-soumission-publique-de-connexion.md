# Coût d'une soumission publique de connexion

Portée : 002-connexion-par-code
Ouvert le 2026-08-23 · Actualisé le 2026-08-23 · branche `main` · HEAD `c2bdf08`

## Objectif
Chiffrer ce qu'une soumission de l'écran de connexion coûte en requêtes Worker et en accès D1, et
la marge qui reste face aux quotas journaliers du palier gratuit, tant que le seuil de fréquence
par origine n'est pas livré.

## Contexte à charger
à lire  `docs/1.x/specs/002-connexion-par-code/plan.md` § décision 7 — le délai plancher et ce qu'il coûte
à lire  `docs/1.x/specs/002-connexion-par-code/spec.md` § NON inclus — le seuil par origine, hors périmètre

## Acquis
- J'ai relevé qu'une soumission coûte au moins deux allers-retours D1 — le décompte de la fenêtre,
  la lecture de l'adresse autorisée — et qu'elle immobilise une réponse le temps du plancher.
- J'ai retenu que le point d'entrée reste public et sans seuil par origine, celui-ci ayant été
  arbitré hors du périmètre de la feature.
- J'ai vu où la panne se cacherait : si les quotas journaliers tombent, l'administration ne s'ouvre
  plus — la garde lit D1 à chaque requête — pendant que le site public, servi en assets statiques,
  continue de tourner. Rien n'a l'air cassé.

## Prochaine étape
Mesurer, sur `src/pages/admin/connexion.astro` et `src/platform/auth/magasin.ts`, le nombre de
requêtes Worker et d'accès D1 qu'une soumission consomme, et le rapporter aux quotas journaliers de
l'Annexe A de `docs/socle-de-livraison.md`.

## Écarté
- **Lire `plan.md` comme une affirmation fausse** — il n'affirme rien de faux : il dit que
  l'attente du plancher est du temps d'horloge et ne mord sur aucun quota, ce qui est exact. Ce
  qu'il ne dit pas, c'est le coût en requêtes et en accès D1. Aucun texte de la feature ne referme
  ce risque, d'où la mesure.
