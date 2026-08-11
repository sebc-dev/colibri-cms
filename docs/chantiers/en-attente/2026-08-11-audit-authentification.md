# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `209c85f`

## Objectif

Passer l'authentification au crible qui a servi au Brief↔PRD puis à la stack : un
`docs/audit-auth.md` de constats **figés et datés**, sévérité et lieu de réparation, puis un
récapitulatif d'arbitrages. Sur les seules pièces du dépôt — ni recherche, ni mesure. Le
traitement de `S-05` a **nommé** les mécanismes ; personne ne les a encore **audités**.

## Contexte à charger

à extraire  `docs/prd.md` › § « Accès à l'administration », les exclusions « Révocation d'un
            accès en cours » et « Seconde adresse », les trois cas limites de perte de boîte
à extraire  `docs/stack.md` › lignes « Auth », « Moyen de reprise », « En-têtes de réponse » ;
            § « Pourquoi un code à saisir », « La quatrième porte », « `FR-013` et `FR-014` » ;
            candidats ADR n° 6, n° 15, n° 16
à extraire  `docs/audit-stack.md` › la seule ligne `S-05` du § « Récapitulatif » — l'objet à
            auditer ; le reste du document ne le concerne pas
à extraire  `docs/audit-brief-prd.md` › `A-01`, `A-02`, `A-09` et leurs lignes de récapitulatif
            — les trois arbitrages qui bornent déjà le sujet
à situer    `docs/brief.md` — la question ouverte sur la boîte est distillée dans Acquis
à situer    `docs/research/` — aucun rapport ne porte sur l'auth ; ne pas y chercher

## Acquis

- **Le modèle de menace est établi (11/08)** et doit ordonner les constats : le lecteur de la
  boîte domine, et il est **indétectable** — notifier chaque connexion notifierait la boîte
  qu'il lit. Impasse à nommer, pas à contourner.
- **Deux failles de contrat sont déjà trouvées** et parties à `premortem socle` : `FR-005`
  verrouille `FR-014`, `FR-013` casse les deux canaux. L'audit cherche ce qu'elles masquent
  en aval, il ne les redécouvre pas.
- **Le compte de portes de `S-06` s'est révélé faux** — la liste des demandes en était une
  quatrième. Vaut méthode : chercher la cinquième plutôt que croire un inventaire clos.
- **La passkey est la seule forme survivant au lecteur de boîte**, écartée sur le glossaire
  (« secret **remis** à la livraison »). L'audit peut la rouvrir, pas la trancher.
- **Jamais instruit, donc premier gisement** : ce qu'une session compromise fait de la
  publication, le coût d'une CSP stricte sur des îlots Svelte, et `I3` face à des sessions
  vivant en base.
- **L'ordre a été inversé le 11/08, et le `Bloqué par` retiré.** J'avais posé que cet audit
  attende la clôture de L4, `S-02` et `S-01` touchant au même inventaire de secrets. C'est
  l'inverse qui a été décidé : **L4 consommera les arbitrages de cet audit**, et le traitement
  de l'audit de la stack est passé en attente derrière lui. Conséquence à assumer en écrivant
  les constats — `stack.md` sera lu avec `S-02` et `S-01` **non encore arbitrés**, donc son
  inventaire de secrets est un état intermédiaire, pas une cible.

## Prochaine étape

Écrire l'en-tête et la grille de `docs/audit-auth.md` sur le gabarit de `docs/audit-stack.md`,
puis balayer dans l'ordre du modèle de menace — en commençant par le seul angle jamais
instruit : ce qu'une session compromise peut faire de la publication.

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md` ;
  l'audit part de l'arbitrage `S-05`, il ne le rejoue pas.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — comme pour l'audit de la stack, aucun constat ne descend en code.
