# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Portée dans ce dépôt

Le travail planifié n'est **pas** trié par labels : il vit dans la chaîne `/scd-sdd` (voir `issue-tracker.md`), où l'état se dérive des cases de `tasks.md` et des gates `analyze` / `premortem`. Ces cinq labels ne s'appliquent qu'aux **demandes hors chaîne** ouvertes en GitHub Issue sur `sebc-dev/colibri-cms`. Aucun label n'est à créer tant que cette file reste vide.
