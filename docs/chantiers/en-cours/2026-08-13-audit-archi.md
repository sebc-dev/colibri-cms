# Audit archi — 1 Critical · 1 Major

Portée : socle · audit
Ouvert le 2026-08-13 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `998d1d4`

## Objectif

Rendre `docs/archi.md` conforme : zéro Critical.

## Contexte à charger

à lire      `docs/archi.md` — le document jugé (196 l.)
à extraire  `docs/stack.md` › § « Configuration d'instance » (l. 1314-1342) — la réserve qui
            laissait à `archi` le nom, le format et le mécanisme de lecture du fichier d'instance
à extraire  `docs/stack.md` › puce « Rien de dérivé d'une origine… » (l. 650-654) — les trois
            falsifications du compteur, dont `I7` ne retient que la seule statique

## À corriger

### Lot A — éditions dans `docs/archi.md`

- **[I8] Critical** — la trace « l'occurrence d'une de ces valeurs hors du chemin du **fichier
  d'instance** » (l. 103) désigne un fichier que le document ne nomme nulle part ; l'exclusion
  est donc inécrivable, et un contrôle dérivé de `I8` signalerait le fichier légitime avec les
  fautifs. `docs/stack.md:1338` réservait « nom, format et mécanisme de lecture » à cette phase
  → nommer le chemin dans l'énoncé **et** dans la trace, comme `I6` l'a fait pour son garde de
  session.
- **[I7] Major** — la trace « l'argument de **l'appel de nommage**, dans les sources » (l. 102)
  n'a aucun token cherchable : `I7` et `I8` sont les deux seuls invariants sur neuf dont ni
  l'énoncé ni la trace ne portent de backtick. `ci` devrait deviner l'API, et une devinette à
  côté rend un contrôle bloquant **vert sur du code fautif** — indétectable tant que le dépôt
  n'a aucun fichier de source → écrire « l'argument de `idFromName`, dans
  `src/platform/<module du compteur>/` », le module restant à nommer.

## Prochaine étape

`/scd-sdd:resume audit-archi` pour traiter le lot A, puis relancer `/scd-sdd:audit archi` —
l'appariement fera le reste.

## Écarté

- **[candidats ADR] signalement amont** — `docs/stack.md` porte 20 items numérotés sous « Une ligne
  = un futur ADR », là où le journal et la fiche du 10/08 en disent 13 ; `archi.md` cite un
  « candidat n° 19 » qui n'existe pas dans le décompte de 13. Assumé le 13/08 : la phase `adr` lira
  `docs/stack.md` directement et le décompte s'y refermera, sans passer par `/scd-sdd:audit stack`.
