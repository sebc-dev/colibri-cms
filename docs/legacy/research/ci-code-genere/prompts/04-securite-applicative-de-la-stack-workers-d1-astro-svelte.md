<goal>
Établis la doctrine de sécurité applicative propre à une stack Cloudflare Workers + D1 + Astro
(îlots Svelte 5), et identifie les outils d'analyse statique capables d'y détecter des
vulnérabilités, sachant que Semgrep ne reconnaît ni .astro ni .svelte comme langage et qu'aucun
jeu de règles communautaire ne couvre Workers ou D1.
</goal>

<context>
Qui : développeur solo sur un CMS Cloudflare Workers/D1/Astro/Svelte, code partiellement écrit
par un agent.
Pourquoi : refermer le mode « injection/XSS/traversée » sur cette stack précise, et détecter la
fuite d'un secret vers le bundle client d'un îlot hydraté — un risque qu'aucun contrôle ne voit.
Contraintes : aucun composant à palier gratuit exigeant une carte bancaire n'est utilisable.
Déjà connu : Semgrep ne reconnaît ni « astro » ni « svelte » comme langage, et son registre
communautaire n'a aucune règle Cloudflare/Workers/D1 ; eslint-plugin-svelte porte une règle
no-at-html-tags contre le XSS ; le projet restreint déjà `{@html}`/`set:html` et impose un garde
de session sur ses routes API.
</context>

<content>
1. Outils d'analyse statique alternatifs supportant réellement .astro/.svelte (CodeQL, Snyk Code, Semgrep Pro) et leurs paliers gratuits
2. Vulnérabilités et patterns documentés propres à Cloudflare Workers/D1 (injection D1, exposition de bindings/secrets, SSRF)
3. Doctrine et outillage pour empêcher, ou détecter, qu'un secret importé par un composant hydraté parte dans le bundle client
</content>

<sources>
Prioriser : https://developers.cloudflare.com/workers/ , https://developers.cloudflare.com/d1/best-practices/query-d1/ ,
https://docs.astro.build/en/reference/experimental-flags/csp/
Traiter avec prudence : comparatifs commerciaux d'outils SAST.
Signaler les désaccords entre sources réputées plutôt que de trancher silencieusement.
</sources>

<output>
Tableau outil/couverture réelle/palier gratuit + recommandation, avec un traitement explicite du
risque de fuite de secret via le graphe d'imports, non couvert aujourd'hui.
</output>

<method>
Commence large sur la sécurité applicative Workers/D1/Astro, puis resserre sur les outils qui
analysent effectivement .astro/.svelte. Développe des hypothèses concurrentes sur la meilleure
parade à la fuite de secret. Extrais verbatim les passages qui portent les capacités des outils.
</method>

<rules>
Fonde-toi uniquement sur ce prompt, sans mémoire ni conversation antérieure. Toute affirmation
renvoie à une source consultée. Marque [INCERTAIN] si les données manquent ou divergent. Distingue
fait établi, interprétation d'auteur, source primaire et reprise secondaire.
</rules>
