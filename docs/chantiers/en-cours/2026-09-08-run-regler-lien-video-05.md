# Run bloqué (verify) — Régler un emplacement de lien de vidéo

Portée : 003-remplir-emplacements · ticket 05
Ouvert le 2026-09-08 · Actualisé le 2026-09-08 · branche `impl/regler-lien-video-05` · HEAD `5a841f9`

## Objectif
Implémenter le ticket 05 (mode `test`) : reconnaissance pure d'un lien de vidéo en `core/`
(liste blanche YouTube/Vimeo), écriture au brouillon via la route de 04, refus au champ d'un lien
non reconnu.

## Contexte à charger
à lire   `openspec/changes/003-remplir-emplacements/tickets/05-regler-lien-video.md` — le ticket (35 l.)
à lire   `openspec/changes/003-remplir-emplacements/proposal.md` — le change, le pourquoi (59 l.)

## Acquis
- L'arbitrage SC-05a est tranché et porté par le delta + le ticket (commits `9316b66`…`5a841f9`) :
  ce n'est plus un point ouvert.
- Ce run a passé le pré-flight (SC-05a `proceed`) et a IMPLÉMENTÉ le ticket. La ceinture est propre
  (rejeu du test vide, 0 échec) ; SC-05a/b/c/e prouvés. Le code d'impl est dans l'arbre de travail,
  **NON COMMITÉ** — la phase `record` ne tourne qu'au succès. Rien n'est perdu, mais rien n'est figé.
- Bloqué en `blocked-verify` sur le seul SC-05d : le rendu d'erreur de l'îlot Svelte **à l'écran**
  n'est pas observable par un agent (pas d'infra de test de composant Svelte au dépôt) →
  `humanCheckRequired`. Le code rend bien l'alerte (source : `role="alert"`, message mentionnant
  youtube/vimeo). C'est le cas que le ticket lui-même annonçait (SC-05d se vérifie « sur le HTML
  servi… pas à l'écran »).
- Cause du blocage = **cas limite du workflow, pas un défaut du code** : le `verifier` mode `test` a
  lui-même posé le `humanCheckRequired` sur SC-05d → SC-05d exclu du filtre `unproven`
  (implement-ticket.js l.755) → la self-correction §14(c) ne s'est pas déclenchée → `allVerified` est
  resté `false` → `blocked-verify`. L'intention §14(c) (un `humanCheckRequired` fait POURSUIVRE le
  run, le check coule à la PR) a été manquée. Correctif durable côté marketplace.

## Prochaine étape
Décision humaine, deux voies vers la PR :
(a) constater SC-05d à l'écran (`npm run dev`, coller un lien hors liste sur un emplacement de lien
de vidéo → l'erreur s'affiche au champ en demandant YouTube/Vimeo), puis reprendre pour ouvrir la PR ;
(b) reprendre le run avec un post-traitement qui fait couler le `humanCheckRequired` de SC-05d vers
la PR (conforme §14 c) — les 8 reviewers + le check visuel porté par la PR tranchent alors.

## Écarté
- Éditer les tests ou le code pour « faire passer » SC-05d : le blocage est spurious, le code est
  correct — jamais forcer le vert.
- Relancer tel quel sans corriger le post-traitement : rejouerait le même `blocked-verify` (les
  agents sont rejoués depuis le cache).
- Lectures SC-05a non retenues : « tout https externe générique » (peu de refus, une non-vidéo
  passerait) et « ressource embarquable / heuristique » (plus flou) — écartées au profit de la liste
  blanche, qui rend SC-05d clair. [conservé de l'arbitrage]
