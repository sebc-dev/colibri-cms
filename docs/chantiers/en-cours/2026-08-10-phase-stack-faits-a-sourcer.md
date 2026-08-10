# Phase stack — les faits datés à sourcer avant d'arbitrer

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `44b9b02`
Bloqué par : les recherches ci-dessous, jouées par l'humain — un pour/contre au jugé finit en ADR immuable

## Objectif

Refermer les 14 domaines de la phase stack, aucun n'étant arbitré tant que le fait dont il
dépend n'est pas sourcé et daté.

## Contexte à charger

à lire      `docs/brief.md` § Questions ouvertes — les 6 renvois explicites à la phase Stack (48 l.)
à extraire  `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md` › § « À vérifier à la main sur le compte » — 178 l., seuls les 8 gestes servent la reprise
à déléguer  `docs/prd.md` — 797 l., « quels FR et SC dépendent du service d'envoi d'e-mail et de la détection d'une panne d'acheminement ? »
à situer    `docs/research/2026-08-10-api-github-commit-atomique.md` — conclusion déjà dans Acquis
à situer    `docs/socle-de-livraison.md` — I1–I6 valides ; son annexe datée est la destination écrite des chiffres de plateforme

## Acquis

- Méthode tranchée : **rejouer à blanc**. La stack et les 12 ADR de `work/reprise-zero-2`
  (2026-08-07) ne sont ni relus ni cités — leurs « faits datés » ne portent aucune source.
- Écriture groupée de N fichiers : existe, verrou optimiste obligatoire. Rapport archivé.
- **« Magasin de l'état publié » et « où vivent les médias » ne font qu'un arbitrage** : `FR-091`
  ne tient par construction que si contenu et médias partent du même geste.
- Rapport A revenu et classé. Officiel : aucune bascule automatique vers le payant (le seul
  mécanisme automatique dégrade vers Free) ; dépassement = **mur** sur Workers, Pages, D1, KV, DO ;
  servir les assets ne consomme aucun quota ; Pages ≈ Workers+assets sur les limites qui mordent.
- **R2 est le seul échec à `I5`** — mais son pivot (« la carte ne peut pas être contournée ») est
  un fil Community non recoupé. J'ai décidé de ne pas arbitrer les médias avant le geste manuel.

## Prochaine étape

Composer **Research B** — acheminement des demandes : quel envoi satisfait les trois conditions du
Brief (compte au nom de la cliente, aucune carte, délivrabilité vérifiable), et comment la cliente
s'aperçoit d'une panne silencieuse sans surveillance hébergée. Réponse négative → le Brief se rouvre.

En parallèle, faire jouer le **geste n°1 du rapport A** (R2 sans carte, au tableau de bord) : il
commande à lui seul l'arbitrage racine. Restent ensuite les 4 lookups — ③ jeton d'écriture ·
④ dépôts privés · ⑥ Astro · ⑪ lien magique.

## Écarté

- **Reprendre la stack du 2026-08-07** — arbitrage humain, faits non sourcés.
- **Le palier gratuit en cinq lookups séparés** — `I5` les relie et c'est lui qui décide.
- **Trancher le magasin avant les médias** — question posée, interrompue à raison.
- **Sourcer moi-même ce qui descend dans un ADR** — la vérification doit laisser une trace citable.
- **Instruire un repli hors Cloudflare** — l'hébergement est une donnée d'entrée (`brief.md:244`).
- **Figer les chiffres de paliers dans le Brief ou un ADR** — le Brief les route vers l'annexe datée.
- **La recommandation 4 du rapport A telle quelle** (état publié dans D1) — le chercheur n'avait
  que `I5` en grille, pas `I2` « contenu en clair, hors base ».
