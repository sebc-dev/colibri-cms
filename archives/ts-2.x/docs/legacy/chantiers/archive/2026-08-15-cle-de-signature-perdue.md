# Clé de signature perdue — la soupape de `verifier-guard` employée une fois

Portée : socle
Ouvert le 2026-08-15 · Actualisé le 2026-08-15 · branche `chore/chantier-cle-signature` · HEAD `04b6ef5`

## Objectif
Débloquer la PR #18 (reprise du socle), refusée par `verifier-guard`, sans affaiblir le garde
ni réécrire l'historique.

## Contexte à charger
à lire  `docs/ci.md` § La soupape de `verifier-guard` — la seule issue prévue quand le registre
        ne peut plus être prouvé ; c'est elle qui a été employée ici.

## Issue
Cause : le commit qui enregistre `colibri-signing-2` est signé **avec cette clé-là**, et le garde
vérifie tout commit touchant `.github/allowed_signers` contre la liste telle qu'elle est **sur
`main`** — qui ne portait que `colibri-signing`. Comme la passphrase de cette première clé est
perdue, **aucun commit touchant le registre ne pouvait plus passer la CI** : le chemin automatique
était fermé par construction, ce qui est le comportement voulu.

Soupape appliquée, dans cet ordre : signature des deux commits en cause vérifiée à la main (bonne
signature de `SHA256:S3jSNX…`, clé présente sur la machine), `verifier-guard` retiré des checks
requis du ruleset `Main protect` **par l'API**, PR #18 mergée en merge commit `04b6ef5`, ruleset
rétabli dans la foulée et **comparé à sa sauvegarde — identique**. Les 8 autres checks requis
sont restés actifs et verts pendant toute la fenêtre.

Registre corrigé par `451a61d` : la clé perdue est **bornée** par `valid-before="20260810"` plutôt
qu'effacée — le commit porte le pourquoi et la mesure sur git 2.53.

## Écarté
- **PR d'amorçage signée par la clé 1**, mergée avant #18 pour que `main` porte la clé 2 — la voie
  propre, et la seule qui évitait la soupape. Impossible : la clé 1 est inutilisable.
- **Ajouter la clé 2 et retirer la clé 1 dans le même commit** — ne change rien : le garde regarde
  **qui a signé**, jamais ce que le commit change dans le fichier.
- **Re-signer le commit d'enregistrement avec la clé 1** — même impasse, plus la réécriture de 190
  commits déjà poussés.
- **Effacer la clé 1 du registre** — rendrait `371afdc` invérifiable le jour où un contrôle
  porterait sur l'historique entier, ce que le chantier `durcissement-ci` peut proposer. Le
  bornage coûte une ligne et garde cette porte ouverte.
