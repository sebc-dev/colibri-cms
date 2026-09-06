<goal>
Établis si le test property-based et le test métamorphique conservent leur pouvoir de détection
quand c'est un agent qui écrit lui-même les propriétés ou relations métamorphiques, ou si l'oracle
faux se reporte d'un cran sur la propriété elle-même.
</goal>

<context>
Qui : développeur solo, base TypeScript testée avec Vitest 4.1.x et fast-check 4.9.0.
Pourquoi : décider si le mode « oracle faux » (une assertion qui vérifie la mauvaise chose) reste
indétectable en basculant vers du property-based/metamorphic écrit par l'agent.
Contraintes : le seul filet actuel est du mutation testing nocturne informatif, non bloquant.
Déjà connu : deux préprints 2026 (arXiv:2601.05542, arXiv:2607.10277) montrent qu'un oracle généré
par un LLM depuis une exigence en langue naturelle colle mieux à l'exigence qu'au code — mais ils
étudient des assertions de régression, jamais des propriétés ou relations métamorphiques.
</context>

<content>
1. Génération de propriétés (property-based) par un LLM, et risque qu'elle partage le biais du code testé
2. Inférence de relations métamorphiques par un LLM
3. Cas où property-based/metamorphic a détecté un défaut manqué par des assertions classiques, sur du code généré
</content>

<sources>
Prioriser : https://arxiv.org/abs/2601.05542 , https://arxiv.org/abs/2607.10277 ,
https://fast-check.dev/docs/advanced/model-based-testing/ — et toute publication récente (arXiv
cs.SE, ICSE, FSE, ISSTA) sur « LLM property-based test generation » ou « LLM metamorphic relation
inference ».
Traiter avec prudence : articles de blog non revus.
Période : 24 derniers mois, sauf fondamentaux du test métamorphique.
</sources>

<output>
État des lieux par angle, établi versus [INCERTAIN], et réponse directe : le property-based écrit
par un agent est-il un antidote net à l'oracle faux, ou un déplacement du problème ?
</output>

<method>
Commence large sur le test property-based et métamorphique appliqué au code généré, puis resserre
sur la génération de la propriété elle-même. Développe des hypothèses concurrentes. Extrais
verbatim les passages clés avant de synthétiser.
</method>

<rules>
Fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Toute affirmation
renvoie à une source consultée. Si aucune source ne traite précisément la question, dis-le et
marque [INCERTAIN] plutôt que de combler par analogie. Distingue fait établi, interprétation
d'auteur, source primaire et reprise secondaire.
</rules>
