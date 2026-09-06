<goal>
Établis l'état des mesures publiées sur les modes de défaillance du code écrit par un agent
(hallucination de dépendances, vulnérabilités, maintenabilité), et cherche toute mesure de
l'effet d'un contrôle automatique sur ces modes : les réduit-il, ou les déplace-t-il vers une
forme plus subtile et non détectée ?
</goal>

<context>
Qui : développeur solo tenant le portail CI d'un CMS TypeScript partiellement écrit par un agent.
Pourquoi : trancher une réserve non résolue du projet — « réprimer un comportement peut le rendre
plus subtil plutôt que l'éliminer ».
Contraintes : un contrôle bloquant exige un faible taux de faux positifs.
Déjà connu : Spracklen et al. (USENIX '25) mesurent 19,7 % de paquets hallucinés sur 2,23M
générés, 81 % propres à un seul modèle ; une réplication 2026 (arXiv:2605.17062) mesure 4,6-6,1 %
sur cinq modèles récents ; l'essai METR (arXiv:2507.09089) mesure +19 % de temps, pas de défauts.
</context>

<content>
1. Mesures de qualité/maintenabilité et de vulnérabilités du code généré, au-delà de ces études
2. Toute étude mesurant l'effet d'un contrôle CI sur un mode de défaillance : réduction ou déplacement
3. Ce que la rareté inter-modèles (81 %) implique pour un contrôle de chaîne d'approvisionnement
4. Limites méthodologiques connues de ces études (échantillon, modèles, généralisabilité)
</content>

<sources>
Prioriser : https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen ,
https://arxiv.org/html/2406.10279v3 , https://arxiv.org/abs/2605.17062 ,
https://arxiv.org/abs/2507.09089
Traiter avec prudence : https://www.gitclear.com/the_ai_code_quality_maintainability_gap et
https://www.veracode.com/blog/spring-2026-genai-code-security/ — publications d'éditeurs.
Signaler les désaccords entre sources réputées plutôt que de trancher silencieusement.
</sources>

<output>
Tableau des mesures (étude, méthode, chiffre, niveau de preuve) + réponse directe à la question du
déplacement du problème, [INCERTAIN] si rien ne la tranche, niveau de confiance par affirmation.
</output>

<method>
Commence large, puis resserre sur les études mesurant un effet de contrôle plutôt qu'un taux brut.
Développe des hypothèses concurrentes sur le sens de « réprimer un comportement ». Extrais
verbatim les chiffres avant de synthétiser.
</method>

<rules>
Fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Tout chiffre renvoie
à une source consultée. Marque [INCERTAIN] si les données manquent ou divergent. Distingue fait
établi, interprétation d'auteur, source primaire et reprise secondaire.
</rules>
