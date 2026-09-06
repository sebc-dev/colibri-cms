<goal>
Établis la doctrine actuelle des fitness functions et de l'architectural conformance checking, et
cherche des approches pour détecter la dérive entre un corpus de documents de gouvernance (ADR,
invariants, contrat d'agent) et le code ou d'autres documents censés en dépendre.
</goal>

<context>
Qui : développeur solo, projet TypeScript sans code, seulement un corpus de gouvernance
(invariants d'architecture, trentaine d'ADR, contrat pour agent de code).
Pourquoi : décider quels contrôles CI referment la dérive documentaire avant que le code n'existe.
Contraintes : les outils JS de documentation exécutable historiques sont à l'arrêt depuis
plusieurs années sans être archivés.
Déjà connu : une dérive a déjà eu lieu entre un document de configuration CI et l'API d'une forge
(noms requis changés, vérifications bloquées). La littérature d'architecture erosion traite du
code ↔ architecture, pas du document ↔ document.
</context>

<content>
1. Doctrine des fitness functions et de l'architectural conformance checking, état 2025-2026
2. Approches pour vérifier la cohérence entre documents liés (une décision et son invariant, une source de vérité et ses points de reprise)
3. Alternatives actives en 2026 à markdown-doctest/txm pour exécuter des blocs de code d'un markdown en CI
</content>

<sources>
Prioriser : https://arxiv.org/abs/2306.08616 , https://arxiv.org/abs/2401.16382 ,
https://docs.gitlab.com/development/documentation/testing/
Traiter avec prudence : produits commerciaux de documentation (Mintlify, GitBook, Redocly, Fern) —
dérive de doc d'API/spec OpenAPI, pas de gouvernance de projet.
Signaler les désaccords entre sources réputées plutôt que de trancher silencieusement.
</sources>

<output>
État des lieux par angle, [INCERTAIN] explicite si aucune source ne traite la dérive document ↔
document, et une liste d'options concrètes exécutables en CI sur ce projet.
</output>

<method>
Commence large sur les fitness functions, puis resserre sur la cohérence inter-documents plutôt
que code ↔ architecture. Développe des hypothèses concurrentes si la littérature ne tranche pas.
Extrais verbatim les passages clés avant de synthétiser.
</method>

<rules>
Fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Toute affirmation
renvoie à une source consultée. Si rien ne traite la dérive document ↔ document, dis-le plutôt que
de généraliser depuis l'erosion code ↔ architecture. Distingue fait établi, interprétation
d'auteur, source primaire et reprise secondaire.
</rules>
