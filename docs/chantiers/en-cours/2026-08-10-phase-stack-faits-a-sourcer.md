# Phase stack — les faits datés à sourcer avant d'arbitrer

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `d6ebf19`
Bloqué par : les lookups ci-dessous, joués par l'humain — un pour/contre au jugé finit en ADR immuable

## Objectif

Refermer les 14 domaines de la phase stack. J'avais retenu de n'en arbitrer aucun tant que le
fait dont il dépend n'est pas sourcé et daté.

## Contexte à charger

à lire      `docs/brief.md` § Questions ouvertes — les 6 renvois explicites à la phase Stack (38 l.)
à lire      `docs/research/2026-08-10-api-github-commit-atomique.md` § Ce que ça acte (30 l.)
à déléguer  `docs/prd.md` — 798 l., demander les FR servis par un domaine donné
à situer    `docs/socle-de-livraison.md` — invariants I1–I6 valides, tout le reste marqué périmé

## Acquis

- Méthode tranchée : **rejouer à blanc**. La stack et les 12 ADR de `work/reprise-zero-2`
  (2026-08-07) ne sont ni relus ni cités — leurs « faits datés » ne portent aucune source.
- Lookup ⑤ joué et archivé : l'écriture groupée de N fichiers existe, verrou optimiste
  obligatoire. La condition dure de l'option « les fichiers déposés sont le magasin » est levée.
- **« Magasin de l'état publié » et « où vivent les médias » ne font qu'un arbitrage** : `FR-091`
  ne tient par construction que si contenu et médias partent du même geste. Le Brief le disait.
- Config de signature git complète mais `commit.gpgsign` absent, aucun commit signé sur la
  branche. Non corrigé — arbitrage humain.

## Prochaine étape

Jouer les lookups, les deux bloquants d'abord : une réponse négative rouvre le Brief.

- **① R2 — carte exigée à l'activation ?** paliers, dépassement → commande l'arbitrage racine
- **② E-mail sans carte, au nom de la cliente ?** échec rendu, délivrabilité → hypothèse d'existence
- **③ GitHub, jeton d'écriture** : expiration max d'un jeton à portée fine ; une GitHub App sur un
  compte de particulier évite-t-elle l'échéance, à qui appartient-elle ? → `I4`, `I6`, `SC-013`
- **④ GitHub, dépôts privés** : limites de taille ; un build Cloudflare s'y connecte-t-il et par quoi ?
- ⑥ Astro : version, gouvernance, adaptateur Workers, pipeline d'images
- ⑦ Pages contre Workers avec assets : voie recommandée, quotas Free, dépassement
- ⑧ WAF en Free : nombre de règles, critères, application avant le Worker
- ⑨ Turnstile : gratuit sans carte, quotas, vérification côté serveur
- ⑩ D1, KV, Durable Objects : quotas Free et dépassement
- ⑪ Lien magique sur Workers : bibliothèques maintenues, sans service tiers

## Écarté

- **Reprendre la stack du 2026-08-07** — arbitrage humain, motif ci-dessus.
- **Trancher le magasin avant les médias** — question posée, interrompue à raison.
- **Sourcer moi-même ce qui descend dans un ADR** — le lookup se joue côté humain, pour que la
  vérification laisse une trace citable.
