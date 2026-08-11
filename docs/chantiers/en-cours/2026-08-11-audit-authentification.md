# Audit de l'authentification, sur les seules pièces déjà au dépôt

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `77eb7be`

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
à extraire  `docs/brief.md` › § Vocabulaire (entrée « Authentification »), invariants `I1`-`I6`,
            « Aucun compte technique », « Les surfaces exposées au public », questions ouvertes
            — reclassé de `à situer` le 11/08 : les choix fondateurs vivent là, et l'audit les juge
à situer    `docs/audit-auth.md` — le rendu de ce chantier ; il s'écrit, il ne se recharge pas
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

Arbitrer les douze constats un par un, comme l'audit de la stack : `AU-01` d'abord, dont la
racine — la fusion des deux adresses au glossaire — commande aussi `AU-12` et rejoint les deux
failles déjà parties à `premortem socle`. Chaque arbitrage se referme par un texte au PRD, à la
Stack ou à un candidat ADR, et par sa ligne au récapitulatif de `docs/audit-auth.md`.

- **L'audit est rendu le 11/08 — `docs/audit-auth.md`, 12 constats, 10 majeurs.** La demande a
  été élargie en cours de route : remonter aux **choix fondateurs**, pas seulement auditer les
  mécanismes nommés par `S-05`. L'autre borne tient — les seules pièces au dépôt.
- **Le soupçon de départ est confirmé, et sa source nommée** : un seul choix du Brief — la
  fusion de l'adresse qui authentifie et de celle qui reçoit les demandes — produit quatre des
  douze constats, chaque fois découvert une phase plus bas et par un chemin indépendant.
- **Il y a une cinquième porte** (`AU-01`), et elle ne mène pas à l'origine commune : `FR-063`
  ouvre en écriture, à l'internet anonyme, la boîte qui **est** le facteur d'authentification.
  La méthode de `S-06` a payé pour la troisième fois.
- **Deux gisements annoncés ont rendu**, un a rendu autrement : la CSP stricte est la seule des
  parades sans définition ni contrôle bloquant (`AU-06`) ; le rayon d'action d'une session
  compromise atteint le registre durable, pas un rendu (`AU-07`) ; et `I3` face aux sessions
  s'est déplacé en `AU-08` — ce n'est pas la reconstruction qui souffre, c'est la **durabilité**
  de l'état d'authentification, que `FR-011` empêche de rattraper.

## Écarté

- **Refaire l'étude des six décisions D1-D6** — rendue le 11/08 et portée dans `stack.md` ;
  l'audit part de l'arbitrage `S-05`, il ne le rejoue pas.
- **Sourcer ou mesurer quoi que ce soit** — la demande porte sur les pièces déjà au dépôt.
- **Ouvrir une feature** — comme pour l'audit de la stack, aucun constat ne descend en code.
- **Fermer `AU-04` en écartant le TOTP d'emblée** — il coûte un secret récupérable à
  l'inventaire et une friction contre `SC-003`/`SC-015`. Ces motifs sont recevables ; celui
  qu'il faut retirer est l'**unicité** de la passkey, qui est faux.
