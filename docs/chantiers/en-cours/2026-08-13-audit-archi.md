# Audit archi — 1 Critical · 3 Major

Portée : socle · audit
Ouvert le 2026-08-13 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `7e63c6e`

## Objectif

Rendre `docs/archi.md` conforme : zéro Critical.

## Contexte à charger

à lire      `docs/archi.md` — le document jugé (163 l.)
à extraire  `docs/stack.md` › § « Ce que `archi` devra reprendre en invariants » (l. 634-667)
            — le dépôt d'invariants dont le Critical constate qu'il n'a pas de forme vérifiable
à situer    `docs/prd.md` › `FR-081`, `FR-082`, `FR-061` — les exigences que `I3` et `I6` servent

## À corriger

### Lot A — éditions dans `docs/archi.md`

- **[I6] Critical** — « les routes serveur **ouvertes au visiteur anonyme** résident sous
  `src/pages/api/public/` » repose sur une propriété qu'aucun contrôle ne peut lire ; le garde de
  session que `C2` déclare (l. 52) et que `docs/stack.md:658` renvoyait à cette phase n'a donc
  aucune trace observable → retourner la polarité : « tout fichier de route sous `src/pages/api/`
  hors de `src/pages/api/public/` importe le garde de session de `<chemin à nommer>` », trace =
  l'absence de cet import.
- **[I1] Major** — la matrice fait intervenir six nœuds (`pages/` compris) là où la Vue d'ensemble
  déclare cinq zones, et `site/` comme `platform/` n'apparaissent avec un chemin nulle part
  (`src/site/` zéro occurrence ; `src/platform/` seulement dans l'exemple de la Légende) → ajouter
  la correspondance zone → chemin, et dire si `pages/` est une sixième zone ou la surface de
  routage imposée par Astro.
- **[I3] Major** — le second membre (« importé par le gabarit de page publiée **comme** par la
  route d'aperçu ») ne nomme aucun des deux fichiers, et la colonne « Trace observable » ne décrit
  que le premier membre ; c'est pourtant lui qui porte `C3` et `FR-081` → nommer les deux chemins.
- **[CSP admin] Major** — l'arbitrage des l. 110-120 repose sur un fait daté sans source citable
  (Astro pose sa CSP en `<meta>`, sans nonce, depuis `astro@6.0.0`) : absent de `docs/stack.md` et
  des douze rapports de `docs/research/`, alors que `docs/stack.md:646` demandait à cette phase
  d'instruire ce coût → `/scd-sdd:lookup` sur la fonctionnalité CSP d'Astro, puis citer la source
  en note l. 111.

## Prochaine étape

`/scd-sdd:resume audit-archi` pour traiter le lot A, puis relancer `/scd-sdd:audit archi` —
l'appariement fera le reste.

## Écarté

- **[candidats ADR] signalement amont** — `docs/stack.md` porte 20 items numérotés sous « Une ligne
  = un futur ADR », là où le journal et la fiche du 10/08 en disent 13 ; `archi.md` cite un
  « candidat n° 19 » qui n'existe pas dans le décompte de 13. Assumé le 13/08 : la phase `adr` lira
  `docs/stack.md` directement et le décompte s'y refermera, sans passer par `/scd-sdd:audit stack`.
