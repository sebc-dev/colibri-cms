# Phase stack — les faits datés à sourcer avant d'arbitrer

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `9d9a0c7`
Bloqué par : les recherches ci-dessous, jouées par l'humain — un pour/contre au jugé finit en ADR immuable

## Objectif

Refermer les 14 domaines de la phase stack, aucun n'étant arbitré tant que le fait dont il
dépend n'est pas sourcé et daté.

## Contexte à charger

à lire      `docs/brief.md` § Questions ouvertes — les 6 renvois explicites à la phase Stack (38 l.)
à lire      `docs/research/2026-08-10-api-github-commit-atomique.md` § Ce que ça acte (30 l.)
à déléguer  `docs/prd.md` — 798 l., demander les FR servis par un domaine donné
à situer    `docs/socle-de-livraison.md` — invariants I1–I6 valides, tout le reste marqué périmé

## Acquis

- Méthode tranchée : **rejouer à blanc**. La stack et les 12 ADR de `work/reprise-zero-2`
  (2026-08-07) ne sont ni relus ni cités — leurs « faits datés » ne portent aucune source.
- Écriture groupée de N fichiers : existe, verrou optimiste obligatoire — la condition dure de
  l'option « les fichiers déposés sont le magasin » est levée. Rapport archivé.
- **« Magasin de l'état publié » et « où vivent les médias » ne font qu'un arbitrage** : `FR-091`
  ne tient par construction que si contenu et médias partent du même geste. Le Brief le disait.

## Prochaine étape

Composer **Research A** : c'est lui qui commande l'arbitrage racine.

**Rapports** — `/scd-sdd:research`, prompt composé puis rapport classé, arbitrages entiers :

- **A · enveloppe du palier gratuit sans moyen de paiement** — R2, Pages contre Workers avec
  assets, WAF, Turnstile, D1/KV/Durable Objects. Une seule question, `I5` appliquée à cinq
  composants : activables sans carte, limites, comportement au dépassement.
- **B · acheminement des demandes** — quel envoi satisfait les trois conditions du Brief (compte
  au nom de la cliente, aucune carte, délivrabilité vérifiable), et comment la cliente s'aperçoit
  d'une panne silencieuse sans surveillance hébergée. Réponse négative → le Brief se rouvre.

**Faits ponctuels** — `/scd-sdd:lookup`, en session :

- ③ GitHub, jeton d'écriture : expiration max à portée fine ; une GitHub App sur un compte de
  particulier évite-t-elle l'échéance humaine, et à qui appartient-elle ? → `I4`, `I6`, `SC-013`
- ④ GitHub, dépôts privés : limites de taille ; un build Cloudflare s'y connecte-t-il, par quoi ?
- ⑥ Astro : version, gouvernance, adaptateur Workers, pipeline d'images
- ⑪ Lien magique sur Workers : bibliothèques maintenues, sans service tiers

## Écarté

- **Reprendre la stack du 2026-08-07** — arbitrage humain, faits non sourcés.
- **Le palier gratuit en cinq lookups séparés** — `I5` les relie et c'est lui qui décide.
- **Trancher le magasin avant les médias** — question posée, interrompue à raison.
- **Sourcer moi-même ce qui descend dans un ADR** — la vérification doit laisser une trace citable.
