# Mise à jour du change 012 après la relecture du ticket 02

Portée : 012-envoi-des-demandes-de-devis
Ouvert le 2026-10-15 · branche `docs/012-mise-a-jour-du-change` · HEAD `40c51df`
Bloqué par : la fusion des PR #245 (ticket 01) puis #246 (ticket 02, après `/scd-spec-dev:sync`)

## Objectif
Mettre le change d'accord avec ce que la relecture du ticket 02 a révélé, avant son archivage, en une
PR distincte de #246 : trois points, plus une note de sécurité.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/02-seuil-de-connexion-par-origine.md` — critères, renvoi l. 65 (81 l.)
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/specs/connexion-par-code/spec.md` — le delta, ADDED seul (33 l.)
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/specs/seuil-par-origine/spec.md` — où poser le scénario de panne (69 l.)
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/test-plan.md` › `## Oracle` — le mode des délais (77 l.)
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/security-review.md` › `## Mitigations` (7), `## Données` (81 l.)
à extraire  `openspec/specs/connexion-par-code/spec.md` › `### Requirement: L'indiscernabilité des deux branches de soumission` — L103-L143, à reprendre en MODIFIED
à extraire  `scripts/verif-connexion.sh` › étape 0 (L159) et `Étape 7` (L427-L494) — 505 l., seules ces deux étapes changent
à situer    PR #246 — description, § Relecture : les remarques et le triage complets, ne pas relire

## Acquis
- **Point 1 — le script ne prouve plus l'indiscernabilité.** L'étape 7 enchaîne 25 salves de 8
  soumissions depuis une même origine, dans l'heure, et ne vide que `codes_connexion` entre les salves ;
  l'étape 0 ne vide que trois tables. Avec six soumissions avant l'étape 7, la 21e tombe au-delà du
  seuil : environ 186 mesures sur 200 comparent le refus du seuil à lui-même. Un second passage dans
  l'heure échoue dès l'étape 2. Il faut un MODIFIED du requirement vivant (« hors plafond et hors
  seuil, fenêtres du plafond et du seuil vidées entre les salves ») et un script qui vide aussi
  `fenetre_seuil` et `comptes_seuil` aux étapes 0 et 7.
- **Point 2 — la partie « délais » de SC-02c n'a pas de critère précis.** Le ticket renvoie au
  « patron statistique de `branches-indiscernables.test.ts` », qui ne compare ses délais qu'au
  plancher. « La fenêtre vidée entre elles » n'a pas d'objet au-delà du seuil. Le triage a recommandé
  de garder le test tel quel (au-delà du seuil, l'adresse n'est jamais lue) et de ne corriger que les
  textes du ticket, du test-plan et du security-review. L'humain ne l'a pas encore tranché.
- **Point 3 — la règle de panne n'a pas de critère.** ADR-0028 la pose ; le test qui la prouve
  existe dans #246 sous le nom provisoire « SC-02b — cas limite : une erreur de la base refuse la
  tentative… ». J'allais proposer un critère SC-02j au ticket 02, un scénario au delta
  `seuil-par-origine` (que le ticket 12 réutilise), puis renommer ce test en SC-02j.
- **Note à joindre** : au § Données du security-review, le résidu « D1 garde un historique
  restaurable (Time Travel, ~7 jours sur le palier gratuit) » ; durée à vérifier dans la doc D1.

## Prochaine étape
Une fois #245 et #246 fusionnées, rebaser cette branche sur `origin/main`, faire trancher le point 2,
puis lancer `/opsx:update 012-envoi-des-demandes-de-devis` sur les trois points.

## Écarté
- Corriger dans #246 : ces points touchent le delta, le ticket, le plan de test et un script, pas le
  code du 02 ; l'humain a choisi une PR distincte.
- Un troisième verdict « indisponible » pour la panne : comportement non demandé, et il toucherait le
  ticket 12 (écarté au triage).

## Issue
Fait le 2026-10-15 dans la PR #247, après la fusion de #245 et de #246. Le change est mis à jour
(`10394c6`) : MODIFIED de l'indiscernabilité de 001 (hors plafond et hors seuil), scénario de panne
au delta `seuil-par-origine` (SC-02j coché, SC-12h), renvois au « patron statistique » remplacés
(point 2 tranché : option A, le test SC-02c reste tel quel), résidu Time Travel de D1 consigné
(7 jours sur le palier gratuit, vérifié dans la doc Cloudflare). Le script vide les tables du seuil
(`07dcbcf`) ; le test de panne s'appelle SC-02j (`bfdfa7c`). Reste hors de ce chantier : l'étape 2
du script cherche « Vous êtes connectée », disparu depuis 8e04395 — corrigé dans une PR à part.
