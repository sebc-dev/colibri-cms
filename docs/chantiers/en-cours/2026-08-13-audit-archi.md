# Audit archi — 3 Major

Portée : socle · audit
Ouvert le 2026-08-13 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `0b725e0`

## Objectif

Ancrer les deux dernières traces de `docs/archi.md` sur un symbole cherchable, et refermer la
réserve que `docs/stack.md` avait déposée sur cette phase.

## Contexte à charger

à lire  `docs/archi.md` — le document jugé (196 l.)
à lire  `docs/stack.md` § « Configuration d'instance » (l. 1314-1342) — la réserve déposée sur
        cette phase : « nom, format et mécanisme de lecture du fichier par les deux
        configurations qui en dépendent »

## À corriger

### Lot A — éditions dans `docs/archi.md`

- **[I6] Major** — le second membre (« aucun fichier de `src/pages/api/public/` ne lit un corps
  `multipart` », l. 101) a pour trace « l'appel de lecture de corps », qui ne nomme aucun
  symbole ; `ci` devrait deviner entre `request.formData()`, `request.text()` et
  `request.arrayBuffer()`, et une devinette à côté rend un contrôle bloquant vert sur du code
  fautif. Le mot `multipart` n'aide pas : une route qui en lit ne le contient pas → écrire la
  trace « l'appel de `request.formData()`, dans un fichier de `src/pages/api/public/` ».
- **[I9] Major** — la trace « la constante, dans le module de publication » (l. 104) ne nomme
  ni le symbole ni son chemin, et « une constante littérale unique » ne se grepe pas ; le
  contrôle qui compte — `.github/` n'y figure pas — exige de trouver la constante d'abord
  → nommer le symbole dans l'énoncé **et** dans la trace, comme `I7` l'a fait pour
  `idFromName`.
- **[I8] Major** — `docs/stack.md:1338` réservait à cette phase « nom, format et mécanisme de
  lecture du fichier par les deux configurations qui en dépendent » ; `instance.json` rend le
  nom et le format, le mécanisme de lecture n'est ni rendu ni déclaré non tranché, et la phase
  `adr` devrait l'inventer → arbitré le 13/08, poser un dixième invariant de classe 5 :
  « la configuration Astro et celle du Worker lisent leurs valeurs d'instance dans
  `instance.json` ; aucune des cinq valeurs n'y est écrite en dur », trace « la lecture
  d'`instance.json`, dans chacun des deux fichiers de configuration ».

## Prochaine étape

`/scd-sdd:resume audit-archi` pour traiter le lot A, puis relancer `/scd-sdd:audit archi` —
l'appariement fera le reste.

## Écarté

- **[candidats ADR] signalement amont** — `docs/stack.md` porte 20 items numérotés sous « Une ligne
  = un futur ADR », là où le journal et la fiche du 10/08 en disent 13 ; `archi.md` cite un
  « candidat n° 19 » qui n'existe pas dans le décompte de 13. Assumé le 13/08 : la phase `adr` lira
  `docs/stack.md` directement et le décompte s'y refermera, sans passer par `/scd-sdd:audit stack`.
  Ré-importé le 13/08 — les 20 items sont vérifiés sur disque, l'objet tient toujours.
