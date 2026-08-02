# Politique de sécurité — ColibriCMS

ColibriCMS est un CMS open source destiné à être **épinglé par des sites clients en production**.
Une vulnérabilité du cœur se propage à toute la flotte au rythme des montées de version : ce
document dit comment la signaler, et ce qu'il advient ensuite.

Cette politique est la mise en œuvre d'[ADR-0006](docs/adr/ADR-0006-generation-ia-verification.md)
(amendement 2026-08-01, point 6). Les règles qui l'imposent vivent dans son `## Constraints`.

## Versions supportées

Le cœur suit le SemVer ([ADR-0008](docs/adr/ADR-0008-mise-a-jour-de-la-flotte.md)). Seule la
**dernière version mineure publiée de la majeure courante** reçoit des correctifs de sécurité. Une
instance restée sur une majeure antérieure doit monter de version pour en bénéficier ; il n'existe
pas de rétroportage.

Tant qu'aucune version n'est publiée sur npm, la surface supportée est la branche par défaut du
dépôt.

## Signaler une vulnérabilité

**Utiliser le signalement privé de GitHub** — onglet *Security* du dépôt, « Report a vulnerability ».

**Ne pas ouvrir d'issue publique, de discussion, ni de pull request** pour une vulnérabilité. Le
cœur étant déployé en flotte, une publication avant correctif expose des instances de production
qui n'ont aucun moyen de réagir dans l'intervalle.

Un signalement utile contient : la version ou le commit concerné, le chemin de code, les étapes de
reproduction, et l'effet obtenu. Une preuve de concept est bienvenue ; elle n'est pas exigée.

## Ce à quoi s'attendre

| | |
|---|---|
| Accusé de réception | sous **5 jours ouvrés** |
| Première évaluation (recevabilité, sévérité) | sous **15 jours ouvrés** |
| Correctif ou position argumentée | annoncé à l'évaluation, selon la sévérité |
| Divulgation | **coordonnée** — après publication du correctif, avec crédit au signalant s'il le souhaite |
| Prime | **aucune.** Le projet n'a pas de programme de récompense. |

Le projet est maintenu par une seule personne : ces délais sont ceux d'un maintien à temps partiel,
et ils sont écrits pour être tenus plutôt que pour impressionner.

## Périmètre

**Dans le périmètre** — le code de ce dépôt : les paquets du cœur, le portail de qualité
(`tooling/`), les workflows d'intégration continue, et les décisions d'architecture qui portent une
garantie de sécurité (voir [`docs/adr/`](docs/adr/), en particulier
[ADR-0011](docs/adr/ADR-0011-frontieres-de-contenu-hostile.md) « Frontières de contenu hostile »).

**Hors périmètre** :

- **Les projets clients.** Chaque site client est un dépôt privé distinct qui épingle le cœur et
  fournit ses gabarits ; son rendu, sa configuration et son hébergement relèvent de son intégrateur.
  Un défaut d'un site en production n'est un défaut du cœur que s'il est reproductible ici.
- **La configuration d'une instance** — politique Cloudflare Access, portée des jetons d'API,
  secrets, motifs de route. Un défaut de provisionnement se signale à l'exploitant de l'instance.
- **Les services tiers** (Cloudflare et ses composants) — à signaler à leur éditeur.

## Contributions

Le dépôt est public. Toute contribution passe par une *pull request* : **aucun push direct sur la
branche par défaut**, revue exigée, et le portail de qualité en régime *par-changement* doit être
vert. C'est le troisième maillon de la chaîne décrite par ADR-0006 (amendement 2026-08-01,
point 5) — celui qui vit **hors du dépôt**, sur le forge, et qu'aucune modification de fichier ne
peut désactiver.

Une contribution qui touche un *seam*, un endpoint d'écriture, l'allowlist réseau, un manifeste de
dépendances ou le mécanisme d'application lui-même fait l'objet d'une **revue humaine ciblée**,
déclenchée par le portail et bloquante. Ce n'est pas une marque de défiance envers un contributeur
particulier : c'est la surface où une modification malveillante passerait tous les contrôles
automatiques.
