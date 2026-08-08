# ADR-0006 : TypeScript strict, avec validation de schéma à l'exécution sur les frontières d'entrée
Statut : Accepté | Date : 2026-08-07 | Trace vers : `docs/stack.md`

## Contexte

Le Brief pose une contrainte qui gouverne tout ce document : **le code entrant n'est pas
relu ligne à ligne**. Ce qui protège le produit doit donc être mécanique. Or les types
statiques disparaissent à la compilation : ils décrivent ce que le code attend, ils ne
vérifient rien de ce qu'il reçoit.

Trois frontières reçoivent des octets que le produit ne maîtrise pas :

1. **La soumission du visiteur** — champ ouvert, non authentifié, exposé sur l'internet
   public (`FR-063`, `FR-065`, `FR-066`) ;
2. **Les réponses de l'API de la forge** — c'est par elles que le CMS relit l'état publié
   depuis que `ADR-0001` en a fait le magasin unique (`FR-024`, `FR-035`) ;
3. **Les lignes relues de D1** — brouillon, médiathèque et demandes, écrites par une
   version antérieure du CMS et relues par la version courante après une montée de version
   de la flotte (`ADR-0011`, `FR-086`).

S'y ajoute le frontmatter YAML de `ADR-0002`, dont le typage implicite peut transformer une
valeur en booléen ou en date sans que rien ne le signale.

Une donnée mal formée qui franchit l'une de ces frontières ne fait échouer aucun test :
elle se propage et échoue plus tard, loin de sa cause.

Exigences concernées : `FR-065`, `FR-066`, `FR-067`, `FR-082`, `FR-086` · contrainte
« vérifications mécaniques » du Brief.

## Décision

Nous écrirons le produit en **TypeScript en mode strict**, et nous **validerons par schéma
à l'exécution** toute donnée qui franchit une frontière d'entrée : soumission du visiteur,
réponse de l'API de la forge, ligne relue de D1, frontmatter relu du dépôt.

Le type statique sera **dérivé du schéma**, jamais déclaré à côté de lui : un schéma et un
type qui peuvent diverger sont deux sources de vérité.

Une donnée qui échoue à la validation sera **rejetée à la frontière**, avec une erreur
structurée, et ne pénétrera jamais dans le cœur du produit.

## Conséquences

**Positives**

- Un défaut de forme échoue **là où il entre**, pas trois couches plus loin : c'est ce qui
  rend un incident diagnosticable dans un code que personne ne relit.
- `FR-067` (le libellé et le montant d'une demande passée ne changent jamais) devient
  vérifiable : la ligne relue est validée contre le schéma qu'elle prétend avoir.
- La montée de version de la flotte (`FR-086`) cesse d'être un pari : une ligne écrite par
  une version antérieure est soit conforme, soit rejetée explicitement.

**Négatives — ce que ce choix coûte**

- **Chaque frontière porte un schéma à écrire et à maintenir**, et ce schéma doit suivre
  toute évolution du format — un coût récurrent, pas un investissement unique.
- **La validation consomme du CPU dans un budget de 10 ms par invocation** (annexe A du
  socle de livraison). Sur une charge utile volumineuse — une publication entière — le coût
  n'est pas négligeable et doit être mesuré, pas supposé.
- **Rien ne détecte automatiquement une frontière oubliée.** C'est la faiblesse propre de
  cette décision : elle protège ce qu'on a pensé à protéger. Elle appelle un contrôle
  dédié du portail de qualité (`ADR-0012`) pour que l'oubli soit une erreur de build et
  non une découverte en production.
- Un rejet à la frontière est un refus visible : le produit s'engage à ce que ce refus soit
  compréhensible par l'éditrice ou le visiteur, et non un code d'erreur brut.

## Alternatives considérées

- **TypeScript strict seul, sans validation à l'exécution** : écartée parce que les types
  ne survivent pas à la compilation — une donnée mal formée entre sans obstacle et se
  propage jusqu'à échouer loin de sa cause, dans un produit où personne ne relira le
  chemin qu'elle a pris.
- **Validation sur la seule frontière du visiteur** (la seule ouverte au public) : écartée
  parce que deux des trois pannes redoutées ne viennent pas de là — une réponse d'API
  inattendue et une ligne écrite par une version antérieure du CMS sont des entrées « de
  confiance » qui ne le sont qu'en apparence.

## Contexte agent

- Décision influencée/générée par l'agent : oui — dérivée du candidat 6 de
  `docs/stack.md`, arbitré par l'humain le 2026-08-07 — Revue humaine : 2026-08-07
