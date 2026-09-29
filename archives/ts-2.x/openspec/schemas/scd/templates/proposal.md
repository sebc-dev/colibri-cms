## Why

<!-- 1-2 phrases : quel problème / opportunité, et pourquoi maintenant.
     Backréférence l'EPIC / la STORY (docs/roadmap.md) et les FR servis (docs/vision.md).
     Ex. : « Sert EPIC-2 / STORY-2.1 ; couvre FR3. » -->

## What Changes

<!-- Liste à puces des changements. Sois précis (nouvelles capacités, modifications, suppressions).
     Marque tout changement cassant par **BREAKING**. -->

## Capabilities

### New Capabilities
<!-- Capacités introduites. Kebab-case pour les segments neufs (user-auth, identity/user-auth),
     en suivant l'organisation de specs existante. Chacune crée specs/<capability-path>/spec.md. -->
- `<capability-path>` : <ce que couvre cette capacité>

### Modified Capabilities
<!-- Capacités existantes dont les EXIGENCES changent (pas un simple détail d'implémentation).
     Chacune a besoin d'un delta. Chemin exact sous openspec/specs/. Laisse vide si rien ne change.
     Un change sans aucune capacité (refacto pur, outillage, docs) DOIT poser `skip_specs: true` dans son
     .openspec.yaml — openspec validate rejette un change zéro-delta sans ce marqueur. N'invente pas une
     exigence pour satisfaire le validateur. -->
- `<existing-capability-path>` : <quelle exigence change>

## Impact

<!-- Code, API, dépendances, systèmes affectés. -->
