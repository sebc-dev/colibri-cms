<goal>
Établis la doctrine pour choisir la durée et le point d'application d'un cooldown de dépendances
— installation (npm) ou proposition de mise à jour (Dependabot, Renovate) — adaptée à un dépôt
tenu par un développeur seul assisté d'un agent.
</goal>

<context>
Qui : développeur solo sur un dépôt npm sans encore de code ni de configuration de dépendances.
Pourquoi : arbitrer la durée du cooldown (7 jours envisagés côté npm) face au nouveau défaut
Dependabot de 3 jours, et juger si combiner plusieurs mécaniques protège réellement ou complexifie
sans gain.
Déjà connu : Dependabot applique depuis le 2026-07-14 un cooldown de 3 jours par défaut. npm
`min-release-age` agit à l'installation (`npm audit fix` échoue en code non nul si bloqué).
Renovate `minimumReleaseAge` agit à la proposition, via un check `pending`. Aucune source connue
ne mesure ce que chaque fenêtre attrape en plus de l'autre.
</context>

<content>
1. Durée optimale d'un cooldown face aux attaques de chaîne d'approvisionnement, recommandations publiées
2. Incidents documentés de paquets npm compromis, avec le délai réel entre publication et retrait
3. Combiner plusieurs mécaniques de cooldown : redondance utile ou complexité inutile pour un seul développeur, y compris en incident de sécurité
</content>

<sources>
Prioriser : https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/ ,
https://docs.renovatebot.com/key-concepts/minimum-release-age/ , https://docs.npmjs.com/cli/v11/using-npm/config
Traiter avec prudence : chiffres de quotas ou de délais non officiels circulant sur des blogs tiers.
Signaler les désaccords entre sources réputées plutôt que de trancher silencieusement.
</sources>

<output>
Recommandation argumentée sur la durée et le point d'application du cooldown, incidents réels à
l'appui, niveau de confiance explicite là où aucune mesure n'existe.
</output>

<method>
Commence large sur la doctrine de cooldown en gestion de dépendances, puis resserre sur des
incidents réels et leur délai de détection. Développe des hypothèses concurrentes sur 3 jours
versus 7 jours. Extrais verbatim les passages qui portent un délai ou un mécanisme.
</method>

<rules>
Fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Toute affirmation
renvoie à une source consultée. Marque [INCERTAIN] si aucune mesure ne départage 3 et 7 jours.
Distingue fait établi, interprétation d'auteur, source primaire et reprise secondaire.
</rules>
